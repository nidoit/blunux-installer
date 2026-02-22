// Bootloader step

function onEnter_bootloader() {
  // Restore state
  const state = getState();
  const radio = document.querySelector(`input[name="bootloader"][value="${state.bootloader}"]`);
  if (radio) {
    radio.checked = true;
    document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
    radio.closest('.radio-card').classList.add('selected');
  }

  // Restore service checkboxes
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
