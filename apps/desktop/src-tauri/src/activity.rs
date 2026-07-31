use chrono::{DateTime, Utc};
use parking_lot::{Condvar, Mutex};
use serde::Serialize;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

const IDLE_THRESHOLD: Duration = Duration::from_secs(60);
/// Segment boundaries only need coarse resolution — a tighter poll just burns
/// CPU in the tray for no extra fidelity.
const POLL_INTERVAL: Duration = Duration::from_secs(2);
const MAX_PENDING: usize = 500;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivitySegmentDto {
  pub id: String,
  /// RFC3339 strings so the webview always gets parseable timestamps.
  pub started_at: String,
  pub ended_at: String,
  pub kind: String,
  pub process_name: Option<String>,
  pub app_name: Option<String>,
  pub exe_path: Option<String>,
}

#[derive(Clone, Debug)]
struct SampleKey {
  idle: bool,
  process_name: Option<String>,
  app_name: Option<String>,
  exe_path: Option<String>,
}

impl PartialEq for SampleKey {
  fn eq(&self, other: &Self) -> bool {
    self.idle == other.idle
      && self.process_name == other.process_name
      && self.exe_path == other.exe_path
  }
}

impl Eq for SampleKey {}

struct OpenSegment {
  id: String,
  key: SampleKey,
  started_at: DateTime<Utc>,
}

struct TrackerInner {
  enabled: bool,
  open: Option<OpenSegment>,
  pending: Vec<ActivitySegmentDto>,
  supported: bool,
}

#[derive(Clone)]
pub struct ActivityTracker {
  inner: Arc<Mutex<TrackerInner>>,
  wake: Arc<Condvar>,
}

impl ActivityTracker {
  pub fn new(supported: bool) -> Self {
    Self {
      inner: Arc::new(Mutex::new(TrackerInner {
        enabled: false,
        open: None,
        pending: Vec::new(),
        supported,
      })),
      wake: Arc::new(Condvar::new()),
    }
  }

  pub fn start_polling(&self) {
    if !self.inner.lock().supported {
      return;
    }
    let tracker = self.clone();
    let _ = thread::Builder::new()
      .name("bloom-activity".into())
      .spawn(move || {
        let mut sampler = Sampler::default();
        loop {
          // Park the thread outright while tracking is off. The old loop woke
          // every second and ran the full Win32 probe before checking
          // `enabled`, so a disabled tracker still cost syscalls forever.
          {
            let mut guard = tracker.inner.lock();
            while !guard.enabled {
              tracker.wake.wait(&mut guard);
            }
          }

          if let Some(sample) = sampler.sample() {
            tracker.apply_sample(sample);
          }
          thread::sleep(POLL_INTERVAL);
        }
      });
  }

  pub fn status(&self) -> ActivityStatus {
    let guard = self.inner.lock();
    ActivityStatus {
      supported: guard.supported,
      enabled: guard.enabled,
      pending_count: guard.pending.len(),
      current: guard.open.as_ref().map(|open| ActivityCurrentDto {
        idle: open.key.idle,
        process_name: open.key.process_name.clone(),
        app_name: open.key.app_name.clone(),
        exe_path: open.key.exe_path.clone(),
      }),
    }
  }

  pub fn set_enabled(&self, enabled: bool) {
    let mut guard = self.inner.lock();
    if guard.enabled == enabled {
      return;
    }
    if guard.enabled {
      Self::close_open(&mut guard, Utc::now());
    }
    guard.enabled = enabled;
    drop(guard);
    // Unpark the sampler when tracking turns back on.
    self.wake.notify_all();
  }

  /// Drain closed segments and include a live snapshot of the open one.
  /// The open segment keeps its original `started_at` / `id` so the server can
  /// extend the same DB row on each flush instead of waiting for an app switch.
  pub fn take_segments(&self) -> Vec<ActivitySegmentDto> {
    let mut guard = self.inner.lock();
    let mut out = std::mem::take(&mut guard.pending);
    if guard.enabled {
      if let Some(open) = &guard.open {
        let now = Utc::now();
        if now > open.started_at {
          out.push(Self::to_dto(open, now));
        }
      }
    }
    out
  }

