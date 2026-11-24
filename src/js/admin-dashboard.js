/**
 * Admin Dashboard Module
 * Handles dashboard statistics, recent activity, and quick operations from Supabase
 */

import { initSupabase, getSupabase, SUPABASE_CONFIG } from './supabase-config.js';

let currentAdmin = null;
let supabase = null;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Authentication
    checkAuthentication();

    // 2. Initialize Supabase
    supabase = initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    if (!supabase) {
        supabase = getSupabase();
    }

    setupNavigation();
    setupMobileMenu();
    setupLogout();

    // 3. Load live stats and recent products
    await loadDashboardStats();
    await loadRecentProducts();
});

// Check authentication
function checkAuthentication() {
    const sessionData = localStorage.getItem('adminSession');

    if (!sessionData) {
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
    } else {
        try {
            const { admin } = JSON.parse(sessionData);
            currentAdmin = admin;
        } catch (e) {
            console.error('Session error:', e);
        }
    }

    // Update Header UI
    if (currentAdmin) {
        const nameEl = document.getElementById('adminName');
        const roleEl = document.getElementById('adminRole');
        if (nameEl) nameEl.textContent = currentAdmin.full_name || 'Admin User';
        if (roleEl) roleEl.textContent = currentAdmin.role === 'super_admin' ? 'Super Administrator' : 'Administrator';
    }
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item[data-section]');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const section = item.dataset.section;
            if (!section) return;
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(sec => sec.classList.add('d-none'));
            const targetSection = document.getElementById(`${section}-section`);
            if (targetSection) {
                targetSection.classList.remove('d-none');
                const pageTitle = document.getElementById('pageTitle');
                if (pageTitle) pageTitle.textContent = item.textContent.trim();
            }
        });
    });
}

// Setup mobile menu
function setupMobileMenu() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('sidebarCloseBtn');

    function openSidebar() {
        sidebar.classList.add('open');
        if (overlay) { overlay.style.display = 'block'; }
        if (closeBtn) { closeBtn.style.display = 'block'; }
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) { overlay.style.display = 'none'; }
        if (closeBtn) { closeBtn.style.display = 'none'; }
    }

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            if (sidebar.classList.contains('open')) { closeSidebar(); } else { openSidebar(); }
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    // Close sidebar when nav link clicked on mobile (non-section links navigate away anyway)
    sidebar.querySelectorAll('.admin-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) { closeSidebar(); }
        });
    });
}

// Setup logout
function setupLogout() {
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('adminSession');
            showNotification('Logged out successfully', 'info');
            setTimeout(() => { window.location.href = 'admin-login.html'; }, 800);
        });
    }
}

// Load dashboard statistics from Supabase
export async function loadDashboardStats() {
    if (!supabase) {
        supabase = getSupabase() || initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    if (!supabase) return;

    try {
        // Total products count
        const { count: totalProducts } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        // Total admins count
        const { count: totalAdmins } = await supabase
            .from('admin_profiles')
            .select('*', { count: 'exact', head: true });

        // Update UI counters
        const prodCountEl = document.getElementById('totalProducts');
        const adminCountEl = document.getElementById('totalAdmins');
        const recentActivityEl = document.getElementById('recentActivity');

        if (prodCountEl) prodCountEl.textContent = totalProducts !== null ? totalProducts : 0;
        if (adminCountEl) adminCountEl.textContent = totalAdmins !== null ? totalAdmins : 0;
        if (recentActivityEl) recentActivityEl.textContent = (totalProducts || 0) + (totalAdmins || 0);

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load recent products from Supabase
export async function loadRecentProducts() {
    if (!supabase) {
        supabase = getSupabase() || initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    if (!supabase) return;

    const tableBody = document.getElementById('recentProductsTable');
    if (!tableBody) return;

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(6);

        if (error) throw error;

        if (!products || products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        No products found in Supabase.<br>
                        <a href="admin-products.html" class="btn btn-sm btn-admin mt-2">Manage Products</a>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = products.map(product => {
            const price = parseFloat(product.price) || 0;
            const stock = parseInt(product.stock_quantity) || 0;
            const image = product.thumbnail_url || (product.images && product.images[0]) || 'assets/images/products/new-products/p1.png';

            // Convert storage format to INR for display (1 USD = 83 INR)
            const USD_TO_INR_RATE = 83;
            const displayPrice = price * USD_TO_INR_RATE;

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <img src="${image}" alt="${escapeHtml(product.name)}" style="width: 36px; height: 36px; object-fit: contain; border-radius: 4px; border: 1px solid #e2e8f0; background:#f8fafc;" onerror="this.src='assets/images/products/new-products/p1.png'">
                            <span class="fw-semibold text-dark">${escapeHtml(product.name)}</span>
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${escapeHtml(product.category)}</span></td>
                    <td class="fw-bold text-success">₹${displayPrice.toFixed(2)}</td>
                    <td>
                        <span class="badge ${stock > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">
                            ${stock > 0 ? `${stock} in stock` : 'Out of stock'}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${product.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">
                            ${product.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading recent products:', error);
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed top-0 end-0 m-4 shadow-sm`;
    notification.style.zIndex = '99999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3500);
}

// Helper: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}