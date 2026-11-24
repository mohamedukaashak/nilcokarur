/**
 * Authentication Module
 * Handles user login, signup, logout, profile management, and session persistence
 */

import { initSupabase, getSupabase, SUPABASE_CONFIG } from './supabase-config.js';

// State Management
let currentUser = null;
let currentSession = null;

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    const supabase = initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    
    if (!supabase) {
        console.error('Failed to initialize Supabase. Please configure your credentials in supabase-config.js');
        return;
    }

    // Check for existing session
    await checkSession();
    
    // Setup event listeners
    setupAuthEventListeners();
    
    // Setup auth state listener
    setupAuthStateListener();
});

// Check for existing session
async function checkSession() {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentSession = session;
        await fetchUserProfile(session.user.id);
        updateAuthUI(true, currentUser);
    }
}

// Listen to auth state changes
function setupAuthStateListener() {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.onAuthStateChange((event, session) => {
        currentSession = session;
        
        if (event === 'SIGNED_IN' && session) {
            fetchUserProfile(session.user.id).then(() => {
                updateAuthUI(true, currentUser);
            });
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            updateAuthUI(false, null);
        }
    });
}

// Setup all event listeners
function setupAuthEventListeners() {
    // Tab switching
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    
    if (loginTab) {
        loginTab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('login');
        });
    }
    
    if (signupTab) {
        signupTab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('signup');
        });
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Profile image upload
    const profileImageInput = document.getElementById('profileImageInput');
    if (profileImageInput) {
        profileImageInput.addEventListener('change', handleProfileImagePreview);
    }
    
    // Profile image upload (edit modal)
    const profileImageInputEdit = document.getElementById('profileImageInputEdit');
    if (profileImageInputEdit) {
        profileImageInputEdit.addEventListener('change', handleProfileImagePreviewEdit);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // View profile button
    const viewProfileBtn = document.getElementById('viewProfileBtn');
    if (viewProfileBtn) {
        viewProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openProfileModal();
        });
    }
    
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Mobile account button
    const mobileAccountBtn = document.querySelector('.mobile-nav-item[href="#account"]');
    if (mobileAccountBtn) {
        mobileAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                openProfileModal();
            } else {
                const userModal = new bootstrap.Modal(document.getElementById('userModal'));
                userModal.show();
            }
        });
    }
}

// Switch between login and signup tabs
function switchTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const modalTitle = document.getElementById('userModalLabel');
    const loginFooter = document.getElementById('loginFooter');
    const signupFooter = document.getElementById('signupFooter');
    
    if (tab === 'login') {
        loginTab?.classList.add('active');
        signupTab?.classList.remove('active');
        loginForm?.classList.remove('hidden');
        signupForm?.classList.add('hidden');
        loginFooter?.classList.remove('hidden');
        signupFooter?.classList.add('hidden');
        if (modalTitle) modalTitle.textContent = 'Login';
    } else {
        signupTab?.classList.add('active');
        loginTab?.classList.remove('active');
        signupForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
        loginFooter?.classList.add('hidden');
        signupFooter?.classList.remove('hidden');
        if (modalTitle) modalTitle.textContent = 'Sign Up';
    }
    
    // Clear forms
    loginForm?.reset();
    signupForm?.reset();
    clearValidation(loginForm);
    clearValidation(signupForm);
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const supabase = getSupabase();
    if (!supabase) {
        showNotification('Supabase not configured. Please setup your credentials.', 'error');
        return;
    }
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');
    
    // Validate
    if (!validateEmail(email)) {
        showFieldError('loginEmail', 'Please enter a valid email address');
        return;
    }
    
    if (!password) {
        showFieldError('loginPassword', 'Password is required');
        return;
    }
    
    // Show loading
    setLoading(submitBtn, true, 'Logging in...');
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // Success
        showNotification('Welcome back! Login successful.', 'success');
        
        // Fetch profile
        await fetchUserProfile(data.user.id);
        updateAuthUI(true, currentUser);
        
        // Close modal
        const userModal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
        userModal?.hide();
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
        setLoading(submitBtn, false, 'Login');
    }
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();
    
    const supabase = getSupabase();
    if (!supabase) {
        showNotification('Supabase not configured. Please setup your credentials.', 'error');
        return;
    }
    
    const fullName = document.getElementById('signupFullName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const termsCheckbox = document.getElementById('signupTerms');
    const submitBtn = document.getElementById('signupSubmitBtn');
    
    // Validate
    if (!fullName) {
        showFieldError('signupFullName', 'Full name is required');
        return;
    }
    
    if (!validateEmail(email)) {
        showFieldError('signupEmail', 'Please enter a valid email address');
        return;
    }
    
    if (!validatePhone(phone)) {
        showFieldError('signupPhone', 'Please enter a valid phone number');
        return;
    }
    
    if (password.length < 6) {
        showFieldError('signupPassword', 'Password must be at least 6 characters');
        return;
    }
    
    if (password !== confirmPassword) {
        showFieldError('signupConfirmPassword', 'Passwords do not match');
        return;
    }
    
    if (!termsCheckbox.checked) {
        showNotification('Please accept the Terms of Service and Privacy Policy', 'error');
        return;
    }
    
    // Show loading
    setLoading(submitBtn, true, 'Creating Account...');
    
    try {
        // Handle profile image upload first if provided
        const profileImageInput = document.getElementById('profileImageInput');
        let avatarUrl = null;
        
        if (profileImageInput.files[0]) {
            avatarUrl = await uploadProfileImage(profileImageInput.files[0]);
        }
        
        // Create user in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone
                },
                emailRedirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
        // Create profile in database
        if (data.user) {
            // Wait a moment for the trigger to create the profile
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try to update the profile with avatar_url (trigger already created basic profile)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    full_name: fullName,
                    phone: phone,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString()
                });
            
            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Don't throw - user was created, profile can be added later
            }
        }
        
        // Success
        if (data.user && !data.session) {
            // Email confirmation required
            showNotification('Account created successfully! Please check your email to verify your account before logging in.', 'success');
        } else {
            // Auto-login after signup (email confirmation disabled)
            showNotification('Account created successfully! You are now logged in.', 'success');
            
            // Fetch profile
            if (data.user) {
                await fetchUserProfile(data.user.id);
                updateAuthUI(true, currentUser);
            }
            
            // Close modal
            const userModal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
            userModal?.hide();
        }
        
    } catch (error) {
        console.error('Signup error:', error);
        showNotification(error.message || 'Signup failed. Please try again.', 'error');
    } finally {
        setLoading(submitBtn, false, 'Sign Up');
    }
}

