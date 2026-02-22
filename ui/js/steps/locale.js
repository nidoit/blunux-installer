// 지역 및 시간대 설정 단계

let timezoneData = [];
let localeData = [];

async function onEnter_locale() {
  await Promise.all([loadTimezones(), loadLocales(), loadKeymaps()]);
}

async function loadTimezones() {
  const regionSelect = document.getElementById('tz-region');
  const citySelect = document.getElementById('tz-city');

  try {
    timezoneData = await invoke('list_timezones');
    regionSelect.innerHTML = '<option value="">지역 선택...</option>';

    for (const tz of timezoneData) {
      const opt = document.createElement('option');
      opt.value = tz.region;
      opt.textContent = tz.region;
      regionSelect.appendChild(opt);
    }

    regionSelect.addEventListener('change', () => {
      const region = regionSelect.value;
      const tzEntry = timezoneData.find(t => t.region === region);
      citySelect.innerHTML = '<option value="">도시 선택...</option>';

      if (tzEntry) {
        for (const city of tzEntry.cities) {
          const opt = document.createElement('option');
          opt.value = city;
          opt.textContent = city;
          citySelect.appendChild(opt);
        }
      }
    });

    // 상태에 값이 있으면 미리 선택
    const state = getState();
    if (state.timezone) {
      const [region, city] = state.timezone.split('/');
      regionSelect.value = region;
      regionSelect.dispatchEvent(new Event('change'));
      citySelect.value = city;
    }
  } catch (e) {
    regionSelect.innerHTML = `<option>오류: ${e}</option>`;
  }
}

async function loadLocales() {
  const select = document.getElementById('locale-select');

  try {
    localeData = await invoke('list_locales');
    select.innerHTML = '';

    for (const loc of localeData) {
      const opt = document.createElement('option');
      opt.value = loc.code;
      opt.textContent = loc.code;
      if (loc.code === 'ko_KR.UTF-8') opt.selected = true;
      select.appendChild(opt);
    }
  } catch (e) {
    select.innerHTML = `<option>오류: ${e}</option>`;
  }
}

async function loadKeymaps() {
  const select = document.getElementById('keymap-select');

  try {
    const keymaps = await invoke('list_keymaps');
    select.innerHTML = '';

    for (const km of keymaps) {
      const opt = document.createElement('option');
      opt.value = km;
      opt.textContent = km;
      if (km === 'us') opt.selected = true;
      select.appendChild(opt);
    }
  } catch (e) {
    select.innerHTML = `<option>오류: ${e}</option>`;
  }
}

function validate_locale() {
  const region = document.getElementById('tz-region').value;
  const city = document.getElementById('tz-city').value;
  const locale = document.getElementById('locale-select').value;
  const keymap = document.getElementById('keymap-select').value;

  if (!region || !city) {
    alert('시간대를 선택하세요.');
    return false;
  }
  if (!locale) {
    alert('로케일을 선택하세요.');
    return false;
  }

  updateState({
    timezone: `${region}/${city}`,
    locale,
    keymap: keymap || 'us',
  });

  return true;
}
