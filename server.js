import { attachMultiplayer } from './server/multiplayer.js';
import { serverConfig } from './server/config.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('./client/', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
const { port, host, production, publicOrigin, origins, trustProxy } = serverConfig();

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(root.endsWith(sep) ? root : root + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const contents = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': `${types[extname(filename)] || 'application/octet-stream'}; charset=utf-8`,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch (error) {
    const status = error instanceof URIError ? 400 : error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 500;
    response.writeHead(status).end(status === 404 ? 'Not found' : status === 400 ? 'Bad request' : 'Server error');
  }
});

const multiplayer = attachMultiplayer(server, { origins, production, trustProxy });
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, async () => { await multiplayer.close(); server.close(() => process.exit(0)); });

server.on('error', (error) => {
  console.error(`Could not start the server: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`farmzombie.io listening on http://${host}:${port}`);
  if (publicOrigin) console.log(`Public URL: ${publicOrigin}`);
});
