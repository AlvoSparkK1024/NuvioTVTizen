import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBM_h1YYKszHqf6SDDVMzQa-GM1AM9OWZc",
  authDomain: "nuvio-tv.firebaseapp.com",
  projectId: "nuvio-tv",
  storageBucket: "nuvio-tv.firebasestorage.app",
  messagingSenderId: "124651860588",
  appId: "1:124651860588:web:d18ee1ba70c42c25ffde49",
  measurementId: "G-J8K01W7BY1"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);
