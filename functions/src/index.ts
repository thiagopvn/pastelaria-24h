import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

interface PaymentInput {
  cash: number;
  pix: number;
  stone_cumulative: number;
  pagbank_cumulative: number;
}

interface CloseShiftData {
  shiftId: string;
  finalCashCount: number;
  payments: PaymentInput;
  divergenceReason?: string;
}

/**
 * CRITICAL FUNCTION: Shift Closing
 * 1. Fetches withdrawals from subcollection
 * 2. Calculates real card machine values (cumulative - previous)
 * 3. Calculates cash divergence
 * 4. Validates divergence justification
 */
export const closeShift = functions.https.onCall(async (data: CloseShiftData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { shiftId, finalCashCount, payments, divergenceReason } = data;
  const shiftRef = db.collection("shifts").doc(shiftId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const shiftDoc = await transaction.get(shiftRef);
      if (!shiftDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Shift not found.");
      }

      const shiftData = shiftDoc.data();
      if (shiftData?.status !== "open") {
        throw new functions.https.HttpsError("failed-precondition", "Shift is already closed.");
      }

      // 1. Fetch withdrawals from subcollection
      const withdrawalsSnap = await db.collection("shifts").doc(shiftId).collection("withdrawals").get();
      let totalWithdrawals = 0;
      const withdrawalsList: Array<{ amount: number; reason: string }> = [];

      withdrawalsSnap.forEach(doc => {
        const w = doc.data();
        totalWithdrawals += w.amount || 0;
        withdrawalsList.push({ amount: w.amount, reason: w.reason });
      });

      // 2. Card Machine Logic (Cumulative -> Real)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const lastShiftQuery = await db.collection("shifts")
        .where("status", "==", "closed")
        .where("endTime", ">=", Timestamp.fromDate(todayStart))
        .orderBy("endTime", "desc")
        .limit(1)
        .get();

      let previousStone = 0;
      let previousPagBank = 0;

      if (!lastShiftQuery.empty) {
        const lastShift = lastShiftQuery.docs[0].data();
        // Only subtract if current is >= previous (no midnight reset)
        if (payments.stone_cumulative >= (lastShift.payments?.stone_cumulative || 0)) {
          previousStone = lastShift.payments?.stone_cumulative || 0;
        }
        if (payments.pagbank_cumulative >= (lastShift.payments?.pagbank_cumulative || 0)) {
          previousPagBank = lastShift.payments?.pagbank_cumulative || 0;
        }
      }

      const stoneReal = Number((payments.stone_cumulative - previousStone).toFixed(2));
      const pagBankReal = Number((payments.pagbank_cumulative - previousPagBank).toFixed(2));

      // 3. Financial Calculations
      const totalDigitalSales = payments.pix + stoneReal + pagBankReal;
      const salesCash = shiftData?.salesCash || 0;
      const initialCash = shiftData?.initialCash || 0;

      // Expected Cash = Initial + Sales - Withdrawals
      const systemExpectedCash = Number((initialCash + salesCash - totalWithdrawals).toFixed(2));

      // Divergence = Counted - Expected
      const divergence = Number((finalCashCount - systemExpectedCash).toFixed(2));

      // 4. Validate Divergence Justification
      if (Math.abs(divergence) > 1.00 && (!divergenceReason || divergenceReason.trim() === '')) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Divergencia maior que R$ 1.00 requer justificativa."
        );
      }

      // 5. Update Shift Document
      transaction.update(shiftRef, {
        status: 'closed',
        endTime: admin.firestore.FieldValue.serverTimestamp(),
        closingData: {
          finalCashCount,
          totalWithdrawals,
          withdrawalsCount: withdrawalsList.length,
          divergence,
          divergenceReason: divergenceReason || null,
          systemExpectedCash
        },
        payments: {
          cash: salesCash,
          pix: payments.pix,
          stone_real: stoneReal,
          stone_cumulative: payments.stone_cumulative,
          pagbank_real: pagBankReal,
          pagbank_cumulative: payments.pagbank_cumulative,
        },
        financialSummary: {
          totalRevenue: totalDigitalSales + salesCash,
          totalCash: salesCash,
          totalDigital: totalDigitalSales,
          totalWithdrawals
        }
      });

      return {
        success: true,
        divergence,
        realValues: { stone: stoneReal, pagbank: pagBankReal },
        totalWithdrawals,
        expectedCash: systemExpectedCash
      };
    });

    return result;
  } catch (error) {
    console.error("Error closing shift:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Unable to close shift: " + (error as Error).message);
  }
});

/**
 * Create User (Auth + Firestore Profile)
 * Admin Only
 */
export const createUser = functions.https.onCall(async (data, context) => {
  const requesterId = context.auth?.uid;
  if (!requesterId) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const requesterSnap = await db.collection('users').doc(requesterId).get();
  if (requesterSnap.data()?.role !== 'admin') {
    throw new functions.https.HttpsError("permission-denied", "Only admins can create users.");
  }

  const { email, password, name, role, transport } = data;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role: role || 'employee',
      transport: transport || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    throw new functions.https.HttpsError("internal", (error as Error).message);
  }
});

