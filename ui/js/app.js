// Blunux 설치 프로그램 - 메인 앱 컨트롤러

const { invoke } = window.__TAURI__.core;

const STEPS = [
  'welcome', 'network', 'disk', 'locale',
  'user', 'packages', 'bootloader', 'summary', 'install'
];

let currentStepIndex = 0;

// 각 단계에서 수집되는 전역 상태
const installState = {
  // 네트워크
  networkConnected: false,
  // 디스크
  selectedDisk: null,
  rootFstype: 'ext4',
  efiSizeMb: 512,
  swapSizeMb: 4096,
  rootPartition: '',
  efiPartition: '',
  swapPartition: '',
  // 지역 설정
  timezone: '',
  locale: 'ko_KR.UTF-8',
  keymap: 'us',
  // 사용자
  hostname: 'blunux',
  username: '',
  password: '',
  rootPassword: '',
  // 패키지
  selectedPackages: [],
  // 부트로더
  bootloader: 'grub',
  enableServices: ['NetworkManager', 'bluetooth', 'sddm', 'fstrim.timer'],
};

function getState() {
  return installState;
}

function updateState(partial) {
  Object.assign(installState, partial);
}

// 네비게이션
function goToStep(index) {
  if (index < 0 || index >= STEPS.length) return;

  const oldStep = STEPS[currentStepIndex];
  const newStep = STEPS[index];

  // 이전 단계 숨기기
  document.getElementById(`step-${oldStep}`).classList.remove('active');
  // 새 단계 표시
  document.getElementById(`step-${newStep}`).classList.add('active');

  // 사이드바 업데이트
  document.querySelectorAll('#step-nav li').forEach((li, i) => {
    li.classList.remove('active');
    if (i < index) li.classList.add('completed');
    if (i === index) li.classList.add('active');
  });

  currentStepIndex = index;

  // 네비게이션 버튼 업데이트
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  btnPrev.style.display = index > 0 ? 'inline-block' : 'none';

  if (newStep === 'install') {
    btnNext.style.display = 'none';
    btnPrev.style.display = 'none';
  } else if (newStep === 'summary') {
    btnNext.textContent = '설치';
    btnNext.classList.add('btn-danger');
    btnNext.classList.remove('btn-primary');
    btnNext.style.display = 'inline-block';
  } else {
    btnNext.textContent = '다음';
    btnNext.classList.remove('btn-danger');
    btnNext.classList.add('btn-primary');
    btnNext.style.display = 'inline-block';
  }

  // 단계 진입 콜백 실행
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

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  btnNext.addEventListener('click', () => {
    if (!validateCurrentStep()) return;

    // 요약 단계에서 설치 시작
    if (STEPS[currentStepIndex] === 'summary') {
      goToStep(STEPS.indexOf('install'));
      return;
    }

    goToStep(currentStepIndex + 1);
  });

  btnPrev.addEventListener('click', () => {
    goToStep(currentStepIndex - 1);
  });

  // 사이드바 클릭 네비게이션 (완료된 단계만)
  document.querySelectorAll('#step-nav li').forEach((li, i) => {
    li.addEventListener('click', () => {
      if (i <= currentStepIndex) {
        goToStep(i);
      }
    });
  });

  // 부트로더 라디오 카드
  document.querySelectorAll('.radio-card input[name="bootloader"]').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      input.closest('.radio-card').classList.add('selected');
    });
  });

  // 환영 단계에서 시작
  goToStep(0);
});
