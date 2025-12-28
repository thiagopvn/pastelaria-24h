/**
 * Employee Dashboard Module
 * Handles all employee dashboard functionality
 */

// Dashboard State
const EmployeeDashboardState = {
    user: null,
    activeShift: null,
    timerInterval: null,
    shiftStartTime: null
};

/**
 * Initialize Employee Dashboard
 */
export function initEmployeeDashboard() {
    console.log('Initializing employee dashboard module...');

    // Get current user from App state
    EmployeeDashboardState.user = window.App?.state?.currentUser;

    // Update welcome message
    updateWelcomeMessage();

    // Setup event listeners
    setupDashboardEventListeners();

    // Load shift status
    loadShiftStatus();

    // Load collaborators
    loadCollaborators();

    // Load recent activity
    loadRecentActivity();
}

/**
 * Update welcome message with user name
 */
function updateWelcomeMessage() {
    const employeeName = document.getElementById('employee-name');
    if (employeeName && EmployeeDashboardState.user) {
        employeeName.textContent = EmployeeDashboardState.user.name || 'Funcionario';
    }
}

/**
 * Setup dashboard event listeners
 */
function setupDashboardEventListeners() {
    // Theme toggle
    const themeToggle = document.querySelector('[data-theme-toggle]');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            window.App?.toggleTheme();
            updateThemeIcon(themeToggle);
        });
    }

    // Bottom navigation
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const nav = item.dataset.nav;
            if (nav) {
                window.App?.navigateTo(nav);
            }
        });
    });

    // Products modal trigger
    const productsBtn = document.querySelector('[data-modal-open="products-modal"]');
    if (productsBtn) {
        productsBtn.addEventListener('click', () => {
            openProductsModal();
        });
    }

    // Cash register modal trigger
    const cashBtn = document.querySelector('[data-modal-open="cash-register-modal"]');
    if (cashBtn) {
        cashBtn.addEventListener('click', () => {
            openCashRegisterModal();
        });
    }
}

/**
 * Update theme icon based on current theme
 */
