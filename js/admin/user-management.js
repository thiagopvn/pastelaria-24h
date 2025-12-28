/**
 * User Management Module
 * Handles users listing, creation, editing and deletion
 */

// State
const UserManagementState = {
    users: [],
    filteredUsers: [],
    currentFilter: 'all',
    searchTerm: '',
    selectedUser: null,
    isLoading: false,
    unsubscribers: []
};

/**
 * Initialize User Management
 */
export function initUserManagement() {
    console.log('Initializing user management...');

    // Setup search
    setupSearch();

    // Setup filter chips
    setupFilterChips();

    // Setup navigation
    setupNavigation();

    // Setup modals
    setupModals();

    // Setup forms
    setupForms();

    // Load users
    loadUsers();
}

/**
 * Setup search functionality
 */
function setupSearch() {
    const searchInput = document.getElementById('user-search');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            UserManagementState.searchTerm = e.target.value.toLowerCase();
            filterAndRenderUsers();
        });
    }
}

/**
 * Setup filter chips
 */
function setupFilterChips() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Update filter
            const filterText = chip.textContent.toLowerCase();

            if (filterText === 'todos') {
                UserManagementState.currentFilter = 'all';
            } else if (filterText === 'admin') {
                UserManagementState.currentFilter = 'admin';
            } else if (filterText === 'funcionario') {
                UserManagementState.currentFilter = 'staff';
            }

            filterAndRenderUsers();
        });
    });
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
    // Open new user modal
    document.querySelectorAll('[data-modal-open="new-user-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            openModal('new-user-modal');
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
    document.getElementById('new-user-modal-overlay')?.addEventListener('click', () => {
        closeModal('new-user-modal');
    });
}

/**
 * Setup forms
 */
function setupForms() {
    const form = document.getElementById('new-user-form');

    if (form) {
        form.addEventListener('submit', handleCreateUser);
    }
}

/**
 * Load users from Firebase
 */
async function loadUsers() {
    const list = document.getElementById('users-list');
    if (!list) return;

    // Show loading
    list.innerHTML = `
        <div class="flex items-center justify-center py-8">
            <span class="spinner"></span>
        </div>
    `;

    try {
        const { subscribeToUsers } = await import('../firebase-config.js');

        const unsubscribe = subscribeToUsers((users) => {
            UserManagementState.users = users;
            filterAndRenderUsers();

            // Update count in header
            updateUserCount(users.length);
        });

        UserManagementState.unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error loading users:', error);
        list.innerHTML = `
            <div class="text-center py-8">
                <span class="material-symbols-outlined text-4xl text-muted mb-2">error</span>
                <p class="text-muted">Erro ao carregar usuarios</p>
            </div>
        `;
    }
}

/**
 * Filter and render users
 */
function filterAndRenderUsers() {
    let filtered = [...UserManagementState.users];

    // Apply role filter
    if (UserManagementState.currentFilter !== 'all') {
        filtered = filtered.filter(user => user.role === UserManagementState.currentFilter);
    }

    // Apply search filter
    if (UserManagementState.searchTerm) {
        filtered = filtered.filter(user =>
            user.name?.toLowerCase().includes(UserManagementState.searchTerm) ||
            user.email?.toLowerCase().includes(UserManagementState.searchTerm)
        );
    }

    UserManagementState.filteredUsers = filtered;
    renderUsers(filtered);
}

/**
 * Render users list
 */
