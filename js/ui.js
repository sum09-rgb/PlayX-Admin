
const PAGE_ITEMS = [
  { name: "Overview", page: "overview" },
  { name: "Tournaments", page: "tournaments" },
  { name: "Players", page: "players" },
  { name: "Participants", page: "participants" },
  { name: "Teams", page: "teams" },
  { name: "Matches", page: "matches" },
  { name: "Results", page: "results" },
  { name: "Wallet & Payments", page: "wallet" },
  { name: "Notifications", page: "notifications" },
  { name: "Support Center", page: "support" },
  { name: "Reports & Analytics", page: "reports" },
  { name: "Staff & Roles", page: "staff" },
  { name: "Settings", page: "settings" },
  { name: "Activity Logs", page: "activity" },
  { name: "System Health", page: "system" }
];

export function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toastContainer");

  if (!container) {
    console.log(`[PlayX ${type}] ${message}`);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = String(message);
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-5px)";
    window.setTimeout(() => toast.remove(), 220);
  }, duration);
}

function closeMobileSidebar() {
  document.getElementById("adminSidebar")
    ?.classList.remove("sidebar-open");

  document.getElementById("sidebarOverlay")
    ?.classList.remove("active");
}

function initSidebar() {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("sidebarOverlay");

  document.getElementById("sidebarToggle")
    ?.addEventListener("click", () => {
      sidebar?.classList.add("sidebar-open");
      overlay?.classList.add("active");
    });

  document.getElementById("sidebarClose")
    ?.addEventListener("click", closeMobileSidebar);

  overlay?.addEventListener("click", closeMobileSidebar);

  // Delegated click handling for navigation and expandable groups.
  document.addEventListener("click", event => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const groupButton = target.closest(".nav-group-toggle");

    if (groupButton) {
      event.preventDefault();

      const group = groupButton.closest(".nav-group");

      if (!group) return;

      const isOpen = group.classList.toggle("open");

      groupButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

      return;
    }

    const navLink = target.closest(
      "#adminNavigation a[data-page]"
    );

    if (navLink && window.innerWidth <= 800) {
      closeMobileSidebar();
    }
  });

  // Set initial accessibility state.
  document.querySelectorAll(".nav-group-toggle").forEach(button => {
    button.setAttribute("aria-expanded", "false");
  });
}

function initProfileMenu() {
  const dropdown = document.getElementById("profileDropdown");

  if (!dropdown) {
    console.error("PlayX: profileDropdown element not found.");
    return;
  }

  // Delegated handling keeps the profile button responsive.
  document.addEventListener("click", event => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const profileButton = target.closest("#profileMenuBtn");
    const profileMenu = document.getElementById("profileMenu");

    if (profileButton) {
      event.preventDefault();
      event.stopPropagation();

      const isHidden = dropdown.classList.contains("hidden");

      dropdown.classList.toggle("hidden", !isHidden);

      profileButton.setAttribute(
        "aria-expanded",
        String(isHidden)
      );

      return;
    }

    if (!profileMenu?.contains(target)) {
      dropdown.classList.add("hidden");

      document.getElementById("profileMenuBtn")
        ?.setAttribute("aria-expanded", "false");
    }
  });
}

export function openGlobalModal(title, body, footer = "") {
  const modal = document.getElementById("globalModal");
  const titleElement = document.getElementById("modalTitle");
  const bodyElement = document.getElementById("modalBody");
  const footerElement = document.getElementById("modalFooter");

  if (!modal || !titleElement || !bodyElement) return;

  titleElement.textContent = title;
  bodyElement.replaceChildren();

  if (typeof body === "string") {
    bodyElement.textContent = body;
  } else if (body instanceof Node) {
    bodyElement.appendChild(body);
  }

  if (footerElement) {
    footerElement.innerHTML = footer;
    footerElement.classList.toggle("hidden", !footer);
  }

  modal.classList.remove("hidden");
}

export function closeGlobalModal() {
  document.getElementById("globalModal")
    ?.classList.add("hidden");
}

function initModal() {
  document.getElementById("modalClose")
    ?.addEventListener("click", closeGlobalModal);

  document.querySelectorAll("[data-modal-close]")
    .forEach(element => {
      element.addEventListener("click", closeGlobalModal);
    });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeGlobalModal();
    }
  });
}

function navigateFromSearch(page) {
  document.dispatchEvent(
    new CustomEvent("playx:navigate", {
      detail: { page }
    })
  );
}

function initGlobalSearch() {
  const button = document.getElementById("globalSearchBtn");

  button?.addEventListener("click", () => {
    const wrapper = document.createElement("div");
    wrapper.className = "global-search-content";

    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Search pages...";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Search admin pages");

    const results = document.createElement("div");
    results.className = "global-search-results";
    results.style.marginTop = "12px";

    wrapper.append(input, results);

    const renderResults = () => {
      results.replaceChildren();

      const query = input.value.trim().toLowerCase();

      const matches = PAGE_ITEMS.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.page.toLowerCase().includes(query)
      );

      if (!matches.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No matching pages found.";
        results.appendChild(empty);
        return;
      }

      matches.forEach(item => {
        const result = document.createElement("button");
        result.type = "button";
        result.className = "search-result";

        result.style.cssText =
          "display:flex;width:100%;padding:12px;margin-bottom:5px;" +
          "border:1px solid var(--border);border-radius:8px;" +
          "background:var(--panel-2);color:var(--text);" +
          "text-align:left;cursor:pointer;";

        result.textContent = `↗  ${item.name}`;

        result.addEventListener("click", () => {
          closeGlobalModal();
          navigateFromSearch(item.page);
        });

        results.appendChild(result);
      });
    };

    input.addEventListener("input", renderResults);

    openGlobalModal("Search PlayX Admin", wrapper);
    renderResults();

    window.setTimeout(() => input.focus(), 50);
  });
}

function initNotificationButton() {
  document.getElementById("notificationBtn")
    ?.addEventListener("click", () => {
      navigateFromSearch("notifications");
    });
}

export function initUI() {
  initSidebar();
  initProfileMenu();
  initModal();
  initGlobalSearch();
  initNotificationButton();

  const year = document.getElementById("currentYear");

  if (year) {
    year.textContent = new Date().getFullYear();
  }
}
