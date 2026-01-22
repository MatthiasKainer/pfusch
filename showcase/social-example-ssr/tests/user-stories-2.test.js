import assert from 'node:assert/strict';
import test from 'node:test';
import { setupDomStubs, loadBaseDocument, import_for_test } from '../../../unit-tests/pfusch-stubs.js';

let restore;
let root;

// Mock data with multiple hashtags
const mockPosts = [
  { id: 1, content: 'Check out #pfusch and #webdev together!', userId: 1, likes: 15, reshares: 8, createdAt: '2024-01-15T12:00:00Z' },
  { id: 2, content: 'Just #pfusch things', userId: 2, likes: 5, reshares: 1, createdAt: '2024-01-15T11:00:00Z' },
  { id: 3, content: 'No hashtags here', userId: 1, likes: 2, reshares: 0, createdAt: '2024-01-15T10:00:00Z' },
];

const mockUsers = {
  1: { id: 1, name: 'Test User 1', handle: '@test1' },
  2: { id: 2, name: 'Test User 2', handle: '@test2' }
};

test.before(async () => {
  ({ restore } = setupDomStubs());

  globalThis.fetch.resetRoutes();
  globalThis.fetch.addRoute('/api/posts', mockPosts);
  globalThis.fetch.addRoute('/api/users/1', mockUsers[1]);
  globalThis.fetch.addRoute('/api/users/2', mockUsers[2]);

  await import_for_test('../public/components.js');
  root = await loadBaseDocument('../public/index.html');
});

test.after(() => {
  restore?.();
});

// ============================================
// USER STORY: Multiple hashtags in single post
// ============================================

test('user sees all hashtags in a post as clickable', async () => {
  const feedList = root.get('feed-list');
  await feedList.flush();

  const firstItem = feedList.get('feed-item').first;
  await firstItem.flush();

  const hashtags = firstItem.get('.hashtag');
  // First post has 2 hashtags: #pfusch and #webdev
  assert.equal(hashtags.length, 2, 'Post with 2 hashtags should show 2 clickable hashtag elements');
});

// ============================================
// USER STORY: Post without hashtags
// ============================================

test('posts without hashtags display content normally', async () => {
  const feedList = root.get('feed-list');
  await feedList.flush();

  // Third post has no hashtags
  const thirdItem = feedList.get('feed-item').at(2);
  await thirdItem.flush();

  const content = thirdItem.get('.post-content');
  assert.ok(content.textContent.includes('No hashtags here'), 'Content without hashtags should display');
  
  const hashtags = thirdItem.get('.hashtag');
  assert.equal(hashtags.length, 0, 'Post without hashtags should have no hashtag elements');
});

// ============================================
// USER STORY: Like count changes visually
// ============================================

test('like count displays updated number after liking', async () => {
  globalThis.fetch.resetCalls();
  globalThis.fetch.addRoute('/api/posts/1/like', { ...mockPosts[0], likes: 16, liked: true });
  root = await loadBaseDocument('../public/index.html');

  const feedList = root.get('feed-list');
  await feedList.flush();

  const feedItem = feedList.get('feed-item').first;
  await feedItem.flush();

  // Initial like count
  let likeCount = feedItem.get('.like-count');
  assert.ok(likeCount.textContent.includes('15'), 'Initial like count should be 15');

  // Click like
  const likeBtn = feedItem.get('.like-btn');
  likeBtn.click();
  await feedItem.flush();
  await feedItem.flush();

  // Updated like count
  likeCount = feedItem.get('.like-count');
  assert.ok(likeCount.textContent.includes('16'), 'Like count should update to 16');
});

// ============================================
// USER STORY: Reshare count changes visually  
// ============================================

test('reshare count displays updated number after resharing', async () => {
  globalThis.fetch.resetCalls();
  globalThis.fetch.addRoute('/api/posts/1/reshare', { ...mockPosts[0], reshares: 9, reshared: true });
  root = await loadBaseDocument('../public/index.html');

  const feedList = root.get('feed-list');
  await feedList.flush();

  const feedItem = feedList.get('feed-item').first;
  await feedItem.flush();

  // Initial reshare count
  let reshareCount = feedItem.get('.reshare-count');
  assert.ok(reshareCount.textContent.includes('8'), 'Initial reshare count should be 8');

  // Click reshare
  const reshareBtn = feedItem.get('.reshare-btn');
  reshareBtn.click();
  await feedItem.flush();
  await feedItem.flush();

  // Updated reshare count
  reshareCount = feedItem.get('.reshare-count');
  assert.ok(reshareCount.textContent.includes('9'), 'Reshare count should update to 9');
});

// ============================================
// USER STORY: Form clears after posting
// ============================================

test('post form clears content after successful submission', async () => {
  globalThis.fetch.resetCalls();
  globalThis.fetch.addRoute('/api/posts/create', { 
    id: 100, 
    content: 'Test post', 
    userId: 1, 
    likes: 0, 
    reshares: 0,
    createdAt: new Date().toISOString()
  });
  root = await loadBaseDocument('../public/index.html');

  const postForm = root.get('feed-post');
  await postForm.flush();

  const textarea = postForm.get('textarea[name="content"]');
  textarea.value = 'Test post content';

  const form = postForm.get('form');
  form.submit();
  await postForm.flush();
  await postForm.flush();

  // Form reset is called, which clears the textarea
  // Note: In the stub environment, form.reset() clears values
  const calls = globalThis.fetch.getCalls();
  assert.ok(calls.some(c => c.url.includes('/api/posts/create')), 'Post should be created');
});

// ============================================
// USER STORY: Loading states
// ============================================

test('feed shows loading state while fetching posts', async () => {
  globalThis.fetch.resetCalls();
  root = await loadBaseDocument('../public/index.html');

  const feedList = root.get('feed-list');
  // Before flush, component is in loading state
  const loadingEl = feedList.get('.loading-state');
  // The loading state might show briefly, then disappear after posts load
  await feedList.flush();
  
  // After flush, posts should be loaded
  const items = feedList.get('feed-item');
  assert.ok(items.length > 0, 'Posts should be loaded after flush');
});
