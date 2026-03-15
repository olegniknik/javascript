/**
 * Минимальный сервер для ручного теста админки (без БД).
 * Запуск: node admin/server.js
 * Откройте http://localhost:3000/admin
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

// Мок API: логин возвращает токен, остальные — пустые данные
function handleApi(req, res) {
  const url = new URL(req.url || '', 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/auth/login') {
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
  if (req.method === 'GET' && url.pathname === '/users') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items: [{ id: '1', email: 'admin@local.test', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString() }], nextCursor: null }));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/clinics') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/packages') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }
  if (req.method === 'GET' && (url.pathname === '/bookings' || url.pathname.startsWith('/bookings?'))) {
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
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/users') || url.pathname.startsWith('/clinics') || url.pathname.startsWith('/packages') || url.pathname.startsWith('/bookings')) {
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
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('Admin test server: http://localhost:' + PORT + '/admin');
  console.log('Login: admin@local.test / password123');
});
