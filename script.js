
import { auth, db } from "./firebase/firebase.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    doc,
    getDoc
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
        console.error("Admin login error:", error);
        $("message").textContent = "Login failed. Check your details.";
    } finally {
        $("loginBtn").disabled = false;
    }
};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        loginView.hidden = false;
        dashboardView.hidden = true;
        return;
    }

    try {
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists() || adminSnap.data().active !== true) {
            await signOut(auth);
            $("message").textContent =
                "This account is not authorized as an admin.";
            return;
        }

        loginView.hidden = true;
        dashboardView.hidden = false;

    } catch (error) {
        console.error("Admin verification error:", error);
        await signOut(auth);
        $("message").textContent = "Admin verification failed.";
    }
});

$("logoutBtn").onclick = async () => {
    await signOut(auth);
};
