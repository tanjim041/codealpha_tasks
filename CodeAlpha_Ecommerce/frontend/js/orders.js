/* ==========================================================================
   Order History & Order Details Logic (Consistent Dark-First Theme)
   ========================================================================== */

// Load user orders list on orders.html
async function loadOrdersList() {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  if (!requireAuth()) return;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="h-24 bg-[#111827] rounded-xl border border-[#27304A] p-5 skeleton-shimmer"></div>
      <div class="h-24 bg-[#111827] rounded-xl border border-[#27304A] p-5 skeleton-shimmer"></div>
      <div class="h-24 bg-[#111827] rounded-xl border border-[#27304A] p-5 skeleton-shimmer"></div>
    </div>
  `;

  try {
    const data = await apiRequest('/orders');
    const orders = data.orders || [];

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A] shadow-md animate-fade-in-up">
          <div class="w-16 h-16 rounded-full bg-[#151B2D] border border-[#27304A] text-slate-400 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <h3 class="text-xl font-bold text-[#F8FAFC] mb-2">No Orders Placed Yet</h3>
          <p class="text-sm text-[#94A3B8] max-w-sm mx-auto mb-6">You have not placed any orders yet. Explore our curated store and make your first purchase!</p>
          <a href="products.html" class="btn-press inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors">
            Start Shopping &rarr;
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="space-y-4 animate-fade-in-up">
        ${orders
          .map((order) => {
            const formattedDate = new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const statusLower = (order.status || '').toLowerCase();
            let statusBadge = `<span class="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">${escapeHtml(order.status)}</span>`;
            if (statusLower.includes('pending')) {
              statusBadge = `<span class="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-full">${escapeHtml(order.status)}</span>`;
            } else if (statusLower.includes('cancel') || statusLower.includes('fail')) {
              statusBadge = `<span class="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2.5 py-0.5 rounded-full">${escapeHtml(order.status)}</span>`;
            }

            return `
            <div class="bg-[#111827] rounded-xl border border-[#27304A] p-5 sm:p-6 shadow-sm hover:border-[#3b4870] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div class="flex items-center gap-3 mb-1.5">
                  <h3 class="font-extrabold text-[#F8FAFC] text-base">Order #${order.id}</h3>
                  ${statusBadge}
                </div>
                <div class="text-xs text-[#94A3B8]">
                  <span>${formattedDate}</span> &bull; 
                  <span>${order.total_items} items</span>
                </div>
              </div>

              <div class="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#1E293B]">
                <div class="text-left sm:text-right">
                  <span class="text-[11px] text-[#94A3B8] font-medium block">Total Paid</span>
                  <span class="text-lg font-black text-[#F8FAFC]">$${parseFloat(order.total).toFixed(2)}</span>
                </div>
                <a href="order-details.html?id=${order.id}" class="btn-press inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg border border-[#27304A] bg-[#151B2D] hover:bg-[#1B2438] text-slate-200 transition-colors">
                  <span>Details</span>
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 5"></polyline></svg>
                </a>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `
      <div class="text-center py-16 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <h3 class="text-lg font-bold text-[#F8FAFC] mb-1">Error Loading Orders</h3>
        <p class="text-sm text-[#94A3B8] mb-5">${escapeHtml(error.message || 'Could not retrieve your orders.')}</p>
        <button class="btn-press px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-sm" onclick="loadOrdersList()">Retry</button>
      </div>
    `;
  }
}

