
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
        $("message").textContent = "Enter email and password.";
        return;
    }

    $("message").textContent = "Signing in...";

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login error:", error);
        $("message").textContent = "Login failed: " + error.message;
    }
});

// LOAD TOURNAMENTS
async function loadTournaments() {
    const list = $("tournamentList");
    list.textContent = "Loading tournaments...";

    try {
        const snapshot = await getDocs(collection(db, "tournaments"));
        list.innerHTML = "";

        if (snapshot.empty) {
            list.textContent = "No tournaments created yet.";
            return;
        }

        for (const item of snapshot.docs) {
            const data = item.data();

            const participants = await getDocs(
                collection(db, "tournaments", item.id, "participants")
            );

            const card = document.createElement("div");
            const title = document.createElement("h3");
            title.textContent = data.name || "Untitled Tournament";
            card.appendChild(title);

            const details = [
                ["Game", data.game],
                ["Mode", data.mode],
                ["Map", data.map],
                ["Date", data.date],
                ["Time", data.time],
                ["Entry Fee", "₹" + (data.entryFee ?? 0)],
                ["Prize Pool", "₹" + (data.prizePool ?? 0)],
                ["Maximum Players", data.maxPlayers],
                ["Registered Players", participants.size],
                ["Status", data.status]
            ];

            details.forEach(([label, value]) => {
                const p = document.createElement("p");
                p.textContent = label + ": " + (value ?? "Not specified");
                card.appendChild(p);
            });

            const heading = document.createElement("h4");
            heading.textContent = "Registered Player Names";
            card.appendChild(heading);

            if (participants.empty) {
                const p = document.createElement("p");
                p.textContent = "No players joined yet.";
                card.appendChild(p);
            } else {
                participants.forEach(playerDoc => {
                    const p = document.createElement("p");
                    p.textContent = "• " +
                        (playerDoc.data().playerName || "Unknown Player");
                    card.appendChild(p);
                });
            }

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete Tournament";

            deleteButton.onclick = async () => {
                if (!confirm("Delete this tournament?")) return;

                try {
                    await deleteDoc(doc(db, "tournaments", item.id));
                    await loadTournaments();
                    await updateOverview();
                } catch (error) {
                    console.error(error);
                    alert("Could not delete tournament.");
                }
            };

            card.appendChild(deleteButton);
            list.appendChild(card);
        }
    } catch (error) {
        console.error("Tournament loading error:", error);
        list.textContent = "Could not load tournaments: " + error.message;
    }
}

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
            await signOut(auth);
            $("message").textContent = "Admin not authorized.";
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
        
