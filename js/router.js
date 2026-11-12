
/* =========================================
   PLAYX ADMIN — PAGE ROUTER
   ========================================= */

import { canAccessPage } from "./permissions.js";
import { getCurrentAdmin } from "./auth.js";
import { showToast } from "./ui.js";

const PAGE_CONFIG = {
    overview: {
        title: "Overview",
        breadcrumb: "Dashboard"
    },
    tournaments: {
        title: "Tournaments",
        breadcrumb: "Tournament Management"
    },
    players: {
        title: "Players",
        breadcrumb: "Player Management"
    },
    participants: {
        title: "Participants",
        breadcrumb: "Tournament Management"
    },
    teams: {
        title: "Teams",
        breadcrumb: "Tournament Management"
    },
    matches: {
        title: "Matches",
        breadcrumb: "Tournament Management"
    },
    results: {
        title: "Results",
        breadcrumb: "Tournament Management"
    },
    wallet: {
        title: "Wallet",
        breadcrumb: "Finance"
    },
    notifications: {
        title: "Notifications",
        breadcrumb: "Communication"
    },
    support: {
        title: "Support",
        breadcrumb: "Communication"
    },
    reports: {
        title: "Reports",
        breadcrumb: "Analytics"
    },
    staff: {
        title: "Staff",
        breadcrumb: "Platform Management"
    },
    settings: {
        title: "Settings",
        breadcrumb: "Platform Management"
    },
    activity: {
        title: "Activity Logs",
        breadcrumb: "Platform Management"
    },
    system: {
        title: "System",
        breadcrumb: "Platform Management"
    }
};

let currentPage = null;
let pageLoading = false;
let pageRequestNumber = 0;

const loadedModules = new Map();

const $ = id => document.getElementById(id);

/* PAGE CSS */

function loadPageCSS(pageName) {
    const cssId = "playx-page-css";
    let link = document.getElementById(cssId);

    if (!link) {
        link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }

    link.href = `css/pages/${pageName}.css`;
}

/* LOADING STATE */

function showPageLoading() {
    const container = $("pageContent");

    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <div class="inline-loader"></div>
            <p>Loading page...</p>
        </div>
    `;
}

/* ERROR STATE */

function showPageError(message, pageName) {
    const container = $("pageContent");

    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <h3>Unable to load page</h3>
            <p>${escapeText(message)}</p>
            <button
                class="btn btn-primary"
                id="pageRetryBtn"
                type="button"
            >
                Try Again
            </button>
        </div>
    `;

    $("pageRetryBtn")?.addEventListener("click", () => {
        navigateTo(pageName);
    });
}

/* ESCAPE ERROR TEXT */

function escapeText(value) {
    const element = document.createElement("div");
    element.textContent = String(value || "Unknown error");
    return element.innerHTML;
}

/* PAGE INFORMATION */

function updatePageInformation(pageName) {
    const config = PAGE_CONFIG[pageName];

    if (!config) return;

    const title = $("pageTitle");
    const breadcrumb = $("pageBreadcrumb");

    if (title) title.textContent = config.title;

    if (breadcrumb) {
        breadcrumb.textContent = config.breadcrumb;
    }

    document.title = `${config.title} | PlayX Admin`;
}

/* SIDEBAR ACTIVE STATE */

function updateSidebar(pageName) {
    document
        .querySelectorAll("#adminNavigation [data-page]")
        .forEach(element => {
            const active = element.dataset.page === pageName;

            element.classList.toggle("active", active);

            if (active) {
                const group = element.closest(".nav-group");

                if (group) {
                    group.classList.add("open");

                    const button = group.querySelector("[data-group]");

                    button?.setAttribute(
                        "aria-expanded",
                        "true"
                    );
                }
            }
        });
}

/* PAGE MODULE INITIALIZATION */

async function initializePageModule(pageName) {
    const modulePath = `./modules/${pageName}.js`;

    let pageModule = loadedModules.get(pageName);

    if (!pageModule) {
        try {
            pageModule = await import(modulePath);
            loadedModules.set(pageName, pageModule);
        } catch (error) {
            if (error.message?.includes("Failed to fetch") ||
                error.message?.includes("Importing a module")) {
                console.warn(`No module available for ${pageName}.`);
                return;
            }

            throw error;
        }
    }

    if (typeof pageModule.init === "function") {
        await pageModule.init();
    }

    if (typeof pageModule.onPageLoad === "function") {
        await pageModule.onPageLoad();
    }
}

/* NAVIGATE */

export async function navigateTo(pageName) {
    if (!PAGE_CONFIG[pageName]) {
        showToast("Page not found.", "error");
        return;
    }

    const admin = getCurrentAdmin();

    if (!canAccessPage(admin, pageName)) {
        showToast("You do not have permission to access this page.", "error");
        return;
    }

    const container = $("pageContent");

    if (!container) {
        console.error("Missing pageContent element.");
        return;
    }

    if (pageLoading) return;

    pageLoading = true;

    const requestNumber = ++pageRequestNumber;

    showPageLoading();

    try {
        const response = await fetch(
            `pages/${pageName}.html`
        );

        if (!response.ok) {
            throw new Error(
                `Page request failed (${response.status}).`
            );
        }

        const html = await response.text();

        if (requestNumber !== pageRequestNumber) return;

        container.innerHTML = html;

        loadPageCSS(pageName);
        updatePageInformation(pageName);
        updateSidebar(pageName);

        currentPage = pageName;

        await initializePageModule(pageName);

        document.dispatchEvent(
            new CustomEvent("playx:page-loaded", {
                detail: { page: pageName }
            })
        );

    } catch (error) {
        console.error("Page loading error:", error);

        showPageError(
            error.message || "Something went wrong.",
            pageName
        );

    } finally {
        pageLoading = false;
    }
}

/* ROUTER INITIALIZATION */

export async function initRouter() {
    const navigation = $("adminNavigation");

    if (!navigation) {
        console.error("Missing adminNavigation element.");
        return;
    }

    navigation.addEventListener("click", event => {
        const link = event.target.closest("[data-page]");

        if (!link) return;

        event.preventDefault();

        const pageName = link.dataset.page;

        if (pageName) {
            navigateTo(pageName);
        }
    });

    await navigateTo("overview");
}

/* CURRENT PAGE */

export function getCurrentPage() {
    return currentPage;
}
