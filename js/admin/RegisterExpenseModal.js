/**
 * Register Expense Modal Module
 * Handles expense registration from financial control
 */

// State
const RegisterExpenseModalState = {
    isLoading: false
};

/**
 * Initialize Register Expense Modal
 */
export function initRegisterExpenseModal() {
    console.log('Initializing register expense modal...');

    // Setup modal triggers
    setupModalTriggers();

    // Setup form
    setupForm();

    // Setup date default
    setupDateDefault();
}

/**
 * Setup modal triggers
 */
function setupModalTriggers() {
    // Open modal buttons
    document.querySelectorAll('[data-modal-open="expense-modal"]').forEach(btn => {
        btn.addEventListener('click', openModal);
    });

    // Close modal buttons
    document.querySelectorAll('[data-modal-close="expense-modal"]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Close on overlay click
    document.getElementById('expense-modal-overlay')?.addEventListener('click', closeModal);
}

/**
 * Setup form
 */
function setupForm() {
    const form = document.getElementById('expense-form');

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

/**
 * Setup date default
 */
function setupDateDefault() {
    const dateInput = document.getElementById('expense-date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
}

/**
 * Open modal
 */
function openModal() {
    const modal = document.getElementById('expense-modal');
    const overlay = document.getElementById('expense-modal-overlay');

    if (modal && overlay) {
        // Reset date to today
        setupDateDefault();

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
    const modal = document.getElementById('expense-modal');
    const overlay = document.getElementById('expense-modal-overlay');

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
    const form = document.getElementById('expense-form');
    if (form) {
        form.reset();
    }
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    if (RegisterExpenseModalState.isLoading) return;

    const descriptionInput = document.getElementById('expense-description');
    const amountInput = document.getElementById('expense-amount');
    const categorySelect = document.getElementById('expense-category');
    const dateInput = document.getElementById('expense-date');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const description = descriptionInput?.value?.trim() || '';
    const amount = parseFloat(amountInput?.value) || 0;
    const category = categorySelect?.value || '';
    const date = dateInput?.value ? new Date(dateInput.value).getTime() : Date.now();

    // Validation
    if (!description) {
        window.App?.showToast('Informe a descricao do gasto', 'warning');
        return;
    }

    if (amount <= 0) {
        window.App?.showToast('Informe o valor do gasto', 'warning');
        return;
    }

    if (!category) {
        window.App?.showToast('Selecione uma categoria', 'warning');
        return;
    }

    RegisterExpenseModalState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { createTransaction } = await import('../firebase-config.js');
        const user = window.App?.state?.currentUser;

        const expenseData = {
            description,
            amount,
            category,
            date,
            type: 'expense',
            registeredBy: user?.id,
            registeredByName: user?.name,
            createdAt: Date.now()
        };

        await createTransaction(expenseData);

        window.App?.showToast('Gasto registrado com sucesso!', 'success');

        closeModal();
    } catch (error) {
        console.error('Error registering expense:', error);
        window.App?.showToast('Erro ao registrar gasto', 'danger');
    } finally {
        RegisterExpenseModalState.isLoading = false;
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
window.RegisterExpenseModal = {
    init: initRegisterExpenseModal,
    open: openModal,
    close: closeModal
};
