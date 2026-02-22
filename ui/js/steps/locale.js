// Locale & Timezone step

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
    regionSelect.innerHTML = '<option value="">Select region...</option>';

    for (const tz of timezoneData) {
      const opt = document.createElement('option');
      opt.value = tz.region;
      opt.textContent = tz.region;
      regionSelect.appendChild(opt);
    }

    regionSelect.addEventListener('change', () => {
      const region = regionSelect.value;
      const tzEntry = timezoneData.find(t => t.region === region);
      citySelect.innerHTML = '<option value="">Select city...</option>';

      if (tzEntry) {
        for (const city of tzEntry.cities) {
          const opt = document.createElement('option');
          opt.value = city;
          opt.textContent = city;
          citySelect.appendChild(opt);
        }
      }
    });

    // Pre-select if state has values
    const state = getState();
    if (state.timezone) {
      const [region, city] = state.timezone.split('/');
      regionSelect.value = region;
      regionSelect.dispatchEvent(new Event('change'));
      citySelect.value = city;
    }
  } catch (e) {
    regionSelect.innerHTML = `<option>Error: ${e}</option>`;
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
      if (loc.code === 'en_US.UTF-8') opt.selected = true;
      select.appendChild(opt);
    }
  } catch (e) {
    select.innerHTML = `<option>Error: ${e}</option>`;
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
    select.innerHTML = `<option>Error: ${e}</option>`;
  }
}

function validate_locale() {
  const region = document.getElementById('tz-region').value;
  const city = document.getElementById('tz-city').value;
  const locale = document.getElementById('locale-select').value;
  const keymap = document.getElementById('keymap-select').value;

  if (!region || !city) {
    alert('Please select a timezone.');
    return false;
  }
  if (!locale) {
    alert('Please select a locale.');
    return false;
  }

  updateState({
    timezone: `${region}/${city}`,
    locale,
    keymap: keymap || 'us',
  });

  return true;
}
