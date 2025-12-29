/**
 * Main Application JavaScript
 * Pastelaria 24h - Sistema de Gestao de Turnos
 */

// Application State
const AppState = {
    currentUser: null,
    currentPage: 'auth',
    isLoading: false,
    theme: localStorage.getItem('theme') || 'dark',
    isOnline: navigator.onLine,
    activeShift: null,
    unsubscribers: []
};

// DOM Elements Cache
const DOM = {};

// Initialize Application
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('Initializing Pastelaria 24h...');

    // Cache DOM elements
    cacheDOM();

    // Setup theme
    setupTheme();

    // Setup event listeners
    setupEventListeners();

    // Setup online status
    setupOnlineStatus();

    // Initialize Firebase Auth listener
    initAuthListener();
}

function cacheDOM() {
    DOM.app = document.getElementById('app');
    DOM.loadingScreen = document.getElementById('loading-screen');
    DOM.toast = document.getElementById('toast');
}

function setupTheme() {
    document.documentElement.classList.toggle('dark', AppState.theme === 'dark');
    document.documentElement.classList.toggle('light', AppState.theme === 'light');
}

function toggleTheme() {
    AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', AppState.theme);
    setupTheme();
}

function setupEventListeners() {
    // Global click handler for navigation
    document.addEventListener('click', handleGlobalClick);

    // Form submissions
    document.addEventListener('submit', handleFormSubmit);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
}

function handleGlobalClick(e) {
    // Handle navigation links
    const navLink = e.target.closest('[data-nav]');
    if (navLink) {
        e.preventDefault();
        const page = navLink.dataset.nav;
        navigateTo(page);
    }

    // Handle modal close
    const modalClose = e.target.closest('[data-modal-close]');
    if (modalClose) {
        closeModal(modalClose.dataset.modalClose);
    }

    // Handle modal open
    const modalOpen = e.target.closest('[data-modal-open]');
    if (modalOpen) {
        openModal(modalOpen.dataset.modalOpen);
    }

    // Handle backdrop click to close modal
    if (e.target.classList.contains('modal-overlay')) {
        closeAllModals();
    }

    // Handle theme toggle
    const themeToggle = e.target.closest('[data-theme-toggle]');
    if (themeToggle) {
        toggleTheme();
    }

    // Handle logout
    const logoutBtn = e.target.closest('[data-logout]');
    if (logoutBtn) {
        handleLogout();
    }
}

function handleFormSubmit(e) {
    const form = e.target;

    // Handle login form
    if (form.id === 'login-form') {
        e.preventDefault();
        handleLogin(form);
    }

    // Handle register form
    if (form.id === 'register-form') {
        e.preventDefault();
        handleRegister(form);
    }
}

function handleKeyDown(e) {
    // ESC to close modals
    if (e.key === 'Escape') {
        closeAllModals();
    }
}

function setupOnlineStatus() {
    window.addEventListener('online', () => {
        AppState.isOnline = true;
        showToast('Conexao restaurada', 'success');
    });

    window.addEventListener('offline', () => {
        AppState.isOnline = false;
        showToast('Voce esta offline', 'warning');
    });
}

// Auth Functions
async function initAuthListener() {
    const { auth, onAuthStateChanged, getCurrentUserData } = await import('./firebase-config.js');

    onAuthStateChanged(auth, async (user) => {
        hideLoading();

        if (user) {
            AppState.currentUser = await getCurrentUserData();

            if (AppState.currentUser) {
                const isAdmin = AppState.currentUser.role === 'admin';
                navigateTo(isAdmin ? 'admin-dashboard' : 'employee-dashboard');
            } else {
                // User exists in Auth but not in Firestore - new user needs profile
                navigateTo('auth');
            }
        } else {
            AppState.currentUser = null;
            navigateTo('auth');
        }
    });
}

async function handleLogin(form) {
    const email = form.querySelector('#login-email').value;
    const password = form.querySelector('#login-password').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('login-error');

    if (!email || !password) {
        showFormError(errorDiv, 'Preencha todos os campos');
        return;
    }

    setButtonLoading(submitBtn, true);
    hideFormError(errorDiv);

    try {
        const { auth, signInWithEmailAndPassword } = await import('./firebase-config.js');
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Login realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        let message = 'Erro ao fazer login';

        switch (error.code) {
            case 'auth/user-not-found':
                message = 'Usuario nao encontrado';
                break;
            case 'auth/wrong-password':
                message = 'Senha incorreta';
                break;
            case 'auth/invalid-email':
                message = 'Email invalido';
                break;
            case 'auth/too-many-requests':
                message = 'Muitas tentativas. Tente novamente mais tarde';
                break;
            case 'auth/invalid-credential':
                message = 'Email ou senha incorretos';
                break;
        }

        showFormError(errorDiv, message);
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function handleRegister(form) {
    const name = form.querySelector('#register-name').value;
    const email = form.querySelector('#register-email').value;
    const password = form.querySelector('#register-password').value;
    const confirmPassword = form.querySelector('#register-confirm-password').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('register-error');

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showFormError(errorDiv, 'Preencha todos os campos');
        return;
    }

    if (password !== confirmPassword) {
        showFormError(errorDiv, 'As senhas nao coincidem');
        return;
    }

    if (password.length < 6) {
        showFormError(errorDiv, 'A senha deve ter pelo menos 6 caracteres');
        return;
    }

    setButtonLoading(submitBtn, true);
    hideFormError(errorDiv);

    try {
        const {
            auth,
            createUserWithEmailAndPassword,
            updateProfile,
            saveUserData,
            serverTimestamp
        } = await import('./firebase-config.js');

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile with name
        await updateProfile(user, { displayName: name });

        // Save user data to Firestore
        await saveUserData(user.uid, {
            name: name,
            email: email,
            role: 'staff', // Default role
            transport: null,
            photoURL: null,
            createdAt: serverTimestamp(),
            active: true
        });

        showToast('Conta criada com sucesso!', 'success');
    } catch (error) {
        console.error('Register error:', error);
        let message = 'Erro ao criar conta';

        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'Este email ja esta em uso';
                break;
            case 'auth/invalid-email':
                message = 'Email invalido';
                break;
            case 'auth/weak-password':
                message = 'Senha muito fraca';
                break;
        }

        showFormError(errorDiv, message);
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function handleLogout() {
    try {
        // Cleanup subscriptions
        cleanupSubscriptions();

        const { auth, signOut } = await import('./firebase-config.js');
        await signOut(auth);
        showToast('Logout realizado', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Erro ao fazer logout', 'danger');
    }
}

// Cleanup subscriptions
function cleanupSubscriptions() {
    AppState.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') {
            unsub();
        }
    });
    AppState.unsubscribers = [];
}

// Navigation
function navigateTo(page) {
    // Cleanup previous page subscriptions
    cleanupSubscriptions();

    AppState.currentPage = page;

    // Update URL without reload
    history.pushState({ page }, '', `#${page}`);

    // Load page content
    loadPage(page);

    // Update bottom nav active state
    updateNavActive(page);
}

async function loadPage(page) {
    showLoading();

    try {
        let html = '';

        switch (page) {
            case 'auth':
                html = await fetchView('views/auth/auth-page.html');
                break;
            case 'employee-dashboard':
                html = await fetchView('views/employee/dashboard.html');
                break;
            case 'admin-dashboard':
                html = await fetchView('views/admin/dashboard.html');
                break;
            case 'products':
                html = await fetchView('views/admin/products.html');
                break;
            case 'users':
                html = await fetchView('views/admin/users.html');
                break;
            case 'reports':
                html = await fetchView('views/admin/reports.html');
                break;
            case 'financial':
                html = await fetchView('views/admin/financial.html');
                break;
            case 'shift-corrections':
                html = await fetchView('views/admin/shift-corrections.html');
                break;
            default:
                html = '<div class="empty-state"><h3>Pagina nao encontrada</h3></div>';
        }

        if (DOM.app) {
            DOM.app.innerHTML = html;
            initPageScripts(page);
        }
    } catch (error) {
        console.error('Error loading page:', error);
        showToast('Erro ao carregar pagina', 'danger');
    } finally {
        hideLoading();
    }
}

