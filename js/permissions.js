
/* =========================================
   PLAYX ADMIN — ROLE PERMISSIONS
   ========================================= */

const ROLE_PERMISSIONS = {
    superadmin: ["*"],

    admin: [
        "overview",
        "tournaments",
        "players",
        "participants",
        "teams",
        "matches",
        "results",
        "wallet",
        "notifications",
        "support",
        "reports",
        "staff",
        "settings",
        "activity",
        "system"
    ],

    moderator: [
        "overview",
        "tournaments",
        "players",
        "participants",
        "teams",
        "matches",
        "results",
        "notifications",
        "support",
        "reports"
    ],

    support: [
        "overview",
        "players",
        "participants",
        "support",
        "notifications"
    ],

    finance: [
        "overview",
        "wallet",
        "reports",
        "activity"
    ]
};

/* NORMALIZE ROLE */

export function normalizeRole(role) {
    return String(role || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
}

/* CHECK PAGE ACCESS */

export function canAccessPage(admin, pageName) {
    if (!admin || admin.Active !== true) {
        return false;
    }

    const role = normalizeRole(admin.Role || admin.role);

    const permissions = ROLE_PERMISSIONS[role];

    if (!permissions) return false;

    return (
        permissions.includes("*") ||
        permissions.includes(pageName)
    );
}

/* CHECK ACTION PERMISSION */

export function canPerformAction(admin, action) {
    if (!admin || admin.Active !== true) {
        return false;
    }

    const role = normalizeRole(admin.Role || admin.role);

    if (role === "superadmin") return true;

    const actionPermissions = {
        createTournament: ["admin"],
        editTournament: ["admin", "moderator"],
        deleteTournament: ["admin"],
        managePlayers: ["admin", "moderator"],
        manageResults: ["admin", "moderator"],
        manageWallet: ["admin", "finance"],
        manageStaff: ["admin"],
        manageSettings: ["admin"],
        manageSystem: ["admin"],
        handleSupport: ["admin", "moderator", "support"]
    };

    return (
        actionPermissions[action]?.includes(role) || false
    );
}

/* GET ROLE LABEL */

export function getRoleLabel(role) {
    const labels = {
        superadmin: "Super Admin",
        admin: "Admin",
        moderator: "Moderator",
        support: "Support Staff",
        finance: "Finance Staff"
    };

    return labels[normalizeRole(role)] || "Unknown Role";
}

/* GET ROLE PERMISSIONS */

export function getRolePermissions(role) {
    return ROLE_PERMISSIONS[normalizeRole(role)] || [];
}
