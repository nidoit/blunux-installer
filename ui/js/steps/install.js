// 설치 단계 - 실제 설치 실행

let progressInterval = null;

async function onEnter_install() {
  const state = getState();

  document.getElementById('install-done').style.display = 'none';
  document.getElementById('install-error').style.display = 'none';
  document.getElementById('install-progress-container').style.display = 'block';

  try {
    // 1단계: 디스크 자동 파티셔닝
    updateProgressUI(0, 12, '디스크 파티셔닝 중...');

    await invoke('auto_partition', {
      disk: state.selectedDisk,
      layout: {
        efi_size_mb: state.efiSizeMb,
        swap_size_mb: state.swapSizeMb,
      }
    });

    // 2단계: 파티션 포맷
    updateProgressUI(1, 12, '파티션 포맷 중...');

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

    // 3단계: 메인 설치 시작 (비동기, 백그라운드에서 실행)
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

    // 진행 상황 폴링 시작
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
      // 폴링 오류 무시
    }
  }, 1000);
}

function updateProgressUI(step, total, message) {
  const percent = total > 0 ? Math.round((step / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = `${percent}%`;
  document.getElementById('progress-message').textContent = message;
  document.getElementById('progress-percent').textContent = `${percent}%`;

  const stepLabel = document.getElementById('progress-step-label');
  if (stepLabel) {
    stepLabel.textContent = `${step} / ${total} 단계`;
  }
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
    // 재부팅 전 마운트 해제
    await invoke('unmount_all');
  } catch (e) {
    // 무시
  }

  // systemctl로 재부팅
  try {
    const { Command } = window.__TAURI__.shell;
    await Command.create('systemctl', ['reboot']).execute();
  } catch (e) {
    alert('수동으로 재부팅하세요: systemctl reboot');
  }
});