function renderUsers(users) {
    const list = document.getElementById('users-list');
    if (!list) return;

    if (users.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8">
                <span class="material-symbols-outlined text-4xl text-muted mb-2">group_off</span>
                <p class="text-muted">Nenhum usuario encontrado</p>
            </div>
        `;
        return;
    }

    list.innerHTML = users.map(user => `
        <div class="user-card" data-user-id="${user.id}">
            <div class="user-card-header">
                <div class="user-card-info">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random"
                         alt="${user.name}"
                         class="user-card-avatar">
                    <div>
                        <h3 class="user-card-name">${user.name || 'Usuario'}</h3>
                        <p class="user-card-email">${user.email || ''}</p>
                    </div>
                </div>
                <span class="user-card-role ${user.role || 'staff'}">${getRoleLabel(user.role)}</span>
            </div>
            ${user.transport ? `
                <div class="user-card-transport">
                    <span class="material-symbols-outlined">${getTransportIcon(user.transport)}</span>
                    <span class="font-medium">${getTransportLabel(user.transport)}</span>
                </div>
            ` : ''}
            <div class="user-card-actions">
                <button class="btn btn-secondary" onclick="UserManagement.editUser('${user.id}')">
                    <span class="material-symbols-outlined text-lg">edit</span>
                    Editar
                </button>
                <button class="btn btn-secondary text-danger hover:bg-danger/10" onclick="UserManagement.deleteUser('${user.id}')">
                    <span class="material-symbols-outlined text-lg">delete</span>
                    Excluir
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Update user count in header
 */
function updateUserCount(count) {
    const countEl = document.querySelector('.app-header p.text-muted');
    if (countEl) {
        countEl.textContent = `${count} membros ativos`;
    }
}

/**
 * Get role label
 */
function getRoleLabel(role) {
    switch (role) {
        case 'admin':
            return 'Admin';
        case 'staff':
            return 'Staff';
        default:
            return 'Staff';
    }
}

/**
 * Get transport icon
 */
function getTransportIcon(transport) {
    switch (transport) {
        case 'car':
            return 'directions_car';
        case 'motorcycle':
            return 'two_wheeler';
        case 'bus':
            return 'directions_bus';
        case 'walk':
            return 'directions_walk';
        default:
            return 'directions_car';
    }
}

/**
 * Get transport label
 */
function getTransportLabel(transport) {
    switch (transport) {
        case 'car':
            return 'Carro Proprio';
        case 'motorcycle':
            return 'Moto Propria';
        case 'bus':
            return 'Onibus';
        case 'walk':
            return 'A pe';
        default:
            return 'Nao informado';
    }
}

/**
 * Handle create user
 */
async function handleCreateUser(e) {
    e.preventDefault();

    if (UserManagementState.isLoading) return;

    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const roleSelect = document.getElementById('user-role');
    const transportSelect = document.getElementById('user-transport');
    const passwordInput = document.getElementById('user-password');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const userData = {
        name: nameInput?.value?.trim(),
        email: emailInput?.value?.trim(),
        role: roleSelect?.value || 'staff',
        transport: transportSelect?.value || null,
        password: passwordInput?.value
    };

    // Validation
    if (!userData.name || !userData.email || !userData.password) {
        window.App?.showToast('Preencha todos os campos obrigatorios', 'warning');
        return;
    }

    if (userData.password.length < 6) {
        window.App?.showToast('A senha deve ter no minimo 6 caracteres', 'warning');
        return;
    }

    UserManagementState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { createUser } = await import('../firebase-config.js');

        await createUser(userData);

        window.App?.showToast('Usuario criado com sucesso!', 'success');

        // Close modal and reset form
        closeModal('new-user-modal');
        e.target.reset();
    } catch (error) {
        console.error('Error creating user:', error);
        window.App?.showToast(error.message || 'Erro ao criar usuario', 'danger');
    } finally {
        UserManagementState.isLoading = false;
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Edit user
 */
function editUser(userId) {
    const user = UserManagementState.users.find(u => u.id === userId);

    if (!user) {
        window.App?.showToast('Usuario nao encontrado', 'warning');
        return;
    }

    UserManagementState.selectedUser = user;

    // For now, show toast. In full implementation, open edit modal
    window.App?.showToast(`Editando ${user.name}`, 'info');
}

/**
 * Delete user
 */
async function deleteUser(userId) {
    const user = UserManagementState.users.find(u => u.id === userId);

    if (!user) {
        window.App?.showToast('Usuario nao encontrado', 'warning');
        return;
    }

    if (!confirm(`Deseja realmente excluir ${user.name}?`)) {
        return;
    }

    try {
        const { deleteUser: deleteUserFn } = await import('../firebase-config.js');

        await deleteUserFn(userId);

        window.App?.showToast('Usuario excluido com sucesso!', 'success');
    } catch (error) {
        console.error('Error deleting user:', error);
        window.App?.showToast('Erro ao excluir usuario', 'danger');
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
export function cleanupUserManagement() {
    UserManagementState.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') {
            unsub();
        }
    });
    UserManagementState.unsubscribers = [];
}

// Export for global access
window.UserManagement = {
    init: initUserManagement,
    cleanup: cleanupUserManagement,
    editUser,
    deleteUser
};
