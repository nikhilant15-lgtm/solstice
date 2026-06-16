import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaxGruOusBzkAQZWFCC_6ya-Hl7jrdhLQ",
  authDomain: "solstice-881b1.firebaseapp.com",
  projectId: "solstice-881b1",
  storageBucket: "solstice-881b1.firebasestorage.app",
  messagingSenderId: "479982042100",
  appId: "1:479982042100:web:bcd196b2ba5a7afc3b57a1",
  measurementId: "G-662D7RTXSJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
