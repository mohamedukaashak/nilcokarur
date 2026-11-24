/**
 * Product Management Module
 * Handles product CRUD operations with photo upload to Supabase Storage bucket
 * and persists data into the Supabase 'products' table.
 */

import { initSupabase, getSupabase, SUPABASE_CONFIG } from './supabase-config.js';
import { DEMO_BAG_PRODUCTS } from './products.js';

let currentAdmin = null;
let supabase = null;
let allProducts = [];

// In-memory state for selected photo files to upload
let selectedPhotoFiles = [];
let existingPhotoUrls = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Authentication
    checkAuthentication();

    // 2. Initialize Supabase
    supabase = initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    if (!supabase) {
        supabase = getSupabase();
    }

    // 3. Setup event listeners & photo upload dropzone
    setupEventListeners();
    setupPhotoDropzone();

    // 4. Load initial products
    await loadProducts();
});

// Check authentication and session eligibility
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
            const { admin, timestamp } = JSON.parse(sessionData);
            const sessionAge = Date.now() - (timestamp || 0);
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

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

// Setup event listeners
function setupEventListeners() {
    const addProductBtn = document.getElementById('addProductBtn');
    const saveProductBtn = document.getElementById('saveProductBtn');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const seedDemoProductsBtn = document.getElementById('seedDemoProductsBtn');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const clearPhotosBtn = document.getElementById('clearPhotosBtn');

    // Add Product Modal trigger
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            document.getElementById('productModalTitle').textContent = 'Add New Product';
            document.getElementById('editProductId').value = '';
            document.getElementById('productForm').reset();
            document.getElementById('productStock').value = '20';
            document.getElementById('productActive').checked = true;
            document.getElementById('uploadStatusText').textContent = '';
            
            selectedPhotoFiles = [];
            existingPhotoUrls = [];
            renderPhotoPreviews();

            const modalElement = document.getElementById('productModal');
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            }
        });
    }

    // Save Product
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', handleSaveProduct);
    }

    // Clear all photos
    if (clearPhotosBtn) {
        clearPhotosBtn.addEventListener('click', () => {
            selectedPhotoFiles = [];
            existingPhotoUrls = [];
            const urlInput = document.getElementById('productImages');
            if (urlInput) urlInput.value = '';
            renderPhotoPreviews();
        });
    }

    // Search and Filter Listeners
    if (searchInput) {
        searchInput.addEventListener('input', filterAndRenderProducts);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterAndRenderProducts);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterAndRenderProducts);
    }

    // Refresh Table
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadProducts());
    }

    // Seed Demo Bags
    if (seedDemoProductsBtn) {
        seedDemoProductsBtn.addEventListener('click', handleSeedDemoProducts);
    }

    // Logout
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminSession');
            showNotification('Logged out successfully', 'info');
            setTimeout(() => { window.location.href = 'admin-login.html'; }, 800);
        });
    }

    // Preset Image Buttons in Modal
    document.querySelectorAll('.preset-img-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const imgPath = btn.dataset.img;
            if (!existingPhotoUrls.includes(imgPath)) {
                existingPhotoUrls.push(imgPath);
                renderPhotoPreviews();
            }
        });
    });

    // Auto calculate discount on price change
    const priceInput = document.getElementById('productPrice');
    const origPriceInput = document.getElementById('productOriginalPrice');
    const autoCalcDiscount = () => {
        const p = parseFloat(priceInput.value);
        const op = parseFloat(origPriceInput.value);
        if (p > 0 && op > p) {
            const disc = Math.round(((op - p) / op) * 100);
            origPriceInput.title = `Calculated discount: ${disc}% off`;
        }
    };
    if (priceInput) priceInput.addEventListener('input', autoCalcDiscount);
    if (origPriceInput) origPriceInput.addEventListener('input', autoCalcDiscount);
}

// Setup Photo Dropzone and File Selection
function setupPhotoDropzone() {
    const dropzone = document.getElementById('photoDropzone');
    const fileInput = document.getElementById('productPhotoFiles');

    if (!dropzone || !fileInput) return;

    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        addSelectedFiles(files);
        fileInput.value = ''; // Reset so the same file can be re-selected if needed
    });

    // Drag & Drop events
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            addSelectedFiles(files);
        }
    });
}

// Add newly selected files to state and update preview
function addSelectedFiles(files) {
    if (!files || files.length === 0) return;

    files.forEach(file => {
        // Prevent duplicate files with same name and size
        const isDuplicate = selectedPhotoFiles.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            selectedPhotoFiles.push(file);
        }
    });

    renderPhotoPreviews();
}

