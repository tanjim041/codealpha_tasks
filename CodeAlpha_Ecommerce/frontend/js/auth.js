/* ==========================================================================
   Authentication State & Navigation Bar Sync (Consistent Dark-First Theme)
   ========================================================================== */

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function isAuthenticated() {
  return !!getToken();
}

function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new Event('auth-changed'));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth-changed'));
  showToast('You have been logged out.');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

function requireAuth(redirectUrl = window.location.pathname) {
  if (!isAuthenticated()) {
    const current = encodeURIComponent(window.location.href);
    window.location.href = `login.html?redirect=${current}`;
    return false;
  }
  return true;
}

function renderNavAuth() {
  const container = document.getElementById('nav-auth-container');
  if (!container) return;

  if (isAuthenticated()) {
    const user = getUser();
    const userName = user ? user.name : 'Customer';

    container.innerHTML = `
      <a href="orders.html" class="hidden sm:inline-flex text-xs sm:text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors">
        My Orders
      </a>
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#151B2D] border border-[#27304A] text-xs font-semibold text-slate-200">
        <svg class="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span class="max-w-[110px] truncate">${escapeHtml(userName)}</span>
      </div>
      <button onclick="logout()" class="btn-press text-xs font-semibold px-3 py-1.5 rounded-md border border-[#27304A] bg-[#111827] hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/60 text-slate-300 transition-colors" title="Sign Out">
        Logout
      </button>
    `;
  } else {
    container.innerHTML = `
      <a href="login.html" class="btn-press text-xs sm:text-sm font-semibold px-3.5 py-1.5 sm:py-2 rounded-lg border border-[#27304A] bg-[#151B2D] hover:bg-[#1B2438] text-slate-200 transition-colors">
        Log In
      </a>
      <a href="register.html" class="btn-press text-xs sm:text-sm font-semibold px-3.5 py-1.5 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors">
        Register
      </a>
    `;
  }
}

// Password visibility toggle helper
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (btn) {
    btn.innerHTML = isPassword
      ? `<svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
      : `<svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  }
}

document.addEventListener('DOMContentLoaded', renderNavAuth);
window.addEventListener('auth-changed', renderNavAuth);
window.addEventListener('storage', renderNavAuth);
