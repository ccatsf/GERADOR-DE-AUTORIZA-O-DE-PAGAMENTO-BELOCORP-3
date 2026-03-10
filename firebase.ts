import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB9Fp-sy7d21sgdV2rm1usIxcPWV8QHHVI",
  authDomain: "adad-a1674.firebaseapp.com",
  projectId: "adad-a1674",
  storageBucket: "adad-a1674.firebasestorage.app",
  messagingSenderId: "123851363670",
  appId: "1:123851363670:web:73d0252fbc1db8f3dbf2f7",
  measurementId: "G-BTT0Y38ZWW"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