// Upload profile image to Supabase Storage
async function uploadProfileImage(file) {
    const supabase = getSupabase();
    if (!supabase) return null;
    
    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Image size must be less than 5MB', 'error');
        return null;
    }
    
    if (!file.type.startsWith('image/')) {
        showNotification('Please upload an image file', 'error');
        return null;
    }
    
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        // Upload file
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);
        
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        
        return publicUrl;
        
    } catch (error) {
        console.error('Image upload error:', error);
        showNotification('Failed to upload image. Please try again.', 'error');
        return null;
    }
}

// Fetch user profile from database
async function fetchUserProfile(userId) {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // Profile doesn't exist, will be created on first login
                console.log('Profile not found, will be created on next update');
                return;
            }
            throw error;
        }
        
        currentUser = data;
        
    } catch (error) {
        console.error('Fetch profile error:', error);
    }
}

// Update UI based on auth state
function updateAuthUI(isLoggedIn, user) {
    const userIconLogin = document.getElementById('userIconLogin');
    const userDropdown = document.getElementById('userDropdown');
    const userAvatar = document.getElementById('userAvatar');
    const defaultUserIcon = document.getElementById('defaultUserIcon');
    const userName = document.getElementById('userName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    const userDropdownArea = document.getElementById('userDropdownArea');
    
    if (isLoggedIn && user) {
        // Hide login icon, show dropdown
        if (userIconLogin) userIconLogin.classList.add('hidden');
        if (userDropdown) userDropdown.classList.remove('hidden');
        
        // Show user info
        if (user.avatar_url && userAvatar) {
            userAvatar.src = user.avatar_url;
            userAvatar.classList.remove('hidden');
            if (defaultUserIcon) defaultUserIcon.classList.add('hidden');
        }
        
        if (userName) {
            userName.textContent = user.full_name || 'User';
            userName.classList.remove('hidden');
        }
        
        // Update dropdown menu info
        if (dropdownUserName) {
            dropdownUserName.textContent = user.full_name || 'User';
        }
        if (dropdownUserEmail) {
            dropdownUserEmail.textContent = currentSession?.user?.email || '';
        }
        
        // Enable dropdown
        if (userDropdownArea) {
            userDropdownArea.setAttribute('data-bs-toggle', 'dropdown');
        }
        
    } else {
        // Show login icon, hide dropdown
        if (userIconLogin) userIconLogin.classList.remove('hidden');
        if (userDropdown) userDropdown.classList.add('hidden');
        
        // Show default icon
        if (userAvatar) {
            userAvatar.classList.add('hidden');
        }
        if (defaultUserIcon) {
            defaultUserIcon.classList.remove('hidden');
        }
        if (userName) {
            userName.classList.add('hidden');
        }
        
        // Disable dropdown
        if (userDropdownArea) {
            userDropdownArea.removeAttribute('data-bs-toggle');
        }
    }
}

// Handle logout
async function handleLogout(event) {
    event?.preventDefault();
    
    const supabase = getSupabase();
    if (!supabase) return;
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        showNotification('You have been logged out successfully.', 'success');
        currentUser = null;
        currentSession = null;
        
        // Close dropdown
        const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('userDropdownArea'));
        dropdown?.hide();
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed. Please try again.', 'error');
    }
}

// Handle profile image preview
function handleProfileImagePreview(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById('profileImagePreview');
    if (!preview) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `
            <img src="${e.target.result}" class="w-20 h-20 rounded-full object-cover mx-auto" alt="Preview" />
        `;
    };
    reader.readAsDataURL(file);
}

