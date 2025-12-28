/**
 * Authentication Module
 * Handles login, register, and password reset functionality
 */

class AuthManager {
    constructor() {
        this.currentTab = 'login';
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Password visibility toggle
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });

        // Form validation on input
        document.querySelectorAll('.auth-form input').forEach(input => {
            input.addEventListener('blur', (e) => this.validateField(e.target));
            input.addEventListener('input', (e) => this.clearFieldError(e.target));
        });
    }

    switchTab(tab) {
        if (!tab || tab === this.currentTab) return;

        this.currentTab = tab;

        // Update tab styles
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Show/hide forms
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (tab === 'login') {
            loginForm?.classList.remove('hidden');
            registerForm?.classList.add('hidden');
        } else {
            loginForm?.classList.add('hidden');
            registerForm?.classList.remove('hidden');
        }

        // Clear errors
        this.clearAllErrors();
    }

    togglePasswordVisibility(e) {
        const btn = e.currentTarget;
        const input = btn.closest('.form-input-wrapper').querySelector('input');
        const icon = btn.querySelector('.material-symbols-outlined');

        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility_off';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility';
        }
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name || field.id;
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'email':
            case 'login-email':
            case 'register-email':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Email e obrigatorio';
                } else if (!this.isValidEmail(value)) {
                    isValid = false;
                    errorMessage = 'Email invalido';
                }
                break;

            case 'password':
            case 'login-password':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Senha e obrigatoria';
                }
                break;

            case 'register-password':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Senha e obrigatoria';
                } else if (value.length < 6) {
                    isValid = false;
                    errorMessage = 'Senha deve ter pelo menos 6 caracteres';
                }
                break;

            case 'register-confirm-password':
                const password = document.getElementById('register-password')?.value;
                if (!value) {
                    isValid = false;
                    errorMessage = 'Confirme a senha';
                } else if (value !== password) {
                    isValid = false;
                    errorMessage = 'As senhas nao coincidem';
                }
                break;

            case 'name':
            case 'register-name':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Nome e obrigatorio';
                } else if (value.length < 3) {
                    isValid = false;
                    errorMessage = 'Nome deve ter pelo menos 3 caracteres';
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showFieldError(field, message) {
        field.classList.add('error');

        // Create or update error message
        let errorEl = field.closest('.form-group')?.querySelector('.field-error');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'field-error';
            field.closest('.form-input-wrapper')?.after(errorEl);
        }
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorEl = field.closest('.form-group')?.querySelector('.field-error');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    clearAllErrors() {
        document.querySelectorAll('.auth-form input').forEach(input => {
            this.clearFieldError(input);
        });
        document.querySelectorAll('.auth-error').forEach(error => {
            error.classList.remove('show');
        });
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], input:not([type="hidden"])');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }
}

// Password strength indicator
class PasswordStrength {
    constructor(inputId, indicatorId) {
        this.input = document.getElementById(inputId);
        this.indicator = document.getElementById(indicatorId);

        if (this.input) {
            this.input.addEventListener('input', () => this.check());
        }
    }

    check() {
        const password = this.input.value;
        const strength = this.calculateStrength(password);
        this.updateIndicator(strength);
    }

    calculateStrength(password) {
        let score = 0;

        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 2) return { level: 'weak', text: 'Fraca', color: 'var(--danger)' };
        if (score <= 4) return { level: 'medium', text: 'Media', color: 'var(--warning)' };
        return { level: 'strong', text: 'Forte', color: 'var(--success)' };
    }

    updateIndicator(strength) {
        if (!this.indicator) return;

        this.indicator.textContent = strength.text;
        this.indicator.style.color = strength.color;
        this.indicator.dataset.strength = strength.level;
    }
}

// Initialize on page load
let authManager;

function initAuthPage() {
    authManager = new AuthManager();

    // Initialize password strength if register form exists
    if (document.getElementById('register-password')) {
        new PasswordStrength('register-password', 'password-strength');
    }
}

// Export for use in main.js
window.initAuthPage = initAuthPage;
window.AuthManager = AuthManager;
