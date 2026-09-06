/* ==========================================================================
   Shopping Cart Management (localStorage & Animated UI Sync)
   ========================================================================== */

const CART_STORAGE_KEY = 'codealpha_ecommerce_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse cart from localStorage:', e);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge(true);
    window.dispatchEvent(new Event('cart-updated'));
  } catch (e) {
    console.error('Failed to save cart to localStorage:', e);
  }
}

function addToCart(product, quantity = 1) {
  if (!product || !product.id) return false;
  const qtyToAdd = parseInt(quantity, 10);
  if (isNaN(qtyToAdd) || qtyToAdd <= 0) return false;

  const cart = getCart();
  const existingItemIndex = cart.findIndex((item) => item.id === product.id);

  const currentQtyInCart = existingItemIndex > -1 ? cart[existingItemIndex].quantity : 0;
  const newTotalQty = currentQtyInCart + qtyToAdd;

  if (product.stock !== undefined && newTotalQty > product.stock) {
    showToast(`Cannot add ${qtyToAdd}. Maximum available stock is ${product.stock}.`, 'error');
    return false;
  }

  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity = newTotalQty;
    cart[existingItemIndex].price = product.price;
    cart[existingItemIndex].stock = product.stock;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image: product.image,
      category: product.category,
      stock: product.stock,
      quantity: qtyToAdd
    });
  }

  saveCart(cart);
  showToast(`Added "${product.name}" to cart!`, 'success');
  return true;
}

function updateCartQuantity(productId, newQty) {
  const cart = getCart();
  const index = cart.findIndex((item) => item.id === productId);
  if (index === -1) return;

  const targetQty = parseInt(newQty, 10);
  if (targetQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (cart[index].stock && targetQty > cart[index].stock) {
    showToast(`Only ${cart[index].stock} items in stock.`, 'error');
    cart[index].quantity = cart[index].stock;
  } else {
    cart[index].quantity = targetQty;
  }

  saveCart(cart);
}

function removeFromCart(productId) {
  let cart = getCart();
  const item = cart.find((i) => i.id === productId);
  cart = cart.filter((i) => i.id !== productId);
  saveCart(cart);
  if (item) {
    showToast(`Removed "${item.name}" from cart.`);
  }
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  updateCartBadge(false);
  window.dispatchEvent(new Event('cart-updated'));
}

function getCartTotals() {
  const cart = getCart();
  let count = 0;
  let subtotal = 0;

  for (const item of cart) {
    count += item.quantity;
    subtotal += item.price * item.quantity;
  }

  return {
    count,
    subtotal: Math.round(subtotal * 100) / 100
  };
}

function updateCartBadge(animate = false) {
  const badge = document.getElementById('cart-count');
  if (badge) {
    const totals = getCartTotals();
    badge.textContent = totals.count;

    if (animate) {
      badge.classList.remove('animate-badge-pop');
      void badge.offsetWidth; // Trigger reflow
      badge.classList.add('animate-badge-pop');
      setTimeout(() => badge.classList.remove('animate-badge-pop'), 350);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => updateCartBadge(false));
window.addEventListener('storage', () => updateCartBadge(false));
