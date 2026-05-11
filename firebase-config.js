// ============================================================
// Firebase konfigurace – vyplňte vlastní hodnoty z Firebase Console
// https://console.firebase.google.com → váš projekt → Nastavení projektu → Webové aplikace
//
// BEZPEČNOST: Firebase API klíče pro webové aplikace jsou veřejné záměrně –
// bezpečnost řídí Firestore Security Rules (firebase.google.com/docs/rules).
// Nastavte Security Rules tak, aby omezovaly write operace jen na autentizované uživatele.
// ============================================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
