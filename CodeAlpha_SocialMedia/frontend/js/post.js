/* ==========================================================================
   Post Creation & Post Details Controller (Social Media Platform)
   Developer: Md. Tanjimul Islam
   ========================================================================== */

// --- CREATE POST PAGE CONTROLLER ---
function initCreatePostPage() {
  if (!requireAuth('create-post.html')) return;

  const contentInput = document.getElementById('post-content-input');
  const charCounter = document.getElementById('char-count');
  const imageInput = document.getElementById('post-image-input');
  const previewBox = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview');

  if (contentInput && charCounter) {
    contentInput.addEventListener('input', () => {
      const len = contentInput.value.length;
      charCounter.textContent = `${len}/2000`;
      if (len > 1900) {
        charCounter.classList.add('text-rose-400');
        charCounter.classList.remove('text-[#94A3B8]');
      } else {
        charCounter.classList.remove('text-rose-400');
        charCounter.classList.add('text-[#94A3B8]');
      }
    });
  }

  if (imageInput && previewBox && previewImg) {
    imageInput.addEventListener('input', () => {
      const url = imageInput.value.trim();
      if (url) {
        previewImg.src = url;
        previewBox.style.display = 'block';
      } else {
        previewBox.style.display = 'none';
      }
    });
  }
}

async function handleCreatePostSubmit(event) {
  event.preventDefault();

  const contentInput = document.getElementById('post-content-input');
  const imageInput = document.getElementById('post-image-input');
  const btn = document.getElementById('submit-post-btn');
  const alertBox = document.getElementById('post-alert');

  if (!contentInput) return;

  const content = contentInput.value.trim();
  const image = imageInput ? imageInput.value.trim() : '';

  if (alertBox) alertBox.style.display = 'none';

  if (!content) {
    if (alertBox) {
      alertBox.textContent = 'Please enter post content.';
      alertBox.style.display = 'block';
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Publishing...';
  }

  try {
    const res = await apiRequest('/posts', {
      method: 'POST',
      body: { content, image }
    });

    if (res.success && res.post) {
      showToast('Post published successfully!');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 400);
    }
  } catch (err) {
    if (alertBox) {
      alertBox.textContent = err.message || 'Failed to publish post.';
      alertBox.style.display = 'block';
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Publish Post';
    }
  }
}

// --- POST DETAILS & COMMENTS CONTROLLER ---
async function loadPostDetailsPage() {
  const container = document.getElementById('post-details-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  if (!postId) {
    container.innerHTML = `
      <div class="text-center py-20 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <h3 class="text-lg font-bold text-[#F8FAFC] mb-2">Post Not Specified</h3>
        <p class="text-xs text-[#94A3B8] mb-5">Please select a valid post from the feed.</p>
        <a href="index.html" class="btn-press inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg">Back to Feed</a>
      </div>
    `;
    return;
  }

  // Shimmer skeleton loader
  container.innerHTML = `
    <div class="bg-[#111827] rounded-2xl border border-[#27304A] p-6 mb-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-full skeleton-shimmer"></div>
        <div class="space-y-2">
          <div class="w-32 h-4 skeleton-shimmer"></div>
          <div class="w-20 h-3 skeleton-shimmer"></div>
        </div>
      </div>
      <div class="w-full h-16 skeleton-shimmer mb-4"></div>
      <div class="w-full h-48 skeleton-shimmer rounded-xl"></div>
    </div>
  `;

  try {
    const data = await apiRequest(`/posts/${postId}`);
    const post = data.post;

    renderPostDetailsCard(post);
    loadComments(postId);
  } catch (err) {
    container.innerHTML = `
      <div class="text-center py-16 px-4 bg-[#111827] rounded-2xl border border-[#27304A]">
        <h3 class="text-base font-bold text-[#F8FAFC] mb-1">Post Not Found</h3>
        <p class="text-xs text-[#94A3B8] mb-4">${escapeHtml(err.message || 'This post may have been deleted.')}</p>
        <a href="index.html" class="btn-press inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg">Back to Feed</a>
      </div>
    `;
  }
}

function renderPostDetailsCard(p) {
  const container = document.getElementById('post-details-container');
  if (!container) return;

  const relativeTime = formatRelativeTime(p.created_at);

  const imageHtml = p.image && p.image.trim() !== ''
    ? `
      <div class="mt-4 rounded-xl overflow-hidden border border-[#27304A] bg-[#0B1020] flex items-center justify-center">
        <img src="${escapeHtml(p.image)}" alt="Post image" class="w-full h-auto max-h-[500px] object-cover" onerror="handlePostImageError(this)" />
      </div>
    `
    : '';

  const deleteBtn = p.is_author
    ? `
      <button onclick="handleDeletePostDetails(${p.id})" class="btn-press p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors" title="Delete Post">
        ${Icons.trash()}
      </button>
    `
    : '';

  container.innerHTML = `
    <article class="bg-[#111827] rounded-2xl border border-[#27304A] p-6 sm:p-8 mb-6 shadow-md animate-fade-in-up">
      <!-- Author header -->
      <div class="flex items-center justify-between gap-3 mb-4">
        <a href="profile.html?u=${encodeURIComponent(p.author_username)}" class="flex items-center gap-3.5 group">
          <img 
            src="${escapeHtml(p.author_avatar)}" 
            alt="${escapeHtml(p.author_name)}" 
            class="w-12 h-12 rounded-full object-cover border border-[#27304A] group-hover:border-indigo-500 transition-colors"
            onerror="handleAvatarError(this)"
          />
          <div>
            <h3 class="font-extrabold text-[#F8FAFC] text-base group-hover:text-indigo-400 transition-colors">
              ${escapeHtml(p.author_name)}
            </h3>
            <span class="text-xs text-[#94A3B8]">@${escapeHtml(p.author_username)} &bull; ${relativeTime}</span>
          </div>
        </a>

        <div>
          ${deleteBtn}
        </div>
      </div>

      <!-- Content -->
      <div class="text-base sm:text-lg text-[#F8FAFC] leading-relaxed break-words whitespace-pre-line mb-4">
        ${escapeHtml(p.content)}
      </div>

      <!-- Image -->
      ${imageHtml}

      <!-- Action Bar -->
      <div class="flex items-center gap-6 mt-6 pt-4 border-t border-[#1E293B]">
        <button 
          id="btn-detail-like" 
          onclick="handleDetailToggleLike(${p.id})" 
          class="btn-press flex items-center gap-2 text-sm font-semibold ${p.is_liked ? 'text-rose-400' : 'text-[#94A3B8] hover:text-rose-400'} transition-colors"
        >
          <span id="detail-like-icon">
            ${Icons.heart(p.is_liked)}
          </span>
          <span id="detail-like-count">${p.like_count}</span>
        </button>

        <div class="flex items-center gap-2 text-sm font-semibold text-[#94A3B8]">
          ${Icons.messageCircle()}
          <span id="detail-comment-count">${p.comment_count}</span>
        </div>
      </div>
    </article>
  `;
}

