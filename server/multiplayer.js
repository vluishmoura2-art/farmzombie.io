import { validateNickname } from '../client/js/nickname.js';
import { WebSocketServer } from 'ws';
import { GameRoom, NETWORK_RULES } from './game-room.js';
import { performance } from 'node:perf_hooks';

export function attachMultiplayer(server,{room=new GameRoom(),origins,production=false,trustProxy=false,heartbeatMs=15000}={}) {
  if(!origins?.length)throw Error('Explicit WebSocket origins required');
  const wss=new WebSocketServer({noServer:true,perMessageDeflate:false,maxPayload:NETWORK_RULES.maxPayload});
  const metrics={ticks:0,maxTickMs:0,totalTickMs:0,bytes:0,slowConnections:0};
  server.on('upgrade',(request,socket,head)=>{
    let path;try{path=new URL(request.url,'http://localhost').pathname;}catch{socket.destroy();return;}
    if(path!=='/ws'||!origins.includes(request.headers.origin)||production&&!(request.socket.encrypted||trustProxy&&request.headers['x-forwarded-proto']==='https')){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,request));
  });
  const send=(ws,data,shared)=>{if(ws.readyState!==1)return false;if(ws.bufferedAmount>NETWORK_RULES.maxBuffered){metrics.slowConnections++;ws.close(4008,'Slow consumer');return false;}const text=shared?JSON.stringify(data).slice(0,-1)+','+shared+'}':JSON.stringify(data);metrics.bytes+=Buffer.byteLength(text);ws.send(text);return true;};
  wss.on('connection',ws=>{
    if(wss.clients.size>NETWORK_RULES.capacity){send(ws,{op:'full',reason:'Server full'});ws.close(4001,'Server full');return;}
    ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});ws.cache=new Map();ws.eventCursor=0;
    let tokens=NETWORK_RULES.messagesPerSecond,last=performance.now();
    const helloTimer=setTimeout(()=>ws.close(4002,'Identity timeout'),5000);helloTimer.unref();
    ws.on('message',(raw,isBinary)=>{
      const now=performance.now();tokens=Math.min(NETWORK_RULES.messagesPerSecond,tokens+(now-last)/1000*NETWORK_RULES.messagesPerSecond);last=now;
      if(--tokens<0){ws.close(4008,'Rate limit');return;}
      if(isBinary){ws.close(4002,'JSON text required');return;}
      let message;try{message=JSON.parse(raw.toString());}catch{send(ws,{op:'error',reason:'Invalid JSON'});return;}
      if(!ws.player){
        if(!message||message.op!=='hello'||Object.keys(message).some(k=>!['op','token','nickname'].includes(k))||message.token!==undefined&&typeof message.token!=='string'){ws.close(4002,'Invalid identity');return;}
        const nickname=validateNickname(message.nickname);if(!nickname.ok){send(ws,{op:'joinError',key:nickname.key});ws.close(4002,'Invalid nickname');return;}
        try{ws.player=room.join(message.token,nickname.name);clearTimeout(helloTimer);send(ws,{op:'welcome',id:ws.player.id,token:ws.player.token,seq:ws.player.lastSeq,world:{width:room.world.width,height:room.world.height,seed:3417777}});}catch(error){send(ws,{op:error.message==='Server full'?'full':'identityError',reason:error.message});ws.close(4003,error.message);}return;
      }
      const result=room.command(ws.player,message);send(ws,{op:'result',seq:message?.seq,...result});
    });
    ws.on('close',()=>{clearTimeout(helloTimer);room.disconnect(ws.player);});
  });
  let accumulator=0;
  const tick=setInterval(()=>{
    const start=performance.now();room.tick(1/NETWORK_RULES.tickHz);accumulator++;
    if(accumulator%(NETWORK_RULES.tickHz/NETWORK_RULES.snapshotHz)===0) {
      const active=[...wss.clients].filter(ws=>ws.player&&ws.readyState===1);
      const common=active.length?room.snapshot(active[0].player):null;
      const shared=common?JSON.stringify({players:common.players,clans:common.clans,bases:common.bases}).slice(1,-1):'';
      for(const ws of active){
        const state=room.snapshot(ws.player,common),changed=[],next=new Map();
        for(const b of state.buildings){const data=JSON.stringify(b);next.set(b.id,data);if(ws.cache.get(b.id)!==data)changed.push(b);}
        state.removed=[...ws.cache.keys()].filter(id=>!next.has(id));state.buildings=changed;
        state.events=state.events.filter(e=>e.id>ws.eventCursor);state.reset=ws.cache.size===0;ws.cache=next;
        delete state.players;delete state.clans;delete state.bases;
        if(send(ws,state,shared))ws.eventCursor=room.eventId;
      }
    }
    const elapsed=performance.now()-start;metrics.ticks++;metrics.totalTickMs+=elapsed;metrics.maxTickMs=Math.max(metrics.maxTickMs,elapsed);
  },1000/NETWORK_RULES.tickHz);tick.unref();
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},heartbeatMs);heartbeat.unref();
  return {room,wss,metrics,close:()=>{clearInterval(tick);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();return new Promise(resolve=>wss.close(resolve));}};
}
