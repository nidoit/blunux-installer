// Network step

let selectedSsid = null;

async function onEnter_network() {
  await checkNetwork();
}

async function checkNetwork() {
  const statusBox = document.getElementById('network-status');
  statusBox.innerHTML = '<p>Checking connection...</p>';
  statusBox.className = 'status-box';

  try {
    const status = await invoke('check_connection');
    const state = getState();

    if (status.connected) {
      statusBox.className = 'status-box connected';
      statusBox.innerHTML = `
        <p><strong>Connected</strong> via ${status.method}</p>
        ${status.ip ? `<p>IP: ${status.ip}</p>` : ''}
      `;
      updateState({ networkConnected: true });
      document.getElementById('wifi-section').style.display = 'none';
    } else {
      statusBox.className = 'status-box disconnected';
      statusBox.innerHTML = `<p><strong>Not connected.</strong> Connect via WiFi below or plug in an Ethernet cable.</p>`;
      updateState({ networkConnected: false });
      document.getElementById('wifi-section').style.display = 'block';
    }
  } catch (e) {
    statusBox.className = 'status-box disconnected';
    statusBox.innerHTML = `<p>Error checking connection: ${e}</p>`;
  }
}

document.getElementById('btn-wifi-scan')?.addEventListener('click', async () => {
  const list = document.getElementById('wifi-list');
  list.innerHTML = '<p>Scanning...</p>';

  try {
    const networks = await invoke('list_wifi_networks');
    list.innerHTML = '';

    for (const net of networks) {
      const item = document.createElement('div');
      item.className = 'list-item' + (net.connected ? ' selected' : '');
      item.innerHTML = `
        <div>
          <div class="item-name">${escapeHtml(net.ssid)}</div>
          <div class="item-detail">${escapeHtml(net.security)}</div>
        </div>
        <div class="item-detail">Signal: ${net.signal}%</div>
      `;
      item.addEventListener('click', () => {
        selectedSsid = net.ssid;
        list.querySelectorAll('.list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        document.getElementById('wifi-connect-form').style.display = 'block';
      });
      list.appendChild(item);
    }

    if (networks.length === 0) {
      list.innerHTML = '<p>No WiFi networks found.</p>';
    }
  } catch (e) {
    list.innerHTML = `<p class="error-text">Failed to scan: ${e}</p>`;
  }
});

document.getElementById('btn-wifi-connect')?.addEventListener('click', async () => {
  if (!selectedSsid) return;
  const password = document.getElementById('wifi-password').value;
  const btn = document.getElementById('btn-wifi-connect');
  btn.disabled = true;
  btn.textContent = 'Connecting...';

  try {
    await invoke('connect_wifi', { ssid: selectedSsid, password });
    await checkNetwork();
  } catch (e) {
    alert('Failed to connect: ' + e);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Connect';
  }
});

function validate_network() {
  if (!getState().networkConnected) {
    alert('Please connect to the internet before proceeding.');
    return false;
  }
  return true;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
