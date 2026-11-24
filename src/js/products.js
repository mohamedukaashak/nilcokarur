/**
 * Products Module
 * Fetches and displays products dynamically from Supabase database
 * Connects admin-stored products to the client storefront
 */

import { initSupabase, getSupabase, SUPABASE_CONFIG } from './supabase-config.js';

let supabase = null;
let currentCategoryFilter = 'all';

// Default bag demo products to seed into Supabase if table is empty
// Available high-res bag photos pool
export const BAG_GALLERY_POOL = [
    "assets/images/products/new-products/p1.png",
    "assets/images/products/new-products/p2.png",
    "assets/images/products/new-products/p3.png",
    "assets/images/products/new-products/p4.png",
    "assets/images/products/new-products/p5.png",
    "assets/images/products/new-products/p6.png",
    "assets/images/products/new-products/p7.png",
    "assets/images/products/new-products/p8.png",
    "assets/images/products/new-products/p9.png",
    "assets/images/products/new-products/p10.png",
    "assets/images/products/new-products/p11.png"
];

// Helper to guarantee 4 unique, diverse photos for any product in the modal
export function getDiverseProductImages(imagesInput, fallbackSeed = '') {
    let images = [];
    if (Array.isArray(imagesInput)) {
        images = imagesInput.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof imagesInput === 'string' && imagesInput.trim()) {
        images = imagesInput.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Filter out duplicates
    const uniqueImages = [...new Set(images)];

    // If fewer than 4 unique images, supplement with diverse photos from the bag pool
    if (uniqueImages.length < 4) {
        let seedNum = 0;
        const seedStr = fallbackSeed || (uniqueImages[0] || 'nilco-bag');
        for (let i = 0; i < seedStr.length; i++) {
            seedNum += seedStr.charCodeAt(i);
        }
        for (let i = 0; i < BAG_GALLERY_POOL.length && uniqueImages.length < 4; i++) {
            const candidate = BAG_GALLERY_POOL[(seedNum + i) % BAG_GALLERY_POOL.length];
            if (!uniqueImages.includes(candidate)) {
                uniqueImages.push(candidate);
            }
        }
    }

    return uniqueImages.slice(0, 4);
}

// Attach globally
if (typeof window !== 'undefined') {
    window.getDiverseProductImages = getDiverseProductImages;
}

// Default bag demo products with 4 diverse photos each
export const DEMO_BAG_PRODUCTS = [
    {
        name: "Premium Leather Backpack",
        slug: "premium-leather-backpack",
        category: "Backpacks",
        price: 18.00,
        original_price: 24.00,
        discount_percentage: 25,
        stock_quantity: 45,
        rating: 4.5,
        reviews_count: 149,
        description: "Premium quality genuine leather backpack with multiple padded compartments, laptop sleeve, and water-resistant finish. Perfect for daily commute, college, and travel.",
        images: [
            "assets/images/products/new-products/p1.png",
            "assets/images/products/new-products/p2.png",
            "assets/images/products/new-products/p3.png",
            "assets/images/products/new-products/p4.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p1.png",
        sizes: ["Small", "Medium", "Large"],
        colors: ["Black", "Brown", "Tan"],
        is_featured: true,
        is_active: true
    },
    {
        name: "Classic Canvas Tote Bag",
        slug: "classic-canvas-tote-bag",
        category: "Tote Bags",
        price: 24.00,
        original_price: 32.00,
        discount_percentage: 25,
        stock_quantity: 60,
        rating: 4.8,
        reviews_count: 98,
        description: "Heavy-duty organic canvas tote bag with reinforced handles and interior zip pocket. Eco-friendly and stylish for shopping, beach, or work.",
        images: [
            "assets/images/products/new-products/p2.png",
            "assets/images/products/new-products/p5.png",
            "assets/images/products/new-products/p6.png",
            "assets/images/products/new-products/p7.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p2.png",
        sizes: ["Medium", "Large"],
        colors: ["Beige", "Navy", "Olive"],
        is_featured: true,
        is_active: true
    },
    {
        name: "Vintage Shoulder Bag",
        slug: "vintage-shoulder-bag",
        category: "Shoulder Bags",
        price: 32.00,
        original_price: 45.00,
        discount_percentage: 29,
        stock_quantity: 28,
        rating: 4.7,
        reviews_count: 112,
        description: "Elegant retro style shoulder bag made with vegan leather, brass hardware, and adjustable strap. Complements any formal or casual outfit.",
        images: [
            "assets/images/products/new-products/p3.png",
            "assets/images/products/new-products/p7.png",
            "assets/images/products/new-products/p8.png",
            "assets/images/products/new-products/p9.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p3.png",
        sizes: ["One Size"],
        colors: ["Burgundy", "Black", "Caramel"],
        is_featured: false,
        is_active: true
    },
    {
        name: "Urban Crossbody Bag",
        slug: "urban-crossbody-bag",
        category: "Crossbody Bags",
        price: 15.00,
        original_price: 20.00,
        discount_percentage: 25,
        stock_quantity: 80,
        rating: 4.6,
        reviews_count: 76,
        description: "Compact, lightweight urban crossbody sling bag with quick-access pockets and anti-theft RFID protection.",
        images: [
            "assets/images/products/new-products/p4.png",
            "assets/images/products/new-products/p8.png",
            "assets/images/products/new-products/p9.png",
            "assets/images/products/new-products/p10.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p4.png",
        sizes: ["Small", "Medium"],
        colors: ["Charcoal", "Army Green", "Black"],
        is_featured: false,
        is_active: true
    },
    {
        name: "Executive Laptop Messenger Bag",
        slug: "executive-laptop-messenger-bag",
        category: "Laptop Bags",
        price: 42.00,
        original_price: 55.00,
        discount_percentage: 24,
        stock_quantity: 35,
        rating: 4.9,
        reviews_count: 210,
        description: "Professional briefcase & laptop messenger bag fitting up to 16-inch laptops with shockproof padding and luggage strap.",
        images: [
            "assets/images/products/new-products/p5.png",
            "assets/images/products/new-products/p1.png",
            "assets/images/products/new-products/p11.png",
            "assets/images/products/new-products/p6.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p5.png",
        sizes: ["14 inch", "16 inch"],
        colors: ["Espresso Brown", "Midnight Black"],
        is_featured: true,
        is_active: true
    },
    {
        name: "Weekender Travel Duffle Bag",
        slug: "weekender-travel-duffle-bag",
        category: "Travel Bags",
        price: 48.00,
        original_price: 65.00,
        discount_percentage: 26,
        stock_quantity: 22,
        rating: 4.9,
        reviews_count: 184,
        description: "Spacious waterproof travel duffle bag with dedicated shoe compartment, laundry pouch, and heavy-duty YKK zippers.",
        images: [
            "assets/images/products/new-products/p6.png",
            "assets/images/products/new-products/p2.png",
            "assets/images/products/new-products/p7.png",
            "assets/images/products/new-products/p11.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p6.png",
        sizes: ["40L", "55L"],
        colors: ["Navy Blue", "Slate Grey", "Black"],
        is_featured: true,
        is_active: true
    },
    {
        name: "Designer Handbag & Purse",
        slug: "designer-handbag-purse",
        category: "Handbags",
        price: 38.00,
        original_price: 50.00,
        discount_percentage: 24,
        stock_quantity: 30,
        rating: 4.8,
        reviews_count: 135,
        description: "Chic luxury designer handbag with detachable gold chain strap and spacious interior dividers.",
        images: [
            "assets/images/products/new-products/p7.png",
            "assets/images/products/new-products/p3.png",
            "assets/images/products/new-products/p8.png",
            "assets/images/products/new-products/p1.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p7.png",
        sizes: ["Medium"],
        colors: ["Blush Pink", "Ivory", "Black"],
        is_featured: false,
        is_active: true
    },
    {
        name: "Minimalist Slim Leather Wallet",
        slug: "minimalist-slim-leather-wallet",
        category: "Wallets",
        price: 12.00,
        original_price: 18.00,
        discount_percentage: 33,
        stock_quantity: 120,
        rating: 4.7,
        reviews_count: 320,
        description: "Ultra-slim front pocket leather bifold wallet with RFID blocking and 8 card slots plus currency compartment.",
        images: [
            "assets/images/products/new-products/p8.png",
            "assets/images/products/new-products/p4.png",
            "assets/images/products/new-products/p9.png",
            "assets/images/products/new-products/p2.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p8.png",
        sizes: ["Slim"],
        colors: ["Cognac", "Black", "Dark Brown"],
        is_featured: false,
        is_active: true
    },
    {
        name: "Evening Party Clutch Bag",
        slug: "evening-party-clutch-bag",
        category: "Clutch Bags",
        price: 22.00,
        original_price: 30.00,
        discount_percentage: 27,
        stock_quantity: 40,
        rating: 4.6,
        reviews_count: 65,
        description: "Glamorous evening clutch with metallic shimmer finish, magnetic snap closure, and hidden card pocket.",
        images: [
            "assets/images/products/new-products/p9.png",
            "assets/images/products/new-products/p5.png",
            "assets/images/products/new-products/p10.png",
            "assets/images/products/new-products/p3.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p9.png",
        sizes: ["One Size"],
        colors: ["Gold", "Silver", "Rose Gold", "Black"],
        is_featured: false,
        is_active: true
    },
    {
        name: "All-Weather Hiking Backpack",
        slug: "all-weather-hiking-backpack",
        category: "Backpacks",
        price: 55.00,
        original_price: 75.00,
        discount_percentage: 27,
        stock_quantity: 25,
        rating: 4.9,
        reviews_count: 240,
        description: "Rugged ripstop nylon outdoor backpack with rain cover, hydration bladder compatibility, and ergonomic back airflow system.",
        images: [
            "assets/images/products/new-products/p10.png",
            "assets/images/products/new-products/p11.png",
            "assets/images/products/new-products/p1.png",
            "assets/images/products/new-products/p6.png"
        ],
        thumbnail_url: "assets/images/products/new-products/p10.png",
        sizes: ["35L", "45L"],
        colors: ["Forest Green", "Sunset Orange", "Black"],
        is_featured: true,
        is_active: true
    }
];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    supabase = initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    
    // Setup delegated events for quick view & filters
    setupQuickViewModalHandler();
    setupProductFilters();
    
    if (supabase) {
        await loadProducts();
    }
});

// Load all active products from Supabase
export async function loadProducts(category = null) {
    const mainContainer = document.getElementById('productsContainer') || document.getElementById('allProductsContainer');
    if (!mainContainer) return;

    if (category) {
        currentCategoryFilter = category;
    }

    try {
        if (!supabase) {
            supabase = getSupabase() || initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        }

        let query = supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (currentCategoryFilter && currentCategoryFilter !== 'all' && currentCategoryFilter !== 'All') {
            query = query.eq('category', currentCategoryFilter);
        }

        const { data: products, error } = await query;

        if (error) {
            console.error('Supabase query error:', error);
            throw error;
        }

        console.log(`Loaded ${products ? products.length : 0} products from Supabase for category: ${currentCategoryFilter}`);

        // If table is completely empty on initial load (0 products in database)
        if ((!products || products.length === 0) && currentCategoryFilter === 'all') {
            // Automatically seed demo products to Supabase so admin and client both have data!
            console.log('No products found in Supabase. Attempting to seed demo products...');
            await autoSeedDemoProducts();
            return;
        }

        displayProducts(products || []);
        updateProductCount(products ? products.length : 0);

    } catch (error) {
        console.error('Error loading products from Supabase:', error);
        // Display fallback demo cards if connection fails
        displayFallbackProducts();
    }
}

// Automatically seed demo products into Supabase
export async function autoSeedDemoProducts() {
    if (!supabase) return;
    try {
        const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (count === 0) {
            console.log('Seeding initial bag products to Supabase...');
            const { error } = await supabase.from('products').insert(DEMO_BAG_PRODUCTS);
            if (error) {
                console.warn('Could not auto-seed demo products into Supabase:', error);
                displayFallbackProducts();
            } else {
                console.log('Successfully seeded demo bag products into Supabase!');
                // Reload from Supabase
                const { data: newProducts } = await supabase
                    .from('products')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });
                displayProducts(newProducts || []);
                updateProductCount(newProducts ? newProducts.length : 0);
            }
        }
    } catch (e) {
        console.error('Auto-seed error:', e);
        displayFallbackProducts();
    }
}

// Display products on the page
export function displayProducts(products) {
    const mainContainer = document.getElementById('productsContainer') || document.getElementById('allProductsContainer');
    if (!mainContainer) return;

    if (!products || products.length === 0) {
        mainContainer.innerHTML = `
            <div class="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300 p-8">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-yellow-600 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 mb-1">No products found in this category</h3>
                <p class="text-sm text-gray-500 mb-4">Add new products in the Admin Panel to display them here.</p>
                <a href="admin-products.html" class="inline-flex items-center px-4 py-2 text-sm font-bold bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 transition">
                    Go to Product Management →
                </a>
            </div>
        `;
        return;
    }

    // Generate product cards
    const productCardsHtml = products.map(product => createProductCard(product)).join('');
    mainContainer.innerHTML = productCardsHtml;

    // Trigger price update
    if (window.updateAllPrices && typeof window.updateAllPrices === 'function') {
        window.updateAllPrices();
    }
}

// Create individual product card HTML matching Nilco Bags theme
export function createProductCard(product) {
    const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
    const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
    const discount = product.discount_percentage || (originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0);
    const hasDiscount = discount > 0 && originalPrice;

    // Normalize image list
    let imagesList = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
        imagesList = product.images;
    } else if (typeof product.images === 'string' && product.images.trim()) {
        imagesList = product.images.split(',').map(s => s.trim()).filter(Boolean);
    }
    const primaryImage = product.thumbnail_url || (imagesList.length > 0 ? imagesList[0] : 'assets/images/products/new-products/p1.png');
    const imagesString = imagesList.length > 0 ? imagesList.join(',') : primaryImage;

    // Normalize sizes and colors
    const sizesString = Array.isArray(product.sizes) ? product.sizes.join(',') : (product.sizes || 'Small,Medium,Large');
    const colorsString = Array.isArray(product.colors) ? product.colors.join(',') : (product.colors || '');

    const stock = typeof product.stock_quantity === 'number' ? product.stock_quantity : parseInt(product.stock_quantity) || 0;
    const rating = product.rating || 4.5;
    const reviews = product.reviews_count || 12;
    const productCode = product.id ? 'NBG-' + product.id.toString().substring(0, 6).toUpperCase() : 'NBG001';

    // Format price as INR
    const rate = 83;
    const inrPrice = Math.round(price * rate);
    const inrOriginalPrice = hasDiscount ? Math.round(originalPrice * rate) : 0;
    const displayPrice = `₹${inrPrice}`;
    const displayOriginalPrice = hasDiscount ? `₹${inrOriginalPrice}` : '';

    return `
        <div class="relative flex flex-col min-w-0 rounded-xl sm:rounded-2xl border bg-white border-gray-200/90 card-product transition-all duration-300 hover:shadow-lg hover:border-yellow-400/80 justify-between h-full group overflow-hidden"
             data-product-name="${escapeHtml(product.name)}"
             data-product-category="${escapeHtml(product.category || 'Bags')}"
             data-product-price="₹${inrPrice}"
             data-usd-price="${price}"
             data-product-original-price="${hasDiscount ? '₹' + inrOriginalPrice : ''}"
             data-usd-original-price="${hasDiscount ? originalPrice : ''}"
             data-product-discount="${discount}%"
             data-product-rating="${rating}"
             data-product-reviews="${reviews}"
             data-product-code="${productCode}"
             data-product-type="${escapeHtml(product.category || 'Bag')}"
             data-product-availability="${stock > 0 ? 'In Stock (' + stock + ')' : 'Out of Stock'}"
             data-product-shipping="Free 2-Day Shipping"
             data-product-description="${escapeHtml(product.description || 'Premium bag by Nilco Bags.')}"
             data-product-images="${imagesString}"
             data-product-sizes="${sizesString}"
             data-product-colors="${colorsString}">

            <!-- Product Image & Floating Corner Actions -->
            <div class="relative w-full h-36 sm:h-44 md:h-52 bg-gradient-to-b from-gray-50/80 to-gray-100/50 flex items-center justify-center p-2.5 sm:p-3 overflow-hidden border-b border-gray-100">
                <!-- Badges (Top Left) -->
                <div class="absolute top-2 left-2 z-10 flex flex-col items-start gap-1 pointer-events-none">
                    ${hasDiscount ? `
                        <span class="inline-flex items-center px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-red-600 text-white shadow-xs leading-none">
                            ${discount}% OFF
                        </span>
                    ` : ''}
                    ${product.is_featured ? `
                        <span class="inline-flex items-center px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-yellow-400 text-gray-900 shadow-xs leading-none">
                            Featured
                        </span>
                    ` : ''}
                </div>

                <!-- Floating Wishlist Button (Always accessible top-right) -->
                <button type="button"
                    class="absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 backdrop-blur-xs shadow-xs border border-gray-100 flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-white active:scale-95 transition-all"
                    title="Wishlist" aria-label="Add to Wishlist">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-heart" width="15" height="15" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
                    </svg>
                </button>

                <!-- Main Image -->
                <a href="#!" class="w-full h-full flex items-center justify-center" data-bs-toggle="modal" data-bs-target="#quickViewModal">
                    <img src="${primaryImage}" alt="${escapeHtml(product.name)}" class="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.src='assets/images/products/new-products/p1.png'" />
                </a>

                <!-- Desktop Hover Quick View Action Button -->
                <div class="absolute bottom-2 left-0 right-0 mx-auto w-fit opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hidden md:flex items-center gap-1.5 z-10">
                    <button type="button"
                        class="px-3 py-1.5 bg-white/95 backdrop-blur-xs shadow-md rounded-full text-xs font-bold text-gray-800 hover:bg-yellow-400 hover:text-gray-900 transition-all inline-flex items-center gap-1 quick-view-btn"
                        data-bs-toggle="modal" data-bs-target="#quickViewModal" title="Quick View">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
                            <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
                        </svg>
                        <span>Quick View</span>
                    </button>
                </div>
            </div>

            <!-- Product Details Body -->
            <div class="p-2.5 sm:p-3.5 flex flex-col flex-grow justify-between gap-1.5 sm:gap-2">
                <div>
                    <!-- Category & Stock Status -->
                    <div class="flex items-center justify-between gap-1 mb-0.5">
                        <span class="text-[10px] sm:text-xs font-semibold text-yellow-700 uppercase tracking-wider truncate">
                            ${escapeHtml(product.category || 'Bags')}
                        </span>
                        <div class="flex items-center gap-0.5 text-yellow-500 text-[10px] sm:text-xs font-bold flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />
                            </svg>
                            <span class="text-gray-700">${rating}</span>
                        </div>
                    </div>

                    <!-- Product Name (Adaptive Compact Mobile, max 18 chars) -->
                    <h3 class="text-[11px] sm:text-xs md:text-sm font-semibold sm:font-bold text-gray-900 leading-tight sm:leading-snug min-h-[1.4em] group-hover:text-yellow-600 transition-colors">
                        <a href="#!" data-bs-toggle="modal" data-bs-target="#quickViewModal" title="${escapeHtml(product.name)}">${escapeHtml(product.name.length > 18 ? product.name.substring(0, 18) + '…' : product.name)}</a>
                    </h3>
                </div>

                <!-- Price Row (With Original Price if Discount) -->
                <div class="flex items-baseline gap-2 pt-0.5">
                    <span class="text-sm sm:text-base font-extrabold text-gray-900 card-price">${displayPrice}</span>
                    ${hasDiscount ? `<span class="text-xs sm:text-sm text-gray-500 line-through card-original-price">${displayOriginalPrice}</span>` : ''}
                </div>

                <!-- Add to Cart Full Button -->
                <button type="button"
                    class="w-full mt-1 py-1.5 sm:py-2 px-2.5 rounded-lg sm:rounded-xl bg-yellow-400 text-gray-900 font-bold text-xs sm:text-sm hover:bg-yellow-300 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-xs"
                    onclick="addToCartFromButton(this)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <path d="M12 5l0 14"></path>
                        <path d="M5 12l14 0"></path>
                    </svg>
                    <span>Add to Cart</span>
                </button>
            </div>
        </div>
    `;
}

// Generate star rating SVGs / icons
function generateStarRating(rating) {
    const r = parseFloat(rating) || 4.5;
    const fullStars = Math.floor(r);
    const hasHalfStar = (r % 1) >= 0.3;
    let starsHtml = '';

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            starsHtml += `
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-star-filled inline-block" width="14" height="14" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z" stroke-width="0" fill="currentColor" />
                </svg>
            `;
        } else if (i === fullStars && hasHalfStar) {
            starsHtml += `
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-star-half-filled inline-block" width="14" height="14" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 1a.993 .993 0 0 1 .823 .443l.067 .116l2.852 5.781l6.38 .925c.741 .108 1.08 .94 .703 1.526l-.07 .095l-.078 .086l-4.624 4.499l1.09 6.355a1.001 1.001 0 0 1 -1.249 1.135l-.101 -.035l-.101 -.046l-5.693 -3l-5.706 3c-.105 .055 -.212 .09 -.32 .106l-.106 .01a1.003 1.003 0 0 1 -1.038 -1.06l.013 -.11l1.09 -6.355l-4.623 -4.5a1.001 1.001 0 0 1 .328 -1.647l.113 -.036l.114 -.023l6.379 -.925l2.853 -5.78a.968 .968 0 0 1 .904 -.56zm0 3.274v12.476a1 1 0 0 1 .239 .029l.115 .036l.112 .05l4.363 2.299l-.836 -4.873a1 1 0 0 1 .136 -.696l.07 -.099l.082 -.09l3.546 -3.453l-4.891 -.708a1 1 0 0 1 -.62 -.344l-.073 -.097l-.06 -.106l-2.183 -4.424z" stroke-width="0" fill="currentColor" />
                </svg>
            `;
        } else {
            starsHtml += `
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-star inline-block text-gray-300" width="14" height="14" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />
                </svg>
            `;
        }
    }
    return starsHtml;
}

// Setup Quick View Modal handler using event delegation
export function setupQuickViewModalHandler() {
    document.addEventListener('click', (e) => {
        const quickViewTrigger = e.target.closest('.quick-view-btn, [data-bs-target="#quickViewModal"]');
        if (!quickViewTrigger) return;

        const card = quickViewTrigger.closest('.card-product');
        if (!card) return;

        const modal = document.getElementById('quickViewModal');
        if (!modal) return;

        // Extract metadata from card data attributes
        const name = card.dataset.productName || 'Nilco Bag';
        const category = card.dataset.productCategory || 'Bags';
        const usdPrice = parseFloat(card.dataset.usdPrice) || 0;
        const usdOriginalPrice = parseFloat(card.dataset.usdOriginalPrice) || 0;
        const discount = card.dataset.productDiscount || '';
        const rating = card.dataset.productRating || '4.8';
        const reviews = card.dataset.productReviews || '120';
        const code = card.dataset.productCode || 'NBG001';
        const availability = card.dataset.productAvailability || 'In Stock';
        const shipping = card.dataset.productShipping || 'Free standard shipping';
        const description = card.dataset.productDescription || 'Premium handcrafted bag designed with exceptional care and quality materials.';
        const imagesRaw = card.dataset.productImages || '';
        const sizesRaw = card.dataset.productSizes || 'Small,Medium,Large';

        const rawImages = imagesRaw.split(',').map(s => s.trim()).filter(Boolean);
        // Guarantee 4 distinct, different product photos for the auto-slider
        const diverseImages = getDiverseProductImages(rawImages, name);

        // Update modal images and kick off smooth auto-slide
        if (typeof window.setModalSliderImages === 'function') {
            window.setModalSliderImages(diverseImages);
        } else {
            const mainImg = document.getElementById('modalMainImage');
            const img2 = document.getElementById('modalImage2');
            const img3 = document.getElementById('modalImage3');
            const img4 = document.getElementById('modalImage4');
            const thumb1 = document.getElementById('modalThumb1');
            const thumb2 = document.getElementById('modalThumb2');
            const thumb3 = document.getElementById('modalThumb3');
            const thumb4 = document.getElementById('modalThumb4');

            if (mainImg) mainImg.src = diverseImages[0];
            if (img2) img2.src = diverseImages[1];
            if (img3) img3.src = diverseImages[2];
            if (img4) img4.src = diverseImages[3];

            if (thumb1) thumb1.src = diverseImages[0];
            if (thumb2) thumb2.src = diverseImages[1];
            if (thumb3) thumb3.src = diverseImages[2];
            if (thumb4) thumb4.src = diverseImages[3];
        }

        // Update modal text fields
        const modalCategory = modal.querySelector('a.text-yellow-600');
        const modalTitle = modal.querySelector('h1');
        const modalPrice = modal.querySelector('.text-gray-900.font-semibold.text-lg');
        const modalOriginalPrice = modal.querySelector('.line-through.text-gray-500');
        const modalDiscount = modal.querySelector('.text-red-600');
        const modalReviews = modal.querySelector('a[href="#"].text-yellow-600');
        const modalProductCode = modal.querySelector('tbody tr:nth-child(1) td:last-child');
        const modalAvailability = modal.querySelector('tbody tr:nth-child(2) td:last-child');
        const modalType = modal.querySelector('tbody tr:nth-child(3) td:last-child');
        const modalShipping = modal.querySelector('tbody tr:nth-child(4) td small');

        if (modalCategory) modalCategory.textContent = category;
        if (modalTitle) modalTitle.textContent = name;

        // Store prices in modal dataset
        modal.dataset.usdPrice = usdPrice;
        if (usdOriginalPrice > 0) {
            modal.dataset.usdOriginalPrice = usdOriginalPrice;
        } else {
            delete modal.dataset.usdOriginalPrice;
        }

        const rate = 83;

        if (modalPrice) {
            modalPrice.textContent = `₹${Math.round(usdPrice * rate)}`;
        }
        if (modalOriginalPrice) {
            if (usdOriginalPrice > 0) {
                modalOriginalPrice.textContent = `₹${Math.round(usdOriginalPrice * rate)}`;
                modalOriginalPrice.style.display = 'inline';
            } else {
                modalOriginalPrice.style.display = 'none';
            }
        }
        if (modalDiscount) {
            modalDiscount.textContent = discount ? `${discount} Off` : '';
            modalDiscount.style.display = discount ? 'inline' : 'none';
        }
        if (modalReviews) modalReviews.textContent = `(${reviews} reviews)`;
        if (modalProductCode) modalProductCode.textContent = code;
        if (modalAvailability) modalAvailability.textContent = availability;
        if (modalType) modalType.textContent = category;
        if (modalShipping) modalShipping.textContent = shipping;

        // Update sizes
        const sizeButtons = modal.querySelectorAll('.flex-wrap.gap-2 button');
        const sizesArray = sizesRaw.split(',').map(s => s.trim()).filter(Boolean);
        sizeButtons.forEach((btn, idx) => {
            if (sizesArray[idx]) {
                btn.textContent = sizesArray[idx];
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        });
    });
}

// Setup category filters
export function setupProductFilters() {
    const categoryButtons = document.querySelectorAll('[data-category], .category-filter, .nav-category');
    categoryButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const category = button.dataset.category || button.textContent.trim();
            categoryButtons.forEach(btn => btn.classList.remove('active', 'bg-yellow-400', 'text-gray-900', 'font-bold'));
            button.classList.add('active', 'bg-yellow-400', 'text-gray-900', 'font-bold');
            loadProducts(category.toLowerCase() === 'all' ? 'all' : category);
        });
    });
}

// Display fallback demo cards
function displayFallbackProducts() {
    console.log('Rendering demo products on client storefront...');
    displayProducts(DEMO_BAG_PRODUCTS);
    updateProductCount(DEMO_BAG_PRODUCTS.length);
}

// Update product count badges
function updateProductCount(count) {
    const countElements = document.querySelectorAll('.product-count, .total-products, #totalProductsCount');
    countElements.forEach(el => {
        el.textContent = count;
    });
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
