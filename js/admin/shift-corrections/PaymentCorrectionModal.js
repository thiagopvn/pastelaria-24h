/**
 * Payment Correction Modal Module
 * Handles payment method corrections for shifts
 */

// State
const PaymentCorrectionModalState = {
    selectedShift: null,
    selectedTransaction: null,
    isLoading: false
};

/**
 * Initialize Payment Correction Modal
 */
export function initPaymentCorrectionModal() {
    console.log('Initializing payment correction modal...');

    // Setup modal triggers
    setupModalTriggers();

    // Setup form
    setupForm();

    // Setup payment method selector
    setupPaymentMethodSelector();
}

/**
 * Setup modal triggers
 */
function setupModalTriggers() {
    // Open modal buttons
    document.querySelectorAll('[data-modal-open="payment-correction-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const shiftId = btn.dataset.shiftId;
            const transactionId = btn.dataset.transactionId;
            openModal(shiftId, transactionId);
        });
    });

    // Close modal buttons
    document.querySelectorAll('[data-modal-close="payment-correction-modal"]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Close on overlay click
    document.getElementById('payment-correction-modal-overlay')?.addEventListener('click', closeModal);
}

/**
 * Setup form
 */
function setupForm() {
    const form = document.getElementById('payment-correction-form');

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

/**
 * Setup payment method selector
 */
function setupPaymentMethodSelector() {
    document.querySelectorAll('[data-payment-method]').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('[data-payment-method]').forEach(b => {
                b.classList.remove('active', 'ring-2', 'ring-primary');
            });

            btn.classList.add('active', 'ring-2', 'ring-primary');
        });
    });
}

/**
 * Open modal
 */
async function openModal(shiftId = null, transactionId = null) {
    PaymentCorrectionModalState.selectedShift = shiftId;
    PaymentCorrectionModalState.selectedTransaction = transactionId;

    const modal = document.getElementById('payment-correction-modal');
    const overlay = document.getElementById('payment-correction-modal-overlay');

    if (modal && overlay) {
        // Load transaction data if available
        if (transactionId) {
            await loadTransactionData(transactionId);
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
 * Load transaction data
 */
async function loadTransactionData(transactionId) {
    try {
        const { getTransaction } = await import('../../firebase-config.js');
        const transaction = await getTransaction(transactionId);

        if (transaction) {
            // Populate form with transaction data
            populateForm(transaction);
        }
    } catch (error) {
        console.error('Error loading transaction:', error);
    }
}

/**
 * Populate form with transaction data
 */
function populateForm(transaction) {
    const amountInput = document.getElementById('payment-amount');
    const currentMethodEl = document.querySelector('[data-current-method]');

    if (amountInput) {
        amountInput.value = transaction.amount || '';
    }

    if (currentMethodEl) {
        currentMethodEl.textContent = getPaymentMethodLabel(transaction.paymentMethod);
    }

    // Highlight current payment method
    document.querySelectorAll('[data-payment-method]').forEach(btn => {
        btn.classList.remove('active', 'ring-2', 'ring-primary');

        if (btn.dataset.paymentMethod === transaction.paymentMethod) {
            btn.classList.add('active', 'ring-2', 'ring-primary');
        }
    });
}

/**
 * Get payment method label
 */
function getPaymentMethodLabel(method) {
    switch (method) {
        case 'cash':
            return 'Dinheiro';
        case 'credit':
            return 'Credito';
        case 'debit':
            return 'Debito';
        case 'pix':
            return 'PIX';
        default:
            return 'Desconhecido';
    }
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('payment-correction-modal');
    const overlay = document.getElementById('payment-correction-modal-overlay');

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
    const form = document.getElementById('payment-correction-form');

    if (form) {
        form.reset();
    }

    // Reset payment method selection
    document.querySelectorAll('[data-payment-method]').forEach(btn => {
        btn.classList.remove('active', 'ring-2', 'ring-primary');
    });

    PaymentCorrectionModalState.selectedShift = null;
    PaymentCorrectionModalState.selectedTransaction = null;
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    if (PaymentCorrectionModalState.isLoading) return;

    const activeMethod = document.querySelector('[data-payment-method].active');
    const reasonInput = document.getElementById('payment-correction-reason');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const newPaymentMethod = activeMethod?.dataset.paymentMethod;
    const reason = reasonInput?.value?.trim() || '';

    // Validation
    if (!newPaymentMethod) {
        window.App?.showToast('Selecione o metodo de pagamento correto', 'warning');
        return;
    }

    if (!reason) {
        window.App?.showToast('Informe o motivo da correcao', 'warning');
        return;
    }

    PaymentCorrectionModalState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { createPaymentCorrection } = await import('../../firebase-config.js');
        const user = window.App?.state?.currentUser;

        const correctionData = {
            shiftId: PaymentCorrectionModalState.selectedShift,
            transactionId: PaymentCorrectionModalState.selectedTransaction,
            type: 'payment',
            newPaymentMethod,
            reason,
            status: 'pending',
            requestedBy: user?.id,
            requestedByName: user?.name,
            createdAt: Date.now()
        };

        await createPaymentCorrection(correctionData);

        window.App?.showToast('Solicitacao de correcao enviada!', 'success');

        closeModal();
    } catch (error) {
        console.error('Error creating payment correction:', error);
        window.App?.showToast('Erro ao enviar correcao', 'danger');
    } finally {
        PaymentCorrectionModalState.isLoading = false;
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
window.PaymentCorrectionModal = {
    init: initPaymentCorrectionModal,
    open: openModal,
    close: closeModal
};
