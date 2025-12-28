/**
 * Open Shift Modal Module
 * Handles shift opening functionality
 */

// Modal State
const OpenShiftModalState = {
    expectedCash: 0,
    expectedCoins: 0,
    isLoading: false
};

/**
 * Initialize Open Shift Modal
 */
export function initOpenShiftModal() {
    console.log('Initializing open shift modal...');

    // Load expected values from previous shift
    loadExpectedValues();

    // Setup form listeners
    setupFormListeners();

    // Setup input listeners for divergence calculation
    setupInputListeners();
}

/**
 * Load expected values from previous shift
 */
async function loadExpectedValues() {
    try {
        const { getLastShiftValues } = await import('../firebase-config.js');
        const lastShift = await getLastShiftValues();

        if (lastShift) {
            OpenShiftModalState.expectedCash = lastShift.finalCash || 0;
            OpenShiftModalState.expectedCoins = lastShift.finalCoins || 0;

            // Update UI
            updateExpectedValuesUI();
        }
    } catch (error) {
        console.error('Error loading expected values:', error);
    }
}

/**
 * Update expected values UI
 */
function updateExpectedValuesUI() {
    const expectedCashEl = document.querySelector('[data-expected-cash]');
    const expectedCoinsEl = document.querySelector('[data-expected-coins]');

    if (expectedCashEl) {
        expectedCashEl.textContent = formatCurrency(OpenShiftModalState.expectedCash);
    }

    if (expectedCoinsEl) {
        expectedCoinsEl.textContent = formatCurrency(OpenShiftModalState.expectedCoins);
    }
}

/**
 * Setup form listeners
 */
function setupFormListeners() {
    const form = document.getElementById('open-shift-form');
    if (!form) return;

    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Setup input listeners for divergence calculation
 */
function setupInputListeners() {
    const cashInput = document.getElementById('initial-cash') || document.getElementById('cash-input');
    const coinsInput = document.getElementById('initial-coins') || document.getElementById('coins-input');

    if (cashInput) {
        cashInput.addEventListener('input', calculateDivergence);
    }

    if (coinsInput) {
        coinsInput.addEventListener('input', calculateDivergence);
    }
}

/**
 * Calculate and display divergence
 */
function calculateDivergence() {
    const cashInput = document.getElementById('initial-cash') || document.getElementById('cash-input');
    const coinsInput = document.getElementById('initial-coins') || document.getElementById('coins-input');

    const enteredCash = parseFloat(cashInput?.value) || 0;
    const enteredCoins = parseFloat(coinsInput?.value) || 0;

    const expectedTotal = OpenShiftModalState.expectedCash + OpenShiftModalState.expectedCoins;
    const enteredTotal = enteredCash + enteredCoins;

    const divergence = enteredTotal - expectedTotal;

    updateDivergenceUI(divergence);
}

/**
 * Update divergence UI
 */
function updateDivergenceUI(divergence) {
    const divergenceAlert = document.querySelector('.divergence-alert, [data-divergence-alert]');
    if (!divergenceAlert) return;

    if (Math.abs(divergence) < 0.01) {
        divergenceAlert.style.display = 'none';
        return;
    }

    divergenceAlert.style.display = 'flex';

    const isPositive = divergence > 0;

    // Update classes
    divergenceAlert.classList.remove('positive', 'negative');
    divergenceAlert.classList.add(isPositive ? 'positive' : 'negative');

    // Update title
    const title = divergenceAlert.querySelector('.divergence-title, [data-divergence-title]');
    if (title) {
        title.textContent = isPositive ? 'Valor acima do esperado' : 'Divergencia na Abertura';
    }

    // Update description
    const desc = divergenceAlert.querySelector('.divergence-description, [data-divergence-desc]');
    if (desc) {
        desc.textContent = isPositive
            ? 'O valor contado e maior que o esperado.'
            : 'O valor contado e menor que o esperado.';
    }

    // Update amount
    const amount = divergenceAlert.querySelector('.divergence-amount, [data-divergence-amount]');
    if (amount) {
        amount.textContent = `${isPositive ? '+' : '-'} ${formatCurrency(Math.abs(divergence))}`;
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    if (OpenShiftModalState.isLoading) return;

    const cashInput = document.getElementById('initial-cash') || document.getElementById('cash-input');
    const coinsInput = document.getElementById('initial-coins') || document.getElementById('coins-input');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const initialCash = parseFloat(cashInput?.value) || 0;
    const initialCoins = parseFloat(coinsInput?.value) || 0;

    if (initialCash <= 0) {
        window.App?.showToast('Informe o valor do caixa inicial', 'warning');
        return;
    }

    OpenShiftModalState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { openShift } = await import('../firebase-config.js');
        const user = window.App?.state?.currentUser;

        if (!user) {
            throw new Error('Usuario nao encontrado');
        }

        await openShift(user.id, user.name, initialCash, initialCoins);

        window.App?.showToast('Turno iniciado com sucesso!', 'success');

        // Close modal
        closeModal();

        // Reset form
        e.target.reset();
    } catch (error) {
        console.error('Error opening shift:', error);
        window.App?.showToast('Erro ao iniciar turno', 'danger');
    } finally {
        OpenShiftModalState.isLoading = false;
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Close the modal
 */
function closeModal() {
    const closeBtn = document.querySelector('[data-modal-close="open-shift-modal"]');
    if (closeBtn) {
        closeBtn.click();
    } else {
        window.App?.closeModal('open-shift-modal');
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
window.OpenShiftModal = {
    init: initOpenShiftModal
};
