const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

function showTab(tab) {
  const isLogin = tab === 'login';
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  loginTab.classList.toggle('active', isLogin);
  registerTab.classList.toggle('active', !isLogin);
  loginTab.setAttribute('aria-selected', String(isLogin));
  registerTab.setAttribute('aria-selected', String(!isLogin));
  clearMessages();
}

function clearMessages() {
  document.querySelectorAll('.message').forEach((message) => {
    message.textContent = '';
    message.className = 'message';
  });
}

loginTab.addEventListener('click', () => showTab('login'));
registerTab.addEventListener('click', () => showTab('register'));
document
  .getElementById('goRegister')
  .addEventListener('click', () => showTab('register'));
document
  .getElementById('goLogin')
  .addEventListener('click', () => showTab('login'));

document.querySelectorAll('.show-password').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.target);
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.textContent = showing ? 'Show' : 'Hide';
  });
});

function showMessage(id, text, type) {
  const element = document.getElementById(id);
  element.textContent = text;
  element.className = 'message ' + type;
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('fullName').value.trim();
  const email = document
    .getElementById('registerEmail')
    .value.trim()
    .toLowerCase();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password.length < 12 || password.length > 128) {
    showMessage(
      'registerMessage',
      'Password must contain 12-128 characters.',
      'error',
    );
    return;
  }
  if (password !== confirmPassword) {
    showMessage(
      'registerMessage',
      'Passwords do not match. Please try again.',
      'error',
    );
    return;
  }

  const button = registerForm.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await FIR.request('/register', 'POST', { name, email, password });
    showMessage(
      'registerMessage',
      'Citizen account created. You can now log in.',
      'success',
    );
    document.getElementById('loginEmail').value = email;
    registerForm.reset();
  } catch (error) {
    showMessage('registerMessage', error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document
    .getElementById('loginEmail')
    .value.trim()
    .toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const button = loginForm.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await FIR.request('/login', 'POST', {
      email,
      password,
      remember: document.getElementById('rememberMe').checked,
    });
    loginForm.reset();
    FIR.sessionChanged();
    window.location.href = '/dashboard.html';
  } catch (error) {
    showMessage('loginMessage', error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

document.getElementById('forgotButton').addEventListener('click', () => {
  showMessage(
    'loginMessage',
    'Self-service password recovery is not available. Contact the portal operator; do not share your password.',
    'error',
  );
});
