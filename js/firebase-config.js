/**
 * Firebase Configuration and Services
 * Pastelaria 24h - Sistema de Gestao de Turnos
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    increment,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getDatabase,
    ref,
    set,
    get,
    update,
    remove,
    onValue,
    push,
    child,
    serverTimestamp as rtdbServerTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import {
    getFunctions,
    httpsCallable,
    connectFunctionsEmulator
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

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
const functions = getFunctions(app, 'southamerica-east1');

// Uncomment for local development with emulators
// connectFunctionsEmulator(functions, 'localhost', 5001);

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
    SETTINGS: 'settings'
};

// ==================== AUTH FUNCTIONS ====================

export { auth, db, rtdb, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile };

/**
 * Get current user data from Firestore
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
 * Save user data to Firestore
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

// ==================== USER MANAGEMENT ====================

/**
 * Get all users
 */
export async function getAllUsers() {
    try {
        const usersQuery = query(collection(db, COLLECTIONS.USERS), orderBy('name'));
        const snapshot = await getDocs(usersQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting users:', error);
        return [];
    }
}

/**
 * Subscribe to users changes (real-time)
 */
export function subscribeToUsers(callback) {
    const usersQuery = query(collection(db, COLLECTIONS.USERS), orderBy('name'));
    return onSnapshot(usersQuery, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(users);
    });
}

/**
 * Create new user (admin only)
 */
export async function createNewUser(userData) {
    try {
        // Create user document in Firestore
        const userRef = doc(collection(db, COLLECTIONS.USERS));
        await setDoc(userRef, {
            ...userData,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: userRef.id };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

/**
 * Update user
 */
export async function updateUser(userId, userData) {
    try {
        await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
            ...userData,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

/**
 * Delete user
 */
export async function deleteUser(userId) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
        return true;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

// ==================== PRODUCT MANAGEMENT ====================

/**
 * Get all products
 */
export async function getAllProducts() {
    try {
        const productsQuery = query(collection(db, COLLECTIONS.PRODUCTS), orderBy('category'), orderBy('name'));
        const snapshot = await getDocs(productsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting products:', error);
        return [];
    }
}

/**
 * Subscribe to products changes (real-time)
 */
export function subscribeToProducts(callback) {
    const productsQuery = query(collection(db, COLLECTIONS.PRODUCTS), orderBy('name'));
    return onSnapshot(productsQuery, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(products);
    });
}

/**
 * Create new product
 */
export async function createProduct(productData) {
    try {
        const productRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
            ...productData,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Sync to Realtime Database for real-time updates
        await set(ref(rtdb, `products/${productRef.id}`), {
            id: productRef.id,
            ...productData,
            active: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        return { success: true, id: productRef.id };
    } catch (error) {
        console.error('Error creating product:', error);
        throw error;
    }
}

/**
 * Update product
 */
export async function updateProduct(productId, productData) {
    try {
        await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), {
            ...productData,
            updatedAt: serverTimestamp()
        });

        // Sync to Realtime Database
        await update(ref(rtdb, `products/${productId}`), {
            ...productData,
            updatedAt: Date.now()
        });

        return true;
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
}

/**
 * Delete product
 */
export async function deleteProduct(productId) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, productId));

        // Remove from Realtime Database
        await remove(ref(rtdb, `products/${productId}`));

        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
}

/**
 * Subscribe to products changes (Realtime Database - for employee)
 */
export function subscribeToProductsRTDB(callback) {
    const productsRef = ref(rtdb, 'products');
    let syncAttempted = false;

    return onValue(productsRef, async (snapshot) => {
        const products = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const product = child.val();
                if (product && product.active !== false) {
                    products.push({ id: child.key, ...product });
                }
            });
        }

        // If no products in RTDB and haven't tried syncing yet, sync from Firestore
        if (products.length === 0 && !syncAttempted) {
            syncAttempted = true;
            console.log('No products in RTDB, syncing from Firestore...');
            try {
                await syncProductsToRTDB();
            } catch (err) {
                console.warn('Auto-sync failed:', err);
            }
            return; // Will get called again after sync
        }

        // Sort by category then name
        products.sort((a, b) => {
            if (a.category !== b.category) {
                return (a.category || '').localeCompare(b.category || '');
            }
            return (a.name || '').localeCompare(b.name || '');
        });

        console.log('Products from RTDB:', products.length);
        callback(products);
    });
}

