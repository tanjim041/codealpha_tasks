/* ==========================================================================
   User Profile Controller (Social Media Platform)
   Developer: Md. Tanjimul Islam
   ========================================================================== */

let activeProfileUser = null;
let currentProfileTab = 'posts';

async function loadProfilePage() {
  const container = document.getElementById('profile-header-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  let username = urlParams.get('u');

  // If no username provided in URL, fallback to authenticated user
  if (!username) {
    const me = getUser();
    if (me && me.username) {
      username = me.username;
    } else {
      container.innerHTML = `
        <div class="text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
          <h3 class="text-base font-bold text-[#F8FAFC] mb-2">Profile Not Specified</h3>
          <p class="text-xs text-[#94A3B8] mb-5">Please sign in or select a user to view their profile.</p>
          <a href="login.html" class="btn-press inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg">Sign In</a>
        </div>
      `;
      return;
    }
  }

  // Shimmer skeleton
  container.innerHTML = `
    <div class="bg-[#111827] rounded-2xl border border-[#27304A] p-6 sm:p-8 mb-6">
      <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div class="w-24 h-24 rounded-full skeleton-shimmer flex-shrink-0"></div>
        <div class="flex-1 space-y-3 text-center sm:text-left w-full">
          <div class="w-44 h-6 skeleton-shimmer mx-auto sm:mx-0"></div>
          <div class="w-28 h-4 skeleton-shimmer mx-auto sm:mx-0"></div>
          <div class="w-full h-12 skeleton-shimmer"></div>
          <div class="flex justify-center sm:justify-start gap-8 pt-2">
            <div class="w-16 h-8 skeleton-shimmer"></div>
            <div class="w-16 h-8 skeleton-shimmer"></div>
            <div class="w-16 h-8 skeleton-shimmer"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const data = await apiRequest(`/users/${encodeURIComponent(username)}`);
    activeProfileUser = data.user;

    renderProfileHeader(activeProfileUser);
    loadProfilePosts(activeProfileUser.username);
  } catch (err) {
    container.innerHTML = `
      <div class="text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <h3 class="text-base font-bold text-[#F8FAFC] mb-1">User Not Found</h3>
        <p class="text-xs text-[#94A3B8] mb-5">${escapeHtml(err.message || 'The requested user profile does not exist.')}</p>
        <a href="index.html" class="btn-press inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg">Back to Feed</a>
      </div>
    `;
  }
}

function renderProfileHeader(u) {
  const container = document.getElementById('profile-header-container');
  if (!container) return;

  const joinedDate = new Date(u.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });

  let actionBtnHtml = '';
  if (u.is_self) {
    actionBtnHtml = `
      <button onclick="openEditProfileModal()" class="btn-press inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#27304A] bg-[#151B2D] hover:bg-[#1B2438] text-xs font-semibold text-[#F8FAFC] shadow-sm transition-colors">
        ${Icons.edit()}
        <span>Edit Profile</span>
      </button>
    `;
  } else {
    actionBtnHtml = `
      <button 
        id="profile-follow-btn" 
        onclick="handleProfileFollowToggle(${u.id})" 
        class="btn-press inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${u.is_following ? 'bg-[#151B2D] border border-[#27304A] text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/60' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}"
      >
        ${u.is_following ? Icons.userCheck() : Icons.userPlus()}
        <span>${u.is_following ? 'Following' : 'Follow'}</span>
      </button>
    `;
  }

  container.innerHTML = `
    <div class="bg-[#111827] rounded-2xl border border-[#27304A] p-6 sm:p-8 mb-6 shadow-md animate-fade-in-up">
      <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <!-- Avatar -->
        <img 
          src="${escapeHtml(u.avatar)}" 
          alt="${escapeHtml(u.name)}" 
          class="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-[#27304A] shadow-md flex-shrink-0"
          onerror="handleAvatarError(this)" 
        />

        <!-- Info -->
        <div class="flex-1 text-center sm:text-left">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <h1 class="text-xl sm:text-2xl font-black text-[#F8FAFC] tracking-tight">
                ${escapeHtml(u.name)}
              </h1>
              <span class="text-xs text-indigo-400 font-medium block mt-0.5">@${escapeHtml(u.username)}</span>
            </div>
            <div>
              ${actionBtnHtml}
            </div>
          </div>

          <!-- Bio -->
          <p class="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed max-w-2xl mb-4 mt-2">
            ${u.bio && u.bio.trim() !== '' ? escapeHtml(u.bio) : '<span class="text-[#94A3B8] italic">No bio written yet.</span>'}
          </p>

          <!-- Meta stats & joined date -->
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-6 pt-3 border-t border-[#1E293B] text-xs">
            <div>
              <span class="font-bold text-[#F8FAFC]">${u.post_count}</span>
              <span class="text-[#94A3B8] ml-1">Posts</span>
            </div>
            <div>
              <span id="profile-follower-count" class="font-bold text-[#F8FAFC]">${u.follower_count}</span>
              <span class="text-[#94A3B8] ml-1">Followers</span>
            </div>
            <div>
              <span class="font-bold text-[#F8FAFC]">${u.following_count}</span>
              <span class="text-[#94A3B8] ml-1">Following</span>
            </div>
            <div class="text-[#94A3B8] hidden md:block">
              Joined ${joinedDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Follow / Unfollow from Profile
async function handleProfileFollowToggle(targetUserId) {
  if (!isAuthenticated()) {
    showToast('Please log in to follow creators.', 'error');
    window.location.href = 'login.html';
    return;
  }

  const btn = document.getElementById('profile-follow-btn');
  const countSpan = document.getElementById('profile-follower-count');
  const isFollowing = btn && btn.textContent.includes('Following');

  try {
    const endpoint = `/users/${targetUserId}/${isFollowing ? 'unfollow' : 'follow'}`;
    const res = await apiRequest(endpoint, { method: 'POST' });

    if (res.success) {
      showToast(res.message);
      if (countSpan && res.follower_count !== undefined) {
        countSpan.textContent = res.follower_count;
      }

      if (btn) {
        if (res.is_following) {
          btn.className = 'btn-press inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all bg-[#151B2D] border border-[#27304A] text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/60';
          btn.innerHTML = `${Icons.userCheck()} <span>Following</span>`;
        } else {
          btn.className = 'btn-press inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all bg-indigo-600 hover:bg-indigo-500 text-white';
          btn.innerHTML = `${Icons.userPlus()} <span>Follow</span>`;
        }
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to update follow status.', 'error');
  }
}

// Load user's authored posts
async function loadProfilePosts(username) {
  const container = document.getElementById('profile-posts-stream');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="h-32 bg-[#111827] rounded-2xl border border-[#27304A] skeleton-shimmer"></div>
      <div class="h-32 bg-[#111827] rounded-2xl border border-[#27304A] skeleton-shimmer"></div>
    </div>
  `;

  try {
    const data = await apiRequest(`/posts?user=${encodeURIComponent(username)}&limit=50`);
    const posts = data.posts || [];

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
          <p class="text-xs text-[#94A3B8]">@${escapeHtml(username)} has not published any posts yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = posts.map(renderPostCardHtml).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">Failed to load posts.</p>`;
  }
}

// Edit Profile Modal
function openEditProfileModal() {
  if (!activeProfileUser) return;

  let modal = document.getElementById('edit-profile-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edit-profile-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in-up';
    modal.innerHTML = `
      <div class="bg-[#111827] rounded-2xl border border-[#27304A] w-full max-w-md p-6 sm:p-8 shadow-2xl">
        <div class="flex items-center justify-between pb-4 border-b border-[#1E293B] mb-5">
          <h3 class="text-lg font-bold text-[#F8FAFC]">Edit Profile</h3>
          <button onclick="closeEditProfileModal()" class="text-[#94A3B8] hover:text-white">&times;</button>
        </div>
        <form onsubmit="handleSaveProfile(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1">Full Name</label>
            <input type="text" id="edit-name" class="w-full px-3.5 py-2.5 rounded-lg border border-[#27304A] bg-[#0B1020] text-sm text-[#F8FAFC] outline-none focus:border-indigo-500" required />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1">Bio (max 300 chars)</label>
            <textarea id="edit-bio" rows="3" class="w-full px-3.5 py-2 rounded-lg border border-[#27304A] bg-[#0B1020] text-sm text-[#F8FAFC] outline-none focus:border-indigo-500" maxlength="300"></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1">Avatar Image URL</label>
            <input type="url" id="edit-avatar" class="w-full px-3.5 py-2.5 rounded-lg border border-[#27304A] bg-[#0B1020] text-sm text-[#F8FAFC] outline-none focus:border-indigo-500" placeholder="https://..." />
          </div>
          <div class="flex justify-end gap-2.5 pt-4 border-t border-[#1E293B]">
            <button type="button" onclick="closeEditProfileModal()" class="btn-press px-4 py-2 rounded-lg border border-[#27304A] text-xs font-semibold text-slate-300 hover:bg-[#151B2D]">Cancel</button>
            <button type="submit" id="save-profile-btn" class="btn-press px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white">Save Changes</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('edit-name').value = activeProfileUser.name || '';
  document.getElementById('edit-bio').value = activeProfileUser.bio || '';
  document.getElementById('edit-avatar').value = activeProfileUser.avatar || '';
  modal.style.display = 'flex';
}

function closeEditProfileModal() {
  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.style.display = 'none';
}

async function handleSaveProfile(event) {
  event.preventDefault();
  const name = document.getElementById('edit-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const avatar = document.getElementById('edit-avatar').value.trim();
  const btn = document.getElementById('save-profile-btn');

  if (!name) {
    showToast('Name cannot be empty.', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }

  try {
    const res = await apiRequest('/users/profile', {
      method: 'PUT',
      body: { name, bio, avatar }
    });

    if (res.success && res.user) {
      showToast('Profile updated!');
      saveAuth(getToken(), res.user);
      closeEditProfileModal();
      loadProfilePage();
    }
  } catch (err) {
    showToast(err.message || 'Failed to update profile.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  }
}
