// Install step - runs the actual installation

let progressInterval = null;

async function onEnter_install() {
  const state = getState();

  document.getElementById('install-done').style.display = 'none';
  document.getElementById('install-error').style.display = 'none';
  document.getElementById('install-progress-container').style.display = 'block';

  try {
    // Step 1: Auto-partition the disk
    updateProgressUI(0, 12, 'Partitioning disk...');

    await invoke('auto_partition', {
      disk: state.selectedDisk,
      layout: {
        efi_size_mb: state.efiSizeMb,
        swap_size_mb: state.swapSizeMb,
      }
    });

    // Step 2: Format partitions
    updateProgressUI(1, 12, 'Formatting partitions...');

    await invoke('format_partition', {
      partition: state.efiPartition,
      fstype: 'fat32'
    });

    await invoke('format_partition', {
      partition: state.rootPartition,
      fstype: state.rootFstype
    });

    if (state.swapPartition) {
      await invoke('format_partition', {
        partition: state.swapPartition,
        fstype: 'swap'
      });
    }

    // Step 3: Start the main install (async, runs in background)
    await invoke('run_install', {
      config: {
        disk: state.selectedDisk,
        root_partition: state.rootPartition,
        efi_partition: state.efiPartition,
        swap_partition: state.swapPartition || null,
        root_fstype: state.rootFstype,
        hostname: state.hostname,
        username: state.username,
        password: state.password,
        root_password: state.rootPassword,
        timezone: state.timezone,
        locale: state.locale,
        keymap: state.keymap,
        bootloader: state.bootloader,
        packages: state.selectedPackages,
        enable_services: state.enableServices,
      }
    });

    // Poll progress
    startProgressPolling();
  } catch (e) {
    showError(String(e));
  }
}

function startProgressPolling() {
  if (progressInterval) clearInterval(progressInterval);

  progressInterval = setInterval(async () => {
    try {
      const progress = await invoke('get_install_progress');
      updateProgressUI(progress.step, progress.total_steps, progress.message);

      if (progress.finished) {
        clearInterval(progressInterval);
        progressInterval = null;

        if (progress.error) {
          showError(progress.error);
        } else {
          showDone();
        }
      }
    } catch (e) {
      // Ignore poll errors
    }
  }, 1000);
}

function updateProgressUI(step, total, message) {
  const percent = total > 0 ? Math.round((step / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = `${percent}%`;
  document.getElementById('progress-message').textContent = message;
  document.getElementById('progress-percent').textContent = `${percent}%`;
}

function showDone() {
  document.getElementById('install-progress-container').style.display = 'none';
  document.getElementById('install-done').style.display = 'block';
}

function showError(msg) {
  document.getElementById('install-progress-container').style.display = 'none';
  document.getElementById('install-error').style.display = 'block';
  document.getElementById('install-error-msg').textContent = msg;
}

document.getElementById('btn-reboot')?.addEventListener('click', async () => {
  try {
    // Unmount before reboot
    await invoke('unmount_all');
  } catch (e) {
    // Ignore
  }

  // Use systemctl to reboot
  try {
    const { Command } = window.__TAURI__.shell;
    await Command.create('systemctl', ['reboot']).execute();
  } catch (e) {
    alert('Please reboot manually: systemctl reboot');
  }
});
