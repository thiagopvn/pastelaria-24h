/**
 * New Product Modal Module
 * Handles product creation and editing
 */

// State
const NewProductModalState = {
    isLoading: false,
    isEditMode: false,
    editingProductId: null
};

/**
 * Initialize New Product Modal
 */
export function initNewProductModal() {
    console.log('Initializing new product modal...');

    // Setup modal triggers
    setupModalTriggers();

    // Setup form
    setupForm();

    // Setup availability toggle
    setupAvailabilityToggle();
}

/**
 * Setup modal triggers
 */
function setupModalTriggers() {
    // Open modal buttons
    document.querySelectorAll('[data-modal-open="new-product-modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            openModal();
        });
    });

    // Close modal buttons
    document.querySelectorAll('[data-modal-close="new-product-modal"]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Close on overlay click
    document.getElementById('new-product-modal-overlay')?.addEventListener('click', closeModal);
}

/**
 * Setup form
 */
function setupForm() {
    const form = document.getElementById('new-product-form');

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

/**
 * Setup availability toggle
 */
function setupAvailabilityToggle() {
    const toggle = document.querySelector('#new-product-form .toggle input');

    if (toggle) {
        toggle.addEventListener('change', (e) => {
            const label = e.target.closest('.flex')?.querySelector('span.text-sm');
            if (label) {
                label.textContent = e.target.checked ? 'Disponivel para Venda' : 'Indisponivel';
            }
        });
    }
}

/**
 * Open modal for creating or editing product
 */
function openModal(productData = null) {
    NewProductModalState.isEditMode = !!productData;
    NewProductModalState.editingProductId = productData?.id || null;

    const modal = document.getElementById('new-product-modal');
    const overlay = document.getElementById('new-product-modal-overlay');
    const title = modal?.querySelector('h2');
    const submitBtn = modal?.querySelector('button[type="submit"]');

    if (modal && overlay) {
        // Update title and button text based on mode
        if (title) {
            title.textContent = NewProductModalState.isEditMode ? 'Editar Produto' : 'Novo Produto';
        }

        if (submitBtn) {
            submitBtn.textContent = NewProductModalState.isEditMode ? 'Salvar Alteracoes' : 'Salvar Produto';
        }

        // Populate form if editing
        if (productData) {
            populateForm(productData);
        }

        modal.style.display = 'block';
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            modal.style.transform = 'translateY(0)';
        }, 10);
    }
}

/**
 * Populate form with product data
 */
function populateForm(productData) {
    const nameInput = document.getElementById('product-name');
    const categorySelect = document.getElementById('product-category');
    const priceInput = document.getElementById('product-price');
    const descriptionInput = document.getElementById('product-description');
    const availableCheckbox = document.querySelector('#new-product-form .toggle input');

    if (nameInput) nameInput.value = productData.name || '';
    if (categorySelect) categorySelect.value = productData.category || '';
    if (priceInput) priceInput.value = productData.price || '';
    if (descriptionInput) descriptionInput.value = productData.description || '';
    if (availableCheckbox) availableCheckbox.checked = productData.available !== false;
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('new-product-modal');
    const overlay = document.getElementById('new-product-modal-overlay');

    if (modal && overlay) {
        modal.style.transform = 'translateY(100%)';
        overlay.classList.remove('active');
        document.body.style.overflow = '';

        setTimeout(() => {
            modal.style.display = 'none';
            resetForm();
        }, 300);
    }
}

/**
 * Reset form
 */
function resetForm() {
    const form = document.getElementById('new-product-form');
    const availableCheckbox = document.querySelector('#new-product-form .toggle input');

    if (form) {
        form.reset();
    }

    // Reset toggle to checked
    if (availableCheckbox) {
        availableCheckbox.checked = true;
    }

    NewProductModalState.isEditMode = false;
    NewProductModalState.editingProductId = null;
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    if (NewProductModalState.isLoading) return;

    const nameInput = document.getElementById('product-name');
    const categorySelect = document.getElementById('product-category');
    const priceInput = document.getElementById('product-price');
    const descriptionInput = document.getElementById('product-description');
    const availableCheckbox = document.querySelector('#new-product-form .toggle input');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const name = nameInput?.value?.trim() || '';
    const category = categorySelect?.value || '';
    const price = parseFloat(priceInput?.value) || 0;
    const description = descriptionInput?.value?.trim() || '';
    const available = availableCheckbox?.checked ?? true;

    // Validation
    if (!name) {
        window.App?.showToast('Informe o nome do produto', 'warning');
        return;
    }

    if (!category) {
        window.App?.showToast('Selecione uma categoria', 'warning');
        return;
    }

    if (price <= 0) {
        window.App?.showToast('Informe o preco do produto', 'warning');
        return;
    }

    NewProductModalState.isLoading = true;
    setButtonLoading(submitBtn, true);

    try {
        if (NewProductModalState.isEditMode) {
            // Update existing product
            const { updateProduct } = await import('../firebase-config.js');

            await updateProduct(NewProductModalState.editingProductId, {
                name,
                category,
                price,
                description,
                available,
                updatedAt: Date.now()
            });

            window.App?.showToast('Produto atualizado com sucesso!', 'success');
        } else {
            // Create new product
            const { createProduct } = await import('../firebase-config.js');

            await createProduct({
                name,
                category,
                price,
                description,
                available,
                createdAt: Date.now()
            });

            window.App?.showToast('Produto criado com sucesso!', 'success');
        }

        closeModal();
    } catch (error) {
        console.error('Error saving product:', error);
        window.App?.showToast('Erro ao salvar produto', 'danger');
    } finally {
        NewProductModalState.isLoading = false;
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
window.NewProductModal = {
    init: initNewProductModal,
    open: openModal,
    close: closeModal
};
