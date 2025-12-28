/**
 * Financial Control Module
 * Handles financial data display and expense management
 */

// State
const FinancialControlState = {
    balance: 0,
    income: 0,
    expenses: 0,
    transactions: [],
    isLoading: false,
    unsubscribers: []
};

/**
 * Initialize Financial Control
 */
export function initFinancialControl() {
    console.log('Initializing financial control...');

    // Setup navigation
    setupNavigation();

    // Setup modals
    setupModals();

    // Setup forms
    setupForms();

    // Setup filters
    setupFilters();

    // Load financial data
    loadFinancialData();

    // Load transactions
    loadTransactions();
}

/**
 * Setup navigation
 */
function setupNavigation() {
    // Back button
    document.querySelector('[data-nav="admin-dashboard"]')?.addEventListener('click', () => {
        window.App?.navigateTo('admin-dashboard');
    });

    // Bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const nav = item.dataset.nav;
            if (nav) {
                window.App?.navigateTo(nav);
            }
        });
    });
}

/**
 * Setup modals
 */
function setupModals() {
    // Open expense modal
    document.querySelectorAll('[data-modal-open="expense-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            openModal('expense-modal');

            // Set today's date as default
            const dateInput = document.getElementById('expense-date');
            if (dateInput) {
                dateInput.valueAsDate = new Date();
            }
        });
    });

    // Close modal buttons
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modalClose;
            closeModal(modalId);
        });
    });

    // Close modal on overlay click
    document.getElementById('expense-modal-overlay')?.addEventListener('click', () => {
        closeModal('expense-modal');
    });
}

/**
 * Setup forms
 */
function setupForms() {
    const form = document.getElementById('expense-form');

    if (form) {
        form.addEventListener('submit', handleCreateExpense);
    }
}

/**
 * Setup filters
 */
function setupFilters() {
    const filterBtn = document.querySelector('.app-header-btn [class*="filter"]')?.parentElement;

    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            window.App?.showToast('Filtros em breve!', 'info');
        });
    }

    // View all button
    document.querySelector('.text-primary.font-medium')?.addEventListener('click', () => {
        window.App?.showToast('Visualizacao completa em breve!', 'info');
    });
}

/**
 * Load financial data
 */
async function loadFinancialData() {
    try {
        const { getFinancialSummary } = await import('../firebase-config.js');
        const summary = await getFinancialSummary();

        if (summary) {
            FinancialControlState.balance = summary.balance || 0;
            FinancialControlState.income = summary.income || 0;
            FinancialControlState.expenses = summary.expenses || 0;

            updateFinancialUI(summary);
        }
    } catch (error) {
        console.error('Error loading financial data:', error);
    }
}

/**
 * Update financial UI
 */
function updateFinancialUI(summary) {
    // Balance
    const balanceEl = document.querySelector('.text-3xl.font-bold');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(summary.balance || 0);
    }

    // Income
    const incomeEl = document.querySelector('.text-success + .text-lg');
    if (incomeEl) {
        incomeEl.textContent = formatCurrency(summary.income || 0);
    }

    // Expenses
    const expenseCards = document.querySelectorAll('.card.p-4');
    if (expenseCards[1]) {
        const expenseEl = expenseCards[1].querySelector('.text-lg.font-bold');
        if (expenseEl) {
            expenseEl.textContent = formatCurrency(summary.expenses || 0);
        }
    }
}

/**
 * Load transactions
 */
