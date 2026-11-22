import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public'
);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};

// Resolves a request path to a file inside PUBLIC_ROOT, or null when the path
// escapes the public root or has no servable file.
export function resolvePublicPath(requestPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestPath, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const resolved = path.resolve(PUBLIC_ROOT, '.' + pathname);
  if (resolved !== PUBLIC_ROOT && !resolved.startsWith(PUBLIC_ROOT + path.sep)) {
    return null;
  }
  return resolved;
}

export function createApp() {
  return createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method not allowed');
      return;
    }
    const filePath = resolvePublicPath(req.url);
    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    try {
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error('not a file');
      const body = await readFile(filePath);
      const type = MIME_TYPES[path.extname(filePath).toLowerCase()];
      res.writeHead(200, {
        'Content-Type': type ?? 'application/octet-stream',
        'Content-Length': body.length,
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(body);
      }
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => {
    console.log(`Snake running at http://localhost:${port}`);
  });
}
