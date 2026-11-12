
/* =========================================
   PLAYX ADMIN — SHARED UTILITIES
   ========================================= */

/* CURRENCY */

export function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

/* NUMBER */

export function formatNumber(number) {
    return new Intl.NumberFormat("en-IN").format(
        Number(number) || 0
    );
}

/* DATE */

export function formatDate(value) {
    if (!value) return "—";

    const date = toDate(value);

    if (!date) return "—";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}

/* DATE AND TIME */

export function formatDateTime(value) {
    if (!value) return "—";

    const date = toDate(value);

    if (!date) return "—";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

/* CONVERT FIRESTORE OR NORMAL DATE */

export function toDate(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    const date = new Date(value);

    return isNaN(date.getTime()) ? null : date;
}

/* TIME AGO */

export function timeAgo(value) {
    const date = toDate(value);

    if (!date) return "Unknown";

    const seconds = Math.floor(
        (Date.now() - date.getTime()) / 1000
    );

    if (seconds < 60) return "Just now";

    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)} min ago`;
    }

    if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)} hr ago`;
    }

    if (seconds < 2592000) {
        return `${Math.floor(seconds / 86400)} days ago`;
    }

    return formatDate(date);
}

/* HTML ESCAPING */

export function escapeHTML(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );
}

/* UNIQUE ID */

export function generateId(prefix = "playx") {
    return `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}

/* DEBOUNCE */

export function debounce(callback, delay = 300) {
    let timer;

    return (...args) => {
        clearTimeout(timer);

        timer = setTimeout(() => {
            callback(...args);
        }, delay);
    };
}

/* WAIT */

export function wait(milliseconds = 300) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

/* GET ELEMENT */

export function getElement(id) {
    return document.getElementById(id);
}

/* SAFE TEXT UPDATE */

export function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value ?? "";
    }
}

/* LOADING BUTTON */

export function setButtonLoading(button, loading, loadingText = "Please wait...") {
    if (!button) return;

    if (loading) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.textContent = loadingText;
    } else {
        button.disabled = false;

        if (button.dataset.originalText !== undefined) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

/* EMPTY VALUE */

export function displayValue(value, fallback = "—") {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    return value;
}
