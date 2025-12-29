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
    e.preventDefault();

    const finalCash = document.getElementById('final-cash').value;
    const notes = document.getElementById('shift-notes').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!finalCash) {
        showToast('Informe o caixa final', 'warning');
        return;
    }

    if (!AppState.activeShift) {
        showToast('Nenhum turno ativo', 'danger');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const { closeShift } = await import('./firebase-config.js');

        await closeShift(
            AppState.activeShift.id,
            AppState.currentUser.id,
            { finalCash, notes }
        );

        showToast('Turno encerrado com sucesso!', 'success');
        closeModal('close-shift-modal');

        // Stop timer
        if (shiftTimerInterval) {
            clearInterval(shiftTimerInterval);
        }

        // Reset form
        e.target.reset();
    } catch (error) {
        console.error('Error closing shift:', error);
        showToast('Erro ao encerrar turno', 'danger');
    } finally {
        setButtonLoading(submitBtn, false);
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
