/**
 * Product Management Module
 * Handles products listing, creation, editing and deletion
 */

// State
const ProductManagementState = {
    products: [],
    filteredProducts: [],
    currentCategory: 'all',
    searchTerm: '',
    selectedProduct: null,
    isLoading: false,
    unsubscribers: []
};

/**
 * Initialize Product Management
 */
export function initProductManagement() {
    console.log('Initializing product management...');

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

    // Setup product actions
    setupProductActions();

    // Load products
    loadProducts();
}

/**
 * Setup search functionality
 */
function setupSearch() {
    const searchToggle = document.getElementById('search-toggle');
    let searchVisible = false;

    if (searchToggle) {
        searchToggle.addEventListener('click', () => {
            searchVisible = !searchVisible;

            // Toggle search bar visibility (could create a search bar dynamically)
            if (searchVisible) {
                showSearchBar();
            } else {
                hideSearchBar();
            }
        });
    }
}

/**
 * Show search bar
 */
function showSearchBar() {
    const main = document.querySelector('main');
    if (!main) return;

    // Check if search bar already exists
    if (document.getElementById('product-search-bar')) return;

    const searchBar = document.createElement('div');
    searchBar.id = 'product-search-bar';
    searchBar.className = 'search-bar mb-4';
    searchBar.innerHTML = `
        <div class="icon">
            <span class="material-symbols-outlined">search</span>
        </div>
        <input type="text" placeholder="Buscar produto..." id="product-search" autofocus>
    `;

    main.insertBefore(searchBar, main.firstChild.nextSibling);

    // Setup search input
    document.getElementById('product-search')?.addEventListener('input', (e) => {
        ProductManagementState.searchTerm = e.target.value.toLowerCase();
        filterAndRenderProducts();
    });
}

/**
 * Hide search bar
 */
function hideSearchBar() {
    const searchBar = document.getElementById('product-search-bar');
    if (searchBar) {
        searchBar.remove();
        ProductManagementState.searchTerm = '';
        filterAndRenderProducts();
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
                ProductManagementState.currentCategory = 'all';
            } else {
                ProductManagementState.currentCategory = filterText;
            }

            filterAndRenderProducts();
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
    // Open new product modal
    document.querySelectorAll('[data-modal-open="new-product-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            openModal('new-product-modal');
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
    document.getElementById('new-product-modal-overlay')?.addEventListener('click', () => {
        closeModal('new-product-modal');
    });
}

/**
 * Setup forms
 */
function setupForms() {
    const form = document.getElementById('new-product-form');

    if (form) {
        form.addEventListener('submit', handleCreateProduct);
    }
}

/**
 * Setup product actions (more menu)
 */
function setupProductActions() {
    // Delegate click events for product actions
    document.getElementById('products-list')?.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.product-actions button');
        if (actionBtn) {
            const productItem = actionBtn.closest('.product-item');
            const productId = productItem?.dataset?.productId;

            if (productId) {
                showProductActionsMenu(actionBtn, productId);
            }
        }
    });
}

/**
 * Show product actions menu
 */
