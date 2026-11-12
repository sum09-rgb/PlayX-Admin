
import {
  loginAdmin,
  logoutAdmin,
  watchAdminSession
} from "./auth.js";

import {
  initRouter,
  navigateTo
} from "./router.js";

import {
  initUI,
  showToast
} from "./ui.js";

import {
  getRoleLabel
} from "./permissions.js";

let routerInitialized = false;
let sessionUnsubscribe = null;
let loginInProgress = false;

function showLoginView() {
  document.getElementById("loginView")?.classList.remove("hidden");
  document.getElementById("dashboardView")?.classList.add("hidden");
}

function showDashboardView() {
  document.getElementById("loginView")?.classList.add("hidden");
  document.getElementById("dashboardView")?.classList.remove("hidden");
}

function updateAdminProfile(admin) {
  if (!admin) return;

  const name =
    admin.name ||
    admin.Name ||
    admin.displayName ||
    admin.email ||
    "Administrator";

  const role = admin.Role || admin.role || "admin";
  const roleLabel = getRoleLabel(role);
  const initial = String(name).trim().charAt(0).toUpperCase() || "A";

  const elements = {
    adminName: name,
    adminRole: roleLabel,
    adminAvatar: initial,
    headerAdminName: name,
    headerAdminRole: roleLabel,
    headerAvatar: initial,
    dropdownAdminName: name,
    dropdownAdminRole: roleLabel
  };

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
}

function setLoginError(message = "") {
  const errorElement = document.getElementById("loginError");
  if (!errorElement) return;

  errorElement.textContent = message;
  errorElement.classList.toggle("hidden", !message);
}

function setLoginButtonLoading(loading) {
  const button = document.getElementById("loginButton");
  if (!button) return;

  button.disabled = loading;
  button.innerHTML = loading
    ? '<span class="loading-spinner"></span> Signing in...'
    : 'Sign In <span>→</span>';
}

function initializeRouterOnce() {
  if (routerInitialized) return;

  routerInitialized = true;
  initRouter();
}

function enterDashboard(admin) {
  if (!admin) return;

  updateAdminProfile(admin);
  showDashboardView();
  initializeRouterOnce();
}

async function handleAdminLogin(event) {
  event.preventDefault();

  if (loginInProgress) return;

  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!email || !password) {
    setLoginError("Please enter your email and password.");
    return;
  }

  loginInProgress = true;
  setLoginError("");
  setLoginButtonLoading(true);

  try {
    const admin = await loginAdmin(email, password);

    if (!admin) {
      throw new Error("Administrator verification failed.");
    }

    enterDashboard(admin);
    showToast("Welcome to PlayX Admin.", "success");
  } catch (error) {
    console.error("Admin login error:", error);

    setLoginError(
      error.message || "Unable to sign in. Please check your details."
    );
  } finally {
    loginInProgress = false;
    setLoginButtonLoading(false);
  }
}

async function handleLogout() {
  try {
    await logoutAdmin();

    showLoginView();

    const passwordInput = document.getElementById("loginPassword");
    if (passwordInput) passwordInput.value = "";

    document.getElementById("profileDropdown")?.classList.add("hidden");

    setLoginError("");
    showToast("You have signed out.", "success");
  } catch (error) {
    console.error("Logout error:", error);
    showToast("Unable to sign out. Please try again.", "error");
  }
}

function initLogoutButtons() {
  document.addEventListener("click", event => {
    const button = event.target.closest(
      "#logoutBtn, #sidebarLogoutBtn, [data-action='logout']"
    );

    if (!button) return;

    event.preventDefault();
    handleLogout();
  });
}

function initNavigationEvents() {
  document.addEventListener("playx:navigate", event => {
    const page = event.detail?.page;
    if (!page) return;

    navigateTo(page);
  });
}

function initLoginForm() {
  const form = document.getElementById("loginForm");

  form?.addEventListener("submit", handleAdminLogin);
}

function initAuthSession() {
  if (sessionUnsubscribe) return;

  sessionUnsubscribe = watchAdminSession(admin => {
    if (admin) {
      enterDashboard(admin);
    } else if (!loginInProgress) {
      showLoginView();
    }
  });
}

function initApp() {
  initUI();
  initLoginForm();
  initLogoutButtons();
  initNavigationEvents();
  initAuthSession();

  showLoginView();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp, { once: true });
} else {
  initApp();
}
   
