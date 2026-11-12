/* =========================================
   PLAYX ADMIN — OVERVIEW MODULE
   ========================================= */

import { db } from "../firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ELEMENT HELPERS */

const $ = id => document.getElementById(id);

function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value;
    }
}

/* SAFE HTML */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

/* TOURNAMENT DATA HELPERS */

function getTournamentName(data) {
    return (
        data["Tournament Name"] ||
        data.tournamentName ||
        data.tournament_name ||
        data.name ||
        data.title ||
        "Untitled Tournament"
    );
}

function getTournamentGame(data) {
    return (
        data["Game Name"] ||
        data.gameName ||
        data.game ||
        "Free Fire"
    );
}

function getTournamentStatus(data) {
    return (
        data.status ||
        data.Status ||
        data.registrationStatus ||
        data["Registration Status"] ||
        ""
    ).toString().trim();
}

function normalizeStatus(status) {
    return status
        .toLowerCase()
        .replace(/[_-]/g, " ")
        .trim();
}

function isOpenTournament(data) {
    const status = normalizeStatus(getTournamentStatus(data));

    return (
        status.includes("open") ||
        status.includes("accepting")
    );
}

function isLiveTournament(data) {
    const status = normalizeStatus(getTournamentStatus(data));

    return (
        status === "live" ||
        status === "ongoing" ||
        status === "in progress" ||
        status === "started"
    );
}

/* DATE HELPERS */

function getDateValue(data) {
    return (
        data.createdAt ||
        data.created_at ||
        data.createdOn ||
        data.date ||
        data.startDate ||
        null
    );
}

function toDate(value) {
    if (!value) return null;

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === "number") {
        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === "string") {
        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
}

function formatDate(value) {
    const date = toDate(value);

    if (!date) return "Date not available";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

/* TOURNAMENT STATUS DISPLAY */

function getStatusDisplay(data) {
    const originalStatus = getTournamentStatus(data);

    if (!originalStatus) {
        return {
            label: "Not specified",
            className: ""
        };
    }

    if (isLiveTournament(data)) {
        return {
            label: "Live",
            className: "live"
        };
    }

    if (isOpenTournament(data)) {
        return {
            label: "Open",
            className: "open"
        };
    }

    return {
        label: originalStatus.replace(/[_-]/g, " "),
        className: ""
    };
}

/* FETCH PLAYERS */

async function fetchPlayers() {
    const snapshot = await getDocs(
        collection(db, "users")
    );

    return snapshot.docs.filter(document => {
        const data = document.data();
        const role = (data.role || data.Role || "player")
            .toString()
            .toLowerCase();

        return role === "player";
    }).length;
}

/* FETCH TOURNAMENTS */

async function fetchTournaments() {
    const snapshot = await getDocs(
        collection(db, "tournaments")
    );

    return snapshot.docs.map(document => ({
        id: document.id,
        ...document.data()
    }));
}

/* RENDER RECENT TOURNAMENTS */

function renderRecentTournaments(tournaments) {
    const container = $("overviewRecentTournaments");

    if (!container) return;

    if (!tournaments.length) {
        container.innerHTML = `
            <div class="overview-empty">
                <strong>No tournaments yet</strong>
                Your tournament records will appear here.
            </div>
        `;

        return;
    }

    const sorted = [...tournaments].sort((a, b) => {
        const dateA = toDate(getDateValue(a));
        const dateB = toDate(getDateValue(b));

        return (dateB?.getTime() || 0) -
               (dateA?.getTime() || 0);
    });

    const recent = sorted.slice(0, 5);

    container.innerHTML = `
        <div class="overview-tournament-list">

            ${recent.map(tournament => {
                const name = escapeHTML(
                    getTournamentName(tournament)
                );

                const game = escapeHTML(
                    getTournamentGame(tournament)
                );

                const date = escapeHTML(
                    formatDate(getDateValue(tournament))
                );

                const status = getStatusDisplay(tournament);

                return `
                    <div class="overview-tournament-item">

                        <div class="overview-tournament-info">
                            <strong>${name}</strong>
                            <small>
                                ${game} · ${date}
                            </small>
                        </div>

                        <span class="overview-tournament-status ${status.className}">
                            ${escapeHTML(status.label)}
                        </span>

                    </div>
                `;
            }).join("")}

        </div>
    `;
}

/* UPDATE DASHBOARD */

async function loadDashboard() {
    const refreshButton = $("overviewRefreshBtn");

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.innerHTML = "<span>↻</span> Loading...";
    }

    setText("overviewTotalPlayers", "...");
    setText("overviewTotalTournaments", "...");
    setText("overviewOpenTournaments", "...");
    setText("overviewLiveTournaments", "...");

    const recentContainer = $("overviewRecentTournaments");

    if (recentContainer) {
        recentContainer.innerHTML = `
            <div class="overview-loading">
                Loading tournament records...
            </div>
        `;
    }

    try {
        const [playersResult, tournamentsResult] =
            await Promise.allSettled([
                fetchPlayers(),
                fetchTournaments()
            ]);

        /* PLAYER STATISTIC */

        if (playersResult.status === "fulfilled") {
            setText(
                "overviewTotalPlayers",
                playersResult.value.toLocaleString("en-IN")
            );
        } else {
            setText("overviewTotalPlayers", "—");
            console.error(
                "Player statistics error:",
                playersResult.reason
            );
        }

        /* TOURNAMENT STATISTICS */

        if (tournamentsResult.status === "fulfilled") {
            const tournaments = tournamentsResult.value;

            const openCount = tournaments.filter(
                isOpenTournament
            ).length;

            const liveCount = tournaments.filter(
                isLiveTournament
            ).length;

            setText(
                "overviewTotalTournaments",
                tournaments.length.toLocaleString("en-IN")
            );

            setText(
                "overviewOpenTournaments",
                openCount.toLocaleString("en-IN")
            );

            setText(
                "overviewLiveTournaments",
                liveCount.toLocaleString("en-IN")
            );

            renderRecentTournaments(tournaments);

        } else {
            setText("overviewTotalTournaments", "—");
            setText("overviewOpenTournaments", "—");
            setText("overviewLiveTournaments", "—");

            if (recentContainer) {
                recentContainer.innerHTML = `
                    <div class="overview-empty overview-error">
                        Unable to load tournament records.
                        Check your Firebase permissions.
                    </div>
                `;
            }

            console.error(
                "Tournament statistics error:",
                tournamentsResult.reason
            );
        }

        setText(
            "overviewLastUpdated",
            "Dashboard updated: " +
            new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit"
            })
        );

    } catch (error) {
        console.error("Overview loading error:", error);

        setText(
            "overviewLastUpdated",
            "Unable to load dashboard data."
        );

    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.innerHTML = "<span>↻</span> Refresh";
        }
    }
}

/* QUICK ACTION NAVIGATION */

function initQuickActions() {
    document
        .querySelectorAll(".overview-page [data-page]")
        .forEach(button => {
            button.addEventListener("click", () => {
                const page = button.dataset.page;

                if (!page) return;

                document.dispatchEvent(
                    new CustomEvent("playx:navigate", {
                        detail: { page }
                    })
                );
            });
        });
}

/* REFRESH BUTTON */

function initRefreshButton() {
    const button = $("overviewRefreshBtn");

    if (!button) return;

    button.addEventListener("click", loadDashboard);
}

/* MODULE INITIALIZATION */

export async function init() {
    initQuickActions();
    initRefreshButton();

    await loadDashboard();
}