async function fetchView(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error('View not found');
        return await response.text();
    } catch (error) {
        console.error('Error fetching view:', error);
        return '<div class="empty-state"><h3>Erro ao carregar</h3></div>';
    }
}

function initPageScripts(page) {
    // Initialize page-specific functionality
    switch (page) {
        case 'auth':
            initAuthPage();
            break;
        case 'admin-dashboard':
            initAdminDashboard();
            break;
        case 'employee-dashboard':
            initEmployeeDashboard();
            break;
        case 'products':
            initProductsPage();
            break;
        case 'users':
            initUsersPage();
            break;
        case 'financial':
            initFinancialPage();
            break;
        case 'reports':
            initReportsPage();
            break;
    }
}

function initAuthPage() {
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide forms
            if (target === 'login') {
                loginForm?.classList.remove('hidden');
                registerForm?.classList.add('hidden');
            } else {
                loginForm?.classList.add('hidden');
                registerForm?.classList.remove('hidden');
            }
        });
    });
}

// ==================== EMPLOYEE DASHBOARD ====================

async function initEmployeeDashboard() {
    console.log('Initializing employee dashboard...');

    // Update employee name
    const employeeName = document.getElementById('employee-name');
    if (employeeName && AppState.currentUser) {
        employeeName.textContent = AppState.currentUser.name || 'Funcionario';
    }

    // Load user's active shift
    await loadUserShift();

    // Load products for employee
    await loadEmployeeProducts();

    // Initialize shift forms
    initShiftForms();
}

