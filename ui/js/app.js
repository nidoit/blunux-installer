// Blunux Installer - Main App Controller

const { invoke } = window.__TAURI__.core;

const STEPS = [
  'welcome', 'network', 'disk', 'locale',
  'user', 'packages', 'bootloader', 'summary', 'install'
];

let currentStepIndex = 0;

// Global state collected across steps
const installState = {
  // Network
  networkConnected: false,
  // Disk
  selectedDisk: null,
  rootFstype: 'ext4',
  efiSizeMb: 512,
  swapSizeMb: 4096,
  rootPartition: '',
  efiPartition: '',
  swapPartition: '',
  // Locale
  timezone: '',
  locale: 'en_US.UTF-8',
  keymap: 'us',
  // User
  hostname: 'blunux',
  username: '',
  password: '',
  rootPassword: '',
  // Packages
  selectedPackages: [],
  // Bootloader
  bootloader: 'grub',
  enableServices: ['NetworkManager', 'bluetooth', 'sddm', 'fstrim.timer'],
};

function getState() {
  return installState;
}

function updateState(partial) {
  Object.assign(installState, partial);
}

// Navigation
function goToStep(index) {
  if (index < 0 || index >= STEPS.length) return;

  const oldStep = STEPS[currentStepIndex];
  const newStep = STEPS[index];

  // Hide old step
  document.getElementById(`step-${oldStep}`).classList.remove('active');
  // Show new step
  document.getElementById(`step-${newStep}`).classList.add('active');

  // Update sidebar
  document.querySelectorAll('#step-nav li').forEach((li, i) => {
    li.classList.remove('active');
    if (i < index) li.classList.add('completed');
    if (i === index) li.classList.add('active');
  });

  currentStepIndex = index;

  // Update nav buttons
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  btnPrev.style.display = index > 0 ? 'inline-block' : 'none';

  if (newStep === 'install') {
    btnNext.style.display = 'none';
    btnPrev.style.display = 'none';
  } else if (newStep === 'summary') {
    btnNext.textContent = 'Install';
    btnNext.classList.add('btn-danger');
    btnNext.classList.remove('btn-primary');
    btnNext.style.display = 'inline-block';
  } else {
    btnNext.textContent = 'Next';
    btnNext.classList.remove('btn-danger');
    btnNext.classList.add('btn-primary');
    btnNext.style.display = 'inline-block';
  }

  // Fire step enter callback
  const enterFn = window[`onEnter_${newStep}`];
  if (typeof enterFn === 'function') enterFn();
}

function validateCurrentStep() {
  const step = STEPS[currentStepIndex];
  const validateFn = window[`validate_${step}`];
  if (typeof validateFn === 'function') {
    return validateFn();
  }
  return true;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  btnNext.addEventListener('click', () => {
    if (!validateCurrentStep()) return;

    // If on summary, start install
    if (STEPS[currentStepIndex] === 'summary') {
      goToStep(STEPS.indexOf('install'));
      return;
    }

    goToStep(currentStepIndex + 1);
  });

  btnPrev.addEventListener('click', () => {
    goToStep(currentStepIndex - 1);
  });

  // Sidebar click navigation (only to completed steps)
  document.querySelectorAll('#step-nav li').forEach((li, i) => {
    li.addEventListener('click', () => {
      if (i <= currentStepIndex) {
        goToStep(i);
      }
    });
  });

  // Bootloader radio cards
  document.querySelectorAll('.radio-card input[name="bootloader"]').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      input.closest('.radio-card').classList.add('selected');
    });
  });

  // Start at welcome
  goToStep(0);
});
