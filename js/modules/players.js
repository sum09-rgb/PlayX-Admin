/* =========================================
   PLAYX ADMIN — PLAYER MANAGEMENT
   ========================================= */

import { db } from "../firebase.js";

import { showToast } from "../ui.js";

import {
  collection,
  getDocs,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


let players = [];
let loading = false;


/* =========================================
   HELPERS
   ========================================= */

function getElement(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function getDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function formatDate(value) {
  const date = getDate(value);

  if (!date) return "Unknown";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getInitial(name) {
  return String(name || "P")
    .trim()
    .charAt(0)
    .toUpperCase() || "P";
}

function isToday(value) {
  const date = getDate(value);

  if (!date) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isThisMonth(value) {
  const date = getDate(value);

  if (!date) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}


/* =========================================
   LOAD PLAYERS
   ========================================= */

async function loadPlayers() {
  if (loading) return;

  loading = true;

  const table = getElement("playersTableBody");

  if (table) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="players-empty">
          Loading players...
        </td>
      </tr>
    `;
  }

  try {
    const snapshot = await getDocs(
      collection(db, "users")
    );

    players = snapshot.docs
      .map(item => ({
        documentId: item.id,
        ...item.data()
      }))
      .filter(item =>
        String(item.role || "").toLowerCase() === "player"
      );

    players.sort((a, b) => {
      const dateA = getDate(a.createdAt)?.getTime() || 0;
      const dateB = getDate(b.createdAt)?.getTime() || 0;

      return dateB - dateA;
    });

    updatePlayerStats();
    renderPlayers();

  } catch (error) {
    console.error("Player loading error:", error);

    if (table) {
      table.innerHTML = `
        <tr>
          <td colspan="6" class="players-empty">
            Unable to load players. Check your Firestore permissions.
          </td>
        </tr>
      `;
    }

    showToast(
      "Unable to load player accounts.",
      "error"
    );

  } finally {
    loading = false;
  }
}


/* =========================================
   PLAYER STATISTICS
   ========================================= */

function updatePlayerStats() {
  const today = players.filter(item =>
    isToday(item.createdAt)
  ).length;

  const month = players.filter(item =>
    isThisMonth(item.createdAt)
  ).length;

  getElement("playersTotal").textContent = players.length;
  getElement("playersToday").textContent = today;
  getElement("playersMonth").textContent = month;
}


/* =========================================
   PLAYER TABLE
   ========================================= */

function renderPlayers() {
  const table = getElement("playersTableBody");

  if (!table) return;

  const searchValue =
    getElement("playersSearch")?.value
      .trim()
      .toLowerCase() || "";

  const dateFilter =
    getElement("playersDateFilter")?.value || "all";

  const filtered = players.filter(player => {
    const uid = player.uid || player.documentId;

    const searchText = [
      player.name,
      player.email,
      uid
    ].join(" ").toLowerCase();

    const matchesSearch = searchText.includes(searchValue);

    let matchesDate = true;

    if (dateFilter === "today") {
      matchesDate = isToday(player.createdAt);
    }

    if (dateFilter === "month") {
      matchesDate = isThisMonth(player.createdAt);
    }

    return matchesSearch && matchesDate;
  });

  getElement("playersResultCount").textContent =
    `${filtered.length} player${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="players-empty">
          No players found.
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML = filtered.map(player => {
    const name = player.name || "Unnamed Player";
    const email = player.email || "No email";
    const uid = player.uid || player.documentId;

    return `
      <tr>

        <td>
          <div class="player-table-name">

            <div class="player-table-avatar">
              ${escapeHTML(getInitial(name))}
            </div>

            <div>
              <strong>${escapeHTML(name)}</strong>
              <span>Free Fire Player</span>
            </div>

          </div>
        </td>

        <td>${escapeHTML(email)}</td>

        <td>
          <span class="player-uid">
            ${escapeHTML(uid)}
          </span>
        </td>

        <td>${escapeHTML(formatDate(player.createdAt))}</td>

        <td>
          <span class="player-account-badge">
            Registered
          </span>
        </td>

        <td>
          <button
            type="button"
            class="player-view-btn"
            data-action="view-player"
            data-id="${escapeHTML(player.documentId)}"
          >
            View Profile
          </button>
        </td>

      </tr>
    `;
  }).join("");
}


/* =========================================
   TOURNAMENT HISTORY
   ========================================= */

async function loadPlayerTournamentHistory(player) {
  const historyElement = getElement("profileTournamentHistory");
  const countElement = getElement("profileTournamentCount");

  if (!historyElement || !countElement) return;

  historyElement.innerHTML = `
    <p class="players-empty">Loading tournament history...</p>
  `;

  countElement.textContent = "Loading...";

  const playerId = player.uid || player.documentId;

  try {
    const tournamentSnapshot = await getDocs(
      collection(db, "tournaments")
    );

    const historyResults = await Promise.all(
      tournamentSnapshot.docs.map(async tournamentDoc => {
        try {
          const participantRef = doc(
            db,
            "tournaments",
            tournamentDoc.id,
            "participants",
            playerId
          );

          const participantSnapshot = await getDoc(
            participantRef
          );

          if (!participantSnapshot.exists()) {
            return null;
          }

          const tournament = tournamentDoc.data();

          return {
            id: tournamentDoc.id,
            name: tournament.name || "Untitled Tournament",
            date: tournament.date || "-",
            mode: tournament.mode || "-",
            map: tournament.map || "-",
            status: tournament.status || "unknown"
          };

        } catch (error) {
          console.warn(
            "Could not check tournament participation:",
            tournamentDoc.id,
            error
          );

          return null;
        }
      })
    );

    const history = historyResults.filter(Boolean);

    countElement.textContent =
      `${history.length} tournament${history.length === 1 ? "" : "s"}`;

    if (!history.length) {
      historyElement.innerHTML = `
        <p class="players-empty">
          No tournament participation found.
        </p>
      `;

      return;
    }

    historyElement.innerHTML = history.map(item => `
      <div class="player-history-item">

        <div>
          <strong>${escapeHTML(item.name)}</strong>

          <span>
            ${escapeHTML(item.date)}
            · ${escapeHTML(item.mode)}
            · ${escapeHTML(item.map)}
          </span>
        </div>

        <span>
          ${escapeHTML(item.status)}
        </span>

      </div>
    `).join("");

  } catch (error) {
    console.error("Tournament history error:", error);

    countElement.textContent = "Unavailable";

    historyElement.innerHTML = `
      <p class="players-empty">
        Unable to load tournament history.
      </p>
    `;
  }
}


/* =========================================
   PLAYER PROFILE
   ========================================= */

async function openPlayerProfile(documentId) {
  const player = players.find(item =>
    item.documentId === documentId
  );

  if (!player) return;

  const modal = getElement("playerModal");

  if (!modal) return;

  const name = player.name || "Unnamed Player";

  getElement("profileAvatar").textContent =
    getInitial(name);

  getElement("profileName").textContent = name;

  getElement("profileEmail").textContent =
    player.email || "Not available";

  getElement("profileUID").textContent =
    player.uid || player.documentId;

  getElement("profileRole").textContent =
    player.role || "player";

  getElement("profileCreatedAt").textContent =
    formatDate(player.createdAt);

  getElement("profileAccountStatus").textContent =
    "Registered Account";

  modal.hidden = false;
  document.body.style.overflow = "hidden";

  await loadPlayerTournamentHistory(player);
}

function closePlayerProfile() {
  const modal = getElement("playerModal");

  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = "";
}


/* =========================================
   EVENTS
   ========================================= */

function initEvents() {
  const root = document.querySelector(".players-page");

  if (!root || root.dataset.initialized === "true") {
    return;
  }

  root.dataset.initialized = "true";

  getElement("refreshPlayersBtn")?.addEventListener(
    "click",
    loadPlayers
  );

  getElement("playersSearch")?.addEventListener(
    "input",
    renderPlayers
  );

  getElement("playersDateFilter")?.addEventListener(
    "change",
    renderPlayers
  );

  getElement("playersTableBody")?.addEventListener(
    "click",
    event => {
      const button = event.target.closest(
        "[data-action='view-player']"
      );

      if (!button) return;

      openPlayerProfile(button.dataset.id);
    }
  );

  getElement("closePlayerModal")?.addEventListener(
    "click",
    closePlayerProfile
  );

  getElement("closePlayerProfileBtn")?.addEventListener(
    "click",
    closePlayerProfile
  );

  getElement("playerModal")?.addEventListener(
    "click",
    event => {
      if (event.target.closest("[data-close-player-modal]")) {
        closePlayerProfile();
      }
    }
  );
}


/* =========================================
   PAGE INITIALIZATION
   ========================================= */

export function init() {
  initEvents();
  loadPlayers();
                               }
