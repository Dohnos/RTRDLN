// ============================================================
// RETRODÍLNA.CZ – main script
// ============================================================

let currentCategory = 'all';
let currentDesigner = 'all';
let allProducts = [];
let designers = [];
let categories = [];
let currentStep = 1;
let currentModalProduct = null;

// ── Helper: get main product image ───────────────────────────────────────────
function getProductMainImage(product) {
    return (Array.isArray(product.images) && product.images.length)
        ? product.images[0]
        : (product.image || '');
}

// ── Helper: format price with Kč suffix ──────────────────────────────────────
function formatPrice(price) {
    if (!price) return 'Dohodou';
    const raw = price.toString().trim();
    if (!raw || raw.toLowerCase() === 'dohodou') return 'Dohodou';
    if (raw.toLowerCase().includes('kč')) return raw;
    const numStr = raw.replace(/[^0-9]/g, '');
    if (!numStr) return raw;
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return raw;
    const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
    return formatted + '\u00a0Kč';
}

// ── Helper: escape HTML to prevent XSS ───────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Firebase/JSON data loading ────────────────────────────────────────────────
async function loadData() {
    let firebaseOk = false;

    try {
        // Try Firebase
        const [productsSnap, categoriesSnap, designersSnap] = await Promise.all([
            db.collection('products').where('active', '==', true).get(),
            db.collection('categories').orderBy('name').get(),
            db.collection('designers').orderBy('name').get()
        ]);

        allProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        categories = categoriesSnap.docs.map(d => d.data().name);
        designers = designersSnap.docs.map(d => d.data().name);
        firebaseOk = allProducts.length > 0;
    } catch (e) {
        console.warn('Firebase nedostupný, načítám products.json', e);
    }

    if (!firebaseOk) {
        // Fallback to products.json
        try {
            const res = await fetch('products.json');
            const data = await res.json();
            allProducts = data.products || [];
            categories = data.categories || [];
            designers = data.designers || [];
        } catch (e2) {
            console.error('Nelze načíst data', e2);
            renderProductsGrid([]);
            return;
        }
    }

    setupFilters();
    renderProductsGrid(filterProducts(allProducts));
    updateAvailableFilters();
    displayWishlistItems();
}

// ── Filters ───────────────────────────────────────────────────────────────────
function setupFilters() {
    setupCategoryFilters();
    setupDesignersList();
    setupMobileFilters();
}

function setupMobileFilters() {
    const btn = document.getElementById('toggleFilters');
    const container = document.getElementById('filtersContainer');
    const arrow = document.getElementById('filterArrow');
    if (btn && container) {
        btn.addEventListener('click', () => {
            const hidden = container.classList.toggle('hidden');
            if (arrow) arrow.style.transform = hidden ? '' : 'rotate(180deg)';
        });
    }
}

function setupCategoryFilters() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    // Count products per category
    const counts = {};
    allProducts.forEach(p => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });

    // Sort: assigned first, then by count
    const sorted = [...categories].sort((a, b) => {
        const hasA = counts[a] > 0;
        const hasB = counts[b] > 0;
        if (hasA !== hasB) return hasB - hasA;
        return (counts[b] || 0) - (counts[a] || 0);
    });

    container.innerHTML = sorted.map(cat => {
        const count = counts[cat] || 0;
        const disabled = count === 0;
        const isActive = cat === currentCategory;
        return `<button class="filter-btn category-btn ${disabled ? 'disabled' : ''} ${isActive ? 'active' : ''}" 
                        data-category="${cat}" 
                        ${disabled ? 'disabled' : ''}
                        onclick="selectCategory('${cat}')">
                    <span class="filter-dot"></span>
                    ${cat} <span class="count">${count}</span>
                </button>`;
    }).join('');
}

function selectCategory(cat) {
    currentCategory = currentCategory === cat ? 'all' : cat;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentCategory);
    });
    renderProductsGrid(filterProducts(allProducts));
    updateAvailableFilters();
}

