import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCig0k-trclZCICTCbN-sX45MzRZrKdA20",
  authDomain: "tus-softball-datasystem.firebaseapp.com",
  projectId: "tus-softball-datasystem",
  storageBucket: "tus-softball-datasystem.firebasestorage.app",
  messagingSenderId: "889674832694",
  appId: "1:889674832694:web:56f16751133260991bf197",
  measurementId: "G-RYK8F8D3LQ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
