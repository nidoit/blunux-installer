use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::{Arc, Mutex};

/// Global install progress state
static PROGRESS: std::sync::LazyLock<Arc<Mutex<InstallProgress>>> =
    std::sync::LazyLock::new(|| {
        Arc::new(Mutex::new(InstallProgress {
            step: 0,
            total_steps: 12,
            message: "Waiting to start...".into(),
            percent: 0,
            finished: false,
            error: None,
        }))
    });

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstallProgress {
    pub step: u32,
    pub total_steps: u32,
    pub message: String,
    pub percent: u32,
    pub finished: bool,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InstallConfig {
    pub disk: String,
    pub root_partition: String,
    pub efi_partition: String,
    pub swap_partition: Option<String>,
    pub root_fstype: String,
    pub hostname: String,
    pub username: String,
    pub password: String,
    pub root_password: String,
    pub timezone: String,
    pub locale: String,
    pub keymap: String,
    pub bootloader: String, // "grub" or "systemd-boot"
    pub packages: Vec<String>,
    pub enable_services: Vec<String>,
}

fn update_progress(step: u32, total: u32, msg: &str) {
    if let Ok(mut p) = PROGRESS.lock() {
        p.step = step;
        p.total_steps = total;
        p.message = msg.to_string();
        p.percent = if total > 0 {
            (step * 100) / total
        } else {
            0
        };
    }
}

fn set_error(msg: &str) {
    if let Ok(mut p) = PROGRESS.lock() {
        p.error = Some(msg.to_string());
        p.finished = true;
    }
}

fn set_finished() {
    if let Ok(mut p) = PROGRESS.lock() {
        p.finished = true;
        p.percent = 100;
        p.message = "Installation complete!".into();
    }
}

fn run_cmd(cmd: &str, args: &[&str]) -> Result<String, String> {
    log::info!("Running: {cmd} {}", args.join(" "));
    let output = Command::new(cmd)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run {cmd}: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("{cmd} failed: {stderr}"));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn chroot_cmd(args: &[&str]) -> Result<String, String> {
    let mut full_args = vec!["arch-chroot", "/mnt"];
    full_args.extend_from_slice(args);
    // arch-chroot is a script, run via sh
    run_cmd("arch-chroot", &["/mnt"].iter().chain(args.iter()).copied().collect::<Vec<&str>>())
}

/// Get current installation progress
#[tauri::command]
pub async fn get_install_progress() -> Result<InstallProgress, String> {
    let p = PROGRESS
        .lock()
        .map_err(|_| "Lock poisoned".to_string())?;
    Ok(p.clone())
}

/// Run the full installation process
#[tauri::command]
pub async fn run_install(config: InstallConfig) -> Result<String, String> {
    // Reset progress
    {
        let mut p = PROGRESS.lock().map_err(|_| "Lock poisoned".to_string())?;
        *p = InstallProgress {
            step: 0,
            total_steps: 12,
            message: "Starting installation...".into(),
            percent: 0,
            finished: false,
            error: None,
        };
    }

    // Run installation in a blocking task so the frontend can poll progress
    let cfg = config;
    tokio::task::spawn_blocking(move || {
        if let Err(e) = do_install(&cfg) {
            set_error(&e);
        }
    });

    Ok("Installation started".into())
}

fn do_install(cfg: &InstallConfig) -> Result<(), String> {
    let total = 12u32;

    // Step 1: Mount filesystems
    update_progress(1, total, "Mounting filesystems...");
    std::fs::create_dir_all("/mnt").map_err(|e| format!("mkdir /mnt: {e}"))?;
    run_cmd("mount", &[&cfg.root_partition, "/mnt"])?;

    std::fs::create_dir_all("/mnt/boot/efi").map_err(|e| format!("mkdir efi: {e}"))?;
    run_cmd("mount", &[&cfg.efi_partition, "/mnt/boot/efi"])?;

    if let Some(ref swap) = cfg.swap_partition {
        let _ = run_cmd("swapon", &[swap.as_str()]);
    }

    // Step 2: Pacstrap base system
    update_progress(2, total, "Installing base system (pacstrap)...");
    let mut pacstrap_args: Vec<&str> = vec!["/mnt"];
    let pkg_refs: Vec<&str> = cfg.packages.iter().map(|s| s.as_str()).collect();
    pacstrap_args.extend(&pkg_refs);
    run_cmd("pacstrap", &pacstrap_args)?;

    // Step 3: Generate fstab
    update_progress(3, total, "Generating fstab...");
    let fstab = run_cmd("genfstab", &["-U", "/mnt"])?;
    std::fs::write("/mnt/etc/fstab", &fstab).map_err(|e| format!("write fstab: {e}"))?;

    // Step 4: Set timezone
    update_progress(4, total, "Configuring timezone...");
    let tz_path = format!("/usr/share/zoneinfo/{}", cfg.timezone);
    run_cmd(
        "arch-chroot",
        &["/mnt", "ln", "-sf", &tz_path, "/etc/localtime"],
    )?;
    run_cmd("arch-chroot", &["/mnt", "hwclock", "--systohc"])?;

    // Step 5: Set locale
    update_progress(5, total, "Configuring locale...");
    let locale_gen_content = format!("{} UTF-8\n", cfg.locale);
    std::fs::write("/mnt/etc/locale.gen", &locale_gen_content)
        .map_err(|e| format!("write locale.gen: {e}"))?;
    run_cmd("arch-chroot", &["/mnt", "locale-gen"])?;

    let locale_conf = format!("LANG={}\n", cfg.locale);
    std::fs::write("/mnt/etc/locale.conf", &locale_conf)
        .map_err(|e| format!("write locale.conf: {e}"))?;

    // Step 6: Set keymap
    update_progress(6, total, "Configuring keyboard...");
    let vconsole = format!("KEYMAP={}\n", cfg.keymap);
    std::fs::write("/mnt/etc/vconsole.conf", &vconsole)
        .map_err(|e| format!("write vconsole.conf: {e}"))?;

    // Step 7: Set hostname
    update_progress(7, total, "Configuring hostname...");
    std::fs::write("/mnt/etc/hostname", &cfg.hostname)
        .map_err(|e| format!("write hostname: {e}"))?;

    let hosts = format!(
        "127.0.0.1\tlocalhost\n::1\t\tlocalhost\n127.0.1.1\t{}.localdomain\t{}\n",
        cfg.hostname, cfg.hostname
    );
    std::fs::write("/mnt/etc/hosts", &hosts).map_err(|e| format!("write hosts: {e}"))?;

    // Step 8: Set root password
    update_progress(8, total, "Setting root password...");
    let chpasswd_input = format!("root:{}", cfg.root_password);
    let mut child = Command::new("arch-chroot")
        .args(["/mnt", "chpasswd"])
        .stdin(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("chpasswd spawn: {e}"))?;
    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        stdin
            .write_all(chpasswd_input.as_bytes())
            .map_err(|e| format!("chpasswd write: {e}"))?;
    }
    let status = child.wait().map_err(|e| format!("chpasswd wait: {e}"))?;
    if !status.success() {
        return Err("Failed to set root password".into());
    }

    // Step 9: Create user
    update_progress(9, total, "Creating user account...");
    run_cmd(
        "arch-chroot",
        &[
            "/mnt",
            "useradd",
            "-m",
            "-G",
            "wheel",
            "-s",
            "/bin/bash",
            &cfg.username,
        ],
    )?;

    let user_passwd = format!("{}:{}", cfg.username, cfg.password);
    let mut child = Command::new("arch-chroot")
        .args(["/mnt", "chpasswd"])
        .stdin(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("user chpasswd spawn: {e}"))?;
    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        stdin
            .write_all(user_passwd.as_bytes())
            .map_err(|e| format!("user chpasswd write: {e}"))?;
    }
    child
        .wait()
        .map_err(|e| format!("user chpasswd wait: {e}"))?;

    // Enable sudo for wheel group
    let sudoers = "%wheel ALL=(ALL:ALL) ALL\n";
    std::fs::write("/mnt/etc/sudoers.d/wheel", sudoers)
        .map_err(|e| format!("write sudoers: {e}"))?;

    // Step 10: Install bootloader
    update_progress(10, total, "Installing bootloader...");
    match cfg.bootloader.as_str() {
        "grub" => {
            run_cmd(
                "arch-chroot",
                &[
                    "/mnt",
                    "grub-install",
                    "--target=x86_64-efi",
                    "--efi-directory=/boot/efi",
                    "--bootloader-id=Blunux",
                ],
            )?;
            run_cmd(
                "arch-chroot",
                &["/mnt", "grub-mkconfig", "-o", "/boot/grub/grub.cfg"],
            )?;
        }
        "systemd-boot" => {
            run_cmd("arch-chroot", &["/mnt", "bootctl", "install"])?;

            // Create loader entry
            std::fs::create_dir_all("/mnt/boot/loader/entries")
                .map_err(|e| format!("mkdir loader: {e}"))?;

            let root_uuid = run_cmd("blkid", &["-s", "UUID", "-o", "value", &cfg.root_partition])?;
            let root_uuid = root_uuid.trim();

            let loader_conf = "default blunux.conf\ntimeout 3\nconsole-mode max\n";
            std::fs::write("/mnt/boot/loader/loader.conf", loader_conf)
                .map_err(|e| format!("write loader.conf: {e}"))?;

            let entry = format!(
                "title   Blunux Linux\nlinux   /vmlinuz-linux\ninitrd  /initramfs-linux.img\noptions root=UUID={root_uuid} rw\n"
            );
            std::fs::write("/mnt/boot/loader/entries/blunux.conf", &entry)
                .map_err(|e| format!("write blunux.conf: {e}"))?;
        }
        other => return Err(format!("Unknown bootloader: {other}")),
    }

    // Step 11: Enable services
    update_progress(11, total, "Enabling system services...");
    for service in &cfg.enable_services {
        let _ = run_cmd(
            "arch-chroot",
            &["/mnt", "systemctl", "enable", service.as_str()],
        );
    }

    // Step 12: Copy Blunux branding
    update_progress(12, total, "Finalizing installation...");
    // Copy os-release branding if available
    if std::path::Path::new("/etc/blunux/os-release").exists() {
        let _ = std::fs::copy("/etc/blunux/os-release", "/mnt/etc/os-release");
    }
    // Copy blunux config for reference
    if std::path::Path::new("/etc/blunux/config.toml").exists() {
        let _ = std::fs::create_dir_all("/mnt/etc/blunux");
        let _ = std::fs::copy("/etc/blunux/config.toml", "/mnt/etc/blunux/config.toml");
    }

    // Generate initramfs (in case mkinitcpio wasn't run)
    let _ = run_cmd("arch-chroot", &["/mnt", "mkinitcpio", "-P"]);

    set_finished();
    Ok(())
}
