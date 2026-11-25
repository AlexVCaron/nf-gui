use tauri::Manager;

mod lsp_artifact;
pub mod lsp_framing;
mod lsp_ipc;
pub mod lsp_process;
mod workspace;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(lsp_ipc::LspState::default())
        .invoke_handler(tauri::generate_handler![
            lsp_ipc::lsp_start,
            lsp_ipc::lsp_send,
            lsp_ipc::lsp_stop,
            workspace::workspace_open
        ])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                window.state::<lsp_ipc::LspState>().stop_active();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