function showProductActionsMenu(button, productId) {
    // Remove any existing menu
    document.querySelector('.product-actions-menu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'product-actions-menu';
    menu.innerHTML = `
        <button onclick="ProductManagement.editProduct('${productId}')">
            <span class="material-symbols-outlined">edit</span>
            Editar
        </button>
        <button onclick="ProductManagement.toggleAvailability('${productId}')">
            <span class="material-symbols-outlined">visibility</span>
            Alterar Disponibilidade
        </button>
        <button class="text-danger" onclick="ProductManagement.deleteProduct('${productId}')">
            <span class="material-symbols-outlined">delete</span>
            Excluir
        </button>
    `;

    // Position menu
    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;

    document.body.appendChild(menu);

    // Close menu on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 10);
}

/**
 * Load products from Firebase
 */
async function loadProducts() {
    const list = document.getElementById('products-list');
    if (!list) return;

    // Show loading
    list.innerHTML = `
        <div class="flex items-center justify-center py-8">
            <span class="spinner"></span>
        </div>
    `;

    try {
        const { subscribeToProducts } = await import('../firebase-config.js');

        const unsubscribe = subscribeToProducts((products) => {
            ProductManagementState.products = products;
            filterAndRenderProducts();

            // Update count
            updateProductCount(products.length);
        });

        ProductManagementState.unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error loading products:', error);
        list.innerHTML = `
            <div class="text-center py-8">
                <span class="material-symbols-outlined text-4xl text-muted mb-2">error</span>
                <p class="text-muted">Erro ao carregar produtos</p>
            </div>
        `;
    }
}

/**
 * Filter and render products
 */
function filterAndRenderProducts() {
    let filtered = [...ProductManagementState.products];

    // Apply category filter
    if (ProductManagementState.currentCategory !== 'all') {
        filtered = filtered.filter(product =>
            product.category?.toLowerCase() === ProductManagementState.currentCategory
        );
    }

    // Apply search filter
    if (ProductManagementState.searchTerm) {
        filtered = filtered.filter(product =>
            product.name?.toLowerCase().includes(ProductManagementState.searchTerm)
        );
    }

    ProductManagementState.filteredProducts = filtered;
    renderProducts(filtered);
}

/**
 * Render products list
 */
function renderProducts(products) {
    const list = document.getElementById('products-list');
    if (!list) return;

    if (products.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8">
                <span class="material-symbols-outlined text-4xl text-muted mb-2">inventory_2</span>
                <p class="text-muted">Nenhum produto encontrado</p>
            </div>
        `;
        return;
    }

    list.innerHTML = products.map(product => `
        <div class="product-item ${!product.available ? 'opacity-50' : ''}" data-product-id="${product.id}">
            <div class="product-drag">
                <span class="material-symbols-outlined">drag_indicator</span>
            </div>
            <div class="product-icon ${getCategoryType(product.category)}">
                <span class="material-symbols-outlined">${getCategoryIcon(product.category)}</span>
            </div>
            <div class="product-info">
                <div class="flex justify-between items-baseline gap-2">
                    <span class="product-name">${product.name || 'Produto'}</span>
                    <span class="product-price">${formatCurrency(product.price || 0)}</span>
                </div>
                <span class="product-category">${getCategoryLabel(product.category)}</span>
            </div>
            <div class="product-actions">
                <button>
                    <span class="material-symbols-outlined">more_vert</span>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Update product count
 */
function updateProductCount(count) {
    const countEl = document.querySelector('.text-muted .font-semibold');
    if (countEl) {
        countEl.textContent = count;
    }
}

/**
 * Get category type for styling
 */
function getCategoryType(category) {
    switch (category?.toLowerCase()) {
        case 'bebidas':
            return 'drink';
        case 'lanches':
        case 'porcoes':
        case 'sobremesas':
            return 'food';
        default:
            return 'food';
    }
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
    switch (category?.toLowerCase()) {
        case 'bebidas':
            return 'local_drink';
        case 'lanches':
            return 'lunch_dining';
        case 'porcoes':
            return 'restaurant';
        case 'sobremesas':
            return 'cake';
        default:
            return 'restaurant';
    }
}

/**
 * Get category label
 */
function getCategoryLabel(category) {
    switch (category?.toLowerCase()) {
        case 'bebidas':
            return 'Bebidas';
        case 'lanches':
            return 'Lanches';
        case 'porcoes':
            return 'Porcoes';
        case 'sobremesas':
            return 'Sobremesas';
        default:
            return category || 'Outros';
    }
}

/**
 * Handle create product
 */
async function handleCreateProduct(e) {
    e.preventDefault();

    if (ProductManagementState.isLoading) return;

    const nameInput = document.getElementById('product-name');
    const categorySelect = document.getElementById('product-category');
    const priceInput = document.getElementById('product-price');
    const descriptionInput = document.getElementById('product-description');
    const availableCheckbox = e.target.querySelector('input[type="checkbox"]');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const productData = {
        name: nameInput?.value?.trim(),
        category: categorySelect?.value,
        price: parseFloat(priceInput?.value) || 0,
        description: descriptionInput?.value?.trim() || '',
        available: availableCheckbox?.checked ?? true,
        createdAt: Date.now()
    };

    // Validation
    if (!productData.name || !productData.category || productData.price <= 0) {
        window.App?.showToast('Preencha todos os campos obrigatorios', 'warning');
        return;
    }

    ProductManagementState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        const { createProduct } = await import('../firebase-config.js');

        await createProduct(productData);

        window.App?.showToast('Produto salvo com sucesso!', 'success');

        // Close modal and reset form
        closeModal('new-product-modal');
        e.target.reset();
    } catch (error) {
        console.error('Error creating product:', error);
        window.App?.showToast('Erro ao salvar produto', 'danger');
    } finally {
        ProductManagementState.isLoading = false;
        setButtonLoading(submitBtn, false);
    }
}

/**
 * Edit product
 */
function editProduct(productId) {
    const product = ProductManagementState.products.find(p => p.id === productId);

    if (!product) {
        window.App?.showToast('Produto nao encontrado', 'warning');
        return;
    }

    ProductManagementState.selectedProduct = product;

    // For now, show toast. In full implementation, open edit modal
    window.App?.showToast(`Editando ${product.name}`, 'info');
}

/**
 * Toggle product availability
 */
async function toggleAvailability(productId) {
    const product = ProductManagementState.products.find(p => p.id === productId);

    if (!product) {
        window.App?.showToast('Produto nao encontrado', 'warning');
        return;
    }

    try {
        const { updateProduct } = await import('../firebase-config.js');

        await updateProduct(productId, {
            available: !product.available
        });

        window.App?.showToast(
            product.available ? 'Produto indisponibilizado' : 'Produto disponibilizado',
            'success'
        );
    } catch (error) {
        console.error('Error toggling availability:', error);
        window.App?.showToast('Erro ao alterar disponibilidade', 'danger');
    }
}

/**
 * Delete product
 */
async function deleteProduct(productId) {
    const product = ProductManagementState.products.find(p => p.id === productId);

    if (!product) {
        window.App?.showToast('Produto nao encontrado', 'warning');
        return;
    }

    if (!confirm(`Deseja realmente excluir ${product.name}?`)) {
        return;
    }

    try {
        const { deleteProduct: deleteProductFn } = await import('../firebase-config.js');

        await deleteProductFn(productId);

        window.App?.showToast('Produto excluido com sucesso!', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        window.App?.showToast('Erro ao excluir produto', 'danger');
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
 * Format currency
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
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
export function cleanupProductManagement() {
    ProductManagementState.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') {
            unsub();
        }
    });
    ProductManagementState.unsubscribers = [];
}

// Export for global access
window.ProductManagement = {
    init: initProductManagement,
    cleanup: cleanupProductManagement,
    editProduct,
    deleteProduct,
    toggleAvailability
};
