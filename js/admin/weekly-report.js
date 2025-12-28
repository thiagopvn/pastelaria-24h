/**
 * Weekly Report Module
 * Handles weekly employee payroll reports
 */

// State
const WeeklyReportState = {
    currentWeek: {
        start: null,
        end: null,
        weekNumber: 0
    },
    employees: [],
    globalSettings: {
        hourlyRate: 15,
        mealAllowance: 25
    },
    adjustments: {},
    isLoading: false,
    unsubscribers: []
};

/**
 * Initialize Weekly Report
 */
export function initWeeklyReport() {
    console.log('Initializing weekly report...');

    // Initialize current week
    initializeCurrentWeek();

    // Setup navigation
    setupNavigation();

    // Setup date navigator
    setupDateNavigator();

    // Setup global settings
    setupGlobalSettings();

    // Setup load data button
    setupLoadDataButton();

    // Setup action buttons
    setupActionButtons();

    // Load employees
    loadEmployees();
}

/**
 * Initialize current week
 */
function initializeCurrentWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    WeeklyReportState.currentWeek = {
        start: monday.getTime(),
        end: sunday.getTime(),
        weekNumber: getWeekNumber(now)
    };

    updateDateNavigatorUI();
}

/**
 * Get week number
 */
function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Update date navigator UI
 */
