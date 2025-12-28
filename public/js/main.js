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
    isOnline: navigator.onLine
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

    // Check online status
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
                // User exists in Auth but not in Firestore - new user
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
        const { auth, signOut } = await import('./firebase-config.js');
        await signOut(auth);
        showToast('Logout realizado', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Erro ao fazer logout', 'danger');
    }
}

// Navigation
function navigateTo(page) {
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

async function initAdminDashboard() {
    // Load dashboard data
    console.log('Initializing admin dashboard...');
}

async function initEmployeeDashboard() {
    console.log('Initializing employee dashboard...');
}

async function initProductsPage() {
    console.log('Initializing products page...');
}

async function initUsersPage() {
    console.log('Initializing users page...');
}

async function initFinancialPage() {
    console.log('Initializing financial page...');
}

function updateNavActive(page) {
    const navItems = document.querySelectorAll('.bottom-nav-item');
    navItems.forEach(item => {
        const navPage = item.dataset.nav;
        item.classList.toggle('active', navPage === page);
    });
}

// UI Utilities
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
    const overlay = document.getElementById(`${modalId}-overlay`) || document.querySelector('.modal-overlay');

    if (modal) {
        modal.classList.add('active');
    }
    if (overlay) {
        overlay.classList.add('active');
    }

    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById(`${modalId}-overlay`) || document.querySelector('.modal-overlay');

    if (modal) {
        modal.classList.remove('active');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }

    document.body.style.overflow = '';
}

function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.querySelectorAll('.modal-overlay.active').forEach(overlay => {
        overlay.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// Format Utilities
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
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

function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `Ha ${minutes} min`;
    if (hours < 24) return `Ha ${hours}h`;
    if (days < 7) return `Ha ${days} dias`;

    return formatDate(date);
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
    formatRelativeTime,
    toggleTheme
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
