use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

mod activity;

use activity::{ActivitySegmentDto, ActivityStatus, ActivityTracker};

#[tauri::command]
fn activity_status(tracker: State<'_, ActivityTracker>) -> ActivityStatus {
  tracker.status()
}

#[tauri::command]
fn activity_set_enabled(tracker: State<'_, ActivityTracker>, enabled: bool) {
  tracker.set_enabled(enabled);
}

#[tauri::command]
fn activity_take_segments(tracker: State<'_, ActivityTracker>) -> Vec<ActivitySegmentDto> {
  tracker.take_segments()
}

fn show_main(app: &tauri::AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.set_skip_taskbar(false);
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
}

fn hide_to_tray(window: &tauri::Window) {
  let _ = window.hide();
  let _ = window.set_skip_taskbar(true);
}

const DESKTOP_INIT_SCRIPT: &str = r#"
(function () {
  try {
    window.__BLOOM_DESKTOP__ = true;
    window.isTauri = true;
    if (document.documentElement) {
      document.documentElement.classList.add("tauri-desktop");
    }
  } catch (_) {}
})();
"#;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let tracker = ActivityTracker::new(cfg!(windows));

  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .manage(tracker.clone())
    .invoke_handler(tauri::generate_handler![
      activity_status,
      activity_set_enabled,
      activity_take_segments
    ])
    .on_page_load(|webview, _payload| {
      let _ = webview.eval(DESKTOP_INIT_SCRIPT);
    })
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { api, .. } = event {
        // Keep sampling / WS alive — X hides to tray; Quit exits for real.
        hide_to_tray(window);
        api.prevent_close();
      }
    })
    .setup(move |app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Bundled Vite SPA in production; Tauri CLI rewrites to devUrl in `tauri dev`.
      WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Bloom")
        .inner_size(1280.0, 800.0)
        .min_inner_size(900.0, 600.0)
        .resizable(true)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .initialization_script(DESKTOP_INIT_SCRIPT)
        .build()?;

      // Immediate assert in case the first paint already happened.
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(DESKTOP_INIT_SCRIPT);
      }

      let show_item = MenuItem::with_id(app, "show", "Open Bloom", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Quit Bloom", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

      let icon = app
        .default_window_icon()
        .cloned()
        .expect("app icon missing from tauri.conf.json bundle.icon");

      let _tray = TrayIconBuilder::with_id("main")
        .icon(icon)
        .tooltip("Bloom")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
          "show" => show_main(app),
          "quit" => app.exit(0),
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            show_main(tray.app_handle());
          }
        })
        .build(app)?;

      tracker.start_polling();

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
