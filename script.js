
import { auth, db } from "./firebase/firebase.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ===================================
// COMMON FUNCTIONS
// ===================================

const $ = (id) => document.getElementById(id);

let allPlayers = [];
let allTournaments = [];

function showMessage(id, message) {
    const element = $(id);
    if (element) element.textContent = message;
}

function getTournament(id) {
    return allTournaments.find(item => item.id === id);
}

// ===================================
// ADMIN LOGIN
// ===================================

$("loginBtn").addEventListener("click", async () => {
    const email = $("adminEmail").value.trim();
    const password = $("adminPassword").value;

    if (!email || !password) {
        alert("Enter email and password.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login error:", error);
        alert("Login failed. Check your email and password.");
    }
});

$("adminPassword").addEventListener("keydown", event => {
    if (event.key === "Enter") $("loginBtn").click();
});

// ===================================
// ADMIN SESSION AND AUTHORIZATION
// ===================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        $("loginView").hidden = false;
        $("dashboardView").hidden = true;
        return;
    }

    try {
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists() || adminSnap.data().Active !== true) {
            alert("This account is not authorized as an admin.");
            await signOut(auth);
            return;
        }

        $("loginView").hidden = true;
        $("dashboardView").hidden = false;

        await loadTournaments();
        await loadPlayers();
        await updateOverview();

    } catch (error) {
        console.error("Admin verification error:", error);
        alert("Admin error: " + error.message);
        await signOut(auth);
    }
});

// ===================================
// ADMIN LOGOUT
// ===================================

$("logoutBtn").addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        alert("Could not sign out: " + error.message);
    }
});

// ===================================
// PAGE NAVIGATION
// ===================================

const pageNames = {
    overview: "Overview",
    tournaments: "Tournament Management",
    players: "Player Management",
    participants: "Tournament Participants",
    matches: "Match Management",
    results: "Results Management",
    wallet: "Wallet Management",
    settings: "Platform Settings"
};

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        const page = button.dataset.page;

        document.querySelectorAll(".page").forEach(section => {
            section.classList.remove("active");
        });

        document.querySelectorAll(".nav-btn").forEach(item => {
            item.classList.remove("active");
        });

        const target = $(page + "Page");

        if (!target) {
            console.error("Missing page:", page + "Page");
            return;
        }

        target.classList.add("active");
        button.classList.add("active");

        $("pageTitle").textContent = pageNames[page] || "PlayX Admin";
    });
});

// ===================================
// CREATE TOURNAMENT
// ===================================

$("createTournamentBtn").addEventListener("click", async () => {
    const name = $("tournamentName").value.trim();
    const game = $("gameName").value;
    const mode = $("gameMode").value;
    const map = $("gameMap").value;
    const date = $("tournamentDate").value;
    const time = $("tournamentTime").value;
    const entryFee = Number($("entryFee").value);
    const prizePool = Number($("prizePool").value);
    const maxPlayers = Number($("maxPlayers").value);
    const description = $("tournamentDescription").value.trim();

    if (!name || !date || !time || !maxPlayers) {
        alert("Enter tournament name, date, time and maximum players.");
        return;
    }

    if (
        entryFee < 0 ||
        prizePool < 0 ||
        maxPlayers < 1 ||
        !Number.isInteger(maxPlayers)
    ) {
        alert("Enter valid tournament amounts and player limit.");
        return;
    }

    try {
        $("createTournamentBtn").disabled = true;
        showMessage("tournamentMessage", "Creating tournament...");

        await addDoc(collection(db, "tournaments"), {
            name,
            game,
            mode,
            map,
            date,
            time,
            entryFee,
            prizePool,
            maxPlayers,
            filled: 0,
            description,
            status: "open",
            createdAt: serverTimestamp()
        });

        $("tournamentName").value = "";
        $("tournamentDate").value = "";
        $("tournamentTime").value = "";
        $("entryFee").value = "";
        $("prizePool").value = "";
        $("maxPlayers").value = "";
        $("tournamentDescription").value = "";

        showMessage("tournamentMessage", "Tournament created successfully!");

        await loadTournaments();
        await updateOverview();

    } catch (error) {
        console.error("Tournament creation error:", error);
        showMessage("tournamentMessage", "Error: " + error.message);
    } finally {
        $("createTournamentBtn").disabled = false;
    }
});

