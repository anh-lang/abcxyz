// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRjDA8UPbBvXWrx03wczUowqEpYUuwgPU", // This is a public key, but for production, use environment variables and security rules
  authDomain: "quanly-429ea.firebaseapp.com",
  projectId: "quanly-429ea",
  storageBucket: "quanly-429ea.firebasestorage.app",
  messagingSenderId: "575410029991",
  appId: "1:575410029991:web:c8a3896bd2e6d04412a282"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();