/**
 * Authentication Module
 * Manages user sessions, JWT storage, and route authorization checks
 * Author: Md. Tanjimul Islam
 */

const Auth = {
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  isAuthenticated() {
    return !!API.getToken();
  },

  async login(email, password) {
    const data = await API.post('/auth/login', { email, password });
    API.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async register(name, username, email, password) {
    const data = await API.post('/auth/register', { name, username, email, password });
    API.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  logout() {
    API.removeToken();
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  },

  async checkAuth() {
    if (!this.isAuthenticated()) {
      return null;
    }
    try {
      const data = await API.get('/auth/me');
      this.setUser(data.user);
      return data.user;
    } catch {
      this.logout();
      return null;
    }
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  redirectIfAuthenticated() {
    if (this.isAuthenticated()) {
      window.location.href = 'index.html';
    }
  }
};

window.Auth = Auth;
