import { pfusch, html, css, script } from 'https://matthiaskainer.github.io/pfusch/pfusch.min.js';

// ============================================
// FEED-POST Component
// Progressively enhanced post form
// ============================================
pfusch('feed-post', { loading: false, charCount: 0 }, (state, trigger, { children }) => [
  css`
    :host {
      display: block;
      margin-bottom: 20px;
    }
    .post-form-wrapper {
      transition: opacity 0.2s;
    }
    .post-form-wrapper.loading {
      opacity: 0.6;
      pointer-events: none;
    }
    .char-count {
      text-align: right;
      font-size: 0.85rem;
      color: #8899a6;
      margin-top: 4px;
    }
    .char-count.warning {
      color: #ffad1f;
    }
    .char-count.error {
      color: #e0245e;
    }
    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #8899a6;
      font-size: 0.9rem;
      margin-top: 8px;
    }
  `,
  script(function() {
    const [form] = this.component.lightDOMChildren.filter(c => c.tagName === 'FORM');
    if (!form) return;

    const textarea = form.querySelector?.('textarea[name="content"]') || 
                     Array.from(form.childNodes || []).find(c => c.tagName === 'TEXTAREA' && c.getAttribute?.('name') === 'content');
    
    if (textarea) {
      const updateCount = () => {
        const len = (textarea.value || '').length;
        this.state.charCount = len;
      };
      
      textarea.addEventListener('input', updateCount);
      textarea.addEventListener('keyup', updateCount);
      textarea.addEventListener('click', updateCount);
      updateCount();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.state.loading) return;

      this.state.loading = true;
      const formData = new FormData(form);
      const body = Object.fromEntries(formData);

      try {
        const response = await fetch(form.action || '/api/posts/create', {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' }
        });
        const post = await response.json();
        
        window.dispatchEvent(new CustomEvent('feed-post.created', {
          detail: post,
          bubbles: true
        }));
        
        form.reset();
        this.state.charCount = 0;
      } catch (err) {
        console.error('Failed to create post:', err);
      } finally {
        this.state.loading = false;
      }
    });
  }),
  html.div({ class: state.loading ? 'post-form-wrapper loading' : 'post-form-wrapper' },
    html.slot()
  ),
  html.div({ 
    class: `char-count ${state.charCount > 260 ? 'warning' : ''} ${state.charCount > 280 ? 'error' : ''}`
  }, `${state.charCount}/280`),
  state.loading ? html.div({ class: 'loading-indicator' }, '📤 Posting...') : null
]);

