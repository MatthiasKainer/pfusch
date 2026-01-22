import assert from 'node:assert/strict';
import test from 'node:test';
import { setupDomStubs, loadBaseDocument } from '../pfusch-stubs.js';

let restore;
let root;
const initialPosts = [
  { id: 1, title: 'Hello Pfusch', body: 'First post', userId: 1 }
];
const createdPost = {
  id: 99,
  title: 'From the form',
  body: 'Created in the test',
  userId: 1
};

test.before(async () => {
  ({ restore } = setupDomStubs());

  globalThis.fetch.resetRoutes();
  globalThis.fetch.addRoute('posts', createdPost);
  globalThis.fetch.addRoute('posts?_limit=5', initialPosts);

  await import('./social.js');
  root = await loadBaseDocument('./index.html');
});

test.after(() => {
  restore?.();
});

test('post-feed prepends new posts when post-form submits', async () => {
  const form = root.get('post-form');
  const feed = root.get('post-feed');
  await feed.flush();

  assert.equal(feed.get('.post').length, 1);

  form.get('input[name="title"]').value = 'New title';
  form.get('textarea[name="body"]').value = 'New body';
  form.get('form').submit();
  await form.flush();
  await feed.flush();

  assert.equal(feed.get('.post').length, 2);
  assert.equal(feed.get('.post').first.get('h3').textContent, createdPost.title);
});
