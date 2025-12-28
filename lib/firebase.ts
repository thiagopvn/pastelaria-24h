import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAFiDHRY_DuJ6pLzDmR-M2bNhzgxsX9doE",
  authDomain: "projetopastel-24h.firebaseapp.com",
  databaseURL: "https://projetopastel-24h-default-rtdb.firebaseio.com",
  projectId: "projetopastel-24h",
  storageBucket: "projetopastel-24h.firebasestorage.app",
  messagingSenderId: "348495095024",
  appId: "1:348495095024:web:edcf5a3df1ecb0e47ece35",
  measurementId: "G-TBD0X0KZ20"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const functions = firebase.functions();

export default firebase.app();