  fn apply_sample(&self, sample: SampleKey) {
    let mut guard = self.inner.lock();
    if !guard.enabled {
      return;
    }
    let now = Utc::now();
    match &guard.open {
      None => {
        guard.open = Some(OpenSegment {
          id: new_id(),
          key: sample,
          started_at: now,
        });
      }
      Some(open) if open.key == sample => {}
      Some(_) => {
        Self::close_open(&mut guard, now);
        guard.open = Some(OpenSegment {
          id: new_id(),
          key: sample,
          started_at: now,
        });
      }
    }
  }

  fn close_open(guard: &mut TrackerInner, ended_at: DateTime<Utc>) {
    let Some(open) = guard.open.take() else {
      return;
    };
    if open.started_at >= ended_at {
      return;
    }
    Self::push_pending(guard, Self::to_dto(&open, ended_at));
  }

  fn to_dto(open: &OpenSegment, ended_at: DateTime<Utc>) -> ActivitySegmentDto {
    ActivitySegmentDto {
      id: open.id.clone(),
      started_at: open.started_at.to_rfc3339(),
      ended_at: ended_at.to_rfc3339(),
      kind: if open.key.idle {
        "idle".into()
      } else {
        "app".into()
      },
      process_name: open.key.process_name.clone(),
      app_name: open.key.app_name.clone(),
      exe_path: open.key.exe_path.clone(),
    }
  }

  fn push_pending(guard: &mut TrackerInner, segment: ActivitySegmentDto) {
    if let Some(last) = guard.pending.last_mut() {
      let same = last.kind == segment.kind
        && last.process_name == segment.process_name
        && last.exe_path == segment.exe_path;
      let last_end = DateTime::parse_from_rfc3339(&last.ended_at)
        .map(|d| d.with_timezone(&Utc))
        .ok();
      let next_start = DateTime::parse_from_rfc3339(&segment.started_at)
        .map(|d| d.with_timezone(&Utc))
        .ok();
      let next_end = DateTime::parse_from_rfc3339(&segment.ended_at)
        .map(|d| d.with_timezone(&Utc))
        .ok();
      if let (Some(last_end), Some(next_start), Some(next_end)) =
        (last_end, next_start, next_end)
      {
        let gap_ms = (next_start - last_end).num_milliseconds().abs();
        if same && gap_ms <= 5_000 {
          if next_end > last_end {
            last.ended_at = segment.ended_at;
          }
          if last.app_name.is_none() {
            last.app_name = segment.app_name;
          }
          return;
        }
      }
    }

    guard.pending.push(segment);
    if guard.pending.len() > MAX_PENDING {
      let overflow = guard.pending.len() - MAX_PENDING;
      guard.pending.drain(0..overflow);
    }
  }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityCurrentDto {
  pub idle: bool,
  pub process_name: Option<String>,
  pub app_name: Option<String>,
  pub exe_path: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityStatus {
  pub supported: bool,
  pub enabled: bool,
  pub pending_count: usize,
  pub current: Option<ActivityCurrentDto>,
}

fn new_id() -> String {
  use std::sync::atomic::{AtomicU64, Ordering};
  static COUNTER: AtomicU64 = AtomicU64::new(1);
  format!(
    "seg-{}-{}",
    Utc::now().timestamp_millis(),
    COUNTER.fetch_add(1, Ordering::Relaxed)
  )
}

/// Owns the per-thread probe cache so a steady foreground window costs one
/// cheap `GetForegroundWindow` per tick instead of a full process probe.
#[derive(Default)]
struct Sampler {
  #[cfg(windows)]
  cache: windows_impl::SampleCache,
}

impl Sampler {
  #[cfg(windows)]
  fn sample(&mut self) -> Option<SampleKey> {
    windows_impl::sample_foreground(&mut self.cache, IDLE_THRESHOLD)
  }

  #[cfg(not(windows))]
  fn sample(&mut self) -> Option<SampleKey> {
    None
  }
}

#[cfg(windows)]
mod windows_impl {
  use super::SampleKey;
  use std::path::Path;
  use std::time::Duration;
  use windows::core::PWSTR;
  use windows::Win32::Foundation::{CloseHandle, HANDLE, HWND, MAX_PATH};
  use windows::Win32::System::SystemInformation::GetTickCount;
  use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
    PROCESS_QUERY_LIMITED_INFORMATION,
  };
  use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
  use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
  };

