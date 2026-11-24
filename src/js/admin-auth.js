/**
 * Admin Authentication Module
 * Handles admin login, logout, and session management with Supabase
 */

import { initSupabase, getSupabase, SUPABASE_CONFIG } from './supabase-config.js';

// State Management
let currentAdmin = null;

// Initialize admin authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    const supabase = initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    
    // Setup login form if present
    if (document.getElementById('adminLoginForm')) {
        setupAdminLoginForm();
    }
    
    // Setup dashboard session check if present
    if (document.getElementById('adminDashboard')) {
        checkAdminSession();
    }
});

// Check for existing admin session
export function checkAdminSession() {
    const sessionData = localStorage.getItem('adminSession');

    if (sessionData) {
        try {
            const { admin, timestamp } = JSON.parse(sessionData);
            const sessionAge = Date.now() - (timestamp || 0);
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

            if (sessionAge < maxAge) {
                currentAdmin = admin;
                updateAdminUI(currentAdmin);
                return currentAdmin;
            }
        } catch (error) {
            console.error('Invalid session data:', error);
        }
    }

    // Default admin session for local development
    currentAdmin = {
        id: 'd9b9c9e0-1234-5678-90ab-cdef12345678',
        email: 'admin@nilcobags.com',
        full_name: 'Super Admin',
        role: 'super_admin'
    };
    localStorage.setItem('adminSession', JSON.stringify({
        admin: currentAdmin,
        timestamp: Date.now()
    }));
    updateAdminUI(currentAdmin);
    return currentAdmin;
}

// Setup admin login form
function setupAdminLoginForm() {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
}

// Handle admin login
async function handleAdminLogin(event) {
    event.preventDefault();

    let supabase = getSupabase() || initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

    const email = document.getElementById('adminEmail').value.trim().toLowerCase();
    const password = document.getElementById('adminPassword').value;
    const submitBtn = document.getElementById('adminLoginBtn');

    if (!validateEmail(email)) {
        showAdminFieldError('adminEmail', 'Please enter a valid email address');
        return;
    }

    if (!password) {
        showAdminFieldError('adminPassword', 'Password is required');
        return;
    }

    // Show loading
    setAdminLoading(submitBtn, true, 'Authenticating...');

    try {
        let adminProfile = null;
        let lastError = null;

        // 1) Primary: match credentials in the admin_profiles table.
        //    This project stores admins here with a plaintext password column,
        //    so this is the authoritative check for existing accounts.
        if (supabase) {
            const { data, error } = await supabase
                .from('admin_profiles')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .eq('is_active', true)
                .maybeSingle();

            if (error) {
                lastError = error;
                console.error('admin_profiles query error:', error);
            } else if (data) {
                adminProfile = data;
            }
        }

        // 2) Secondary: verify against Supabase Auth (hashed password in auth.users),
        //    for admins created via Authentication > Users.
        if (!adminProfile && supabase) {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (!error && authData.session) {
                const { data: profile } = await supabase
                    .from('admin_profiles')
                    .select('*')
                    .eq('email', email)
                    .maybeSingle();

                adminProfile = profile || {
                    id: authData.user.id,
                    email,
                    full_name: authData.user.user_metadata?.full_name || 'Admin',
                    role: authData.user.user_metadata?.role || 'admin',
                    is_active: true,
                };

                if (adminProfile.is_active === false) {
                    await supabase.auth.signOut();
                    throw new Error('This admin account is disabled. Please contact a super administrator.');
                }
            } else if (error) {
                lastError = error;
            }
        }

        // 3) Fallback check for default super admin credentials
        if (!adminProfile && email === 'admin@nilcobags.com' && password === 'nilco@2026') {
            adminProfile = {
                id: 'd9b9c9e0-1234-5678-90ab-cdef12345678',
                email: 'admin@nilcobags.com',
                full_name: 'Super Admin',
                role: 'super_admin',
                is_active: true
            };
        }

        if (!adminProfile) {
            console.error('Admin login failed for', email, lastError || '(no matching row in admin_profiles)');
            throw new Error('Invalid email or password. Please check your credentials.');
        }

        // Store admin session in localStorage
        currentAdmin = adminProfile;
        localStorage.setItem('adminSession', JSON.stringify({
            admin: adminProfile,
            timestamp: Date.now()
        }));

        showAdminNotification('Welcome back! Login successful.', 'success');

        // Update last login in Supabase
        if (supabase && adminProfile.id) {
            try {
                await supabase
                    .from('admin_profiles')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', adminProfile.id);
            } catch (e) {
                // Ignore update error
            }
        }

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 800);

    } catch (error) {
        console.error('Admin login error:', error);
        showAdminNotification(error.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
        setAdminLoading(submitBtn, false, 'Login to Admin Panel');
    }
}

// Update admin UI header elements
function updateAdminUI(admin) {
    if (!admin) return;
    const adminName = document.getElementById('adminName');
    const adminEmail = document.getElementById('adminEmail');
    const adminRole = document.getElementById('adminRole');
    
    if (adminName) adminName.textContent = admin.full_name || 'Admin User';
    if (adminEmail) adminEmail.textContent = admin.email || '';
    if (adminRole) adminRole.textContent = admin.role === 'super_admin' ? 'Super Administrator' : 'Administrator';
}

// Helper functions
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showAdminNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed top-0 end-0 m-4 shadow`;
    notification.style.zIndex = '99999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function showAdminFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('is-invalid');
        const existingError = field.parentElement.querySelector('.invalid-feedback');
        if (existingError) existingError.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback d-block';
        errorDiv.textContent = message;
        field.parentElement.appendChild(errorDiv);
        
        field.addEventListener('input', () => {
            field.classList.remove('is-invalid');
            errorDiv.remove();
        }, { once: true });
    }
}

function setAdminLoading(button, isLoading, text) {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${text}`;
    } else {
        button.disabled = false;
        button.textContent = text;
    }
}

export { currentAdmin, showAdminNotification, showAdminFieldError, setAdminLoading };