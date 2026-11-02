import { takeAdmission } from './admission.js';
import { equipmentTier } from './equipment-config.js';
import { GridOccupancy } from './grid-occupancy.js';
import { Buildings } from './buildings.js';

export class MultiplayerClient {
  constructor(models,onChange) {
    Object.assign(this,models);this.onChange=onChange;this.seq=0;this.id=null;this.ready=false;this.stopped=false;this.state=null;this.buildingMap=new Map();this.remote=new Map();this.elapsed=0;this.pending=new Map();
    this.status=document.querySelector('#network-status');this.dialog=document.querySelector('#clan-panel');
    this.dialog.querySelector('[data-clan-close]').onclick=()=>this.dialog.close();
    document.querySelector('#clan-button').onclick=()=>{this.dialog.showModal();this.renderClan();};
    this.dialog.querySelector('[data-save-name]').onclick=()=>this.send('name',{name:this.dialog.querySelector('[data-player-name]').value});
    this.dialog.querySelector('[data-create-clan]').onclick=()=>this.send('createClan',{name:this.dialog.querySelector('[data-clan-name]').value});
    this.dialog.querySelector('[data-leave-clan]').onclick=()=>this.send('leaveClan');
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.dialog.close();});
    this.connect(takeAdmission());
  }
  get open(){return this.dialog.open;}
  connect(admission){
    this.status.textContent=this.id?'Reconnecting…':'Connecting…';
    const ws=this.ws=admission?.ws || new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`);
    ws.onopen=()=>{let token;try{token=sessionStorage.getItem('zombs-session');}catch{}ws.send(JSON.stringify({op:'hello',nickname:this.nickname||this.player.name||'Survivor',...(token?{token}:{})}));};
    ws.onmessage=event=>{let m;try{m=JSON.parse(event.data);}catch{return;}
      if(m.op==='welcome'){this.id=m.id;this.seq=m.seq;this.ready=true;this.retry=0;try{sessionStorage.setItem('zombs-session',m.token);}catch{}this.status.textContent='Connected';return;}
      if(m.op==='full'){this.status.textContent='Server full · 50 / 50';this.stopped=true;return;}
      if(m.op==='identityError'){this.status.textContent='Session unavailable · reload to start again';this.stopped=true;try{sessionStorage.removeItem('zombs-session');}catch{}return;}
      if(m.op==='state'){this.apply(m);return;}
      if(m.op==='result'){this.pending.get(m.seq)?.(m);this.pending.delete(m.seq);if(!m.ok&&m.reason!=='cooldown'&&m.reason!=='out-of-range')this.message(m.reason);return;}
      if(m.op==='error')this.message(m.reason);
    };
    ws.onclose=()=>{this.ready=false;this.status.textContent=this.stopped?this.status.textContent:'Disconnected · Reconnecting…';for(const resolve of this.pending.values())resolve({ok:false,reason:'Disconnected'});this.pending.clear();if(!this.stopped){this.retry=(this.retry||0)+1;this.reconnectTimer=setTimeout(()=>this.connect(),Math.min(10000,500*2**Math.min(this.retry,4)));}};
    ws.onerror=()=>{};
    if(admission){this.nickname=admission.nickname;ws.onmessage({data:JSON.stringify(admission.welcome)});queueMicrotask(()=>{for(const event of admission.queue)ws.onmessage(event);});if(ws.readyState!==1)ws.onclose();}
  }
  message(text){document.querySelector('#network-message').textContent=text;this.dialog.querySelector('[data-clan-message]').textContent=text;}
  send(op,data={},reply){if(!this.ready||this.ws.readyState!==1||this.ws.bufferedAmount>65536){reply?.({ok:false,reason:'Not connected'});return false;}const seq=++this.seq;if(reply)this.pending.set(seq,reply);this.ws.send(JSON.stringify({op,seq,...data}));return true;}
  input(dt,blocked,auto,x,y){this.elapsed+=dt;if(this.elapsed<.05)return;this.elapsed=0;this.send('input',{x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y)),angle:this.player.angle,slot:this.equipment.selectedSlot,auto,blocked});}
  act(){this.send('input',{x:0,y:0,angle:this.player.angle,slot:this.equipment.selectedSlot,auto:false,blocked:false});this.send('action',{angle:this.player.angle});}
  apply(s){
    this.state=s;this.status.textContent=`Connected · ${s.count} / ${s.capacity} · ${s.capacity-s.count} slots free`;
    for(const p of s.players)p.clanName=s.clans.find(c=>c.id===p.clanId)?.name||'';
    const me=s.players.find(p=>p.id===this.id);if(!me)return;
    this.nickname=me.name;Object.assign(this.player,me);this.player.harvestSwingTime=me.harvestSwingTime;
    this.equipment.items=me.tiers.map((tier,i)=>equipmentTier(i?'sword':'pickaxe',tier));
    Object.assign(this.harvesting.inventory,s.self.inventory);this.harvesting.cooldown=s.self.cooldown;this.combat.swordCooldown=s.self.swordCooldown;
    this.world.resources.time=s.time;this.combat.gameOver=!me.active;this.combat.reason=s.self.deathReason;
    Object.assign(this.combat.cycle,s.self.cycle);
    if(s.reset)this.buildingMap.clear();for(const id of s.removed)this.buildingMap.delete(id);
    for(const b of s.buildings){let previous=this.buildingMap.get(b.id);if(previous)Object.assign(previous,b);else this.buildingMap.set(b.id,b);}
    const all=[...this.buildingMap.values()],own=all.filter(b=>b.baseId===s.self.baseId),base=s.bases.find(b=>b.id===s.self.baseId);
    this.buildings.items=own;this.buildings.base=base?.territory||null;this.buildings.stash=own.find(b=>b.type==='stash')||null;
    this.buildings.counts=Object.fromEntries(Object.keys(this.buildings.counts).map(type=>[type,own.filter(b=>b.type===type).length]));
    this.buildings.occupancy=new GridOccupancy();for(const b of all){b.cellX=b.x/32;b.cellY=b.y/32;this.buildings.occupancy.add(b,2);}
    this.world.buildings={size:this.buildings.size,items:all,base:this.buildings.base,resolveCollision:Buildings.prototype.resolveCollision};
    this.combat.zombies.items=s.zombies;this.combat.towers.projectiles=s.projectiles;this.combat.towers.effects=s.effects;
    const now=performance.now(),ids=new Set();
    for(const p of s.players)if(p.id!==this.id){ids.add(p.id);const previous=this.remote.get(p.id);this.remote.set(p.id,{from:previous?this.interpolate(previous,now):p,to:p,at:now});}
    for(const id of this.remote.keys())if(!ids.has(id))this.remote.delete(id);
    for(const e of s.events){if(e.kind==='damage')this.world.feedback.damage(e.x,e.y,e.amount,e.player);if(e.kind==='harvest'){const members=e.ids.map(id=>this.world.resources.items.find(n=>n.id===id)).filter(Boolean);for(const n of members){n.flashPending=true;n.hitUntil=s.time+.16;}this.world.feedback.harvest(members);}if((e.kind==='death'||e.kind==='combat')&&e.player===this.id)this.message(e.reason);}
    this.world.remotePlayers=[...this.remote.values()].map(r=>this.interpolate(r,now));this.world.networkSelf=me;
    document.querySelector('#self-identity').textContent=`${me.name}${me.clanId?' ['+(s.clans.find(c=>c.id===me.clanId)?.name||'')+']':''}`;
    const signature=JSON.stringify([s.clans,s.invitations,s.players.map(p=>[p.id,p.name,p.online,p.clanId])]);
    if(this.open&&this.clanSignature!==signature)this.renderClan();this.clanSignature=signature;this.onChange();
  }
  interpolate(r,now){const t=Math.max(0,Math.min(1,(now-r.at)/100));const da=Math.atan2(Math.sin(r.to.angle-r.from.angle),Math.cos(r.to.angle-r.from.angle));return {...r.to,x:r.from.x+(r.to.x-r.from.x)*t,y:r.from.y+(r.to.y-r.from.y)*t,angle:r.from.angle+da*t};}
  update(){const now=performance.now();this.world.remotePlayers=[...this.remote.values()].map(r=>this.interpolate(r,now));}
  renderClan(){
    if(!this.state)return;const s=this.state,me=s.players.find(p=>p.id===this.id),clan=s.clans.find(c=>c.id===me?.clanId),leader=clan?.leader===this.id;
    this.dialog.querySelector('[data-clan-status]').textContent=clan?`${clan.name} · ${clan.members.length}/4 members`:`No clan · ${s.clans.length}/10 clans`;
    this.dialog.querySelector('[data-create-section]').hidden=Boolean(clan);this.dialog.querySelector('[data-leave-clan]').hidden=!clan;
    const root=this.dialog.querySelector('[data-members]');root.replaceChildren();
    const row=(text,actions)=>{const div=document.createElement('div');div.className='clan-row';const span=document.createElement('span');span.textContent=text;div.append(span);for(const [label,fn]of actions){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=fn;div.append(button);}root.append(div);};
    for(const c of s.invitations)row(`Invitation: ${c.name}`,[['Accept',()=>this.send('invitation',{clan:c.id,accept:true})],['Reject',()=>this.send('invitation',{clan:c.id,accept:false})]]);
    for(const member of clan?.members||[])row(`${member.name} · ${member.online?'Online':'Offline'}${member.id===clan.leader?' · Leader':''} · Build ${member.canBuild?'ON':'OFF'}`,leader&&member.id!==this.id?[[member.canBuild?'Build OFF':'Build ON',()=>this.send('permission',{target:member.id,allow:!member.canBuild})],['Kick',()=>this.send('kick',{target:member.id})]]:[]);
    if(leader)for(const other of s.players.filter(p=>p.online&&!p.clanId))row(other.name,[['Invite',()=>this.send('invite',{target:other.id})]]);
  }
}
