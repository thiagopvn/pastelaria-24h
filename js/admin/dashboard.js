/**
 * Admin Dashboard Module
 * Handles admin dashboard functionality and statistics
 */

// Dashboard State
const AdminDashboardState = {
    period: 'today',
    stats: {
        totalSales: 0,
        averageTicket: 0,
        divergences: 0,
        activeShifts: 0
    },
    activeShifts: [],
    alerts: [],
    unsubscribers: []
};

/**
 * Initialize Admin Dashboard
 */
export function initAdminDashboard() {
    console.log('Initializing admin dashboard...');

    // Setup period selector
    setupPeriodSelector();

    // Setup bottom navigation
    setupBottomNavigation();

    // Load dashboard data
    loadDashboardStats();

    // Load active shifts
    loadActiveShifts();

    // Load alerts
    loadAlerts();

    // Load recent activity
    loadRecentActivity();
}

/**
 * Setup period selector
 */
function setupPeriodSelector() {
    const periodButtons = document.querySelectorAll('.period-option');

    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update period
            AdminDashboardState.period = btn.textContent.toLowerCase();

            // Reload data
            loadDashboardStats();
        });
    });
}

/**
 * Setup bottom navigation
 */
function setupBottomNavigation() {
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
 * Load dashboard statistics
 */
async function loadDashboardStats() {
    try {
        const { getDashboardStats } = await import('../firebase-config.js');
        const stats = await getDashboardStats(AdminDashboardState.period);

        if (stats) {
            AdminDashboardState.stats = stats;
            updateStatsUI(stats);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Show placeholder data on error
        updateStatsUI(AdminDashboardState.stats);
    }
}

/**
 * Update statistics UI
 */
function updateStatsUI(stats) {
    // Total Sales
    const totalSalesEl = document.querySelector('.stats-card:nth-child(1) .stats-card-value');
    if (totalSalesEl) {
        totalSalesEl.textContent = formatCurrency(stats.totalSales || 0);
    }

    // Average Ticket
    const avgTicketEl = document.querySelector('.stats-card:nth-child(2) .stats-card-value');
    if (avgTicketEl) {
        avgTicketEl.textContent = formatCurrency(stats.averageTicket || 0);
    }

    // Divergences
    const divergenceEl = document.querySelector('.stats-card:nth-child(3) .stats-card-value');
    if (divergenceEl) {
        const value = stats.divergences || 0;
        divergenceEl.textContent = `${value < 0 ? '-' : ''}${formatCurrency(Math.abs(value))}`;
    }

    // Active Shifts
    const activeShiftsEl = document.querySelector('.stats-card:nth-child(4) .stats-card-value');
    if (activeShiftsEl) {
        activeShiftsEl.textContent = stats.activeShifts || 0;
    }
}

/**
 * Load active shifts
 */
async function loadActiveShifts() {
    const shiftsContainer = document.querySelector('.shift-item')?.parentElement;
    if (!shiftsContainer) return;

    try {
        const { subscribeToActiveShifts } = await import('../firebase-config.js');

        const unsubscribe = subscribeToActiveShifts((shifts) => {
            AdminDashboardState.activeShifts = shifts;
            renderActiveShifts(shifts, shiftsContainer);

            // Update active shifts count
            const countEl = shiftsContainer.previousElementSibling?.querySelector('.text-success');
            if (countEl) {
                countEl.textContent = `${shifts.length} ativos`;
            }
        });

        AdminDashboardState.unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error loading active shifts:', error);
    }
}

/**
 * Render active shifts list
 */
function renderActiveShifts(shifts, container) {
    if (shifts.length === 0) {
        container.innerHTML = `
            <div class="p-6 text-center">
                <span class="material-symbols-outlined text-4xl text-muted mb-2">group_off</span>
                <p class="text-muted text-sm">Nenhum turno ativo no momento</p>
            </div>
        `;
        return;
    }

    container.innerHTML = shifts.map(shift => `
        <div class="shift-item">
            <div class="shift-user">
                <div class="shift-avatar-wrapper">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(shift.userName || 'User')}&background=random"
                         alt="${shift.userName}"
                         class="shift-avatar">
                    <div class="shift-status ${shift.status || 'active'}"></div>
                </div>
                <div class="shift-info">
                    <h4>${shift.userName || 'Usuario'}</h4>
                    <p class="shift-meta">${shift.role || 'Funcionario'} • ${formatDuration(shift.startTime)}</p>
                </div>
            </div>
            <button class="shift-action" onclick="AdminDashboard.viewShiftDetails('${shift.id}')">Ver</button>
        </div>
    `).join('');
}

/**
 * Load alerts and divergences
 */
async function loadAlerts() {
    const alertsContainer = document.querySelector('.alert-card')?.parentElement;
    if (!alertsContainer) return;

    try {
        const { getRecentAlerts } = await import('../firebase-config.js');
        const alerts = await getRecentAlerts();

        if (alerts && alerts.length > 0) {
            AdminDashboardState.alerts = alerts;
            renderAlerts(alerts, alertsContainer);

            // Update badge
            const badge = alertsContainer.previousElementSibling?.querySelector('.badge');
            if (badge) {
                badge.textContent = `${alerts.length} Novos`;
            }
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

/**
 * Render alerts
 */
function renderAlerts(alerts, container) {
    container.innerHTML = alerts.map(alert => `
        <div class="alert-card ${alert.type || 'warning'}">
            <div class="alert-card-icon">
                <span class="material-symbols-outlined">${getAlertIcon(alert.type)}</span>
            </div>
            <div class="alert-card-content">
                <h4>${alert.title}</h4>
                <p>${alert.message}</p>
            </div>
        </div>
    `).join('');
}

/**
 * Get alert icon based on type
 */
function getAlertIcon(type) {
    switch (type) {
        case 'error':
            return 'error';
        case 'warning':
            return 'warning';
        case 'info':
            return 'info';
        case 'success':
            return 'check_circle';
        default:
            return 'warning';
    }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
    const activityContainer = document.querySelector('.timeline');
    if (!activityContainer) return;

    try {
        const { getRecentActivity } = await import('../firebase-config.js');
        const activities = await getRecentActivity(5);

        if (activities && activities.length > 0) {
            renderActivity(activities, activityContainer);
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

/**
 * Render activity timeline
 */
function renderActivity(activities, container) {
    container.innerHTML = activities.map((activity, index) => `
        <div class="timeline-item">
            <div class="timeline-dot ${index === 0 ? '' : 'muted'}"></div>
            <p class="timeline-time">${formatActivityTime(activity.timestamp)}</p>
            <p class="timeline-content">${activity.description}</p>
        </div>
    `).join('');
}

/**
 * Format activity time
 */
function formatActivityTime(timestamp) {
    if (!timestamp) return 'Agora';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `Ha ${minutes} min`;

    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format shift duration
 */
function formatDuration(startTime) {
    if (!startTime) return '00:00h';

    const now = Date.now();
    const diff = now - startTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}h`;
}

/**
 * View shift details
 */
function viewShiftDetails(shiftId) {
    const shift = AdminDashboardState.activeShifts.find(s => s.id === shiftId);

    if (!shift) {
        window.App?.showToast('Turno nao encontrado', 'warning');
        return;
    }

    // Navigate to shift details or open modal
    window.App?.showToast(`Turno de ${shift.userName}`, 'info');
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
export function cleanupAdminDashboard() {
    // Unsubscribe from all listeners
    AdminDashboardState.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') {
            unsub();
        }
    });
    AdminDashboardState.unsubscribers = [];
}

// Export for global access
window.AdminDashboard = {
    init: initAdminDashboard,
    cleanup: cleanupAdminDashboard,
    viewShiftDetails
};
