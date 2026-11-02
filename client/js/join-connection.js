import { validateNickname } from './nickname.js';

// This socket is handed to the game after admission; Play never opens a second one.
export class JoinConnection {
  constructor({ url, WebSocketClass = WebSocket, onState = () => {}, timeoutMs = 10000 }) {
    Object.assign(this, { url, WebSocketClass, onState, timeoutMs });
    this.pending = null;
  }
  start(nickname, token) {
    if (this.pending) return this.pending;
    const validation = validateNickname(nickname);
    if (!validation.ok) return Promise.reject({ key: validation.key });
    this.onState('menu.connecting');
    this.pending = new Promise((resolve, reject) => {
      let ws, timer, settled = false;
      const fail = (key, reason) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (ws) { ws.onclose = null; ws.close(); }
        reject({ key, reason });
      };
      try { ws = new this.WebSocketClass(this.url); } catch { fail('menu.connectionFailed'); return; }
      timer = setTimeout(() => fail('menu.connectionFailed'), this.timeoutMs);
      ws.onopen = () => {
        this.onState('menu.joining');
        ws.send(JSON.stringify({ op: 'hello', nickname: validation.name, ...(token ? { token } : {}) }));
      };
      ws.onmessage = event => {
        let message; try { message = JSON.parse(event.data); } catch { fail('menu.connectionFailed'); return; }
        if (message.op === 'welcome') {
          if (settled) return;
          settled = true; clearTimeout(timer);
          const queue = [];
          ws.onmessage = event => queue.push(event);
          this.onState('menu.connected');
          resolve({ ws, welcome: message, queue, nickname: validation.name });
        } else if (message.op === 'full') fail('menu.serverFull');
        else if (message.op === 'identityError') fail('menu.sessionUnavailable');
        else if (message.op === 'joinError') fail(message.key || 'menu.connectionFailed');
      };
      ws.onerror = () => fail('menu.connectionFailed');
      ws.onclose = () => fail('menu.connectionFailed');
    }).finally(() => { this.pending = null; });
    return this.pending;
  }
}
