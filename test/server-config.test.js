import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverConfig } from '../server/config.js';

test('local development keeps localhost and port 7777', () => {
  const config = serverConfig({});
  assert.equal(config.host, '127.0.0.1');assert.equal(config.port, 7777);
  assert.equal(config.production, false);assert.equal(config.trustProxy, false);
  assert.deepEqual(config.origins, ['http://localhost:7777','http://127.0.0.1:7777']);
});
test('Render binds all interfaces, uses its assigned port and public URL, and supports its TLS proxy', () => {
  const config = serverConfig({ RENDER:'true', NODE_ENV:'production', PORT:'10000', RENDER_EXTERNAL_URL:'https://farmzombie-test.onrender.com' });
  assert.equal(config.host,'0.0.0.0');assert.equal(config.port,10000);
  assert.deepEqual(config.origins,['https://farmzombie-test.onrender.com']);assert.equal(config.trustProxy,true);
});
test('explicit settings retain port 7777, custom domain and proxy override', () => {
  const config = serverConfig({RENDER:'true',PORT:'7777',PUBLIC_ORIGIN:'https://farmzombie.example/',RENDER_EXTERNAL_URL:'https://other.onrender.com',HOST:'0.0.0.0',TRUST_PROXY:'0'});
  assert.equal(config.port,7777);assert.deepEqual(config.origins,['https://farmzombie.example']);assert.equal(config.trustProxy,false);
});
test('other production hosts bind publicly but require an explicit HTTPS origin and proxy opt-in', () => {
  assert.throws(()=>serverConfig({NODE_ENV:'production'}),/HTTPS/);
  const config = serverConfig({NODE_ENV:'production',PUBLIC_ORIGIN:'https://farmzombie.example',TRUST_PROXY:'1'});
  assert.equal(config.host,'0.0.0.0');assert.equal(config.trustProxy,true);
});
test('invalid ports and public origins fail before starting the server', () => {
  for(const PORT of ['0','-1','65536','abc','7777.5'])assert.throws(()=>serverConfig({PORT}),/PORT/);
  for(const PUBLIC_ORIGIN of ['http://example.com','https://example.com/path','https://user:password@example.com','https://example.com?x=1'])assert.throws(()=>serverConfig({NODE_ENV:'production',PUBLIC_ORIGIN}),/HTTPS/);
});
