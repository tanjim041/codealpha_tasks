/**
 * Projects Module
 * Comprehensive project catalog, search, status filtering,
 * visual progress indicators, and interactive project cards.
 * Author: Md. Tanjimul Islam
 */

const Projects = {
  allProjects: [],

  async init() {
    Auth.requireAuth();
    UI.setupNavbar();

    await this.loadProjects();
    this.setupEventListeners();
  },

  async loadProjects() {
    const listContainer = document.getElementById('projects-grid');
    if (!listContainer) return;

    listContainer.innerHTML = `
      <div class="col-span-full py-16 text-center text-[#94A3B8]">
        <i data-lucide="loader-2" class="w-8 h-8 mx-auto animate-spin text-[#6366F1] mb-2"></i>
        <p class="text-xs font-medium">Loading project workspaces...</p>
      </div>
    `;
    UI.initIcons();

    try {
      const data = await API.get('/projects');
      this.allProjects = data.projects || [];
      this.renderProjects(this.allProjects);
    } catch (err) {
      listContainer.innerHTML = `
        <div class="col-span-full py-12 text-center text-[#FB7185]">
          <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>
          <p class="text-xs font-semibold">Failed to load projects. Please refresh the page.</p>
        </div>
      `;
      UI.initIcons();
    }
  },

  renderProjects(projects) {
    const listContainer = document.getElementById('projects-grid');
    if (!listContainer) return;

    if (projects.length === 0) {
      listContainer.innerHTML = `
        <div class="col-span-full py-16 text-center border border-dashed border-[#27304A] rounded-2xl bg-[#111827]/40">
          <i data-lucide="folder-plus" class="w-10 h-10 text-[#94A3B8] mx-auto mb-3"></i>
          <h3 class="text-base font-semibold text-[#F8FAFC]">No projects match your filter</h3>
          <p class="text-xs text-[#94A3B8] mt-1 max-w-sm mx-auto">Create a new workspace to organize deliverables and team milestones.</p>
          <a href="create-project.html" class="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-[#6366F1] hover:bg-[#818CF8] text-white text-xs font-semibold rounded-xl transition-all shadow-sm">
            <i data-lucide="plus" class="w-4 h-4"></i> Create Project
          </a>
        </div>
      `;
      UI.initIcons();
      return;
    }

    listContainer.innerHTML = projects.map(p => {
      const statusBadge = p.status === 'Active' ? 'badge-in-progress' :
                          p.status === 'Completed' ? 'badge-completed' : 'badge-low';
      const progress = p.progress_percentage || 0;

      return `
        <div class="bg-[#111827] border border-[#27304A] hover:border-[#6366F1]/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 group flex flex-col justify-between">
          <div>
            <!-- Header Badges -->
            <div class="flex items-start justify-between gap-3 mb-3">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusBadge}">
                ${p.status}
              </span>
              <span class="text-xs text-[#94A3B8] flex items-center gap-1 bg-[#151B2D] px-2 py-0.5 rounded-md border border-[#27304A]">
                <i data-lucide="users" class="w-3 h-3 text-[#6366F1]"></i> ${p.total_members_count || 1}
              </span>
            </div>

            <!-- Title & Description -->
            <h3 class="text-base font-bold text-[#F8FAFC] group-hover:text-[#818CF8] transition-colors mb-2">
              <a href="project-details.html?id=${p.id}">${p.name}</a>
            </h3>
            <p class="text-xs text-[#94A3B8] line-clamp-2 mb-4 leading-relaxed">
              ${p.description || 'No description provided.'}
            </p>

            <!-- Deliverables Progress Bar -->
            <div class="mb-4 bg-[#151B2D] p-3 rounded-xl border border-[#27304A]/60">
              <div class="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1.5">
                <span>Progress</span>
                <span class="font-bold text-[#34D399]">${progress}%</span>
              </div>
              <div class="w-full bg-[#111827] h-1.5 rounded-full overflow-hidden">
                <div class="bg-gradient-to-r from-[#6366F1] to-[#34D399] h-full rounded-full" style="width: ${progress}%"></div>
              </div>
              <p class="text-[10px] text-[#94A3B8] mt-1.5 text-right">${p.completed_tasks || 0} of ${p.total_tasks || 0} tasks completed</p>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="pt-4 border-t border-[#27304A]/60 flex items-center justify-between text-xs text-[#94A3B8]">
            <span class="flex items-center gap-1">
              <i data-lucide="user" class="w-3 h-3 text-[#6366F1]"></i> ${p.owner_name}
            </span>
            <a href="project-details.html?id=${p.id}" class="inline-flex items-center gap-1 text-[#6366F1] hover:text-[#818CF8] font-semibold transition-colors">
              Workspace <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </a>
          </div>
        </div>
      `;
    }).join('');

    UI.initIcons();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('project-search');
    const statusFilter = document.getElementById('project-status-filter');

    const filterHandler = () => {
      const query = (searchInput?.value || '').toLowerCase().trim();
      const status = statusFilter?.value || 'All';

      const filtered = this.allProjects.filter(p => {
        const matchesSearch = !query || 
          p.name.toLowerCase().includes(query) || 
          (p.description && p.description.toLowerCase().includes(query)) ||
          (p.owner_name && p.owner_name.toLowerCase().includes(query));
        const matchesStatus = status === 'All' || p.status === status;
        return matchesSearch && matchesStatus;
      });

      this.renderProjects(filtered);
    };

    searchInput?.addEventListener('input', filterHandler);
    statusFilter?.addEventListener('change', filterHandler);
  }
};

window.Projects = Projects;
