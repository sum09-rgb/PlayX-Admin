/* =========================================
   PLAYX ADMIN — TOURNAMENT MANAGEMENT
   ========================================= */

import { db } from "../firebase.js";

import { showToast } from "../ui.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


let tournaments = [];
let editingTournamentId = null;
let isLoading = false;


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

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(value) {
  const amount = Number(value) || 0;

  return "₹" + amount.toLocaleString("en-IN");
}

function getTimestamp(value) {
  if (!value) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value.seconds) {
    return value.seconds * 1000;
  }

  return 0;
}

function getTournamentStatus(tournament) {
  const status = String(tournament.status || "open").toLowerCase();

  const filled = Number(tournament.filled) || 0;
  const maximum = Number(tournament.maxPlayers) || 0;

  if (
    status === "open" &&
    maximum > 0 &&
    filled >= maximum
  ) {
    return "full";
  }

  return status;
}

function showFormError(message = "") {
  const error = getElement("tournamentFormError");

  if (!error) return;

  error.textContent = message;
  error.hidden = !message;
}


/* =========================================
   FIRESTORE DATA
   ========================================= */

async function loadTournaments() {
  if (isLoading) return;

  isLoading = true;

  const table = getElement("tournamentTableBody");

  if (table) {
    table.innerHTML = `
      <tr>
        <td colspan="8" class="tournament-empty">
          Loading tournaments...
        </td>
      </tr>
    `;
  }

  try {
    const snapshot = await getDocs(
      collection(db, "tournaments")
    );

    tournaments = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    tournaments.sort((a, b) => {
      return getTimestamp(b.createdAt) -
        getTimestamp(a.createdAt);
    });

    updateTournamentStats();
    renderTournaments();

  } catch (error) {
    console.error("Tournament loading error:", error);

    if (table) {
      table.innerHTML = `
        <tr>
          <td colspan="8" class="tournament-empty">
            Unable to load tournaments. Please refresh.
          </td>
        </tr>
      `;
    }

    showToast(
      "Unable to load tournaments.",
      "error"
    );

  } finally {
    isLoading = false;
  }
}


/* =========================================
   STATISTICS
   ========================================= */

function updateTournamentStats() {
  const total = tournaments.length;

  const open = tournaments.filter(item =>
    getTournamentStatus(item) === "open"
  ).length;

  const full = tournaments.filter(item =>
    getTournamentStatus(item) === "full"
  ).length;

  const closed = tournaments.filter(item =>
    getTournamentStatus(item) === "closed"
  ).length;

  getElement("tournamentTotal").textContent = total;
  getElement("tournamentOpen").textContent = open;
  getElement("tournamentFull").textContent = full;
  getElement("tournamentClosed").textContent = closed;
}


/* =========================================
   TOURNAMENT TABLE
   ========================================= */

