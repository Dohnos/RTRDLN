let currentCategory = 'all';
let currentDesigner = 'all';
let allProducts = [];
let designers = [];

async function loadProducts() {
    try {
        const response = await fetch('products.json');
        const data = await response.json();
        allProducts = data.products;
        designers = data.designers;
        
        setupDesignersList();
        displayProducts(filterProducts(allProducts));
        setupFilters();
        updateAvailableFilters();
    } catch (error) {
        console.error('Chyba při načítání produktů:', error);
        const productsGrid = document.querySelector('.products-grid');
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-red-500">Chyba při načítání produktů. Zkuste obnovit stránku.</p>
                </div>
            `;
        }
    }
}

function setupFilters() {
    setupCategoryFilters();
    setupDesignerFilters();
    setupMobileFilters();
}

function setupMobileFilters() {
    const toggleBtn = document.getElementById('toggleFilters');
    const filtersContainer = document.getElementById('filtersContainer');
    
    if (toggleBtn && filtersContainer) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = filtersContainer.classList.contains('hidden');
            filtersContainer.classList.toggle('hidden');
            toggleBtn.textContent = isHidden ? 'Skrýt filtry' : 'Zobrazit filtry';
        });
    }
}

function setupDesignersList() {
    const designersList = document.getElementById('designersList');
    const searchInput = document.getElementById('designerSearch');
    
    designers.forEach(designer => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn designer-btn';
        btn.dataset.designer = designer;
        btn.textContent = designer;
        designersList.appendChild(btn);
    });
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.designer-btn').forEach(btn => {
            const designer = btn.dataset.designer.toLowerCase();
            btn.style.display = designer.includes(searchTerm) ? 'block' : 'none';
        });
    });
}

function filterProducts(products) {
    return products.filter(product => {
        const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
        const matchesDesigner = currentDesigner === 'all' || product.designer === currentDesigner;
        return matchesCategory && matchesDesigner;
    });
}

function setupDesignerFilters() {
    const designerButtons = document.querySelectorAll('.designer-btn');
    
    // Count products per designer and check if assigned
    const designerCounts = {};
    const assignedDesigners = new Set();
    allProducts.forEach(product => {
        const designer = product.designer || 'Nespecifikováno';
        designerCounts[designer] = (designerCounts[designer] || 0) + 1;
        if (designer) {
            assignedDesigners.add(designer);
        }
    });

    // Sort buttons: assigned first, then by count
    const buttonsContainer = document.querySelector('.designer-btn').parentElement;
    const buttons = Array.from(designerButtons);
    
    buttons.sort((a, b) => {
        const designerA = a.dataset.designer;
        const designerB = b.dataset.designer;
        const isAssignedA = assignedDesigners.has(designerA);
        const isAssignedB = assignedDesigners.has(designerB);
        
        // If one is assigned and other isn't, assigned comes first
        if (isAssignedA !== isAssignedB) {
            return isAssignedB - isAssignedA;
        }
        
        // If both assigned or both unassigned, sort by count
        return (designerCounts[designerB] || 0) - (designerCounts[designerA] || 0);
    });

    // Clear and reappend buttons in new order
    buttons.forEach(button => buttonsContainer.removeChild(button));
    buttons.forEach(button => {
        const designer = button.dataset.designer;
        const count = designerCounts[designer] || 0;
        
        button.innerHTML = `${designer} <span class="count">${count}</span>`;
        
        if (!assignedDesigners.has(designer)) {
            button.classList.add('disabled');
            button.disabled = true;
        }
        
        if (currentDesigner === designer) {
            button.classList.add('active');
        }
        
        buttonsContainer.appendChild(button);
    });

    // Add click handlers
    designerButtons.forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', () => {
                designerButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentDesigner = button.dataset.designer;
                displayProducts(filterProducts(allProducts));
                updateAvailableFilters();
            });
        }
    });
}

function setupCategoryFilters() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    // Count products per category and check if assigned
    const categoryCounts = {};
    const assignedCategories = new Set();
    allProducts.forEach(product => {
        const category = product.category || 'Nezařazeno';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        if (category) {
            assignedCategories.add(category);
        }
    });

    // Sort buttons: assigned first, then by count
    const buttonsContainer = document.querySelector('.category-btn').parentElement;
    const buttons = Array.from(categoryButtons);
    
    buttons.sort((a, b) => {
        const categoryA = a.dataset.category;
        const categoryB = b.dataset.category;
        const isAssignedA = assignedCategories.has(categoryA);
        const isAssignedB = assignedCategories.has(categoryB);
        
        // If one is assigned and other isn't, assigned comes first
        if (isAssignedA !== isAssignedB) {
            return isAssignedB - isAssignedA;
        }
        
        // If both assigned or both unassigned, sort by count
        return (categoryCounts[categoryB] || 0) - (categoryCounts[categoryA] || 0);
    });

    // Clear and reappend buttons in new order
    buttons.forEach(button => buttonsContainer.removeChild(button));
    buttons.forEach(button => {
        const category = button.dataset.category;
        const count = categoryCounts[category] || 0;
        
        button.innerHTML = `${category} <span class="count">${count}</span>`;
        
        if (!assignedCategories.has(category)) {
            button.classList.add('disabled');
            button.disabled = true;
        }
        
        if (currentCategory === category) {
            button.classList.add('active');
        }
        
        buttonsContainer.appendChild(button);
    });

    // Add click handlers
    categoryButtons.forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', () => {
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentCategory = button.dataset.category;
                displayProducts(filterProducts(allProducts));
                updateAvailableFilters();
            });
        }
    });
}

function getWishlist() {
    return JSON.parse(localStorage.getItem('wishlist') || '[]');
}

function showNotification(message, type = 'default') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-circle' : 
                    'fas fa-info-circle';
    
    notification.appendChild(icon);
    notification.appendChild(document.createTextNode(message));
    
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function scrollToWishlist() {
    const wishlistSection = document.getElementById('wishlist');
    wishlistSection.scrollIntoView({ behavior: 'smooth' });
}

function toggleWishlist(productId) {
    const wishlist = getWishlist();
    const index = wishlist.indexOf(productId);
    const isAdding = index === -1;
    
    if (isAdding) {
        wishlist.push(productId);
        showNotification('Produkt byl přidán do wishlistu');
    } else {
        wishlist.splice(index, 1);
        showNotification('Produkt byl odebrán z wishlistu');
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistUI(productId);
    displayWishlistItems();

    if (isAdding) {
        setTimeout(scrollToWishlist, 300);
    }
}

function updateWishlistUI(productId) {
    const wishlist = getWishlist();
    const buttons = document.querySelectorAll(`[data-product-id="${productId}"]`);
    buttons.forEach(button => {
        if (wishlist.includes(productId)) {
            button.classList.add('active');
            button.querySelector('i').classList.replace('far', 'fas');
        } else {
            button.classList.remove('active');
            button.querySelector('i').classList.replace('fas', 'far');
        }
    });
}

function openInquiryModal(product) {
    const modal = document.getElementById('inquiryModal');
    const titleInput = document.getElementById('productTitle');
    titleInput.value = product.title;
    titleInput.dataset.productId = product.id;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productUrl').value = product.url;
    selectedProducts.clear();
    updateSelectedProductsList();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeInquiryModal() {
    const modal = document.getElementById('inquiryModal');
    const form = document.getElementById('inquiryForm');
    
    // Reset form
    form.reset();
    selectedProducts.clear();
    
    // Reset company fields
    const companyFields = document.getElementById('companyFields');
    const toggleCompany = document.getElementById('toggleCompany');
    if (toggleCompany) {
        toggleCompany.querySelector('i').style.transform = 'rotate(0)';
    }
    if (companyFields) {
        companyFields.classList.add('hidden', 'opacity-0');
    }
    
    // Reset product selection
    const productSelection = document.getElementById('productSelection');
    const toggleProducts = document.getElementById('toggleProducts');
    if (toggleProducts) {
        toggleProducts.querySelector('i').style.transform = 'rotate(0)';
    }
    if (productSelection) {
        productSelection.classList.add('hidden', 'opacity-0');
    }

    // Hide modal with fade effect
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'opacity-0');
        
        // Scroll to products section
        const productsSection = document.getElementById('produkty');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 300);
}

function displayProducts(products) {
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;
    
    const wishlist = getWishlist();
    
    if (products.length === 0) {
        productsGrid.innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-gray-500">Žádné produkty v této kategorii</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = '';
    
    products.forEach(product => {
        const isInWishlist = wishlist.includes(product.id);
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.innerHTML = `
            <div class="product-image-container relative">
                <button 
                    class="wishlist-btn ${isInWishlist ? 'active' : ''}"
                    data-product-id="${product.id}"
                    onclick="toggleWishlist('${product.id}')"
                >
                    <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <a href="${product.url}" target="_blank">
                    <img 
                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                        data-src="${product.image}" 
                        alt="${product.title}" 
                        class="product-image lazy"
                        loading="lazy">
                </a>
            </div>
            <div class="product-info">
                <div class="product-title">${product.title}</div>
                <div class="product-price">${product.price}</div>
                <div class="product-location">${product.location}</div>
                <div class="product-details text-sm text-gray-600 space-y-1 mt-2">
                    <div>
                        <i class="fas fa-tag mr-1"></i> 
                        Kategorie: ${product.category || 'Nezařazeno'}
                    </div>
                    <div>
                        <i class="fas fa-industry mr-1"></i> 
                        Výrobce / Designer: ${product.designer || 'Nespecifikováno'}
                    </div>
                </div>
                <div class="contact-buttons flex flex-col gap-2 mt-4 mb-2">
                    <a href="tel:+420603538440" class="flex items-center text-gray-600 hover:text-black">
                        <i class="fas fa-phone mr-2"></i>
                        <span class="text-sm">603 538 440</span>
                    </a>
                    <a href="mailto:Retrodilna@seznam.cz" class="flex items-center text-gray-600 hover:text-black">
                        <i class="fas fa-envelope mr-2"></i>
                        <span class="text-sm">Retrodilna@seznam.cz</span>
                    </a>
                </div>
                <button 
                    onclick='openInquiryModal(${JSON.stringify(product).replace(/'/g, "&#39;")})' 
                    class="w-full mt-2 bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors"
                >
                    Mám zájem
                </button>
            </div>
        `;
        productsGrid.appendChild(productElement);
    });

    initLazyLoading();
}

function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img.lazy');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => imageObserver.observe(img));
}

function setupScrollToTop() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    
    function checkScrollPosition() {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.remove('opacity-0', 'translate-y-10');
            scrollBtn.classList.add('opacity-100', 'translate-y-0');
        } else {
            scrollBtn.classList.add('opacity-0', 'translate-y-10');
            scrollBtn.classList.remove('opacity-100', 'translate-y-0');
        }
    }

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    window.addEventListener('scroll', checkScrollPosition);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Zkopírováno do schránky!');
    }).catch(err => {
        console.error('Chyba při kopírování:', err);
    });
}

function formatWishlistText(products) {
    return products.map(product => 
        `${product.title}\nCena: ${product.price}\nOdkaz: ${product.url}\n`
    ).join('\n---\n');
}

async function displayWishlistItems() {
    const wishlist = getWishlist();
    const wishlistSection = document.getElementById('wishlist');
    const wishlistContainer = document.getElementById('wishlist-items');
    const wishlistCount = document.getElementById('wishlist-count');
    const wishlistTotal = document.getElementById('wishlist-total');
    
    if (!wishlistContainer) return;

    try {
        const response = await fetch('products.json');
        const data = await response.json();
        const wishlistProducts = data.products.filter(product => wishlist.includes(product.id));

        if (wishlistProducts.length === 0) {
            wishlistSection.classList.add('hidden');
            return;
        } else {
            wishlistSection.classList.remove('hidden');
        }

        wishlistCount.textContent = wishlistProducts.length;
        const total = wishlistProducts.reduce((sum, product) => {
            const price = parseInt(product.price.replace(/[^0-9]/g, ''));
            return sum + price;
        }, 0);
        wishlistTotal.textContent = `${total.toLocaleString()} Kč`;

        const copyText = formatWishlistText(wishlistProducts);
        
        wishlistContainer.innerHTML = `
            <button 
                onclick="copyToClipboard(\`${copyText}\`)"
                class="w-full mb-4 bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors"
            >
                Zkopírovat seznam pro sdílení
            </button>
            ${wishlistProducts.map(product => `
                <div class="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                    <div class="flex items-center gap-4">
                        <img src="${product.image}" alt="${product.title}" class="w-16 h-16 object-cover rounded">
                        <div>
                            <h3 class="font-semibold">${product.title}</h3>
                            <p class="text-gray-600">${product.price}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <a href="${product.url}" target="_blank" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                            Zobrazit
                        </a>
                        <button 
                            onclick="toggleWishlist('${product.id}')"
                            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Odebrat
                        </button>
                    </div>
                </div>
            `).join('')}
        `;

    } catch (error) {
        console.error('Chyba při načítání wishlistu:', error);
    }
}

function toggleCompanyFields() {
    const companyFields = document.getElementById('companyFields');
    const toggleButton = document.getElementById('toggleCompany');
    const icon = toggleButton.querySelector('i');
    const isExpanded = !companyFields.classList.contains('hidden');

    if (!isExpanded) {
        companyFields.classList.remove('hidden');
        setTimeout(() => {
            companyFields.classList.remove('opacity-0');
            icon.style.transform = 'rotate(180deg)';
        }, 10);
    } else {
        companyFields.classList.add('opacity-0');
        icon.style.transform = 'rotate(0)';
        setTimeout(() => {
            companyFields.classList.add('hidden');
        }, 300);
    }

    const companyInputs = companyFields.querySelectorAll('input, textarea');
    companyInputs.forEach(input => {
        input.required = !isExpanded;
    });
}

let selectedProducts = new Set();

function toggleProductSelection() {
    const productSelection = document.getElementById('productSelection');
    const toggleButton = document.getElementById('toggleProducts');
    const icon = toggleButton.querySelector('i');
    const isExpanded = !productSelection.classList.contains('hidden');

    if (!isExpanded) {
        productSelection.classList.remove('hidden');
        setTimeout(() => {
            productSelection.classList.remove('opacity-0');
            icon.style.transform = 'rotate(180deg)';
            loadAvailableProducts();
        }, 10);
    } else {
        productSelection.classList.add('opacity-0');
        icon.style.transform = 'rotate(0)';
        setTimeout(() => {
            productSelection.classList.add('hidden');
        }, 300);
    }
}

async function loadAvailableProducts() {
    try {
        const response = await fetch('products.json');
        const data = await response.json();
        const mainProductId = document.querySelector('[name="productTitle"]').dataset.productId;
        const productList = document.getElementById('productList');
        
        productList.innerHTML = data.products
            .filter(product => product.id !== mainProductId)
            .map(product => `
                <div 
                    class="product-select-card ${selectedProducts.has(product.id) ? 'selected' : ''}"
                    data-product-id="${product.id}"
                >
                    <div class="product-select-image">
                        <img src="${product.image}" alt="${product.title}" class="w-full h-48 object-contain rounded-t-lg">
                    </div>
                    <div class="p-4 text-center">
                        <div class="font-medium text-sm mb-2 line-clamp-2">${product.title}</div>
                        <div class="text-gray-600 font-bold">${product.price}</div>
                    </div>
                    <div class="check-icon ${selectedProducts.has(product.id) ? 'visible' : ''}">
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
            `).join('');

        productList.querySelectorAll('.product-select-card').forEach(card => {
            card.addEventListener('click', () => {
                const productId = card.dataset.productId;
                handleProductClick(productId);
                
                card.classList.toggle('selected');
                const checkIcon = card.querySelector('.check-icon');
                checkIcon.classList.toggle('visible');
            });
        });

        updateSelectedProductsList();
    } catch (error) {
        console.error('Chyba při načítání produktů:', error);
    }
}

function handleProductClick(productId) {
    if (selectedProducts.has(productId)) {
        selectedProducts.delete(productId);
    } else {
        selectedProducts.add(productId);
    }
    updateSelectedProductsList();
}

function updateSelectedProductsList() {
    const selectedProductsContainer = document.getElementById('selectedProducts');
    if (!selectedProductsContainer) return;

    if (selectedProducts.size === 0) {
        selectedProductsContainer.innerHTML = '<p class="text-gray-500 text-sm text-center">Žádné další vybrané produkty</p>';
        return;
    }

    fetch('products.json')
        .then(response => response.json())
        .then(data => {
            const selectedProductsData = data.products.filter(p => selectedProducts.has(p.id));
            selectedProductsContainer.innerHTML = `
                <div class="text-sm font-medium text-gray-700 mb-2">Vybrané produkty:</div>
                ${selectedProductsData.map(product => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center gap-3">
                            <img src="${product.image}" alt="${product.title}" class="w-12 h-12 object-contain rounded">
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm truncate">${product.title}</div>
                                <div class="text-gray-600">${product.price}</div>
                            </div>
                        </div>
                        <button type="button" 
                            onclick="handleProductClick('${product.id}', null)"
                            class="text-red-500 hover:text-red-700 p-1"
                        >
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            `;
        });
}

function resetFilters() {
    currentCategory = 'all';
    currentDesigner = 'all';
    
    document.querySelectorAll('.category-btn, .designer-btn').forEach(btn => {
        btn.classList.remove('active', 'disabled');
        btn.disabled = false;
    });
    
    const searchInput = document.getElementById('designerSearch');
    if(searchInput) {
        searchInput.value = '';
    }
    
    document.querySelectorAll('.designer-btn').forEach(btn => {
        btn.style.display = 'block';
    });
    
    displayProducts(filterProducts(allProducts));
    updateAvailableFilters();
}

function updateAvailableFilters() {
    // Get currently filtered products
    const filteredProducts = filterProducts(allProducts);
    
    // Get available categories and designers from filtered products
    const availableCategories = new Set();
    const availableDesigners = new Set();
    
    if (currentCategory === 'all' && currentDesigner === 'all') {
        // If no filters are active, show all options
        allProducts.forEach(product => {
            if (product.category) availableCategories.add(product.category);
            if (product.designer) availableDesigners.add(product.designer);
        });
    } else {
        // If a filter is active, show only relevant options
        filteredProducts.forEach(product => {
            if (product.category) availableCategories.add(product.category);
            if (product.designer) availableDesigners.add(product.designer);
        });
    }

    // Update category buttons
    document.querySelectorAll('.category-btn').forEach(button => {
        const category = button.dataset.category;
        if (category === 'all' || availableCategories.has(category)) {
            button.classList.remove('disabled');
            button.disabled = false;
        } else {
            button.classList.add('disabled');
            button.disabled = true;
        }
    });

    // Update designer buttons
    document.querySelectorAll('.designer-btn').forEach(button => {
        const designer = button.dataset.designer;
        if (designer === 'all' || availableDesigners.has(designer)) {
            button.classList.remove('disabled');
            button.disabled = false;
        } else {
            button.classList.add('disabled');
            button.disabled = true;
        }
    });

    // Update counts on buttons
    updateFilterCounts(filteredProducts);
}

function updateFilterCounts(products) {
    const categoryCounts = {};
    const designerCounts = {};
    
    products.forEach(product => {
        const category = product.category || 'Nezařazeno';
        const designer = product.designer || 'Nespecifikováno';
        
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        designerCounts[designer] = (designerCounts[designer] || 0) + 1;
    });

    // Update category counts
    document.querySelectorAll('.category-btn').forEach(button => {
        const category = button.dataset.category;
        const count = categoryCounts[category] || 0;
        const countSpan = button.querySelector('.count');
        if (countSpan) {
            countSpan.textContent = count;
        } else {
            button.innerHTML = `${category} <span class="count">${count}</span>`;
        }
    });

    // Update designer counts
    document.querySelectorAll('.designer-btn').forEach(button => {
        const designer = button.dataset.designer;
        const count = designerCounts[designer] || 0;
        const countSpan = button.querySelector('.count');
        if (countSpan) {
            countSpan.textContent = count;
        } else {
            button.innerHTML = `${designer} <span class="count">${count}</span>`;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupScrollToTop();
    displayWishlistItems();
    
    emailjs.init("TJRmVM_YRqmfCKXKn");

    const inquiryForm = document.getElementById('inquiryForm');
    if (inquiryForm) {
        inquiryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading overlay
            const loadingOverlay = document.querySelector('.loading-overlay');
            const progressBar = document.querySelector('.progress-bar-fill');
            loadingOverlay.classList.add('active');
            
            // Simulate progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 30;
                if (progress > 90) progress = 90;
                progressBar.style.width = `${progress}%`;
            }, 500);
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            try {
                const productsResponse = await fetch('products.json');
                const productsData = await productsResponse.json();
                const selectedProductsData = productsData.products
                    .filter(p => selectedProducts.has(p.id))
                    .map(p => `${p.title} (${p.price}) - ${p.url}`)
                    .join('\n');

                const emailData = {
                    service_id: 'service_4xb9s3i',
                    template_id: 'template_nuyzj2z',
                    template_params: {
                        to_email: 'retrodilna@seznam.cz',
                        from_name: data.name,
                        from_email: data.email,
                        phone: data.phone,
                        address: data.address,
                        is_company: !document.getElementById('companyFields').classList.contains('hidden') ? 'Ano' : 'Ne',
                        company_name: data.companyName || '',
                        company_address: data.companyAddress || '',
                        ic: data.ic || '',
                        dic: data.dic || '',
                        note: data.note,
                        product_title: data.productTitle,
                        product_price: data.productPrice,
                        product_url: data.productUrl,
                        additional_products: selectedProductsData || 'Žádné další produkty'
                    }
                };

                await emailjs.send(
                    emailData.service_id,
                    emailData.template_id,
                    emailData.template_params
                );

                // Complete progress bar
                progressBar.style.width = '100%';
                setTimeout(() => {
                    clearInterval(progressInterval);
                    loadingOverlay.classList.remove('active');
                    showNotification('Zpráva byla úspěšně odeslána', 'success');
                    closeInquiryModal();
                    
                    // Scroll to products section
                    const productsSection = document.getElementById('produkty');
                    if (productsSection) {
                        productsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 500);

            } catch (error) {
                console.error('FAILED...', error);
                clearInterval(progressInterval);
                loadingOverlay.classList.remove('active');
                showNotification('Došlo k chybě při odesílání', 'error');
            }
        });
    }

    const companyToggle = document.getElementById('isCompany');
    if (companyToggle) {
        companyToggle.addEventListener('change', toggleCompanyFields);
    }
});