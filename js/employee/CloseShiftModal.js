/**
 * Close Shift Modal Module
 * Handles shift closing functionality
 */

// Modal State
const CloseShiftModalState = {
    activeShift: null,
    isLoading: false
};

/**
 * Initialize Close Shift Modal
 */
export function initCloseShiftModal() {
    console.log('Initializing close shift modal...');

    // Load active shift data
    loadActiveShiftData();

    // Setup form listeners
    setupFormListeners();

    // Setup input listeners
    setupInputListeners();
}

/**
 * Load active shift data
 */
async function loadActiveShiftData() {
    const user = window.App?.state?.currentUser;
    if (!user) return;

    try {
        const { getUserActiveShift } = await import('../firebase-config.js');
        const activeShift = await getUserActiveShift(user.id);

        if (activeShift) {
            CloseShiftModalState.activeShift = activeShift;
            updateShiftSummaryUI(activeShift);
        }
    } catch (error) {
        console.error('Error loading active shift:', error);
    }
}

/**
 * Update shift summary UI
 */
function updateShiftSummaryUI(shift) {
    // Update summary values in modal
    const summaryElements = {
        initialCash: document.querySelector('[data-summary-initial-cash]'),
        totalSales: document.querySelector('[data-summary-total-sales]'),
        expectedCash: document.querySelector('[data-summary-expected-cash]')
    };

    if (summaryElements.initialCash) {
        summaryElements.initialCash.textContent = formatCurrency(shift.initialCash || 0);
    }

    if (summaryElements.totalSales) {
        summaryElements.totalSales.textContent = formatCurrency(shift.totalSales || 0);
    }

    if (summaryElements.expectedCash) {
        const expectedCash = (shift.initialCash || 0) + (shift.cashSales || 0);
        summaryElements.expectedCash.textContent = formatCurrency(expectedCash);
    }
}

/**
 * Setup form listeners
 */
function setupFormListeners() {
    const form = document.getElementById('close-shift-form');
    if (!form) return;

    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Setup input listeners
 */
function setupInputListeners() {
    const finalCashInput = document.getElementById('final-cash');

    if (finalCashInput) {
        finalCashInput.addEventListener('input', calculateFinalDivergence);
    }
}

/**
 * Calculate final divergence
 */
function calculateFinalDivergence() {
    const shift = CloseShiftModalState.activeShift;
    if (!shift) return;

    const finalCashInput = document.getElementById('final-cash');
    const enteredFinalCash = parseFloat(finalCashInput?.value) || 0;

    const expectedCash = (shift.initialCash || 0) + (shift.cashSales || 0);
    const divergence = enteredFinalCash - expectedCash;

    updateFinalDivergenceUI(divergence);
}

/**
 * Update final divergence UI
 */
function updateFinalDivergenceUI(divergence) {
    const divergenceEl = document.querySelector('[data-final-divergence]');
    if (!divergenceEl) return;

    const isPositive = divergence >= 0;
    const absValue = Math.abs(divergence);

    divergenceEl.textContent = `${isPositive ? '+' : '-'} ${formatCurrency(absValue)}`;
    divergenceEl.className = isPositive ? 'text-success' : 'text-danger';
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    if (CloseShiftModalState.isLoading) return;

    const finalCashInput = document.getElementById('final-cash');
    const notesInput = document.getElementById('shift-notes');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const finalCash = parseFloat(finalCashInput?.value) || 0;
    const notes = notesInput?.value || '';

    if (finalCash <= 0) {
        window.App?.showToast('Informe o valor do caixa final', 'warning');
        return;
    }

    const shift = CloseShiftModalState.activeShift;
    if (!shift) {
        window.App?.showToast('Nenhum turno ativo encontrado', 'danger');
        return;
    }

    CloseShiftModalState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { closeShift } = await import('../firebase-config.js');
        const user = window.App?.state?.currentUser;

        // Calculate divergence
        const expectedCash = (shift.initialCash || 0) + (shift.cashSales || 0);
        const divergence = finalCash - expectedCash;

        await closeShift(shift.id, user.id, {
            finalCash,
            notes,
            divergence,
            endTime: Date.now()
        });

        window.App?.showToast('Turno encerrado com sucesso!', 'success');

        // Close modal
        closeModal();

        // Reset form
        e.target.reset();

        // Reset state
        CloseShiftModalState.activeShift = null;
    } catch (error) {
        console.error('Error closing shift:', error);
        window.App?.showToast('Erro ao encerrar turno', 'danger');
    } finally {
        CloseShiftModalState.isLoading = false;
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Close the modal
 */
function closeModal() {
    const closeBtn = document.querySelector('[data-modal-close="close-shift-modal"]');
    if (closeBtn) {
        closeBtn.click();
    } else {
        window.App?.closeModal('close-shift-modal');
    }
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
 * Format currency
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

// Export for global access
window.CloseShiftModal = {
    init: initCloseShiftModal
};
