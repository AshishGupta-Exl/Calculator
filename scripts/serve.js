/**
 * Minimal static file server for local development. ES modules cannot be
 * loaded over `file://`, so the app needs to be served over HTTP.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 4173;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function resolve(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const candidate = join(ROOT, relative || 'index.html');

  if (!candidate.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) return null;

  const info = await stat(candidate).catch(() => null);
  if (!info) return null;
  return info.isDirectory() ? resolve(join(relative, 'index.html')) : candidate;
}

createServer(async (request, response) => {
  const file = await resolve(request.url ?? '/');

  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('404 Not Found');
    return;
  }

  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(file).pipe(response);
}).listen(PORT, () => {
  console.log(`Calculator running at http://localhost:${PORT}`);
});
