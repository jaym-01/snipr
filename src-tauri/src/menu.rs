use tauri::Manager;

enum MenuOption {
    Settings,
    Quit,
}

impl MenuOption {
    fn text(&self) -> &str {
        match self {
            MenuOption::Settings => "settings",
            MenuOption::Quit => "quit",
        }
    }
}

pub fn setup_menu(app: &tauri::App) -> Result<(), String> {
    let menu = tauri::menu::MenuBuilder::new(app)
        .text(MenuOption::Settings.text(), "Settings")
        // .text(MenuOption::Quit.text(), "Quit")
        .build()
        .map_err(|e| e.to_string())?;

    app.get_webview_window("main")
        .unwrap()
        .set_menu(menu)
        .map_err(|e| e.to_string())?;

    app.on_menu_event(move |app_handle, event| match event.id().0.as_str() {
        val if val == MenuOption::Settings.text() => {
            if let Some(window) = app_handle.get_webview_window("settings") {
                window.show().unwrap();
            } else {
                let webview_url = tauri::WebviewUrl::App("settings.html".into());
                tauri::WebviewWindowBuilder::new(app_handle, MenuOption::Settings.text(), webview_url)
                    .title("Settings")
                    .resizable(false)
                    .build()
                    .unwrap()
                    .set_size(tauri::LogicalSize::new(500.0, 600.0))
                    .unwrap();
            }
        }
        val if val == MenuOption::Quit.text() => {
            std::process::exit(0);
        }
        _ => {
            println!("Unknown menu event: {:?}", event.id());
        }
    });

    Ok(())
}