/**
 * Sync all products from Firestore to Realtime Database
 */
export async function syncProductsToRTDB() {
    try {
        const products = await getAllProducts();
        const updates = {};

        products.forEach(product => {
            updates[`products/${product.id}`] = {
                ...product,
                createdAt: product.createdAt?.toMillis?.() || Date.now(),
                updatedAt: product.updatedAt?.toMillis?.() || Date.now()
            };
        });

        if (Object.keys(updates).length > 0) {
            await update(ref(rtdb), updates);
        }

        console.log(`Synced ${products.length} products to RTDB`);
        return products.length;
    } catch (error) {
        console.error('Error syncing products to RTDB:', error);
        throw error;
    }
}

// ==================== SHIFT MANAGEMENT (REALTIME DB) ====================

/**
 * Open a new shift
 */
export async function openShift(userId, userName, initialCash, initialCoins = 0) {
    try {
        const shiftRef = push(ref(rtdb, 'shifts'));
        const shiftData = {
            id: shiftRef.key,
            userId,
            userName,
            status: 'open',
            initialCash: parseFloat(initialCash) || 0,
            initialCoins: parseFloat(initialCoins) || 0,
            currentCash: parseFloat(initialCash) || 0,
            totalSales: 0,
            totalWithdrawals: 0,
            salesCount: 0,
            startTime: Date.now(),
            endTime: null,
            collaborators: {},
            sales: {},
            withdrawals: {}
        };

        await set(shiftRef, shiftData);

        // Also update user's active shift in Realtime DB
        await set(ref(rtdb, `activeShifts/${userId}`), {
            shiftId: shiftRef.key,
            startTime: Date.now()
        });

        return { success: true, shiftId: shiftRef.key, data: shiftData };
    } catch (error) {
        console.error('Error opening shift:', error);
        throw error;
    }
}

/**
 * Close a shift
 */
export async function closeShift(shiftId, userId, closingData) {
    try {
        // Build closingData object first
        const closingDataObj = {
            finalCash: parseFloat(closingData.finalCash) || 0,
            notes: closingData.notes || '',
            closedAt: Date.now()
        };

        // Calculate divergence before building updates
        const shiftSnapshot = await get(ref(rtdb, `shifts/${shiftId}`));
        if (shiftSnapshot.exists()) {
            const shift = shiftSnapshot.val();
            const expectedCash = (shift.initialCash || 0) + (shift.totalSales || 0) - (shift.totalWithdrawals || 0);
            const divergence = closingDataObj.finalCash - expectedCash;
            closingDataObj.expectedCash = expectedCash;
            closingDataObj.divergence = divergence;
        }

        const updates = {
            [`shifts/${shiftId}/status`]: 'closed',
            [`shifts/${shiftId}/endTime`]: Date.now(),
            [`shifts/${shiftId}/closingData`]: closingDataObj
        };

        await update(ref(rtdb), updates);

        // Remove active shift
        await remove(ref(rtdb, `activeShifts/${userId}`));

        // Save to Firestore for historical records
        await saveShiftToFirestore(shiftId);

        return { success: true };
    } catch (error) {
        console.error('Error closing shift:', error);
        throw error;
    }
}

/**
 * Save closed shift to Firestore
 */
