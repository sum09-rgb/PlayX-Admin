
/* =========================================
   PLAYX ADMIN — MAIN APPLICATION
   ========================================= */

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

/* APPLICATION STATE */

let currentAdmin = null;
let routerInitialized = false;
let loginInProgress = false;

/* ELEMENT HELPER */

const $ = id => document.getElementById(id);

/* SHOW LOGIN */

function showLogin() {
    $("loginView")?.classList.remove("hidden");
    $("dashboardView")?.classList.add("hidden");
}

/* SHOW DASHBOARD */

function showDashboard() {
    $("loginView")?.classList.add("hidden");
    $("dashboardView")?.classList.remove("hidden");
}

/* HIDE LOADING SCREEN */

function hideLoadingScreen() {
    $("loadingScreen")?.classList.add("hidden");
}

/* UPDATE ADMIN PROFILE */


function updateAdminProfile(admin) {
    const name =
        admin.Name ||
        admin.name ||
        admin.displayName ||
        admin.email ||
        "Admin";

    const role = getRoleLabel(
        admin.Role || admin.role
    );

    const nameElement = $("adminName");
    const roleElement = $("adminRole");
    const avatarElement = $("adminAvatar");
    const headerNameElement = $("headerAdminName");
    const headerRoleElement = $("headerAdminRole");
    const headerAvatarElement = $("headerAvatar");

    if (nameElement) {
        nameElement.textContent = name;
    }

    if (roleElement) {
        roleElement.textContent = role;
    }

    if (avatarElement) {
        avatarElement.textContent = name.charAt(0).toUpperCase();
    }

    if (headerNameElement) {
        headerNameElement.textContent = name;
    }

    if (headerRoleElement) {
        headerRoleElement.textContent = role;
    }

    if (headerAvatarElement) {
        headerAvatarElement.textContent = name.charAt(0).toUpperCase();
    }
}


/* HANDLE AUTHENTICATED ADMIN */

async function handleAdminLogin(admin) {
    currentAdmin = admin;

    updateAdminProfile(admin);
    showDashboard();

    if (!routerInitialized) {
        routerInitialized = true;
        await initRouter();
    }

    hideLoadingScreen();
}

/* HANDLE LOGOUT / NO SESSION */

function handleNoSession() {
    currentAdmin = null;

    showLogin();
    hideLoadingScreen();
}

/* LOGIN FORM */

function initLoginForm() {
    const form = $("loginForm");
    const emailInput = $("adminEmail");
    const passwordInput = $("adminPassword");
    const loginButton = $("loginBtn");

    if (!form) {
        console.error("Login form not found.");
        return;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (loginInProgress) return;

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;

        if (!email || !password) {
            showToast(
                "Enter your email and password.",
                "warning"
            );
            return;
        }

        loginInProgress = true;

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Signing in...";
        }

        try {
            const admin = await loginAdmin(email, password);

            await handleAdminLogin(admin);

            showToast("Welcome to PlayX Admin.", "success");

            if (passwordInput) {
                passwordInput.value = "";
            }

        } catch (error) {
            showToast(
                error.message || "Login failed.",
                "error"
            );

        } finally {
            loginInProgress = false;

            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Sign In";
            }
        }
    });
}

/* LOGOUT BUTTONS */

function initLogoutButtons() {
    document.addEventListener("click", async event => {
        const logoutButton = event.target.closest(
            '[data-action="logout"], #logoutBtn, #sidebarLogoutBtn'
        );

        if (!logoutButton) return;

        event.preventDefault();

        if (logoutButton.disabled) return;

        logoutButton.disabled = true;

        try {
            await logoutAdmin();

            currentAdmin = null;

            showLogin();

            showToast("You have signed out.", "success");

        } catch (error) {
            showToast(
                error.message || "Logout failed.",
                "error"
            );

        } finally {
            logoutButton.disabled = false;
        }
    });
}

/* CUSTOM PAGE NAVIGATION EVENTS */

function initNavigationEvents() {
    document.addEventListener(
        "playx:navigate",
        event => {
            const page = event.detail?.page;

            if (page) {
                navigateTo(page);
            }
        }
    );
}

/* FIREBASE AUTH SESSION */

function initAuthSession() {
    watchAdminSession(async admin => {
        if (!admin) {
            handleNoSession();
            return;
        }

        try {
            await handleAdminLogin(admin);

        } catch (error) {
            console.error(
                "Dashboard initialization error:",
                error
            );

            showToast(
                "Could not initialize the dashboard.",
                "error"
            );

            hideLoadingScreen();
        }
    });
}

/* APPLICATION STARTUP */

function startApplication() {
    initUI();
    initLoginForm();
    initLogoutButtons();
    initNavigationEvents();

    showLogin();

    initAuthSession();
}

/* START AFTER HTML LOADS */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        startApplication,
        { once: true }
    );
} else {
    startApplication();
}