async function loadEmployeeProducts() {
    try {
        const { subscribeToProductsRTDB } = await import('./firebase-config.js');

        const unsub = subscribeToProductsRTDB((products) => {
            console.log('Products loaded for employee:', products.length);
            AppState.products = products;
            renderEmployeeProducts(products);
        });

        AppState.unsubscribers.push(unsub);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderEmployeeProducts(products) {
    const container = document.getElementById('products-grid');
    if (!container) {
        console.log('products-grid not found, trying products-list');
        const altContainer = document.getElementById('products-list');
        if (!altContainer) return;
        renderProductsInList(altContainer, products);
        return;
    }

    if (products.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-muted col-span-full">
                <span class="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                <p>Nenhum produto disponivel</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card" data-product-id="${product.id}" onclick="App.selectProduct('${product.id}')">
            <div class="product-icon ${product.category === 'bebidas' ? 'drink' : 'food'}">
                <span class="material-symbols-outlined">${getProductIcon(product.category)}</span>
            </div>
            <h4 class="product-name">${product.name}</h4>
            <p class="product-price">${formatCurrency(product.price)}</p>
        </div>
    `).join('');
}

function renderProductsInList(container, products) {
    if (products.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-muted">
                <span class="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                <p>Nenhum produto disponivel</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-item" data-product-id="${product.id}">
            <div class="product-icon ${product.category === 'bebidas' ? 'drink' : 'food'}">
                <span class="material-symbols-outlined">${getProductIcon(product.category)}</span>
            </div>
            <div class="product-info">
                <span class="product-name">${product.name}</span>
                <span class="product-price">${formatCurrency(product.price)}</span>
            </div>
        </div>
    `).join('');
}

function getProductIcon(category) {
    switch (category?.toLowerCase()) {
        case 'bebidas': return 'local_drink';
        case 'lanches': return 'lunch_dining';
        case 'porcoes': return 'restaurant';
        case 'sobremesas': return 'cake';
        default: return 'restaurant';
    }
}

async function loadUserShift() {
    if (!AppState.currentUser) return;

    try {
        const { subscribeToUserShift, getUserActiveShift } = await import('./firebase-config.js');

        // Check for active shift
        const activeShift = await getUserActiveShift(AppState.currentUser.id);

        if (activeShift) {
            AppState.activeShift = activeShift;
            showActiveShift(activeShift);
        } else {
            showNoShift();
        }

        // Subscribe to real-time updates
        const unsub = subscribeToUserShift(AppState.currentUser.id, (shift) => {
            if (shift) {
                AppState.activeShift = shift;
                showActiveShift(shift);
                updateShiftStats(shift);
            } else {
                AppState.activeShift = null;
                showNoShift();
            }
        });

        AppState.unsubscribers.push(unsub);
    } catch (error) {
        console.error('Error loading shift:', error);
    }
}

function showActiveShift(shift) {
    const noShift = document.getElementById('no-shift');
    const activeShift = document.getElementById('active-shift');

    if (noShift) noShift.classList.add('hidden');
    if (activeShift) activeShift.classList.remove('hidden');

    // Update shift info
    const startTime = document.getElementById('shift-start-time');
    const initialCash = document.getElementById('shift-initial-cash');

    if (startTime) {
        startTime.textContent = new Date(shift.startTime).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    if (initialCash) {
        initialCash.textContent = formatCurrency(shift.initialCash);
    }

    // Start timer
    startShiftTimer(shift.startTime);

    // Update stats
    updateShiftStats(shift);
}

function showNoShift() {
    const noShift = document.getElementById('no-shift');
    const activeShift = document.getElementById('active-shift');

    if (noShift) noShift.classList.remove('hidden');
    if (activeShift) activeShift.classList.add('hidden');

    // Reset stats
    const todaySales = document.getElementById('today-sales');
    const todayOrders = document.getElementById('today-orders');

    if (todaySales) todaySales.textContent = 'R$ 0,00';
    if (todayOrders) todayOrders.textContent = '0';
}

function updateShiftStats(shift) {
    const todaySales = document.getElementById('today-sales');
    const todayOrders = document.getElementById('today-orders');

    if (todaySales) {
        todaySales.textContent = formatCurrency(shift.totalSales || 0);
    }

    if (todayOrders) {
        todayOrders.textContent = shift.salesCount || 0;
    }

    // Update collaborators
    updateCollaboratorsList(shift.collaborators);
}

function updateCollaboratorsList(collaborators) {
    const list = document.getElementById('collaborators-list');
    const countBadge = document.getElementById('active-collaborators-count');

    if (!list) return;

    const collabArray = collaborators ? Object.entries(collaborators) : [];

    if (countBadge) {
        countBadge.textContent = `${collabArray.length} ativos`;
    }

    if (collabArray.length === 0) {
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

    list.innerHTML = collabArray.map(([id, collab]) => `
        <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(collab.name)}&background=random"
                     alt="${collab.name}"
                     class="w-10 h-10 rounded-full">
                <div>
                    <p class="font-medium">${collab.name}</p>
                    <p class="text-xs text-muted">${collab.role || 'Colaborador'}</p>
                </div>
            </div>
            <span class="badge badge-success">Ativo</span>
        </div>
    `).join('');
}

let shiftTimerInterval;

function startShiftTimer(startTime) {
    if (shiftTimerInterval) {
        clearInterval(shiftTimerInterval);
    }

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
    shiftTimerInterval = setInterval(updateTimer, 1000);
}

function initShiftForms() {
    // Open Shift Form
    const openShiftForm = document.getElementById('open-shift-form');
    if (openShiftForm) {
        openShiftForm.addEventListener('submit', handleOpenShift);
    }

    // Close Shift Form
    const closeShiftForm = document.getElementById('close-shift-form');
    if (closeShiftForm) {
        closeShiftForm.addEventListener('submit', handleCloseShift);
    }
}

async function handleOpenShift(e) {
    e.preventDefault();

    const cash = document.getElementById('initial-cash').value;
    const coins = document.getElementById('initial-coins').value || 0;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!cash) {
        showToast('Informe o caixa inicial', 'warning');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const { openShift } = await import('./firebase-config.js');

        await openShift(
            AppState.currentUser.id,
            AppState.currentUser.name,
            cash,
            coins
        );

        showToast('Turno iniciado com sucesso!', 'success');
        closeModal('open-shift-modal');

        // Reset form
        e.target.reset();
    } catch (error) {
        console.error('Error opening shift:', error);
        showToast('Erro ao iniciar turno', 'danger');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function handleCloseShift(e) {
    if (e) e.preventDefault();

    if (!AppState.activeShift) {
        showToast('Nenhum turno ativo', 'danger');
        return;
    }

    await showCashRegisterModal();
}

async function showCashRegisterModal() {
    const shift = AppState.activeShift;
    if (!shift) return;

    // Calculate expected values
    const expectedCash = (shift.initialCash || 0) + (shift.totalSales || 0) - (shift.totalWithdrawals || 0);
    const totalSales = shift.totalSales || 0;

    // Get last shift's card values for calculation
    const { getLastClosedShiftCardValues, getMidnightCrossingInfo } = await import('./firebase-config.js');
    const previousCardValues = await getLastClosedShiftCardValues(shift.startTime);
    const midnightInfo = getMidnightCrossingInfo(shift.startTime);

    // Store for later use
    AppState.previousCardValues = previousCardValues;
    AppState.midnightInfo = midnightInfo;

    // Create modal
    let modal = document.getElementById('cash-register-modal');
    let overlay = document.getElementById('cash-register-modal-overlay');

    if (!modal) {
        overlay = document.createElement('div');
        overlay.id = 'cash-register-modal-overlay';
        overlay.className = 'modal-overlay';

        modal = document.createElement('div');
        modal.id = 'cash-register-modal';
        modal.className = 'fixed inset-0 z-50 bg-card-light dark:bg-card-dark overflow-y-auto';
        modal.style.display = 'none';

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    const startTime = new Date(shift.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const shiftDate = new Date(shift.startTime).toLocaleDateString('pt-BR');

    // Midnight crossing warning HTML
    const midnightWarningHtml = midnightInfo.crossesMidnight ? `
        <div class="card p-4 border-l-4 border-l-warning bg-warning/10 mb-4">
            <h3 class="font-semibold mb-2 flex items-center gap-2 text-warning">
                <span class="material-symbols-outlined">schedule</span>
                Turno Cruzou Meia-Noite
            </h3>
            <p class="text-sm text-warning/80 mb-2">
                Este turno iniciou em <strong>${midnightInfo.startDate}</strong> e esta sendo fechado em <strong>${midnightInfo.currentDate}</strong>.
            </p>
            <p class="text-xs text-muted">
                As maquininhas de cartao zeram a meia-noite. Se voce fez vendas ANTES da meia-noite,
                informe o valor que a maquininha mostrava as 23:59 no campo "Valor Pre-Meia-Noite".
            </p>
        </div>
    ` : '';

    // Previous values info HTML (only if same day and has previous values)
    const previousValuesInfoHtml = previousCardValues.exists && previousCardValues.sameDay ? `
        <div class="bg-blue-500/10 rounded-lg p-3 mb-3 text-sm">
            <p class="font-medium text-blue-600 dark:text-blue-400 mb-1">
                <span class="material-symbols-outlined text-sm align-middle">info</span>
                Valores acumulados do turno anterior (mesmo dia)
            </p>
            <div class="grid grid-cols-2 gap-2 text-xs text-muted">
                <span>Stone DC: ${formatCurrency(previousCardValues.stone_dc_cumulative)}</span>
                <span>Stone Voucher: ${formatCurrency(previousCardValues.stone_voucher_cumulative)}</span>
                <span>PagBank: ${formatCurrency(previousCardValues.pagbank_cumulative)}</span>
                <span>PIX: ${formatCurrency(previousCardValues.pix_cumulative)}</span>
            </div>
            <p class="text-xs text-muted mt-1">O sistema calculara automaticamente: Venda Real = Valor Atual - Valor Anterior</p>
        </div>
    ` : '';

    modal.innerHTML = `
        <div class="min-h-screen flex flex-col">
            <!-- Header -->
            <header class="sticky top-0 z-20 flex items-center justify-between h-16 px-4 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark">
                <button onclick="App.closeCashRegisterModal()" class="p-2 rounded-full hover:bg-background-light dark:hover:bg-background-dark">
                    <span class="material-symbols-outlined">close</span>
                </button>
                <div class="text-center">
                    <h1 class="font-semibold">Fechamento de Caixa</h1>
                    <span class="text-xs text-muted">${shiftDate} • ${startTime}</span>
                </div>
                <div class="w-10"></div>
            </header>

            <!-- Content -->
            <main class="flex-1 p-4 space-y-4 pb-32">
                ${midnightWarningHtml}

                <!-- Resumo do Turno -->
                <div class="card p-4 bg-primary/10 border-primary/20">
                    <h3 class="font-semibold text-primary mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined">info</span>
                        Resumo do Turno
                    </h3>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p class="text-muted">Caixa Inicial</p>
                            <p class="font-bold">${formatCurrency(shift.initialCash || 0)}</p>
                        </div>
                        <div>
                            <p class="text-muted">Total Vendas</p>
                            <p class="font-bold text-success">${formatCurrency(totalSales)}</p>
                        </div>
                        <div>
                            <p class="text-muted">Sangrias</p>
                            <p class="font-bold text-warning">${formatCurrency(shift.totalWithdrawals || 0)}</p>
                        </div>
                        <div>
                            <p class="text-muted">Esperado em Caixa</p>
                            <p class="font-bold text-primary">${formatCurrency(expectedCash)}</p>
                        </div>
                    </div>
                </div>

                <!-- Section 1: Total em Loja (Dinheiro) -->
                <div class="card p-4 border-l-4 border-l-primary">
                    <h3 class="font-semibold mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">storefront</span>
                        1. Total em Loja (Dinheiro)
                    </h3>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium mb-1">Cedulas (R$)</label>
                            <input type="number" id="cash-notes" step="0.01" min="0"
                                   class="w-full h-12 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-lg font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Moedas (R$)</label>
                            <input type="number" id="cash-coins" step="0.01" min="0"
                                   class="w-full h-12 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-lg font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                        </div>
                    </div>
                </div>

                <!-- Section 2: Retirada para Envelope -->
                <div class="card p-4 border-l-4 border-l-warning">
                    <h3 class="font-semibold mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-warning">payments</span>
                        2. Retirada p/ Envelope
                    </h3>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium mb-1">Cedulas Env. (R$)</label>
                            <input type="number" id="envelope-notes" step="0.01" min="0"
                                   class="w-full h-12 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-lg font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Moedas Env. (R$)</label>
                            <input type="number" id="envelope-coins" step="0.01" min="0"
                                   class="w-full h-12 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-lg font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                        </div>
                    </div>
                </div>

                <!-- Section 3: Fica em Caixa -->
                <div class="card p-4 border-l-4 border-l-success bg-success/5">
                    <h3 class="font-semibold mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-success">savings</span>
                        3. Fica em Caixa (Troco)
                    </h3>
                    <div class="bg-white dark:bg-background-dark rounded-lg p-3 border">
                        <div class="flex justify-between text-sm mb-2">
                            <span>Cedulas: <strong id="remaining-notes">R$ 0,00</strong></span>
                            <span>Moedas: <strong id="remaining-coins">R$ 0,00</strong></span>
                        </div>
                        <div class="border-t pt-2 flex justify-between items-center">
                            <span class="font-semibold">Total em Caixa</span>
                            <span id="remaining-total" class="text-xl font-bold text-success">R$ 0,00</span>
                        </div>
                    </div>
                </div>

                <!-- Section 4: Pagamentos em Cartao/Maquininha -->
                <div class="card p-4 border-l-4 border-l-purple-500">
                    <h3 class="font-semibold mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-purple-500">credit_card</span>
                        4. Valores das Maquininhas
                    </h3>
                    <p class="text-xs text-muted mb-3">Informe o valor que aparece no VISOR de cada maquininha agora.</p>
                    ${previousValuesInfoHtml}
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium mb-1">Stone DC (R$)</label>
                            <input type="number" id="card-stone-dc" step="0.01" min="0"
                                   class="w-full h-12 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-lg font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                            <p id="stone-dc-real" class="text-xs text-success mt-1 hidden"></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Stone Voucher (R$)</label>
                            <input type="number" id="card-stone-voucher" step="0.01" min="0"
                                   class="w-full h-12 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-lg font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                            <p id="stone-voucher-real" class="text-xs text-success mt-1 hidden"></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">PagBank (R$)</label>
                            <input type="number" id="card-pagbank" step="0.01" min="0"
                                   class="w-full h-12 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-lg font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                            <p id="pagbank-real" class="text-xs text-success mt-1 hidden"></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">PIX (R$)</label>
                            <input type="number" id="card-pix" step="0.01" min="0"
                                   class="w-full h-12 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-lg font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                            <p id="pix-real" class="text-xs text-success mt-1 hidden"></p>
                        </div>
                    </div>
                    <!-- Resumo das vendas reais calculadas -->
                    <div id="card-sales-summary" class="mt-3 p-3 bg-purple-500/10 rounded-lg hidden">
                        <div class="flex justify-between items-center">
                            <span class="font-semibold text-purple-600 dark:text-purple-400">Total Cartoes (Vendas Reais)</span>
                            <span id="total-cards-real" class="text-lg font-bold text-purple-600 dark:text-purple-400">R$ 0,00</span>
                        </div>
                    </div>
                </div>

                ${midnightInfo.crossesMidnight ? `
                <!-- Section 5: Valores Pre-Meia-Noite (apenas se cruzou meia-noite) -->
                <div class="card p-4 border-l-4 border-l-orange-500 bg-orange-500/5">
                    <h3 class="font-semibold mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-orange-500">nights_stay</span>
                        5. Vendas ANTES da Meia-Noite (Opcional)
                    </h3>
                    <p class="text-xs text-muted mb-3">
                        Se voce anotou o valor das maquininhas as 23:59, informe aqui.
                        Isso ajuda a registrar corretamente as vendas de cada dia fiscal.
                    </p>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium mb-1">Stone DC (23:59)</label>
                            <input type="number" id="midnight-stone-dc" step="0.01" min="0"
                                   class="w-full h-10 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-base font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Stone Voucher (23:59)</label>
                            <input type="number" id="midnight-stone-voucher" step="0.01" min="0"
                                   class="w-full h-10 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-base font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">PagBank (23:59)</label>
                            <input type="number" id="midnight-pagbank" step="0.01" min="0"
                                   class="w-full h-10 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-base font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">PIX (23:59)</label>
                            <input type="number" id="midnight-pix" step="0.01" min="0"
                                   class="w-full h-10 px-3 rounded-lg border bg-background-light dark:bg-background-dark text-base font-medium text-right"
                                   placeholder="0,00" oninput="App.calculateCashRegister()">
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Divergencia (aparece se houver) -->
                <div id="divergence-alert" class="card p-4 border-l-4 border-l-danger bg-danger/5 hidden">
                    <h3 class="font-semibold mb-2 flex items-center gap-2 text-danger">
                        <span class="material-symbols-outlined">warning</span>
                        Divergencia Detectada
                    </h3>
                    <p class="text-sm mb-3">Diferenca: <strong id="divergence-value">R$ 0,00</strong></p>
                    <div>
                        <label class="block text-sm font-medium mb-1">Justificativa (obrigatoria)</label>
                        <textarea id="divergence-reason" rows="3"
                                  class="w-full px-3 py-2 rounded-lg border bg-background-light dark:bg-background-dark resize-none"
                                  placeholder="Descreva o motivo da diferenca..."></textarea>
                    </div>
                </div>

                <!-- Observacoes -->
                <div class="card p-4">
                    <label class="block text-sm font-medium mb-1">Observacoes (opcional)</label>
                    <textarea id="shift-notes" rows="2"
                              class="w-full px-3 py-2 rounded-lg border bg-background-light dark:bg-background-dark resize-none"
                              placeholder="Anotacoes sobre o turno..."></textarea>
                </div>
            </main>

            <!-- Footer -->
            <div class="fixed bottom-0 left-0 right-0 p-4 bg-card-light dark:bg-card-dark border-t border-border-light dark:border-border-dark">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-muted">Total Geral</span>
                    <span id="total-informed" class="text-xl font-bold">R$ 0,00</span>
                </div>
                <button onclick="App.confirmCloseShift()" class="btn btn-primary w-full h-12 text-lg font-semibold flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">check_circle</span>
                    Confirmar Fechamento
                </button>
            </div>
        </div>
    `;

    // Show modal
    overlay.classList.add('active');
    modal.style.display = 'block';
}

function closeCashRegisterModal() {
    const modal = document.getElementById('cash-register-modal');
    const overlay = document.getElementById('cash-register-modal-overlay');

    if (modal) modal.style.display = 'none';
    if (overlay) overlay.classList.remove('active');
}

async function calculateCashRegister() {
    const cashNotes = parseFloat(document.getElementById('cash-notes')?.value) || 0;
    const cashCoins = parseFloat(document.getElementById('cash-coins')?.value) || 0;
    const envelopeNotes = parseFloat(document.getElementById('envelope-notes')?.value) || 0;
    const envelopeCoins = parseFloat(document.getElementById('envelope-coins')?.value) || 0;

    // Card machine values
    const stoneDc = parseFloat(document.getElementById('card-stone-dc')?.value) || 0;
    const stoneVoucher = parseFloat(document.getElementById('card-stone-voucher')?.value) || 0;
    const pagbank = parseFloat(document.getElementById('card-pagbank')?.value) || 0;
    const pix = parseFloat(document.getElementById('card-pix')?.value) || 0;

    // Midnight values (if shift crosses midnight)
    const midnightStoneDc = parseFloat(document.getElementById('midnight-stone-dc')?.value) || 0;
    const midnightStoneVoucher = parseFloat(document.getElementById('midnight-stone-voucher')?.value) || 0;
    const midnightPagbank = parseFloat(document.getElementById('midnight-pagbank')?.value) || 0;
    const midnightPix = parseFloat(document.getElementById('midnight-pix')?.value) || 0;

    const remainingNotes = cashNotes - envelopeNotes;
    const remainingCoins = cashCoins - envelopeCoins;

    // Update cash displays
    document.getElementById('remaining-notes').textContent = formatCurrency(Math.max(0, remainingNotes));
    document.getElementById('remaining-coins').textContent = formatCurrency(Math.max(0, remainingCoins));
    document.getElementById('remaining-total').textContent = formatCurrency(Math.max(0, remainingNotes + remainingCoins));

    // Calculate real card sales using the function from firebase-config
    const shift = AppState.activeShift;
    if (!shift) return;

    const { calculateRealCardSales } = await import('./firebase-config.js');

    const currentCardValues = {
        stone_dc: stoneDc,
        stone_voucher: stoneVoucher,
        pagbank: pagbank,
        pix: pix
    };

    const previousCardValues = AppState.previousCardValues || {
        exists: false,
        sameDay: false,
        stone_dc_cumulative: 0,
        stone_voucher_cumulative: 0,
        pagbank_cumulative: 0,
        pix_cumulative: 0
    };

    const cardCalculations = calculateRealCardSales(currentCardValues, previousCardValues);

    // Update card real value displays
    const methods = [
        { id: 'stone-dc', key: 'stone_dc' },
        { id: 'stone-voucher', key: 'stone_voucher' },
        { id: 'pagbank', key: 'pagbank' },
        { id: 'pix', key: 'pix' }
    ];

    let totalCardsReal = 0;
    let hasCardValues = false;

    methods.forEach(({ id, key }) => {
        const realEl = document.getElementById(`${id}-real`);
        const cumulative = currentCardValues[key] || 0;
        const real = cardCalculations[`${key}_real`] || 0;
        const calcInfo = cardCalculations.calculations[key];

        if (cumulative > 0) {
            hasCardValues = true;
            totalCardsReal += real;

            if (realEl) {
                realEl.classList.remove('hidden');
                if (calcInfo?.type === 'subtraction') {
                    realEl.textContent = `Venda real: ${formatCurrency(real)} (${formatCurrency(cumulative)} - ${formatCurrency(calcInfo.previous)})`;
                } else if (calcInfo?.type === 'first_of_day') {
                    realEl.textContent = `Venda real: ${formatCurrency(real)} (primeiro turno do dia)`;
                } else if (calcInfo?.type === 'reset_detected') {
                    realEl.textContent = `Venda real: ${formatCurrency(real)} (reset detectado)`;
                } else {
                    realEl.textContent = `Venda real: ${formatCurrency(real)}`;
                }
            }
        } else if (realEl) {
            realEl.classList.add('hidden');
        }
    });

    // Update card sales summary
    const cardSummary = document.getElementById('card-sales-summary');
    const totalCardsEl = document.getElementById('total-cards-real');
    if (hasCardValues) {
        cardSummary?.classList.remove('hidden');
        if (totalCardsEl) totalCardsEl.textContent = formatCurrency(totalCardsReal);
    } else {
        cardSummary?.classList.add('hidden');
    }

    // Calculate total informed (cash + cards)
    const totalCashInformed = cashNotes + cashCoins;
    const totalInformed = totalCashInformed + totalCardsReal;
    document.getElementById('total-informed').textContent = formatCurrency(totalInformed);

    // Calculate divergence (comparing total informed with expected)
    const expectedCash = (shift.initialCash || 0) + (shift.totalSales || 0) - (shift.totalWithdrawals || 0);
    const divergence = totalCashInformed - expectedCash;

    const divergenceAlert = document.getElementById('divergence-alert');
    const divergenceValue = document.getElementById('divergence-value');

    if (Math.abs(divergence) > 0.5) {
        divergenceAlert?.classList.remove('hidden');
        if (divergenceValue) {
            divergenceValue.textContent = (divergence > 0 ? '+' : '') + formatCurrency(divergence);
            divergenceValue.className = divergence > 0 ? 'text-success font-bold' : 'text-danger font-bold';
        }
    } else {
        divergenceAlert?.classList.add('hidden');
    }

    // Store all closing data for submission
    AppState.closingData = {
        // Cash
        cashNotes,
        cashCoins,
        envelopeNotes,
        envelopeCoins,
        remainingNotes: Math.max(0, remainingNotes),
        remainingCoins: Math.max(0, remainingCoins),
        totalCashInformed: totalCashInformed,

        // Card machine values - CUMULATIVE (what the machine shows)
        stone_dc_cumulative: stoneDc,
        stone_voucher_cumulative: stoneVoucher,
        pagbank_cumulative: pagbank,
        pix_cumulative: pix,

        // Card machine values - REAL (calculated sales for this shift)
        stone_dc_real: cardCalculations.stone_dc_real,
        stone_voucher_real: cardCalculations.stone_voucher_real,
        pagbank_real: cardCalculations.pagbank_real,
        pix_real: cardCalculations.pix_real,

        // Calculation details for audit
        cardCalculations: cardCalculations.calculations,

        // Midnight values (if applicable)
        midnightValues: AppState.midnightInfo?.crossesMidnight ? {
            stone_dc: midnightStoneDc,
            stone_voucher: midnightStoneVoucher,
            pagbank: midnightPagbank,
            pix: midnightPix
        } : null,

        // Totals
        totalCardsReal,
        totalInformed,
        expectedCash,
        divergence,

        // Metadata
        crossesMidnight: AppState.midnightInfo?.crossesMidnight || false,
        previousShiftValues: previousCardValues.exists ? {
            sameDay: previousCardValues.sameDay,
            stone_dc: previousCardValues.stone_dc_cumulative,
            stone_voucher: previousCardValues.stone_voucher_cumulative,
            pagbank: previousCardValues.pagbank_cumulative,
            pix: previousCardValues.pix_cumulative
        } : null
    };
}

async function confirmCloseShift() {
    if (!AppState.activeShift || !AppState.closingData) {
        showToast('Preencha os valores do caixa', 'warning');
        return;
    }

    const closingData = AppState.closingData;
    const { divergence, envelopeNotes, envelopeCoins, totalCardsReal } = closingData;
    const envelopeTotal = (envelopeNotes || 0) + (envelopeCoins || 0);
    const divergenceReason = document.getElementById('divergence-reason')?.value || '';
    const notes = document.getElementById('shift-notes')?.value || '';

    // Require justification for divergence > R$0.50
    if (Math.abs(divergence) > 0.5 && !divergenceReason.trim()) {
        showToast('Informe a justificativa da divergencia', 'warning');
        document.getElementById('divergence-reason')?.focus();
        return;
    }

    try {
        showLoading();
        const { closeShift, createTransaction } = await import('./firebase-config.js');

        // Build complete closing data with card values
        const completeClosingData = {
            // Cash values
            cashNotes: closingData.cashNotes,
            cashCoins: closingData.cashCoins,
            envelopeNotes: closingData.envelopeNotes,
            envelopeCoins: closingData.envelopeCoins,
            remainingNotes: closingData.remainingNotes,
            remainingCoins: closingData.remainingCoins,
            totalCashInformed: closingData.totalCashInformed,

            // Card machine values - CUMULATIVE (for next shift calculation)
            stone_dc_cumulative: closingData.stone_dc_cumulative,
            stone_voucher_cumulative: closingData.stone_voucher_cumulative,
            pagbank_cumulative: closingData.pagbank_cumulative,
            pix_cumulative: closingData.pix_cumulative,

            // Card machine values - REAL (actual sales this shift)
            stone_dc_real: closingData.stone_dc_real,
            stone_voucher_real: closingData.stone_voucher_real,
            pagbank_real: closingData.pagbank_real,
            pix_real: closingData.pix_real,

            // Calculation audit trail
            cardCalculations: closingData.cardCalculations,
            previousShiftValues: closingData.previousShiftValues,

            // Midnight crossing data
            crossesMidnight: closingData.crossesMidnight,
            midnightValues: closingData.midnightValues,

            // Totals
            totalCardsReal: closingData.totalCardsReal,
            totalInformed: closingData.totalInformed,
            expectedCash: closingData.expectedCash,
            divergence: closingData.divergence,
            divergenceReason,
            notes,
            closedAt: Date.now()
        };

        // Close the shift
        await closeShift(
            AppState.activeShift.id,
            AppState.currentUser.id,
            completeClosingData
        );

        const shiftDate = new Date(AppState.activeShift.startTime);
        const formattedDate = shiftDate.toLocaleDateString('pt-BR');
        const operatorName = AppState.currentUser?.name || 'Operador';

        // Register envelope value as financial entry (if > 0)
        if (envelopeTotal > 0) {
            await createTransaction({
                type: 'income',
                category: 'vendas',
                description: `Envelope Turno ${formattedDate} - ${operatorName}`,
                amount: envelopeTotal,
                paymentMethod: 'cash',
                shiftId: AppState.activeShift.id,
                operatorId: AppState.currentUser?.id,
                operatorName: operatorName,
                details: {
                    envelopeNotes: envelopeNotes || 0,
                    envelopeCoins: envelopeCoins || 0,
                    shiftTotalSales: AppState.activeShift.totalSales || 0,
                    divergence: divergence
                }
            });
        }

        // Register card sales as separate financial entries (if > 0)
        const cardMethods = [
            { key: 'stone_dc_real', name: 'Stone DC', paymentMethod: 'stone_dc' },
            { key: 'stone_voucher_real', name: 'Stone Voucher', paymentMethod: 'stone_voucher' },
            { key: 'pagbank_real', name: 'PagBank', paymentMethod: 'pagbank' },
            { key: 'pix_real', name: 'PIX', paymentMethod: 'pix' }
        ];

        for (const { key, name, paymentMethod } of cardMethods) {
            const amount = closingData[key] || 0;
            if (amount > 0) {
                await createTransaction({
                    type: 'income',
                    category: 'vendas',
                    description: `${name} Turno ${formattedDate} - ${operatorName}`,
                    amount: amount,
                    paymentMethod: paymentMethod,
                    shiftId: AppState.activeShift.id,
                    operatorId: AppState.currentUser?.id,
                    operatorName: operatorName,
                    details: {
                        cumulative: closingData[key.replace('_real', '_cumulative')],
                        real: amount,
                        calculationType: closingData.cardCalculations?.[key.replace('_real', '')]?.type
                    }
                });
            }
        }

        showToast('Turno encerrado com sucesso!', 'success');
        closeCashRegisterModal();

        // Stop timer
        if (shiftTimerInterval) {
            clearInterval(shiftTimerInterval);
        }

        // Reset state
        AppState.activeShift = null;
        AppState.closingData = null;
        AppState.previousCardValues = null;
        AppState.midnightInfo = null;
        showNoShift();

    } catch (error) {
        console.error('Error closing shift:', error);
        showToast('Erro ao encerrar turno', 'danger');
    } finally {
        hideLoading();
    }
}

// ==================== ADMIN DASHBOARD ====================

async function initAdminDashboard() {
    console.log('Initializing admin dashboard...');

    // Subscribe to real-time stats
    const { subscribeToDashboardStats, subscribeToAllActiveShifts } = await import('./firebase-config.js');

    // Stats subscription
    const statsUnsub = subscribeToDashboardStats((stats) => {
        updateAdminStats(stats);
    });
    AppState.unsubscribers.push(statsUnsub);

    // Active shifts subscription
    const shiftsUnsub = subscribeToAllActiveShifts((shifts) => {
        updateActiveShiftsList(shifts);
    });
    AppState.unsubscribers.push(shiftsUnsub);
}

function updateAdminStats(stats) {
    // Update stats cards (find by content since IDs may not be set)
    const statsCards = document.querySelectorAll('.stats-card-value');

    statsCards.forEach(card => {
        const label = card.parentElement?.querySelector('.stats-card-label')?.textContent;

        if (label?.includes('Vendas')) {
            card.textContent = formatCurrency(stats.todaySales);
        } else if (label?.includes('Ticket')) {
            card.textContent = formatCurrency(stats.ticketMedio);
        } else if (label?.includes('Divergencias')) {
            card.textContent = stats.totalDivergence >= 0
                ? formatCurrency(stats.totalDivergence)
                : `-${formatCurrency(Math.abs(stats.totalDivergence))}`;
        } else if (label?.includes('Turnos')) {
            card.textContent = stats.activeShiftsCount;
        }
    });
}

function updateActiveShiftsList(shifts) {
    const container = document.getElementById('shifts-container');
    const countEl = document.getElementById('active-shifts-count');

    console.log('updateActiveShiftsList called:', shifts.length, 'shifts');

    if (!container) {
        console.error('shifts-container not found');
        return;
    }

    // Update count
    if (countEl) {
        countEl.textContent = `${shifts.length} ${shifts.length === 1 ? 'ativo' : 'ativos'}`;
    }

    if (shifts.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-muted">
                <span class="material-symbols-outlined text-4xl mb-2">schedule</span>
                <p>Nenhum turno ativo no momento</p>
            </div>
        `;
        return;
    }

    container.innerHTML = shifts.map(shift => {
        const duration = Math.floor((Date.now() - shift.startTime) / 3600000);
        const minutes = Math.floor(((Date.now() - shift.startTime) % 3600000) / 60000);

        return `
            <div class="shift-item">
                <div class="shift-user">
                    <div class="shift-avatar-wrapper">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(shift.userName)}&background=random"
                             alt="${shift.userName}"
                             class="shift-avatar">
                        <div class="shift-status active"></div>
                    </div>
                    <div class="shift-info">
                        <h4>${shift.userName}</h4>
                        <p class="shift-meta">
                            ${formatCurrency(shift.totalSales || 0)} •
                            ${duration.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}h
                        </p>
                    </div>
                </div>
                <button class="shift-action" onclick="App.viewShiftDetails('${shift.id}')">Ver</button>
            </div>
        `;
    }).join('');
}

// ==================== PRODUCTS PAGE ====================

async function initProductsPage() {
    console.log('Initializing products page...');

    const { subscribeToProducts, createProduct, deleteProduct } = await import('./firebase-config.js');

    // Subscribe to products
    const unsub = subscribeToProducts((products) => {
        renderProductsList(products);
    });
    AppState.unsubscribers.push(unsub);

    // Init form
    const form = document.getElementById('new-product-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('product-name').value;
            const category = document.getElementById('product-category').value;
            const price = document.getElementById('product-price').value;
            const description = document.getElementById('product-description')?.value || '';

            if (!name || !category || !price) {
                showToast('Preencha todos os campos obrigatorios', 'warning');
                return;
            }

            try {
                await createProduct({
                    name,
                    category,
                    price: parseFloat(price),
                    description
                });

                showToast('Produto salvo com sucesso!', 'success');
                closeModal('new-product-modal');
                form.reset();
            } catch (error) {
                console.error('Error creating product:', error);
                showToast('Erro ao salvar produto', 'danger');
            }
        });
    }

    // Category filters
    initCategoryFilters();
}

function renderProductsList(products) {
    const list = document.getElementById('products-list');
    const countEl = document.querySelector('.text-sm.text-muted .font-semibold');

    if (countEl) {
        countEl.textContent = products.length;
    }

    if (!list) return;

    if (products.length === 0) {
        list.innerHTML = `
            <div class="p-8 text-center text-muted">
                <span class="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                <p>Nenhum produto cadastrado</p>
            </div>
        `;
        return;
    }

    list.innerHTML = products.map(product => `
        <div class="product-item" data-category="${product.category}">
            <div class="product-drag">
                <span class="material-symbols-outlined">drag_indicator</span>
            </div>
            <div class="product-icon ${product.category === 'bebidas' ? 'drink' : 'food'}">
                <span class="material-symbols-outlined">
                    ${product.category === 'bebidas' ? 'local_drink' : 'lunch_dining'}
                </span>
            </div>
            <div class="product-info">
                <div class="flex justify-between items-baseline gap-2">
                    <span class="product-name">${product.name}</span>
                    <span class="product-price">${formatCurrency(product.price)}</span>
                </div>
                <span class="product-category">${capitalizeFirst(product.category)}</span>
            </div>
            <div class="product-actions">
                <button onclick="App.deleteProduct('${product.id}')">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>
    `).join('');
}

function initCategoryFilters() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const category = chip.textContent.toLowerCase().trim();
            filterProducts(category);
        });
    });
}