async function handleDetailToggleLike(postId) {
  if (!isAuthenticated()) {
    showToast('Please log in to like posts.', 'error');
    return;
  }

  const iconContainer = document.getElementById('detail-like-icon');
  const countSpan = document.getElementById('detail-like-count');
  const btn = document.getElementById('btn-detail-like');

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

      if (countSpan) countSpan.textContent = count;

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

async function handleDeletePostDetails(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    const res = await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Post deleted.');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 350);
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete post.', 'error');
  }
}

// Comments loader & manager
async function loadComments(postId) {
  const list = document.getElementById('comments-list');
  if (!list) return;

  try {
    const data = await apiRequest(`/posts/${postId}/comments`);
    const comments = data.comments || [];

    const countHeader = document.getElementById('comments-heading-count');
    if (countHeader) countHeader.textContent = comments.length;

    if (comments.length === 0) {
      list.innerHTML = `
        <div class="text-center py-10 px-4 bg-[#111827] rounded-xl border border-[#27304A]">
          <p class="text-xs text-[#94A3B8]">No comments yet. Be the first to share your reaction!</p>
        </div>
      `;
      return;
    }

    list.innerHTML = comments
      .map((c) => {
        const relativeTime = formatRelativeTime(c.created_at);
        const deleteBtn = c.is_author
          ? `
            <button onclick="handleDeleteComment(${c.id}, ${postId})" class="btn-press p-1 text-slate-500 hover:text-rose-400 transition-colors" title="Delete Comment">
              ${Icons.trash()}
            </button>
          `
          : '';

        return `
          <div id="comment-item-${c.id}" class="bg-[#111827] rounded-xl border border-[#27304A] p-4 flex gap-3.5 transition-all">
            <a href="profile.html?u=${encodeURIComponent(c.author_username)}" class="flex-shrink-0">
              <img src="${escapeHtml(c.author_avatar)}" alt="${escapeHtml(c.author_name)}" class="w-9 h-9 rounded-full object-cover border border-[#27304A]" onerror="handleAvatarError(this)" />
            </a>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-1">
                <a href="profile.html?u=${encodeURIComponent(c.author_username)}" class="font-bold text-xs text-[#F8FAFC] hover:text-indigo-400 transition-colors truncate">
                  ${escapeHtml(c.author_name)} <span class="font-normal text-[#94A3B8]">@${escapeHtml(c.author_username)}</span>
                </a>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-[#94A3B8] whitespace-nowrap">${relativeTime}</span>
                  ${deleteBtn}
                </div>
              </div>
              <p class="text-xs sm:text-sm text-[#CBD5E1] break-words whitespace-pre-line leading-relaxed">
                ${escapeHtml(c.content)}
              </p>
            </div>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    list.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">Failed to load comments.</p>`;
  }
}

async function handleAddCommentSubmit(event) {
  event.preventDefault();

  if (!isAuthenticated()) {
    showToast('Please log in to post a comment.', 'error');
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  const input = document.getElementById('comment-input');
  const btn = document.getElementById('comment-submit-btn');

  if (!postId || !input) return;

  const content = input.value.trim();
  if (!content) {
    showToast('Comment cannot be empty.', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Posting...';
  }

  try {
    const res = await apiRequest(`/posts/${postId}/comments`, {
      method: 'POST',
      body: { content }
    });

    if (res.success) {
      showToast('Comment added!');
      input.value = '';
      loadComments(postId);

      const countSpan = document.getElementById('detail-comment-count');
      if (countSpan && res.comment_count !== undefined) {
        countSpan.textContent = res.comment_count;
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to post comment.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Comment';
    }
  }
}

async function handleDeleteComment(commentId, postId) {
  if (!confirm('Delete this comment?')) return;

  try {
    const res = await apiRequest(`/comments/${commentId}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Comment deleted.');
      const item = document.getElementById(`comment-item-${commentId}`);
      if (item) {
        item.style.opacity = '0';
        setTimeout(() => {
          loadComments(postId);
        }, 200);
      }
      const countSpan = document.getElementById('detail-comment-count');
      if (countSpan && res.comment_count !== undefined) {
        countSpan.textContent = res.comment_count;
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete comment.', 'error');
  }
}
