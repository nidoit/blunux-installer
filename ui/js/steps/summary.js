// 요약 단계

function onEnter_summary() {
  const state = getState();
  const container = document.getElementById('summary-content');

  container.innerHTML = `
    <div class="summary-item">
      <div class="summary-label">디스크</div>
      <div class="summary-value">${escapeHtml(state.selectedDisk || '선택되지 않음')}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">파일 시스템</div>
      <div class="summary-value">${escapeHtml(state.rootFstype)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">시간대</div>
      <div class="summary-value">${escapeHtml(state.timezone)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">로케일</div>
      <div class="summary-value">${escapeHtml(state.locale)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">키보드 레이아웃</div>
      <div class="summary-value">${escapeHtml(state.keymap)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">호스트명</div>
      <div class="summary-value">${escapeHtml(state.hostname)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">사용자 이름</div>
      <div class="summary-value">${escapeHtml(state.username)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">부트로더</div>
      <div class="summary-value">${escapeHtml(state.bootloader)}</div>
    </div>
    <div class="summary-item" style="grid-column: span 2;">
      <div class="summary-label">패키지 (${state.selectedPackages.length}개)</div>
      <div class="summary-value" style="font-size: 0.85rem; font-weight: normal; word-break: break-all;">
        ${state.selectedPackages.map(p => escapeHtml(p)).join(', ')}
      </div>
    </div>
    <div class="summary-item" style="grid-column: span 2;">
      <div class="summary-label">활성화할 서비스</div>
      <div class="summary-value" style="font-size: 0.85rem; font-weight: normal;">
        ${state.enableServices.map(s => escapeHtml(s)).join(', ')}
      </div>
    </div>
  `;
}

function validate_summary() {
  // 설치 진행 전 확인
  return confirm('설치를 시작하시겠습니까? 선택한 디스크의 모든 데이터가 삭제됩니다.');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