function updateThemeIcon(button) {
    const icon = button.querySelector('.material-symbols-outlined');
    if (icon) {
        const isDark = document.documentElement.classList.contains('dark');
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
}

/**
 * Load shift status from Firebase
 */
async function loadShiftStatus() {
    if (!EmployeeDashboardState.user) return;

    try {
        const { getUserActiveShift, subscribeToUserShift } = await import('../firebase-config.js');

        // Get current active shift
        const activeShift = await getUserActiveShift(EmployeeDashboardState.user.id);

        if (activeShift) {
            EmployeeDashboardState.activeShift = activeShift;
            showActiveShiftUI(activeShift);
        } else {
            showNoShiftUI();
        }

        // Subscribe to real-time updates
        const unsubscribe = subscribeToUserShift(EmployeeDashboardState.user.id, (shift) => {
            if (shift) {
                EmployeeDashboardState.activeShift = shift;
                showActiveShiftUI(shift);
            } else {
                EmployeeDashboardState.activeShift = null;
                showNoShiftUI();
            }
        });

        // Store unsubscribe function for cleanup
        if (window.App?.state?.unsubscribers) {
            window.App.state.unsubscribers.push(unsubscribe);
        }
    } catch (error) {
        console.error('Error loading shift status:', error);
    }
}

/**
 * Show active shift UI
 */
function showActiveShiftUI(shift) {
    const noShift = document.getElementById('no-shift');
    const activeShift = document.getElementById('active-shift');

    if (noShift) noShift.classList.add('hidden');
    if (activeShift) activeShift.classList.remove('hidden');

    // Update shift info
    updateShiftInfo(shift);

    // Start timer
    startShiftTimer(shift.startTime);

    // Update stats
    updateDashboardStats(shift);
}

/**
 * Show no shift UI
 */
function showNoShiftUI() {
    const noShift = document.getElementById('no-shift');
    const activeShift = document.getElementById('active-shift');

    if (noShift) noShift.classList.remove('hidden');
    if (activeShift) activeShift.classList.add('hidden');

    // Stop timer
    stopShiftTimer();

    // Reset stats
    resetDashboardStats();
}

/**
 * Update shift information display
 */
function updateShiftInfo(shift) {
    const startTime = document.getElementById('shift-start-time');
    const initialCash = document.getElementById('shift-initial-cash');

    if (startTime) {
        const date = new Date(shift.startTime);
        startTime.textContent = date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    if (initialCash) {
        initialCash.textContent = formatCurrency(shift.initialCash || 0);
    }
}

/**
 * Start shift timer
 */
function startShiftTimer(startTime) {
    // Clear existing timer
    stopShiftTimer();

    EmployeeDashboardState.shiftStartTime = startTime;

    function updateTimer() {
        const now = Date.now();
        const diff = now - startTime;

        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        const timerEl = document.getElementById('shift-timer');
        if (timerEl) {
            timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateTimer();
    EmployeeDashboardState.timerInterval = setInterval(updateTimer, 1000);
}

/**
 * Stop shift timer
 */
function stopShiftTimer() {
    if (EmployeeDashboardState.timerInterval) {
        clearInterval(EmployeeDashboardState.timerInterval);
        EmployeeDashboardState.timerInterval = null;
    }
}

/**
 * Update dashboard stats
 */
function updateDashboardStats(shift) {
    const todaySales = document.getElementById('today-sales');
    const todayOrders = document.getElementById('today-orders');

    if (todaySales) {
        todaySales.textContent = formatCurrency(shift.totalSales || 0);
    }

    if (todayOrders) {
        todayOrders.textContent = shift.salesCount || 0;
    }
}

/**
 * Reset dashboard stats
 */
function resetDashboardStats() {
    const todaySales = document.getElementById('today-sales');
    const todayOrders = document.getElementById('today-orders');

    if (todaySales) todaySales.textContent = 'R$ 0,00';
    if (todayOrders) todayOrders.textContent = '0';
}

/**
 * Load collaborators
 */
async function loadCollaborators() {
    const list = document.getElementById('collaborators-list');
    const countBadge = document.getElementById('active-collaborators-count');

    if (!list) return;

    try {
        const { getActiveCollaborators } = await import('../firebase-config.js');
        const collaborators = await getActiveCollaborators();

        if (countBadge) {
            countBadge.textContent = `${collaborators.length} ativos`;
        }

        if (collaborators.length === 0) {
            list.innerHTML = `
                <div class="empty-state py-8">
                    <div class="empty-state-icon">
                        <span class="material-symbols-outlined">group_off</span>
                    </div>
                    <h3>Nenhum colaborador</h3>
                    <p>Nao ha colaboradores ativos no momento</p>
                </div>
            `;
            return;
        }

        list.innerHTML = collaborators.map(collab => `
            <div class="collaborator-item">
                <div class="collaborator-info">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(collab.name)}&background=random"
                         alt="${collab.name}"
                         class="collaborator-avatar ${collab.status === 'active' ? 'active' : ''}">
                    <div>
                        <p class="collaborator-name">${collab.name}</p>
                        <p class="collaborator-role">${collab.role || 'Colaborador'}</p>
                    </div>
                </div>
                <span class="collaborator-status ${collab.status || 'active'}">
                    ${collab.status === 'active' ? 'Ativo' : collab.status === 'paused' ? 'Pausa' : 'Offline'}
                </span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading collaborators:', error);
        if (countBadge) countBadge.textContent = '0 ativos';
    }
}

/**
 * Load recent activity
 */
function loadRecentActivity() {
    const activityContainer = document.getElementById('recent-activity');
    if (!activityContainer) return;

    // For now, show static activity
    // In a real app, this would fetch from Firebase
    const activities = [
        {
            time: 'Agora',
            text: 'Voce acessou o sistema',
            type: 'info'
        }
    ];

    const timeline = activityContainer.querySelector('.timeline');
    if (timeline) {
        timeline.innerHTML = activities.map(activity => `
            <div class="timeline-item">
                <div class="timeline-dot ${activity.type === 'info' ? '' : 'muted'}"></div>
                <p class="timeline-time">${activity.time}</p>
                <p class="timeline-content">${activity.text}</p>
            </div>
        `).join('');
    }
}

/**
 * Open products modal
 */
function openProductsModal() {
    window.App?.showToast('Produtos em breve!', 'info');
}

/**
 * Open cash register modal
 */
function openCashRegisterModal() {
    window.App?.showToast('Caixa em breve!', 'info');
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
 * Cleanup on page leave
 */
export function cleanupEmployeeDashboard() {
    stopShiftTimer();
}

// Export for global access
window.EmployeeDashboard = {
    init: initEmployeeDashboard,
    cleanup: cleanupEmployeeDashboard
};
