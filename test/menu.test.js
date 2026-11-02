import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateNickname } from '../client/js/nickname.js';
import { suggestLanguage, translation } from '../client/js/localization.js';
import { JoinConnection } from '../client/js/join-connection.js';
import { GameRoom } from '../server/game-room.js';

test('nickname validation rejects empty, short, long, whitespace, punctuation and executable markup',()=>{
  for(const name of ['', '   ', null, 'ab', 'a'.repeat(17), 'a b', 'abc-def', '<script>', 'abc👾', 'a\nabc'])assert.equal(validateNickname(name).ok,false,String(name));
  for(const name of ['abc','Survivor_123','João_02','Árbol_1','玩家_123'])assert.deepEqual(validateNickname(`  ${name}  `),{ok:true,name});
});
test('server independently rejects invalid join and rename without changing identity',()=>{
  const room=new GameRoom();for(const name of ['x','unsafe name','abc<script>'])assert.throws(()=>room.join(undefined,name),/nickname/);
  assert.equal(room.online,0);const player=room.join(undefined,'Farm_123');
  assert.equal(room.command(player,{op:'name',seq:1,name:'bad-name'}).ok,false);assert.equal(player.name,'Farm_123');
});
test('saved locale wins; browser language suggests English/Spanish and unsupported languages fall back to pt-BR',()=>{
  assert.equal(suggestLanguage('es','en-US'),'es');assert.equal(suggestLanguage(null,'en-US'),'en');assert.equal(suggestLanguage(null,'es-MX'),'es');
  for(const language of ['pt-PT','pt-BR','fr','ja',undefined])assert.equal(suggestLanguage(null,language),'pt-BR');
});
test('all three locale files cover the same semantic menu, validation and admission keys with Portuguese fallback',async()=>{
  const locales=await Promise.all(['pt-BR','en','es'].map(async id=>JSON.parse(await readFile(new URL(`../client/locales/${id}.json`,import.meta.url),'utf8'))));
  const keys=Object.keys(locales[0]).sort();for(const dictionary of locales){assert.deepEqual(Object.keys(dictionary).sort(),keys);assert.ok(Object.values(dictionary).every(value=>typeof value==='string'&&value.length>0));}
  assert.equal(translation({},locales[0],'menu.serverFull'),locales[0]['menu.serverFull']);
  assert.equal(locales[0]['menu.play'],'JOGAR');assert.equal(locales[1]['menu.play'],'PLAY');assert.equal(locales[2]['menu.play'],'JUGAR');
});
class FakeSocket {
  static instances=[];
  constructor(){this.sent=[];FakeSocket.instances.push(this);}
  send(data){this.sent.push(JSON.parse(data));}
  close(){this.closed=true;}
  receive(message){this.onmessage({data:JSON.stringify(message)});}
}
test('Play creates one connection/request, stays pending before admission and hands off that same socket with queued states',async()=>{
  FakeSocket.instances=[];const states=[],join=new JoinConnection({url:'ws://test',WebSocketClass:FakeSocket,onState:key=>states.push(key)});
  const first=join.start(' Farm_1 ','resume-token'),second=join.start('Other_2');assert.equal(first,second);assert.equal(FakeSocket.instances.length,1);
  const ws=FakeSocket.instances[0];ws.onopen();assert.deepEqual(ws.sent,[{op:'hello',nickname:'Farm_1',token:'resume-token'}]);
  assert.deepEqual(states,['menu.connecting','menu.joining']);
  ws.receive({op:'welcome',id:'player',token:'secret',seq:0});ws.receive({op:'state',count:1});const admission=await first;
  assert.equal(admission.ws,ws);assert.equal(admission.queue.length,1);assert.equal(admission.nickname,'Farm_1');assert.equal(states.at(-1),'menu.connected');
});
test('full and failed connections return retryable localized states without admitting the game',async()=>{
  for(const response of [{op:'full'},{op:'identityError'},{op:'joinError',key:'validation.characters'}]){
    const join=new JoinConnection({url:'ws://test',WebSocketClass:FakeSocket});const promise=join.start('Farm_1'),ws=FakeSocket.instances.at(-1);ws.receive(response);
    const expected=response.op==='full'?'menu.serverFull':response.op==='identityError'?'menu.sessionUnavailable':'validation.characters';
    await assert.rejects(promise,error=>error.key===expected);assert.equal(join.pending,null);assert.equal(ws.closed,true);
  }
  const join=new JoinConnection({url:'ws://test',WebSocketClass:FakeSocket,timeoutMs:5});await assert.rejects(join.start('Farm_1'),error=>error.key==='menu.connectionFailed');
  const before=FakeSocket.instances.length;await assert.rejects(join.start('a'),error=>error.key==='validation.tooShort');assert.equal(FakeSocket.instances.length,before);
});
