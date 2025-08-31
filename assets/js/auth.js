// Authentication functions
async function checkAdminAccess() {
    if (!isAuthenticated()) {
        showPasswordModal();
        return false;
    }
    return true;
}

function showPasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) {
        modal.classList.add('active');
        const passwordInput = document.getElementById('password-input');
        if (passwordInput) {
            passwordInput.focus();
        }
    }
}

async function checkPassword() {
    const passwordInput = document.getElementById('password-input');
    const messageDiv = document.getElementById('password-message');
    
    if (!passwordInput || !messageDiv) return;
    
    const password = passwordInput.value;
    
    if (!password) {
        messageDiv.innerHTML = '<div class="message error">Please enter a password</div>';
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.getElementById('password-submit-btn') || 
                          document.querySelector('.password-buttons button:first-child');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.textContent = 'Authenticating...';
            submitBtn.disabled = true;
        }
        
        const response = await apiCall('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        
        if (response.success && response.token) {
            setAuthToken(response.token);
            closePasswordModal();
            await onAuthSuccess();
            passwordInput.value = '';
            messageDiv.innerHTML = '';
        }
    } catch (error) {
        console.error('Authentication error:', error);
        messageDiv.innerHTML = '<div class="message error">Incorrect password. Try again.</div>';
        passwordInput.value = '';
        passwordInput.focus();
    } finally {
        // Restore button state
        const submitBtn = document.getElementById('password-submit-btn') || 
                          document.querySelector('.password-buttons button:first-child');
        if (submitBtn) {
            submitBtn.textContent = 'Submit';
            submitBtn.disabled = false;
        }
    }
}

function closePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    const passwordInput = document.getElementById('password-input');
    const messageDiv = document.getElementById('password-message');
    if (passwordInput) passwordInput.value = '';
    if (messageDiv) messageDiv.innerHTML = '';
}

function logout() {
    clearAuth();
    window.location.href = 'index.html';
}

// Function to be overridden by pages that need post-auth actions
async function onAuthSuccess() {
    // Override this in individual pages
    console.log('Authentication successful');
}

// Check token validity
async function validateToken() {
    if (!authToken) return false;
    
    try {
        // Try to make an authenticated request
        await apiCall('/admin/players');
        return true;
    } catch (error) {
        // Token is invalid, clear it
        clearAuth();
        return false;
    }
}

// Initialize auth on page load
window.addEventListener('DOMContentLoaded', async () => {
    // Set up event listeners
    setupAuthEventListeners();
    
    // Check if we have a stored token and if it's valid
    if (authToken) {
        const isValid = await validateToken();
        if (!isValid) {
            clearAuth();
        }
    }
    
    // Check if page requires immediate auth check
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'admin.html' || currentPage === 'tournaments.html') {
        setTimeout(async () => {
            if (!authToken || !(await validateToken())) {
                showPasswordModal();
            } else {
                await onAuthSuccess();
            }
        }, 200);
    }
});

function setupAuthEventListeners() {
    // Close modal if clicked outside
    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) {
                closePasswordModal();
            }
        });
    }
    
    // Password input enter key
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
    }
    
    // Password modal buttons
    const submitBtn = document.getElementById('password-submit-btn');
    const cancelBtn = document.getElementById('password-cancel-btn');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', checkPassword);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closePasswordModal);
    }
    
    // Fallback for inline button handlers
    const inlineSubmitBtn = document.querySelector('.password-buttons button:first-child');
    const inlineCancelBtn = document.querySelector('.password-buttons button.cancel-btn');
    
    if (inlineSubmitBtn && !inlineSubmitBtn.id) {
        inlineSubmitBtn.addEventListener('click', checkPassword);
    }
    
    if (inlineCancelBtn && !inlineCancelBtn.id) {
        inlineCancelBtn.addEventListener('click', closePasswordModal);
    }
}