// Handle profile image preview (edit modal)
function handleProfileImagePreviewEdit(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById('profileImagePreviewEdit');
    if (!preview) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `
            <img src="${e.target.result}" class="w-20 h-20 rounded-full object-cover mx-auto" alt="Preview" />
        `;
    };
    reader.readAsDataURL(file);
}

// Open profile modal
function openProfileModal() {
    if (!currentUser) return;
    
    // Populate form with user data
    const profileImagePreview = document.getElementById('profileImagePreview');
    const editFullName = document.getElementById('editFullName');
    const editEmail = document.getElementById('editEmail');
    const editPhone = document.getElementById('editPhone');
    const editAddress = document.getElementById('editAddress');
    const editCity = document.getElementById('editCity');
    const editState = document.getElementById('editState');
    const editPinCode = document.getElementById('editPinCode');
    
    if (currentUser.avatar_url && profileImagePreview) {
        profileImagePreview.innerHTML = `
            <img src="${currentUser.avatar_url}" class="w-20 h-20 rounded-full object-cover mx-auto" alt="Profile" />
        `;
    }
    
    if (editFullName) editFullName.value = currentUser.full_name || '';
    if (editEmail) editEmail.value = currentSession?.user?.email || '';
    if (editPhone) editPhone.value = currentUser.phone || '';
    if (editAddress) editAddress.value = currentUser.address || '';
    if (editCity) editCity.value = currentUser.city || '';
    if (editState) editState.value = currentUser.state || '';
    if (editPinCode) editPinCode.value = currentUser.pin_code || '';
    
    // Open modal
    const profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
    profileModal.show();
}

// Handle profile update
async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const supabase = getSupabase();
    if (!supabase || !currentUser) return;
    
    const fullName = document.getElementById('editFullName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const address = document.getElementById('editAddress').value.trim();
    const city = document.getElementById('editCity').value.trim();
    const state = document.getElementById('editState').value.trim();
    const pinCode = document.getElementById('editPinCode').value.trim();
    const submitBtn = document.getElementById('profileSaveBtn');
    
    // Validate
    if (!fullName) {
        showFieldError('editFullName', 'Name is required');
        return;
    }
    
    // Show loading
    setLoading(submitBtn, true, 'Saving...');
    
    try {
        // Check if profile image was uploaded
        const profileImageInput = document.getElementById('profileImageInputEdit');
        let avatarUrl = currentUser.avatar_url;
        
        if (profileImageInput && profileImageInput.files[0]) {
            const newAvatarUrl = await uploadProfileImage(profileImageInput.files[0]);
            if (newAvatarUrl) {
                avatarUrl = newAvatarUrl;
            }
        }
        
        // Update profile
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                phone: phone,
                avatar_url: avatarUrl,
                address: address,
                city: city,
                state: state,
                pin_code: pinCode,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        // Update local state
        currentUser = {
            ...currentUser,
            full_name: fullName,
            phone: phone,
            avatar_url: avatarUrl,
            address: address,
            city: city,
            state: state,
            pin_code: pinCode
        };
        
        // Update UI
        updateAuthUI(true, currentUser);
        
        showNotification('Profile updated successfully!', 'success');
        
        // Close modal
        const profileModal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        profileModal?.hide();
        
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification(error.message || 'Failed to update profile. Please try again.', 'error');
    } finally {
        setLoading(submitBtn, false, 'Save Changes');
    }
}

// Utility Functions

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\d\s\-\+\(\)]{10,}$/;
    return re.test(phone);
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.classList.add('border-red-500');
    field.classList.remove('border-gray-300');
    
    // Show or create error message
    let errorDiv = field.nextElementSibling;
    if (!errorDiv || !errorDiv.classList.contains('field-error')) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'field-error text-red-500 text-sm mt-1';
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
    }
    errorDiv.textContent = message;
    
    // Remove error on input
    field.addEventListener('input', () => {
        field.classList.remove('border-red-500');
        field.classList.add('border-gray-300');
        if (errorDiv) errorDiv.textContent = '';
    }, { once: true });
}

function clearValidation(form) {
    if (!form) return;
    
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.classList.remove('border-red-500');
        field.classList.add('border-gray-300');
    });
    
    const errors = form.querySelectorAll('.field-error');
    errors.forEach(error => error.textContent = '');
}

function setLoading(button, isLoading, text) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (isLoading) {
        button.disabled = true;
        button.classList.add('opacity-75', 'cursor-not-allowed');
        if (btnText) btnText.classList.add('hidden');
        if (btnLoading) {
            btnLoading.classList.remove('hidden');
            btnLoading.querySelector('.loading-text').textContent = text;
        }
    } else {
        button.disabled = false;
        button.classList.remove('opacity-75', 'cursor-not-allowed');
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoading) btnLoading.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('authNotification');
    if (!notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `auth-notification ${type}`;
    
    const bgColor = type === 'success' ? 'bg-yellow-400' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    
    notification.innerHTML = `
        <div class="${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span class="text-lg font-bold">${icon}</span>
            <span>${message}</span>
        </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}
