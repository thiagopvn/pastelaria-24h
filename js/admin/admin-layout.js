/**
 * Admin Layout Module
 * Handles admin layout functionality like side menu, navigation, etc.
 */

// Layout State
const AdminLayoutState = {
    menuOpen: false,
    currentPage: 'admin-dashboard'
};

/**
 * Initialize Admin Layout
 */
export function initAdminLayout() {
    console.log('Initializing admin layout...');

    // Setup side menu
    setupSideMenu();

    // Setup logout buttons
    setupLogoutButtons();

    // Setup notification button
    setupNotifications();

    // Update current page highlight
    updateActiveNavItem();
}

/**
 * Setup side menu toggle
 */
function setupSideMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.getElementById('side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');
    const closeMenuBtn = document.getElementById('close-menu');

    if (!sideMenu) return;

    // Open menu
    menuToggle?.addEventListener('click', () => {
        openSideMenu();
    });

    // Close menu via button
    closeMenuBtn?.addEventListener('click', () => {
        closeSideMenu();
    });

    // Close menu via overlay
    sideMenuOverlay?.addEventListener('click', () => {
        closeSideMenu();
    });

    // Setup menu navigation items
    document.querySelectorAll('#side-menu [data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const nav = link.dataset.nav;

            // Update active state in menu
            document.querySelectorAll('#side-menu [data-nav]').forEach(item => {
                item.classList.remove('bg-primary/10', 'text-primary');
                item.classList.add('text-gray-300', 'hover:bg-white/5');
            });

            link.classList.remove('text-gray-300', 'hover:bg-white/5');
            link.classList.add('bg-primary/10', 'text-primary');

            // Close menu and navigate
            closeSideMenu();

            setTimeout(() => {
                window.App?.navigateTo(nav);
            }, 200);
        });
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && AdminLayoutState.menuOpen) {
            closeSideMenu();
        }
    });
}

/**
 * Open side menu
 */
function openSideMenu() {
    const sideMenu = document.getElementById('side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');

    if (sideMenu) {
        sideMenu.style.transform = 'translateX(0)';
    }

    if (sideMenuOverlay) {
        sideMenuOverlay.classList.add('active');
    }

    AdminLayoutState.menuOpen = true;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

/**
 * Close side menu
 */
function closeSideMenu() {
    const sideMenu = document.getElementById('side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');

    if (sideMenu) {
        sideMenu.style.transform = 'translateX(-100%)';
    }

    if (sideMenuOverlay) {
        sideMenuOverlay.classList.remove('active');
    }

    AdminLayoutState.menuOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';
}

/**
 * Setup logout buttons
 */
function setupLogoutButtons() {
    document.querySelectorAll('[data-logout]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();

            // Close side menu if open
            if (AdminLayoutState.menuOpen) {
                closeSideMenu();
            }

            // Confirm logout
            if (confirm('Deseja realmente sair?')) {
                try {
                    const { logoutUser } = await import('../firebase-config.js');
                    await logoutUser();
                    window.App?.navigateTo('login');
                } catch (error) {
                    console.error('Error logging out:', error);
                    window.App?.showToast('Erro ao sair', 'danger');
                }
            }
        });
    });
}

/**
 * Setup notifications
 */
function setupNotifications() {
    const notificationBtn = document.querySelector('.app-header-btn .material-symbols-outlined')?.parentElement;

    if (notificationBtn && notificationBtn.querySelector('[class*="notification"]')) {
        notificationBtn.addEventListener('click', () => {
            window.App?.showToast('Notificacoes em breve!', 'info');
        });
    }
}

/**
 * Update active navigation item
 */
function updateActiveNavItem() {
    const currentPage = window.App?.state?.currentPage || AdminLayoutState.currentPage;

    // Update bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.nav === currentPage) {
            item.classList.add('active');
        }
    });

    // Update side menu
    document.querySelectorAll('#side-menu [data-nav]').forEach(link => {
        link.classList.remove('bg-primary/10', 'text-primary');
        link.classList.add('text-gray-300', 'hover:bg-white/5');

        if (link.dataset.nav === currentPage) {
            link.classList.remove('text-gray-300', 'hover:bg-white/5');
            link.classList.add('bg-primary/10', 'text-primary');
        }
    });
}

/**
 * Navigate to page
 */
function navigateToPage(page) {
    AdminLayoutState.currentPage = page;
    updateActiveNavItem();
    window.App?.navigateTo(page);
}

// Export for global access
window.AdminLayout = {
    init: initAdminLayout,
    openMenu: openSideMenu,
    closeMenu: closeSideMenu,
    navigateTo: navigateToPage
};