async function saveShiftToFirestore(shiftId) {
    try {
        const shiftSnapshot = await get(ref(rtdb, `shifts/${shiftId}`));
        if (shiftSnapshot.exists()) {
            const shiftData = shiftSnapshot.val();
            await setDoc(doc(db, COLLECTIONS.SHIFTS, shiftId), {
                ...shiftData,
                savedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error saving shift to Firestore:', error);
    }
}

/**
 * Get user's active shift
 */
export async function getUserActiveShift(userId) {
    try {
        const activeShiftSnapshot = await get(ref(rtdb, `activeShifts/${userId}`));
        if (activeShiftSnapshot.exists()) {
            const { shiftId } = activeShiftSnapshot.val();
            const shiftSnapshot = await get(ref(rtdb, `shifts/${shiftId}`));
            if (shiftSnapshot.exists()) {
                return { id: shiftId, ...shiftSnapshot.val() };
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting active shift:', error);
        return null;
    }
}

/**
 * Subscribe to user's active shift (real-time)
 */
export function subscribeToUserShift(userId, callback) {
    const activeShiftRef = ref(rtdb, `activeShifts/${userId}`);
    let shiftUnsubscribe = null;
    let currentShiftId = null;

    const activeShiftUnsubscribe = onValue(activeShiftRef, (snapshot) => {
        if (snapshot.exists()) {
            const { shiftId } = snapshot.val();

            // Only create new listener if shiftId changed
            if (shiftId !== currentShiftId) {
                // Clean up previous shift listener
                if (shiftUnsubscribe) {
                    shiftUnsubscribe();
                }

                currentShiftId = shiftId;

                // Subscribe to the actual shift data
                shiftUnsubscribe = onValue(ref(rtdb, `shifts/${shiftId}`), (shiftSnapshot) => {
                    if (shiftSnapshot.exists()) {
                        callback({ id: shiftId, ...shiftSnapshot.val() });
                    } else {
                        callback(null);
                    }
                });
            }
        } else {
            // No active shift - clean up shift listener
            if (shiftUnsubscribe) {
                shiftUnsubscribe();
                shiftUnsubscribe = null;
            }
            currentShiftId = null;
            callback(null);
        }
    });

    // Return cleanup function that removes both listeners
    return () => {
        activeShiftUnsubscribe();
        if (shiftUnsubscribe) {
            shiftUnsubscribe();
        }
    };
}

/**
 * Subscribe to all active shifts (for admin monitoring)
 */
export function subscribeToAllActiveShifts(callback) {
    const shiftsRef = ref(rtdb, 'shifts');

    return onValue(shiftsRef, (snapshot) => {
        const shifts = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const shift = childSnapshot.val();
                if (shift.status === 'open') {
                    shifts.push({ id: childSnapshot.key, ...shift });
                }
            });
        }
        callback(shifts);
    });
}

/**
 * Add sale to shift
 */
export async function addSaleToShift(shiftId, saleData) {
    try {
        const saleRef = push(ref(rtdb, `shifts/${shiftId}/sales`));
        const sale = {
            id: saleRef.key,
            ...saleData,
            timestamp: Date.now()
        };

        await set(saleRef, sale);

        // Get current shift data and update totals
        const shiftSnapshot = await get(ref(rtdb, `shifts/${shiftId}`));
        if (shiftSnapshot.exists()) {
            const currentData = shiftSnapshot.val();
            const amount = parseFloat(saleData.total) || 0;

            await update(ref(rtdb, `shifts/${shiftId}`), {
                totalSales: (currentData.totalSales || 0) + amount,
                salesCount: (currentData.salesCount || 0) + 1,
                currentCash: saleData.paymentMethod === 'cash'
                    ? (currentData.currentCash || 0) + amount
                    : (currentData.currentCash || 0)
            });
        }

        return { success: true, saleId: saleRef.key };
    } catch (error) {
        console.error('Error adding sale:', error);
        throw error;
    }
}

/**
 * Add withdrawal to shift
 */
export async function addWithdrawalToShift(shiftId, amount, reason) {
    try {
        const withdrawalRef = push(ref(rtdb, `shifts/${shiftId}/withdrawals`));
        const withdrawal = {
            id: withdrawalRef.key,
            amount: parseFloat(amount) || 0,
            reason,
            timestamp: Date.now()
        };

        await set(withdrawalRef, withdrawal);

        // Get current shift data and update totals
        const shiftSnapshot = await get(ref(rtdb, `shifts/${shiftId}`));
        if (shiftSnapshot.exists()) {
            const currentData = shiftSnapshot.val();
            const withdrawalAmount = parseFloat(amount) || 0;

            await update(ref(rtdb, `shifts/${shiftId}`), {
                totalWithdrawals: (currentData.totalWithdrawals || 0) + withdrawalAmount,
                currentCash: (currentData.currentCash || 0) - withdrawalAmount
            });
        }

        return { success: true, withdrawalId: withdrawalRef.key };
    } catch (error) {
        console.error('Error adding withdrawal:', error);
        throw error;
    }
}

/**
 * Add collaborator to shift
 */
export async function addCollaboratorToShift(shiftId, userId, userName, role) {
    try {
        await set(ref(rtdb, `shifts/${shiftId}/collaborators/${userId}`), {
            name: userName,
            role,
            addedAt: Date.now()
        });
        return { success: true };
    } catch (error) {
        console.error('Error adding collaborator:', error);
        throw error;
    }
}

/**
 * Remove collaborator from shift
 */
export async function removeCollaboratorFromShift(shiftId, userId) {
    try {
        await remove(ref(rtdb, `shifts/${shiftId}/collaborators/${userId}`));
        return { success: true };
    } catch (error) {
        console.error('Error removing collaborator:', error);
        throw error;
    }
}

// ==================== FINANCIAL MANAGEMENT ====================

/**
 * Get all transactions
 */
export async function getAllTransactions(limitCount = 50) {
    try {
        const transactionsQuery = query(
            collection(db, COLLECTIONS.TRANSACTIONS),
            orderBy('date', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(transactionsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
    }
}

/**
 * Subscribe to transactions (real-time)
 */
export function subscribeToTransactions(callback, limitCount = 50) {
    const transactionsQuery = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        orderBy('date', 'desc'),
        limit(limitCount)
    );
    return onSnapshot(transactionsQuery, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(transactions);
    });
}

/**
 * Create transaction (expense or income)
 */
export async function createTransaction(transactionData) {
    try {
        const transactionRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
            ...transactionData,
            date: transactionData.date || serverTimestamp(),
            createdAt: serverTimestamp()
        });
        return { success: true, id: transactionRef.id };
    } catch (error) {
        console.error('Error creating transaction:', error);
        throw error;
    }
}

/**
 * Update transaction
 */
export async function updateTransaction(transactionId, transactionData) {
    try {
        await updateDoc(doc(db, COLLECTIONS.TRANSACTIONS, transactionId), {
            ...transactionData,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
}

/**
 * Delete transaction
 */
export async function deleteTransaction(transactionId) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.TRANSACTIONS, transactionId));
        return true;
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
}

/**
 * Get financial summary
 */
export async function getFinancialSummary(startDate, endDate) {
    try {
        const transactionsQuery = query(
            collection(db, COLLECTIONS.TRANSACTIONS),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );

        const snapshot = await getDocs(transactionsQuery);
        let totalIncome = 0;
        let totalExpense = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.type === 'income') {
                totalIncome += data.amount || 0;
            } else {
                totalExpense += data.amount || 0;
            }
        });

        return {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense
        };
    } catch (error) {
        console.error('Error getting financial summary:', error);
        return { totalIncome: 0, totalExpense: 0, balance: 0 };
    }
}

