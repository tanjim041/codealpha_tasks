/* ==========================================================================
   Product Catalog & Product Details Logic (Consistent Dark-First Theme)
   ========================================================================== */

let allCategories = [];
let currentCategory = 'all';
let currentSearch = '';

// Render dark skeleton loaders during API fetch
function renderProductSkeletons(count = 8) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = Array.from({ length: count })
    .map(
      () => `
      <div class="bg-[#111827] rounded-xl border border-[#27304A] p-4 flex flex-col gap-3">
        <div class="w-full h-52 skeleton-shimmer rounded-lg"></div>
        <div class="w-20 h-4 skeleton-shimmer rounded-full"></div>
        <div class="w-3/4 h-5 skeleton-shimmer"></div>
        <div class="w-full h-4 skeleton-shimmer"></div>
        <div class="flex justify-between items-center mt-2">
          <div class="w-16 h-6 skeleton-shimmer"></div>
          <div class="w-16 h-4 skeleton-shimmer rounded-full"></div>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <div class="h-9 skeleton-shimmer rounded-lg"></div>
          <div class="h-9 skeleton-shimmer rounded-lg"></div>
        </div>
      </div>
    `
    )
    .join('');
}

// Load products
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  renderProductSkeletons(8);

  try {
    let endpoint = '/products?';
    if (currentCategory && currentCategory !== 'all') {
      endpoint += `category=${encodeURIComponent(currentCategory)}&`;
    }
    if (currentSearch && currentSearch.trim() !== '') {
      endpoint += `search=${encodeURIComponent(currentSearch.trim())}&`;
    }

    const data = await apiRequest(endpoint);
    const products = data.products || [];

    renderProductsGrid(products);
  } catch (err) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-16 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <div class="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-800/60 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h3 class="text-lg font-bold text-[#F8FAFC] mb-1">Unable to load products</h3>
        <p class="text-sm text-[#94A3B8] max-w-md mx-auto mb-5">${escapeHtml(err.message || 'Please check if the backend server is running.')}</p>
        <button class="btn-press px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-sm" onclick="loadProducts()">Try Again</button>
      </div>
    `;
  }
}

// Render product cards with dark-first theme
function renderProductsGrid(products) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <div class="w-14 h-14 rounded-full bg-[#151B2D] border border-[#27304A] text-slate-400 flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <h3 class="text-xl font-bold text-[#F8FAFC] mb-1">No Products Found</h3>
        <p class="text-sm text-[#94A3B8] max-w-sm mx-auto mb-6">We couldn't find any products matching your current search or category filter.</p>
        <button class="btn-press px-4 py-2 border border-[#27304A] bg-[#151B2D] hover:bg-[#1B2438] text-slate-200 rounded-lg text-sm font-semibold" onclick="resetFilters()">
          Clear All Filters
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = products
    .map((p) => {
      const isOutOfStock = p.stock <= 0;
      const stockBadge = isOutOfStock
        ? `<span class="inline-flex items-center text-[11px] font-semibold text-rose-400 bg-rose-950/50 border border-rose-800/60 px-2 py-0.5 rounded-full">Out of Stock</span>`
        : `<span class="inline-flex items-center text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">${p.stock} in stock</span>`;

      return `
        <article class="group bg-[#111827] rounded-xl border border-[#27304A] overflow-hidden product-card-hover flex flex-col">
          <div class="relative w-full h-56 bg-[#0B1020] border-b border-[#27304A]/60 overflow-hidden flex items-center justify-center">
            <img 
              src="${escapeHtml(p.image)}" 
              alt="${escapeHtml(p.name)}" 
              onerror="handleImageError(this)" 
              loading="lazy" 
              class="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-104"
            />
            <div class="absolute top-3 left-3">
              <span class="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-indigo-300 bg-[#111827]/90 backdrop-blur-sm border border-[#27304A] px-2.5 py-0.5 rounded-full shadow-xs">
                ${escapeHtml(p.category)}
              </span>
            </div>
          </div>

          <div class="p-5 flex flex-col flex-1">
            <h3 class="font-bold text-[#F8FAFC] text-base mb-1.5 line-clamp-1 group-hover:text-indigo-400 transition-colors">
              <a href="product-details.html?id=${p.id}">${escapeHtml(p.name)}</a>
            </h3>
            <p class="text-[#94A3B8] text-xs line-clamp-2 mb-4 leading-relaxed flex-1">
              ${escapeHtml(p.description)}
            </p>

            <div class="flex items-center justify-between pt-3 border-t border-[#1E293B] mb-4">
              <div>
                <span class="text-[11px] text-[#94A3B8] block font-medium">Price</span>
                <span class="text-lg font-extrabold text-[#F8FAFC]">$${parseFloat(p.price).toFixed(2)}</span>
              </div>
              <div>${stockBadge}</div>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-auto">
              <a 
                href="product-details.html?id=${p.id}" 
                class="btn-press inline-flex items-center justify-center text-xs font-semibold px-3 py-2.5 rounded-lg border border-[#27304A] bg-[#151B2D] hover:bg-[#1B2438] text-slate-200 transition-colors"
              >
                Details
              </a>
              <button 
                id="btn-add-${p.id}"
                class="btn-press inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
                onclick="handleAddToCart(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${escapeHtml(p.image)}', '${escapeHtml(p.category)}', ${p.stock})"
                ${isOutOfStock ? 'disabled' : ''}
              >
                ${isOutOfStock ? 'Sold Out' : `
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  <span>Add</span>
                `}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function handleAddToCart(id, name, price, image, category, stock) {
  const btn = document.getElementById(`btn-add-${id}`);
  if (btn) {
    btn.classList.add('scale-95');
    setTimeout(() => btn.classList.remove('scale-95'), 150);
  }
  addToCart({ id, name, price, image, category, stock }, 1);
}

// Load categories
async function loadCategories() {
  const container = document.getElementById('category-pills');
  if (!container) return;

  try {
    const data = await apiRequest('/products/categories');
    allCategories = data.categories || [];

    const activeCls = 'bg-indigo-600 text-white shadow-sm border-indigo-500';
    const inactiveCls = 'bg-[#151B2D] text-slate-300 hover:text-white border-[#27304A] hover:border-slate-500';

    container.innerHTML = `
      <button class="btn-press text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${currentCategory === 'all' ? activeCls : inactiveCls}" onclick="selectCategory('all')">
        All Products
      </button>
      ${allCategories
        .map(
          (cat) => `
        <button class="btn-press text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${currentCategory === cat ? activeCls : inactiveCls}" onclick="selectCategory('${escapeHtml(cat)}')">
          ${escapeHtml(cat)}
        </button>
      `
        )
        .join('')}
    `;
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

function selectCategory(category) {
  currentCategory = category;
  loadCategories();
  loadProducts();
}

function handleSearch(event) {
  event.preventDefault();
  const input = document.getElementById('search-input');
  if (input) {
    currentSearch = input.value;
    loadProducts();
  }
}

function resetFilters() {
  currentCategory = 'all';
  currentSearch = '';
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  loadCategories();
  loadProducts();
}

// Load individual product details page (Dark Theme)
async function loadProductDetails() {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    container.innerHTML = `
      <div class="text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <h3 class="text-xl font-bold text-[#F8FAFC] mb-2">Product Not Specified</h3>
        <p class="text-sm text-[#94A3B8] mb-6">Please select a product from our catalog.</p>
        <a href="products.html" class="btn-press inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-indigo-500">
          Browse Catalog
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="bg-[#111827] rounded-2xl border border-[#27304A] p-8 grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in-up">
      <div class="w-full h-96 skeleton-shimmer rounded-xl"></div>
      <div class="flex flex-col gap-4">
        <div class="w-24 h-6 skeleton-shimmer rounded-full"></div>
        <div class="w-3/4 h-8 skeleton-shimmer"></div>
        <div class="w-28 h-8 skeleton-shimmer"></div>
        <div class="w-full h-24 skeleton-shimmer"></div>
        <div class="w-44 h-12 skeleton-shimmer rounded-lg mt-6"></div>
      </div>
    </div>
  `;

  try {
    const data = await apiRequest(`/products/${productId}`);
    const p = data.product;

    const isOutOfStock = p.stock <= 0;
    const maxQty = p.stock > 0 ? p.stock : 1;

    container.innerHTML = `
      <div class="bg-[#111827] rounded-2xl border border-[#27304A] shadow-lg p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in-up">
        <!-- Product Image Container -->
        <div class="w-full h-80 sm:h-[420px] bg-[#0B1020] rounded-xl overflow-hidden border border-[#27304A] flex items-center justify-center p-4">
          <img 
            src="${escapeHtml(p.image)}" 
            alt="${escapeHtml(p.name)}" 
            onerror="handleImageError(this)" 
            class="w-full h-full object-cover rounded-lg transition-transform duration-500 hover:scale-104"
          />
        </div>

        <!-- Product Info -->
        <div class="flex flex-col">
          <div class="flex items-center gap-2 mb-3">
            <span class="inline-flex items-center text-xs font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-0.5 rounded-full">
              ${escapeHtml(p.category)}
            </span>
            ${
              isOutOfStock
                ? '<span class="inline-flex items-center text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2.5 py-0.5 rounded-full">Out of Stock</span>'
                : `<span class="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">${p.stock} units available</span>`
            }
          </div>

          <h1 class="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight mb-2">
            ${escapeHtml(p.name)}
          </h1>

          <div class="text-2xl sm:text-3xl font-black text-indigo-400 mb-6">
            $${parseFloat(p.price).toFixed(2)}
          </div>

          <div class="border-t border-b border-[#1E293B] py-4 mb-6">
            <h4 class="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Description</h4>
            <p class="text-[#CBD5E1] text-sm sm:text-base leading-relaxed">
              ${escapeHtml(p.description)}
            </p>
          </div>

          ${
            !isOutOfStock
              ? `
            <div class="mb-6">
              <label class="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Quantity</label>
              <div class="inline-flex items-center border border-[#27304A] rounded-lg overflow-hidden bg-[#0B1020]">
                <button class="btn-press w-10 h-10 flex items-center justify-center text-slate-300 hover:bg-[#1B2438] font-bold text-lg" type="button" onclick="adjustDetailQuantity(-1, ${maxQty})">-</button>
                <input type="number" id="detail-qty" class="w-12 h-10 text-center font-bold text-[#F8FAFC] bg-transparent border-x border-[#27304A] focus:outline-none" value="1" min="1" max="${maxQty}" readonly />
                <button class="btn-press w-10 h-10 flex items-center justify-center text-slate-300 hover:bg-[#1B2438] font-bold text-lg" type="button" onclick="adjustDetailQuantity(1, ${maxQty})">+</button>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 mt-auto">
              <button 
                id="btn-detail-add"
                class="btn-press flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors" 
                onclick="addDetailToCart(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${escapeHtml(p.image)}', '${escapeHtml(p.category)}', ${p.stock})"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                Add to Shopping Cart
              </button>
              <a href="cart.html" class="btn-press inline-flex items-center justify-center px-6 py-3.5 border border-[#27304A] bg-[#151B2D] hover:bg-[#1B2438] text-slate-200 font-semibold text-sm rounded-lg transition-colors">
                View Cart
              </a>
            </div>
          `
              : `
            <button class="w-full py-3.5 bg-[#151B2D] border border-[#27304A] text-slate-500 font-semibold text-sm rounded-lg cursor-not-allowed" disabled>
              Product Currently Unavailable
            </button>
          `
          }

          <div class="mt-8 pt-6 border-t border-[#1E293B]">
            <a href="products.html" class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back to Full Catalog
            </a>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <h3 class="text-xl font-bold text-[#F8FAFC] mb-2">Product Not Found</h3>
        <p class="text-sm text-[#94A3B8] mb-6">${escapeHtml(err.message || 'The requested product could not be found.')}</p>
        <a href="products.html" class="btn-press inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-indigo-500">
          Back to Catalog
        </a>
      </div>
    `;
  }
}

function adjustDetailQuantity(delta, max) {
  const input = document.getElementById('detail-qty');
  if (!input) return;
  let val = parseInt(input.value, 10) + delta;
  if (val < 1) val = 1;
  if (val > max) val = max;
  input.value = val;
}

function addDetailToCart(id, name, price, image, category, stock) {
  const input = document.getElementById('detail-qty');
  const qty = input ? parseInt(input.value, 10) : 1;
  const btn = document.getElementById('btn-detail-add');
  if (btn) {
    btn.classList.add('scale-95');
    setTimeout(() => btn.classList.remove('scale-95'), 150);
  }
  addToCart({ id, name, price, image, category, stock }, qty);
}
