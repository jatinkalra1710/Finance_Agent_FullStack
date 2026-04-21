// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // <-- THIS LINE WAS MISSING!
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDObBEtZqneZfi7jL6xz0lPKvCboZdmzn8",
  authDomain: "aianalystpro.firebaseapp.com",
  projectId: "aianalystpro",
  storageBucket: "aianalystpro.firebasestorage.app",
  messagingSenderId: "208404245814",
  appId: "1:208404245814:web:2c5ee75d250ce6cd091797",
  measurementId: "G-DET8L4K10F"
};

const app = initializeApp(firebaseConfig);

// THESE MUST HAVE 'export' IN FRONT OF THEM
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