// ===================================
// LOAD TOURNAMENTS
// ===================================

async function loadTournaments() {
    const list = $("tournamentList");
    list.textContent = "Loading tournaments...";

    try {
        const snapshot = await getDocs(collection(db, "tournaments"));

        allTournaments = await Promise.all(
            snapshot.docs.map(async item => {
                const data = item.data();

                const participants = await getDocs(
                    collection(db, "tournaments", item.id, "participants")
                );

                return {
                    id: item.id,
                    ...data,
                    registeredPlayers: participants.size
                };
            })
        );

        displayTournaments();
        populateTournamentSelects();

    } catch (error) {
        console.error("Tournament loading error:", error);
        list.textContent = "Could not load tournaments: " + error.message;
    }
}

// ===================================
// DISPLAY AND FILTER TOURNAMENTS
// ===================================

function displayTournaments() {
    const list = $("tournamentList");
    const search = $("tournamentSearch").value.trim().toLowerCase();
    const filter = $("tournamentFilter").value;

    list.innerHTML = "";

    const filtered = allTournaments.filter(tournament => {
        const matchesSearch =
            (tournament.name || "").toLowerCase().includes(search) ||
            (tournament.game || "").toLowerCase().includes(search);

        const matchesFilter =
            filter === "all" || tournament.status === filter;

        return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
        list.textContent = "No matching tournaments found.";
        return;
    }

    filtered.forEach(tournament => {
        const card = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent = tournament.name || "Untitled Tournament";

        const details = document.createElement("p");
        details.textContent =
            "Game: " + (tournament.game || "Not specified") +
            " | Mode: " + (tournament.mode || "Solo") +
            " | Map: " + (tournament.map || "Not specified") +
            " | Date: " + (tournament.date || "Not specified") +
            " | Time: " + (tournament.time || "Not specified") +
            " | Entry: ₹" + (tournament.entryFee || 0) +
            " | Prize: ₹" + (tournament.prizePool || 0) +
            " | Players: " + tournament.registeredPlayers +
            "/" + (tournament.maxPlayers || 0) +
            " | Status: " + (tournament.status || "unknown");

        // EDIT NAME
        const editButton = document.createElement("button");
        editButton.textContent = "Edit Name";
        editButton.style.margin = "8px 5px 0 0";

        editButton.onclick = async () => {
            const newName = prompt(
                "Enter new tournament name:",
                tournament.name || ""
            );

            if (newName === null) return;

            if (!newName.trim()) {
                alert("Tournament name cannot be empty.");
                return;
            }

            try {
                await updateDoc(doc(db, "tournaments", tournament.id), {
                    name: newName.trim()
                });

                await loadTournaments();
                alert("Tournament name updated.");
            } catch (error) {
                alert("Could not edit tournament: " + error.message);
            }
        };

        // OPEN / CLOSE REGISTRATION
        const statusButton = document.createElement("button");
        statusButton.style.margin = "8px 5px 0 0";

        if (tournament.status === "open") {
            statusButton.textContent = "Close Registration";
        } else if (tournament.status === "closed") {
            statusButton.textContent = "Reopen Registration";
        } else {
            statusButton.textContent = "Tournament Full";
            statusButton.disabled = true;
        }

        statusButton.onclick = async () => {
            if (tournament.status === "full") return;

            const newStatus =
                tournament.status === "open" ? "closed" : "open";

            if (
                newStatus === "open" &&
                tournament.registeredPlayers >= Number(tournament.maxPlayers || 0)
            ) {
                alert("Cannot reopen. Tournament is full.");
                return;
            }

            try {
                await updateDoc(doc(db, "tournaments", tournament.id), {
                    status: newStatus
                });

                await loadTournaments();
                alert("Registration status updated.");
            } catch (error) {
                alert("Could not update status: " + error.message);
            }
        };

        // DELETE TOURNAMENT
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.style.background = "#dc3545";
        deleteButton.style.margin = "8px 5px 0 0";

        if (tournament.registeredPlayers > 0) {
            deleteButton.disabled = true;
            deleteButton.title = "Remove participants before deleting.";
        }

        deleteButton.onclick = async () => {
            if (tournament.registeredPlayers > 0) {
                alert("This tournament has participants. It cannot be deleted yet.");
                return;
            }

            if (!confirm("Delete this tournament permanently?")) return;

            try {
                await deleteDoc(doc(db, "tournaments", tournament.id));

                await loadTournaments();
                await updateOverview();

                alert("Tournament deleted.");
            } catch (error) {
                alert("Could not delete tournament: " + error.message);
            }
        };

        card.append(
            title,
            details,
            editButton,
            statusButton,
            deleteButton
        );

        list.appendChild(card);
    });
}

$("tournamentSearch").addEventListener("input", displayTournaments);
$("tournamentFilter").addEventListener("change", displayTournaments);

// ===================================
// TOURNAMENT SELECT MENUS
// ===================================

function populateTournamentSelects() {
    const selectIds = [
        "participantTournament",
        "matchTournament",
        "resultTournament"
    ];

    selectIds.forEach(id => {
        const select = $(id);
        const previousValue = select.value;

        select.innerHTML = "";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select a tournament";
        select.appendChild(defaultOption);

        allTournaments.forEach(tournament => {
            const option = document.createElement("option");
            option.value = tournament.id;
            option.textContent = tournament.name || "Untitled Tournament";
            select.appendChild(option);
        });

        if (getTournament(previousValue)) {
            select.value = previousValue;
        }
    });
}

// ===================================
// LOAD PLAYERS
// ===================================

async function loadPlayers() {
    const list = $("playerList");
    list.textContent = "Loading players...";

    try {
        const snapshot = await getDocs(collection(db, "users"));

        allPlayers = snapshot.docs.map(item => ({
            uid: item.id,
            ...item.data()
        }));

        displayPlayers(allPlayers);

    } catch (error) {
        console.error("Player loading error:", error);
        list.textContent = "Could not load players: " + error.message;
    }
}

// ===================================
// DISPLAY AND SEARCH PLAYERS
// ===================================

function displayPlayers(players) {
    const list = $("playerList");
    list.innerHTML = "";

    if (players.length === 0) {
        list.textContent = "No players found.";
        return;
    }

    players.forEach(data => {
        const card = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = data.name || "Unknown Player";

        const email = document.createElement("p");
        email.textContent = data.email || "No email";

        const uid = document.createElement("small");
        uid.textContent = "UID: " + data.uid;

        card.append(name, email, uid);
        list.appendChild(card);
    });
}

$("playerSearch").addEventListener("input", () => {
    const search = $("playerSearch").value.trim().toLowerCase();

    const filtered = allPlayers.filter(player =>
        (player.name || "").toLowerCase().includes(search) ||
        (player.email || "").toLowerCase().includes(search) ||
        (player.uid || "").toLowerCase().includes(search)
    );

    displayPlayers(filtered);
});

// ===================================
// LOAD PARTICIPANTS
// ===================================

$("participantTournament").addEventListener("change", async () => {
    const tournamentId = $("participantTournament").value;
    const list = $("participantList");

    if (!tournamentId) {
        list.textContent = "Select a tournament to view participants.";
        return;
    }

    list.textContent = "Loading participants...";

    try {
        const snapshot = await getDocs(
            collection(db, "tournaments", tournamentId, "participants")
        );

        list.innerHTML = "";

        if (snapshot.empty) {
            list.textContent = "No participants registered.";
            return;
        }

        snapshot.forEach(item => {
            const data = item.data();
            const card = document.createElement("div");

            const name = document.createElement("h3");
            name.textContent = data.playerName || "Unknown Player";

            const uid = document.createElement("small");
            uid.textContent = "Player UID: " + item.id;

            card.append(name, uid);
            list.appendChild(card);
        });

    } catch (error) {
        console.error("Participant error:", error);
        list.textContent = "Could not load participants: " + error.message;
    }
});

// ===================================
// SAVE MATCH DETAILS
// ===================================

$("saveMatchBtn").addEventListener("click", async () => {
    const tournamentId = $("matchTournament").value;
    const roomId = $("roomId").value.trim();
    const roomPassword = $("roomPassword").value.trim();

    if (!tournamentId || !roomId || !roomPassword) {
        alert("Select a tournament and enter room ID and password.");
        return;
    }

    try {
        await updateDoc(doc(db, "tournaments", tournamentId), {
            roomId,
            roomPassword,
            matchUpdatedAt: serverTimestamp()
        });

        $("matchList").textContent =
            "Room details saved successfully for this tournament.";

        alert("Match details saved.");

    } catch (error) {
        console.error("Match save error:", error);
        alert("Could not save match details: " + error.message);
    }
});

$("matchTournament").addEventListener("change", () => {
    const tournament = getTournament($("matchTournament").value);

    if (!tournament) {
        $("roomId").value = "";
        $("roomPassword").value = "";
        $("matchList").textContent = "Select a tournament.";
        return;
    }

    $("roomId").value = tournament.roomId || "";
    $("roomPassword").value = tournament.roomPassword || "";

    $("matchList").textContent = tournament.roomId
        ? "Saved Room ID: " + tournament.roomId
        : "No match room details saved yet.";
});

// ===================================
// PUBLISH RESULT
// ===================================

$("publishResultBtn").addEventListener("click", async () => {
    const tournamentId = $("resultTournament").value;
    const winnerName = $("winnerName").value.trim();
    const winnerUid = $("winnerUid").value.trim();
    const winnerPrize = Number($("winnerPrize").value);

    if (!tournamentId || !winnerName || !winnerUid || $("winnerPrize").value === "") {
        alert("Complete all result fields.");
        return;
    }

    if (!Number.isFinite(winnerPrize) || winnerPrize < 0) {
        alert("Enter a valid prize amount.");
        return;
    }

    try {
        await updateDoc(doc(db, "tournaments", tournamentId), {
            result: {
                winnerName,
                winnerUid,
                winnerPrize,
                publishedAt: new Date().toISOString()
            },
            status: "completed"
        });

        $("resultList").textContent =
            "Result published: " + winnerName +
            " | Prize: ₹" + winnerPrize;

        $("winnerName").value = "";
        $("winnerUid").value = "";
        $("winnerPrize").value = "";

        await loadTournaments();
        await updateOverview();

        alert("Result published.");

    } catch (error) {
        console.error("Result error:", error);
        alert("Could not publish result: " + error.message);
    }
});

$("resultTournament").addEventListener("change", () => {
    const tournament = getTournament($("resultTournament").value);

    if (!tournament) {
        $("resultList").textContent = "Select a tournament.";
        return;
    }

    if (tournament.result) {
        $("resultList").textContent =
            "Winner: " + tournament.result.winnerName +
            " | UID: " + tournament.result.winnerUid +
            " | Prize: ₹" + tournament.result.winnerPrize;
    } else {
        $("resultList").textContent = "No result published yet.";
    }
});

//====================================
// DASHBOARD STATISTICS
// ===================================

async function updateOverview() {
    try {
        const players = await getDocs(collection(db, "users"));
        const tournaments = await getDocs(collection(db, "tournaments"));

        $("totalPlayers").textContent = players.size;
        $("totalTournaments").textContent = tournaments.size;

        let active = 0;
        let completed = 0;

        tournaments.forEach(item => {
            const data = item.data();

            if (data.result || data.status === "completed") {
                completed++;
            } else if (data.roomId) {
                active++;
            }
        });

        $("activeMatches").textContent = active;
        $("completedMatches").textContent = completed;

    } catch (error) {
        console.error("Overview error:", error);
    }
}