function setupDesignersList() {
    const container = document.getElementById('designersList');
    const searchInput = document.getElementById('designerSearch');
    if (!container) return;

    const counts = {};
    allProducts.forEach(p => { if (p.designer) counts[p.designer] = (counts[p.designer] || 0) + 1; });

    const sorted = [...designers].sort((a, b) => {
        const hasA = counts[a] > 0;
        const hasB = counts[b] > 0;
        if (hasA !== hasB) return hasB - hasA;
        return (counts[b] || 0) - (counts[a] || 0);
    });

    container.innerHTML = sorted.map(d => {
        const count = counts[d] || 0;
        const disabled = count === 0;
        const isActive = d === currentDesigner;
        return `<button class="filter-btn designer-btn ${disabled ? 'disabled' : ''} ${isActive ? 'active' : ''}"
                        data-designer="${d}"
                        ${disabled ? 'disabled' : ''}
                        onclick="selectDesigner('${d}')">
                    <span class="filter-dot"></span>
                    ${d} <span class="count">${count}</span>
                </button>`;
    }).join('');

    if (searchInput) {
        searchInput.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            container.querySelectorAll('.designer-btn').forEach(btn => {
                btn.style.display = btn.dataset.designer.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }
}

function selectDesigner(d) {
    currentDesigner = currentDesigner === d ? 'all' : d;
    document.querySelectorAll('.designer-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.designer === currentDesigner);
    });
    renderProductsGrid(filterProducts(allProducts));
    updateAvailableFilters();
}

function filterProducts(products) {
    return products.filter(p => {
        const okCat = currentCategory === 'all' || p.category === currentCategory;
        const okDes = currentDesigner === 'all' || p.designer === currentDesigner;
        return okCat && okDes;
    });
}

function resetFilters() {
    currentCategory = 'all';
    currentDesigner = 'all';
    document.querySelectorAll('.category-btn, .designer-btn').forEach(btn => btn.classList.remove('active'));
    const search = document.getElementById('designerSearch');
    if (search) { search.value = ''; }
    document.querySelectorAll('.designer-btn').forEach(btn => { btn.style.display = ''; });
    renderProductsGrid(filterProducts(allProducts));
    updateAvailableFilters();
}

function updateAvailableFilters() {
    const filtered = filterProducts(allProducts);
    const avCat = new Set();
    const avDes = new Set();
    const source = (currentCategory === 'all' && currentDesigner === 'all') ? allProducts : filtered;
    source.forEach(p => {
        if (p.category) avCat.add(p.category);
        if (p.designer) avDes.add(p.designer);
    });
    // Update counts and disabled state
    const catCounts = {};
    const desCounts = {};
    filtered.forEach(p => {
        if (p.category) catCounts[p.category] = (catCounts[p.category] || 0) + 1;
        if (p.designer) desCounts[p.designer] = (desCounts[p.designer] || 0) + 1;
    });
    document.querySelectorAll('.category-btn').forEach(btn => {
        const cat = btn.dataset.category;
        const has = avCat.has(cat);
        btn.classList.toggle('disabled', !has);
        btn.disabled = !has;
        const span = btn.querySelector('.count');
        if (span) span.textContent = catCounts[cat] || 0;
    });
    document.querySelectorAll('.designer-btn').forEach(btn => {
        const d = btn.dataset.designer;
        const has = avDes.has(d);
        btn.classList.toggle('disabled', !has);
        btn.disabled = !has;
        const span = btn.querySelector('.count');
        if (span) span.textContent = desCounts[d] || 0;
    });
}

// ── Render products ───────────────────────────────────────────────────────────
function renderProductsGrid(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-16">
            <i class="fas fa-search text-4xl text-gray-200 mb-4 block"></i>
            <p class="text-gray-400 font-medium">Žádné produkty v této kategorii</p>
            <button onclick="resetFilters()" class="mt-4 text-sm underline text-gray-500 hover:text-black">Resetovat filtry</button>
        </div>`;
        return;
    }

    const wishlist = getWishlist();
    grid.innerHTML = products.map(p => {
        const img = getProductMainImage(p);
        const inWishlist = wishlist.includes(p.id);
        return `
        <a href="product.html?id=${escapeHtml(p.id)}" class="product-card group block">
            <div class="product-image-container relative">
                <button class="wishlist-btn ${inWishlist ? 'active' : ''}"
                        data-product-id="${escapeHtml(p.id)}"
                        data-action="wishlist">
                    <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                     data-src="${escapeHtml(img)}"
                     alt="${escapeHtml(p.title)}"
                     class="product-image lazy"
                     loading="lazy">
            </div>
            <div class="product-info">
                <div class="product-title line-clamp-2">${escapeHtml(p.title)}</div>
                <div class="product-price">${escapeHtml(formatPrice(p.price))}</div>
                <div class="product-meta">
                    ${p.category ? `<button type="button" class="product-tag" data-action="filter-category" data-filter-value="${escapeHtml(p.category)}" aria-label="Filtrovat podle kategorie: ${escapeHtml(p.category)}"><i class="fas fa-tag"></i> ${escapeHtml(p.category)}</button>` : ''}
                    ${p.designer ? `<button type="button" class="product-tag" data-action="filter-designer" data-filter-value="${escapeHtml(p.designer)}" aria-label="Filtrovat podle výrobce: ${escapeHtml(p.designer)}"><i class="fas fa-industry"></i> ${escapeHtml(p.designer)}</button>` : ''}
                </div>
                <button class="inquiry-btn"
                        data-product-id="${escapeHtml(p.id)}"
                        data-action="detail">
                    <i class="fas fa-eye mr-1.5"></i>Omrknout
                </button>
            </div>
        </a>`;
    }).join('');

    // Event delegation handled by persistent listener set up in DOMContentLoaded
    initLazyLoading();
}

// Event delegation handler for the products grid (single persistent listener)
function handleGridClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;

    // Filter tag clicks – no productId needed
    if (action === 'filter-category') {
        e.preventDefault();
        e.stopPropagation();
        selectCategory(btn.dataset.filterValue);
        document.getElementById('produkty')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    if (action === 'filter-designer') {
        e.preventDefault();
        e.stopPropagation();
        selectDesigner(btn.dataset.filterValue);
        document.getElementById('produkty')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const productId = btn.dataset.productId;
    if (!productId) return;

    e.preventDefault();
    e.stopPropagation();

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    if (action === 'wishlist') {
        toggleWishlist(productId);
    } else if (action === 'detail') {
        window.location.href = `product.html?id=${encodeURIComponent(product.id)}`;
    }
}

function initLazyLoading() {
    const images = document.querySelectorAll('img.lazy');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '200px' });
    images.forEach(img => observer.observe(img));
}

// ── Wishlist ──────────────────────────────────────────────────────────────────
function getWishlist() {
    return JSON.parse(localStorage.getItem('wishlist') || '[]');
}

function toggleWishlist(productId) {
    const wishlist = getWishlist();
    const idx = wishlist.indexOf(productId);
    const adding = idx === -1;
    if (adding) {
        wishlist.push(productId);
        showNotification('Přidáno do wishlistu ❤️');
    } else {
        wishlist.splice(idx, 1);
        showNotification('Odebráno z wishlistu');
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    // Update wishlist button states only (not other buttons sharing data-product-id)
    document.querySelectorAll(`.wishlist-btn[data-product-id="${productId}"]`).forEach(btn => {
        btn.classList.toggle('active', adding);
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = adding ? 'fas fa-heart' : 'far fa-heart';
        }
    });
    displayWishlistItems();
    updateWishlistBadge();
}

function updateWishlistBadge() {
    const count = getWishlist().length;
    const badge = document.getElementById('wishlistBadge');
    if (badge) {
        badge.textContent = count;
        if (count > 0) {
            badge.classList.remove('hidden');
            badge.classList.add('flex');
        } else {
            badge.classList.add('hidden');
            badge.classList.remove('flex');
        }
    }
    // Update floating heart button icon
    const btn = document.getElementById('wishlistFloatBtn');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) icon.className = count > 0 ? 'fas fa-heart text-sm text-red-500' : 'far fa-heart text-sm';
    }
}

function openWishlistModal() {
    const modal = document.getElementById('wishlistModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeWishlistModal() {
    const modal = document.getElementById('wishlistModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function toggleWishlistSection() {
    openWishlistModal();
}

async function displayWishlistItems() {
    const wishlist = getWishlist();
    const container = document.getElementById('wishlist-items');
    const countEl = document.getElementById('wishlist-count');
    const totalEl = document.getElementById('wishlist-total');
    if (!container) return;

    updateWishlistBadge();

    if (wishlist.length === 0) {
        container.innerHTML = `
        <div class="text-center py-10 text-gray-400">
            <i class="far fa-heart text-4xl mb-3 block"></i>
            <p class="font-medium">Wishlist je prázdný</p>
            <p class="text-sm mt-1">Přidejte produkty pomocí srdíčka</p>
        </div>`;
        if (countEl) countEl.textContent = '0';
        if (totalEl) totalEl.textContent = '0 Kč';
        return;
    }

    const items = allProducts.filter(p => wishlist.includes(p.id));
    if (countEl) countEl.textContent = items.length;
    if (totalEl) {
        const total = items.reduce((sum, p) => {
            const n = parseInt((p.price || '0').replace(/[^0-9]/g, '')) || 0;
            return sum + n;
        }, 0);
        totalEl.textContent = `${total.toLocaleString('cs-CZ')} Kč`;
    }

    container.innerHTML = items.map(p => {
        const img = getProductMainImage(p);
        return `
        <div class="flex items-center gap-4 bg-gray-50 rounded-2xl p-4" data-wishlist-item="${escapeHtml(p.id)}">
            <a href="product.html?id=${escapeHtml(p.id)}" class="shrink-0">
                <img src="${escapeHtml(img)}" alt="${escapeHtml(p.title)}" class="w-16 h-16 object-contain rounded-xl bg-white">
            </a>
            <div class="flex-1 min-w-0">
                <a href="product.html?id=${escapeHtml(p.id)}" class="font-semibold text-sm line-clamp-2 hover:underline">${escapeHtml(p.title)}</a>
                <p class="text-gray-600 text-sm mt-0.5">${escapeHtml(p.price || 'Dohodou')}</p>
            </div>
            <div class="flex gap-2 shrink-0">
                <a href="product.html?id=${escapeHtml(p.id)}"
                        class="px-3 py-1.5 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800 transition-colors flex items-center gap-1.5">
                    <i class="fas fa-eye"></i> Detail
                </a>
                <button data-action="wishlist-remove" data-product-id="${escapeHtml(p.id)}"
                        class="px-3 py-1.5 border-2 border-red-200 text-red-500 rounded-full text-xs font-bold hover:bg-red-50 transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

// ── Inquiry modal ─────────────────────────────────────────────────────────────
function openInquiryModal(product) {
    currentModalProduct = product;
    currentStep = 1;
    updateModalStepUI();

    const img = getProductMainImage(product);
    document.getElementById('modalProductImage').src = img;
    document.getElementById('modalProductTitle').textContent = product.title;
    document.getElementById('modalProductPrice').textContent = product.price || 'Dohodou';
    document.getElementById('hProductTitle').value = product.title;
    document.getElementById('hProductPrice').value = product.price || '';
    document.getElementById('hProductUrl').value = `https://www.retrodilna.cz/product.html?id=${product.id}`;

    const modal = document.getElementById('inquiryModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeInquiryModal() {
    const modal = document.getElementById('inquiryModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('inquiryForm').reset();
    currentStep = 1;
    updateModalStepUI();
    // Reset company fields
    const companyFields = document.getElementById('companyFields');
    if (companyFields) {
        companyFields.classList.add('hidden');
        const arrow = document.getElementById('companyArrow');
        if (arrow) arrow.style.transform = '';
    }
}

function modalNext() {
    if (currentStep === 2) {
        const step = document.getElementById('mStep2');
        const required = step ? step.querySelectorAll('[required]') : [];
        for (const el of required) {
            if (!el.checkValidity()) { el.reportValidity(); return; }
        }
    }
    if (currentStep < 3) { currentStep++; updateModalStepUI(); }
}

function modalPrev() {
    if (currentStep > 1) { currentStep--; updateModalStepUI(); }
}

function updateModalStepUI() {
    [1, 2, 3].forEach(n => {
        const el = document.getElementById(`mStep${n}`);
        if (el) el.classList.toggle('hidden', n !== currentStep);
    });
    const label = document.getElementById('stepLabel');
    if (label) label.textContent = `Krok ${currentStep} ze 3`;
    const bar = document.getElementById('modalProgressBar');
    if (bar) bar.style.width = `${Math.round((currentStep / 3) * 100)}%`;
}

function toggleCompanyFields() {
    const fields = document.getElementById('companyFields');
    const arrow = document.getElementById('companyArrow');
    if (!fields) return;
    const hidden = fields.classList.toggle('hidden');
    if (arrow) arrow.style.transform = hidden ? '' : 'rotate(180deg)';
}

// ── Scroll to top ─────────────────────────────────────────────────────────────
function setupScrollToTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            btn.classList.remove('opacity-0', 'translate-y-10');
            btn.classList.add('opacity-100', 'translate-y-0');
        } else {
            btn.classList.add('opacity-0', 'translate-y-10');
            btn.classList.remove('opacity-100', 'translate-y-0');
        }
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── Mobile menu ───────────────────────────────────────────────────────────────
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('hidden');
}

// ── Notification ──────────────────────────────────────────────────────────────
function showNotification(msg, type = 'default') {
    const el = document.getElementById('notification');
    const icon = document.getElementById('notifIcon');
    const text = document.getElementById('notifText');
    if (!el) return;
    if (icon) icon.className = type === 'success' ? 'fas fa-check-circle text-green-400'
                              : type === 'error'   ? 'fas fa-exclamation-circle text-red-400'
                              :                      'fas fa-info-circle';
    if (text) text.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    emailjs.init("TJRmVM_YRqmfCKXKn");

    // Apply pre-selected filter from URL params (e.g. coming from product.html badge)
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('category');
    const desParam = urlParams.get('designer');
    if (catParam) currentCategory = catParam;
    if (desParam) currentDesigner = desParam;

    loadData();
    setupScrollToTop();
    updateWishlistBadge();

    // Single persistent event delegation for product grid
    const grid = document.getElementById('productsGrid');
    if (grid) grid.addEventListener('click', handleGridClick);

    // Event delegation for wishlist section buttons
    const wishlistItems = document.getElementById('wishlist-items');
    if (wishlistItems) {
        wishlistItems.addEventListener('click', e => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const productId = btn.dataset.productId;
            if (!productId) return;
            if (btn.dataset.action === 'wishlist-remove') {
                toggleWishlist(productId);
            }
        });
    }

    // Close modal on backdrop click
    const modal = document.getElementById('inquiryModal');
    if (modal) {
        modal.addEventListener('click', e => { if (e.target === modal) closeInquiryModal(); });
    }

    // Inquiry form submit
    const form = document.getElementById('inquiryForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const overlay = this.querySelector('.loading-overlay');
            if (overlay) { overlay.classList.remove('hidden'); overlay.classList.add('flex'); }

            const fd = new FormData(this);
            const d = Object.fromEntries(fd);
            const isCompany = document.getElementById('companyFields') &&
                              !document.getElementById('companyFields').classList.contains('hidden');

            const hideOverlay = () => {
                if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
            };

            try {
                const sendPromise = emailjs.send('service_qpll4z6', 'template_40bjq9p', {
                    to_email: 'retrodilna@seznam.cz',
                    from_name: d.name,
                    from_email: d.email,
                    phone: d.phone,
                    address: d.address,
                    is_company: isCompany ? 'Ano' : 'Ne',
                    company_name: d.companyName || '',
                    company_address: '',
                    ic: d.ic || '',
                    dic: d.dic || '',
                    note: d.note || '',
                    product_title: d.productTitle,
                    product_price: d.productPrice,
                    product_url: d.productUrl,
                    additional_products: d.additional_products || 'Žádné další produkty'
                });

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Vypršel časový limit. Zkuste to znovu.')), 15000)
                );

                await Promise.race([sendPromise, timeoutPromise]);

                hideOverlay();
                closeInquiryModal();
                showNotification('Poptávka úspěšně odeslána!', 'success');
            } catch (err) {
                console.error(err);
                hideOverlay();
                showNotification('Chyba při odesílání: ' + (err.text || err.message || 'Zkuste to znovu.'), 'error');
            }
        });
    }
});
