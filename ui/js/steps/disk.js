// 디스크 선택 단계

let disks = [];

async function onEnter_disk() {
  await refreshDisks();
}

async function refreshDisks() {
  const list = document.getElementById('disk-list');
  list.innerHTML = '<p>디스크 로딩 중...</p>';

  try {
    disks = await invoke('list_disks');
    list.innerHTML = '';

    for (const disk of disks) {
      const item = document.createElement('div');
      const isSelected = getState().selectedDisk === disk.path;
      item.className = 'list-item' + (isSelected ? ' selected' : '');
      item.innerHTML = `
        <div>
          <div class="item-name">${escapeHtml(disk.path)}</div>
          <div class="item-detail">${escapeHtml(disk.model)}</div>
        </div>
        <div class="item-detail">${escapeHtml(disk.size)}</div>
      `;
      item.addEventListener('click', () => {
        updateState({ selectedDisk: disk.path });
        list.querySelectorAll('.list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        document.getElementById('partition-options').style.display = 'block';
      });
      list.appendChild(item);
    }

    if (disks.length === 0) {
      list.innerHTML = '<p>디스크를 찾을 수 없습니다.</p>';
    }
  } catch (e) {
    list.innerHTML = `<p class="error-text">디스크 목록 불러오기 실패: ${e}</p>`;
  }
}

document.getElementById('btn-refresh-disks')?.addEventListener('click', refreshDisks);

function validate_disk() {
  const state = getState();
  if (!state.selectedDisk) {
    alert('디스크를 선택하세요.');
    return false;
  }

  // 파티션 옵션 저장
  const rootFstype = document.getElementById('root-fstype').value;
  const efiSize = parseInt(document.getElementById('efi-size').value) || 512;
  const swapSize = parseInt(document.getElementById('swap-size').value) || 4096;

  // 파티션 이름 결정 (예: /dev/sda1, /dev/nvme0n1p1)
  const disk = state.selectedDisk;
  const partSuffix = disk.match(/nvme|loop/) ? 'p' : '';

  updateState({
    rootFstype,
    efiSizeMb: efiSize,
    swapSizeMb: swapSize,
    efiPartition: `${disk}${partSuffix}1`,
    swapPartition: swapSize > 0 ? `${disk}${partSuffix}2` : '',
    rootPartition: `${disk}${partSuffix}3`,
  });

  return true;
}
