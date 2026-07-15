use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

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
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .on_page_load(|webview, _payload| {
      let _ = webview.eval(DESKTOP_INIT_SCRIPT);
    })
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let frontend = std::env::var("BLOOM_FRONTEND_URL")
        .or_else(|_| std::env::var("BETTER_AUTH_URL"))
        .unwrap_or_else(|_| "http://localhost:3000".into());

      let url = frontend
        .parse()
        .map(WebviewUrl::External)
        .unwrap_or_else(|_| WebviewUrl::External("http://localhost:3000".parse().unwrap()));

      WebviewWindowBuilder::new(app, "main", url)
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

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
