mod commands;

pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Disk commands
            commands::disk::list_disks,
            commands::disk::list_partitions,
            commands::disk::auto_partition,
            commands::disk::format_partition,
            commands::disk::mount_partition,
            commands::disk::unmount_all,
            // Locale commands
            commands::locale::list_timezones,
            commands::locale::list_locales,
            commands::locale::list_keymaps,
            // Network commands
            commands::network::check_connection,
            commands::network::list_wifi_networks,
            commands::network::connect_wifi,
            commands::network::sync_ntp,
            // Package commands
            commands::packages::load_config_packages,
            commands::packages::list_available_packages,
            // Install commands
            commands::install::run_install,
            commands::install::get_install_progress,
        ])
        .run(tauri::generate_context!())
        .expect("error while running blunux-installer");
}
