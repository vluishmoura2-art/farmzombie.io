import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import WebSocket from 'ws';
import { attachMultiplayer } from '../server/multiplayer.js';
import { JoinConnection } from '../client/js/join-connection.js';

const origin='http://localhost:7777',server=createServer(),game=attachMultiplayer(server,{origins:[origin]}),sockets=[];
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`ws://127.0.0.1:${server.address().port}/ws`;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(predicate){for(let i=0;i<250;i++){if(predicate())return;await delay(20);}throw Error('Condition timed out');}
class BrowserSocket extends WebSocket {constructor(url){super(url,{origin});sockets.push(this);this.on('error',()=>{});}}
const connect=()=>new JoinConnection({url,WebSocketClass:BrowserSocket});
const passed=[];
try{
  for(const nickname of ['', 'ab', 'x'.repeat(17), 'unsafe name', '<script>']){
    const ws=new BrowserSocket(url);const result=new Promise(resolve=>ws.once('message',data=>resolve(JSON.parse(data))));
    await new Promise(resolve=>ws.once('open',resolve));ws.send(JSON.stringify({op:'hello',nickname}));
    const message=await result;assert.equal(message.op,'joinError');await waitFor(()=>ws.readyState===3);assert.equal(game.room.online,0);
  }
  passed.push('Server independently rejects empty, short, long and unsafe names before creating a session');
  const join=connect(),promise=join.start(' Farm_1 '),same=join.start('Duplicate');assert.equal(promise,same);
  const first=await promise;assert.equal(game.room.online,1);assert.equal(game.room.players.get(first.welcome.id).name,'Farm_1');
  passed.push('Play admits one session and hands off the existing WebSocket only after welcome');
  first.ws.close();await waitFor(()=>game.room.online===0);
  const resumed=await connect().start('Farm_1',first.welcome.token);assert.equal(resumed.welcome.id,first.welcome.id);assert.equal(game.room.players.size,1);
  passed.push('Reconnect restores the same identity without a duplicate session');
  for(let i=1;i<50;i++)await connect().start(`Player_${i}`);
  assert.equal(game.room.online,50);await assert.rejects(connect().start('Player_51'),error=>error.key==='menu.serverFull');assert.equal(game.room.online,50);
  passed.push('50 sessions admitted; client 51 receives localized server-full result');
  const report={passed,clients:50,scope:'Actual local ws server and native-compatible WebSocket join controller; admission checks, not a capacity/load benchmark'};
  await writeFile('test-results/phase14-join.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{for(const ws of sockets)ws.terminate();await game.close();await new Promise(resolve=>server.close(resolve));}
