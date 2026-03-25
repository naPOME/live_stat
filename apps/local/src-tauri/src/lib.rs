use std::net::TcpStream;
use std::time::Duration;
use std::thread;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

const PORT: u16 = 3001;

/// Wait for the Next.js server to accept connections
fn wait_for_server() {
    let addr = format!("127.0.0.1:{}", PORT);
    for _ in 0..60 {
        if TcpStream::connect_timeout(
            &addr.parse().unwrap(),
            Duration::from_millis(200),
        )
        .is_ok()
        {
            return;
        }
        thread::sleep(Duration::from_millis(500));
    }
    eprintln!("Warning: server did not respond after 30s, loading anyway");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // In production, spawn the standalone Next.js server
            #[cfg(not(debug_assertions))]
            {
                let shell = app.shell();
                let resource_dir = app
                    .path()
                    .resource_dir()
                    .expect("failed to get resource dir");
                let server_js = resource_dir.join("server.js");

                shell
                    .command("node")
                    .args([server_js.to_string_lossy().to_string()])
                    .env("PORT", PORT.to_string())
                    .env("HOSTNAME", "localhost".to_string())
                    .env("NODE_ENV", "production".to_string())
                    .spawn()
                    .expect("failed to start Next.js server");
            }

            // Wait for server on a background thread, then show window
            let window = app.get_webview_window("main").unwrap();
            window.hide().unwrap_or_default();

            thread::spawn(move || {
                wait_for_server();
                let _ = window.eval(&format!(
                    "window.location.replace('http://localhost:{}')",
                    PORT
                ));
                let _ = window.show();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
