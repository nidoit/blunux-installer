// 패키지 선택 단계

let configPackages = [];
let extraPackages = [];

async function onEnter_packages() {
  await Promise.all([loadConfigPackages(), loadExtraPackages()]);
}

async function loadConfigPackages() {
  const container = document.getElementById('config-packages');

  try {
    configPackages = await invoke('load_config_packages');
    renderPackageGroups(container, configPackages, true);
  } catch (e) {
    // 설정을 사용할 수 없는 경우 (라이브 ISO가 아닌 경우) 기본값 사용
    configPackages = [{
      name: '기본 시스템',
      packages: ['base', 'linux', 'linux-firmware', 'base-devel', 'networkmanager', 'grub', 'efibootmgr', 'sudo', 'vim'],
      required: true
    }];
    renderPackageGroups(container, configPackages, true);
  }
}

async function loadExtraPackages() {
  const container = document.getElementById('extra-packages');

  try {
    extraPackages = await invoke('list_available_packages');
    renderPackageGroups(container, extraPackages, false);
  } catch (e) {
    container.innerHTML = `<p class="error-text">추가 패키지 불러오기 실패: ${e}</p>`;
  }
}

function renderPackageGroups(container, groups, isConfig) {
  container.innerHTML = '';

  for (const group of groups) {
    const div = document.createElement('div');
    div.className = 'package-group';
    div.dataset.groupName = group.name;

    const header = document.createElement('div');
    header.className = 'package-group-header';
    header.innerHTML = `
      <h4>
        <input type="checkbox" ${group.required ? 'checked disabled' : 'checked'}
               data-config="${isConfig}" data-group="${group.name}" />
        ${escapeHtml(group.name)}
        <span class="pkg-count">(${group.packages.length}개 패키지)</span>
      </h4>
      ${group.required ? '<span class="badge-required">필수</span>' : ''}
    `;

    const body = document.createElement('div');
    body.className = 'package-group-body';
    body.innerHTML = group.packages.map(p => `<span class="package-tag">${escapeHtml(p)}</span>`).join('');

    header.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      div.classList.toggle('expanded');
    });

    div.appendChild(header);
    div.appendChild(body);
    container.appendChild(div);
  }
}

function validate_packages() {
  const selected = [];

  // 선택된 그룹 수집
  document.querySelectorAll('.package-group-header input[type="checkbox"]:checked').forEach(cb => {
    const groupName = cb.dataset.group;
    const allGroups = [...configPackages, ...extraPackages];
    const group = allGroups.find(g => g.name === groupName);
    if (group) {
      selected.push(...group.packages);
    }
  });

  // 중복 제거
  const unique = [...new Set(selected)];

  if (unique.length === 0) {
    alert('최소한 하나의 패키지 그룹을 선택하세요.');
    return false;
  }

  updateState({ selectedPackages: unique });
  return true;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
