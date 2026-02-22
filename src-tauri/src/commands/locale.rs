use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimezoneInfo {
    pub region: String,
    pub cities: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocaleEntry {
    pub code: String,
    pub name: String,
}

/// List available timezones grouped by region
#[tauri::command]
pub async fn list_timezones() -> Result<Vec<TimezoneInfo>, String> {
    let output = Command::new("timedatectl")
        .args(["list-timezones"])
        .output()
        .map_err(|e| format!("Failed to list timezones: {e}"))?;

    if !output.status.success() {
        // Fallback: read from zoneinfo
        return list_timezones_fallback();
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut regions: std::collections::BTreeMap<String, Vec<String>> =
        std::collections::BTreeMap::new();

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Some((region, city)) = line.split_once('/') {
            regions
                .entry(region.to_string())
                .or_default()
                .push(city.to_string());
        }
    }

    Ok(regions
        .into_iter()
        .map(|(region, cities)| TimezoneInfo { region, cities })
        .collect())
}

fn list_timezones_fallback() -> Result<Vec<TimezoneInfo>, String> {
    let zoneinfo = std::path::Path::new("/usr/share/zoneinfo");
    if !zoneinfo.exists() {
        return Err("No timezone data found".into());
    }

    let mut regions: std::collections::BTreeMap<String, Vec<String>> =
        std::collections::BTreeMap::new();

    let common_regions = [
        "Africa",
        "America",
        "Antarctica",
        "Arctic",
        "Asia",
        "Atlantic",
        "Australia",
        "Europe",
        "Indian",
        "Pacific",
    ];

    for region in &common_regions {
        let region_path = zoneinfo.join(region);
        if region_path.is_dir() {
            if let Ok(entries) = std::fs::read_dir(&region_path) {
                let mut cities: Vec<String> = entries
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().is_file())
                    .filter_map(|e| e.file_name().into_string().ok())
                    .collect();
                cities.sort();
                regions.insert(region.to_string(), cities);
            }
        }
    }

    Ok(regions
        .into_iter()
        .map(|(region, cities)| TimezoneInfo { region, cities })
        .collect())
}

/// List available locales from /etc/locale.gen or /usr/share/i18n/locales
#[tauri::command]
pub async fn list_locales() -> Result<Vec<LocaleEntry>, String> {
    // Try reading locale.gen for available locales
    let content = std::fs::read_to_string("/etc/locale.gen")
        .or_else(|_| std::fs::read_to_string("/usr/share/i18n/SUPPORTED"))
        .map_err(|e| format!("Cannot read locale list: {e}"))?;

    let mut locales: Vec<LocaleEntry> = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        // Skip empty lines and comments (but include commented-out locale lines)
        if line.is_empty() {
            continue;
        }
        let entry = if let Some(stripped) = line.strip_prefix('#') {
            stripped.trim()
        } else {
            line
        };

        if entry.is_empty() || !entry.contains("UTF-8") && !entry.contains("utf8") {
            continue;
        }

        let code = entry.split_whitespace().next().unwrap_or(entry);
        locales.push(LocaleEntry {
            code: code.to_string(),
            name: entry.to_string(),
        });
    }

    locales.sort_by(|a, b| a.code.cmp(&b.code));
    locales.dedup_by(|a, b| a.code == b.code);

    Ok(locales)
}

/// List available keyboard layouts
#[tauri::command]
pub async fn list_keymaps() -> Result<Vec<String>, String> {
    let output = Command::new("localectl")
        .args(["list-keymaps"])
        .output()
        .map_err(|e| format!("Failed to list keymaps: {e}"))?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout);
        return Ok(text.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect());
    }

    // Fallback: list from /usr/share/kbd/keymaps
    let kbd_path = std::path::Path::new("/usr/share/kbd/keymaps");
    if !kbd_path.exists() {
        return Err("No keymap data found".into());
    }

    let output = Command::new("find")
        .args([
            kbd_path.to_str().unwrap(),
            "-name",
            "*.map.gz",
            "-printf",
            "%f\n",
        ])
        .output()
        .map_err(|e| format!("find failed: {e}"))?;

    let text = String::from_utf8_lossy(&output.stdout);
    let mut keymaps: Vec<String> = text
        .lines()
        .map(|l| l.trim_end_matches(".map.gz").to_string())
        .collect();
    keymaps.sort();
    Ok(keymaps)
}