// ============================================
// FEED-ITEM Component
// Single post display with interactions
// ============================================
pfusch('feed-item', {
  postId: null,
  content: '',
  userId: null,
  userName: 'Loading...',
  userHandle: '',
  likes: 0,
  reshares: 0,
  liked: false,
  reshared: false,
  createdAt: ''
}, (state, trigger) => [
  css`
    :host {
      display: block;
    }
    .post-card {
      background: #192734;
      border: 1px solid #38444d;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .post-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .post-author {
      font-weight: bold;
    }
    .post-handle {
      color: #8899a6;
      font-weight: normal;
      margin-left: 4px;
    }
    .post-time {
      color: #8899a6;
      font-size: 0.85rem;
    }
    .post-content {
      line-height: 1.5;
      margin-bottom: 12px;
      white-space: pre-wrap;
    }
    .post-actions {
      display: flex;
      gap: 24px;
    }
    .action-btn {
      background: none;
      border: none;
      color: #8899a6;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .action-btn:hover {
      background: rgba(29, 161, 242, 0.1);
    }
    .like-btn:hover, .like-btn.liked {
      color: #e0245e;
    }
    .reshare-btn:hover, .reshare-btn.reshared {
      color: #17bf63;
    }
    .hashtag {
      color: #1da1f2;
      cursor: pointer;
    }
    .hashtag:hover {
      text-decoration: underline;
    }
  `,
  script(async function() {
    if (this.state.userId && this.state.userName === 'Loading...') {
      try {
        const user = await fetch(`/api/users/${this.state.userId}`).then(r => r.json());
        this.state.userName = user.name;
        this.state.userHandle = user.handle;
      } catch (err) {
        this.state.userName = 'Unknown User';
      }
    }
  }),
  html.article({ class: 'post-card' },
    html.div({ class: 'post-header' },
      html.div(
        html.span({ class: 'post-author' }, state.userName),
        html.span({ class: 'post-handle' }, state.userHandle)
      ),
      html.span({ class: 'post-time' }, formatTime(state.createdAt))
    ),
    html.div({ class: 'post-content' },
      ...parseContentWithHashtags(state.content)
    ),
    html.div({ class: 'post-actions' },
      // Like button with form fallback
      html.form({ 
        action: `/api/posts/${state.postId}/like`, 
        method: 'POST',
        style: 'display: inline'
      },
        html.button({
          type: 'submit',
          class: `action-btn like-btn ${state.liked ? 'liked' : ''}`,
          click: async (e) => {
            e.preventDefault();
            try {
              const response = await fetch(`/api/posts/${state.postId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              const data = await response.json();
              state.likes = data.likes;
              state.liked = data.liked;
            } catch (err) {
              console.error('Failed to like:', err);
            }
          }
        }, 
          '❤️ ',
          html.span({ class: 'like-count' }, String(state.likes))
        )
      ),
      // Reshare button with form fallback
      html.form({ 
        action: `/api/posts/${state.postId}/reshare`, 
        method: 'POST',
        style: 'display: inline'
      },
        html.button({
          type: 'submit',
          class: `action-btn reshare-btn ${state.reshared ? 'reshared' : ''}`,
          click: async (e) => {
            e.preventDefault();
            try {
              const response = await fetch(`/api/posts/${state.postId}/reshare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              const data = await response.json();
              state.reshares = data.reshares;
              state.reshared = data.reshared;
            } catch (err) {
              console.error('Failed to reshare:', err);
            }
          }
        },
          '🔄 ',
          html.span({ class: 'reshare-count' }, String(state.reshares))
        )
      )
    )
  )
]);

// Yea I know this could be done as component, and then I wouldn't had
// to do the custom event but whatever
function parseContentWithHashtags(content) {
  if (!content) return [''];
  const parts = content.split(/(#\w+)/g);
  return parts.map((part) => {
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return html.a({
        class: 'hashtag',
        'data-tag': tag,
        href: '/?filter=' + encodeURIComponent(tag),
        click: (e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('hash-tag.clicked', {
            detail: { tag },
            bubbles: true
          }));
        }
      }, part);
    }
    return part;
  });
}

// Helper: Format timestamp
function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

// ============================================
// FEED-LIST Component
// Manages the list of posts, filtering, and updates
// ============================================
const filterFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('filter');
};
pfusch('feed-list', { 
  posts: [], 
  filterTag: filterFromQuery(),
  loading: true 
}, (state, trigger) => [
  css`
    :host {
      display: block;
    }
    .feed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .feed-title {
      font-size: 1.25rem;
      font-weight: bold;
      margin: 0;
    }
    .filter-bar {
      background: #192734;
      border: 1px solid #38444d;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .filter-text {
      color: #8899a6;
    }
    .filter-tag {
      color: #1da1f2;
      font-weight: bold;
    }
    .clear-filter {
      background: transparent;
      border: 1px solid #1da1f2;
      color: #1da1f2;
      padding: 6px 12px;
      border-radius: 16px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .clear-filter:hover {
      background: rgba(29, 161, 242, 0.1);
    }
    .loading-state {
      text-align: center;
      padding: 40px;
      color: #8899a6;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #8899a6;
    }
  `,
  script(async function() {
    const loadPosts = async (hashtag = null) => {
      this.state.loading = true;
      try {
        const url = hashtag ? `/api/posts?hashtag=${hashtag}` : '/api/posts';
        const posts = await fetch(url).then(r => r.json());
        this.state.posts = posts;
      } catch (err) {
        console.error('Failed to load posts:', err);
        this.state.posts = [];
      } finally {
        this.state.loading = false;
      }
    };

    await loadPosts(this.state.filterTag);

    window.addEventListener('feed-post.created', (e) => {
      const newPost = e.detail;
      if (!this.state.filterTag || (newPost.content && newPost.content.includes(`#${this.state.filterTag}`))) {
        this.state.posts = [newPost, ...this.state.posts];
      }
    });

    window.addEventListener('hash-tag.clicked', async (e) => {
      const tag = e.detail?.tag;
      if (tag) {
        this.state.filterTag = tag;
        await loadPosts(tag);
      }
    });

    // Store loadPosts for clear filter button
    this.component._loadPosts = loadPosts;
  }),
  html.div({ class: 'feed-header' },
    html.h2({ class: 'feed-title' }, state.filterTag ? 'Filtered Posts' : 'Latest Posts')
  ),
  // Filter bar (only when filtering)
  state.filterTag ? html.div({ class: 'filter-bar' },
    html.span({ class: 'filter-text' },
      'Showing posts with ',
      html.span({ class: 'filter-tag' }, `#${state.filterTag}`)
    ),
    html.form({ action: '/', method: 'GET' },
      html.button({
        type: 'submit',
        class: 'clear-filter',
        click: async (e) => {
          e.preventDefault();
          state.filterTag = null;
          const loadPosts = e.target.closest('feed-list')?._loadPosts;
          if (loadPosts) {
            await loadPosts();
          } else {
            state.posts = await fetch('/api/posts').then(r => r.json());
          }
        }
      }, '✕ Clear Filter')
    )
  ) : null,
  // Loading state
  state.loading ? html.div({ class: 'loading-state' }, '⏳ Loading posts...') : null,
  // Empty state
  !state.loading && state.posts.length === 0 ? html.div({ class: 'empty-state' },
    'No posts yet. Be the first to post!'
  ) : null,
  // Post list
  ...state.posts.map(post => 
    html['feed-item']({
      postId: post.id,
      content: post.content,
      userId: post.userId,
      likes: post.likes || 0,
      reshares: post.reshares || 0,
      liked: post.liked || false,
      reshared: post.reshared || false,
      createdAt: post.createdAt
    })
  )
]);