function filterProducts(category) {
    const items = document.querySelectorAll('.product-item');

    items.forEach(item => {
        if (category === 'todos' || item.dataset.category === category) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// ==================== USERS PAGE ====================

async function initUsersPage() {
    console.log('Initializing users page...');

    const { subscribeToUsers, createNewUser, deleteUser } = await import('./firebase-config.js');

    // Subscribe to users
    const unsub = subscribeToUsers((users) => {
        renderUsersList(users);
    });
    AppState.unsubscribers.push(unsub);

    // Init form
    const form = document.getElementById('new-user-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('user-name').value;
            const email = document.getElementById('user-email').value;
            const role = document.getElementById('user-role').value;
            const transport = document.getElementById('user-transport').value;

            if (!name || !email) {
                showToast('Preencha todos os campos obrigatorios', 'warning');
                return;
            }

            try {
                await createNewUser({
                    name,
                    email,
                    role,
                    transport
                });

                showToast('Usuario criado com sucesso!', 'success');
                closeModal('new-user-modal');
                form.reset();
            } catch (error) {
                console.error('Error creating user:', error);
                showToast('Erro ao criar usuario', 'danger');
            }
        });
    }

    // Search functionality
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            document.querySelectorAll('.user-card').forEach(card => {
                const name = card.querySelector('.user-card-name')?.textContent.toLowerCase() || '';
                const email = card.querySelector('.user-card-email')?.textContent.toLowerCase() || '';
                card.style.display = name.includes(search) || email.includes(search) ? 'block' : 'none';
            });
        });
    }
}

