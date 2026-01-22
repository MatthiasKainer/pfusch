import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ssr } from './src/ssr.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// In-memory data store
const db = {
  posts: [
    { id: 1, content: 'Welcome to Pfusch Social! #hello #welcome', userId: 1, likes: 5, reshares: 2, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, content: 'Building something cool with pfusch today #pfusch #webdev', userId: 2, likes: 12, reshares: 5, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 3, content: 'Progressive enhancement is the way! #webdev #a11y', userId: 1, likes: 8, reshares: 3, createdAt: new Date(Date.now() - 10800000).toISOString() },
  ],
  users: {
    1: { id: 1, name: 'Alice Developer', handle: '@alicedev' },
    2: { id: 2, name: 'Bob Designer', handle: '@bobdesign' }
  },
  userLikes: new Map(),    // Map<`${userId}-${postId}`, boolean>
  userReshares: new Map(), // Map<`${userId}-${postId}`, boolean>
  nextPostId: 4
};

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Parse request body
async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        if (req.headers['content-type']?.includes('application/json')) {
          resolve(JSON.parse(body));
        } else {
          const params = new URLSearchParams(body);
          resolve(Object.fromEntries(params));
        }
      } catch {
        resolve({});
      }
    });
  });
}

// Parse URL and query params
function parseUrl(reqUrl) {
  const url = new URL(reqUrl, 'http://localhost');
  return {
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams)
  };
}

// Route matching with params
function matchRoute(method, pathname, routes) {
  for (const [pattern, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = pattern.split(' ');
    if (method !== routeMethod) continue;

    // Convert route pattern to regex
    const paramNames = [];
    const regexPath = routePath.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const match = pathname.match(new RegExp(`^${regexPath}$`));
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => params[name] = match[i + 1]);
      return { handler, params };
    }
  }
  return null;
}

// API Route handlers
const routes = {
  // Get all posts (with optional hashtag filter)
  'GET /api/posts': async (req, res, query) => {
    let posts = [...db.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (query.hashtag) {
      posts = posts.filter(p =>
        p.content.toLowerCase().includes(`#${query.hashtag.toLowerCase()}`)
      );
    }

    // Check Accept header for content negotiation
    if (req.headers.accept?.includes('text/html') && !req.headers['x-requested-with']) {
      // Redirect to home with filter param for no-JS
      res.writeHead(302, { 'Location': query.hashtag ? `/?filter=${query.hashtag}` : '/' });
      res.end();
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(posts));
  },

  // Create a new post
  'POST /api/posts/create': async (req, res) => {
    const body = await parseBody(req);

    const newPost = {
      id: db.nextPostId++,
      content: body.content || '',
      userId: parseInt(body.userId) || 1,
      likes: 0,
      reshares: 0,
      liked: false,
      reshared: false,
      createdAt: new Date().toISOString()
    };

    db.posts.unshift(newPost);

    if (req.headers['content-type']?.includes('application/json')) {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newPost));

      void update_cache().catch((err) => {
        console.error('SSR Cache Update Error:', err);
      });
      return;
    }

    update_cache().then(() => {
      // Redirect for form submission (no-JS fallback)
      res.writeHead(303, { 'Location': '/' });
      res.end();
    }).catch((err) => {
      console.error('SSR Cache Update Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  },

  // Like a post
  'POST /api/posts/:id/like': async (req, res, query, params) => {
    const postId = parseInt(params.id);
    const userId = 1; // Hardcoded for demo
    const post = db.posts.find(p => p.id === postId);

    if (!post) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Post not found' }));
      return;
    }

    const likeKey = `${userId}-${postId}`;
    const alreadyLiked = db.userLikes.get(likeKey);

    if (alreadyLiked) {
      post.likes = Math.max(0, post.likes - 1);
      db.userLikes.delete(likeKey);
    } else {
      post.likes++;
      db.userLikes.set(likeKey, true);
    }

    const result = { ...post, liked: !alreadyLiked };

    if (req.headers['content-type']?.includes('application/json')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));

      void update_cache().catch((err) => {
        console.error('SSR Cache Update Error:', err);
      });
      return;
    }

    update_cache().then(() => {
      res.writeHead(303, { 'Location': '/' });
      res.end();
    }).catch((err) => {
      console.error('SSR Cache Update Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  },

  // Reshare a post
  'POST /api/posts/:id/reshare': async (req, res, query, params) => {
    const postId = parseInt(params.id);
    const userId = 1;
    const post = db.posts.find(p => p.id === postId);

    if (!post) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Post not found' }));
      return;
    }

    const reshareKey = `${userId}-${postId}`;
    const alreadyReshared = db.userReshares.get(reshareKey);

    if (alreadyReshared) {
      post.reshares = Math.max(0, post.reshares - 1);
      db.userReshares.delete(reshareKey);
    } else {
      post.reshares++;
      db.userReshares.set(reshareKey, true);
    }

    const result = { ...post, reshared: !alreadyReshared };

    if (req.headers['content-type']?.includes('application/json')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));

      void update_cache().catch((err) => {
        console.error('SSR Cache Update Error:', err);
      });
      return;
    }

    update_cache().then(() => {
      res.writeHead(303, { 'Location': '/' });
      res.end();
    }).catch((err) => {
      console.error('SSR Cache Update Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  },

  // Get user by ID
  'GET /api/users/:id': async (req, res, query, params) => {
    const userId = parseInt(params.id);
    const user = db.users[userId];

    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(user));
  }
};

let cached_page = null;

async function getSsrPage(filter) {
  return await ssr(`http://localhost:${PORT}/ssr.rendered${filter ? '?filter=' + encodeURIComponent(filter) : ''}`);
}


async function update_cache() {
  const html = await getSsrPage();
  cached_page = html;
}
void update_cache().catch((err) => {
  console.error('SSR Cache Update Error:', err);
});

// Serve static files
function serveStatic(req, res, pathname) {
  let filePath;

  if (pathname === '/') {
    const requestedFilter = parseUrl(req.url).query.filter;
    if (cached_page && !requestedFilter) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(cached_page);

      return;
    }
    getSsrPage(requestedFilter).then((html) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    }).catch((err) => {
      console.error('SSR Error:', err);
      res.writeHead(500);
      res.end('Server Error during SSR');
    });
    return;
  }
  else if (pathname === '/ssr.rendered') {
    filePath = path.join(__dirname, 'public', 'index.html');
  } else {
    filePath = path.join(__dirname, 'public', pathname);
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

// Create server
const server = http.createServer(async (req, res) => {
  const { pathname, query } = parseUrl(req.url);

  // Try to match API routes
  const matched = matchRoute(req.method, pathname, routes);

  if (matched) {
    try {
      await matched.handler(req, res, query, matched.params);
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Serve static files
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`🐦 Pfusch Social running at http://localhost:${PORT}`);
  console.log(`   API endpoints available at /api/*`);
});
