use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PackageGroup {
    pub name: String,
    pub packages: Vec<String>,
    pub required: bool,
}

#[derive(Debug, Deserialize)]
struct BlunuxConfig {
    #[serde(default)]
    packages: Option<PackagesConfig>,
}

#[derive(Debug, Deserialize)]
struct PackagesConfig {
    #[serde(default)]
    base: Option<Vec<String>>,
    #[serde(default)]
    kernel: Option<Vec<String>>,
    #[serde(default)]
    firmware: Option<Vec<String>>,
    #[serde(default)]
    desktop: Option<Vec<String>>,
    #[serde(default)]
    fonts: Option<Vec<String>>,
    #[serde(default)]
    utils: Option<Vec<String>>,
    #[serde(default)]
    network: Option<Vec<String>>,
    #[serde(default)]
    audio: Option<Vec<String>>,
    #[serde(default)]
    bluetooth: Option<Vec<String>>,
    #[serde(default)]
    extra: Option<Vec<String>>,
    #[serde(flatten)]
    other: HashMap<String, toml::Value>,
}

/// Load packages from /etc/blunux/config.toml
#[tauri::command]
pub async fn load_config_packages() -> Result<Vec<PackageGroup>, String> {
    let config_path = "/etc/blunux/config.toml";
    let content =
        std::fs::read_to_string(config_path).map_err(|e| format!("Cannot read {config_path}: {e}"))?;

    let config: BlunuxConfig =
        toml::from_str(&content).map_err(|e| format!("Invalid config.toml: {e}"))?;

    let mut groups = Vec::new();

    if let Some(pkgs) = config.packages {
        if let Some(base) = pkgs.base {
            groups.push(PackageGroup {
                name: "Base System".into(),
                packages: base,
                required: true,
            });
        }
        if let Some(kernel) = pkgs.kernel {
            groups.push(PackageGroup {
                name: "Kernel".into(),
                packages: kernel,
                required: true,
            });
        }
        if let Some(firmware) = pkgs.firmware {
            groups.push(PackageGroup {
                name: "Firmware".into(),
                packages: firmware,
                required: true,
            });
        }
        if let Some(desktop) = pkgs.desktop {
            groups.push(PackageGroup {
                name: "Desktop Environment".into(),
                packages: desktop,
                required: false,
            });
        }
        if let Some(fonts) = pkgs.fonts {
            groups.push(PackageGroup {
                name: "Fonts".into(),
                packages: fonts,
                required: false,
            });
        }
        if let Some(utils) = pkgs.utils {
            groups.push(PackageGroup {
                name: "Utilities".into(),
                packages: utils,
                required: false,
            });
        }
        if let Some(network) = pkgs.network {
            groups.push(PackageGroup {
                name: "Network".into(),
                packages: network,
                required: false,
            });
        }
        if let Some(audio) = pkgs.audio {
            groups.push(PackageGroup {
                name: "Audio".into(),
                packages: audio,
                required: false,
            });
        }
        if let Some(bluetooth) = pkgs.bluetooth {
            groups.push(PackageGroup {
                name: "Bluetooth".into(),
                packages: bluetooth,
                required: false,
            });
        }
        if let Some(extra) = pkgs.extra {
            groups.push(PackageGroup {
                name: "Extra".into(),
                packages: extra,
                required: false,
            });
        }

        // Handle any custom groups from [packages.*]
        for (key, value) in pkgs.other {
            if let toml::Value::Array(arr) = value {
                let pkg_list: Vec<String> = arr
                    .iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect();
                if !pkg_list.is_empty() {
                    groups.push(PackageGroup {
                        name: key.replace('_', " "),
                        packages: pkg_list,
                        required: false,
                    });
                }
            }
        }
    }

    // If no config, provide sensible defaults
    if groups.is_empty() {
        groups.push(PackageGroup {
            name: "Base System".into(),
            packages: vec![
                "base".into(),
                "linux".into(),
                "linux-firmware".into(),
                "base-devel".into(),
                "networkmanager".into(),
                "grub".into(),
                "efibootmgr".into(),
                "sudo".into(),
                "vim".into(),
            ],
            required: true,
        });
    }

    Ok(groups)
}

/// List some additional popular packages the user might want
#[tauri::command]
pub async fn list_available_packages() -> Result<Vec<PackageGroup>, String> {
    Ok(vec![
        PackageGroup {
            name: "Web Browsers".into(),
            packages: vec![
                "firefox".into(),
                "chromium".into(),
            ],
            required: false,
        },
        PackageGroup {
            name: "Development".into(),
            packages: vec![
                "git".into(),
                "gcc".into(),
                "python".into(),
                "nodejs".into(),
                "npm".into(),
                "rust".into(),
            ],
            required: false,
        },
        PackageGroup {
            name: "Multimedia".into(),
            packages: vec![
                "vlc".into(),
                "gimp".into(),
                "obs-studio".into(),
            ],
            required: false,
        },
        PackageGroup {
            name: "Office".into(),
            packages: vec![
                "libreoffice-fresh".into(),
            ],
            required: false,
        },
    ])
}
