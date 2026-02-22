use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionStatus {
    pub connected: bool,
    pub method: String, // "ethernet", "wifi", "none"
    pub ip: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WifiNetwork {
    pub ssid: String,
    pub signal: String,
    pub security: String,
    pub connected: bool,
}

/// Check current network connection
#[tauri::command]
pub async fn check_connection() -> Result<ConnectionStatus, String> {
    // Quick connectivity check
    let ping = Command::new("ping")
        .args(["-c", "1", "-W", "3", "archlinux.org"])
        .output();

    let connected = ping.map(|o| o.status.success()).unwrap_or(false);

    if !connected {
        return Ok(ConnectionStatus {
            connected: false,
            method: "none".into(),
            ip: None,
        });
    }

    // Determine connection type via nmcli
    let nmcli = Command::new("nmcli")
        .args(["-t", "-f", "TYPE,DEVICE,STATE", "device"])
        .output();

    let mut method = "unknown".to_string();
    let mut ip = None;

    if let Ok(output) = nmcli {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 3 && parts[2] == "connected" {
                method = match parts[0] {
                    "ethernet" => "ethernet".into(),
                    "wifi" => "wifi".into(),
                    _ => parts[0].to_string(),
                };
                // Get IP
                if let Ok(ip_out) = Command::new("nmcli")
                    .args(["-t", "-f", "IP4.ADDRESS", "device", "show", parts[1]])
                    .output()
                {
                    let ip_text = String::from_utf8_lossy(&ip_out.stdout);
                    for iline in ip_text.lines() {
                        if let Some(addr) = iline.strip_prefix("IP4.ADDRESS[1]:") {
                            ip = Some(addr.to_string());
                            break;
                        }
                    }
                }
                break;
            }
        }
    }

    Ok(ConnectionStatus {
        connected,
        method,
        ip,
    })
}

/// List available WiFi networks
#[tauri::command]
pub async fn list_wifi_networks() -> Result<Vec<WifiNetwork>, String> {
    // Rescan
    let _ = Command::new("nmcli")
        .args(["device", "wifi", "rescan"])
        .output();

    let output = Command::new("nmcli")
        .args(["-t", "-f", "SSID,SIGNAL,SECURITY,ACTIVE", "device", "wifi", "list"])
        .output()
        .map_err(|e| format!("nmcli failed: {e}"))?;

    if !output.status.success() {
        return Err("Failed to list WiFi networks".into());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut networks: Vec<WifiNetwork> = Vec::new();
    let mut seen_ssids = std::collections::HashSet::new();

    for line in text.lines() {
        let parts: Vec<&str> = line.split(':').collect();
        if parts.len() >= 4 {
            let ssid = parts[0].to_string();
            if ssid.is_empty() || seen_ssids.contains(&ssid) {
                continue;
            }
            seen_ssids.insert(ssid.clone());
            networks.push(WifiNetwork {
                ssid,
                signal: parts[1].to_string(),
                security: parts[2].to_string(),
                connected: parts[3] == "yes",
            });
        }
    }

    // Sort by signal strength descending
    networks.sort_by(|a, b| {
        b.signal
            .parse::<i32>()
            .unwrap_or(0)
            .cmp(&a.signal.parse::<i32>().unwrap_or(0))
    });

    Ok(networks)
}

/// Connect to a WiFi network
#[tauri::command]
pub async fn connect_wifi(ssid: String, password: String) -> Result<String, String> {
    let output = Command::new("nmcli")
        .args(["device", "wifi", "connect", &ssid, "password", &password])
        .output()
        .map_err(|e| format!("nmcli connect failed: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "Failed to connect: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(format!("Connected to {ssid}"))
}

/// Sync system time via NTP
#[tauri::command]
pub async fn sync_ntp() -> Result<String, String> {
    let output = Command::new("timedatectl")
        .args(["set-ntp", "true"])
        .output()
        .map_err(|e| format!("timedatectl failed: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "NTP sync failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok("NTP synchronization enabled".into())
}
