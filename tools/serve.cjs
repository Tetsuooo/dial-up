/* globals require, process, console */
// A tiny local web server, to look at a build before publishing it.
//
//   node tools/serve.cjs                  serves docs/ (what GitHub Pages publishes) on http://localhost:5306
//   node tools/serve.cjs 5306 docs docs/assets
//
// Then open http://localhost:5306/#mix01. Stop it with Ctrl+C.

const http = require('http');
const fs = require('fs');
const path = require('path');

const repo = path.join(__dirname, '..');
const port = +(process.argv[2] || 5306);
const root = path.resolve(repo, process.argv[3] || 'docs');
const assets = path.resolve(repo, process.argv[4] || path.join(process.argv[3] || 'docs', 'assets'));

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.webp': 'image/webp', '.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const inAssets = p.startsWith('/assets/');
  const base = inAssets ? assets : root;
  const file = path.join(base, inAssets ? p.slice('/assets/'.length) : p.slice(1));
  if (!file.startsWith(base)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log(`http://localhost:${port}/#mix01   (serving ${root}, images from ${assets})`));
