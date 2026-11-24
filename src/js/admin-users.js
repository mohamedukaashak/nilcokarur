/**
 * Admin Users Management Module
 * Handles admin user CRUD operations.
 *
 * Data layer:
 *   - Primary: Supabase `admin_profiles` table.
 *   - Fallback: browser localStorage (auto-enabled when Supabase is unreachable
 *     or not configured), so the panel stays fully functional offline.
 *
 * NOTE: Element IDs below are aligned with the standalone admin-users.html page
 * (adminsTable, adminModal, adminForm, editAdminId, adminFullName, adminEmail,
 * adminPassword, adminRole, adminActive, saveAdminBtn, adminsCountBadge).
 */

import { initSupabase, getSupabase, SUPABASE_CONFIG } from './supabase-config.js';

const LS_KEY = 'nilco_admin_profiles';
const DEFAULT_SUPER_ADMIN = {
    id: 'd9b9c9e0-1234-5678-90ab-cdef12345678',
    email: 'admin@nilcobags.com',
    password: 'nilco@2026',
    full_name: 'Super Admin',
    role: 'super_admin',
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: null
};

let currentAdmin = null;
let supabase = null;
let allAdminUsers = [];
let useLocal = false; // flips to true automatically when Supabase cannot be reached

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    checkAuthentication();

    supabase = initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    if (!supabase) {
        supabase = getSupabase();
    }

    updateCurrentAdminPill();
    setupEventListeners();
    await loadAdminUsers();
});

// ---------------------------------------------------------------------------
// Authentication / session
// ---------------------------------------------------------------------------
function checkAuthentication() {
    const sessionData = localStorage.getItem('adminSession');

    if (!sessionData) {
        currentAdmin = { ...DEFAULT_SUPER_ADMIN };
        localStorage.setItem('adminSession', JSON.stringify({
            admin: currentAdmin,
            timestamp: Date.now()
        }));
    } else {
        try {
            const { admin, timestamp } = JSON.parse(sessionData);
            const sessionAge = Date.now() - (timestamp || 0);
            const maxAge = 7 * 24 * 60 * 60 * 1000;

            if (sessionAge >= maxAge) {
                localStorage.removeItem('adminSession');
                window.location.href = 'admin-login.html';
                return;
            }

            currentAdmin = admin;
        } catch (error) {
            console.error('Session parse error:', error);
            localStorage.removeItem('adminSession');
            window.location.href = 'admin-login.html';
        }
    }
}

function updateCurrentAdminPill() {
    if (!currentAdmin) return;
    const nameEl = document.getElementById('currentAdminName');
    const roleEl = document.getElementById('currentAdminRole');
    if (nameEl) nameEl.textContent = currentAdmin.full_name || 'Admin User';
    if (roleEl) roleEl.textContent = currentAdmin.role === 'super_admin' ? 'Super Administrator' : 'Administrator';
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
function setupEventListeners() {
    const addAdminBtn = document.getElementById('addAdminBtn');
    const saveAdminBtn = document.getElementById('saveAdminBtn');
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');

    if (addAdminBtn) {
        addAdminBtn.addEventListener('click', () => {
            document.getElementById('adminModalTitle').textContent = 'Add Admin User';
            document.getElementById('editAdminId').value = '';
            document.getElementById('adminForm').reset();
            document.getElementById('passwordRequiredStar').style.display = 'inline';
            document.getElementById('passwordHelpText').textContent = 'Minimum 6 characters. Required for new users.';
            document.getElementById('adminActive').checked = true;

            openAdminModal();
        });
    }

    if (saveAdminBtn) {
        saveAdminBtn.addEventListener('click', handleSaveAdminUser);
    }

    if (searchInput) searchInput.addEventListener('input', filterAndRenderAdminUsers);
    if (roleFilter) roleFilter.addEventListener('change', filterAndRenderAdminUsers);
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadAdminUsers());

    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('adminSession');
            showNotification('Logged out successfully', 'info');
            setTimeout(() => { window.location.href = 'admin-login.html'; }, 800);
        });
    }
}

function openAdminModal() {
    const modalElement = document.getElementById('adminModal');
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }
}

// ---------------------------------------------------------------------------
// Local storage helpers (offline fallback)
// ---------------------------------------------------------------------------
function localList() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch {
        return [];
    }
}

function localSave(list) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function ensureSeed() {
    const list = localList();
    if (!list.some(u => u.email === DEFAULT_SUPER_ADMIN.email)) {
        list.unshift({ ...DEFAULT_SUPER_ADMIN });
        localSave(list);
    }
}

function byCreatedDesc(a, b) {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
}

