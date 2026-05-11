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
        return `<button class="filter-btn category-btn ${disabled ? 'disabled' : ''}" 
                        data-category="${cat}" 
                        ${disabled ? 'disabled' : ''}
                        onclick="selectCategory('${cat}')">
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
        return `<button class="filter-btn designer-btn ${disabled ? 'disabled' : ''}"
                        data-designer="${d}"
                        ${disabled ? 'disabled' : ''}
                        onclick="selectDesigner('${d}')">
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
        const img = Array.isArray(p.images) && p.images.length ? p.images[0] : (p.image || '');
        const inWishlist = wishlist.includes(p.id);
        return `
        <a href="product.html?id=${p.id}" class="product-card group block">
            <div class="product-image-container relative">
                <button class="wishlist-btn ${inWishlist ? 'active' : ''}"
                        data-product-id="${p.id}"
                        onclick="event.preventDefault();toggleWishlist('${p.id}')">
                    <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                     data-src="${img}"
                     alt="${p.title}"
                     class="product-image lazy"
                     loading="lazy">
            </div>
            <div class="product-info">
                <div class="product-title line-clamp-2">${p.title}</div>
                <div class="product-price">${p.price || 'Dohodou'}</div>
                ${p.location ? `<div class="product-location">${p.location}</div>` : ''}
                <div class="product-meta">
                    ${p.category ? `<span class="product-tag"><i class="fas fa-tag"></i> ${p.category}</span>` : ''}
                    ${p.designer ? `<span class="product-tag"><i class="fas fa-industry"></i> ${p.designer}</span>` : ''}
                </div>
                <button class="inquiry-btn"
                        onclick="event.preventDefault();openInquiryModal(${JSON.stringify(p).replace(/'/g,'&#39;').replace(/"/g,'&quot;')})">
                    <i class="fas fa-envelope mr-1.5"></i>Mám zájem
                </button>
            </div>
        </a>`;
    }).join('');

    initLazyLoading();
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
    // Update button states
    document.querySelectorAll(`[data-product-id="${productId}"]`).forEach(btn => {
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
        badge.classList.toggle('hidden', count === 0);
    }
}

function toggleWishlistSection() {
    const section = document.getElementById('wishlistSection');
    if (section) section.classList.toggle('hidden');
}

async function displayWishlistItems() {
    const wishlist = getWishlist();
    const container = document.getElementById('wishlist-items');
    const countEl = document.getElementById('wishlist-count');
    const totalEl = document.getElementById('wishlist-total');
    if (!container) return;

    updateWishlistBadge();

    if (wishlist.length === 0) {
        const section = document.getElementById('wishlistSection');
        if (section) section.classList.add('hidden');
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
        const img = Array.isArray(p.images) && p.images.length ? p.images[0] : (p.image || '');
        return `
        <div class="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
            <a href="product.html?id=${p.id}" class="shrink-0">
                <img src="${img}" alt="${p.title}" class="w-16 h-16 object-contain rounded-xl bg-gray-50">
            </a>
            <div class="flex-1 min-w-0">
                <a href="product.html?id=${p.id}" class="font-semibold text-sm line-clamp-2 hover:underline">${p.title}</a>
                <p class="text-gray-600 text-sm mt-0.5">${p.price || 'Dohodou'}</p>
            </div>
            <div class="flex gap-2 shrink-0">
                <button onclick="openInquiryModal(${JSON.stringify(p).replace(/'/g,'&#39;').replace(/"/g,'&quot;')})"
                        class="px-3 py-1.5 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800 transition-colors">
                    Zájem
                </button>
                <button onclick="toggleWishlist('${p.id}')"
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

    const img = Array.isArray(product.images) && product.images.length ? product.images[0] : (product.image || '');
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

    loadData();
    setupScrollToTop();
    updateWishlistBadge();

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

            try {
                await emailjs.send('service_4xb9s3i', 'template_nuyzj2z', {
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

                if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
                closeInquiryModal();
                showNotification('Poptávka úspěšně odeslána!', 'success');
            } catch (err) {
                console.error(err);
                if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
                showNotification('Chyba při odesílání. Zkuste to znovu.', 'error');
            }
        });
    }
});
