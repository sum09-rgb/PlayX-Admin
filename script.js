
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

const $ = (id) => document.getElementById(id);

const loginView = $("loginView");
const dashboardView = $("dashboardView");

$("loginBtn").onclick = async () => {
    const email = $("adminEmail").value.trim();
    const password = $("adminPassword").value;

    if (!email || !password) {
        $("message").textContent = "Enter email and password.";
        return;
    }

    $("loginBtn").disabled = true;
    $("message").textContent = "Checking account...";

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error(error);
        $("message").textContent = "Login failed. Check your details.";
    } finally {
        $("loginBtn").disabled = false;
    }
};

async function loadTournaments() {
    const list = $("tournamentList");
    list.textContent = "Loading tournaments...";

    try {
        const snapshot = await getDocs(
            collection(db, "tournaments")
        );

        list.innerHTML = "";

        if (snapshot.empty) {
            list.textContent = "No tournaments created yet.";
            return;
        }

        snapshot.forEach((item) => {
            const data = item.data();

            const card = document.createElement("div");

            const title = document.createElement("h3");
            title.textContent = data.name || "Untitled";

            const details = document.createElement("p");
            details.textContent =
                "Game: " + data.game +
                " | Entry: " + data.entryFee +
                " | Prize: " + data.prizePool +
                " | Players: " + data.maxPlayers;

            const status = document.createElement("p");
            status.textContent = "Status: " + data.status;

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete Tournament";

            deleteButton.onclick = async () => {
                if (!confirm("Delete this tournament?")) return;

                try {
                    await deleteDoc(doc(db, "tournaments", item.id));
                    await loadTournaments();
                } catch (error) {
                    alert("Could not delete tournament.");
                }
            };

            card.append(title, details, status, deleteButton);
            list.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        list.textContent = "Could not load tournaments.";
    }
}

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

    } catch (error) {
        console.error("Admin verification error:", error);
        await signOut(auth);
        $("message").textContent = "Admin verification failed.";
    }
});

$("createTournamentBtn").onclick = async () => {
    const name = $("tournamentName").value.trim();
    const game = $("gameName").value.trim();
    const entryFee = $("entryFee").value;
    const prizePool = $("prizePool").value;
    const maxPlayers = $("maxPlayers").value;

    if (!name || !game || entryFee === "" ||
        prizePool === "" || maxPlayers === "") {
        $("tournamentMessage").textContent =
            "Please fill all fields.";
        return;
    }

    try {
        await addDoc(collection(db, "tournaments"), {
            name,
            game,
            entryFee: Number(entryFee),
            prizePool: Number(prizePool),
            maxPlayers: Number(maxPlayers),
            status: "open",
            createdAt: serverTimestamp()
        });

        $("tournamentMessage").textContent =
            "Tournament created successfully!";
        await loadTournaments();

    } catch (error) {
        console.error(error);
        $("tournamentMessage").textContent =
            "Could not create tournament.";
    }
};

$("logoutBtn").onclick = async () => {
    await signOut(auth);
};
            
