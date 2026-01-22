import assert from 'node:assert/strict';
import test from 'node:test';
import { setupDomStubs, loadBaseDocument, flushEffects, import_for_test } from '../../../unit-tests/pfusch-stubs.js';

let restore;
let root;

// Mock data
const mockPosts = [
  { id: 1, content: 'Hello world! #hello', userId: 1, likes: 5, reshares: 2, createdAt: '2024-01-15T10:00:00Z' },
  { id: 2, content: 'Testing pfusch #test #pfusch', userId: 2, likes: 10, reshares: 5, createdAt: '2024-01-15T09:00:00Z' },
  { id: 3, content: 'Another hello #hello #greeting', userId: 1, likes: 3, reshares: 1, createdAt: '2024-01-15T08:00:00Z' }
];

const mockUsers = {
  1: { id: 1, name: 'Alice Developer', handle: '@alicedev' },
  2: { id: 2, name: 'Bob Designer', handle: '@bobdesign' }
};

const createdPost = {
  id: 99,
  content: 'New post from form #new',
  userId: 1,
  likes: 0,
  reshares: 0,
  createdAt: new Date().toISOString()
};

test.before(async () => {
  ({ restore } = setupDomStubs());

  // Setup fetch mock routes
  globalThis.fetch.resetRoutes();
  globalThis.fetch.addRoute('/api/posts', mockPosts);
  globalThis.fetch.addRoute('/api/posts/create', createdPost);
  globalThis.fetch.addRoute('/api/posts/1/like', { ...mockPosts[0], likes: 6, liked: true });
  globalThis.fetch.addRoute('/api/posts/1/reshare', { ...mockPosts[0], reshares: 3, reshared: true });
  globalThis.fetch.addRoute('/api/users/1', mockUsers[1]);
  globalThis.fetch.addRoute('/api/users/2', mockUsers[2]);

  // Import components
  await import_for_test('../public/components.js');
  
  // Load the HTML document
  root = await loadBaseDocument('../public/index.html');
});

test.after(() => {
  restore?.();
});

// ============================================
// USER STORY: As a user, I want to post messages
// ============================================

test('user can type a message and submit the form to create a post', async () => {
  const postForm = root.get('feed-post');
  await postForm.flush();

  // User types a message
  const textarea = postForm.get('textarea[name="content"]');
  textarea.value = 'My first tweet! #hello';

  // User submits the form
  const form = postForm.get('form');
  form.submit();
  await postForm.flush();

  // Verify the API was called
  const calls = globalThis.fetch.getCalls();
  const postCall = calls.find(c => c.url.includes('/api/posts/create'));
  assert.ok(postCall, 'A POST request should be made to create the post');
});

test('post form shows character count to help user stay within limit', async () => {
  // Reset for clean state
  globalThis.fetch.resetCalls();
  root = await loadBaseDocument('../public/index.html');
  
  const postForm = root.get('feed-post');
  await postForm.flush();

  // Character counter should be visible
  const counter = postForm.get('.char-count');
  assert.ok(counter.length > 0, 'Character counter should be displayed');
});

// ============================================
// USER STORY: As a user, I want to see posts in my feed
// ============================================

test('user sees a list of posts when visiting the feed', async () => {
  globalThis.fetch.resetCalls();
  root = await loadBaseDocument('../public/index.html');
  
  const feedList = root.get('feed-list');
  await feedList.flush();

  const items = feedList.get('feed-item');
  assert.equal(items.length, 3, 'Feed should display 3 posts from the API');
});

test('each post displays its content text', async () => {
  const feedList = root.get('feed-list');
  await feedList.flush();

  const firstItem = feedList.get('feed-item').first;
  await firstItem.flush();

  const content = firstItem.get('.post-content');
  assert.ok(content.textContent.includes('Hello world'), 'Post content should be visible');
});

// ============================================
// USER STORY: As a user, I want new posts to appear in my feed automatically
// ============================================

test('new posts appear at the top of the feed when created', async () => {
  globalThis.fetch.resetCalls();
  root = await loadBaseDocument('../public/index.html');
  
  const feedList = root.get('feed-list');
  await feedList.flush();

  const initialCount = feedList.get('feed-item').length;
  assert.equal(initialCount, 3, 'Initially 3 posts');

  // Simulate a new post being created (dispatches feed-post.created event)
  window.dispatchEvent(new CustomEvent('feed-post.created', {
    detail: { id: 100, content: 'BRAND NEW POST #fresh', userId: 1, likes: 0, reshares: 0, createdAt: new Date().toISOString() },
    bubbles: true
  }));
  await feedList.flush();

  const newCount = feedList.get('feed-item').length;
  assert.equal(newCount, 4, 'Feed should now have 4 posts');

  // Verify new post is at top
  const firstItem = feedList.get('feed-item').first;
  await firstItem.flush();
  const content = firstItem.get('.post-content');
  assert.ok(content.textContent.includes('BRAND NEW'), 'New post should appear at top');
});

// ============================================
// USER STORY: As a user, I want to like posts
// ============================================

test('user can see the like count on a post', async () => {
  globalThis.fetch.resetCalls();
  root = await loadBaseDocument('../public/index.html');
  
  const feedList = root.get('feed-list');
  await feedList.flush();

  const feedItem = feedList.get('feed-item').first;
  await feedItem.flush();

  const likeCount = feedItem.get('.like-count');
  assert.ok(likeCount.textContent.includes('5'), 'Like count should show 5');
});