function updateDateNavigatorUI() {
    const { start, end, weekNumber } = WeeklyReportState.currentWeek;

    const startDate = new Date(start);
    const endDate = new Date(end);

    const dateRange = document.querySelector('.flex.flex-col.items-center .text-sm.font-semibold');
    const weekInfo = document.querySelector('.flex.flex-col.items-center .text-xs.text-muted');

    if (dateRange) {
        dateRange.textContent = `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
    }

    if (weekInfo) {
        weekInfo.textContent = `Semana ${weekNumber}, ${startDate.getFullYear()}`;
    }
}

/**
 * Format short date
 */
function formatShortDate(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
    }).replace('.', '');
}

/**
 * Setup navigation
 */
function setupNavigation() {
    // Back button
    document.querySelector('[data-nav="admin-dashboard"]')?.addEventListener('click', () => {
        window.App?.navigateTo('admin-dashboard');
    });

    // Bottom nav (if exists)
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
 * Setup date navigator
 */
function setupDateNavigator() {
    const navButtons = document.querySelectorAll('.flex.items-center.justify-between button');

    if (navButtons.length >= 2) {
        // Previous week
        navButtons[0].addEventListener('click', () => {
            navigateWeek(-1);
        });

        // Next week
        navButtons[1].addEventListener('click', () => {
            navigateWeek(1);
        });
    }
}

/**
 * Navigate week
 */
function navigateWeek(direction) {
    const { start, end } = WeeklyReportState.currentWeek;

    const newStart = new Date(start);
    newStart.setDate(newStart.getDate() + (direction * 7));

    const newEnd = new Date(end);
    newEnd.setDate(newEnd.getDate() + (direction * 7));

    WeeklyReportState.currentWeek = {
        start: newStart.getTime(),
        end: newEnd.getTime(),
        weekNumber: getWeekNumber(newStart)
    };

    updateDateNavigatorUI();
    loadEmployees();
}

/**
 * Setup global settings
 */
function setupGlobalSettings() {
    const settingsInputs = document.querySelectorAll('details input[type="number"]');

    if (settingsInputs.length >= 2) {
        // Hourly rate
        settingsInputs[0].value = WeeklyReportState.globalSettings.hourlyRate;
        settingsInputs[0].addEventListener('change', (e) => {
            WeeklyReportState.globalSettings.hourlyRate = parseFloat(e.target.value) || 15;
            recalculateAllEmployees();
        });

        // Meal allowance
        settingsInputs[1].value = WeeklyReportState.globalSettings.mealAllowance;
        settingsInputs[1].addEventListener('change', (e) => {
            WeeklyReportState.globalSettings.mealAllowance = parseFloat(e.target.value) || 25;
            recalculateAllEmployees();
        });
    }
}

/**
 * Setup load data button
 */
function setupLoadDataButton() {
    const loadBtn = document.getElementById('load-data-btn');

    if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
            loadBtn.disabled = true;
            loadBtn.innerHTML = '<span class="spinner"></span> Carregando...';

            await loadEmployees();

            loadBtn.disabled = false;
            loadBtn.innerHTML = `
                <span class="material-symbols-outlined">sync</span>
                Carregar Dados da Folha
            `;

            window.App?.showToast('Dados carregados com sucesso!', 'success');
        });
    }
}

/**
 * Setup action buttons
 */
function setupActionButtons() {
    const actionButtons = document.querySelectorAll('.fixed.bottom-0 button');

    actionButtons.forEach(btn => {
        const icon = btn.querySelector('.material-symbols-outlined')?.textContent;

        btn.addEventListener('click', () => {
            if (icon === 'save') {
                saveReport();
            } else if (icon === 'picture_as_pdf') {
                exportPDF();
            } else if (icon === 'table_view') {
                exportExcel();
            }
        });
    });
}

/**
 * Load employees
 */
async function loadEmployees() {
    const container = document.querySelector('.space-y-4:has(.card.overflow-hidden)');
    if (!container) return;

    try {
        const { getWeeklyReportData } = await import('../firebase-config.js');
        const { start, end } = WeeklyReportState.currentWeek;

        const data = await getWeeklyReportData(start, end);

        if (data && data.employees) {
            WeeklyReportState.employees = data.employees;
            renderEmployees(data.employees, container);
            updateTotalPayment();
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

/**
 * Render employees
 */
function renderEmployees(employees, container) {
    if (employees.length === 0) {
        container.innerHTML = `
            <div class="card p-6 text-center">
                <span class="material-symbols-outlined text-4xl text-muted mb-2">group_off</span>
                <p class="text-muted text-sm">Nenhum funcionario encontrado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = employees.map(employee => `
        <div class="card overflow-hidden" data-employee-id="${employee.id}">
            <div class="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-background-light/50 dark:bg-background-dark/50">
                <div class="flex items-center gap-3">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name || 'User')}&background=random"
                         alt="${employee.name}"
                         class="w-10 h-10 rounded-full">
                    <div>
                        <h3 class="font-bold leading-tight">${employee.name || 'Funcionario'}</h3>
                        <p class="text-xs text-muted">${employee.role || 'Cargo'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-muted">A Pagar</div>
                    <div class="text-lg font-bold text-success employee-total" data-employee-id="${employee.id}">
                        ${formatCurrency(calculateEmployeeTotal(employee))}
                    </div>
                </div>
            </div>
            <div class="p-4">
                <div class="grid grid-cols-2 gap-y-3 gap-x-4 mb-4">
                    <div class="flex flex-col">
                        <span class="text-xs uppercase tracking-wider text-muted font-medium">Horas Trabalhadas</span>
                        <span class="text-sm font-semibold">${employee.hoursWorked || 0}h</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs uppercase tracking-wider text-muted font-medium">Transporte</span>
                        <span class="text-sm font-semibold">${formatCurrency(employee.transport || 0)}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs uppercase tracking-wider text-muted font-medium">Alimentacao</span>
                        <span class="text-sm font-semibold">${formatCurrency(employee.meals || 0)}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs uppercase tracking-wider text-muted font-medium">Consumo Loja</span>
                        <span class="text-sm font-semibold">${formatCurrency(employee.storeConsumption || 0)}</span>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-border-light dark:border-border-dark">
                    <div class="space-y-1">
                        <label class="text-xs font-medium text-success flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">add_circle</span>
                            Adicional
                        </label>
                        <div class="relative">
                            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">R$</span>
                            <input type="number"
                                   class="input pl-7 text-sm h-9 adjustment-input"
                                   data-employee-id="${employee.id}"
                                   data-type="bonus"
                                   placeholder="0,00"
                                   value="${WeeklyReportState.adjustments[employee.id]?.bonus || ''}">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-medium text-danger flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">remove_circle</span>
                            Desconto
                        </label>
                        <div class="relative">
                            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">R$</span>
                            <input type="number"
                                   class="input pl-7 text-sm h-9 adjustment-input"
                                   data-employee-id="${employee.id}"
                                   data-type="discount"
                                   placeholder="0,00"
                                   value="${WeeklyReportState.adjustments[employee.id]?.discount || ''}">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Setup adjustment input listeners
    document.querySelectorAll('.adjustment-input').forEach(input => {
        input.addEventListener('change', handleAdjustmentChange);
    });
}

/**
 * Handle adjustment change
 */
function handleAdjustmentChange(e) {
    const employeeId = e.target.dataset.employeeId;
    const type = e.target.dataset.type;
    const value = parseFloat(e.target.value) || 0;

    if (!WeeklyReportState.adjustments[employeeId]) {
        WeeklyReportState.adjustments[employeeId] = {};
    }

    WeeklyReportState.adjustments[employeeId][type] = value;

    // Update employee total
    const employee = WeeklyReportState.employees.find(e => e.id === employeeId);
    if (employee) {
        const totalEl = document.querySelector(`.employee-total[data-employee-id="${employeeId}"]`);
        if (totalEl) {
            totalEl.textContent = formatCurrency(calculateEmployeeTotal(employee));
        }
    }

    updateTotalPayment();
}

/**
 * Calculate employee total
 */
function calculateEmployeeTotal(employee) {
    const { hourlyRate } = WeeklyReportState.globalSettings;
    const adjustments = WeeklyReportState.adjustments[employee.id] || {};

    const baseSalary = (employee.hoursWorked || 0) * hourlyRate;
    const transport = employee.transport || 0;
    const meals = employee.meals || 0;
    const storeConsumption = employee.storeConsumption || 0;
    const bonus = adjustments.bonus || 0;
    const discount = adjustments.discount || 0;

    return baseSalary + transport + meals - storeConsumption + bonus - discount;
}

/**
 * Recalculate all employees
 */
function recalculateAllEmployees() {
    WeeklyReportState.employees.forEach(employee => {
        const totalEl = document.querySelector(`.employee-total[data-employee-id="${employee.id}"]`);
        if (totalEl) {
            totalEl.textContent = formatCurrency(calculateEmployeeTotal(employee));
        }
    });

    updateTotalPayment();
}

/**
 * Update total payment
 */
function updateTotalPayment() {
    const total = WeeklyReportState.employees.reduce((sum, employee) => {
        return sum + calculateEmployeeTotal(employee);
    }, 0);

    const totalEl = document.querySelector('.text-xs.text-muted:has(+ .card)');
    if (totalEl) {
        totalEl.textContent = `Total: ${formatCurrency(total)}`;
    }

    // Also update employee count
    const countEl = document.querySelector('.text-sm.font-bold.text-muted');
    if (countEl) {
        countEl.textContent = `Funcionarios (${WeeklyReportState.employees.length})`;
    }
}

/**
 * Save report
 */
async function saveReport() {
    WeeklyReportState.isLoading = true;

    try {
        const { saveWeeklyReport } = await import('../firebase-config.js');

        const reportData = {
            week: WeeklyReportState.currentWeek,
            globalSettings: WeeklyReportState.globalSettings,
            employees: WeeklyReportState.employees.map(employee => ({
                ...employee,
                adjustments: WeeklyReportState.adjustments[employee.id] || {},
                totalPayment: calculateEmployeeTotal(employee)
            })),
            savedAt: Date.now()
        };

        await saveWeeklyReport(reportData);

        window.App?.showToast('Relatorio salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Error saving report:', error);
        window.App?.showToast('Erro ao salvar relatorio', 'danger');
    } finally {
        WeeklyReportState.isLoading = false;
    }
}

/**
 * Export PDF
 */
function exportPDF() {
    window.App?.showToast('Exportacao PDF em breve!', 'info');
}

/**
 * Export Excel
 */
function exportExcel() {
    window.App?.showToast('Exportacao Excel em breve!', 'info');
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
export function cleanupWeeklyReport() {
    WeeklyReportState.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') {
            unsub();
        }
    });
    WeeklyReportState.unsubscribers = [];
}

// Export for global access
window.WeeklyReport = {
    init: initWeeklyReport,
    cleanup: cleanupWeeklyReport
};