function renderTournaments() {
  const table = getElement("tournamentTableBody");

  if (!table) return;

  const searchValue =
    getElement("tournamentSearch")?.value
      .trim()
      .toLowerCase() || "";

  const selectedStatus =
    getElement("tournamentStatusFilter")?.value || "all";

  const filtered = tournaments.filter(item => {
    const searchText = [
      item.name,
      item.map,
      item.mode,
      item.game
    ].join(" ").toLowerCase();

    const matchesSearch = searchText.includes(searchValue);

    const matchesStatus =
      selectedStatus === "all" ||
      getTournamentStatus(item) === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (!filtered.length) {
    table.innerHTML = `
      <tr>
        <td colspan="8" class="tournament-empty">
          No tournaments found.
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML = filtered.map(item => {
    const status = getTournamentStatus(item);

    const filled = Number(item.filled) || 0;
    const maximum = Number(item.maxPlayers) || 0;

    const isOpen = status === "open";
    const canChangeRegistration =
      isOpen || status === "closed";

    const registrationLabel = isOpen
      ? "Close"
      : "Reopen";

    const safeStatus = [
      "open",
      "closed",
      "full",
      "completed",
      "cancelled"
    ].includes(status) ? status : "closed";

    return `
      <tr>

        <td>
          <span class="tournament-name">
            ${escapeHTML(item.name || "Untitled")}
          </span>
          <span class="tournament-subtitle">
            ${escapeHTML(item.game || "Free Fire")}
          </span>
        </td>

        <td>
          ${escapeHTML(item.mode || "-")}
          <span class="tournament-subtitle">
            ${escapeHTML(item.map || "-")}
          </span>
        </td>

        <td>
          ${escapeHTML(item.date || "-")}
          <span class="tournament-subtitle">
            ${escapeHTML(item.time || "-")}
          </span>
        </td>

        <td>${formatMoney(item.entryFee)}</td>

        <td>${formatMoney(item.prizePool)}</td>

        <td>
          ${filled} / ${maximum || "-"}
        </td>

        <td>
          <span class="tournament-status ${safeStatus}">
            ${escapeHTML(safeStatus)}
          </span>
        </td>

        <td>
          <div class="tournament-action-group">

            <button
              type="button"
              class="tournament-action-btn"
              data-action="edit"
              data-id="${escapeHTML(item.id)}"
            >
              Edit
            </button>

            ${
              canChangeRegistration
                ? `
                  <button
                    type="button"
                    class="tournament-action-btn"
                    data-action="toggle"
                    data-id="${escapeHTML(item.id)}"
                  >
                    ${registrationLabel}
                  </button>
                `
                : ""
            }

            <button
              type="button"
              class="tournament-action-btn danger"
              data-action="delete"
              data-id="${escapeHTML(item.id)}"
            >
              Delete
            </button>

          </div>
        </td>

      </tr>
    `;
  }).join("");
}


/* =========================================
   MODAL
   ========================================= */

function openTournamentModal(tournament = null) {
  const modal = getElement("tournamentModal");
  const form = getElement("tournamentForm");

  if (!modal || !form) return;

  form.reset();

  editingTournamentId = tournament?.id || null;

  getElement("tournamentModalTitle").textContent =
    tournament ? "Edit Tournament" : "Create Tournament";

  getElement("saveTournamentBtn").textContent =
    tournament ? "Update Tournament" : "Create Tournament";

  getElement("tournamentGame").value = "Free Fire";

  getElement("tournamentDate").value =
    tournament?.date || getLocalDate();

  getElement("tournamentTime").value =
    tournament?.time || "13:35";

  getElement("tournamentName").value =
    tournament?.name || "";

  getElement("tournamentMode").value =
    tournament?.mode || "Solo";

  getElement("tournamentMap").value =
    tournament?.map || "Bermuda";

  getElement("tournamentEntryFee").value =
    tournament?.entryFee ?? 0;

  getElement("tournamentPrizePool").value =
    tournament?.prizePool ?? 0;

  getElement("tournamentMaxPlayers").value =
    tournament?.maxPlayers ?? "";

  getElement("tournamentDescription").value =
    tournament?.description || "";

  showFormError("");

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeTournamentModal() {
  const modal = getElement("tournamentModal");

  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = "";

  editingTournamentId = null;
  showFormError("");
}


/* =========================================
   CREATE / UPDATE
   ========================================= */

async function saveTournament(event) {
  event.preventDefault();

  if (isLoading) return;

  const name = getElement("tournamentName").value.trim();
  const mode = getElement("tournamentMode").value;
  const map = getElement("tournamentMap").value;

  const date = getElement("tournamentDate").value;
  const time = getElement("tournamentTime").value;

  const entryFee = Number(
    getElement("tournamentEntryFee").value
  );

  const prizePool = Number(
    getElement("tournamentPrizePool").value
  );

  const maxPlayers = Number(
    getElement("tournamentMaxPlayers").value
  );

  const description =
    getElement("tournamentDescription").value.trim();

  if (!name || !date || !time) {
    showFormError("Please complete all required fields.");
    return;
  }

  if (
    !Number.isInteger(entryFee) ||
    entryFee < 0 ||
    !Number.isInteger(prizePool) ||
    prizePool < 0 ||
    !Number.isInteger(maxPlayers) ||
    maxPlayers < 1
  ) {
    showFormError(
      "Enter valid amounts and a maximum player count of at least 1."
    );

    return;
  }

  const existing = editingTournamentId
    ? tournaments.find(item => item.id === editingTournamentId)
    : null;

  const filled = Number(existing?.filled) || 0;

  if (existing && maxPlayers < filled) {
    showFormError(
      `Maximum players cannot be less than the ${filled} existing registrations.`
    );

    return;
  }

  const saveButton = getElement("saveTournamentBtn");

  isLoading = true;

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
  }

  try {
    const tournamentData = {
      name,
      game: "Free Fire",
      map,
      mode,
      date,
      time,
      entryFee,
      prizePool,
      maxPlayers,
      description
    };

    if (editingTournamentId) {
      const currentStatus =
        String(existing.status || "open").toLowerCase();

      let nextStatus = currentStatus;

      if (
        currentStatus === "full" &&
        filled < maxPlayers
      ) {
        nextStatus = "open";
      }

      await updateDoc(
        doc(db, "tournaments", editingTournamentId),
        {
          ...tournamentData,
          status: nextStatus
        }
      );

      showToast(
        "Tournament updated successfully.",
        "success"
      );

    } else {
      await addDoc(
        collection(db, "tournaments"),
        {
          ...tournamentData,
          filled: 0,
          status: "open",
          createdAt: serverTimestamp()
        }
      );

      showToast(
        "Tournament created successfully.",
        "success"
      );
    }

    closeTournamentModal();
    await loadTournaments();

  } catch (error) {
    console.error("Tournament save error:", error);

    showFormError(
      error.message || "Unable to save tournament."
    );

    showToast(
      "Unable to save tournament.",
      "error"
    );

  } finally {
    isLoading = false;

    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = editingTournamentId
        ? "Update Tournament"
        : "Create Tournament";
    }
  }
}


/* =========================================
   REGISTRATION CONTROL
   ========================================= */

async function toggleRegistration(id) {
  const tournament = tournaments.find(item => item.id === id);

  if (!tournament) return;

  const status = getTournamentStatus(tournament);

  if (status !== "open" && status !== "closed") {
    return;
  }

  const filled = Number(tournament.filled) || 0;
  const maximum = Number(tournament.maxPlayers) || 0;

  const nextStatus = status === "open"
    ? "closed"
    : "open";

  if (
    nextStatus === "open" &&
    maximum > 0 &&
    filled >= maximum
  ) {
    showToast(
      "This tournament is full. Increase its capacity first.",
      "error"
    );

    return;
  }

  const confirmation = confirm(
    nextStatus === "closed"
      ? "Close registration for this tournament?"
      : "Reopen registration for this tournament?"
  );

  if (!confirmation) return;

  try {
    await updateDoc(
      doc(db, "tournaments", id),
      {
        status: nextStatus
      }
    );

    showToast(
      nextStatus === "closed"
        ? "Registration closed."
        : "Registration reopened.",
      "success"
    );

    await loadTournaments();

  } catch (error) {
    console.error("Registration update error:", error);

    showToast(
      "Unable to update registration.",
      "error"
    );
  }
}


/* =========================================
   SAFE TOURNAMENT DELETION
   ========================================= */

async function deleteTournament(id) {
  const tournament = tournaments.find(item => item.id === id);

  if (!tournament) return;

  const confirmation = confirm(
    `Delete "${tournament.name}"? This action cannot be undone.`
  );

  if (!confirmation) return;

  try {
    const participantsSnapshot = await getDocs(
      collection(db, "tournaments", id, "participants")
    );

    if (!participantsSnapshot.empty) {
      showToast(
        "This tournament has participants and cannot be deleted.",
        "error"
      );

      return;
    }

    await deleteDoc(
      doc(db, "tournaments", id)
    );

    showToast(
      "Tournament deleted successfully.",
      "success"
    );

    await loadTournaments();

  } catch (error) {
    console.error("Tournament deletion error:", error);

    showToast(
      "Unable to delete tournament. Check permissions.",
      "error"
    );
  }
}


/* =========================================
   EVENTS
   ========================================= */

function initEvents() {
  const root = document.querySelector(".tournaments-page");

  if (!root || root.dataset.initialized === "true") {
    return;
  }

  root.dataset.initialized = "true";

  getElement("createTournamentBtn")?.addEventListener(
    "click",
    () => openTournamentModal()
  );

  getElement("closeTournamentModal")?.addEventListener(
    "click",
    closeTournamentModal
  );

  getElement("cancelTournamentBtn")?.addEventListener(
    "click",
    closeTournamentModal
  );

  getElement("tournamentModal")?.addEventListener(
    "click",
    event => {
      if (event.target.closest("[data-close-modal]")) {
        closeTournamentModal();
      }
    }
  );

  getElement("tournamentForm")?.addEventListener(
    "submit",
    saveTournament
  );

  getElement("tournamentSearch")?.addEventListener(
    "input",
    renderTournaments
  );

  getElement("tournamentStatusFilter")?.addEventListener(
    "change",
    renderTournaments
  );

  getElement("refreshTournamentsBtn")?.addEventListener(
    "click",
    loadTournaments
  );

  getElement("tournamentTableBody")?.addEventListener(
    "click",
    event => {
      const button = event.target.closest("[data-action]");

      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      if (!id) return;

      if (action === "edit") {
        const tournament = tournaments.find(
          item => item.id === id
        );

        if (tournament) {
          openTournamentModal(tournament);
        }
      }

      if (action === "toggle") {
        toggleRegistration(id);
      }

      if (action === "delete") {
        deleteTournament(id);
      }
    }
  );
}


/* =========================================
   PAGE INITIALIZATION
   ========================================= */

export function init() {
  initEvents();
  loadTournaments();
}