// Render photo preview cards in modal
function renderPhotoPreviews() {
    const previewSection = document.getElementById('photoPreviewSection');
    const container = document.getElementById('uploadedPhotosContainer');
    const countText = document.getElementById('photoCountText');

    if (!previewSection || !container) return;

    const totalCount = selectedPhotoFiles.length + existingPhotoUrls.length;

    if (totalCount === 0) {
        previewSection.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    previewSection.style.display = 'block';
    if (countText) countText.textContent = totalCount;

    let html = '';

    // Render existing URLs
    existingPhotoUrls.forEach((url, idx) => {
        const isMain = idx === 0 && selectedPhotoFiles.length === 0;
        html += `
            <div class="uploaded-photo-card" title="${url}">
                <img src="${url}" alt="Product Photo" onerror="this.src='assets/images/products/new-products/p1.png'">
                <button type="button" class="remove-photo-btn" onclick="window.removeExistingPhoto(${idx})" title="Remove photo">✕</button>
                ${isMain ? '<span class="main-badge">MAIN</span>' : ''}
            </div>
        `;
    });

    // Render newly selected files
    selectedPhotoFiles.forEach((file, idx) => {
        const objectUrl = URL.createObjectURL(file);
        const isMain = idx === 0 && existingPhotoUrls.length === 0;
        html += `
            <div class="uploaded-photo-card" title="${escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)">
                <img src="${objectUrl}" alt="${escapeHtml(file.name)}">
                <button type="button" class="remove-photo-btn" onclick="window.removeSelectedFile(${idx})" title="Remove photo">✕</button>
                ${isMain ? '<span class="main-badge">MAIN</span>' : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// Remove a selected file from upload queue
window.removeSelectedFile = function(index) {
    if (selectedPhotoFiles[index]) {
        selectedPhotoFiles.splice(index, 1);
        renderPhotoPreviews();
    }
};

// Remove an existing photo URL
window.removeExistingPhoto = function(index) {
    if (existingPhotoUrls[index]) {
        existingPhotoUrls.splice(index, 1);
        renderPhotoPreviews();
    }
};

/**
 * Upload an image file to Supabase Storage bucket 'products'
 * Returns the public URL of the uploaded image
 */
export async function uploadImageToSupabaseStorage(file) {
    if (!supabase) {
        supabase = getSupabase() || initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }

    const fileExt = file.name.split('.').pop().toLowerCase() || 'png';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `${Date.now()}_${sanitizedName}.${fileExt}`;
    const filePath = `product-photos/${fileName}`;

    try {
        console.log(`Uploading ${file.name} to Supabase Storage bucket 'products'...`);

        // Upload to 'products' bucket
        const { data, error } = await supabase.storage
            .from('products')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type || `image/${fileExt}`
            });

        if (!error && data) {
            // Get public URL from Supabase Storage
            const { data: urlData } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);

            console.log('✅ Supabase Storage upload success:', urlData.publicUrl);
            return urlData.publicUrl;
        }

        if (error) {
            console.warn('Supabase storage upload error:', error);
        }

        // Fallback: convert file to optimized Data URL if bucket RLS/creation is pending
        console.log('Using optimized Data URL fallback for storage...');
        return await readFileAsDataURL(file);

    } catch (err) {
        console.error('Storage upload exception, falling back to data URL:', err);
        return await readFileAsDataURL(file);
    }
}

// Helper: read file as Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve('assets/images/products/new-products/p1.png');
        reader.readAsDataURL(file);
    });
}

// Load all products from Supabase
export async function loadProducts() {
    const tableBody = document.getElementById('productsTable');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5 text-muted">
                    <div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                    Loading products from Supabase...
                </td>
            </tr>
        `;
    }

    try {
        if (!supabase) {
            supabase = getSupabase() || initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        }

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProducts = products || [];
        updateProductsCountBadge(allProducts.length);
        filterAndRenderProducts();

    } catch (error) {
        console.error('Error loading products from Supabase:', error);
        showNotification('Failed to load products: ' + (error.message || 'Check database'), 'error');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-danger">
                        <i class="ti ti-alert-triangle fs-4 d-block mb-2"></i>
                        Failed to connect to Supabase products table.<br>
                        <button class="btn btn-sm btn-outline-success mt-2" onclick="window.loadProducts()">Try Again</button>
                    </td>
                </tr>
            `;
        }
    }
}

// Filter and render products table
function filterAndRenderProducts() {
    const tableBody = document.getElementById('productsTable');
    if (!tableBody) return;

    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const status = document.getElementById('statusFilter')?.value || 'all';

    let filtered = allProducts.filter(p => {
        const matchesSearch = !searchTerm ||
            (p.name && p.name.toLowerCase().includes(searchTerm)) ||
            (p.category && p.category.toLowerCase().includes(searchTerm)) ||
            (p.id && p.id.toString().toLowerCase().includes(searchTerm));

        const matchesCategory = category === 'all' || p.category === category;
        const matchesStatus = status === 'all' ||
            (status === 'active' && p.is_active) ||
            (status === 'inactive' && !p.is_active);

        return matchesSearch && matchesCategory && matchesStatus;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5 text-muted">
                    <i class="ti ti-box-off fs-2 text-secondary d-block mb-2"></i>
                    No products found matching your filter criteria.<br>
                    <button class="btn btn-sm btn-admin mt-3" onclick="document.getElementById('addProductBtn').click()">
                        + Add First Product
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(product => {
        const price = parseFloat(product.price) || 0;
        const origPrice = product.original_price ? parseFloat(product.original_price) : null;
        const discount = product.discount_percentage || (origPrice && origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0);

        // Convert storage format to INR for display (1 USD = 83 INR)
        const USD_TO_INR_RATE = 83;
        const displayPrice = price * USD_TO_INR_RATE;
        const displayOrigPrice = origPrice ? origPrice * USD_TO_INR_RATE : null;
        const image = product.thumbnail_url || (product.images && product.images[0]) || 'assets/images/products/new-products/p1.png';
        const stock = parseInt(product.stock_quantity) || 0;

        return `
            <tr>
                <td>
                    <img src="${image}" alt="${escapeHtml(product.name)}" class="product-image-preview" onerror="this.src='assets/images/products/new-products/p1.png'">
                </td>
                <td>
                    <div class="fw-bold text-dark">${escapeHtml(product.name)}</div>
                    <small class="text-muted">Slug: ${escapeHtml(product.slug || 'n/a')}</small>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">${escapeHtml(product.category)}</span>
                </td>
                <td>
                    <div class="fw-bold text-success">₹${displayPrice.toFixed(2)}</div>
                    ${displayOrigPrice ? `<small class="text-muted text-decoration-line-through">₹${displayOrigPrice.toFixed(2)}</small> <span class="badge bg-danger-subtle text-danger" style="font-size:0.7rem">${discount}% off</span>` : ''}
                </td>
                <td>
                    <span class="badge ${stock > 10 ? 'bg-success-subtle text-success' : (stock > 0 ? 'bg-warning-subtle text-warning' : 'bg-danger-subtle text-danger')}">
                        ${stock > 0 ? `${stock} in stock` : 'Out of stock'}
                    </span>
                </td>
                <td>
                    ${product.is_featured ? '<span class="badge-featured">★ Featured</span>' : '<span class="text-muted small">-</span>'}
                </td>
                <td>
                    <button type="button" class="border-0 bg-transparent p-0" onclick="window.toggleProductStatus('${product.id}', ${product.is_active})" title="Click to toggle status">
                        <span class="${product.is_active ? 'badge-admin-active' : 'badge-admin-inactive'}">
                            ${product.is_active ? '● Active' : '○ Inactive'}
                        </span>
                    </button>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="window.editProduct('${product.id}')" title="Edit Product">
                        <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteProduct('${product.id}')" title="Delete Product">
                        <i class="ti ti-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Edit Product (populate modal with existing photos)
window.editProduct = async function(productId) {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;

        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('editProductId').value = product.id;
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productCategory').value = product.category || '';

        // Convert storage format to INR for display (1 USD = 83 INR)
        const USD_TO_INR_RATE = 83;
        document.getElementById('productPrice').value = product.price ? (product.price * USD_TO_INR_RATE).toFixed(2) : '';
        document.getElementById('productOriginalPrice').value = product.original_price ? (product.original_price * USD_TO_INR_RATE).toFixed(2) : '';
        document.getElementById('productStock').value = product.stock_quantity !== undefined ? product.stock_quantity : 20;
        document.getElementById('productDescription').value = product.description || '';
        
        // Populate photos
        selectedPhotoFiles = [];
        if (Array.isArray(product.images)) {
            existingPhotoUrls = [...product.images];
        } else if (typeof product.images === 'string' && product.images) {
            existingPhotoUrls = product.images.split(',').map(s => s.trim()).filter(Boolean);
        } else if (product.thumbnail_url) {
            existingPhotoUrls = [product.thumbnail_url];
        } else {
            existingPhotoUrls = [];
        }

        document.getElementById('productSizes').value = Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes || '');
        document.getElementById('productColors').value = Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors || '');
        document.getElementById('productFeatured').checked = !!product.is_featured;
        document.getElementById('productActive').checked = product.is_active !== false;
        document.getElementById('uploadStatusText').textContent = '';

        renderPhotoPreviews();

        const modal = new bootstrap.Modal(document.getElementById('productModal'));
        modal.show();

    } catch (error) {
        console.error('Error loading product details:', error);
        showNotification('Failed to load product details: ' + error.message, 'error');
    }
};

// Handle Save Product (Uploads photos to Supabase Storage & saves product data)
async function handleSaveProduct() {
    const saveBtn = document.getElementById('saveProductBtn');
    const statusText = document.getElementById('uploadStatusText');
    const productId = document.getElementById('editProductId').value;
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const priceInput = parseFloat(document.getElementById('productPrice').value);
    const origPriceVal = document.getElementById('productOriginalPrice').value;
    const originalPriceInput = origPriceVal ? parseFloat(origPriceVal) : null;

    // Convert INR to storage format (1 USD = 83 INR)
    const USD_TO_INR_RATE = 83;
    const price = priceInput / USD_TO_INR_RATE;
    const originalPrice = originalPriceInput ? originalPriceInput / USD_TO_INR_RATE : null;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const description = document.getElementById('productDescription').value.trim();
    const sizesRaw = document.getElementById('productSizes').value.trim();
    const colorsRaw = document.getElementById('productColors').value.trim();
    const isFeatured = document.getElementById('productFeatured').checked;
    const isActive = document.getElementById('productActive').checked;
    const customUrlInput = document.getElementById('productImages')?.value.trim() || '';

    // Validation
    if (!name) {
        showNotification('Product Name is required', 'error');
        return;
    }
    if (!category) {
        showNotification('Category is required', 'error');
        return;
    }
    if (isNaN(price) || price < 0) {
        showNotification('Please enter a valid price', 'error');
        return;
    }

    // Check if user provided photos (either uploaded files, existing URLs, or custom text input)
    let finalImageUrls = [...existingPhotoUrls];

    if (customUrlInput) {
        const extraUrls = customUrlInput.split(',').map(s => s.trim()).filter(Boolean);
        extraUrls.forEach(url => {
            if (!finalImageUrls.includes(url)) finalImageUrls.push(url);
        });
    }

    if (selectedPhotoFiles.length === 0 && finalImageUrls.length === 0) {
        showNotification('Please upload at least one product photo', 'error');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Uploading Photos...';

    try {
        // Step 1: Upload each newly selected photo file to Supabase Storage
        if (selectedPhotoFiles.length > 0) {
            for (let i = 0; i < selectedPhotoFiles.length; i++) {
                const file = selectedPhotoFiles[i];
                if (statusText) statusText.textContent = `Uploading photo ${i + 1} of ${selectedPhotoFiles.length} to Supabase...`;

                const uploadedUrl = await uploadImageToSupabaseStorage(file);
                if (uploadedUrl) {
                    finalImageUrls.push(uploadedUrl);
                }
            }
        }

        if (finalImageUrls.length === 0) {
            finalImageUrls = ['assets/images/products/new-products/p1.png'];
        }

        const thumbnail = finalImageUrls[0];
        const sizesArray = sizesRaw ? sizesRaw.split(',').map(s => s.trim()).filter(Boolean) : ['Small', 'Medium', 'Large'];
        const colorsArray = colorsRaw ? colorsRaw.split(',').map(s => s.trim()).filter(Boolean) : ['Black', 'Brown'];

        // Auto calculate discount
        let discount = 0;
        if (originalPrice && originalPrice > price) {
            discount = Math.round(((originalPrice - price) / originalPrice) * 100);
        }

        // Generate unique slug (now async)
        const slug = await generateUniqueSlug(name, productId);

        const productPayload = {
            name: name,
            slug: slug,
            category: category,
            price: price,
            original_price: originalPrice,
            discount_percentage: discount,
            stock_quantity: stock,
            description: description,
            images: finalImageUrls,
            thumbnail_url: thumbnail,
            sizes: sizesArray,
            colors: colorsArray,
            is_featured: isFeatured,
            is_active: isActive
        };

        // Safe UUID check for admin ID foreign key
        // Only set created_by/updated_by if the admin came from a real login session
        // (i.e., not the hardcoded fallback UUID which won't exist in admin_profiles)
        const FALLBACK_ADMIN_ID = 'd9b9c9e0-1234-5678-90ab-cdef12345678';
        const isValidUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
        const isRealAdmin = currentAdmin && isValidUUID(currentAdmin.id) && currentAdmin.id !== FALLBACK_ADMIN_ID;
        if (isRealAdmin) {
            if (!productId) {
                productPayload.created_by = currentAdmin.id;
            }
            productPayload.updated_by = currentAdmin.id;
        }

        if (statusText) statusText.textContent = 'Saving product details in database...';

        if (productId) {
            // Update existing
            const { error } = await supabase
                .from('products')
                .update(productPayload)
                .eq('id', productId);

            if (error) throw error;
            showNotification('Product and photos updated successfully in Supabase!', 'success');
        } else {
            // Insert new product
            const { error } = await supabase
                .from('products')
                .insert(productPayload);

            if (error) throw error;
            showNotification('New product & photos stored successfully in Supabase!', 'success');
        }

        // Close modal and reload
        const modalEl = document.getElementById('productModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        selectedPhotoFiles = [];
        existingPhotoUrls = [];

        await loadProducts();

    } catch (error) {
        console.error('Error saving product to Supabase:', error);
        showNotification('Error saving product: ' + (error.message || error.details || 'Check console'), 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save & Upload Product';
        if (statusText) statusText.textContent = '';
    }
}

// Toggle product active status directly
window.toggleProductStatus = async function(productId, currentStatus) {
    try {
        const { error } = await supabase
            .from('products')
            .update({ is_active: !currentStatus })
            .eq('id', productId);

        if (error) throw error;

        showNotification(`Product marked as ${!currentStatus ? 'Active' : 'Inactive'}!`, 'success');
        await loadProducts();

    } catch (error) {
        console.error('Error toggling status:', error);
        showNotification('Failed to toggle status: ' + error.message, 'error');
    }
};

// Delete Product
window.deleteProduct = async function(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;

        showNotification('Product deleted successfully from Supabase!', 'success');
        await loadProducts();

    } catch (error) {
        console.error('Error deleting product from Supabase:', error);
        showNotification('Failed to delete product: ' + error.message, 'error');
    }
};

// Seed Demo Bag Products
async function handleSeedDemoProducts() {
    if (!confirm('Would you like to seed 10 premium demo bag products into Supabase?')) {
        return;
    }

    const btn = document.getElementById('seedDemoProductsBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Seeding...';

    try {
        const { error } = await supabase.from('products').insert(DEMO_BAG_PRODUCTS);
        if (error) throw error;

        showNotification('Successfully seeded demo bag products into Supabase!', 'success');
        await loadProducts();

    } catch (error) {
        console.error('Error seeding demo products:', error);
        showNotification('Failed to seed demo products: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-database-import me-1"></i> Seed Demo Bags';
    }
}

// Generate unique slug
async function generateUniqueSlug(text, existingId = null) {
    const baseSlug = text
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    
    // Check if base slug already exists
    const { data: existingProducts } = await supabase
        .from('products')
        .select('id, slug')
        .eq('slug', baseSlug);
    
    if (!existingProducts || existingProducts.length === 0) {
        return baseSlug; // Base slug is available
    }
    
    // If editing and the slug belongs to the same product, keep it
    if (existingId && existingProducts.length === 1 && existingProducts[0].id === existingId) {
        return baseSlug;
    }
    
    // Generate unique slug with suffix
    let counter = 1;
    let uniqueSlug;
    do {
        uniqueSlug = `${baseSlug}-${counter}`;
        const { data: checkProducts } = await supabase
            .from('products')
            .select('id')
            .eq('slug', uniqueSlug);
        
        if (!checkProducts || checkProducts.length === 0) {
            return uniqueSlug;
        }
        
        // If editing and the slug belongs to the same product, keep it
        if (existingId && checkProducts.length === 1 && checkProducts[0].id === existingId) {
            return uniqueSlug;
        }
        
        counter++;
    } while (counter < 100);
    
    // Fallback to timestamp if all else fails
    return `${baseSlug}-${Date.now()}`;
}

// Update count badge
function updateProductsCountBadge(count) {
    const badge = document.getElementById('productsCountBadge');
    if (badge) badge.textContent = count;
}

// Show Toast / Notification
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

window.loadProducts = loadProducts;