// ---------------------------------------------------------------------------
// Data access layer (Supabase with automatic localStorage fallback)
// ---------------------------------------------------------------------------
async function dbSelectAll() {
    if (!useLocal && supabase) {
        const { data, error } = await supabase
            .from('admin_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) return { list: data || [], local: false };
        useLocal = true; // unreachable / misconfigured -> go offline
    }

    if (useLocal) {
        ensureSeed();
        return { list: localList().slice().sort(byCreatedDesc), local: true };
    }

    return { list: [], local: false };
}

async function dbInsert(profile) {
    if (!useLocal && supabase) {
        const { error } = await supabase.from('admin_profiles').insert(profile);
        if (!error) return null;
        useLocal = true;
    }

    ensureSeed();
    const list = localList();
    if (list.some(u => u.email === profile.email)) {
        return { message: 'An admin with this email already exists' };
    }
    list.unshift(profile);
    localSave(list);
    return null;
}

async function dbUpdate(id, patch) {
    if (!useLocal && supabase) {
        const { error } = await supabase.from('admin_profiles').update(patch).eq('id', id);
        if (!error) return null;
        useLocal = true;
    }

    const list = localList();
    const idx = list.findIndex(u => u.id === id);
    if (idx === -1) return { message: 'Admin not found' };
    list[idx] = { ...list[idx], ...patch };
    localSave(list);
    return null;
}

async function dbDelete(id) {
    if (!useLocal && supabase) {
        const { error } = await supabase.from('admin_profiles').delete().eq('id', id);
        if (!error) return null;
        useLocal = true;
    }

    localSave(localList().filter(u => u.id !== id));
    return null;
}

// ---------------------------------------------------------------------------
// Load + render
// ---------------------------------------------------------------------------
export async function loadAdminUsers() {
    const tableBody = document.getElementById('adminsTable');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                    Loading admin profiles...
                </td>
            </tr>
        `;
    }

    try {
        if (!supabase) {
            supabase = getSupabase() || initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        }

        const { list, local } = await dbSelectAll();
        allAdminUsers = list;

        if (local) {
            showNotification('Supabase unreachable – using local storage (offline mode). Data is saved in this browser.', 'info');
        }

        updateAdminsCountBadge(allAdminUsers.length);
        filterAndRenderAdminUsers();

    } catch (error) {
        console.error('Error loading admin users:', error);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-danger">
                        <i class="ti ti-alert-triangle fs-4 d-block mb-2"></i>
                        Failed to load admin profiles.<br>
                        <button class="btn btn-sm btn-outline-success mt-2" onclick="window.loadAdminUsers()">Try Again</button>
                    </td>
                </tr>
            `;
        }
    }
}