function renderUsersList(users) {
    const list = document.getElementById('users-list');
    const countEl = document.querySelector('.app-header p.text-xs');

    if (countEl) {
        countEl.textContent = `${users.length} membros ativos`;
    }

    if (!list) return;

    if (users.length === 0) {
        list.innerHTML = `
            <div class="p-8 text-center text-muted">
                <span class="material-symbols-outlined text-4xl mb-2">group_off</span>
                <p>Nenhum usuario cadastrado</p>
            </div>
        `;
        return;
    }

    const transportIcons = {
        car: 'directions_car',
        motorcycle: 'two_wheeler',
        bus: 'directions_bus',
        walk: 'directions_walk'
    };

    const transportLabels = {
        car: 'Carro Proprio',
        motorcycle: 'Moto Propria',
        bus: 'Onibus',
        walk: 'A pe'
    };

    list.innerHTML = users.map(user => `
        <div class="user-card">
            <div class="user-card-header">
                <div class="user-card-info">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random"
                         alt="${user.name}"
                         class="user-card-avatar">
                    <div>
                        <h3 class="user-card-name">${user.name}</h3>
                        <p class="user-card-email">${user.email}</p>
                    </div>
                </div>
                <span class="user-card-role ${user.role}">${capitalizeFirst(user.role)}</span>
            </div>
            ${user.transport ? `
                <div class="user-card-transport">
                    <span class="material-symbols-outlined">${transportIcons[user.transport] || 'help'}</span>
                    <span class="font-medium">${transportLabels[user.transport] || user.transport}</span>
                </div>
            ` : ''}
            <div class="user-card-actions">
                <button class="btn btn-secondary" onclick="App.editUser('${user.id}')">
                    <span class="material-symbols-outlined text-lg">edit</span>
                    Editar
                </button>
                <button class="btn btn-secondary text-danger hover:bg-danger/10" onclick="App.deleteUser('${user.id}')">
                    <span class="material-symbols-outlined text-lg">delete</span>
                    Excluir
                </button>
            </div>
        </div>
    `).join('');
}