  /// Ticks to reuse a cached window title before re-reading it. `GetWindowTextW`
  /// crosses a process boundary (WM_GETTEXT) and can block on a busy app, and
  /// the title is not part of `SampleKey` equality — so refreshing it on every
  /// tick buys nothing.
  const TITLE_REFRESH_TICKS: u32 = 3;

  /// Remembers the last foreground probe so an unchanged window skips
  /// `OpenProcess` / `QueryFullProcessImageNameW` entirely.
  #[derive(Default)]
  pub struct SampleCache {
    hwnd: isize,
    pid: u32,
    exe_path: Option<String>,
    process_name: Option<String>,
    title: Option<String>,
    title_age: u32,
  }

  pub fn sample_foreground(
    cache: &mut SampleCache,
    idle_threshold: Duration,
  ) -> Option<SampleKey> {
    let idle = idle_duration() >= idle_threshold;
    if idle {
      return Some(SampleKey {
        idle: true,
        process_name: None,
        app_name: None,
        exe_path: None,
      });
    }

    let hwnd = unsafe { GetForegroundWindow() };
    if hwnd.0.is_null() {
      return Some(SampleKey {
        idle: false,
        process_name: Some("Unknown".into()),
        app_name: Some("Unknown".into()),
        exe_path: None,
      });
    }

    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };

    let handle = hwnd.0 as isize;
    let same_window = handle == cache.hwnd && pid == cache.pid;

    if !same_window {
      cache.hwnd = handle;
      cache.pid = pid;
      cache.title = window_title(hwnd);
      cache.title_age = 0;
      cache.exe_path = if pid == 0 { None } else { process_exe_path(pid) };
      cache.process_name = cache.exe_path.as_ref().and_then(|p| {
        Path::new(p)
          .file_name()
          .map(|name| name.to_string_lossy().into_owned())
      });
    } else if cache.title_age >= TITLE_REFRESH_TICKS {
      cache.title = window_title(hwnd);
      cache.title_age = 0;
    } else {
      cache.title_age += 1;
    }

    if pid == 0 {
      return Some(SampleKey {
        idle: false,
        process_name: Some("Unknown".into()),
        app_name: cache.title.clone().or_else(|| Some("Unknown".into())),
        exe_path: None,
      });
    }

    let app_name = cache
      .title
      .clone()
      .filter(|t| !t.trim().is_empty())
      .or_else(|| cache.process_name.clone());

    Some(SampleKey {
      idle: false,
      process_name: cache.process_name.clone(),
      app_name,
      exe_path: cache.exe_path.clone(),
    })
  }

  fn idle_duration() -> Duration {
    unsafe {
      let mut info = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
      };
      if !GetLastInputInfo(&mut info).as_bool() {
        return Duration::ZERO;
      }
      let tick = GetTickCount();
      let idle_ms = tick.wrapping_sub(info.dwTime);
      Duration::from_millis(idle_ms as u64)
    }
  }

  fn window_title(hwnd: HWND) -> Option<String> {
    let mut buf = [0u16; 512];
    let len = unsafe { GetWindowTextW(hwnd, &mut buf) };
    if len <= 0 {
      return None;
    }
    Some(String::from_utf16_lossy(&buf[..len as usize]))
  }

  fn process_exe_path(pid: u32) -> Option<String> {
    unsafe {
      let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
      let path = full_image_path(handle);
      let _ = CloseHandle(handle);
      path
    }
  }

  unsafe fn full_image_path(handle: HANDLE) -> Option<String> {
    let mut buf = [0u16; MAX_PATH as usize * 4];
    let mut size = buf.len() as u32;
    if QueryFullProcessImageNameW(
      handle,
      PROCESS_NAME_WIN32,
      PWSTR(buf.as_mut_ptr()),
      &mut size,
    )
    .is_err()
    {
      return None;
    }
    Some(String::from_utf16_lossy(&buf[..size as usize]))
  }
}
