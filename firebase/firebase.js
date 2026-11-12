
/* =========================================
   PLAYX ADMIN — FIREBASE INITIALIZATION
   ========================================= */

import { initializeApp, getApp, getApps } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/*
  IMPORTANT:
  Copy your existing Firebase configuration
  from the PlayX Main app project.

  Do not create a new Firebase project.
*/

const firebaseConfig = {
    apiKey: "AIzaSyBaTwoE50g4jsVZ1q2OJd4I4Jlm1gDsWjU",
    authDomain: "playx-test.firebaseapp.com",
    projectId: "playx-test",
    storageBucket: "playx-test.firebasestorage.app",
    messagingSenderId: "1048739408697",
    appId: "1:1048739408697:web:0f1f2ea8af9d80468bd6e8"
  };

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