// ==================== FINANCIAL PAGE ====================

async function initFinancialPage() {
    console.log('Initializing financial page...');

    const { subscribeToTransactions, createTransaction, getFinancialSummary } = await import('./firebase-config.js');

    // Subscribe to transactions
    const unsub = subscribeToTransactions((transactions) => {
        renderTransactionsList(transactions);
        calculateBalance(transactions);
    });
    AppState.unsubscribers.push(unsub);

    // Init expense form
    const form = document.getElementById('expense-form');
    if (form) {
        // Set default date
        const dateInput = document.getElementById('expense-date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const description = document.getElementById('expense-description').value;
            const amount = document.getElementById('expense-amount').value;
            const category = document.getElementById('expense-category').value;
            const date = document.getElementById('expense-date').value;

            if (!description || !amount || !category) {
                showToast('Preencha todos os campos', 'warning');
                return;
            }

            try {
                await createTransaction({
                    type: 'expense',
                    description,
                    amount: parseFloat(amount),
                    category,
                    date: new Date(date)
                });

                showToast('Gasto registrado com sucesso!', 'success');
                closeModal('expense-modal');
                form.reset();
                dateInput.valueAsDate = new Date();
            } catch (error) {
                console.error('Error creating transaction:', error);
                showToast('Erro ao registrar gasto', 'danger');
            }
        });
    }
}

