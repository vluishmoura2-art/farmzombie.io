import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import WebSocket from 'ws';
import { attachMultiplayer } from '../server/multiplayer.js';

const origin = 'https://farmzombie-io.onrender.com';

for (const trustProxy of [true, false]) {
  test(`production WebSocket upgrades with trustProxy=${trustProxy}`, { timeout: 10000 }, async t => {
    const server = createServer();
    const game = attachMultiplayer(server, { origins: [origin], production: true, trustProxy });
    t.after(async () => {
      await game.close();
      await new Promise(resolve => server.close(resolve));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `ws://127.0.0.1:${server.address().port}`;

    async function handshake({ proto, requestOrigin = origin, path = '/ws' } = {}) {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(url + path, {
          origin: requestOrigin,
          headers: proto === undefined ? {} : { 'X-Forwarded-Proto': proto },
          handshakeTimeout: 2000,
        });
        ws.on('error', reject);
        ws.once('open', () => { ws.close(); resolve({ status: 101 }); });
        ws.once('unexpected-response', (request, response) => {
          const result = { status: response.statusCode, reason: response.headers['x-websocket-rejection'] };
          response.resume();
          ws.on('error', () => {});
          ws.terminate();
          resolve(result);
        });
      });
    }

    for (const proto of ['https', 'wss']) {
      assert.deepEqual(await handshake({ proto }), trustProxy
        ? { status: 101 }
        : { status: 403, reason: 'secure-transport' });
    }
    for (const proto of [undefined, 'http', 'ws', 'https, http']) {
      assert.deepEqual(await handshake({ proto }), { status: 403, reason: 'secure-transport' });
    }
    assert.deepEqual(await handshake({ proto: 'wss', requestOrigin: 'https://untrusted.example' }), { status: 403, reason: 'origin' });
    assert.deepEqual(await handshake({ proto: 'wss', path: '/other' }), { status: 403, reason: 'path' });
  });
}
