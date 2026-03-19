// Production server — runs inside the packaged Electron app
// This gets bundled into resources/next-server/
const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');

process.env.NODE_ENV = 'production';
const dir = path.join(__dirname);
process.chdir(dir);

const next = require('next');
const app = next({ dev: false, dir, conf: require('./next.config.js') });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || '3001', 10);

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
