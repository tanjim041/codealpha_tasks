/* ==========================================================================
   Feed Controller & Post Stream (Social Media Platform)
   Developer: Md. Tanjimul Islam
   ========================================================================== */

let currentFeedTab = 'all';
let currentSearchQuery = '';
let currentFeedPage = 1;
let feedHasMore = false;
let isLoadingPosts = false;

// Render dark skeleton loaders for feed
function renderFeedSkeletons(count = 4) {
  const container = document.getElementById('posts-stream');
  if (!container) return;

  container.innerHTML = Array.from({ length: count })
    .map(
      () => `
      <div class="bg-[#111827] rounded-2xl border border-[#27304A] p-5 sm:p-6 mb-4 flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-full skeleton-shimmer flex-shrink-0"></div>
          <div class="flex-1 space-y-1.5">
            <div class="w-32 h-4 skeleton-shimmer"></div>
            <div class="w-20 h-3 skeleton-shimmer"></div>
          </div>
        </div>
        <div class="w-full h-12 skeleton-shimmer my-1"></div>
        <div class="w-full h-44 skeleton-shimmer rounded-xl"></div>
        <div class="flex gap-6 mt-2 pt-3 border-t border-[#1E293B]">
          <div class="w-16 h-5 skeleton-shimmer"></div>
          <div class="w-16 h-5 skeleton-shimmer"></div>
        </div>
      </div>
    `
    )
    .join('');
}

// Load main posts feed
async function loadFeed(reset = true) {
  const container = document.getElementById('posts-stream');
  if (!container || isLoadingPosts) return;

  if (reset) {
    currentFeedPage = 1;
    renderFeedSkeletons(4);
  }

  isLoadingPosts = true;

  try {
    let endpoint = `/posts?page=${currentFeedPage}&limit=10&feed=${currentFeedTab}`;
    if (currentSearchQuery && currentSearchQuery.trim() !== '') {
      endpoint += `&search=${encodeURIComponent(currentSearchQuery.trim())}`;
    }

    const data = await apiRequest(endpoint);
    const posts = data.posts || [];
    const pagination = data.pagination || {};
    feedHasMore = pagination.has_more || false;

    if (reset) {
      if (posts.length === 0) {
        container.innerHTML = `
          <div class="text-center py-16 px-4 bg-[#111827] rounded-2xl border border-[#27304A] animate-fade-in-up">
            <div class="w-14 h-14 rounded-full bg-[#151B2D] border border-[#27304A] text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <h3 class="text-lg font-bold text-[#F8FAFC] mb-1">No Posts Yet</h3>
            <p class="text-xs text-[#94A3B8] max-w-sm mx-auto mb-5">
              ${currentFeedTab === 'following'
                ? 'You are not following anyone with recent posts yet. Switch to "All Posts" or discover creators to follow.'
                : 'Be the first to share your thoughts, ideas, or questions with the community.'}
            </p>
            ${isAuthenticated()
              ? `<a href="create-post.html" class="btn-press inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Create Post
                </a>`
              : `<a href="login.html" class="btn-press inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg">Sign In to Post</a>`}
          </div>
        `;
        renderPaginationControl(false);
        isLoadingPosts = false;
        return;
      }
      container.innerHTML = '';
    }

    const html = posts.map(renderPostCardHtml).join('');
    if (reset) {
      container.innerHTML = html;
    } else {
      container.insertAdjacentHTML('beforeend', html);
    }

    renderPaginationControl(feedHasMore);
  } catch (error) {
    if (reset) {
      container.innerHTML = `
        <div class="text-center py-16 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
          <h3 class="text-base font-bold text-[#F8FAFC] mb-1">Failed to Load Feed</h3>
          <p class="text-xs text-[#94A3B8] mb-4">${escapeHtml(error.message || 'Please check backend server status.')}</p>
          <button class="btn-press px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg" onclick="loadFeed(true)">Retry</button>
        </div>
      `;
    }
    renderPaginationControl(false);
  } finally {
    isLoadingPosts = false;
  }
}

