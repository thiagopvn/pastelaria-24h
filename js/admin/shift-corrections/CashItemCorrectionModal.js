/**
 * Cash Item Correction Modal Module
 * Handles cash item (bills/coins) corrections for shifts
 */

// State
const CashItemCorrectionModalState = {
    selectedShift: null,
    itemType: 'bills',
    isLoading: false
};

/**
 * Initialize Cash Item Correction Modal
 */
export function initCashItemCorrectionModal() {
    console.log('Initializing cash item correction modal...');

    // Setup modal triggers
    setupModalTriggers();

    // Setup form
    setupForm();

    // Setup item type tabs
    setupItemTypeTabs();
}

/**
 * Setup modal triggers
 */
function setupModalTriggers() {
    // Open modal buttons
    document.querySelectorAll('[data-modal-open="cash-item-correction-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const shiftId = btn.dataset.shiftId;
            openModal(shiftId);
        });
    });

    // Close modal buttons
    document.querySelectorAll('[data-modal-close="cash-item-correction-modal"]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Close on overlay click
    document.getElementById('cash-item-correction-modal-overlay')?.addEventListener('click', closeModal);
}

/**
 * Setup form
 */
function setupForm() {
    const form = document.getElementById('cash-item-correction-form');

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    // Setup amount inputs to calculate total
    document.querySelectorAll('[data-denomination]').forEach(input => {
        input.addEventListener('input', calculateTotal);
    });
}

/**
 * Setup item type tabs
 */
function setupItemTypeTabs() {
    document.querySelectorAll('[data-item-type]').forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('[data-item-type]').forEach(t => {
                t.classList.remove('active', 'bg-primary', 'text-white');
                t.classList.add('bg-background-light', 'dark:bg-background-dark');
            });

            tab.classList.add('active', 'bg-primary', 'text-white');
            tab.classList.remove('bg-background-light', 'dark:bg-background-dark');

            CashItemCorrectionModalState.itemType = tab.dataset.itemType;

            // Show/hide relevant inputs
            updateVisibleInputs();
        });
    });
}

/**
 * Update visible inputs based on item type
 */
function updateVisibleInputs() {
    const billsSection = document.querySelector('[data-section="bills"]');
    const coinsSection = document.querySelector('[data-section="coins"]');

    if (CashItemCorrectionModalState.itemType === 'bills') {
        if (billsSection) billsSection.style.display = 'block';
        if (coinsSection) coinsSection.style.display = 'none';
    } else {
        if (billsSection) billsSection.style.display = 'none';
        if (coinsSection) coinsSection.style.display = 'block';
    }
}

/**
 * Calculate total from denomination inputs
 */
function calculateTotal() {
    const inputs = document.querySelectorAll(`[data-section="${CashItemCorrectionModalState.itemType}"] [data-denomination]`);
    let total = 0;

    inputs.forEach(input => {
        const denomination = parseFloat(input.dataset.denomination) || 0;
        const quantity = parseInt(input.value) || 0;
        total += denomination * quantity;
    });

    const totalEl = document.querySelector('[data-total]');
    if (totalEl) {
        totalEl.textContent = formatCurrency(total);
    }

    return total;
}

/**
 * Open modal
 */
async function openModal(shiftId = null) {
    CashItemCorrectionModalState.selectedShift = shiftId;

    const modal = document.getElementById('cash-item-correction-modal');
    const overlay = document.getElementById('cash-item-correction-modal-overlay');

    if (modal && overlay) {
        // Load shift data if available
        if (shiftId) {
            await loadShiftData(shiftId);
        }

        modal.style.display = 'block';
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            modal.style.transform = 'translateY(0)';
        }, 10);
    }
}

/**
 * Load shift data
 */
async function loadShiftData(shiftId) {
    try {
        const { getShift } = await import('../../firebase-config.js');
        const shift = await getShift(shiftId);

        if (shift) {
            // Update expected values display
            updateExpectedValues(shift);
        }
    } catch (error) {
        console.error('Error loading shift:', error);
    }
}

/**
 * Update expected values display
 */
function updateExpectedValues(shift) {
    const expectedCashEl = document.querySelector('[data-expected-cash]');
    const expectedCoinsEl = document.querySelector('[data-expected-coins]');

    if (expectedCashEl) {
        expectedCashEl.textContent = formatCurrency(shift.expectedCash || 0);
    }

    if (expectedCoinsEl) {
        expectedCoinsEl.textContent = formatCurrency(shift.expectedCoins || 0);
    }
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('cash-item-correction-modal');
    const overlay = document.getElementById('cash-item-correction-modal-overlay');

    if (modal && overlay) {
        modal.style.transform = 'translateY(100%)';
        overlay.classList.remove('active');
        document.body.style.overflow = '';

        setTimeout(() => {
            modal.style.display = 'none';
            resetForm();
        }, 300);
    }
}

/**
 * Reset form
 */
function resetForm() {
    const form = document.getElementById('cash-item-correction-form');

    if (form) {
        form.reset();
    }

    // Reset total
    const totalEl = document.querySelector('[data-total]');
    if (totalEl) {
        totalEl.textContent = formatCurrency(0);
    }

    // Reset to bills tab
    CashItemCorrectionModalState.itemType = 'bills';
    document.querySelectorAll('[data-item-type]').forEach(tab => {
        tab.classList.remove('active', 'bg-primary', 'text-white');
        tab.classList.add('bg-background-light', 'dark:bg-background-dark');

        if (tab.dataset.itemType === 'bills') {
            tab.classList.add('active', 'bg-primary', 'text-white');
            tab.classList.remove('bg-background-light', 'dark:bg-background-dark');
        }
    });

    updateVisibleInputs();

    CashItemCorrectionModalState.selectedShift = null;
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    if (CashItemCorrectionModalState.isLoading) return;

    const reasonInput = document.getElementById('cash-correction-reason');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const total = calculateTotal();
    const reason = reasonInput?.value?.trim() || '';

    // Validation
    if (total <= 0) {
        window.App?.showToast('Informe os valores a corrigir', 'warning');
        return;
    }

    if (!reason) {
        window.App?.showToast('Informe o motivo da correcao', 'warning');
        return;
    }

    CashItemCorrectionModalState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { createCashItemCorrection } = await import('../../firebase-config.js');
        const user = window.App?.state?.currentUser;

        // Collect denomination breakdown
        const breakdown = {};
        document.querySelectorAll(`[data-section="${CashItemCorrectionModalState.itemType}"] [data-denomination]`).forEach(input => {
            const denomination = input.dataset.denomination;
            const quantity = parseInt(input.value) || 0;

            if (quantity > 0) {
                breakdown[denomination] = quantity;
            }
        });

        const correctionData = {
            shiftId: CashItemCorrectionModalState.selectedShift,
            type: 'cash_item',
            itemType: CashItemCorrectionModalState.itemType,
            breakdown,
            totalValue: total,
            reason,
            status: 'pending',
            requestedBy: user?.id,
            requestedByName: user?.name,
            createdAt: Date.now()
        };

        await createCashItemCorrection(correctionData);

        window.App?.showToast('Solicitacao de correcao enviada!', 'success');

        closeModal();
    } catch (error) {
        console.error('Error creating cash item correction:', error);
        window.App?.showToast('Erro ao enviar correcao', 'danger');
    } finally {
        CashItemCorrectionModalState.isLoading = false;
        setButtonLoading(submitBtn, false);
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

// Export for global access
window.CashItemCorrectionModal = {
    init: initCashItemCorrectionModal,
    open: openModal,
    close: closeModal
};