// ==================== SETTINGS ====================

/**
 * Get settings
 */
export async function getSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'global'));
        if (settingsDoc.exists()) {
            return settingsDoc.data();
        }
        // Default settings
        return {
            hourlyRate: 15.00,
            mealAllowance: 25.00,
            stoneRate: 2.5,
            pagbankRate: 3.0
        };
    } catch (error) {
        console.error('Error getting settings:', error);
        return null;
    }
}

/**
 * Update settings
 */
export async function updateSettings(settingsData) {
    try {
        await setDoc(doc(db, COLLECTIONS.SETTINGS, 'global'), {
            ...settingsData,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
}

// ==================== REPORTS ====================

/**
 * Get shift history from Firestore
 */
export async function getShiftHistory(limitCount = 20) {
    try {
        const shiftsQuery = query(
            collection(db, COLLECTIONS.SHIFTS),
            orderBy('startTime', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(shiftsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting shift history:', error);
        return [];
    }
}

/**
 * Get weekly report data
 */
export async function getWeeklyReportData(startDate, endDate) {
    try {
        // Get all shifts in the period
        const shiftsQuery = query(
            collection(db, COLLECTIONS.SHIFTS),
            where('startTime', '>=', startDate.getTime()),
            where('startTime', '<=', endDate.getTime())
        );

        const snapshot = await getDocs(shiftsQuery);
        const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Group by user
        const userReports = {};

        shifts.forEach(shift => {
            if (!userReports[shift.userId]) {
                userReports[shift.userId] = {
                    userId: shift.userId,
                    userName: shift.userName,
                    totalHours: 0,
                    totalSales: 0,
                    shiftsCount: 0,
                    consumption: 0
                };
            }

            const report = userReports[shift.userId];
            report.shiftsCount++;
            report.totalSales += shift.totalSales || 0;

            // Calculate hours
            if (shift.startTime && shift.endTime) {
                const hours = (shift.endTime - shift.startTime) / (1000 * 60 * 60);
                report.totalHours += hours;
            }
        });

        return Object.values(userReports);
    } catch (error) {
        console.error('Error getting weekly report:', error);
        return [];
    }
}

// ==================== DASHBOARD STATS ====================

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's shifts from Realtime DB
        const shiftsSnapshot = await get(ref(rtdb, 'shifts'));
        let todaySales = 0;
        let todayOrders = 0;
        let activeShiftsCount = 0;
        let totalDivergence = 0;

        if (shiftsSnapshot.exists()) {
            shiftsSnapshot.forEach((childSnapshot) => {
                const shift = childSnapshot.val();
                const shiftDate = new Date(shift.startTime);
                shiftDate.setHours(0, 0, 0, 0);

                if (shiftDate.getTime() === today.getTime()) {
                    todaySales += shift.totalSales || 0;
                    todayOrders += shift.salesCount || 0;

                    if (shift.closingData?.divergence) {
                        totalDivergence += shift.closingData.divergence;
                    }
                }

                if (shift.status === 'open') {
                    activeShiftsCount++;
                }
            });
        }

        return {
            todaySales,
            todayOrders,
            activeShiftsCount,
            totalDivergence,
            ticketMedio: todayOrders > 0 ? todaySales / todayOrders : 0
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return {
            todaySales: 0,
            todayOrders: 0,
            activeShiftsCount: 0,
            totalDivergence: 0,
            ticketMedio: 0
        };
    }
}

/**
 * Subscribe to dashboard stats (real-time)
 */
export function subscribeToDashboardStats(callback) {
    const shiftsRef = ref(rtdb, 'shifts');

    return onValue(shiftsRef, (snapshot) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let todaySales = 0;
        let todayOrders = 0;
        let activeShiftsCount = 0;
        let totalDivergence = 0;

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const shift = childSnapshot.val();
                const shiftDate = new Date(shift.startTime);
                shiftDate.setHours(0, 0, 0, 0);

                if (shiftDate.getTime() === today.getTime()) {
                    todaySales += shift.totalSales || 0;
                    todayOrders += shift.salesCount || 0;

                    if (shift.closingData?.divergence) {
                        totalDivergence += shift.closingData.divergence;
                    }
                }

                if (shift.status === 'open') {
                    activeShiftsCount++;
                }
            });
        }

        callback({
            todaySales,
            todayOrders,
            activeShiftsCount,
            totalDivergence,
            ticketMedio: todayOrders > 0 ? todaySales / todayOrders : 0
        });
    });
}

// ==================== COLLABORATORS MANAGEMENT ====================

/**
 * Get all staff users (for adding collaborators)
 */
export async function getStaffUsers() {
    try {
        const usersQuery = query(
            collection(db, COLLECTIONS.USERS),
            where('role', 'in', ['staff', 'manager'])
        );
        const snapshot = await getDocs(usersQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting staff users:', error);
        return [];
    }
}

/**
 * Subscribe to shift collaborators (real-time)
 */
export function subscribeToShiftCollaborators(shiftId, callback) {
    const collaboratorsRef = ref(rtdb, `shifts/${shiftId}/collaborators`);

    return onValue(collaboratorsRef, (snapshot) => {
        const collaborators = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                collaborators.push({
                    id: child.key,
                    ...child.val()
                });
            });
        }
        callback(collaborators);
    });
}

