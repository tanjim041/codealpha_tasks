/**
 * Profile Module
 * Interactive user profile management, editing metadata via PUT /api/users/profile,
 * and listing owned/participating workspaces and assigned deliverables.
 * Author: Md. Tanjimul Islam
 */

const Profile = {
  user: null,

  async init() {
    Auth.requireAuth();
    UI.setupNavbar();

    this.user = Auth.getUser();
    if (this.user) {
      this.renderUserInfo(this.user);
    }

    await this.loadUserProfileStats();
    await this.loadUserProjects();
    await this.loadUserTasks();
    this.setupEventListeners();
    UI.initIcons();
  },

  renderUserInfo(user) {
    const nameEl = document.getElementById('profile-name');
    const usernameEl = document.getElementById('profile-username');
    const emailEl = document.getElementById('profile-email');
    const avatarEl = document.getElementById('profile-avatar');
    const roleBadge = document.getElementById('profile-role-badge');

    if (nameEl) nameEl.textContent = user.name;
    if (usernameEl) usernameEl.textContent = `@${user.username}`;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl && user.avatar) avatarEl.src = user.avatar;
    if (roleBadge) roleBadge.textContent = user.role || 'Member';
  },

  async loadUserProfileStats() {
    if (!this.user) return;
    try {
      const data = await API.get(`/users/${this.user.id}`);
      const stats = data.user || {};

      document.getElementById('user-stat-projects').textContent = stats.projects_count || 0;
      document.getElementById('user-stat-assigned').textContent = stats.assigned_tasks_count || 0;
      document.getElementById('user-stat-completed').textContent = stats.completed_tasks_count || 0;
    } catch (err) {
      console.error('Failed to load user profile statistics:', err);
    }
  },

  async loadUserProjects() {
    const container = document.getElementById('user-projects-list');
    if (!container) return;

    try {
      const data = await API.get('/projects');
      const projects = data.projects || [];

      if (projects.length === 0) {
        container.innerHTML = `
          <div class="py-6 text-center text-xs text-[#94A3B8] border border-dashed border-[#27304A] rounded-xl">
            No workspaces found.
          </div>
        `;
        return;
      }

      container.innerHTML = projects.map(p => `
        <div class="p-3 rounded-xl bg-[#151B2D] border border-[#27304A] hover:border-[#6366F1]/50 transition-all flex items-center justify-between text-xs">
          <div>
            <h4 class="font-semibold text-[#F8FAFC]">
              <a href="project-details.html?id=${p.id}" class="hover:text-[#818CF8] transition-colors">${p.name}</a>
            </h4>
            <span class="text-[10px] text-[#94A3B8]">${p.status} • ${p.completed_tasks || 0}/${p.total_tasks || 0} tasks completed</span>
          </div>
          <a href="project-details.html?id=${p.id}" class="px-2.5 py-1 bg-[#111827] hover:bg-[#1E293B] text-[#6366F1] hover:text-[#818CF8] rounded-lg border border-[#27304A] font-semibold transition-colors">
            Open
          </a>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<p class="text-xs text-[#FB7185]">Failed to load projects.</p>`;
    }
  },

  async loadUserTasks() {
    const container = document.getElementById('user-tasks-list');
    if (!container) return;

    try {
      const data = await API.get('/tasks');
      const tasks = data.tasks || [];

      if (tasks.length === 0) {
        container.innerHTML = `
          <div class="py-6 text-center text-xs text-[#94A3B8] border border-dashed border-[#27304A] rounded-xl">
            No assigned deliverables.
          </div>
        `;
        return;
      }

      container.innerHTML = tasks.map(t => {
        const priorityClass = t.priority === 'High' ? 'badge-high' :
                              t.priority === 'Medium' ? 'badge-medium' : 'badge-low';
        const statusClass = t.status === 'Completed' ? 'badge-completed' :
                            t.status === 'In Progress' ? 'badge-in-progress' : 'badge-todo';

        return `
          <div class="p-3 rounded-xl bg-[#151B2D] border border-[#27304A] hover:border-[#6366F1]/40 transition-all flex items-center justify-between text-xs cursor-pointer" onclick="UI.openTaskModal(${t.id}, () => Profile.loadUserTasks())">
            <div class="flex-1 min-w-0 pr-2">
              <h4 class="font-semibold text-[#F8FAFC] truncate">${t.title}</h4>
              <p class="text-[10px] text-[#94A3B8] truncate mt-0.5">Project: ${t.project_name} • Due ${UI.formatDate(t.due_date)}</p>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityClass}">${t.priority}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusClass}">${t.status}</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<p class="text-xs text-[#FB7185]">Failed to load tasks.</p>`;
    }
  },

  setupEventListeners() {
    const modal = document.getElementById('edit-profile-modal');
    const openBtn = document.getElementById('open-edit-profile-btn');
    const closeBtn = document.getElementById('close-edit-profile-modal');
    const cancelBtn = document.getElementById('cancel-edit-profile-btn');
    const form = document.getElementById('edit-profile-form');

    openBtn?.addEventListener('click', () => {
      if (!this.user) return;
      document.getElementById('edit-name-input').value = this.user.name || '';
      document.getElementById('edit-avatar-input').value = this.user.avatar || '';
      modal?.classList.remove('hidden');
    });

    const closeModal = () => modal?.classList.add('hidden');
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submit-edit-profile-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      const name = document.getElementById('edit-name-input')?.value.trim();
      const avatar = document.getElementById('edit-avatar-input')?.value.trim();

      try {
        const res = await API.put('/users/profile', { name, avatar });
        UI.showToast('Profile updated successfully!', 'success');

        this.user = res.user;
        Auth.setUser(res.user);
        this.renderUserInfo(res.user);
        UI.setupNavbar();
        closeModal();
      } catch (err) {
        UI.showToast(err.message || 'Failed to update profile', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
      }
    });
  }
};

window.Profile = Profile;
