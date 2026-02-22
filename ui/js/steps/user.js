// User account step

function onEnter_user() {
  // Populate from state if going back
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
    errorEl.textContent = 'Hostname is required.';
    return false;
  }
  if (!/^[a-zA-Z0-9\-]+$/.test(hostname)) {
    errorEl.textContent = 'Hostname can only contain letters, numbers, and hyphens.';
    return false;
  }
  if (!username) {
    errorEl.textContent = 'Username is required.';
    return false;
  }
  if (!/^[a-z_][a-z0-9_\-]*$/.test(username)) {
    errorEl.textContent = 'Username must start with a lowercase letter and contain only lowercase letters, numbers, underscores, and hyphens.';
    return false;
  }
  if (!password) {
    errorEl.textContent = 'Password is required.';
    return false;
  }
  if (password !== passwordConfirm) {
    errorEl.textContent = 'Passwords do not match.';
    return false;
  }
  if (!rootPassword) {
    errorEl.textContent = 'Root password is required.';
    return false;
  }
  if (rootPassword !== rootPasswordConfirm) {
    errorEl.textContent = 'Root passwords do not match.';
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