// Load specific order details on order-details.html
async function loadOrderDetails() {
  const container = document.getElementById('order-detail-container');
  if (!container) return;

  if (!requireAuth()) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const isNewlyPlaced = urlParams.get('placed') === 'true';

  if (!orderId) {
    container.innerHTML = `
      <div class="text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <h3 class="text-xl font-bold text-[#F8FAFC] mb-2">Order Not Specified</h3>
        <p class="text-sm text-[#94A3B8] mb-6">No order ID was provided in the URL.</p>
        <a href="orders.html" class="btn-press inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-indigo-500">Back to Orders</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-6">
      <div class="h-16 bg-[#111827] rounded-xl border border-[#27304A] skeleton-shimmer"></div>
      <div class="h-64 bg-[#111827] rounded-xl border border-[#27304A] skeleton-shimmer"></div>
    </div>
  `;

  try {
    const data = await apiRequest(`/orders/${orderId}`);
    const order = data.order;
    const items = order.items || [];

    const formattedDate = new Date(order.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusLower = (order.status || '').toLowerCase();
    let statusBadge = `<span class="inline-flex items-center text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full shadow-xs">Status: ${escapeHtml(order.status)}</span>`;
    if (statusLower.includes('pending')) {
      statusBadge = `<span class="inline-flex items-center text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-full shadow-xs">Status: ${escapeHtml(order.status)}</span>`;
    } else if (statusLower.includes('cancel') || statusLower.includes('fail')) {
      statusBadge = `<span class="inline-flex items-center text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 border border-rose-800/60 px-3 py-1 rounded-full shadow-xs">Status: ${escapeHtml(order.status)}</span>`;
    }

    const newOrderBanner = isNewlyPlaced
      ? `
      <div class="p-4 rounded-xl border border-emerald-800/60 bg-emerald-950/50 text-emerald-300 flex items-center gap-3 mb-6 shadow-xs animate-fade-in-up">
        <div class="w-8 h-8 rounded-full bg-emerald-900/80 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div>
          <h4 class="font-bold text-sm text-[#F8FAFC]">Order Placed Successfully!</h4>
          <p class="text-xs text-emerald-400/90">Thank you for your purchase. Your order has been registered in the database.</p>
        </div>
      </div>
    `
      : '';

    container.innerHTML = `
      ${newOrderBanner}

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1E293B] mb-8">
        <div>
          <a href="orders.html" class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 mb-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back to Orders
          </a>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">Order #${order.id}</h1>
          <p class="text-xs text-[#94A3B8] mt-1">Placed on ${formattedDate}</p>
        </div>

        <div>
          ${statusBadge}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <!-- Order Items -->
        <div class="lg:col-span-2 bg-[#111827] rounded-2xl border border-[#27304A] shadow-md p-6 sm:p-8">
          <h2 class="text-lg font-bold text-[#F8FAFC] pb-4 border-b border-[#1E293B] mb-4">Purchased Items</h2>

          <div class="divide-y divide-[#1E293B]">
            ${items
              .map((item) => {
                const lineTotal = (item.price * item.quantity).toFixed(2);
                return `
                <div class="py-4 flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3.5">
                    <div class="w-14 h-14 rounded-xl bg-[#0B1020] border border-[#27304A] flex items-center justify-center p-1.5 flex-shrink-0">
                      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover rounded-lg" onerror="handleImageError(this)" />
                    </div>
                    <div>
                      <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full mb-1 inline-block">${escapeHtml(item.category)}</span>
                      <h4 class="font-bold text-[#F8FAFC] text-sm hover:text-indigo-400 transition-colors">
                        <a href="product-details.html?id=${item.product_id}">${escapeHtml(item.name)}</a>
                      </h4>
                      <span class="text-xs text-[#94A3B8]">Qty: ${item.quantity} &times; $${parseFloat(item.price).toFixed(2)}</span>
                    </div>
                  </div>
                  <span class="text-base font-extrabold text-[#F8FAFC]">$${lineTotal}</span>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>

        <!-- Receipt Summary -->
        <div class="bg-[#111827] rounded-2xl border border-[#27304A] shadow-md p-6 sm:p-8">
          <h2 class="text-lg font-bold text-[#F8FAFC] pb-4 border-b border-[#1E293B] mb-5">Receipt Details</h2>

          <div class="space-y-3.5 text-xs text-[#CBD5E1] mb-6">
            <div class="flex justify-between">
              <span class="text-[#94A3B8]">Order ID</span>
              <span class="font-bold text-[#F8FAFC]">#${order.id}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#94A3B8]">Payment Status</span>
              <span class="font-semibold text-emerald-400">Confirmed (Demo Invoice)</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#94A3B8]">Shipping Option</span>
              <span class="font-semibold text-[#F8FAFC]">Standard Delivery (Free)</span>
            </div>
            <div class="pt-4 border-t border-[#1E293B] flex justify-between items-baseline">
              <span class="text-sm font-bold text-[#F8FAFC]">Total Charged</span>
              <span class="text-2xl font-black text-[#F8FAFC]">$${parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>

          <a href="products.html" class="btn-press w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors">
            Shop More Products &rarr;
          </a>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `
      <div class="text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <h3 class="text-lg font-bold text-[#F8FAFC] mb-1">Could Not Retrieve Order</h3>
        <p class="text-sm text-[#94A3B8] mb-5">${escapeHtml(error.message || 'You might not have permission to view this order.')}</p>
        <a href="orders.html" class="btn-press inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-indigo-500">Back to Orders</a>
      </div>
    `;
  }
}