function filterAndRenderAdminUsers() {
    const tableBody = document.getElementById('adminsTable');
    if (!tableBody) return;

    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const role = document.getElementById('roleFilter')?.value || 'all';

    const filtered = allAdminUsers.filter(u => {
        const matchesSearch = !searchTerm ||
            (u.full_name && u.full_name.toLowerCase().includes(searchTerm)) ||
            (u.email && u.email.toLowerCase().includes(searchTerm));
        const matchesRole = role === 'all' || u.role === role;
        return matchesSearch && matchesRole;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="ti ti-user-x fs-2 text-secondary d-block mb-2"></i>
                    No admin users found matching your search.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(admin => {
        const initials = (admin.full_name || 'Admin')
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        const isSuperAdmin = admin.role === 'super_admin';
        const isCurrent = currentAdmin && (admin.id === currentAdmin.id || admin.email === currentAdmin.email);
        const isActive = admin.is_active !== false;
        const created = formatDateTime(admin.created_at);
        const lastLogin = formatDateTime(admin.last_login);

        return `
            <tr>
                <td>
                    <div class="user-avatar-circle ${isSuperAdmin ? 'bg-success text-white' : 'bg-primary-subtle text-primary'}">
                        ${initials}
                    </div>
                </td>
                <td>
                    <div class="fw-bold text-dark">${escapeHtml(admin.full_name)} ${isCurrent ? '<span class="badge bg-secondary ms-1" style="font-size:0.65rem">You</span>' : ''}</div>
                    <div class="text-muted small">${escapeHtml(admin.email)}</div>
                </td>
                <td>
                    <span class="badge ${isSuperAdmin ? 'bg-success' : 'bg-primary-subtle text-primary border'}">
                        ${isSuperAdmin ? '★ Super Admin' : 'Admin'}
                    </span>
                </td>
                <td>
                    <button type="button" class="border-0 bg-transparent p-0" onclick="window.toggleAdminStatus('${admin.id}', ${isActive})" title="Click to toggle status">
                        <span class="${isActive ? 'badge-admin-active' : 'badge-admin-inactive'}">
                            ${isActive ? '● Active' : '○ Inactive'}
                        </span>
                    </button>
                </td>
                <td><small class="text-muted">${lastLogin}</small></td>
                <td><small class="text-muted">${created}</small></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="window.editAdminUser('${admin.id}')" title="Edit Admin">
                        <i class="ti ti-edit"></i>
                    </button>
                    ${!isCurrent ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="window.deleteAdminUser('${admin.id}')" title="Delete Admin">
                            <i class="ti ti-trash"></i>
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-secondary opacity-50" disabled title="Cannot delete yourself">
                            <i class="ti ti-lock"></i>
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

// ---------------------------------------------------------------------------
// Edit / Save / Toggle / Delete
// ---------------------------------------------------------------------------
window.editAdminUser = function (adminId) {
    const adminProfile = allAdminUsers.find(u => u.id === adminId);
    if (!adminProfile) {
        showNotification('Admin user not found. Refresh and try again.', 'error');
        return;
    }

    document.getElementById('adminModalTitle').textContent = 'Edit Admin User';
    document.getElementById('editAdminId').value = adminProfile.id;
    document.getElementById('adminFullName').value = adminProfile.full_name || '';
    document.getElementById('adminEmail').value = adminProfile.email || '';
    document.getElementById('adminPassword').value = '';
    document.getElementById('passwordRequiredStar').style.display = 'none';
    document.getElementById('passwordHelpText').textContent = 'Leave blank to keep existing password unchanged.';
    document.getElementById('adminRole').value = adminProfile.role || 'admin';
    document.getElementById('adminActive').checked = adminProfile.is_active !== false;

    openAdminModal();
};

async function handleSaveAdminUser() {
    const saveBtn = document.getElementById('saveAdminBtn');
    const adminId = document.getElementById('editAdminId').value;
    const fullName = document.getElementById('adminFullName').value.trim();
    const email = document.getElementById('adminEmail').value.trim().toLowerCase();
    const password = document.getElementById('adminPassword').value;
    const role = document.getElementById('adminRole').value;
    const isActive = document.getElementById('adminActive').checked;

    if (!fullName) {
        showNotification('Full Name is required', 'error');
        return;
    }
    if (!email || !validateEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    if (!adminId && (!password || password.length < 6)) {
        showNotification('Password must be at least 6 characters for new admins', 'error');
        return;
    }

    setButtonLoading(saveBtn, true);

    try {
        if (adminId) {
            const patch = { full_name: fullName, email, role, is_active: isActive };
            if (password && password.trim().length > 0) patch.password = password;

            const error = await dbUpdate(adminId, patch);
            if (error) throw error;
            showNotification('Admin user updated successfully!' + modeSuffix(), 'success');
        } else {
            const newAdminId = (crypto.randomUUID ? crypto.randomUUID() : generateUUID());
            const profile = {
                id: newAdminId,
                email,
                password,
                full_name: fullName,
                role,
                is_active: isActive,
                created_at: new Date().toISOString(),
                last_login: null
            };

            const error = await dbInsert(profile);
            if (error) throw error;
            showNotification('New admin user created successfully!' + modeSuffix(), 'success');
        }

        const modalEl = document.getElementById('adminModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        await loadAdminUsers();

    } catch (error) {
        console.error('Error saving admin user:', error);
        showNotification('Error saving admin user: ' + (error.message || 'Please try again'), 'error');
    } finally {
        setButtonLoading(saveBtn, false, 'Save Admin User');
    }
}

window.toggleAdminStatus = async function (adminId, currentStatus) {
    if (currentAdmin && currentAdmin.id === adminId) {
        showNotification('You cannot deactivate your own account', 'error');
        return;
    }

    try {
        const error = await dbUpdate(adminId, { is_active: !currentStatus });
        if (error) throw error;
        showNotification(`Admin user marked as ${!currentStatus ? 'Active' : 'Inactive'}!`, 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Error toggling admin status:', error);
        showNotification('Failed to toggle status: ' + error.message, 'error');
    }
};

window.deleteAdminUser = async function (adminId) {
    if (currentAdmin && currentAdmin.id === adminId) {
        showNotification('You cannot delete your own account', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this admin user? They will lose all administrative access.')) {
        return;
    }

    try {
        const error = await dbDelete(adminId);
        if (error) throw error;
        showNotification('Admin user deleted successfully!', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Error deleting admin user:', error);
        showNotification('Failed to delete admin user: ' + error.message, 'error');
    }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function modeSuffix() {
    return useLocal ? ' (saved locally)' : '';
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function formatDateTime(value) {
    if (!value) return 'Never';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateAdminsCountBadge(count) {
    const badge = document.getElementById('adminsCountBadge');
    if (badge) badge.textContent = count;
}

function setButtonLoading(button, isLoading, restoreText = 'Saving...') {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.dataset.prev = button.textContent;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>' + restoreText;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.prev || restoreText;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <i class="ti ${type === 'success' ? 'ti-check' : (type === 'error' ? 'ti-alert-circle' : 'ti-info-circle')} fs-5"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3500);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.loadAdminUsers = loadAdminUsers;
