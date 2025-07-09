// firebase-config.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1TPBDJK122pxGPtSsOSHFZPQ6c7NiveY",
  authDomain: "takedown-19.firebaseapp.com",
  projectId: "takedown-19",
  storageBucket: "takedown-19.firebasestorage.app",
  messagingSenderId: "939121930281",
  appId: "1:939121930281:web:a7117f1c647132e652ec38"
};

// Only initialize once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider };
