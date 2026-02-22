// Summary step

function onEnter_summary() {
  const state = getState();
  const container = document.getElementById('summary-content');

  container.innerHTML = `
    <div class="summary-item">
      <div class="summary-label">Disk</div>
      <div class="summary-value">${escapeHtml(state.selectedDisk || 'Not selected')}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Filesystem</div>
      <div class="summary-value">${escapeHtml(state.rootFstype)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Timezone</div>
      <div class="summary-value">${escapeHtml(state.timezone)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Locale</div>
      <div class="summary-value">${escapeHtml(state.locale)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Keymap</div>
      <div class="summary-value">${escapeHtml(state.keymap)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Hostname</div>
      <div class="summary-value">${escapeHtml(state.hostname)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Username</div>
      <div class="summary-value">${escapeHtml(state.username)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Bootloader</div>
      <div class="summary-value">${escapeHtml(state.bootloader)}</div>
    </div>
    <div class="summary-item" style="grid-column: span 2;">
      <div class="summary-label">Packages (${state.selectedPackages.length})</div>
      <div class="summary-value" style="font-size: 0.85rem; font-weight: normal; word-break: break-all;">
        ${state.selectedPackages.map(p => escapeHtml(p)).join(', ')}
      </div>
    </div>
    <div class="summary-item" style="grid-column: span 2;">
      <div class="summary-label">Enabled Services</div>
      <div class="summary-value" style="font-size: 0.85rem; font-weight: normal;">
        ${state.enableServices.map(s => escapeHtml(s)).join(', ')}
      </div>
    </div>
  `;
}

function validate_summary() {
  // Confirm before proceeding to install
  return confirm('Are you sure you want to start the installation? All data on the selected disk will be erased.');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