// Render individual post card HTML
function renderPostCardHtml(p) {
  const relativeTime = formatRelativeTime(p.created_at);

  const imageHtml = p.image && p.image.trim() !== ''
    ? `
      <div class="mt-3 rounded-xl overflow-hidden border border-[#27304A] bg-[#0B1020] max-h-96 flex items-center justify-center">
        <img src="${escapeHtml(p.image)}" alt="Post media" class="w-full h-auto max-h-96 object-cover" onerror="handlePostImageError(this)" loading="lazy" />
      </div>
    `
    : '';

  const deleteBtn = p.is_author
    ? `
      <button onclick="handleDeletePost(${p.id}, event)" class="btn-press p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors" title="Delete Post">
        ${Icons.trash()}
      </button>
    `
    : '';

  return `
    <article id="post-card-${p.id}" class="post-card bg-[#111827] rounded-2xl border border-[#27304A] p-5 sm:p-6 mb-4 animate-fade-in-up">
      <!-- Author Header -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <a href="profile.html?u=${encodeURIComponent(p.author_username)}" class="flex items-center gap-3 group">
          <img 
            src="${escapeHtml(p.author_avatar)}" 
            alt="${escapeHtml(p.author_name)}" 
            class="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-[#27304A] group-hover:border-indigo-500 transition-colors" 
            onerror="handleAvatarError(this)"
          />
          <div>
            <h4 class="font-bold text-[#F8FAFC] text-sm group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
              ${escapeHtml(p.author_name)}
            </h4>
            <span class="text-xs text-[#94A3B8]">@${escapeHtml(p.author_username)} &bull; ${relativeTime}</span>
          </div>
        </a>

        <div class="flex items-center gap-1">
          ${deleteBtn}
        </div>
      </div>

      <!-- Post Body -->
      <div class="text-sm sm:text-base text-[#CBD5E1] leading-relaxed break-words whitespace-pre-line">
        ${escapeHtml(p.content)}
      </div>

      <!-- Optional Image -->
      ${imageHtml}

      <!-- Action Bar -->
      <div class="flex items-center gap-6 mt-4 pt-3.5 border-t border-[#1E293B]">
        <!-- Like Button -->
        <button 
          id="btn-like-${p.id}" 
          onclick="handleToggleLike(${p.id}, event)" 
          class="btn-press flex items-center gap-2 text-xs font-semibold ${p.is_liked ? 'text-rose-400' : 'text-[#94A3B8] hover:text-rose-400'} transition-colors"
          title="${p.is_liked ? 'Unlike Post' : 'Like Post'}"
        >
          <span id="like-icon-${p.id}">
            ${Icons.heart(p.is_liked)}
          </span>
          <span id="like-count-${p.id}">${p.like_count}</span>
        </button>

        <!-- Comments Count & Link -->
        <a 
          href="post-details.html?id=${p.id}" 
          class="btn-press flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-indigo-400 transition-colors"
          title="View comments"
        >
          ${Icons.messageCircle()}
          <span>${p.comment_count}</span>
        </a>
      </div>
    </article>
  `;
}

