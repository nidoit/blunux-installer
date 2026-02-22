// 환영 단계

function onEnter_welcome() {
  // 진입 시 NTP 동기화
  invoke('sync_ntp').catch(() => {});
}

function validate_welcome() {
  return true;
}