function renderTransactionsList(transactions) {
    const container = document.querySelector('.transaction-item')?.parentElement;
    if (!container) return;

    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-muted">
                <span class="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                <p>Nenhuma movimentacao registrada</p>
            </div>
        `;
        return;
    }

    const categoryIcons = {
        insumos: 'shopping_cart',
        manutencao: 'build',
        salarios: 'payments',
        impostos: 'receipt',
        outros: 'more_horiz',
        vendas: 'attach_money'
    };

    container.innerHTML = transactions.slice(0, 10).map(transaction => {
        const isIncome = transaction.type === 'income';
        const date = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);

        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                        <span class="material-symbols-outlined">
                            ${categoryIcons[transaction.category] || (isIncome ? 'attach_money' : 'shopping_cart')}
                        </span>
                    </div>
                    <div class="transaction-details">
                        <p class="transaction-title">${transaction.description}</p>
                        <p class="transaction-meta">${formatDateTime(date)} ${transaction.category ? '• ' + capitalizeFirst(transaction.category) : ''}</p>
                    </div>
                </div>
                <div class="transaction-amount">
                    <p class="transaction-value ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'} ${formatCurrency(transaction.amount)}
                    </p>
                </div>
            </div>
        `;
    }).join('');
}

function calculateBalance(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount || 0;
        } else {
            totalExpense += t.amount || 0;
        }
    });

    const balance = totalIncome - totalExpense;

    // Update UI
    const balanceEl = document.querySelector('.text-3xl.font-bold');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(balance);
    }

    // Update income/expense cards
    const cards = document.querySelectorAll('.card.p-4 .text-lg.font-bold');
    if (cards[0]) cards[0].textContent = formatCurrency(totalIncome);
    if (cards[1]) cards[1].textContent = formatCurrency(totalExpense);
}

// ==================== REPORTS PAGE ====================

async function initReportsPage() {
    console.log('Initializing reports page...');

    const { getWeeklyReportData, getSettings, getAllUsers } = await import('./firebase-config.js');

    // Load button
    const loadBtn = document.getElementById('load-data-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
            setButtonLoading(loadBtn, true);

            try {
                // Get week range
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);

                const [reportData, settings, users] = await Promise.all([
                    getWeeklyReportData(startOfWeek, endOfWeek),
                    getSettings(),
                    getAllUsers()
                ]);

                renderWeeklyReport(reportData, settings, users);
                showToast('Dados carregados com sucesso!', 'success');
            } catch (error) {
                console.error('Error loading report data:', error);
                showToast('Erro ao carregar dados', 'danger');
            } finally {
                setButtonLoading(loadBtn, false);
            }
        });
    }
}

function renderWeeklyReport(reportData, settings, users) {
    console.log('Report data:', reportData);
    console.log('Settings:', settings);
    console.log('Users:', users);
}

// ==================== UI UTILITIES ====================

function showLoading() {
    AppState.isLoading = true;
    if (DOM.loadingScreen) {
        DOM.loadingScreen.classList.remove('hidden');
    }
}

