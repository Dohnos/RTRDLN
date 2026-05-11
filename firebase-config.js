// ============================================================
// Firebase konfigurace – vyplňte vlastní hodnoty z Firebase Console
// https://console.firebase.google.com → váš projekt → Nastavení projektu → Webové aplikace
//
// BEZPEČNOST: Firebase API klíče pro webové aplikace jsou veřejné záměrně –
// bezpečnost řídí Firestore Security Rules (firebase.google.com/docs/rules).
// Nastavte Security Rules tak, aby omezovaly write operace jen na autentizované uživatele.
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDsyK56HFW_q-dg35tTv4-sXFJylNLAzZc",
  authDomain: "rtrdln.firebaseapp.com",
  projectId: "rtrdln",
  storageBucket: "rtrdln.firebasestorage.app",
  messagingSenderId: "672984489873",
  appId: "1:672984489873:web:177cfd93bf40a1e5210430"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
