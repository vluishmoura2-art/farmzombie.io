import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import WebSocket from 'ws';
import { attachMultiplayer } from '../server/multiplayer.js';

const server=createServer((req,res)=>res.end('test'));
const game=attachMultiplayer(server,{origins:['http://localhost:7777'],heartbeatMs:1000});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`ws://127.0.0.1:${server.address().port}/ws`,clients=[],latencies=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(fn,label,ms=5000){const end=performance.now()+ms;while(!fn()){if(performance.now()>end)throw Error('Timed out: '+label);await delay(20);}}
async function connect(token,origin='http://localhost:7777'){
 const ws=new WebSocket(url,{origin});const c={ws,seq:0,replies:new Map(),states:0,bytes:0};clients.push(c);
 ws.on('error',()=>{});ws.on('message',raw=>{c.bytes+=raw.length;const m=JSON.parse(raw);if(m.op==='welcome'){c.welcome=m;c.seq=m.seq;}if(m.op==='state'){c.state=m;c.states++;}if(m.op==='full')c.full=true;if(m.op==='result'){const pending=c.replies.get(m.seq);if(pending){latencies.push(performance.now()-pending.at);pending.resolve(m);c.replies.delete(m.seq);}}});
 ws.on('open',()=>ws.send(JSON.stringify({op:'hello',nickname:'Load_Player',...(token?{token}:{})})));
 await waitFor(()=>c.welcome||c.full||ws.readyState===3,'connection');return c;
}
function command(c,op,data={}){return new Promise(resolve=>{const seq=++c.seq;c.replies.set(seq,{resolve,at:performance.now()});c.ws.send(JSON.stringify({op,seq,...data}));});}
let report;
try{
 const a=await connect(),b=await connect();await waitFor(()=>a.state?.count===2&&b.state?.count===2,'two shared players');
 assert.equal(a.state.players.length,2);assert.equal(a.state.players.find(p=>p.id===a.welcome.id).id,a.welcome.id);
 assert.equal((await command(a,'name',{name:'Network_A'})).ok,true);
 const start=game.room.players.get(a.welcome.id).player.x;
 await command(a,'input',{x:1,y:0,angle:0,slot:1,auto:false,blocked:false});await delay(350);
 await waitFor(()=>b.state.players.find(p=>p.id===a.welcome.id)?.x>start+20,'movement synchronized');
 await command(a,'input',{x:0,y:0,angle:0,slot:1,auto:false,blocked:false});
 const ap=game.room.players.get(a.welcome.id),bp=game.room.players.get(b.welcome.id);ap.player.x=ap.player.y=3000;bp.player.x=3080;bp.player.y=3000;
 assert.equal((await command(a,'action',{angle:0})).ok,true);await waitFor(()=>b.state.players.find(p=>p.id===b.welcome.id)?.health===75,'PvP synchronized');
 assert.equal((await command(a,'createClan',{name:'Network Clan'})).ok,true);assert.equal((await command(a,'invite',{target:b.welcome.id})).ok,true);
 await waitFor(()=>b.state.invitations.length===1,'invitation delivered');assert.equal((await command(b,'invitation',{clan:ap.clanId,accept:true})).ok,true);
 assert.equal((await command(b,'permission',{target:b.welcome.id,allow:true})).ok,false);assert.equal((await command(a,'permission',{target:b.welcome.id,allow:true})).ok,true);
 const token=b.welcome.token,id=b.welcome.id;b.ws.close();await waitFor(()=>!bp.online,'disconnect cleanup');const resumed=await connect(token);assert.equal(resumed.welcome.id,id);assert.equal(bp.clanId,ap.clanId);
 const invalid=await connect(undefined,'https://malicious.invalid');assert.equal(invalid.welcome,undefined);assert.equal(invalid.ws.readyState,3);
 a.ws.send('{invalid');await delay(50);assert.equal(a.ws.readyState,1);
 const live=()=>clients.filter(c=>c.ws.readyState===1);
 while(live().length<50)await connect();await waitFor(()=>live().every(c=>c.state?.count===50),'50 states',10000);
 const extra=await connect();assert.equal(extra.full,true);await waitFor(()=>extra.ws.readyState===3,'51 rejected');
 const active=live(),before=active.map(c=>c.states),startLoad=performance.now(),initialBytes=game.metrics.bytes;
 let frames=0;const interval=setInterval(()=>{frames++;for(const [i,c]of active.entries()){if(c.ws.readyState!==1)continue;c.ws.send(JSON.stringify({op:'input',seq:++c.seq,x:Math.sin((frames+i)/15),y:Math.cos((frames+i)/15),angle:(frames+i)%6-3,slot:i%2,auto:true,blocked:false}));}},50);
 await delay(10000);clearInterval(interval);
 console.log('LOAD DIAGNOSTICS',JSON.stringify({metrics:game.metrics,online:game.room.online,states:active.map((c,i)=>c.states-before[i]),ready:active.map(c=>c.ws.readyState)}));
 assert.equal(game.room.online,50);assert.equal(active.length,50);for(let i=0;i<50;i++)assert.ok(active[i].states-before[i]>30,'snapshots continue for client '+i);
 const elapsed=(performance.now()-startLoad)/1000;
 report={passed:true,clients:50,durationSeconds:elapsed,inputHzPerClient:20,snapshotHz:10,minSnapshotsReceived:Math.min(...active.map((c,i)=>c.states-before[i])),bytesPerSecond:(game.metrics.bytes-initialBytes)/elapsed,meanTickMs:game.metrics.totalTickMs/game.metrics.ticks,maxTickMs:game.metrics.maxTickMs,meanCommandRoundTripMs:latencies.reduce((a,b)=>a+b,0)/latencies.length,rssMB:process.memoryUsage().rss/1024/1024,checks:['two clients share identity and movement','PvP exact 25 damage synchronized','clan invitation, permission and reconnect','invalid origin rejected','invalid JSON survives','50 active WebSockets with auto actions and moving intents','client 51 rejected'],scope:'Local Node/ws simulated clients for 10 seconds, not an internet production benchmark'};
 console.log(JSON.stringify(report,null,2));await writeFile('test-results/phase13-load.json',JSON.stringify(report,null,2));
}finally{for(const c of clients)c.ws.terminate();await game.close();await new Promise(resolve=>server.close(resolve));}
