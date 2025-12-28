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
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
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
        const updates = {
            [`shifts/${shiftId}/status`]: 'closed',
            [`shifts/${shiftId}/endTime`]: Date.now(),
            [`shifts/${shiftId}/closingData`]: {
                finalCash: parseFloat(closingData.finalCash) || 0,
                notes: closingData.notes || '',
                closedAt: Date.now()
            }
        };

        // Calculate divergence
        const shiftSnapshot = await get(ref(rtdb, `shifts/${shiftId}`));
        if (shiftSnapshot.exists()) {
            const shift = shiftSnapshot.val();
            const expectedCash = shift.initialCash + shift.totalSales - shift.totalWithdrawals;
            const divergence = parseFloat(closingData.finalCash) - expectedCash;
            updates[`shifts/${shiftId}/closingData/expectedCash`] = expectedCash;
            updates[`shifts/${shiftId}/closingData/divergence`] = divergence;
        }

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

    return onValue(activeShiftRef, async (snapshot) => {
        if (snapshot.exists()) {
            const { shiftId } = snapshot.val();
            // Now subscribe to the actual shift
            onValue(ref(rtdb, `shifts/${shiftId}`), (shiftSnapshot) => {
                if (shiftSnapshot.exists()) {
                    callback({ id: shiftId, ...shiftSnapshot.val() });
                } else {
                    callback(null);
                }
            });
        } else {
            callback(null);
        }
    });
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

        // Update totals
        const amount = parseFloat(saleData.total) || 0;
        await update(ref(rtdb, `shifts/${shiftId}`), {
            totalSales: increment(amount),
            salesCount: increment(1),
            currentCash: saleData.paymentMethod === 'cash' ? increment(amount) : increment(0)
        });

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

        // Update totals
        await update(ref(rtdb, `shifts/${shiftId}`), {
            totalWithdrawals: increment(parseFloat(amount) || 0),
            currentCash: increment(-(parseFloat(amount) || 0))
        });

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

// ==================== UTILITY EXPORTS ====================

export { serverTimestamp, Timestamp, increment };

console.log('Firebase initialized successfully');
