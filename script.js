
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

const $ = (id) => {
    const element = document.getElementById(id);
    if (!element) throw new Error("Missing HTML element: " + id);
    return element;
};

const loginView = $("loginView");
const dashboardView = $("dashboardView");

// ADMIN LOGIN

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
        alert("Login failed. Please check your email and password.");
    }
});

// LOAD TOURNAMENTS
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

    } catch (error) {
        console.error("Tournament loading error:", error);
        list.textContent = "Could not load tournaments.";
    }
}

// DISPLAY AND FILTER TOURNAMENTS
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

        card.append(title, details);
        list.appendChild(card);
    });
}

// TOURNAMENT SEARCH
$("tournamentSearch").addEventListener("input", displayTournaments);

// TOURNAMENT FILTER
$("tournamentFilter").addEventListener("change", displayTournaments);

// UPDATE DASHBOARD STATISTICS
async function updateOverview() {
    try {
        const players = await getDocs(collection(db, "users"));
        const tournaments = await getDocs(collection(db, "tournaments"));

        $("totalPlayers").textContent = players.size;
        $("totalTournaments").textContent = tournaments.size;
        $("activeMatches").textContent = "0";
        $("completedMatches").textContent = "0";
    } catch (error) {
        console.error("Overview error:", error);
    }
}

// LOAD AND SEARCH PLAYERS
let allPlayers = [];

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

// DISPLAY PLAYERS
function displayPlayers(players) {
    const list = $("playerList");
    list.innerHTML = "";

    if (players.length === 0) {
        list.textContent = "No players found.";
        return;
    }

    players.forEach(data => {
        const player = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = data.name || "Unknown Player";

        const email = document.createElement("p");
        email.textContent = data.email || "No email";

        const uid = document.createElement("small");
        uid.textContent = "UID: " + data.uid;

        player.append(name, email, uid);
        list.appendChild(player);
    });
}

// LIVE PLAYER SEARCH
$("playerSearch").addEventListener("input", () => {
    const query = $("playerSearch").value.trim().toLowerCase();

    const filtered = allPlayers.filter(player =>
        (player.name || "").toLowerCase().includes(query) ||
        (player.email || "").toLowerCase().includes(query) ||
        player.uid.toLowerCase().includes(query)
    );

    displayPlayers(filtered);
});

// CHECK ADMIN ACCESS
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        loginView.hidden = false;
        dashboardView.hidden = true;
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

        loginView.hidden = true;
        dashboardView.hidden = false;

        await loadTournaments();
        await loadPlayers();
        await updateOverview();

    } catch (error) {
        console.error("Admin verification error:", error);
        alert("Admin error: " + error.message);
        await signOut(auth);
    }
});

// CREATE TOURNAMENT
$("createTournamentBtn").onclick = async () => {
    const name = $("tournamentName").value.trim();
    const game = $("gameName").value.trim();
    const mode = $("gameMode").value;
    const map = $("gameMap").value;
    const date = $("tournamentDate").value;
    const time = $("tournamentTime").value;
    const entryFee = $("entryFee").value;
    const prizePool = $("prizePool").value;
    const maxPlayers = $("maxPlayers").value;
    const description = $("tournamentDescription").value.trim();

    if (!name || !game || !date || !time ||
        entryFee === "" || prizePool === "" || maxPlayers === "") {
        $("tournamentMessage").textContent = "Please fill all required fields.";
        return;
    }

    if (Number(entryFee) < 0 ||
        Number(prizePool) < 0 ||
        Number(maxPlayers) < 1) {
        $("tournamentMessage").textContent = "Please enter valid numbers.";
        return;
    }

    try {
        await addDoc(collection(db, "tournaments"), {
            name,
            game,
            mode,
            map,
            date,
            time,
            entryFee: Number(entryFee),
            prizePool: Number(prizePool),
            maxPlayers: Number(maxPlayers),
            description,
            status: "open",
            createdAt: serverTimestamp()
        });

        $("tournamentMessage").textContent = "Tournament created successfully!";

        $("tournamentName").value = "";
        $("gameName").value = "";
        $("tournamentDate").value = "";
        $("tournamentTime").value = "";
        $("entryFee").value = "";
        $("prizePool").value = "";
        $("maxPlayers").value = "";
        $("tournamentDescription").value = "";

        await loadTournaments();
        await updateOverview();

    } catch (error) {
        console.error(error);
        $("tournamentMessage").textContent =
            "Could not create tournament: " + error.message;
    }
};

// ADMIN LOGOUT
$("logoutBtn").onclick = async () => {
    await signOut(auth);
};

// ADMIN PAGE NAVIGATION
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
    button.onclick = () => {
        const page = button.dataset.page;

        document.querySelectorAll(".page").forEach(section => {
            section.classList.remove("active");
        });

        document.querySelectorAll(".nav-btn").forEach(item => {
            item.classList.remove("active");
        });

        const target = document.getElementById(page + "Page");

        if (!target) {
            console.error("Missing page:", page + "Page");
            return;
        }

        target.classList.add("active");
        button.classList.add("active");

        $("pageTitle").textContent = pageNames[page] || "PlayX Admin";
    };
});
