use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiskInfo {
    pub name: String,
    pub path: String,
    pub size: String,
    pub model: String,
    pub disk_type: String, // "disk", "part", etc.
    pub mountpoint: Option<String>,
    pub fstype: Option<String>,
    pub children: Option<Vec<DiskInfo>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LsblkOutput {
    blockdevices: Vec<LsblkDevice>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LsblkDevice {
    name: String,
    size: Option<String>,
    model: Option<String>,
    #[serde(rename = "type")]
    dtype: Option<String>,
    mountpoint: Option<String>,
    fstype: Option<String>,
    path: Option<String>,
    children: Option<Vec<LsblkDevice>>,
}

fn lsblk_device_to_disk_info(dev: &LsblkDevice) -> DiskInfo {
    DiskInfo {
        name: dev.name.clone(),
        path: dev
            .path
            .clone()
            .unwrap_or_else(|| format!("/dev/{}", dev.name)),
        size: dev.size.clone().unwrap_or_default(),
        model: dev.model.clone().unwrap_or_else(|| "Unknown".into()),
        disk_type: dev.dtype.clone().unwrap_or_default(),
        mountpoint: dev.mountpoint.clone(),
        fstype: dev.fstype.clone(),
        children: dev
            .children
            .as_ref()
            .map(|c| c.iter().map(lsblk_device_to_disk_info).collect()),
    }
}

/// List all block devices (disks only, not partitions at top level)
#[tauri::command]
pub async fn list_disks() -> Result<Vec<DiskInfo>, String> {
    let output = Command::new("lsblk")
        .args(["-J", "-o", "NAME,SIZE,MODEL,TYPE,MOUNTPOINT,FSTYPE,PATH"])
        .output()
        .map_err(|e| format!("Failed to run lsblk: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "lsblk failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let parsed: LsblkOutput =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("Failed to parse lsblk: {e}"))?;

    let disks: Vec<DiskInfo> = parsed
        .blockdevices
        .iter()
        .filter(|d| d.dtype.as_deref() == Some("disk"))
        .map(lsblk_device_to_disk_info)
        .collect();

    Ok(disks)
}

/// List partitions for a specific disk
#[tauri::command]
pub async fn list_partitions(disk: String) -> Result<Vec<DiskInfo>, String> {
    let output = Command::new("lsblk")
        .args([
            "-J",
            "-o",
            "NAME,SIZE,MODEL,TYPE,MOUNTPOINT,FSTYPE,PATH",
            &disk,
        ])
        .output()
        .map_err(|e| format!("Failed to run lsblk: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "lsblk failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let parsed: LsblkOutput =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("Failed to parse lsblk: {e}"))?;

    let mut partitions = Vec::new();
    for dev in &parsed.blockdevices {
        if let Some(children) = &dev.children {
            for child in children {
                partitions.push(lsblk_device_to_disk_info(child));
            }
        }
    }

    Ok(partitions)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PartitionLayout {
    pub efi_size_mb: u64,
    pub swap_size_mb: u64,
    // Remaining space goes to root
}

/// Auto-partition a disk with GPT: EFI + swap + root
#[tauri::command]
pub async fn auto_partition(disk: String, layout: PartitionLayout) -> Result<String, String> {
    // Safety: refuse to partition if disk is mounted
    let check = Command::new("findmnt")
        .args(["-rn", "-S", &disk])
        .output()
        .map_err(|e| format!("findmnt failed: {e}"))?;
    if !check.stdout.is_empty() {
        return Err(format!("Disk {disk} has mounted partitions. Unmount first."));
    }

    // Wipe and create GPT
    run_cmd("sgdisk", &["--zap-all", &disk])?;

    // EFI partition
    let efi_size = format!("+{}M", layout.efi_size_mb);
    run_cmd(
        "sgdisk",
        &["-n", &format!("1:0:{efi_size}"), "-t", "1:ef00", "-c", "1:EFI", &disk],
    )?;

    // Swap partition
    let swap_size = format!("+{}M", layout.swap_size_mb);
    run_cmd(
        "sgdisk",
        &[
            "-n",
            &format!("2:0:{swap_size}"),
            "-t",
            "2:8200",
            "-c",
            "2:swap",
            &disk,
        ],
    )?;

    // Root partition (rest of disk)
    run_cmd(
        "sgdisk",
        &["-n", "3:0:0", "-t", "3:8300", "-c", "3:root", &disk],
    )?;

    // Inform kernel of partition changes
    run_cmd("partprobe", &[&disk])?;

    // Wait for devices to settle
    run_cmd("udevadm", &["settle"])?;

    Ok(format!("Partitioned {disk} with EFI + swap + root"))
}

/// Format a partition with a given filesystem
#[tauri::command]
pub async fn format_partition(partition: String, fstype: String) -> Result<String, String> {
    match fstype.as_str() {
        "fat32" | "vfat" => {
            run_cmd("mkfs.fat", &["-F", "32", &partition])?;
        }
        "ext4" => {
            run_cmd("mkfs.ext4", &["-F", &partition])?;
        }
        "btrfs" => {
            run_cmd("mkfs.btrfs", &["-f", &partition])?;
        }
        "xfs" => {
            run_cmd("mkfs.xfs", &["-f", &partition])?;
        }
        "swap" => {
            run_cmd("mkswap", &[&partition])?;
            run_cmd("swapon", &[&partition])?;
        }
        _ => return Err(format!("Unsupported filesystem: {fstype}")),
    }
    Ok(format!("Formatted {partition} as {fstype}"))
}

/// Mount a partition to a target path
#[tauri::command]
pub async fn mount_partition(partition: String, target: String) -> Result<String, String> {
    std::fs::create_dir_all(&target).map_err(|e| format!("mkdir failed: {e}"))?;
    run_cmd("mount", &[&partition, &target])?;
    Ok(format!("Mounted {partition} at {target}"))
}

/// Unmount all under /mnt
#[tauri::command]
pub async fn unmount_all() -> Result<String, String> {
    // Ignore errors — some may not be mounted
    let _ = Command::new("swapoff").arg("--all").output();
    let _ = Command::new("umount").args(["-R", "/mnt"]).output();
    Ok("Unmounted all".into())
}

fn run_cmd(cmd: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(cmd)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run {cmd}: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "{cmd} failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