async function loadTransactions() {
    const container = document.querySelector('.transaction-item')?.parentElement;
    if (!container) return;

    try {
        const { subscribeToTransactions } = await import('../firebase-config.js');

        const unsubscribe = subscribeToTransactions((transactions) => {
            FinancialControlState.transactions = transactions;
            renderTransactions(transactions, container);
        });

        FinancialControlState.unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

/**
 * Render transactions list
 */
function renderTransactions(transactions, container) {
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="p-6 text-center">
                <span class="material-symbols-outlined text-4xl text-muted mb-2">receipt_long</span>
                <p class="text-muted text-sm">Nenhuma movimentacao encontrada</p>
            </div>
        `;
        return;
    }

    container.innerHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${transaction.type || 'expense'}">
                    <span class="material-symbols-outlined">${getTransactionIcon(transaction)}</span>
                </div>
                <div class="transaction-details">
                    <p class="transaction-title">${transaction.description || 'Transacao'}</p>
                    <p class="transaction-meta">${formatTransactionMeta(transaction)}</p>
                </div>
            </div>
            <div class="transaction-amount">
                <p class="transaction-value ${transaction.type || 'expense'}">
                    ${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount || 0)}
                </p>
                <p class="transaction-balance">Saldo: ${formatCurrency(transaction.balanceAfter || 0)}</p>
            </div>
        </div>
    `).join('');
}

/**
 * Get transaction icon
 */
function getTransactionIcon(transaction) {
    if (transaction.type === 'income') {
        return transaction.category === 'sales' ? 'attach_money' : 'credit_card';
    }

    switch (transaction.category) {
        case 'insumos':
            return 'shopping_cart';
        case 'manutencao':
            return 'build';
        case 'salarios':
            return 'payments';
        case 'impostos':
            return 'receipt';
        case 'fixas':
            return 'bolt';
        default:
            return 'money_off';
    }
}

/**
 * Format transaction meta
 */
function formatTransactionMeta(transaction) {
    const date = transaction.date ? formatDate(transaction.date) : 'Hoje';
    const category = transaction.category ? ` • ${getCategoryLabel(transaction.category)}` : '';

    return `${date}${category}`;
}

/**
 * Format date
 */
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
        return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
}

/**
 * Get category label
 */
function getCategoryLabel(category) {
    switch (category) {
        case 'insumos':
            return 'Insumos';
        case 'manutencao':
            return 'Manutencao';
        case 'salarios':
            return 'Salarios';
        case 'impostos':
            return 'Impostos';
        case 'fixas':
            return 'Fixas';
        case 'sales':
            return 'Vendas';
        default:
            return 'Outros';
    }
}

/**
 * Handle create expense
 */
async function handleCreateExpense(e) {
    e.preventDefault();

    if (FinancialControlState.isLoading) return;

    const descriptionInput = document.getElementById('expense-description');
    const amountInput = document.getElementById('expense-amount');
    const categorySelect = document.getElementById('expense-category');
    const dateInput = document.getElementById('expense-date');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const expenseData = {
        description: descriptionInput?.value?.trim(),
        amount: parseFloat(amountInput?.value) || 0,
        category: categorySelect?.value,
        date: dateInput?.value ? new Date(dateInput.value).getTime() : Date.now(),
        type: 'expense',
        createdAt: Date.now()
    };

    // Validation
    if (!expenseData.description || expenseData.amount <= 0 || !expenseData.category) {
        window.App?.showToast('Preencha todos os campos obrigatorios', 'warning');
        return;
    }

    FinancialControlState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { createTransaction } = await import('../firebase-config.js');

        await createTransaction(expenseData);

        window.App?.showToast('Gasto registrado com sucesso!', 'success');

        // Close modal and reset form
        closeModal('expense-modal');
        e.target.reset();

        // Reload financial data
        loadFinancialData();
    } catch (error) {
        console.error('Error creating expense:', error);
        window.App?.showToast('Erro ao registrar gasto', 'danger');
    } finally {
        FinancialControlState.isLoading = false;
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Open modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(modalId + '-overlay');

    if (modal && overlay) {
        modal.style.display = 'block';
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            modal.style.transform = 'translateY(0)';
        }, 10);
    }
}

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(modalId + '-overlay');

    if (modal && overlay) {
        modal.style.transform = 'translateY(100%)';
        overlay.classList.remove('active');
        document.body.style.overflow = '';

        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

/**
 * Format currency
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

/**
 * Set button loading state
 */
function setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<span class="spinner"></span>';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
}

/**
 * Cleanup
 */
export function cleanupFinancialControl() {
    FinancialControlState.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') {
            unsub();
        }
    });
    FinancialControlState.unsubscribers = [];
}

// Export for global access
window.FinancialControl = {
    init: initFinancialControl,
    cleanup: cleanupFinancialControl
};