function hideLoading() {
    AppState.isLoading = false;
    if (DOM.loadingScreen) {
        DOM.loadingScreen.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast toast-${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

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

function showFormError(errorDiv, message) {
    if (!errorDiv) return;
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

function hideFormError(errorDiv) {
    if (!errorDiv) return;
    errorDiv.classList.remove('show');
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(`${modalId}-overlay`);

    if (modal) {
        modal.style.display = 'block';
        setTimeout(() => {
            modal.style.transform = 'translateY(0)';
        }, 10);
    }
    if (overlay) {
        overlay.classList.add('active');
    }

    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(`${modalId}-overlay`);

    if (modal) {
        modal.style.transform = 'translateY(100%)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    if (overlay) {
        overlay.classList.remove('active');
    }

    document.body.style.overflow = '';
}

function closeAllModals() {
    document.querySelectorAll('[id$="-modal"]').forEach(modal => {
        if (modal.id.includes('-overlay')) return;
        modal.style.transform = 'translateY(100%)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// Format Utilities
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

function formatTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
}

function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function updateNavActive(page) {
    const navItems = document.querySelectorAll('.bottom-nav-item');
    navItems.forEach(item => {
        const navPage = item.dataset.nav;
        item.classList.toggle('active', navPage === page);
    });
}

// ==================== GLOBAL APP OBJECT ====================

async function deleteProductHandler(productId) {
    if (!confirm('Deseja excluir este produto?')) return;

    try {
        const { deleteProduct } = await import('./firebase-config.js');
        await deleteProduct(productId);
        showToast('Produto excluido!', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Erro ao excluir produto', 'danger');
    }
}

async function deleteUserHandler(userId) {
    if (!confirm('Deseja excluir este usuario?')) return;

    try {
        const { deleteUser } = await import('./firebase-config.js');
        await deleteUser(userId);
        showToast('Usuario excluido!', 'success');
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Erro ao excluir usuario', 'danger');
    }
}

// ==================== SALE FUNCTIONS ====================

function selectProduct(productId) {
    const product = AppState.products?.find(p => p.id === productId);
    if (!product) {
        showToast('Produto não encontrado', 'danger');
        return;
    }

    if (!AppState.activeShift) {
        showToast('Abra um turno primeiro', 'warning');
        return;
    }

    AppState.selectedProduct = product;
    showSaleModal(product);
}

function showSaleModal(product) {
    // Create modal if doesn't exist
    let modal = document.getElementById('sale-modal');
    let overlay = document.getElementById('sale-modal-overlay');

    if (!modal) {
        overlay = document.createElement('div');
        overlay.id = 'sale-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.onclick = () => closeSaleModal();

        modal = document.createElement('div');
        modal.id = 'sale-modal';
        modal.className = 'fixed inset-x-0 bottom-0 z-50 bg-card-light dark:bg-card-dark rounded-t-2xl shadow-2xl transform translate-y-full transition-transform duration-300';
        modal.style.maxHeight = '80vh';
        modal.style.overflowY = 'auto';

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="p-6">
            <div class="w-12 h-1.5 bg-border-light dark:bg-border-dark rounded-full mx-auto mb-4"></div>
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold">Registrar Venda</h2>
                <button onclick="App.closeSaleModal()" class="p-2 rounded-full hover:bg-background-light dark:hover:bg-background-dark">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <div class="bg-background-light dark:bg-background-dark rounded-xl p-4 mb-6">
                <div class="flex items-center gap-3">
                    <div class="product-icon ${product.category === 'bebidas' ? 'drink' : 'food'}">
                        <span class="material-symbols-outlined">${getProductIcon(product.category)}</span>
                    </div>
                    <div>
                        <h3 class="font-semibold">${product.name}</h3>
                        <p class="text-primary font-bold">${formatCurrency(product.price)}</p>
                    </div>
                </div>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Quantidade</label>
                    <div class="flex items-center gap-4">
                        <button onclick="App.changeQuantity(-1)" class="w-12 h-12 rounded-full bg-background-light dark:bg-background-dark flex items-center justify-center text-xl font-bold">-</button>
                        <input type="number" id="sale-quantity" value="1" min="1" class="w-20 h-12 text-center text-2xl font-bold bg-transparent border-b-2 border-primary" onchange="App.updateSaleTotal()">
                        <button onclick="App.changeQuantity(1)" class="w-12 h-12 rounded-full bg-background-light dark:bg-background-dark flex items-center justify-center text-xl font-bold">+</button>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-2">Forma de Pagamento</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button onclick="App.selectPayment('cash')" class="payment-option active" data-payment="cash">
                            <span class="material-symbols-outlined">payments</span>
                            <span>Dinheiro</span>
                        </button>
                        <button onclick="App.selectPayment('card')" class="payment-option" data-payment="card">
                            <span class="material-symbols-outlined">credit_card</span>
                            <span>Cartão</span>
                        </button>
                        <button onclick="App.selectPayment('pix')" class="payment-option" data-payment="pix">
                            <span class="material-symbols-outlined">qr_code</span>
                            <span>PIX</span>
                        </button>
                    </div>
                </div>

                <div class="bg-primary/10 rounded-xl p-4 mt-4">
                    <div class="flex justify-between items-center">
                        <span class="text-lg">Total:</span>
                        <span id="sale-total" class="text-2xl font-bold text-primary">${formatCurrency(product.price)}</span>
                    </div>
                </div>

                <button onclick="App.confirmSale()" class="btn btn-primary w-full py-4 text-lg font-semibold mt-4">
                    <span class="material-symbols-outlined">check</span>
                    Confirmar Venda
                </button>
            </div>
        </div>
    `;

    // Show modal
    overlay.classList.add('active');
    modal.style.display = 'block';
    setTimeout(() => {
        modal.style.transform = 'translateY(0)';
    }, 10);

    AppState.selectedPayment = 'cash';
}

function closeSaleModal() {
    const modal = document.getElementById('sale-modal');
    const overlay = document.getElementById('sale-modal-overlay');

    if (modal) {
        modal.style.transform = 'translateY(100%)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    if (overlay) {
        overlay.classList.remove('active');
    }

    AppState.selectedProduct = null;
    AppState.selectedPayment = 'cash';
}

function changeQuantity(delta) {
    const input = document.getElementById('sale-quantity');
    if (!input) return;

    let qty = parseInt(input.value) || 1;
    qty = Math.max(1, qty + delta);
    input.value = qty;
    updateSaleTotal();
}

function updateSaleTotal() {
    const input = document.getElementById('sale-quantity');
    const totalEl = document.getElementById('sale-total');
    if (!input || !totalEl || !AppState.selectedProduct) return;

    const qty = parseInt(input.value) || 1;
    const total = qty * AppState.selectedProduct.price;
    totalEl.textContent = formatCurrency(total);
}

function selectPayment(method) {
    AppState.selectedPayment = method;

    document.querySelectorAll('.payment-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.payment === method);
    });
}

async function confirmSale() {
    if (!AppState.selectedProduct || !AppState.activeShift) {
        showToast('Erro ao registrar venda', 'danger');
        return;
    }

    const qtyInput = document.getElementById('sale-quantity');
    const quantity = parseInt(qtyInput?.value) || 1;
    const total = quantity * AppState.selectedProduct.price;

    try {
        const { addSaleToShift } = await import('./firebase-config.js');

        await addSaleToShift(AppState.activeShift.id, {
            productId: AppState.selectedProduct.id,
            productName: AppState.selectedProduct.name,
            quantity: quantity,
            unitPrice: AppState.selectedProduct.price,
            total: total,
            paymentMethod: AppState.selectedPayment
        });

        showToast(`Venda registrada: ${quantity}x ${AppState.selectedProduct.name}`, 'success');
        closeSaleModal();
    } catch (error) {
        console.error('Error registering sale:', error);
        showToast('Erro ao registrar venda', 'danger');
    }
}

// Export utilities for use in other modules
window.App = {
    state: AppState,
    navigateTo,
    showToast,
    showLoading,
    hideLoading,
    openModal,
    closeModal,
    formatCurrency,
    formatDate,
    formatTime,
    formatDateTime,
    toggleTheme,
    setButtonLoading,
    deleteProduct: deleteProductHandler,
    deleteUser: deleteUserHandler,
    selectProduct,
    closeSaleModal,
    changeQuantity,
    updateSaleTotal,
    selectPayment,
    confirmSale,
    closeCashRegisterModal,
    calculateCashRegister,
    confirmCloseShift,
    viewShiftDetails: (shiftId) => {
        console.log('View shift:', shiftId);
        showToast('Funcionalidade em desenvolvimento', 'info');
    },
    editUser: (userId) => {
        console.log('Edit user:', userId);
        showToast('Funcionalidade em desenvolvimento', 'info');
    }
};

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        loadPage(e.state.page);
    }
});

// Initial route handling
const initialPage = location.hash.replace('#', '') || 'auth';
if (initialPage !== 'auth') {
    history.replaceState({ page: initialPage }, '', `#${initialPage}`);
}
