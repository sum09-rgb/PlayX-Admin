
/* =========================================
   PLAYX ADMIN — AUTHENTICATION
   ========================================= */

import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { showToast } from "./ui.js";

/* CURRENT ADMIN */

let currentAdmin = null;

/* CHECK ADMIN PERMISSION */

export async function verifyAdmin(user) {
    if (!user) return null;

    try {
        const adminRef = doc(db, "admins", user.uid);
        const adminSnapshot = await getDoc(adminRef);

        if (!adminSnapshot.exists()) {
            await signOut(auth);
            throw new Error("Admin account not registered.");
        }

        const adminData = adminSnapshot.data();

        if (adminData.Active !== true) {
            await signOut(auth);
            throw new Error("Your admin account is inactive.");
        }

        currentAdmin = {
            uid: user.uid,
            email: user.email || "",
            ...adminData
        };

        return currentAdmin;

    } catch (error) {
        currentAdmin = null;
        throw error;
    }
}

/* ADMIN LOGIN */

export async function loginAdmin(email, password) {
    const cleanEmail = String(email || "").trim();

    if (!cleanEmail || !password) {
        throw new Error("Enter your email and password.");
    }

    try {
        const result = await signInWithEmailAndPassword(
            auth,
            cleanEmail,
            password
        );

        const admin = await verifyAdmin(result.user);

        if (!admin) {
            throw new Error("Admin verification failed.");
        }

        return admin;

    } catch (error) {
        currentAdmin = null;

        const messages = {
            "auth/invalid-credential":
                "Incorrect email or password.",
            "auth/user-not-found":
                "Admin account not found.",
            "auth/wrong-password":
                "Incorrect password.",
            "auth/too-many-requests":
                "Too many attempts. Try again later.",
            "auth/network-request-failed":
                "Network error. Check your internet."
        };

        throw new Error(
            messages[error.code] ||
            error.message ||
            "Login failed."
        );
    }
}

/* ADMIN LOGOUT */

export async function logoutAdmin() {
    currentAdmin = null;
    await signOut(auth);
}

/* CURRENT ADMIN DATA */

export function getCurrentAdmin() {
    return currentAdmin;
}

/* AUTH SESSION LISTENER */

export function watchAdminSession(callback) {
    return onAuthStateChanged(auth, async user => {
        if (!user) {
            currentAdmin = null;
            callback(null);
            return;
        }

        try {
            const admin = await verifyAdmin(user);
            callback(admin);

        } catch (error) {
            currentAdmin = null;

            showToast(
                error.message || "Admin access denied.",
                "error"
            );

            callback(null);
        }
    });
}
