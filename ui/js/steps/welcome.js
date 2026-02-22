// Welcome step — no special logic needed

function onEnter_welcome() {
  // NTP sync on entry
  invoke('sync_ntp').catch(() => {});
}

function validate_welcome() {
  return true;
}
