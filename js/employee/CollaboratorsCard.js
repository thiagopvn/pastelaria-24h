/**
 * Collaborators Card Module
 * Handles collaborators display and consumption
 */

// State
const CollaboratorsState = {
    collaborators: [],
    selectedCollaborator: null,
    isLoading: false
};

/**
 * Initialize Collaborators Card
 */
export function initCollaboratorsCard() {
    console.log('Initializing collaborators card...');

    // Load collaborators
    loadCollaborators();

    // Setup event listeners
    setupEventListeners();
}

/**
 * Load collaborators from Firebase
 */
async function loadCollaborators() {
    const list = document.getElementById('collaborators-list');
    const countBadge = document.getElementById('active-collaborators-count');

    if (!list) return;

    try {
        const { subscribeToActiveCollaborators } = await import('../firebase-config.js');

        const unsubscribe = subscribeToActiveCollaborators((collaborators) => {
            CollaboratorsState.collaborators = collaborators;
            renderCollaboratorsList(collaborators, list, countBadge);
        });

        // Store unsubscribe for cleanup
        if (window.App?.state?.unsubscribers) {
            window.App.state.unsubscribers.push(unsubscribe);
        }
    } catch (error) {
        console.error('Error loading collaborators:', error);
        renderEmptyState(list);
        if (countBadge) countBadge.textContent = '0 ativos';
    }
}

/**
 * Render collaborators list
 */
function renderCollaboratorsList(collaborators, container, countBadge) {
    if (countBadge) {
        countBadge.textContent = `${collaborators.length} ativos`;
    }

    if (collaborators.length === 0) {
        renderEmptyState(container);
        return;
    }

    container.innerHTML = collaborators.map(collab => `
        <div class="collaborator-item" data-collaborator-id="${collab.id}">
            <div class="collaborator-info">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(collab.name)}&background=random"
                     alt="${collab.name}"
                     class="collaborator-avatar ${collab.isActive ? 'active' : ''}">
                <div>
                    <p class="collaborator-name">${collab.name}</p>
                    <p class="collaborator-role">${collab.role || 'Colaborador'}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="btn btn-secondary btn-sm" onclick="CollaboratorsCard.openConsumeModal('${collab.id}')">
                    <span class="material-symbols-outlined text-sm">restaurant</span>
                </button>
                <span class="collaborator-status ${collab.status || 'active'}">
                    ${getStatusLabel(collab.status)}
                </span>
            </div>
        </div>
    `).join('');
}

/**
 * Render empty state
 */
function renderEmptyState(container) {
    container.innerHTML = `
        <div class="empty-state py-8">
            <div class="empty-state-icon">
                <span class="material-symbols-outlined">group_off</span>
            </div>
            <h3>Nenhum colaborador</h3>
            <p>Nao ha colaboradores ativos no momento</p>
        </div>
    `;
}

/**
 * Get status label
 */
function getStatusLabel(status) {
    switch (status) {
        case 'active':
            return 'Ativo';
        case 'paused':
            return 'Pausa';
        case 'offline':
            return 'Offline';
        default:
            return 'Ativo';
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Consume modal form
    const consumeForm = document.getElementById('collaborator-consume-form');
    if (consumeForm) {
        consumeForm.addEventListener('submit', handleConsumeSubmit);
    }
}

/**
 * Open consume modal for a collaborator
 */
function openConsumeModal(collaboratorId) {
    const collaborator = CollaboratorsState.collaborators.find(c => c.id === collaboratorId);

    if (!collaborator) {
        window.App?.showToast('Colaborador nao encontrado', 'warning');
        return;
    }

    CollaboratorsState.selectedCollaborator = collaborator;

    // Update modal header with collaborator info
    const modalName = document.querySelector('[data-consume-modal-name]');
    const modalAvatar = document.querySelector('[data-consume-modal-avatar]');

    if (modalName) {
        modalName.textContent = collaborator.name;
    }

    if (modalAvatar) {
        modalAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(collaborator.name)}&background=random`;
    }

    // Open modal
    window.App?.openModal('collaborator-consume-modal');
}

/**
 * Handle consume form submission
 */
async function handleConsumeSubmit(e) {
    e.preventDefault();

    if (CollaboratorsState.isLoading) return;
    if (!CollaboratorsState.selectedCollaborator) return;

    const amountInput = document.getElementById('consume-amount');
    const descriptionInput = document.getElementById('consume-description');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const amount = parseFloat(amountInput?.value) || 0;
    const description = descriptionInput?.value || 'Consumo';

    if (amount <= 0) {
        window.App?.showToast('Informe o valor do consumo', 'warning');
        return;
    }

    CollaboratorsState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { registerCollaboratorConsumption } = await import('../firebase-config.js');
        const user = window.App?.state?.currentUser;
        const shift = window.App?.state?.activeShift;

        await registerCollaboratorConsumption({
            collaboratorId: CollaboratorsState.selectedCollaborator.id,
            collaboratorName: CollaboratorsState.selectedCollaborator.name,
            amount,
            description,
            registeredBy: user?.id,
            registeredByName: user?.name,
            shiftId: shift?.id,
            timestamp: Date.now()
        });

        window.App?.showToast('Consumo registrado com sucesso!', 'success');

        // Close modal
        window.App?.closeModal('collaborator-consume-modal');

        // Reset form
        e.target.reset();

        // Reset selected collaborator
        CollaboratorsState.selectedCollaborator = null;
    } catch (error) {
        console.error('Error registering consumption:', error);
        window.App?.showToast('Erro ao registrar consumo', 'danger');
    } finally {
        CollaboratorsState.isLoading = false;
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
window.CollaboratorsCard = {
    init: initCollaboratorsCard,
    openConsumeModal
};
