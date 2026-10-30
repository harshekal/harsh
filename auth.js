const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function showTab(tab) {
  const isLogin = tab === "login";
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  loginTab.classList.toggle("active", isLogin);
  registerTab.classList.toggle("active", !isLogin);
  loginTab.setAttribute("aria-selected", String(isLogin));
  registerTab.setAttribute("aria-selected", String(!isLogin));
  clearMessages();
}

function clearMessages() {
  document.querySelectorAll(".message").forEach(message => {
    message.textContent = "";
    message.className = "message";
  });
}

loginTab.addEventListener("click", () => showTab("login"));
registerTab.addEventListener("click", () => showTab("register"));
document.getElementById("goRegister").addEventListener("click", () => showTab("register"));
document.getElementById("goLogin").addEventListener("click", () => showTab("login"));

document.querySelectorAll(".show-password").forEach(button => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.target);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? "Show" : "Hide";
  });
});

function getAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem("firDemoAccounts") || "[]");
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function showMessage(id, text, type) {
  const element = document.getElementById(id);
  element.textContent = text;
  element.className = "message " + type;
}

registerForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("fullName").value.trim();
  const email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const role = document.getElementById("registerRole").value;
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password.length < 8) {
    showMessage("registerMessage", "Password must contain at least 8 characters.", "error");
    return;
  }
  if (password !== confirmPassword) {
    showMessage("registerMessage", "Passwords do not match. Please try again.", "error");
    return;
  }

  const accounts = getAccounts();
  if (accounts.some(account => account.email === email)) {
    showMessage("registerMessage", "An account with this email already exists in this browser.", "error");
    return;
  }

  // Demo only: never store plain-text passwords in a real application.
  // Production authentication requires a secure server and password hashing.
  accounts.push({ name, email, role, password, createdAt: new Date().toISOString() });

  try {
    localStorage.setItem("firDemoAccounts", JSON.stringify(accounts));
    showMessage("registerMessage", "Demo account created. You can now log in.", "success");
    document.getElementById("loginEmail").value = email;
    registerForm.reset();
  } catch {
    showMessage("registerMessage", "Could not save the demo account in this browser.", "error");
  }
});

loginForm.addEventListener("submit", event => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const accounts = getAccounts();
  const account = accounts.find(item => item.email === email && item.password === password);

  if (!account) {
    showMessage("loginMessage", "Account not found or password incorrect. Register a demo account first.", "error");
    return;
  }

  showMessage("loginMessage", `Welcome, ${account.name}! Opening the dashboard…`, "success");
  // Demo-only client-side session; not secure authentication.
  localStorage.setItem("firCurrentUser", JSON.stringify({ name: account.name, email: account.email, role: account.role, signedInAt: new Date().toISOString() }));
  window.location.href = "dashboard.html";
});

document.getElementById("forgotButton").addEventListener("click", () => {
  showMessage("loginMessage", "Password recovery is not available in this frontend demo. Create a new demo account if needed.", "error");
});
