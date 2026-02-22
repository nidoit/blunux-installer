// Disk selection step

let disks = [];

async function onEnter_disk() {
  await refreshDisks();
}

async function refreshDisks() {
  const list = document.getElementById('disk-list');
  list.innerHTML = '<p>Loading disks...</p>';

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
      list.innerHTML = '<p>No disks found.</p>';
    }
  } catch (e) {
    list.innerHTML = `<p class="error-text">Failed to list disks: ${e}</p>`;
  }
}

document.getElementById('btn-refresh-disks')?.addEventListener('click', refreshDisks);

function validate_disk() {
  const state = getState();
  if (!state.selectedDisk) {
    alert('Please select a disk.');
    return false;
  }

  // Save partition options
  const rootFstype = document.getElementById('root-fstype').value;
  const efiSize = parseInt(document.getElementById('efi-size').value) || 512;
  const swapSize = parseInt(document.getElementById('swap-size').value) || 4096;

  // Determine partition names (e.g., /dev/sda1, /dev/nvme0n1p1)
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
