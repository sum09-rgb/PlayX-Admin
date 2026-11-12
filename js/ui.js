
/* =========================================
   PLAYX ADMIN — USER INTERFACE CONTROLS
   ========================================= */

const $ = id => document.getElementById(id);

/* SIDEBAR */


export function initSidebar() {
    const sidebar = $("adminSidebar");
    const overlay = $("sidebarOverlay");
    const openBtn = $("sidebarOpenBtn");
    const closeBtn = $("sidebarCloseBtn");
    const navigation = $("adminNavigation");

    function openSidebar() {
        sidebar?.classList.add("open");
        overlay?.classList.add("active");
    }

    function closeSidebar() {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("active");
    }

    openBtn?.addEventListener("click", openSidebar);
    closeBtn?.addEventListener("click", closeSidebar);
    overlay?.addEventListener("click", closeSidebar);

    navigation?.addEventListener("click", event => {
        const groupButton = event.target.closest("[data-group]");

        if (groupButton) {
            const groupName = groupButton.dataset.group;
            const group = $(groupName);

            if (!group) return;

            const isOpen = group.classList.toggle("open");

            groupButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            return;
        }

        if (event.target.closest("[data-page]")) {
            closeSidebar();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
            closeModal();
            closeProfileMenu();
        }
    });
}


/* MODAL */

export function openModal(options = {}) {
    const overlay = $("modalOverlay");
    const title = $("modalTitle");
    const body = $("modalBody");
    const footer = $("modalFooter");

    if (!overlay) return;

    if (title) {
        title.textContent = options.title || "Information";
    }

    if (body) {
        body.innerHTML = options.body || "";
    }

    if (footer) {
        footer.innerHTML = options.footer || "";
    }

    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
}

export function closeModal() {
    const overlay = $("modalOverlay");

    if (!overlay) return;

    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
}

function initModal() {
    $("modalCloseBtn")?.addEventListener("click", closeModal);

    $("modalOverlay")?.addEventListener("click", event => {
        if (event.target.id === "modalOverlay") {
            closeModal();
        }
    });
}

/* TOAST NOTIFICATIONS */

export function showToast(message, type = "info") {
    const container = $("toastContainer");

    if (!container) {
        console.log(`[PlayX ${type}]`, message);
        return;
    }

    const allowedTypes = [
        "success",
        "error",
        "warning",
        "info"
    ];

    const safeType = allowedTypes.includes(type)
        ? type
        : "info";

    const toast = document.createElement("div");

    toast.className = `toast toast-${safeType}`;

    const icon = {
        success: "✓",
        error: "✕",
        warning: "!",
        info: "i"
    }[safeType];

    const messageElement = document.createElement("span");
    messageElement.textContent = String(message);

    const iconElement = document.createElement("span");
    iconElement.className = "toast-icon";
    iconElement.textContent = icon;

    toast.append(iconElement, messageElement);
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {
        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

/* PROFILE MENU */

export function closeProfileMenu() {
    const menu = $("profileMenu");

    if (!menu) return;

    menu.classList.add("hidden");
}

function initProfileMenu() {
    const button = $("profileMenuBtn");
    const menu = $("profileMenu");

    button?.addEventListener("click", event => {
        event.stopPropagation();

        menu?.classList.toggle("hidden");
    });

    document.addEventListener("click", event => {
        if (
            menu &&
            !menu.contains(event.target) &&
            !button?.contains(event.target)
        ) {
            closeProfileMenu();
        }
    });
}

/* GLOBAL SEARCH */

function initGlobalSearch() {
    $("globalSearchBtn")?.addEventListener("click", () => {
        openModal({
            title: "Search PlayX Admin",
            body: `
                <div class="form-group">
                    <label class="form-label" for="adminGlobalSearch">
                        Search pages
                    </label>
                    <input
                        class="form-control"
                        id="adminGlobalSearch"
                        type="search"
                        placeholder="Search tournaments, players..."
                        autocomplete="off"
                    >
                    <small class="form-hint">
                        Search navigation pages.
                    </small>
                </div>
                <div id="globalSearchResults"></div>
            `,
            footer: `
                <button class="btn btn-secondary" id="globalSearchClose">
                    Close
                </button>
            `
        });

        const searchInput = $("adminGlobalSearch");

        searchInput?.focus();

        $("globalSearchClose")?.addEventListener(
            "click",
            closeModal
        );

        searchInput?.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            const results = $("globalSearchResults");

            if (!results) return;

            results.innerHTML = "";

            if (!query) return;

            const pages = [
                ["Overview", "overview"],
                ["Tournaments", "tournaments"],
                ["Players", "players"],
                ["Participants", "participants"],
                ["Teams", "teams"],
                ["Matches", "matches"],
                ["Results", "results"],
                ["Wallet", "wallet"],
                ["Notifications", "notifications"],
                ["Support", "support"],
                ["Reports", "reports"],
                ["Staff", "staff"],
                ["Settings", "settings"],
                ["Activity Logs", "activity"],
                ["System", "system"]
            ];

            const matches = pages.filter(([name]) =>
                name.toLowerCase().includes(query)
            );

            if (matches.length === 0) {
                results.textContent = "No matching pages found.";
                return;
            }

            matches.forEach(([name, page]) => {
                const button = document.createElement("button");

                button.type = "button";
                button.className = "btn btn-outline";
                button.style.width = "100%";
                button.style.marginTop = "6px";
                button.style.justifyContent = "flex-start";
                button.textContent = name;

                button.addEventListener("click", () => {
                    document.dispatchEvent(
                        new CustomEvent("playx:navigate", {
                            detail: { page }
                        })
                    );

                    closeModal();
                });

                results.appendChild(button);
            });
        });
    });
}

/* NOTIFICATION BUTTON */

function initNotificationButton() {
    $("notificationBtn")?.addEventListener("click", () => {
        document.dispatchEvent(
            new CustomEvent("playx:navigate", {
                detail: { page: "notifications" }
            })
        );
    });
}

/* INITIALIZE UI */

export function initUI() {
    initSidebar();
    initModal();
    initProfileMenu();
    initGlobalSearch();
    initNotificationButton();
}
