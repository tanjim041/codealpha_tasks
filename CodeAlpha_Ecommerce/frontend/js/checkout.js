/* ==========================================================================
   Shopping Cart Page & Checkout Processing Logic (Consistent Dark-First Theme)
   ========================================================================== */

// Render cart table on cart.html
function renderCartPage() {
  const container = document.getElementById('cart-container');
  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A] shadow-md animate-fade-in-up">
        <div class="w-16 h-16 rounded-full bg-[#151B2D] border border-[#27304A] text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-[#F8FAFC] mb-2">Your Shopping Cart is Empty</h3>
        <p class="text-sm text-[#94A3B8] max-w-sm mx-auto mb-6">Looks like you haven't added any products to your cart yet. Discover our collection of tech and lifestyle essentials.</p>
        <a href="products.html" class="btn-press inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors">
          Start Shopping &rarr;
        </a>
      </div>
    `;
    return;
  }

  const totals = getCartTotals();

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in-up">
      <!-- Cart Items List -->
      <div class="lg:col-span-2 bg-[#111827] rounded-2xl border border-[#27304A] shadow-md p-6 sm:p-8">
        <div class="flex items-center justify-between pb-5 border-b border-[#1E293B] mb-6">
          <h2 class="text-lg font-bold text-[#F8FAFC]">Review Items (${totals.count})</h2>
          <button class="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors" onclick="clearCart(); renderCartPage();">
            Clear Cart
          </button>
        </div>

        <div class="divide-y divide-[#1E293B]">
          ${cart
            .map((item) => {
              const lineTotal = (item.price * item.quantity).toFixed(2);
              return `
              <div id="cart-row-${item.id}" class="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#0B1020] overflow-hidden border border-[#27304A] flex-shrink-0 flex items-center justify-center p-2">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover rounded-lg" onerror="handleImageError(this)" />
                  </div>
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full mb-1 inline-block">
                      ${escapeHtml(item.category)}
                    </span>
                    <h4 class="font-bold text-[#F8FAFC] text-sm sm:text-base hover:text-indigo-400 transition-colors line-clamp-1">
                      <a href="product-details.html?id=${item.id}">${escapeHtml(item.name)}</a>
                    </h4>
                    <span class="text-xs font-semibold text-[#94A3B8]">$${item.price.toFixed(2)} each</span>
                  </div>
                </div>

                <div class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  <div class="inline-flex items-center border border-[#27304A] rounded-lg overflow-hidden bg-[#0B1020]">
                    <button class="btn-press w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-[#1B2438] font-bold text-sm" onclick="handleCartQtyChange(${item.id}, ${item.quantity - 1})">-</button>
                    <span class="w-9 h-8 flex items-center justify-center font-bold text-xs text-[#F8FAFC] border-x border-[#27304A]">${item.quantity}</span>
                    <button class="btn-press w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-[#1B2438] font-bold text-sm" onclick="handleCartQtyChange(${item.id}, ${item.quantity + 1})">+</button>
                  </div>

                  <div class="text-right min-w-[75px]">
                    <span class="text-base font-black text-[#F8FAFC]">$${lineTotal}</span>
                  </div>

                  <button 
                    class="btn-press p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors" 
                    onclick="animateRemoveItem(${item.id})"
                    title="Remove item"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>

        <div class="pt-6 mt-4 border-t border-[#1E293B] flex justify-between items-center">
          <a href="products.html" class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Continue Browsing
          </a>
        </div>
      </div>

      <!-- Order Summary Card -->
      <div class="bg-[#111827] rounded-2xl border border-[#27304A] shadow-md p-6 sm:p-8">
        <h2 class="text-lg font-bold text-[#F8FAFC] pb-4 border-b border-[#1E293B] mb-5">Order Summary</h2>

        <div class="space-y-3.5 text-sm text-[#CBD5E1] mb-6">
          <div class="flex justify-between">
            <span>Subtotal (${totals.count} items)</span>
            <span class="font-semibold text-[#F8FAFC]">$${totals.subtotal.toFixed(2)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span>Standard Shipping</span>
            <span class="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">FREE</span>
          </div>
          <div class="flex justify-between">
            <span>Estimated Sales Tax</span>
            <span class="font-semibold text-[#F8FAFC]">$0.00</span>
          </div>

          <div class="pt-4 border-t border-[#1E293B] flex justify-between items-baseline">
            <span class="text-base font-bold text-[#F8FAFC]">Total</span>
            <span class="text-2xl font-black text-[#F8FAFC]">$${totals.subtotal.toFixed(2)}</span>
          </div>
        </div>

        <a href="checkout.html" class="btn-press w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors">
          <span>Proceed to Checkout</span>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </a>

        <p class="text-[11px] text-[#94A3B8] text-center mt-4">
          Safe & verified checkout with backend price protection.
        </p>
      </div>
    </div>
  `;
}

function handleCartQtyChange(productId, newQty) {
  updateCartQuantity(productId, newQty);
  renderCartPage();
}

function animateRemoveItem(productId) {
  const row = document.getElementById(`cart-row-${productId}`);
  if (row) {
    row.style.opacity = '0';
    row.style.transform = 'translateX(20px)';
    setTimeout(() => {
      removeFromCart(productId);
      renderCartPage();
    }, 200);
  } else {
    removeFromCart(productId);
    renderCartPage();
  }
}

// Initialize and manage checkout.html (Dark Theme)
function initCheckoutPage() {
  const container = document.getElementById('checkout-container');
  if (!container) return;

  if (!isAuthenticated()) {
    showToast('Please login to complete your checkout.', 'error');
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your cart is empty.', 'error');
    window.location.href = 'cart.html';
    return;
  }

  const totals = getCartTotals();
  const user = getUser() || {};

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in-up">
      <!-- Checkout Form -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-[#111827] rounded-2xl border border-[#27304A] shadow-md p-6 sm:p-8">
          <h2 class="text-lg font-bold text-[#F8FAFC] mb-5 flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-700/60 text-xs flex items-center justify-center font-bold">1</span>
            Shipping & Customer Details
          </h2>

          <form id="checkout-form" onsubmit="handlePlaceOrder(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">Full Name</label>
              <input type="text" class="w-full px-3.5 py-2.5 rounded-lg border border-[#27304A] bg-[#0B1020] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-[#F8FAFC] transition-all" id="shipping-name" value="${escapeHtml(user.name || '')}" required />
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">Email Address</label>
              <input type="email" class="w-full px-3.5 py-2.5 rounded-lg border border-[#27304A] bg-[#080B14] text-sm text-slate-500 cursor-not-allowed" id="shipping-email" value="${escapeHtml(user.email || '')}" readonly />
              <span class="text-[11px] text-[#94A3B8] mt-1 block">Linked to your registered account.</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">Delivery Address</label>
              <input type="text" class="w-full px-3.5 py-2.5 rounded-lg border border-[#27304A] bg-[#0B1020] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-[#F8FAFC] transition-all placeholder-[#94A3B8]/60" id="shipping-address" placeholder="123 Innovation Boulevard, Suite 400" required />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">City</label>
                <input type="text" class="w-full px-3.5 py-2.5 rounded-lg border border-[#27304A] bg-[#0B1020] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-[#F8FAFC] transition-all placeholder-[#94A3B8]/60" id="shipping-city" placeholder="San Francisco" required />
              </div>
              <div>
                <label class="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">Postal Code</label>
                <input type="text" class="w-full px-3.5 py-2.5 rounded-lg border border-[#27304A] bg-[#0B1020] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-[#F8FAFC] transition-all placeholder-[#94A3B8]/60" id="shipping-zip" placeholder="94105" required />
              </div>
            </div>

            <div class="pt-6 mt-6 border-t border-[#1E293B]">
              <h2 class="text-lg font-bold text-[#F8FAFC] mb-4 flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-700/60 text-xs flex items-center justify-center font-bold">2</span>
                Payment Method
              </h2>
              <div class="p-4 rounded-xl border border-[#27304A] bg-[#151B2D] flex items-start gap-3">
                <input type="radio" name="payment" checked class="mt-1 text-indigo-600 focus:ring-indigo-500 bg-[#0B1020] border-[#27304A]" />
                <div>
                  <h4 class="text-sm font-bold text-[#F8FAFC]">Cash on Delivery / Direct Invoice</h4>
                  <p class="text-xs text-[#94A3B8] mt-0.5">Internship Demo Mode: No credit card required. The order is immediately registered and verified by the backend server.</p>
                </div>
              </div>
            </div>

            <button type="submit" id="place-order-btn" class="btn-press w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base rounded-xl shadow-sm transition-colors mt-6">
              Confirm & Place Order &rarr;
            </button>
          </form>
        </div>
      </div>

      <!-- Summary Sidebar -->
      <div class="bg-[#111827] rounded-2xl border border-[#27304A] shadow-md p-6 sm:p-8">
        <h2 class="text-lg font-bold text-[#F8FAFC] pb-4 border-b border-[#1E293B] mb-4">Items in Order (${totals.count})</h2>

        <div class="max-h-72 overflow-y-auto divide-y divide-[#1E293B] pr-1 mb-5">
          ${cart
            .map(
              (item) => `
            <div class="py-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-lg bg-[#0B1020] border border-[#27304A] flex-shrink-0 flex items-center justify-center p-1">
                  <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover rounded" onerror="handleImageError(this)" />
                </div>
                <div class="min-w-0">
                  <h5 class="text-xs font-bold text-[#F8FAFC] truncate">${escapeHtml(item.name)}</h5>
                  <span class="text-[11px] text-[#94A3B8]">Qty: ${item.quantity} &times; $${item.price.toFixed(2)}</span>
                </div>
              </div>
              <span class="text-xs font-bold text-[#F8FAFC] whitespace-nowrap">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="space-y-2.5 text-xs text-[#CBD5E1] pt-4 border-t border-[#1E293B] mb-5">
          <div class="flex justify-between">
            <span>Subtotal</span>
            <span class="font-semibold text-[#F8FAFC]">$${totals.subtotal.toFixed(2)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span>Shipping</span>
            <span class="font-bold text-emerald-400">FREE</span>
          </div>
          <div class="pt-3 border-t border-[#1E293B] flex justify-between items-baseline">
            <span class="text-sm font-bold text-[#F8FAFC]">Total</span>
            <span class="text-xl font-black text-[#F8FAFC]">$${totals.subtotal.toFixed(2)}</span>
          </div>
        </div>

        <p class="text-[11px] text-[#94A3B8] text-center leading-relaxed">
          * Server-side trusted calculation ensures accurate prices and immediate stock reduction.
        </p>
      </div>
    </div>
  `;
}

// Handle order submission
async function handlePlaceOrder(event) {
  event.preventDefault();

  const placeBtn = document.getElementById('place-order-btn');
  if (placeBtn) {
    placeBtn.disabled = true;
    placeBtn.textContent = 'Processing Secure Order...';
  }

  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your cart is empty.', 'error');
    if (placeBtn) {
      placeBtn.disabled = false;
      placeBtn.textContent = 'Confirm & Place Order →';
    }
    return;
  }

  const items = cart.map((i) => ({
    product_id: i.id,
    quantity: i.quantity
  }));

  try {
    const response = await apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({ items })
    });

    if (response.success && response.order) {
      clearCart();
      showToast('Order successfully placed!', 'success');
      setTimeout(() => {
        window.location.href = `order-details.html?id=${response.order.id}&placed=true`;
      }, 400);
    }
  } catch (error) {
    showToast(error.message || 'Order failed to process.', 'error');
    if (placeBtn) {
      placeBtn.disabled = false;
      placeBtn.textContent = 'Confirm & Place Order →';
    }
  }
}
