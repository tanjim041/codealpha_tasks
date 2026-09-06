/**
 * UI Utilities Module
 * Provides toasts, skeletons, universal task details modal with comments,
 * and navigation rendering.
 * Author: Md. Tanjimul Islam
 */

const UI = {
  // Initialize Lucide icons
  initIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // Toast Notification
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 p-4 rounded-xl border shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 text-sm font-medium ${
      type === 'success' ? 'bg-[#111827] border-[#34D399]/40 text-[#34D399]' :
      type === 'error' ? 'bg-[#111827] border-[#FB7185]/40 text-[#FB7185]' :
      type === 'warning' ? 'bg-[#111827] border-[#FBBF24]/40 text-[#FBBF24]' :
      'bg-[#111827] border-[#27304A] text-[#F8FAFC]'
    }`;

    const iconName = type === 'success' ? 'check-circle' :
                     type === 'error' ? 'alert-circle' :
                     type === 'warning' ? 'alert-triangle' : 'info';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-5 h-5 flex-shrink-0"></i>
      <span class="flex-1 text-[#F8FAFC]">${message}</span>
      <button class="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors" onclick="this.parentElement.remove()">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    container.appendChild(toast);
    this.initIcons();

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Setup Standard Dark Navbar
  setupNavbar() {
    const user = Auth.getUser();
    const navUserContainer = document.getElementById('nav-user-area');
    if (navUserContainer) {
      if (user) {
        navUserContainer.innerHTML = `
          <div class="flex items-center gap-4">
            <a href="profile.html" class="flex items-center gap-2 text-sm text-[#CBD5E1] hover:text-[#F8FAFC] transition-colors">
              <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}" alt="${user.name}" class="w-8 h-8 rounded-full border border-[#27304A] object-cover" />
              <span class="hidden md:inline font-medium">${user.name}</span>
            </a>
            <button id="nav-logout-btn" class="p-2 text-[#94A3B8] hover:text-[#FB7185] hover:bg-[#151B2D] rounded-lg transition-colors" title="Logout">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </button>
          </div>
        `;
        document.getElementById('nav-logout-btn')?.addEventListener('click', () => Auth.logout());
      } else {
        navUserContainer.innerHTML = `
          <div class="flex items-center gap-3">
            <a href="login.html" class="text-sm text-[#CBD5E1] hover:text-[#F8FAFC] font-medium px-3 py-1.5 rounded-lg transition-colors">Log In</a>
            <a href="register.html" class="text-sm bg-[#6366F1] hover:bg-[#818CF8] text-white font-medium px-4 py-1.5 rounded-lg transition-colors shadow-sm">Sign Up</a>
          </div>
        `;
      }
      this.initIcons();
    }
  },

  // Date Formatter
  formatDate(dateStr) {
    if (!dateStr) return 'No date';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  },

  // Universal Task Details Modal with Inline Status Transition & Comments
  async openTaskModal(taskId, onUpdate = null) {
    let modalOverlay = document.getElementById('task-detail-modal-overlay');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'task-detail-modal-overlay';
      modalOverlay.className = 'fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="bg-[#111827] border border-[#27304A] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        <div class="p-6 border-b border-[#27304A] flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full bg-[#6366F1]"></span>
            <h3 class="text-lg font-bold text-[#F8FAFC]">Task Overview</h3>
          </div>
          <button id="task-modal-close-btn" class="text-[#94A3B8] hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-[#151B2D] transition-colors">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
        <div id="task-modal-body" class="p-6 overflow-y-auto space-y-6">
          <div class="py-12 text-center text-[#94A3B8]">
            <i data-lucide="loader-2" class="w-8 h-8 mx-auto animate-spin text-[#6366F1] mb-2"></i>
            <p class="text-sm">Loading task details...</p>
          </div>
        </div>
      </div>
    `;

    this.initIcons();
    document.getElementById('task-modal-close-btn')?.addEventListener('click', () => {
      modalOverlay.remove();
    });

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.remove();
    });

    try {
      const [taskData, commentsData] = await Promise.all([
        API.get(`/tasks/${taskId}`),
        API.get(`/tasks/${taskId}/comments`)
      ]);

      const task = taskData.task;
      const comments = commentsData.comments || [];
      const user = Auth.getUser();

      this.renderTaskModalContent(task, comments, onUpdate, modalOverlay);
    } catch (err) {
      const body = document.getElementById('task-modal-body');
      if (body) {
        body.innerHTML = `
          <div class="py-8 text-center text-[#FB7185]">
            <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>
            <p class="text-sm font-semibold">${err.message || 'Failed to load task details'}</p>
          </div>
        `;
        this.initIcons();
      }
    }
  },

  renderTaskModalContent(task, comments, onUpdate, modalOverlay) {
    const body = document.getElementById('task-modal-body');
    if (!body) return;

    const user = Auth.getUser();

    body.innerHTML = `
      <!-- Header Info -->
      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#151B2D] text-[#CBD5E1] border border-[#27304A]">
            <i data-lucide="folder" class="w-3 h-3 inline mr-1"></i> ${task.project_name || 'Project'}
          </span>
          <div class="flex items-center gap-2">
            <span id="modal-priority-badge" class="text-xs font-semibold px-2.5 py-1 rounded-full ${
              task.priority === 'High' ? 'badge-high' :
              task.priority === 'Medium' ? 'badge-medium' : 'badge-low'
            }">
              ${task.priority} Priority
            </span>
            <span id="modal-status-badge" class="text-xs font-semibold px-2.5 py-1 rounded-full ${
              task.status === 'Completed' ? 'badge-completed' :
              task.status === 'In Progress' ? 'badge-in-progress' : 'badge-todo'
            }">
              ${task.status}
            </span>
          </div>
        </div>
        <h2 class="text-xl font-bold text-[#F8FAFC] leading-snug">${task.title}</h2>
        <p class="text-sm text-[#94A3B8] leading-relaxed whitespace-pre-wrap bg-[#151B2D]/40 p-3.5 rounded-xl border border-[#27304A]/50">
          ${task.description || 'No description provided.'}
        </p>
      </div>

      <!-- Quick Status Transition Toolbar -->
      <div class="p-4 rounded-xl bg-[#151B2D] border border-[#27304A]">
        <label class="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Change Status</label>
        <div class="grid grid-cols-3 gap-2">
          <button type="button" data-status="Todo" class="status-btn py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
            task.status === 'Todo' ? 'bg-[#27304A] border-[#94A3B8] text-white shadow-sm' : 'border-[#27304A] text-[#94A3B8] hover:bg-[#1B2438] hover:text-[#CBD5E1]'
          }">
            Todo
          </button>
          <button type="button" data-status="In Progress" class="status-btn py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
            task.status === 'In Progress' ? 'bg-[#6366F1]/20 border-[#6366F1] text-[#818CF8] shadow-sm' : 'border-[#27304A] text-[#94A3B8] hover:bg-[#1B2438] hover:text-[#CBD5E1]'
          }">
            In Progress
          </button>
          <button type="button" data-status="Completed" class="status-btn py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
            task.status === 'Completed' ? 'bg-[#34D399]/20 border-[#34D399] text-[#34D399] shadow-sm' : 'border-[#27304A] text-[#94A3B8] hover:bg-[#1B2438] hover:text-[#CBD5E1]'
          }">
            Completed
          </button>
        </div>
      </div>

      <!-- Metadata Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="p-3 rounded-xl bg-[#151B2D] border border-[#27304A] flex items-center justify-between">
          <span class="text-[#94A3B8]">Assignee</span>
          <div class="flex items-center gap-2">
            <img src="${task.assignee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}" class="w-5 h-5 rounded-full border border-[#27304A]" />
            <span class="font-medium text-[#F8FAFC]">${task.assignee_name || 'Unassigned'}</span>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-[#151B2D] border border-[#27304A] flex items-center justify-between">
          <span class="text-[#94A3B8]">Due Date</span>
          <span class="font-medium text-[#CBD5E1]">${this.formatDate(task.due_date)}</span>
        </div>

        <div class="p-3 rounded-xl bg-[#151B2D] border border-[#27304A] flex items-center justify-between">
          <span class="text-[#94A3B8]">Created Date</span>
          <span class="font-medium text-[#CBD5E1]">${this.formatDate(task.created_at)}</span>
        </div>

        <div class="p-3 rounded-xl bg-[#151B2D] border border-[#27304A] flex items-center justify-between">
          <span class="text-[#94A3B8]">Last Updated</span>
          <span class="font-medium text-[#CBD5E1]">${this.formatDate(task.updated_at)}</span>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="pt-4 border-t border-[#27304A] space-y-4">
        <h4 class="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
          <i data-lucide="message-square" class="w-4 h-4 text-[#6366F1]"></i>
          Discussion & Comments (${comments.length})
        </h4>

        <!-- Comments List -->
        <div id="modal-comments-list" class="space-y-3 max-h-60 overflow-y-auto pr-1">
          ${comments.length === 0 ? `
            <div class="py-6 text-center text-xs text-[#94A3B8] border border-dashed border-[#27304A] rounded-xl">
              No comments yet. Start the conversation below.
            </div>
          ` : comments.map(c => `
            <div class="p-3 rounded-xl bg-[#151B2D] border border-[#27304A]/60 flex items-start justify-between gap-3 text-xs group">
              <div class="flex items-start gap-2.5 flex-1">
                <img src="${c.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}" class="w-6 h-6 rounded-full border border-[#27304A] flex-shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-semibold text-[#F8FAFC]">${c.author_name}</span>
                    <span class="text-[10px] text-[#94A3B8]">@${c.author_username} • ${this.formatDate(c.created_at)}</span>
                  </div>
                  <p class="text-[#CBD5E1] leading-relaxed break-words">${c.content}</p>
                </div>
              </div>
              ${c.is_author ? `
                <button data-comment-id="${c.id}" class="delete-comment-btn opacity-60 hover:opacity-100 text-[#FB7185] p-1 rounded transition-opacity" title="Delete comment">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Add Comment Input -->
        <form id="modal-add-comment-form" class="flex gap-2 pt-2">
          <input type="text" id="modal-comment-input" required placeholder="Write a comment or project update..."
            class="flex-1 px-4 py-2.5 bg-[#151B2D] border border-[#27304A] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1] transition-colors" />
          <button type="submit" id="modal-comment-submit-btn" class="px-4 py-2.5 bg-[#6366F1] hover:bg-[#818CF8] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5">
            <i data-lucide="send" class="w-3.5 h-3.5"></i> Send
          </button>
        </form>
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 border-t border-[#27304A] flex items-center justify-between">
        <button id="modal-delete-task-btn" type="button" class="px-3 py-1.5 text-xs text-[#FB7185] hover:bg-[#FB7185]/10 rounded-lg border border-transparent hover:border-[#FB7185]/30 transition-colors flex items-center gap-1">
          <i data-lucide="trash" class="w-3.5 h-3.5"></i> Delete Task
        </button>
        <button id="modal-done-btn" type="button" class="px-4 py-2 bg-[#27304A] hover:bg-[#334155] text-white text-xs font-semibold rounded-xl transition-colors">
          Done
        </button>
      </div>
    `;

    this.initIcons();

    // Done button close
    document.getElementById('modal-done-btn')?.addEventListener('click', () => {
      modalOverlay.remove();
    });

    // Delete Task handler
    document.getElementById('modal-delete-task-btn')?.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this task?')) return;
      try {
        await API.delete(`/tasks/${task.id}`);
        this.showToast('Task deleted successfully', 'success');
        modalOverlay.remove();
        if (typeof onUpdate === 'function') onUpdate();
      } catch (err) {
        this.showToast(err.message || 'Failed to delete task', 'error');
      }
    });

    // Status Transition buttons
    body.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = btn.getAttribute('data-status');
        if (newStatus === task.status) return;

        try {
          const res = await API.put(`/tasks/${task.id}`, { status: newStatus });
          task.status = newStatus;
          task.updated_at = res.task.updated_at;
          this.showToast(`Task marked as ${newStatus}`, 'success');
          
          // Re-render modal state
          const statusBadge = document.getElementById('modal-status-badge');
          if (statusBadge) {
            statusBadge.textContent = newStatus;
            statusBadge.className = `text-xs font-semibold px-2.5 py-1 rounded-full ${
              newStatus === 'Completed' ? 'badge-completed' :
              newStatus === 'In Progress' ? 'badge-in-progress' : 'badge-todo'
            }`;
          }

          body.querySelectorAll('.status-btn').forEach(b => {
            const bStatus = b.getAttribute('data-status');
            b.className = `status-btn py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
              bStatus === newStatus
                ? (newStatus === 'Completed' ? 'bg-[#34D399]/20 border-[#34D399] text-[#34D399] shadow-sm' :
                   newStatus === 'In Progress' ? 'bg-[#6366F1]/20 border-[#6366F1] text-[#818CF8] shadow-sm' :
                   'bg-[#27304A] border-[#94A3B8] text-white shadow-sm')
                : 'border-[#27304A] text-[#94A3B8] hover:bg-[#1B2438] hover:text-[#CBD5E1]'
            }`;
          });

          if (typeof onUpdate === 'function') onUpdate();
        } catch (err) {
          this.showToast(err.message || 'Failed to update task status', 'error');
        }
      });
    });

    // Add Comment Form
    const commentForm = document.getElementById('modal-add-comment-form');
    commentForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('modal-comment-input');
      const submitBtn = document.getElementById('modal-comment-submit-btn');
      const content = (input?.value || '').trim();
      if (!content) return;

      submitBtn.disabled = true;

      try {
        const res = await API.post(`/tasks/${task.id}/comments`, { content });
        this.showToast('Comment posted', 'success');
        input.value = '';

        // Reload comments list
        const updatedCommentsRes = await API.get(`/tasks/${task.id}/comments`);
        this.renderTaskModalContent(task, updatedCommentsRes.comments || [], onUpdate, modalOverlay);
      } catch (err) {
        this.showToast(err.message || 'Failed to post comment', 'error');
      } finally {
        submitBtn.disabled = false;
      }
    });

    // Delete Comment buttons
    body.querySelectorAll('.delete-comment-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const commentId = btn.getAttribute('data-comment-id');
        if (!commentId) return;

        try {
          await API.delete(`/comments/${commentId}`);
          this.showToast('Comment deleted', 'success');
          const updatedCommentsRes = await API.get(`/tasks/${task.id}/comments`);
          this.renderTaskModalContent(task, updatedCommentsRes.comments || [], onUpdate, modalOverlay);
        } catch (err) {
          this.showToast(err.message || 'Failed to delete comment', 'error');
        }
      });
    });
  }
};

window.UI = UI;