/**
 * Add consumption to collaborator in shift
 */
export async function addCollaboratorConsumption(shiftId, collaboratorId, consumptionData) {
    try {
        const consumptionRef = push(ref(rtdb, `shifts/${shiftId}/collaborators/${collaboratorId}/consumptions`));
        const consumption = {
            id: consumptionRef.key,
            ...consumptionData,
            timestamp: Date.now()
        };

        await set(consumptionRef, consumption);

        // Update total consumption for collaborator
        const collabRef = ref(rtdb, `shifts/${shiftId}/collaborators/${collaboratorId}`);
        const collabSnapshot = await get(collabRef);

        if (collabSnapshot.exists()) {
            const currentTotal = collabSnapshot.val().totalConsumption || 0;
            await update(collabRef, {
                totalConsumption: currentTotal + (consumptionData.total || 0)
            });
        }

        return { success: true, consumptionId: consumptionRef.key };
    } catch (error) {
        console.error('Error adding consumption:', error);
        throw error;
    }
}

/**
 * Get collaborator consumptions
 */
export async function getCollaboratorConsumptions(shiftId, collaboratorId) {
    try {
        const consumptionsRef = ref(rtdb, `shifts/${shiftId}/collaborators/${collaboratorId}/consumptions`);
        const snapshot = await get(consumptionsRef);

        const consumptions = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                consumptions.push({
                    id: child.key,
                    ...child.val()
                });
            });
        }

        return consumptions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error getting consumptions:', error);
        return [];
    }
}

