/**
 * Project Details Module
 * Full interactive project dashboard, task management, team membership,
 * and deliverable transitions.
 * Author: Md. Tanjimul Islam
 */

const ProjectDetails = {
  projectId: null,
  project: null,
  tasks: [],
  members: [],

  async init() {
    Auth.requireAuth();
    UI.setupNavbar();

    const params = new URLSearchParams(window.location.search);
    this.projectId = params.get('id');

    if (!this.projectId) {
      window.location.href = 'projects.html';
      return;
    }

    await this.refresh();
    this.setupEventListeners();
  },

  async refresh() {
    await this.loadProject();
    await this.loadTasks();
    UI.initIcons();
  },

  async loadProject() {
    try {
      const data = await API.get(`/projects/${this.projectId}`);
      this.project = data.project;
      this.members = this.project.members || [];
      this.renderProjectOverview();
      this.renderMembers();
      this.populateAssigneeDropdown();
    } catch (err) {
      UI.showToast(err.message || 'Failed to load project', 'error');
    }
  },

  renderProjectOverview() {
    const p = this.project;
    if (!p) return;

    document.getElementById('project-title').textContent = p.name;
    document.getElementById('project-description').textContent = p.description || 'No description provided.';
    
    // Status Badge
    const statusBadge = document.getElementById('project-status-badge');
    statusBadge.textContent = p.status;
    statusBadge.className = `px-2.5 py-1 rounded-full text-xs font-semibold ${
      p.status === 'Active' ? 'badge-in-progress' :
      p.status === 'Completed' ? 'badge-completed' : 'badge-low'
    }`;

    // Owner & Dates
    document.getElementById('project-owner-info').innerHTML = `
      <i data-lucide="user" class="w-3.5 h-3.5"></i> Owner: <span class="text-[#F8FAFC] font-medium">${p.owner_name}</span>
    `;
    document.getElementById('project-date-info').innerHTML = `
      <i data-lucide="calendar" class="w-3.5 h-3.5"></i> Created: <span class="text-[#F8FAFC] font-medium">${UI.formatDate(p.created_at)}</span>
    `;

    // Progress Bar & Percentage
    const percent = p.progress_percentage || 0;
    document.getElementById('progress-percent-label').textContent = `${percent}% Completed`;
    document.getElementById('progress-bar-fill').style.width = `${percent}%`;

    // Counters
    document.getElementById('stat-total').textContent = p.total_tasks || 0;
    document.getElementById('stat-todo').textContent = p.todo_tasks || 0;
    document.getElementById('stat-inprogress').textContent = p.in_progress_tasks || 0;
    document.getElementById('stat-completed').textContent = p.completed_tasks || 0;

    // Team management visibility for Owner or Admin
    const memberBtn = document.getElementById('open-member-modal-btn');
    if (memberBtn) {
      if (p.user_role === 'Owner' || p.user_role === 'Admin') {
        memberBtn.classList.remove('hidden');
      } else {
        memberBtn.classList.add('hidden');
      }
    }
  },

  renderMembers() {
    const container = document.getElementById('project-members-list');
    const countBadge = document.getElementById('member-count-badge');
    if (countBadge) countBadge.textContent = this.members.length;
    if (!container) return;

    if (this.members.length === 0) {
      container.innerHTML = `<p class="text-xs text-[#94A3B8] py-4 text-center">No members listed.</p>`;
      return;
    }

    const canManage = this.project.user_role === 'Owner' || this.project.user_role === 'Admin';
    const currentUserId = Auth.getUser()?.id;

    container.innerHTML = this.members.map(m => {
      const isProjectOwner = m.user_id === this.project.owner_id;
      return `
        <div class="p-3 rounded-xl bg-[#151B2D] border border-[#27304A]/70 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2.5">
            <img src="${m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}" class="w-7 h-7 rounded-full border border-[#27304A] object-cover" />
            <div>
              <p class="font-semibold text-[#F8FAFC]">${m.name}</p>
              <p class="text-[10px] text-[#94A3B8]">@${m.username}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold ${
              m.role === 'Owner' ? 'bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40' :
              m.role === 'Admin' ? 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40' :
              'bg-[#27304A]/50 text-[#CBD5E1]'
            }">${m.role}</span>
            ${canManage && !isProjectOwner && m.user_id !== currentUserId ? `
              <button data-member-id="${m.user_id}" class="remove-member-btn text-[#94A3B8] hover:text-[#FB7185] p-1 rounded transition-colors" title="Remove member">
                <i data-lucide="user-x" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach remove handlers
    container.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetId = btn.getAttribute('data-member-id');
        if (!confirm('Are you sure you want to remove this member from the project?')) return;

        try {
          await API.delete(`/projects/${this.projectId}/members/${targetId}`);
          UI.showToast('Member removed from project', 'success');
          await this.refresh();
        } catch (err) {
          UI.showToast(err.message || 'Failed to remove member', 'error');
        }
      });
    });

    UI.initIcons();
  },

  populateAssigneeDropdown() {
    const select = document.getElementById('task-assignee-select');
    if (!select) return;

    select.innerHTML = '<option value="">Unassigned</option>' + this.members.map(m => `
      <option value="${m.user_id}">${m.name} (@${m.username})</option>
    `).join('');
  },

  async loadTasks() {
    const container = document.getElementById('project-tasks-container');
    if (!container) return;

    try {
      const data = await API.get(`/projects/${this.projectId}/tasks`);
      this.tasks = data.tasks || [];
      this.renderTasks();
    } catch (err) {
      container.innerHTML = `
        <div class="py-8 text-center text-[#FB7185] text-xs">Failed to load deliverables.</div>
      `;
    }
  },

  renderTasks() {
    const container = document.getElementById('project-tasks-container');
    if (!container) return;

    const statusFilter = document.getElementById('filter-task-status')?.value || 'All';
    const priorityFilter = document.getElementById('filter-task-priority')?.value || 'All';

    const filtered = this.tasks.filter(t => {
      const matchStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
      return matchStatus && matchPriority;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center border border-dashed border-[#27304A] rounded-2xl bg-[#151B2D]/20">
          <i data-lucide="check-square" class="w-8 h-8 text-[#94A3B8] mx-auto mb-2"></i>
          <p class="text-xs font-semibold text-[#CBD5E1]">No tasks found</p>
          <p class="text-[11px] text-[#94A3B8] mt-0.5">Adjust your filters or add a new deliverable above.</p>
        </div>
      `;
      UI.initIcons();
      return;
    }

    container.innerHTML = filtered.map(t => {
      const priorityClass = t.priority === 'High' ? 'badge-high' :
                            t.priority === 'Medium' ? 'badge-medium' : 'badge-low';
      const statusClass = t.status === 'Completed' ? 'badge-completed' :
                          t.status === 'In Progress' ? 'badge-in-progress' : 'badge-todo';

      return `
        <div class="p-4 rounded-xl bg-[#151B2D] border border-[#27304A] hover:border-[#6366F1]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
          <div class="flex-1 cursor-pointer" onclick="UI.openTaskModal(${t.id}, () => ProjectDetails.refresh())">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityClass}">${t.priority}</span>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusClass}">${t.status}</span>
              ${t.due_date ? `
                <span class="text-[10px] text-[#94A3B8] flex items-center gap-1">
                  <i data-lucide="calendar" class="w-3 h-3"></i> ${UI.formatDate(t.due_date)}
                </span>
              ` : ''}
            </div>
            <h4 class="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#818CF8] transition-colors">${t.title}</h4>
            <p class="text-xs text-[#94A3B8] line-clamp-1 mt-0.5">${t.description || 'No description'}</p>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#27304A]/60">
            <!-- Assignee Info -->
            <div class="flex items-center gap-1.5 text-xs text-[#CBD5E1]">
              <img src="${t.assignee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}" class="w-5 h-5 rounded-full border border-[#27304A]" />
              <span class="text-[11px]">${t.assignee_name || 'Unassigned'}</span>
            </div>

            <!-- Quick Status Step Button -->
            <div class="flex items-center gap-1">
              <button data-task-id="${t.id}" data-current="${t.status}" class="quick-status-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#111827] hover:bg-[#1E293B] border border-[#27304A] text-[#CBD5E1] transition-all flex items-center gap-1">
                <i data-lucide="repeat" class="w-3 h-3 text-[#6366F1]"></i> Cycle
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach quick status cycle handlers
    container.querySelectorAll('.quick-status-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const current = btn.getAttribute('data-current');
        const nextStatus = current === 'Todo' ? 'In Progress' :
                           current === 'In Progress' ? 'Completed' : 'Todo';

        try {
          await API.put(`/tasks/${taskId}`, { status: nextStatus });
          UI.showToast(`Status updated to ${nextStatus}`, 'success');
          await this.refresh();
        } catch (err) {
          UI.showToast(err.message || 'Failed to update status', 'error');
        }
      });
    });

    UI.initIcons();
  },

  setupEventListeners() {
    // Filters
    document.getElementById('filter-task-status')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('filter-task-priority')?.addEventListener('change', () => this.renderTasks());

    // Add Task Modal Open / Close
    const addTaskModal = document.getElementById('add-task-modal');
    document.getElementById('open-add-task-btn')?.addEventListener('click', () => {
      addTaskModal?.classList.remove('hidden');
    });
    document.getElementById('close-add-task-modal')?.addEventListener('click', () => {
      addTaskModal?.classList.add('hidden');
    });
    document.getElementById('cancel-add-task-btn')?.addEventListener('click', () => {
      addTaskModal?.classList.add('hidden');
    });

    // Add Task Submit
    document.getElementById('add-task-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submit-add-task-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';

      const title = document.getElementById('task-title-input')?.value.trim();
      const description = document.getElementById('task-desc-input')?.value.trim();
      const assignee_id = document.getElementById('task-assignee-select')?.value || null;
      const priority = document.getElementById('task-priority-select')?.value || 'Medium';
      const due_date = document.getElementById('task-due-date-input')?.value || '';

      try {
        await API.post(`/projects/${this.projectId}/tasks`, {
          title,
          description,
          assignee_id,
          priority,
          due_date,
          status: 'Todo'
        });

        UI.showToast('Task created successfully!', 'success');
        document.getElementById('add-task-form').reset();
        addTaskModal?.classList.add('hidden');
        await this.refresh();
      } catch (err) {
        UI.showToast(err.message || 'Failed to create task', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Task';
      }
    });

    // Manage Members Modal Open / Close
    const memberModal = document.getElementById('manage-members-modal');
    document.getElementById('open-member-modal-btn')?.addEventListener('click', async () => {
      memberModal?.classList.remove('hidden');
      await this.loadAvailableUsers();
    });
    document.getElementById('close-members-modal')?.addEventListener('click', () => {
      memberModal?.classList.add('hidden');
    });
    document.getElementById('cancel-invite-btn')?.addEventListener('click', () => {
      memberModal?.classList.add('hidden');
    });

    // Submit Member Invite
    document.getElementById('submit-invite-btn')?.addEventListener('click', async () => {
      const userSelect = document.getElementById('invite-user-select');
      const roleSelect = document.getElementById('invite-role-select');
      const userId = userSelect?.value;
      const role = roleSelect?.value || 'Member';

      if (!userId) {
        UI.showToast('Please select a user to invite', 'warning');
        return;
      }

      try {
        await API.post(`/projects/${this.projectId}/members`, { user_id: userId, role });
        UI.showToast('Member added to project', 'success');
        memberModal?.classList.add('hidden');
        await this.refresh();
      } catch (err) {
        UI.showToast(err.message || 'Failed to invite member', 'error');
      }
    });
  },

  async loadAvailableUsers() {
    const select = document.getElementById('invite-user-select');
    if (!select) return;

    try {
      const res = await API.get('/users');
      const allUsers = res.users || [];
      const memberIds = new Set(this.members.map(m => m.user_id));

      const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

      if (nonMembers.length === 0) {
        select.innerHTML = '<option value="">No other users available</option>';
        return;
      }

      select.innerHTML = '<option value="">Select a user...</option>' + nonMembers.map(u => `
        <option value="${u.id}">${u.name} (@${u.username})</option>
      `).join('');
    } catch (err) {
      select.innerHTML = '<option value="">Failed to load users</option>';
    }
  }
};

window.ProjectDetails = ProjectDetails;