/**
 * Update Closed Shift (Admin Correction)
 * Recalculates divergences and card values
 */
export const updateShift = functions.https.onCall(async (data, context) => {
  const requesterId = context.auth?.uid;
  if (!requesterId) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const requesterSnap = await db.collection('users').doc(requesterId).get();
  if (requesterSnap.data()?.role !== 'admin') {
    throw new functions.https.HttpsError("permission-denied", "Only admins can update shifts.");
  }

  const { shiftId, finalCashCount, payments, divergenceReason } = data;
  const shiftRef = db.collection("shifts").doc(shiftId);

  try {
    await db.runTransaction(async (transaction) => {
      const shiftDoc = await transaction.get(shiftRef);
      if (!shiftDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Shift not found.");
      }

      const shiftData = shiftDoc.data();
      if (shiftData?.status !== 'closed') {
        throw new functions.https.HttpsError("failed-precondition", "Shift is not closed.");
      }

      // Fetch withdrawals from subcollection
      const withdrawalsSnap = await db.collection("shifts").doc(shiftId).collection("withdrawals").get();
      let totalWithdrawals = 0;
      withdrawalsSnap.forEach(doc => {
        totalWithdrawals += doc.data().amount || 0;
      });

      // Recalculate real card values using stored previous estimates
      const oldStoneReal = shiftData?.payments?.stone_real || 0;
      const oldStoneCum = shiftData?.payments?.stone_cumulative || 0;
      const prevStoneEstim = oldStoneCum - oldStoneReal;

      const oldPagReal = shiftData?.payments?.pagbank_real || 0;
      const oldPagCum = shiftData?.payments?.pagbank_cumulative || 0;
      const prevPagEstim = oldPagCum - oldPagReal;

      const newStoneReal = Number((payments.stone_cumulative - prevStoneEstim).toFixed(2));
      const newPagReal = Number((payments.pagbank_cumulative - prevPagEstim).toFixed(2));

      const totalDigitalSales = payments.pix + newStoneReal + newPagReal;
      const salesCash = shiftData?.payments?.cash || 0;
      const initialCash = shiftData?.initialCash || 0;

      const systemExpectedCash = Number((initialCash + salesCash - totalWithdrawals).toFixed(2));
      const divergence = Number((finalCashCount - systemExpectedCash).toFixed(2));

      transaction.update(shiftRef, {
        'closingData.finalCashCount': finalCashCount,
        'closingData.totalWithdrawals': totalWithdrawals,
        'closingData.divergence': divergence,
        'closingData.divergenceReason': divergenceReason || null,
        'closingData.systemExpectedCash': systemExpectedCash,

        'payments.pix': payments.pix,
        'payments.stone_cumulative': payments.stone_cumulative,
        'payments.stone_real': newStoneReal,
        'payments.pagbank_cumulative': payments.pagbank_cumulative,
        'payments.pagbank_real': newPagReal,

        'financialSummary.totalRevenue': totalDigitalSales + salesCash,
        'financialSummary.totalDigital': totalDigitalSales,
        'financialSummary.totalWithdrawals': totalWithdrawals
      });
    });

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", (error as Error).message);
  }
});

/**
 * TRIGGER: Aggregates cash sales into the main shift document
 * Listens to: shifts/{shiftId}/records/{recordId}
 */
export const onShiftRecordCreated = functions.firestore
  .document('shifts/{shiftId}/records/{recordId}')
  .onCreate(async (snap, context) => {
    const record = snap.data();
    const shiftRef = db.collection('shifts').doc(context.params.shiftId);

    // If cash sale, increment salesCash
    if (record.type === 'sale' && record.paymentMethod === 'cash') {
      await shiftRef.update({
        salesCash: admin.firestore.FieldValue.increment(record.total)
      });
    }
  });

/**
 * TRIGGER: Decrements cash sales when deleted
 * Listens to: shifts/{shiftId}/records/{recordId}
 */
export const onShiftRecordDeleted = functions.firestore
  .document('shifts/{shiftId}/records/{recordId}')
  .onDelete(async (snap, context) => {
    const record = snap.data();
    const shiftRef = db.collection('shifts').doc(context.params.shiftId);

    // If cash sale deleted, decrement salesCash
    if (record.type === 'sale' && record.paymentMethod === 'cash') {
      await shiftRef.update({
        salesCash: admin.firestore.FieldValue.increment(-record.total)
      });
    }
  });

/**
 * TRIGGER: Updates totalWithdrawals when a withdrawal is deleted
 * Listens to: shifts/{shiftId}/withdrawals/{withdrawalId}
 */
export const onWithdrawalDeleted = functions.firestore
  .document('shifts/{shiftId}/withdrawals/{withdrawalId}')
  .onDelete(async (snap, context) => {
    const withdrawal = snap.data();
    const shiftRef = db.collection('shifts').doc(context.params.shiftId);

    await shiftRef.update({
      totalWithdrawals: admin.firestore.FieldValue.increment(-(withdrawal.amount || 0))
    });
  });
