/**
 * Create User Modal Module
 * Handles user creation from user management
 */

// State
const CreateUserModalState = {
    isLoading: false,
    isEditMode: false,
    editingUserId: null
};

/**
 * Initialize Create User Modal
 */
export function initCreateUserModal() {
    console.log('Initializing create user modal...');

    // Setup modal triggers
    setupModalTriggers();

    // Setup form
    setupForm();
}

/**
 * Setup modal triggers
 */
function setupModalTriggers() {
    // Open modal buttons
    document.querySelectorAll('[data-modal-open="new-user-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            openModal();
        });
    });

    // Close modal buttons
    document.querySelectorAll('[data-modal-close="new-user-modal"]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Close on overlay click
    document.getElementById('new-user-modal-overlay')?.addEventListener('click', closeModal);
}

/**
 * Setup form
 */
function setupForm() {
    const form = document.getElementById('new-user-form');

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

/**
 * Open modal for creating new user
 */
function openModal(userData = null) {
    CreateUserModalState.isEditMode = !!userData;
    CreateUserModalState.editingUserId = userData?.id || null;

    const modal = document.getElementById('new-user-modal');
    const overlay = document.getElementById('new-user-modal-overlay');
    const title = modal?.querySelector('h2');
    const submitBtn = modal?.querySelector('button[type="submit"]');
    const passwordField = document.getElementById('user-password')?.parentElement;

    if (modal && overlay) {
        // Update title and button text based on mode
        if (title) {
            title.textContent = CreateUserModalState.isEditMode ? 'Editar Usuario' : 'Novo Usuario';
        }

        if (submitBtn) {
            submitBtn.textContent = CreateUserModalState.isEditMode ? 'Salvar Alteracoes' : 'Criar Usuario';
        }

        // Hide password field in edit mode
        if (passwordField) {
            passwordField.style.display = CreateUserModalState.isEditMode ? 'none' : 'block';
        }

        // Populate form if editing
        if (userData) {
            populateForm(userData);
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
 * Populate form with user data
 */
function populateForm(userData) {
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const roleSelect = document.getElementById('user-role');
    const transportSelect = document.getElementById('user-transport');

    if (nameInput) nameInput.value = userData.name || '';
    if (emailInput) emailInput.value = userData.email || '';
    if (roleSelect) roleSelect.value = userData.role || 'staff';
    if (transportSelect) transportSelect.value = userData.transport || '';
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('new-user-modal');
    const overlay = document.getElementById('new-user-modal-overlay');

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
    const form = document.getElementById('new-user-form');
    const passwordField = document.getElementById('user-password')?.parentElement;

    if (form) {
        form.reset();
    }

    // Show password field again
    if (passwordField) {
        passwordField.style.display = 'block';
    }

    CreateUserModalState.isEditMode = false;
    CreateUserModalState.editingUserId = null;
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    if (CreateUserModalState.isLoading) return;

    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const roleSelect = document.getElementById('user-role');
    const transportSelect = document.getElementById('user-transport');
    const passwordInput = document.getElementById('user-password');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const name = nameInput?.value?.trim() || '';
    const email = emailInput?.value?.trim() || '';
    const role = roleSelect?.value || 'staff';
    const transport = transportSelect?.value || '';
    const password = passwordInput?.value || '';

    // Validation
    if (!name) {
        window.App?.showToast('Informe o nome do usuario', 'warning');
        return;
    }

    if (!email) {
        window.App?.showToast('Informe o email do usuario', 'warning');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        window.App?.showToast('Informe um email valido', 'warning');
        return;
    }

    // Password validation (only for new users)
    if (!CreateUserModalState.isEditMode) {
        if (!password || password.length < 6) {
            window.App?.showToast('A senha deve ter no minimo 6 caracteres', 'warning');
            return;
        }
    }

    CreateUserModalState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        if (CreateUserModalState.isEditMode) {
            // Update existing user
            const { updateUser } = await import('../firebase-config.js');

            await updateUser(CreateUserModalState.editingUserId, {
                name,
                email,
                role,
                transport
            });

            window.App?.showToast('Usuario atualizado com sucesso!', 'success');
        } else {
            // Create new user
            const { createUser } = await import('../firebase-config.js');

            await createUser({
                name,
                email,
                role,
                transport,
                password
            });

            window.App?.showToast('Usuario criado com sucesso!', 'success');
        }

        closeModal();
    } catch (error) {
        console.error('Error saving user:', error);
        window.App?.showToast(error.message || 'Erro ao salvar usuario', 'danger');
    } finally {
        CreateUserModalState.isLoading = false;
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
window.CreateUserModal = {
    init: initCreateUserModal,
    open: openModal,
    close: closeModal
};
