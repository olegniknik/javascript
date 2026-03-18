/**
 * 8=8<0;L=K9 A5@25@ 4;O @CG=>3> B5AB0 04<8=:8 (157 ).
 * 0?CA:: node admin/server.js
 * B:@>9B5 http://localhost:3000/admin
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_DIR = __dirname;

const mimes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

// >: API: ;>38= 2>72@0I05B B>:5=, >AB0;L=K5  ?CABK5 40==K5 (?CB8 A ?@5D8:A>< /api)
function handleApi(req, res) {
  const url = new URL(req.url || '', 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    let body = '';
    req.on('data', (ch) => (body += ch));
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        if (email === 'admin@local.test' && password === 'password123') {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ access_token: 'mock-token-' + Date.now() }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Invalid credentials' }));
        }
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/users') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items: [{ id: '1', email: 'admin@local.test', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString() }], nextCursor: null }));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/clinics') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/packages') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }
  if (req.method === 'GET' && (url.pathname === '/api/bookings' || url.pathname.startsWith('/api/bookings?'))) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items: [], nextCursor: null }));
    return;
  }
  res.writeHead(404);
  res.end();
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const mime = mimes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '', 'http://localhost');
  if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/users') || url.pathname.startsWith('/api/clinics') || url.pathname.startsWith('/api/packages') || url.pathname.startsWith('/api/bookings')) {
    handleApi(req, res);
    return;
  }
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    serveFile(path.join(ADMIN_DIR, 'index.html'), res);
    return;
  }
  if (url.pathname.startsWith('/admin/')) {
    const filePath = path.join(ADMIN_DIR, url.pathname.slice('/admin/'.length)) || 'index.html';
    serveFile(filePath, res);
    return;
  }
  if (url.pathname === '/' || url.pathname === '') {
    res.writeHead(302, { Location: '/admin/' });
    res.end();
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log('Admin mock server at http://localhost:' + PORT + '/admin');
});
