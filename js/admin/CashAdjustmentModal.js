/**
 * Cash Adjustment Modal Module
 * Handles cash adjustments (additions/subtractions) to the register
 */

// State
const CashAdjustmentModalState = {
    selectedShift: null,
    adjustmentType: 'add',
    isLoading: false
};

/**
 * Initialize Cash Adjustment Modal
 */
export function initCashAdjustmentModal() {
    console.log('Initializing cash adjustment modal...');

    // Setup modal triggers
    setupModalTriggers();

    // Setup form
    setupForm();

    // Setup type selector
    setupTypeSelector();
}

/**
 * Setup modal triggers
 */
function setupModalTriggers() {
    // Open modal buttons
    document.querySelectorAll('[data-modal-open="cash-adjustment-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const shiftId = btn.dataset.shiftId;
            openModal(shiftId);
        });
    });

    // Close modal buttons
    document.querySelectorAll('[data-modal-close="cash-adjustment-modal"]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Close on overlay click
    document.getElementById('cash-adjustment-modal-overlay')?.addEventListener('click', closeModal);
}

/**
 * Setup form
 */
function setupForm() {
    const form = document.getElementById('cash-adjustment-form');

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

/**
 * Setup type selector
 */
function setupTypeSelector() {
    document.querySelectorAll('[data-adjustment-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('[data-adjustment-type]').forEach(b => {
                b.classList.remove('active', 'bg-primary', 'text-white');
                b.classList.add('bg-background-light', 'dark:bg-background-dark');
            });

            btn.classList.add('active', 'bg-primary', 'text-white');
            btn.classList.remove('bg-background-light', 'dark:bg-background-dark');

            CashAdjustmentModalState.adjustmentType = btn.dataset.adjustmentType;
        });
    });
}

/**
 * Open modal
 */
function openModal(shiftId = null) {
    CashAdjustmentModalState.selectedShift = shiftId;

    const modal = document.getElementById('cash-adjustment-modal');
    const overlay = document.getElementById('cash-adjustment-modal-overlay');

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
function closeModal() {
    const modal = document.getElementById('cash-adjustment-modal');
    const overlay = document.getElementById('cash-adjustment-modal-overlay');

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
    const form = document.getElementById('cash-adjustment-form');
    if (form) {
        form.reset();
    }

    CashAdjustmentModalState.selectedShift = null;
    CashAdjustmentModalState.adjustmentType = 'add';

    // Reset type selector
    document.querySelectorAll('[data-adjustment-type]').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        btn.classList.add('bg-background-light', 'dark:bg-background-dark');

        if (btn.dataset.adjustmentType === 'add') {
            btn.classList.add('active', 'bg-primary', 'text-white');
            btn.classList.remove('bg-background-light', 'dark:bg-background-dark');
        }
    });
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    if (CashAdjustmentModalState.isLoading) return;

    const amountInput = document.getElementById('adjustment-amount');
    const reasonInput = document.getElementById('adjustment-reason');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const amount = parseFloat(amountInput?.value) || 0;
    const reason = reasonInput?.value?.trim() || '';

    // Validation
    if (amount <= 0) {
        window.App?.showToast('Informe o valor do ajuste', 'warning');
        return;
    }

    if (!reason) {
        window.App?.showToast('Informe o motivo do ajuste', 'warning');
        return;
    }

    CashAdjustmentModalState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { registerCashAdjustment } = await import('../firebase-config.js');
        const user = window.App?.state?.currentUser;

        const adjustmentData = {
            shiftId: CashAdjustmentModalState.selectedShift,
            type: CashAdjustmentModalState.adjustmentType,
            amount: CashAdjustmentModalState.adjustmentType === 'subtract' ? -amount : amount,
            reason,
            registeredBy: user?.id,
            registeredByName: user?.name,
            timestamp: Date.now()
        };

        await registerCashAdjustment(adjustmentData);

        const typeLabel = CashAdjustmentModalState.adjustmentType === 'add' ? 'adicionado' : 'subtraido';
        window.App?.showToast(`Valor ${typeLabel} com sucesso!`, 'success');

        closeModal();
    } catch (error) {
        console.error('Error registering cash adjustment:', error);
        window.App?.showToast('Erro ao registrar ajuste', 'danger');
    } finally {
        CashAdjustmentModalState.isLoading = false;
        setButtonLoading(submitBtn, false);
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

// Export for global access
window.CashAdjustmentModal = {
    init: initCashAdjustmentModal,
    open: openModal,
    close: closeModal
};