test('user can click the like button to like a post', async () => {
  globalThis.fetch.resetCalls();
  globalThis.fetch.addRoute('/api/posts/1/like', { ...mockPosts[0], likes: 6, liked: true });
  root = await loadBaseDocument('../public/index.html');
  
  const feedList = root.get('feed-list');
  await feedList.flush();

  const feedItem = feedList.get('feed-item').first;
  await feedItem.flush();

  const likeBtn = feedItem.get('.like-btn');
  likeBtn.click();
  await feedItem.flush();

  // Verify the API was called
  const calls = globalThis.fetch.getCalls();
  const likeCall = calls.find(c => c.url.includes('/like'));
  assert.ok(likeCall, 'Like API should be called when button is clicked');
});

// ============================================
// USER STORY: As a user, I want to reshare posts
// ============================================

test('user can see the reshare count on a post', async () => {
  globalThis.fetch.resetCalls();
  root = await loadBaseDocument('../public/index.html');
  
  const feedList = root.get('feed-list');
  await feedList.flush();

  const feedItem = feedList.get('feed-item').first;
  await feedItem.flush();

  const reshareCount = feedItem.get('.reshare-count');
  assert.ok(reshareCount.textContent.includes('2'), 'Reshare count should show 2');
});

test('user can click the reshare button to reshare a post', async () => {
  globalThis.fetch.resetCalls();
  globalThis.fetch.addRoute('/api/posts/1/reshare', { ...mockPosts[0], reshares: 3, reshared: true });
  root = await loadBaseDocument('../public/index.html');
  
  const feedList = root.get('feed-list');
  await feedList.flush();

  const feedItem = feedList.get('feed-item').first;
  await feedItem.flush();

  const reshareBtn = feedItem.get('.reshare-btn');
  reshareBtn.click();
  await feedItem.flush();

  const calls = globalThis.fetch.getCalls();
  const reshareCall = calls.find(c => c.url.includes('/reshare'));
  assert.ok(reshareCall, 'Reshare API should be called when button is clicked');
});

// ============================================
// USER STORY: As a user, I want to click hashtags to filter posts
// ============================================

test('hashtags in posts are displayed as clickable elements', async () => {
  globalThis.fetch.resetCalls();
  root = await loadBaseDocument('../public/index.html');
  
  const feedList = root.get('feed-list');
  await feedList.flush();

  const feedItem = feedList.get('feed-item').first;
  await feedItem.flush();

  // Look for hashtag elements
  const hashtags = feedItem.get('.hashtag');
  assert.ok(hashtags.length > 0, 'Hashtags should be rendered as clickable elements');
});

test('clicking a hashtag filters the feed to show only matching posts', async () => {
  // Setup filtered response
  const filteredPosts = mockPosts.filter(p => p.content.includes('#hello'));
  globalThis.fetch.resetCalls();
  globalThis.fetch.addRoute('/api/posts', mockPosts);
  globalThis.fetch.addRoute('/api/posts?hashtag=hello', filteredPosts);
  globalThis.fetch.addRoute('/api/users/1', mockUsers[1]);
  globalThis.fetch.addRoute('/api/users/2', mockUsers[2]);
  
  root = await loadBaseDocument('../public/index.html');

  const feedList = root.get('feed-list');
  await feedList.flush();

  // Initially should have 3 posts
  assert.equal(feedList.get('feed-item').length, 3, 'Should start with 3 posts');

  // Simulate clicking #hello hashtag (via event since click propagation is complex in stubs)
  window.dispatchEvent(new CustomEvent('hash-tag.clicked', {
    detail: { tag: 'hello' },
    bubbles: true
  }));
  await feedList.flush();
  await feedList.flush();

  // Should now have 2 posts (filtered)
  const filteredCount = feedList.get('feed-item').length;
  assert.equal(filteredCount, 2, 'Feed should filter to 2 posts with #hello');
});

test('user can clear the hashtag filter to see all posts again', async () => {
  const filteredPosts = mockPosts.filter(p => p.content.includes('#hello'));
  globalThis.fetch.resetCalls();
  globalThis.fetch.addRoute('/api/posts', mockPosts);
  globalThis.fetch.addRoute('/api/posts?hashtag=hello', filteredPosts);
  globalThis.fetch.addRoute('/api/users/1', mockUsers[1]);
  globalThis.fetch.addRoute('/api/users/2', mockUsers[2]);

  root = await loadBaseDocument('../public/index.html');

  const feedList = root.get('feed-list');
  await feedList.flush();

  // Filter by hashtag
  window.dispatchEvent(new CustomEvent('hash-tag.clicked', {
    detail: { tag: 'hello' },
    bubbles: true
  }));
  await feedList.flush();

  assert.equal(feedList.get('feed-item').length, 2, 'Should have 2 filtered posts');

  // Clear filter button should be visible
  const clearBtn = feedList.get('.clear-filter');
  assert.ok(clearBtn.length > 0, 'Clear filter button should appear when filtering');

  // Click clear filter
  clearBtn.click();
  await feedList.flush();
  await feedList.flush();

  assert.equal(feedList.get('feed-item').length, 3, 'Should show all 3 posts after clearing');
});

// ============================================
// USER STORY: As a user, I want posts to show who posted them
// ============================================

test('each post shows the author name', async () => {
  globalThis.fetch.resetCalls();
  globalThis.fetch.addRoute('/api/posts', mockPosts);
  globalThis.fetch.addRoute('/api/users/1', mockUsers[1]);
  globalThis.fetch.addRoute('/api/users/2', mockUsers[2]);
  
  root = await loadBaseDocument('../public/index.html');
  
  const feedList = root.get('feed-list');
  await feedList.flush();

  const feedItem = feedList.get('feed-item').first;
  await feedItem.flush();
  await feedItem.flush(); // Extra flush for async user fetch

  const author = feedItem.get('.post-author');
  // Author should eventually load
  assert.ok(author.length > 0, 'Author element should exist');
});
