/**
 * Shift Corrections Module
 * Handles shift correction requests and approvals
 */

// State
const ShiftCorrectionsState = {
    corrections: [],
    filteredCorrections: [],
    currentFilter: 'all',
    isLoading: false,
    unsubscribers: []
};

/**
 * Initialize Shift Corrections
 */
export function initShiftCorrections() {
    console.log('Initializing shift corrections...');

    // Setup navigation
    setupNavigation();

    // Setup filters
    setupFilters();

    // Load corrections
    loadCorrections();
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
 * Setup filter tabs
 */
function setupFilters() {
    document.querySelectorAll('.correction-filter').forEach(filter => {
        filter.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.correction-filter').forEach(f => f.classList.remove('active'));
            filter.classList.add('active');

            // Get filter value
            const filterText = filter.textContent.toLowerCase();

            if (filterText.includes('todos') || filterText.includes('all')) {
                ShiftCorrectionsState.currentFilter = 'all';
            } else if (filterText.includes('pendente')) {
                ShiftCorrectionsState.currentFilter = 'pending';
            } else if (filterText.includes('aprovad')) {
                ShiftCorrectionsState.currentFilter = 'approved';
            } else if (filterText.includes('rejeitad')) {
                ShiftCorrectionsState.currentFilter = 'rejected';
            }

            filterAndRenderCorrections();
        });
    });
}

/**
 * Load corrections from Firebase
 */
async function loadCorrections() {
    const list = document.querySelector('.corrections-list');
    if (!list) return;

    // Show loading
    list.innerHTML = `
        <div class="flex items-center justify-center py-8">
            <span class="spinner"></span>
        </div>
    `;

    try {
        const { subscribeToCorrections } = await import('../../firebase-config.js');

        const unsubscribe = subscribeToCorrections((corrections) => {
            ShiftCorrectionsState.corrections = corrections;
            filterAndRenderCorrections();

            // Update count badge
            updateCorrectionCount(corrections);
        });

        ShiftCorrectionsState.unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error loading corrections:', error);
        list.innerHTML = `
            <div class="corrections-empty">
                <div class="corrections-empty-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);">
                    <span class="material-symbols-outlined">error</span>
                </div>
                <h3 class="corrections-empty-title">Erro ao carregar</h3>
                <p class="corrections-empty-text">Nao foi possivel carregar as correcoes</p>
            </div>
        `;
    }
}

/**
 * Filter and render corrections
 */
function filterAndRenderCorrections() {
    let filtered = [...ShiftCorrectionsState.corrections];

    // Apply filter
    if (ShiftCorrectionsState.currentFilter !== 'all') {
        filtered = filtered.filter(c => c.status === ShiftCorrectionsState.currentFilter);
    }

    ShiftCorrectionsState.filteredCorrections = filtered;
    renderCorrections(filtered);
}

/**
 * Render corrections list
 */
function renderCorrections(corrections) {
    const list = document.querySelector('.corrections-list');
    if (!list) return;

    if (corrections.length === 0) {
        list.innerHTML = `
            <div class="corrections-empty">
                <div class="corrections-empty-icon">
                    <span class="material-symbols-outlined">check_circle</span>
                </div>
                <h3 class="corrections-empty-title">Tudo em ordem!</h3>
                <p class="corrections-empty-text">Nao ha correcoes pendentes no momento</p>
            </div>
        `;
        return;
    }

    list.innerHTML = corrections.map(correction => `
        <div class="correction-card ${correction.status || 'pending'}" data-correction-id="${correction.id}">
            <div class="correction-card-header">
                <div class="correction-info">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(correction.employeeName || 'User')}&background=random"
                         alt="${correction.employeeName}"
                         class="correction-avatar">
                    <div>
                        <p class="correction-employee">${correction.employeeName || 'Funcionario'}</p>
                        <p class="correction-date">${formatDate(correction.createdAt)}</p>
                    </div>
                </div>
                <span class="correction-status ${correction.status || 'pending'}">
                    <span class="material-symbols-outlined">${getStatusIcon(correction.status)}</span>
                    ${getStatusLabel(correction.status)}
                </span>
            </div>
            <div class="correction-card-body">
                <div class="correction-details">
                    <div class="correction-detail">
                        <p class="correction-detail-label">Esperado</p>
                        <p class="correction-detail-value expected">${formatCurrency(correction.expectedValue || 0)}</p>
                    </div>
                    <div class="correction-detail">
                        <p class="correction-detail-label">Contado</p>
                        <p class="correction-detail-value actual">${formatCurrency(correction.actualValue || 0)}</p>
                    </div>
                    <div class="correction-detail">
                        <p class="correction-detail-label">Divergencia</p>
                        <p class="correction-detail-value divergence ${correction.divergence >= 0 ? 'positive' : ''}">
                            ${correction.divergence >= 0 ? '+' : ''}${formatCurrency(correction.divergence || 0)}
                        </p>
                    </div>
                </div>
                ${correction.reason ? `
                    <div class="correction-reason">
                        <p class="correction-reason-label">Justificativa</p>
                        <p class="correction-reason-text">${correction.reason}</p>
                    </div>
                ` : ''}
                ${correction.status === 'pending' ? `
                    <div class="correction-actions">
                        <button class="btn btn-secondary text-danger hover:bg-danger/10"
                                onclick="ShiftCorrections.rejectCorrection('${correction.id}')">
                            <span class="material-symbols-outlined">close</span>
                            Rejeitar
                        </button>
                        <button class="btn btn-primary"
                                onclick="ShiftCorrections.approveCorrection('${correction.id}')">
                            <span class="material-symbols-outlined">check</span>
                            Aprovar
                        </button>
                    </div>
                ` : `
                    <div class="correction-actions single">
                        <button class="btn btn-secondary"
                                onclick="ShiftCorrections.viewDetails('${correction.id}')">
                            <span class="material-symbols-outlined">visibility</span>
                            Ver Detalhes
                        </button>
                    </div>
                `}
            </div>
        </div>
    `).join('');
}

