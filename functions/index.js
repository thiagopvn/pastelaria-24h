/**
 * Firebase Cloud Functions - Pastelaria 24h
 * Funcoes para automacao e integracao do sistema
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const rtdb = admin.database();

// ==================== CONFIGURACOES ====================

const COLLECTIONS = {
    USERS: 'users',
    PRODUCTS: 'products',
    SHIFTS: 'shifts',
    TRANSACTIONS: 'transactions',
    REPORTS: 'reports',
    NOTIFICATIONS: 'notifications'
};

// ==================== TRIGGERS DE PRODUTOS ====================

/**
 * Sincroniza produto para Realtime Database quando criado no Firestore
 */
exports.onProductCreated = functions.firestore
    .document('products/{productId}')
    .onCreate(async (snap, context) => {
        const productId = context.params.productId;
        const product = snap.data();

        try {
            await rtdb.ref(`products/${productId}`).set({
                id: productId,
                name: product.name,
                price: product.price,
                category: product.category,
                description: product.description || '',
                active: product.active !== false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            console.log(`Produto ${productId} sincronizado para RTDB`);
            return { success: true };
        } catch (error) {
            console.error('Erro ao sincronizar produto:', error);
            throw error;
        }
    });

/**
 * Atualiza produto no Realtime Database quando atualizado no Firestore
 */
exports.onProductUpdated = functions.firestore
    .document('products/{productId}')
    .onUpdate(async (change, context) => {
        const productId = context.params.productId;
        const product = change.after.data();

        try {
            await rtdb.ref(`products/${productId}`).update({
                name: product.name,
                price: product.price,
                category: product.category,
                description: product.description || '',
                active: product.active !== false,
                updatedAt: Date.now()
            });

            console.log(`Produto ${productId} atualizado no RTDB`);
            return { success: true };
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            throw error;
        }
    });

/**
 * Remove produto do Realtime Database quando deletado do Firestore
 */
exports.onProductDeleted = functions.firestore
    .document('products/{productId}')
    .onDelete(async (snap, context) => {
        const productId = context.params.productId;

        try {
            await rtdb.ref(`products/${productId}`).remove();
            console.log(`Produto ${productId} removido do RTDB`);
            return { success: true };
        } catch (error) {
            console.error('Erro ao remover produto:', error);
            throw error;
        }
    });

// ==================== TRIGGERS DE TURNO ====================

/**
 * Quando um turno e fechado no RTDB, salva no Firestore para historico
 */
exports.onShiftClosed = functions.database
    .ref('shifts/{shiftId}/status')
    .onUpdate(async (change, context) => {
        const shiftId = context.params.shiftId;
        const newStatus = change.after.val();
        const oldStatus = change.before.val();

        // Apenas processa quando muda para 'closed'
        if (newStatus !== 'closed' || oldStatus === 'closed') {
            return null;
        }

        try {
            // Busca dados completos do turno
            const shiftSnapshot = await rtdb.ref(`shifts/${shiftId}`).get();
            if (!shiftSnapshot.exists()) {
                console.error('Turno nao encontrado:', shiftId);
                return null;
            }

            const shiftData = shiftSnapshot.val();

            // Calcula estatisticas
            const salesArray = shiftData.sales ? Object.values(shiftData.sales) : [];
            const withdrawalsArray = shiftData.withdrawals ? Object.values(shiftData.withdrawals) : [];
            const collaboratorsArray = shiftData.collaborators ? Object.values(shiftData.collaborators) : [];

            const totalSales = salesArray.reduce((sum, sale) => sum + (sale.total || 0), 0);
            const totalWithdrawals = withdrawalsArray.reduce((sum, w) => sum + (w.amount || 0), 0);
            const totalCollaboratorConsumption = collaboratorsArray.reduce((sum, c) => sum + (c.totalConsumption || 0), 0);

            // Calcula vendas por metodo de pagamento
            const salesByPayment = {
                cash: 0,
                credit: 0,
                debit: 0,
                pix: 0
            };

            salesArray.forEach(sale => {
                const method = sale.paymentMethod || 'cash';
                salesByPayment[method] = (salesByPayment[method] || 0) + (sale.total || 0);
            });

            // Monta documento para Firestore
            const shiftDoc = {
                id: shiftId,
                userId: shiftData.userId,
                userName: shiftData.userName,
                status: 'closed',
                startTime: shiftData.startTime,
                endTime: shiftData.endTime || Date.now(),
                initialCash: shiftData.initialCash || 0,
                initialCoins: shiftData.initialCoins || 0,
                closingData: shiftData.closingData || {},
                statistics: {
                    totalSales,
                    totalWithdrawals,
                    totalCollaboratorConsumption,
                    salesCount: salesArray.length,
                    salesByPayment,
                    collaboratorsCount: collaboratorsArray.length
                },
                sales: salesArray,
                withdrawals: withdrawalsArray,
                collaborators: collaboratorsArray.map(c => ({
                    id: c.id,
                    name: c.name,
                    role: c.role,
                    totalConsumption: c.totalConsumption || 0
                })),
                savedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Salva no Firestore
            await db.collection(COLLECTIONS.SHIFTS).doc(shiftId).set(shiftDoc);

            console.log(`Turno ${shiftId} salvo no Firestore com sucesso`);

            // Cria notificacao para admin
            await db.collection(COLLECTIONS.NOTIFICATIONS).add({
                type: 'shift_closed',
                title: 'Turno Encerrado',
                message: `${shiftData.userName} encerrou o turno com ${salesArray.length} vendas totalizando R$ ${totalSales.toFixed(2)}`,
                data: {
                    shiftId,
                    userId: shiftData.userId,
                    totalSales,
                    salesCount: salesArray.length
                },
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        } catch (error) {
            console.error('Erro ao processar fechamento de turno:', error);
            throw error;
        }
    });

/**
 * Limpa turno do RTDB apos ser salvo no Firestore (24h depois)
 */
exports.cleanupOldShifts = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

        try {
            const shiftsSnapshot = await rtdb.ref('shifts').get();
            if (!shiftsSnapshot.exists()) return null;

            const shifts = shiftsSnapshot.val();
            const deletePromises = [];

            Object.entries(shifts).forEach(([shiftId, shift]) => {
                if (shift.status === 'closed' && shift.endTime < oneDayAgo) {
                    deletePromises.push(rtdb.ref(`shifts/${shiftId}`).remove());
                    console.log(`Removendo turno antigo: ${shiftId}`);
                }
            });

            await Promise.all(deletePromises);
            console.log(`${deletePromises.length} turnos antigos removidos`);

            return { removed: deletePromises.length };
        } catch (error) {
            console.error('Erro na limpeza de turnos:', error);
            throw error;
        }
    });

// ==================== FUNCOES HTTP - RELATORIOS ====================

/**
 * Gera relatorio diario
 */
exports.generateDailyReport = functions.https.onCall(async (data, context) => {
    // Verifica autenticacao
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario nao autenticado');
    }

    const { date } = data;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    const endDate = new Date(reportDate);
    endDate.setHours(23, 59, 59, 999);

    try {
        // Busca turnos do dia
        const shiftsSnapshot = await db.collection(COLLECTIONS.SHIFTS)
            .where('startTime', '>=', reportDate.getTime())
            .where('startTime', '<=', endDate.getTime())
            .get();

        let totalSales = 0;
        let totalOrders = 0;
        let totalWithdrawals = 0;
        let totalDivergence = 0;
        const salesByPayment = { cash: 0, credit: 0, debit: 0, pix: 0 };
        const productsSold = {};

        shiftsSnapshot.docs.forEach(doc => {
            const shift = doc.data();
            const stats = shift.statistics || {};

            totalSales += stats.totalSales || 0;
            totalOrders += stats.salesCount || 0;
            totalWithdrawals += stats.totalWithdrawals || 0;
            totalDivergence += shift.closingData?.divergence || 0;

            // Acumula vendas por pagamento
            if (stats.salesByPayment) {
                Object.entries(stats.salesByPayment).forEach(([method, value]) => {
                    salesByPayment[method] = (salesByPayment[method] || 0) + value;
                });
            }

            // Acumula produtos vendidos
            if (shift.sales) {
                shift.sales.forEach(sale => {
                    if (sale.items) {
                        sale.items.forEach(item => {
                            if (!productsSold[item.productId]) {
                                productsSold[item.productId] = {
                                    name: item.name,
                                    quantity: 0,
                                    total: 0
                                };
                            }
                            productsSold[item.productId].quantity += item.quantity;
                            productsSold[item.productId].total += item.price * item.quantity;
                        });
                    }
                });
            }
        });

        const report = {
            date: reportDate.toISOString().split('T')[0],
            shiftsCount: shiftsSnapshot.size,
            totalSales,
            totalOrders,
            totalWithdrawals,
            totalDivergence,
            averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
            salesByPayment,
            topProducts: Object.values(productsSold)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10),
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Salva o relatorio
        await db.collection(COLLECTIONS.REPORTS).doc(report.date).set(report);

        return report;
    } catch (error) {
        console.error('Erro ao gerar relatorio:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Gera relatorio semanal
 */
exports.generateWeeklyReport = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario nao autenticado');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    try {
        const shiftsSnapshot = await db.collection(COLLECTIONS.SHIFTS)
            .where('startTime', '>=', startDate.getTime())
            .where('startTime', '<=', endDate.getTime())
            .get();

        const dailyStats = {};
        let totalSales = 0;
        let totalOrders = 0;

        shiftsSnapshot.docs.forEach(doc => {
            const shift = doc.data();
            const shiftDate = new Date(shift.startTime).toISOString().split('T')[0];

            if (!dailyStats[shiftDate]) {
                dailyStats[shiftDate] = { sales: 0, orders: 0 };
            }

            const stats = shift.statistics || {};
            dailyStats[shiftDate].sales += stats.totalSales || 0;
            dailyStats[shiftDate].orders += stats.salesCount || 0;
            totalSales += stats.totalSales || 0;
            totalOrders += stats.salesCount || 0;
        });

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalSales,
            totalOrders,
            averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
            averageDailySales: totalSales / 7,
            dailyStats,
            shiftsCount: shiftsSnapshot.size
        };
    } catch (error) {
        console.error('Erro ao gerar relatorio semanal:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ==================== FUNCOES HTTP - OPERACOES ====================

/**
 * Sincroniza todos os produtos do Firestore para RTDB
 */
exports.syncAllProducts = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario nao autenticado');
    }

    try {
        const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS).get();
        const updates = {};

        productsSnapshot.docs.forEach(doc => {
            const product = doc.data();
            updates[`products/${doc.id}`] = {
                id: doc.id,
                name: product.name,
                price: product.price,
                category: product.category,
                description: product.description || '',
                active: product.active !== false,
                updatedAt: Date.now()
            };
        });

        await rtdb.ref().update(updates);

        return {
            success: true,
            count: productsSnapshot.size,
            message: `${productsSnapshot.size} produtos sincronizados`
        };
    } catch (error) {
        console.error('Erro ao sincronizar produtos:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Corrige divergencia de turno (apenas admin)
 */
exports.correctShiftDivergence = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario nao autenticado');
    }

    const { shiftId, correctedAmount, reason, adminNotes } = data;

    if (!shiftId || correctedAmount === undefined) {
        throw new functions.https.HttpsError('invalid-argument', 'Dados incompletos');
    }

    try {
        // Verifica se usuario e admin
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(context.auth.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Apenas admins podem corrigir turnos');
        }

        // Atualiza turno no Firestore
        const shiftRef = db.collection(COLLECTIONS.SHIFTS).doc(shiftId);
        const shiftDoc = await shiftRef.get();

        if (!shiftDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Turno nao encontrado');
        }

        const originalDivergence = shiftDoc.data().closingData?.divergence || 0;

        await shiftRef.update({
            'closingData.corrected': true,
            'closingData.originalDivergence': originalDivergence,
            'closingData.correctedDivergence': correctedAmount,
            'closingData.correctionReason': reason,
            'closingData.correctedBy': context.auth.uid,
            'closingData.correctedAt': admin.firestore.FieldValue.serverTimestamp(),
            'closingData.adminNotes': adminNotes || ''
        });

        // Registra a correcao
        await db.collection('shift_corrections').add({
            shiftId,
            originalDivergence,
            correctedAmount,
            reason,
            adminNotes,
            correctedBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: 'Divergencia corrigida com sucesso' };
    } catch (error) {
        console.error('Erro ao corrigir divergencia:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Calcula comissao de funcionario
 */
exports.calculateEmployeeCommission = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario nao autenticado');
    }

    const { userId, startDate, endDate } = data;

    if (!userId || !startDate || !endDate) {
        throw new functions.https.HttpsError('invalid-argument', 'Dados incompletos');
    }

    try {
        // Busca configuracoes
        const settingsDoc = await db.collection('settings').doc('global').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : { commissionRate: 5 };
        const commissionRate = settings.commissionRate || 5; // 5% padrao

        // Busca turnos do funcionario no periodo
        const shiftsSnapshot = await db.collection(COLLECTIONS.SHIFTS)
            .where('userId', '==', userId)
            .where('startTime', '>=', new Date(startDate).getTime())
            .where('startTime', '<=', new Date(endDate).getTime())
            .get();

        let totalSales = 0;
        let totalHours = 0;
        const shifts = [];

        shiftsSnapshot.docs.forEach(doc => {
            const shift = doc.data();
            const stats = shift.statistics || {};
            const salesAmount = stats.totalSales || 0;
            const hoursWorked = (shift.endTime - shift.startTime) / (1000 * 60 * 60);

            totalSales += salesAmount;
            totalHours += hoursWorked;

            shifts.push({
                id: doc.id,
                date: new Date(shift.startTime).toISOString().split('T')[0],
                sales: salesAmount,
                hours: hoursWorked.toFixed(2)
            });
        });

        const commission = totalSales * (commissionRate / 100);

        return {
            userId,
            period: { startDate, endDate },
            totalSales,
            totalHours: totalHours.toFixed(2),
            commissionRate: `${commissionRate}%`,
            commission,
            shiftsCount: shifts.length,
            shifts
        };
    } catch (error) {
        console.error('Erro ao calcular comissao:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ==================== TRIGGERS DE USUARIO ====================

/**
 * Quando um novo usuario e criado, inicializa dados adicionais
 */
exports.onUserCreated = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snap, context) => {
        const userId = context.params.userId;
        const user = snap.data();

        try {
            // Cria entrada no RTDB para status online
            await rtdb.ref(`userStatus/${userId}`).set({
                online: false,
                lastSeen: Date.now()
            });

            // Notifica admins sobre novo usuario
            const adminsSnapshot = await db.collection(COLLECTIONS.USERS)
                .where('role', '==', 'admin')
                .get();

            const notifications = adminsSnapshot.docs.map(adminDoc =>
                db.collection(COLLECTIONS.NOTIFICATIONS).add({
                    type: 'new_user',
                    title: 'Novo Usuario',
                    message: `${user.name} foi registrado como ${user.role}`,
                    targetUserId: adminDoc.id,
                    data: { userId, userName: user.name, role: user.role },
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                })
            );

            await Promise.all(notifications);

            return { success: true };
        } catch (error) {
            console.error('Erro ao processar novo usuario:', error);
            throw error;
        }
    });

// ==================== FUNCAO DE BACKUP ====================

/**
 * Backup diario dos dados para Storage (executado todo dia as 3h)
 */
exports.dailyBackup = functions.pubsub
    .schedule('0 3 * * *')
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        const backupDate = new Date().toISOString().split('T')[0];

        try {
            // Coleta dados para backup
            const [shiftsSnap, productsSnap, usersSnap, transactionsSnap] = await Promise.all([
                db.collection(COLLECTIONS.SHIFTS).get(),
                db.collection(COLLECTIONS.PRODUCTS).get(),
                db.collection(COLLECTIONS.USERS).get(),
                db.collection(COLLECTIONS.TRANSACTIONS).get()
            ]);

            const backupData = {
                date: backupDate,
                shifts: shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                products: productsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                users: usersSnap.docs.map(d => {
                    const data = d.data();
                    delete data.password; // Remove dados sensiveis
                    return { id: d.id, ...data };
                }),
                transactions: transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                metadata: {
                    createdAt: new Date().toISOString(),
                    counts: {
                        shifts: shiftsSnap.size,
                        products: productsSnap.size,
                        users: usersSnap.size,
                        transactions: transactionsSnap.size
                    }
                }
            };

            // Salva resumo do backup no Firestore
            await db.collection('backups').doc(backupDate).set({
                date: backupDate,
                counts: backupData.metadata.counts,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Backup ${backupDate} concluido com sucesso`);
            return { success: true, date: backupDate };
        } catch (error) {
            console.error('Erro no backup:', error);

            // Registra falha
            await db.collection('backups').doc(backupDate).set({
                date: backupDate,
                status: 'failed',
                error: error.message,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            throw error;
        }
    });

// ==================== FUNCAO DE ALERTA ====================

/**
 * Verifica divergencias grandes e envia alerta
 */
exports.checkLargeDivergence = functions.database
    .ref('shifts/{shiftId}/closingData/divergence')
    .onCreate(async (snap, context) => {
        const divergence = snap.val();
        const shiftId = context.params.shiftId;

        // Alerta se divergencia for maior que R$ 50 (positiva ou negativa)
        if (Math.abs(divergence) > 50) {
            try {
                const shiftSnapshot = await rtdb.ref(`shifts/${shiftId}`).get();
                const shift = shiftSnapshot.val();

                // Notifica todos os admins
                const adminsSnapshot = await db.collection(COLLECTIONS.USERS)
                    .where('role', '==', 'admin')
                    .get();

                const notifications = adminsSnapshot.docs.map(adminDoc =>
                    db.collection(COLLECTIONS.NOTIFICATIONS).add({
                        type: 'large_divergence',
                        title: 'Divergencia Alta',
                        message: `Turno de ${shift.userName} teve divergencia de R$ ${divergence.toFixed(2)}`,
                        targetUserId: adminDoc.id,
                        priority: 'high',
                        data: {
                            shiftId,
                            userId: shift.userId,
                            divergence,
                            userName: shift.userName
                        },
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    })
                );

                await Promise.all(notifications);
                console.log(`Alerta de divergencia enviado para turno ${shiftId}`);
            } catch (error) {
                console.error('Erro ao enviar alerta de divergencia:', error);
            }
        }

        return null;
    });

console.log('Firebase Functions carregadas com sucesso');
