/**
 * Firebase Configuration and Initialization
 * Pastelaria 24h - Sistema de Gestao de Turnos
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getDatabase,
    ref,
    set,
    get,
    update,
    remove,
    onValue,
    push
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase Configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Export Firebase services
export {
    app,
    auth,
    db,
    rtdb,
    // Auth functions
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    // Firestore functions
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    // Realtime Database functions
    ref,
    set,
    get,
    update,
    remove,
    onValue,
    push
};

// User roles
export const USER_ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    MANAGER: 'manager'
};

// Collection names
export const COLLECTIONS = {
    USERS: 'users',
    SHIFTS: 'shifts',
    PRODUCTS: 'products',
    TRANSACTIONS: 'transactions',
    REPORTS: 'reports',
    CORRECTIONS: 'corrections',
    SETTINGS: 'settings'
};

/**
 * Get current user data from Firestore
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUserData() {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
        if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

/**
 * Create or update user document in Firestore
 * @param {string} uid
 * @param {Object} userData
 */
export async function saveUserData(uid, userData) {
    try {
        await setDoc(doc(db, COLLECTIONS.USERS, uid), {
            ...userData,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error('Error saving user data:', error);
        throw error;
    }
}

/**
 * Check if user is admin
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function isUserAdmin(uid) {
    try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
        if (userDoc.exists()) {
            return userDoc.data().role === USER_ROLES.ADMIN;
        }
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

console.log('Firebase initialized successfully');
