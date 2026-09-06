/**
 * Tasks Module
 * Interactive task directory, multi-factor filtering, search,
 * quick status transitions, and task detail integration.
 * Author: Md. Tanjimul Islam
 */

const Tasks = {
  allTasks: [],

  async init() {
    Auth.requireAuth();
    UI.setupNavbar();

    await this.loadTasks();
    this.setupEventListeners();
  },

  async loadTasks() {
    const container = document.getElementById('tasks-table-body');
    if (!container) return;

    container.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-[#94A3B8]">
          <i data-lucide="loader-2" class="w-6 h-6 mx-auto animate-spin text-[#6366F1] mb-2"></i>
          <p class="text-xs">Loading deliverables...</p>
        </td>
      </tr>
    `;
    UI.initIcons();

    try {
      const data = await API.get('/tasks');
      this.allTasks = data.tasks || [];
      this.renderTasks();
    } catch (err) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-[#FB7185]">
            <i data-lucide="alert-circle" class="w-6 h-6 mx-auto mb-2"></i>
            <p class="text-xs font-semibold">Failed to load tasks. Please retry.</p>
          </td>
        </tr>
      `;
      UI.initIcons();
    }
  },

  renderTasks() {
    const container = document.getElementById('tasks-table-body');
    if (!container) return;

    const searchQuery = (document.getElementById('task-search-input')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('task-status-filter')?.value || 'All';
    const priorityFilter = document.getElementById('task-priority-filter')?.value || 'All';

    const filtered = this.allTasks.filter(t => {
      const matchesSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery) || 
        (t.project_name && t.project_name.toLowerCase().includes(searchQuery));
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="py-16 text-center text-[#94A3B8]">
            <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-[#94A3B8]/60"></i>
            <p class="text-xs font-medium text-[#CBD5E1]">No tasks match your criteria</p>
            <p class="text-[11px] text-[#94A3B8] mt-0.5">Try clearing filters or search queries.</p>
          </td>
        </tr>
      `;
      UI.initIcons();
      return;
    }

    container.innerHTML = filtered.map(t => {
      const statusBadge = t.status === 'Completed' ? 'badge-completed' :
                          t.status === 'In Progress' ? 'badge-in-progress' : 'badge-todo';
      const priorityBadge = t.priority === 'High' ? 'badge-high' :
                            t.priority === 'Medium' ? 'badge-medium' : 'badge-low';

      return `
        <tr class="hover:bg-[#151B2D]/50 transition-colors group cursor-pointer" onclick="UI.openTaskModal(${t.id}, () => Tasks.loadTasks())">
          <!-- Title -->
          <td class="py-3.5 px-4 font-semibold text-[#F8FAFC] group-hover:text-[#818CF8] transition-colors">
            <div class="flex items-center gap-2">
              <span>${t.title}</span>
              ${t.comment_count > 0 ? `
                <span class="text-[10px] text-[#94A3B8] flex items-center gap-0.5">
                  <i data-lucide="message-square" class="w-3 h-3 text-[#6366F1]"></i> ${t.comment_count}
                </span>
              ` : ''}
            </div>
          </td>

          <!-- Project -->
          <td class="py-3.5 px-4 text-[#CBD5E1]" onclick="event.stopPropagation()">
            <a href="project-details.html?id=${t.project_id}" class="hover:text-[#818CF8] transition-colors flex items-center gap-1">
              <i data-lucide="folder" class="w-3 h-3 text-[#6366F1]"></i>
              <span class="truncate max-w-[140px]">${t.project_name || 'Project'}</span>
            </a>
          </td>

          <!-- Assignee -->
          <td class="py-3.5 px-4 text-[#CBD5E1]">
            <div class="flex items-center gap-1.5">
              <img src="${t.assignee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}" class="w-5 h-5 rounded-full border border-[#27304A]" />
              <span>${t.assignee_name || 'Unassigned'}</span>
            </div>
          </td>

          <!-- Priority -->
          <td class="py-3.5 px-4">
            <span class="px-2.5 py-0.5 rounded-full font-semibold ${priorityBadge}">${t.priority}</span>
          </td>

          <!-- Status -->
          <td class="py-3.5 px-4">
            <span class="px-2.5 py-0.5 rounded-full font-semibold ${statusBadge}">${t.status}</span>
          </td>

          <!-- Due Date -->
          <td class="py-3.5 px-4 text-[#94A3B8]">${UI.formatDate(t.due_date)}</td>

          <!-- Action -->
          <td class="py-3.5 px-4 text-right" onclick="event.stopPropagation()">
            <button data-task-id="${t.id}" data-current="${t.status}" class="quick-status-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#151B2D] hover:bg-[#1E293B] border border-[#27304A] text-[#CBD5E1] transition-all inline-flex items-center gap-1">
              <i data-lucide="repeat" class="w-3 h-3 text-[#6366F1]"></i> Cycle
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach quick status cycle handlers
    container.querySelectorAll('.quick-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const taskId = btn.getAttribute('data-task-id');
        const current = btn.getAttribute('data-current');
        const nextStatus = current === 'Todo' ? 'In Progress' :
                           current === 'In Progress' ? 'Completed' : 'Todo';

        try {
          await API.put(`/tasks/${taskId}`, { status: nextStatus });
          UI.showToast(`Status updated to ${nextStatus}`, 'success');
          await this.loadTasks();
        } catch (err) {
          UI.showToast(err.message || 'Failed to update status', 'error');
        }
      });
    });

    UI.initIcons();
  },

  setupEventListeners() {
    document.getElementById('task-search-input')?.addEventListener('input', () => this.renderTasks());
    document.getElementById('task-status-filter')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('task-priority-filter')?.addEventListener('change', () => this.renderTasks());
  }
};

window.Tasks = Tasks;
