// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "airassist-p5cyw",
  "appId": "1:838418656685:web:ba0a0eed571f42004dc524",
  "storageBucket": "airassist-p5cyw.firebasestorage.app",
  "apiKey": "AIzaSyCcV9GnhokUi3EcQn0AY_TJIC8Aj97BPjQ",
  "authDomain": "airassist-p5cyw.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "838418656685"
};


// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
