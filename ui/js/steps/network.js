// 네트워크 설정 단계

let selectedSsid = null;

async function onEnter_network() {
  await checkNetwork();
}

async function checkNetwork() {
  const statusBox = document.getElementById('network-status');
  statusBox.innerHTML = '<p>연결 확인 중...</p>';
  statusBox.className = 'status-box';

  try {
    const status = await invoke('check_connection');

    if (status.connected) {
      statusBox.className = 'status-box connected';
      statusBox.innerHTML = `
        <p><strong>연결됨</strong> (${status.method} 방식)</p>
        ${status.ip ? `<p>IP: ${status.ip}</p>` : ''}
      `;
      updateState({ networkConnected: true });
      document.getElementById('wifi-section').style.display = 'none';
    } else {
      statusBox.className = 'status-box disconnected';
      statusBox.innerHTML = `<p><strong>연결되지 않았습니다.</strong> 아래에서 WiFi에 연결하거나 이더넷 케이블을 연결하세요.</p>`;
      updateState({ networkConnected: false });
      document.getElementById('wifi-section').style.display = 'block';
      // 연결이 안 되어 있으면 자동으로 WiFi 검색
      await scanWifiNetworks();
    }
  } catch (e) {
    statusBox.className = 'status-box disconnected';
    statusBox.innerHTML = `<p>연결 확인 오류: ${e}</p>`;
  }
}

async function scanWifiNetworks() {
  const list = document.getElementById('wifi-list');
  list.innerHTML = '<p>검색 중...</p>';

  try {
    const networks = await invoke('list_wifi_networks');
    list.innerHTML = '';

    // 상위 5개 신호 강도 네트워크만 표시
    const topNetworks = networks.slice(0, 5);

    for (const net of topNetworks) {
      const signalNum = parseInt(net.signal) || 0;
      const signalBars = getSignalBars(signalNum);

      const item = document.createElement('div');
      item.className = 'list-item' + (net.connected ? ' selected' : '');
      item.innerHTML = `
        <div>
          <div class="item-name">${escapeHtml(net.ssid)}</div>
          <div class="item-detail">${escapeHtml(net.security)}</div>
        </div>
        <div class="wifi-signal">
          <span class="signal-bars">${signalBars}</span>
          <span class="item-detail">${net.signal}%</span>
        </div>
      `;
      item.addEventListener('click', () => {
        selectedSsid = net.ssid;
        list.querySelectorAll('.list-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        document.getElementById('wifi-connect-form').style.display = 'block';
      });
      list.appendChild(item);
    }

    if (topNetworks.length === 0) {
      list.innerHTML = '<p>WiFi 네트워크를 찾을 수 없습니다.</p>';
    }
  } catch (e) {
    list.innerHTML = `<p class="error-text">검색 실패: ${e}</p>`;
  }
}

function getSignalBars(signal) {
  if (signal >= 80) return '\u2589\u2589\u2589\u2589';
  if (signal >= 60) return '\u2589\u2589\u2589\u2581';
  if (signal >= 40) return '\u2589\u2589\u2581\u2581';
  if (signal >= 20) return '\u2589\u2581\u2581\u2581';
  return '\u2581\u2581\u2581\u2581';
}

document.getElementById('btn-wifi-scan')?.addEventListener('click', scanWifiNetworks);

document.getElementById('btn-wifi-connect')?.addEventListener('click', async () => {
  if (!selectedSsid) return;
  const password = document.getElementById('wifi-password').value;
  const btn = document.getElementById('btn-wifi-connect');
  btn.disabled = true;
  btn.textContent = '연결 중...';

  try {
    await invoke('connect_wifi', { ssid: selectedSsid, password });
    await checkNetwork();
  } catch (e) {
    alert('연결 실패: ' + e);
  } finally {
    btn.disabled = false;
    btn.textContent = '연결';
  }
});

function validate_network() {
  if (!getState().networkConnected) {
    alert('계속하기 전에 인터넷에 연결하세요.');
    return false;
  }
  return true;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