// Like toggle handler
async function handleToggleLike(postId, event) {
  if (event) event.preventDefault();

  if (!isAuthenticated()) {
    showToast('Please log in to like posts.', 'error');
    return;
  }

  const btn = document.getElementById(`btn-like-${postId}`);
  const iconContainer = document.getElementById(`like-icon-${postId}`);
  const countSpan = document.getElementById(`like-count-${postId}`);

  const isCurrentlyLiked = iconContainer && iconContainer.innerHTML.includes('fill-rose-500');

  try {
    const endpoint = `/posts/${postId}/like`;
    const method = isCurrentlyLiked ? 'DELETE' : 'POST';

    const res = await apiRequest(endpoint, { method });

    if (res.success) {
      const isLiked = res.is_liked;
      const count = res.like_count;

      if (iconContainer) {
        iconContainer.innerHTML = Icons.heart(isLiked);
        if (isLiked) {
          iconContainer.classList.add('animate-like-pop');
          setTimeout(() => iconContainer.classList.remove('animate-like-pop'), 300);
        }
      }

      if (countSpan) {
        countSpan.textContent = count;
      }

      if (btn) {
        if (isLiked) {
          btn.classList.add('text-rose-400');
          btn.classList.remove('text-[#94A3B8]');
        } else {
          btn.classList.remove('text-rose-400');
          btn.classList.add('text-[#94A3B8]');
        }
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to update like.', 'error');
  }
}

// Delete post handler
async function handleDeletePost(postId, event) {
  if (event) event.preventDefault();

  if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Post deleted successfully.');
      const card = document.getElementById(`post-card-${postId}`);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(-8px)';
        card.style.transition = 'all 0.25s ease';
        setTimeout(() => card.remove(), 250);
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete post.', 'error');
  }
}

// Load more pagination handler
function renderPaginationControl(show) {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  if (show) {
    container.innerHTML = `
      <div class="text-center pt-2 pb-6">
        <button 
          onclick="handleLoadMorePosts()" 
          class="btn-press px-5 py-2.5 rounded-xl border border-[#27304A] bg-[#151B2D] hover:bg-[#1B2438] text-xs font-semibold text-[#F8FAFC] shadow-sm transition-colors"
        >
          Load More Posts
        </button>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

function handleLoadMorePosts() {
  currentFeedPage++;
  loadFeed(false);
}

// Feed Tab Switcher
function setFeedTab(tab) {
  if (tab === 'following' && !isAuthenticated()) {
    showToast('Please log in to view posts from creators you follow.', 'error');
    window.location.href = 'login.html?redirect=index.html';
    return;
  }

  currentFeedTab = tab;

  const tabAll = document.getElementById('tab-feed-all');
  const tabFollowing = document.getElementById('tab-feed-following');

  const activeCls = 'text-indigo-400 bg-indigo-950/70 border-indigo-700/50';
  const inactiveCls = 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151B2D] border-transparent';

  if (tabAll && tabFollowing) {
    if (tab === 'all') {
      tabAll.className = `btn-press px-4 py-1.5 rounded-lg text-xs font-semibold border ${activeCls}`;
      tabFollowing.className = `btn-press px-4 py-1.5 rounded-lg text-xs font-semibold border ${inactiveCls}`;
    } else {
      tabFollowing.className = `btn-press px-4 py-1.5 rounded-lg text-xs font-semibold border ${activeCls}`;
      tabAll.className = `btn-press px-4 py-1.5 rounded-lg text-xs font-semibold border ${inactiveCls}`;
    }
  }

  loadFeed(true);
}

// Search submission
function handleFeedSearch(event) {
  event.preventDefault();
  const input = document.getElementById('feed-search-input');
  if (input) {
    currentSearchQuery = input.value;
    loadFeed(true);
  }
}

// Inline quick post submission
async function handleQuickPostSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('quick-post-content');
  const imgInput = document.getElementById('quick-post-image');
  const btn = document.getElementById('quick-post-btn');

  if (!input) return;

  const content = input.value.trim();
  const image = imgInput ? imgInput.value.trim() : '';

  if (!content) {
    showToast('Please type something before posting.', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Posting...';
  }

  try {
    const res = await apiRequest('/posts', {
      method: 'POST',
      body: { content, image }
    });

    if (res.success && res.post) {
      showToast('Post published!');
      input.value = '';
      if (imgInput) imgInput.value = '';
      loadFeed(true);
    }
  } catch (err) {
    showToast(err.message || 'Failed to publish post.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Publish Post';
    }
  }
}

// Load sidebar suggestions
async function loadSidebarSuggestions() {
  const container = document.getElementById('sidebar-suggestions');
  if (!container) return;

  try {
    const res = await apiRequest('/users/suggestions');
    const users = res.suggestions || [];

    if (users.length === 0) {
      container.innerHTML = `<p class="text-xs text-[#94A3B8]">No new suggestions right now.</p>`;
      return;
    }

    container.innerHTML = users
      .map(
        (u) => `
        <div class="flex items-center justify-between gap-3 py-2.5">
          <a href="profile.html?u=${encodeURIComponent(u.username)}" class="flex items-center gap-2.5 min-w-0 group">
            <img src="${escapeHtml(u.avatar)}" alt="${escapeHtml(u.name)}" class="w-8 h-8 rounded-full object-cover border border-[#27304A] flex-shrink-0" onerror="handleAvatarError(this)" />
            <div class="min-w-0">
              <h5 class="text-xs font-bold text-[#F8FAFC] truncate group-hover:text-indigo-400 transition-colors">${escapeHtml(u.name)}</h5>
              <span class="text-[11px] text-[#94A3B8] block truncate">@${escapeHtml(u.username)}</span>
            </div>
          </a>
          <button 
            onclick="handleQuickFollow(${u.id}, this)" 
            class="btn-press flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[#27304A] bg-[#151B2D] hover:bg-[#1B2438] text-indigo-300 hover:text-white transition-colors"
          >
            Follow
          </button>
        </div>
      `
      )
      .join('');
  } catch (err) {
    container.innerHTML = '';
  }
}

async function handleQuickFollow(userId, btn) {
  if (!isAuthenticated()) {
    showToast('Please log in to follow creators.', 'error');
    return;
  }

  try {
    const res = await apiRequest(`/users/${userId}/follow`, { method: 'POST' });
    if (res.success) {
      showToast(res.message || 'Followed user!');
      btn.textContent = 'Following';
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  } catch (err) {
    showToast(err.message || 'Failed to follow user.', 'error');
  }
}