/**
 * Update correction count badge
 */
function updateCorrectionCount(corrections) {
    const pendingCount = corrections.filter(c => c.status === 'pending').length;
    const countBadge = document.querySelector('.corrections-count');

    if (countBadge) {
        countBadge.textContent = `${pendingCount} pendentes`;
        countBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    }
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
    switch (status) {
        case 'approved':
            return 'check_circle';
        case 'rejected':
            return 'cancel';
        case 'pending':
        default:
            return 'schedule';
    }
}

/**
 * Get status label
 */
function getStatusLabel(status) {
    switch (status) {
        case 'approved':
            return 'Aprovado';
        case 'rejected':
            return 'Rejeitado';
        case 'pending':
        default:
            return 'Pendente';
    }
}

/**
 * Approve correction
 */
async function approveCorrection(correctionId) {
    const correction = ShiftCorrectionsState.corrections.find(c => c.id === correctionId);

    if (!correction) {
        window.App?.showToast('Correcao nao encontrada', 'warning');
        return;
    }

    if (!confirm(`Deseja aprovar a correcao de ${correction.employeeName}?`)) {
        return;
    }

    try {
        const { updateCorrection } = await import('../../firebase-config.js');
        const user = window.App?.state?.currentUser;

        await updateCorrection(correctionId, {
            status: 'approved',
            approvedBy: user?.id,
            approvedByName: user?.name,
            approvedAt: Date.now()
        });

        window.App?.showToast('Correcao aprovada com sucesso!', 'success');
    } catch (error) {
        console.error('Error approving correction:', error);
        window.App?.showToast('Erro ao aprovar correcao', 'danger');
    }
}

/**
 * Reject correction
 */
async function rejectCorrection(correctionId) {
    const correction = ShiftCorrectionsState.corrections.find(c => c.id === correctionId);

    if (!correction) {
        window.App?.showToast('Correcao nao encontrada', 'warning');
        return;
    }

    const reason = prompt('Motivo da rejeicao:');

    if (reason === null) return; // Cancelled

    if (!reason.trim()) {
        window.App?.showToast('Informe o motivo da rejeicao', 'warning');
        return;
    }

    try {
        const { updateCorrection } = await import('../../firebase-config.js');
        const user = window.App?.state?.currentUser;

        await updateCorrection(correctionId, {
            status: 'rejected',
            rejectedBy: user?.id,
            rejectedByName: user?.name,
            rejectedAt: Date.now(),
            rejectionReason: reason
        });

        window.App?.showToast('Correcao rejeitada', 'info');
    } catch (error) {
        console.error('Error rejecting correction:', error);
        window.App?.showToast('Erro ao rejeitar correcao', 'danger');
    }
}

/**
 * View correction details
 */
function viewDetails(correctionId) {
    const correction = ShiftCorrectionsState.corrections.find(c => c.id === correctionId);

    if (!correction) {
        window.App?.showToast('Correcao nao encontrada', 'warning');
        return;
    }

    // Show details modal or toast
    window.App?.showToast(`Detalhes de ${correction.employeeName}`, 'info');
}

/**
 * Format date
 */
function formatDate(timestamp) {
    if (!timestamp) return 'Data desconhecida';

    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
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
 * Cleanup
 */
export function cleanupShiftCorrections() {
    ShiftCorrectionsState.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') {
            unsub();
        }
    });
    ShiftCorrectionsState.unsubscribers = [];
}

// Export for global access
window.ShiftCorrections = {
    init: initShiftCorrections,
    cleanup: cleanupShiftCorrections,
    approveCorrection,
    rejectCorrection,
    viewDetails
};
