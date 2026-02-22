// 사용자 계정 설정 단계

function onEnter_user() {
  // 뒤로 돌아갈 때 상태에서 값 채우기
  const state = getState();
  if (state.hostname) document.getElementById('hostname').value = state.hostname;
  if (state.username) document.getElementById('username').value = state.username;
}

function validate_user() {
  const hostname = document.getElementById('hostname').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('user-password').value;
  const passwordConfirm = document.getElementById('user-password-confirm').value;
  const rootPassword = document.getElementById('root-password').value;
  const rootPasswordConfirm = document.getElementById('root-password-confirm').value;
  const errorEl = document.getElementById('user-errors');

  errorEl.textContent = '';

  if (!hostname) {
    errorEl.textContent = '호스트명은 필수입니다.';
    return false;
  }
  if (!/^[a-zA-Z0-9\-]+$/.test(hostname)) {
    errorEl.textContent = '호스트명에는 영문자, 숫자, 하이픈만 사용할 수 있습니다.';
    return false;
  }
  if (!username) {
    errorEl.textContent = '사용자 이름은 필수입니다.';
    return false;
  }
  if (!/^[a-z_][a-z0-9_\-]*$/.test(username)) {
    errorEl.textContent = '사용자 이름은 소문자로 시작해야 하며, 소문자, 숫자, 밑줄, 하이픈만 사용할 수 있습니다.';
    return false;
  }
  if (!password) {
    errorEl.textContent = '비밀번호는 필수입니다.';
    return false;
  }
  if (password !== passwordConfirm) {
    errorEl.textContent = '비밀번호가 일치하지 않습니다.';
    return false;
  }
  if (!rootPassword) {
    errorEl.textContent = '루트 비밀번호는 필수입니다.';
    return false;
  }
  if (rootPassword !== rootPasswordConfirm) {
    errorEl.textContent = '루트 비밀번호가 일치하지 않습니다.';
    return false;
  }

  updateState({
    hostname,
    username,
    password,
    rootPassword,
  });

  return true;
}
