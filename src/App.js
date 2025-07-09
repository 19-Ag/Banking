import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { auth, db, provider } from "./firebase-config";



// Utility to check for WebAuthn support
function browserSupportsWebAuthn() {
  return !!(window.PublicKeyCredential && typeof window.PublicKeyCredential === "function");
}

// ✅ Initialize Firebase app and analytics
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1TPBDJK122pxGPtSsOSHFZPQ6c7NiveY",
  authDomain: "takedown-19.firebaseapp.com",
  projectId: "takedown-19",
  storageBucket: "takedown-19.firebasestorage.app",
  messagingSenderId: "939121930281",
  appId: "1:939121930281:web:a7117f1c647132e652ec38"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// ✅ Use emulator in dev
if (process.env.NODE_ENV === 'development') {
  console.log("Using Firebase Emulator Suite");
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
}
if (window.location.hostname === "localhost") {
  console.log("✅ Using Firebase Emulator Suite (local)");
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
}

export default function App() {
  const [page, setPage] = useState('login');
  const [user, setUser ] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useEmulator] = useState(process.env.NODE_ENV === 'development');

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser ) => {
      if (currentUser ) {
        setUser (currentUser );
        await loadUserData(currentUser .uid);
        setPage('dashboard');
      } else {
        setUser (null);
        setPage('login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, []);

  const loadUserData = async (uid) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setBalance(userData.balance || 0);
        const q = query(collection(db, 'transactions'), where('userId', '==', uid));
        const snapshot = await getDocs(q);
        const txs = snapshot.docs.map(doc => doc.data());
        setTransactions(txs);
      } else {
        await setDoc(userRef, { balance: 0 });
        setBalance(0);
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // 🔐 Google Sign-In
  const handleGoogleLogin = async () => {
    try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    console.log("User info:", result.user);
  } catch (error) {
    console.error("Login failed", error);
  }
  };

  // 📋 Biometric Sign-In (WebAuthn) -- Demo only
  const handleBiometricLogin = async () => {
    if (!browserSupportsWebAuthn()) {
      alert('Biometric authentication not supported on this device.');
      return;
    }
    alert("Biometric login is not implemented in this demo.");
    // To implement: use navigator.credentials.get and signInWithCredential
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle state update
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  // Register handler
  const handleRegister = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle state update
    } catch (error) {
      alert('Registration failed: ' + error.message);
    }
  };

  // Transfer handler
  const handleTransfer = async (e) => {
    e.preventDefault();
    const amount = parseFloat(e.target.amount.value);
    const recipient = e.target.recipient.value;

    if (!isNaN(amount) && amount > 0 && amount <= balance && recipient) {
      const newBalance = balance - amount;
      const tx = {
        userId: user.uid,
        date: new Date().toISOString(),
        type: 'Transfer',
        amount: -parseFloat(amount.toFixed(2)),
        to: recipient,
      };

      try {
        await Promise.all([
          setDoc(doc(db, 'users', user.uid), { balance: newBalance }, { merge: true }),
          addDoc(collection(db, 'transactions'), tx),
        ]);
        setBalance(newBalance);
        setTransactions([tx, ...transactions]);
        alert(`Successfully transferred $${amount.toFixed(2)} to ${recipient}`);
      } catch (error) {
        alert('Transaction failed: ' + error.message);
      }
    } else {
      alert('Invalid transfer details.');
    }
  };

  // Withdraw handler
  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(e.target.amount.value);

    if (!isNaN(amount) && amount > 0 && amount <= balance) {
      const newBalance = balance - amount;
      const tx = {
        userId: user.uid,
        date: new Date().toISOString(),
        type: 'Withdrawal',
        amount: -parseFloat(amount.toFixed(2)),
        to: 'ATM',
      };

      try {
        await Promise.all([
          setDoc(doc(db, 'users', user.uid), { balance: newBalance }, { merge: true }),
          addDoc(collection(db, 'transactions'), tx),
        ]);
        setBalance(newBalance);
        setTransactions([tx, ...transactions]);
        alert(`Successfully withdrew $${amount.toFixed(2)}`);
      } catch (error) {
        alert('Withdrawal failed: ' + error.message);
      }
    } else {
      alert('Invalid withdrawal amount.');
    }
  };

  const handleLogout = async () => {
    return await signOut(auth);
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="font-sans bg-gray-100 min-h-screen flex items-center justify-center p-4">
      {!user ? (
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h2 className="text-2xl font-bold text-center text-gray-800">Banking App</h2>

          {/* Dev Mode Indicator */}
          {useEmulator && (
            <div className="bg-yellow-100 text-yellow-800 text-sm p-2 rounded text-center">
              Using Firebase Emulator Suite
            </div>
          )}

          <div className="flex justify-center space-x-4 mb-6">
            <button onClick={() => setPage('login')} className={`px-4 py-2 rounded-lg ${page === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              Login
            </button>
            <button onClick={() => setPage('register')} className={`px-4 py-2 rounded-lg ${page === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              Register
            </button>
          </div>

          {page === 'login' ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" name="email" required placeholder="Enter your email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" name="password" required placeholder="Enter password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Login</button>
              </form>

              <div className="border-t pt-4">
                <button onClick={handleGoogleLogin} className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Sign in with Google</button>
                {browserSupportsWebAuthn() && (
                  <button onClick={handleBiometricLogin} className="mt-2 w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Login with Biometrics</button>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" required placeholder="Enter your email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" name="password" required placeholder="Create password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Register</button>
            </form>
          )}
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Dashboard Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <h2 className="text-2xl font-semibold">Hello, {user.email}</h2>
            <p className="opacity-90">Your current balance</p>
            <p className="text-3xl font-bold mt-2">${balance.toFixed(2)}</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b">
            <button onClick={() => setPage('dashboard')} className={`px-6 py-3 text-sm font-medium ${page === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
              Dashboard
            </button>
            <button onClick={() => setPage('transfer')} className={`px-6 py-3 text-sm font-medium ${page === 'transfer' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
              Transfer
            </button>
            <button onClick={() => setPage('withdraw')} className={`px-6 py-3 text-sm font-medium ${page === 'withdraw' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
              Withdraw
            </button>
          </div>

          {/* Dashboard Content */}
          {page === 'dashboard' && (
            <div className="p-6 space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">Recent Transactions</h3>
              <div className="space-y-4">
                {transactions.length === 0 && <p>No transactions yet.</p>}
                {transactions.slice(0, 5).map((tx, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{tx.type}</p>
                      <p className="text-sm text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount.toString().startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>
                        {tx.amount}
                      </p>
                      <p className="text-sm text-gray-500">To: {tx.to}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Logout
              </button>
            </div>
          )}

          {/* Transfer Form */}
          {page === 'transfer' && (
            <div className="p-6 space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">Make a Transfer</h3>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                  <input type="text" name="recipient" placeholder="Enter recipient name" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input type="number" name="amount" min="0.01" step="0.01" placeholder="Enter amount" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Transfer Money</button>
              </form>
            </div>
          )}

          {/* Withdraw Form */}
          {page === 'withdraw' && (
            <div className="p-6 space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">Withdraw Funds</h3>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input type="number" name="amount" min="0.01" step="0.01" placeholder="Enter amount" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Withdraw</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
