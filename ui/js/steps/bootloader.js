// 부트로더 설정 단계

function onEnter_bootloader() {
  // 상태 복원
  const state = getState();
  const radio = document.querySelector(`input[name="bootloader"][value="${state.bootloader}"]`);
  if (radio) {
    radio.checked = true;
    document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
    radio.closest('.radio-card').classList.add('selected');
  }

  // 서비스 체크박스 복원
  document.querySelectorAll('.service-list input[type="checkbox"]').forEach(cb => {
    cb.checked = state.enableServices.includes(cb.value);
  });
}

function validate_bootloader() {
  const bootloader = document.querySelector('input[name="bootloader"]:checked')?.value || 'grub';

  const services = [];
  document.querySelectorAll('.service-list input[type="checkbox"]:checked').forEach(cb => {
    services.push(cb.value);
  });

  updateState({ bootloader, enableServices: services });
  return true;
}