/**
 * Subscribe to collaborator consumptions (real-time)
 */
export function subscribeToCollaboratorConsumptions(shiftId, collaboratorId, callback) {
    const consumptionsRef = ref(rtdb, `shifts/${shiftId}/collaborators/${collaboratorId}/consumptions`);

    return onValue(consumptionsRef, (snapshot) => {
        const consumptions = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                consumptions.push({
                    id: child.key,
                    ...child.val()
                });
            });
        }
        callback(consumptions.sort((a, b) => b.timestamp - a.timestamp));
    });
}

/**
 * Get previous shift data (for opening comparison)
 */
export async function getPreviousShiftData(userId) {
    try {
        // Query the last closed shift from Firestore
        const shiftsQuery = query(
            collection(db, COLLECTIONS.SHIFTS),
            where('status', '==', 'closed'),
            orderBy('endTime', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(shiftsQuery);

        if (!snapshot.empty) {
            const lastShift = snapshot.docs[0].data();
            const expectedCash = (lastShift.closingData?.expectedCash || 0);
            const finalCash = (lastShift.closingData?.finalCash || 0);

            return {
                exists: true,
                expectedCash: finalCash, // The final cash becomes expected for next shift
                expectedCoins: lastShift.closingData?.coins || 0,
                lastClosedAt: lastShift.endTime,
                divergence: lastShift.closingData?.divergence || 0
            };
        }

        return { exists: false, expectedCash: 0, expectedCoins: 0 };
    } catch (error) {
        console.error('Error getting previous shift:', error);
        return { exists: false, expectedCash: 0, expectedCoins: 0 };
    }
}

/**
 * Remove collaborator consumption
 */
export async function removeCollaboratorConsumption(shiftId, collaboratorId, consumptionId, amount) {
    try {
        await remove(ref(rtdb, `shifts/${shiftId}/collaborators/${collaboratorId}/consumptions/${consumptionId}`));

        // Update total consumption
        const collabRef = ref(rtdb, `shifts/${shiftId}/collaborators/${collaboratorId}`);
        const collabSnapshot = await get(collabRef);

        if (collabSnapshot.exists()) {
            const currentTotal = collabSnapshot.val().totalConsumption || 0;
            await update(collabRef, {
                totalConsumption: Math.max(0, currentTotal - amount)
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error removing consumption:', error);
        throw error;
    }
}

// ==================== CLOUD FUNCTIONS CALLABLE ====================

/**
 * Gera relatorio diario
 */
export async function generateDailyReport(date = null) {
    try {
        const generateReport = httpsCallable(functions, 'generateDailyReport');
        const result = await generateReport({ date });
        return result.data;
    } catch (error) {
        console.error('Error generating daily report:', error);
        throw error;
    }
}

/**
 * Gera relatorio semanal
 */
export async function generateWeeklyReport() {
    try {
        const generateReport = httpsCallable(functions, 'generateWeeklyReport');
        const result = await generateReport({});
        return result.data;
    } catch (error) {
        console.error('Error generating weekly report:', error);
        throw error;
    }
}

/**
 * Sincroniza todos os produtos via Cloud Function
 */
export async function syncAllProductsViaFunction() {
    try {
        const syncProducts = httpsCallable(functions, 'syncAllProducts');
        const result = await syncProducts({});
        return result.data;
    } catch (error) {
        console.error('Error syncing products:', error);
        throw error;
    }
}

/**
 * Corrige divergencia de turno (apenas admin)
 */
export async function correctShiftDivergence(shiftId, correctedAmount, reason, adminNotes = '') {
    try {
        const correctDivergence = httpsCallable(functions, 'correctShiftDivergence');
        const result = await correctDivergence({
            shiftId,
            correctedAmount,
            reason,
            adminNotes
        });
        return result.data;
    } catch (error) {
        console.error('Error correcting divergence:', error);
        throw error;
    }
}

/**
 * Calcula comissao de funcionario
 */
export async function calculateEmployeeCommission(userId, startDate, endDate) {
    try {
        const calculateCommission = httpsCallable(functions, 'calculateEmployeeCommission');
        const result = await calculateCommission({
            userId,
            startDate,
            endDate
        });
        return result.data;
    } catch (error) {
        console.error('Error calculating commission:', error);
        throw error;
    }
}

/**
 * Busca notificacoes do usuario
 */
export function subscribeToNotifications(userId, callback) {
    const notificationsQuery = query(
        collection(db, 'notifications'),
        where('targetUserId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(notificationsQuery, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(notifications);
    });
}

/**
 * Marca notificacao como lida
 */
export async function markNotificationAsRead(notificationId) {
    try {
        await updateDoc(doc(db, 'notifications', notificationId), {
            read: true,
            readAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Busca backups (apenas admin)
 */
export async function getBackups(limitCount = 10) {
    try {
        const backupsQuery = query(
            collection(db, 'backups'),
            orderBy('date', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(backupsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting backups:', error);
        return [];
    }
}

/**
 * Busca correcoes de turno
 */
export async function getShiftCorrections(shiftId = null) {
    try {
        let correctionsQuery;
        if (shiftId) {
            correctionsQuery = query(
                collection(db, 'shift_corrections'),
                where('shiftId', '==', shiftId),
                orderBy('createdAt', 'desc')
            );
        } else {
            correctionsQuery = query(
                collection(db, 'shift_corrections'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
        }
        const snapshot = await getDocs(correctionsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting shift corrections:', error);
        return [];
    }
}

// ==================== UTILITY EXPORTS ====================

export { serverTimestamp, Timestamp, increment, functions, httpsCallable };

console.log('Firebase initialized successfully');
