import { validateNickname } from '../client/js/nickname.js';
import { randomUUID, randomBytes } from 'node:crypto';
import { World } from '../client/js/world.js';
import { generateResources } from '../client/js/world-generation.js';
import { Player } from '../client/js/player.js';
import { Equipment } from '../client/js/equipment.js';
import { Harvesting } from '../client/js/harvesting.js';
import { Buildings, circleOverlapsSquare } from '../client/js/buildings.js';
import { BuildingUpgrades } from '../client/js/building-upgrades.js';
import { EquipmentShop } from '../client/js/equipment-shop.js';
import { GoldEconomy } from '../client/js/gold-economy.js';
import { AutomaticHarvester } from '../client/js/automatic-harvester.js';
import { Combat } from '../client/js/combat.js';
import { BUILDING_TYPES } from '../client/js/building-config.js';

export const NETWORK_RULES = Object.freeze({ capacity:50, clans:10, members:4, tickHz:20, snapshotHz:10, graceSeconds:60, hostilitySeconds:15, maxPayload:4096, messagesPerSecond:80, maxBuffered:262144, maxZombies:512 });
const finite = n => Number.isFinite(n);
const round=(n,d=10)=>Math.round((n||0)*d)/d;
const cleanName = value => typeof value === 'string' && /^[\p{L}\p{N} _-]{1,24}$/u.test(value.trim()) ? value.trim() : null;
const keys = { input:['x','y','angle','slot','auto','blocked'], action:['angle'], place:['type','x','y'], upgrade:['id','tier','ids','all'], buy:['item','tier'], name:['name'], createClan:['name'], invite:['target'], invitation:['clan','accept'], leaveClan:[], kick:['target'], permission:['target','allow'], respawn:[] };
export class GameRoom {
  constructor(rules = NETWORK_RULES) {
    this.rules=rules; this.world=new World();generateResources(this.world);
    this.players=new Map();this.tokens=new Map();this.clans=new Map();this.time=0;this.events=[];this.eventId=0;
    this.allBuildings={size:64,items:[],revision:0,resolveCollision:entity=>{for(const p of this.players.values())p.buildings.resolveCollision(entity);}};
    this.world.buildings=this.allBuildings;
    this.allZombies={get items(){return [...this.room.players.values()].flatMap(p=>p.zombies.items);},room:this,damage:(z,n)=>{for(const p of this.players.values())if(p.zombies.items.includes(z)){const field=p.zombies,inventory=field.inventory;if(this.rewardPlayer)field.inventory=this.rewardPlayer.harvesting.inventory;try{return field.damage(z,n);}finally{field.inventory=inventory;}}}};
    this.world.zombies=this.allZombies;
    this.world.feedback={damage:(x,y,amount,player)=>this.event({kind:'damage',x,y,amount,player}),harvest:members=>this.event({kind:'harvest',ids:members.map(n=>n.id)})};
    this.world.resources.feedback=this.world.feedback;
  }
  event(data){this.events.push({id:++this.eventId,...data});if(this.events.length>128)this.events.shift();}
  get online(){return [...this.players.values()].filter(p=>p.online).length;}
  join(token, nickname) {
    if(nickname !== undefined && !validateNickname(nickname).ok)throw Error('Invalid nickname');
    this.cleanup();
    if(this.online>=this.rules.capacity)throw Error('Server full');
    let p;
    if(token){p=this.tokens.get(token);if(!p || p.online)throw Error('Invalid or active session');}
    else {
      if(this.players.size>=200)throw Error('Session capacity reached');
      const id=randomUUID(),player=new Player(3072,3072),equipment=new Equipment(),harvesting=new Harvesting();
      // Spawn in the safe central clearing; slight offsets let newcomers see each other.
      player.x+= (this.players.size%3-1)*70;player.y+=Math.floor(this.players.size%9/3)*70;
      player.health=player.maxHealth=100;player.id=id;player.active=true;player.isPlayer=true;
      const buildings=new Buildings(this.world,harvesting.inventory);this.world.buildings=this.allBuildings;
      const combat=new Combat(this.world,player,buildings,harvesting.inventory);this.world.zombies=this.allZombies;
      p={id,token:randomBytes(32).toString('hex'),name:`Player ${this.players.size+1}`,player,equipment,harvesting,buildings,combat,clanId:null,canBuild:false,online:false,lastSeq:0,input:{x:0,y:0,auto:false,blocked:true},lastInput:0,hostility:new Map(),baseId:randomUUID()};
      p.zombies=combat.zombies;
      p.upgrades=new BuildingUpgrades(buildings);p.shop=new EquipmentShop(equipment,harvesting.inventory,p.upgrades);p.economy=new GoldEconomy(buildings);p.harvester=new AutomaticHarvester(buildings);
      combat.end=reason=>{if(reason.includes('Stash')){p.baseDestroyed=true;this.kill(p,reason);}else this.kill(this.byEntity(combat.player),reason);};
      const towerTargets={get items(){return [...combat.zombies.items,...[...this.room.players.values()].filter(q=>q.player.active&&this.room.hostile(p,q)).map(q=>q.player)];},room:this,damage:(target,amount)=>target.isPlayer ? (this.hostile(p,this.byEntity(target))&&this.damagePlayer(this.byEntity(target),amount,'Base defense')) : combat.zombies.damage(target,amount)};
      combat.towers.zombies=towerTargets;combat.zombies.feedback=this.world.feedback;
      if(!this.navigation)this.navigation=combat.navigation;else combat.navigation=this.navigation;
      this.players.set(id,p);this.tokens.set(p.token,p);
    }
    if(nickname!==undefined)p.name=validateNickname(nickname).name;
    p.online=true;p.disconnectedAt=null;p.input={x:0,y:0,auto:false,blocked:true};this.event({kind:'join',player:p.id});return p;
  }
  disconnect(p){if(!p)return;p.online=false;p.disconnectedAt=this.time;p.input={x:0,y:0,auto:false,blocked:true};this.event({kind:'leave',player:p.id});}
  byEntity(entity){return this.players.get(entity?.id);}
  friendly(a,b){return Boolean(a&&b&&(a===b||a.clanId&&a.clanId===b.clanId));}
  baseFor(p){const clan=this.clans.get(p.clanId);return clan ? this.players.get(clan.leader) : p;}
  canBuild(p){return this.baseFor(p)===p||p.canBuild;}
  inside(player,base){return base&&player.x>=base.left&&player.x<=base.right&&player.y>=base.top&&player.y<=base.bottom;}
  hostile(owner,target){if(!target||!target.online||this.friendly(owner,target))return false;return this.inside(target.player,owner.buildings.base)||(owner.hostility.get(target.id)||0)>this.time;}
  markHostile(attacker,victim){for(const owner of this.players.values())if(this.friendly(owner,victim))owner.hostility.set(attacker.id,this.time+this.rules.hostilitySeconds);}
  damagePlayer(p,amount,reason){if(!p?.player.active||!finite(amount)||amount<=0)return false;this.world.feedback.damage(p.player.x,p.player.y,Math.min(amount,p.player.health),true);this.event({kind:'combat',player:p.id,reason});p.player.hitUntil=this.time+.12;p.player.health=Math.max(0,p.player.health-amount);if(!p.player.health)this.kill(p,reason);return true;}
  kill(p,reason){if(!p)return;p.player.health=0;p.player.active=false;p.deathReason=reason;p.input.auto=false;p.input.x=p.input.y=0;this.event({kind:'death',player:p.id,reason});}
  action(p){
    if(!p.player.active||p.input.blocked)return {ok:false,reason:'Actions unavailable'};
    if(p.equipment.selected.id==='pickaxe'){const r=p.harvesting.attempt(p.player,p.equipment,this.world.resources);if(r.status==='hit')p.player.startHarvestSwing();return {ok:r.status==='hit',reason:r.status};}
    const c=p.combat;if(c.swordCooldown>1e-9)return {ok:false,reason:'cooldown'};
    // The same sword function handles every zombie, including waves from other bases.
    const own=c.zombies;c.zombies=this.allZombies;this.rewardPlayer=p;try{c.sword(p.equipment);}finally{c.zombies=own;this.rewardPlayer=null;}
    for(const q of this.players.values())if(q.online&&q.player.active&&!this.friendly(p,q)&&c.swordEligible(q.player)){this.markHostile(p,q);this.damagePlayer(q,c.rules.swordDamage*p.equipment.selected.damageMultiplier,'Defeated by '+p.name);}
    this.event({kind:'swing',player:p.id});return {ok:true};
  }
  command(p,m) {
    if(!m||typeof m!=='object'||Array.isArray(m)||!Object.hasOwn(keys,m.op)||!Number.isSafeInteger(m.seq)||m.seq<=p.lastSeq)return {ok:false,reason:'Invalid or duplicate command'};
    if(Object.keys(m).some(k=>!['op','seq',...keys[m.op]].includes(k)))return {ok:false,reason:'Unexpected command fields'};
    p.lastSeq=m.seq;
    try {
      if(m.op==='input') {
        if(!finite(m.x)||!finite(m.y)||Math.abs(m.x)>1||Math.abs(m.y)>1||!finite(m.angle)||Math.abs(m.angle)>Math.PI*2||![0,1].includes(m.slot)||typeof m.auto!=='boolean'||typeof m.blocked!=='boolean')throw Error('Invalid input');
        p.input={x:m.x,y:m.y,auto:m.auto,blocked:m.blocked};p.player.angle=m.angle;p.equipment.select(m.slot);p.lastInput=this.time;return {ok:true};
      }
      if(m.op==='name'){const validation=validateNickname(m.name);if(!validation.ok)throw Error('Nickname must contain 3-16 letters, numbers or underscores');p.name=validation.name;return {ok:true};}
      if(['createClan','invite','invitation','leaveClan','kick','permission'].includes(m.op))return this.clanCommand(p,m);
      if(m.op==='respawn'){if(p.player.active)throw Error('Still alive');for(const item of [...p.buildings.items]){item.health=0;p.buildings.destroy(item);}p.zombies.items.length=0;p.combat.towers.projectiles.length=0;p.combat.cycle.phase='preparation';p.combat.cycle.wave=0;p.combat.cycle.remaining=60;p.harvesting.inventory.wood=p.harvesting.inventory.stone=p.harvesting.inventory.gold=0;p.equipment=new Equipment();p.shop.equipment=p.equipment;this.refreshBuildings();p.player.health=100;p.player.active=true;p.player.x=p.player.y=3072;p.baseDestroyed=false;p.combat.gameOver=false;return {ok:true};}
      if(!p.player.active)throw Error('Player is dead');
      if(m.op==='action'){if(!finite(m.angle)||Math.abs(m.angle)>Math.PI*2)throw Error('Invalid angle');p.player.angle=m.angle;return this.action(p);}
      const owner=this.baseFor(p),b=owner.buildings;
      if(m.op==='place') {
        if(!this.canBuild(p))throw Error('Leader has not granted building permission');
        if(!Object.hasOwn(BUILDING_TYPES,m.type))throw Error('Unknown building');
        if(m.type==='stash'&&p!==owner)throw Error('Only the leader can establish the clan base');
        if(!finite(m.x)||!finite(m.y))throw Error('Invalid coordinates');
        if(m.type==='stash'){
          const half=b.rules.baseCells*this.world.gridSize/2,cx=m.x+32,cy=m.y+32;
          if(cx-half<0||cy-half<0||cx+half>this.world.width||cy+half>this.world.height)throw Error('Territory must fit inside world');
          for(const q of this.players.values()){const r=q.buildings.base;if(q!==owner&&r&&cx-half<r.right&&cx+half>r.left&&cy-half<r.bottom&&cy+half>r.top)throw Error('Base territories cannot overlap');}
        }
        for(const item of this.allBuildings.items)if(m.x<item.x+64&&m.x+64>item.x&&m.y<item.y+64&&m.y+64>item.y)throw Error('Occupied by a building');
        for(const q of this.players.values())if(q.player.active&&circleOverlapsSquare(q.player,m.x,m.y,64))throw Error('Player occupies footprint');
        const old=b.inventory;b.inventory=p.harvesting.inventory;let result;try{result=b.place(m.type,m.x,m.y,p.player);}finally{b.inventory=old;}
        this.refreshBuildings();return result.ok?{ok:true}:{ok:false,reason:result.reason};
      }
      if(m.op==='upgrade'){
        if(!this.canBuild(p))throw Error('Building permission required');
        const item=b.items.find(item=>`${owner.baseId}:${item.id}`===m.id);if(!item)throw Error('Not your base building');
        if(item.type==='stash'&&owner!==p)throw Error('Only the leader can upgrade the Stash');
        const old=b.inventory;b.inventory=p.harvesting.inventory;
        try {const ids=Array.isArray(m.ids)?m.ids.map(id=>b.items.find(item=>`${owner.baseId}:${item.id}`===id)?.id):null;const result=m.all===true?owner.upgrades.purchaseAll(item,m.tier,ids):owner.upgrades.purchase(item,m.tier);return result.ok?{ok:true}:{ok:false,reason:result.reason};}finally{b.inventory=old;}
      }
      if(m.op==='buy'){const upgrades=p.shop.upgrades;p.shop.upgrades=owner.upgrades;try{const result=p.shop.purchase(m.item,m.tier);return result.ok?{ok:true}:{ok:false,reason:result.reason};}finally{p.shop.upgrades=upgrades;}}
      throw Error('Unknown command');
    } catch(error){return {ok:false,reason:error.message};}
  }
  clanCommand(p,m) {
    const clan=this.clans.get(p.clanId),target=this.players.get(m.target);
    if(m.op==='createClan'){
      if(clan)throw Error('Already in a clan');if(this.clans.size>=this.rules.clans)throw Error('Clan limit reached');const name=cleanName(m.name);if(!name)throw Error('Invalid clan name');
      const c={id:randomUUID(),name,leader:p.id,members:[p.id],invitations:new Map()};this.clans.set(c.id,c);p.clanId=c.id;p.canBuild=true;return {ok:true};
    }
    if(m.op==='invitation'){
      const c=this.clans.get(m.clan);if(!c||!(c.invitations.get(p.id)>this.time))throw Error('No valid invitation');
      c.invitations.delete(p.id);if(m.accept!==true)return {ok:true};
      if(clan)throw Error('Already in a clan');if(c.members.length>=this.rules.members)throw Error('Clan is full');c.members.push(p.id);p.clanId=c.id;p.canBuild=false;return {ok:true};
    }
    if(!clan)throw Error('Not in a clan');
    if(m.op==='leaveClan'){this.leaveClan(p);return {ok:true};}
    if(clan.leader!==p.id)throw Error('Only the leader may manage members');
    if(m.op==='invite'){if(!target||target.clanId||!target.online)throw Error('Player unavailable');if(clan.members.length>=this.rules.members)throw Error('Clan is full');clan.invitations.set(target.id,this.time+60);return {ok:true};}
    if(!target||target.clanId!==clan.id||target===p)throw Error('Invalid member');
    if(m.op==='kick'){this.leaveClan(target);return {ok:true};}
    if(m.op==='permission'){if(typeof m.allow!=='boolean')throw Error('Invalid permission');target.canBuild=m.allow;return {ok:true};}
    throw Error('Invalid clan command');
  }
  leaveClan(p){
    const c=this.clans.get(p.clanId);if(!c)return;
    c.members=c.members.filter(id=>id!==p.id);p.clanId=null;p.canBuild=false;
    if(!c.members.length)this.clans.delete(c.id);
    else if(c.leader===p.id){const successor=this.players.get(c.members[0]);c.leader=successor.id;successor.canBuild=true;
      // Transfer the original clan base intact. Swap any successor personal base back to the leaving leader.
      for(const key of ['baseId','buildings','upgrades','economy','harvester','baseDestroyed','combat']){const value=successor[key];successor[key]=p[key];p[key]=value;}
      // Tower/Combat bindings are rebuilt to the new owner without changing buildings or tiers.
      this.rebindBase(successor);this.rebindBase(p);
    }
  }
  rebindBase(p){
    const health=p.player.health,active=p.player.active;const old=p.combat,combat=new Combat(this.world,p.player,p.buildings,p.harvesting.inventory);this.world.zombies=this.allZombies;
    // Preserve combat progression belonging to the transferred base, and restore the player's health below.
    combat.cycle=old.cycle;combat.zombies=old.zombies;combat.zombies.inventory=p.harvesting.inventory;combat.zombies.feedback=this.world.feedback;combat.towers.projectiles=old.towers.projectiles;combat.towers.effects=old.towers.effects;combat.navigation=this.navigation;p.player.health=health;p.player.active=active;
    p.combat=combat;p.zombies=combat.zombies;p.buildings.inventory=p.harvesting.inventory;p.shop=new EquipmentShop(p.equipment,p.harvesting.inventory,p.upgrades);
    combat.end=reason=>{if(reason.includes('Stash')){p.baseDestroyed=true;this.kill(p,reason);}else this.kill(this.byEntity(combat.player),reason);};
    combat.towers.zombies={get items(){return [...combat.zombies.items,...[...this.room.players.values()].filter(q=>q.player.active&&this.room.hostile(p,q)).map(q=>q.player)];},room:this,damage:(target,amount)=>target.isPlayer?(this.hostile(p,this.byEntity(target))&&this.damagePlayer(this.byEntity(target),amount,'Base defense')):combat.zombies.damage(target,amount)};
  }
  cleanup(){for(const p of this.players.values())if(!p.online&&p.disconnectedAt!==null&&this.time-p.disconnectedAt>this.rules.graceSeconds){this.leaveClan(p);this.players.delete(p.id);this.tokens.delete(p.token);this.event({kind:'expired',player:p.id});}this.refreshBuildings();}
  refreshBuildings(){this.allBuildings.revision=[...this.players.values()].reduce((sum,p)=>sum+p.buildings.revision,0);this.allBuildings.items=[...this.players.values()].flatMap(p=>p.buildings.items);this.world.buildings=this.allBuildings;}
  tick(dt=1/20){
    this.time+=dt;this.world.resources.update(dt);this.cleanup();
    for(const p of this.players.values()){
      const input=this.time-p.lastInput>1?{x:0,y:0,auto:false,blocked:true}:p.input;
      p.harvesting.update(dt);
      if(p.online&&p.player.active){p.player.update(dt,input.blocked?{x:0,y:0}:input,this.world);if(input.auto&&!input.blocked&&(p.equipment.selected.id==='pickaxe'||[...this.allZombies.items,...[...this.players.values()].filter(q=>q.online&&!this.friendly(p,q)).map(q=>q.player)].some(z=>p.combat.swordEligible(z))))this.action(p);}
      if(p.buildings.stash){p.economy.update(dt);p.harvester.update(dt);}
      // Existing simulation is shared: menus stop commands, never freeze the world.
      const c=p.combat;c.swordCooldown=Math.max(0,c.swordCooldown-dt);p.player.swordSwingTime=Math.max(0,(p.player.swordSwingTime||0)-dt);
      c.cycle.update(dt,Boolean(p.buildings.stash),wave=>this.allZombies.items.length<this.rules.maxZombies&&c.spawn(wave));
      for(const q of this.players.values())if(q.player.active&&!this.friendly(p,q)&&this.inside(q.player,p.buildings.base))p.hostility.set(q.id,this.time+this.rules.hostilitySeconds);
      c.towers.update(dt);c.pathsUsed=0;
      for(const z of c.zombies.items)if(z.active){const original=c.player;let nearest=null,distance=Infinity;for(const q of this.players.values())if(q.online&&q.player.active){const d=Math.hypot(z.x-q.player.x,z.y-q.player.y);if(d<distance){nearest=q.player;distance=d;}}c.player=nearest||original;c.updateZombie(z,dt);c.player=original;}
      c.zombies.update(dt);
      if(p.player.active&&c.cycle.phase==='day'&&!this.allZombies.items.some(z=>Math.hypot(z.x-p.player.x,z.y-p.player.y)<c.rules.aggroRange))p.player.health=Math.min(100,p.player.health+c.rules.dayHealingPerSecond*dt);
      for(const [id,until]of p.hostility)if(until<this.time)p.hostility.delete(id);
    }
    this.refreshBuildings();
  }
  publicPlayer(p){const e=p.player;return {id:p.id,name:p.name,clanId:p.clanId,online:p.online,x:round(e.x),y:round(e.y),angle:round(e.angle,1000),health:round(e.health,100),maxHealth:e.maxHealth,active:e.active,radius:e.radius,walkPhase:round(e.walkPhase,100),harvestSwingTime:round(e.harvestSwingTime,100),swordSwingTime:round(e.swordSwingTime,100),hitUntil:round(e.hitUntil,100),slot:p.equipment.selectedSlot,tiers:p.equipment.items.map(e=>e.tier)};}
  snapshot(p,common){
    const owner=this.baseFor(p),b=owner.buildings,near=z=>Math.hypot(z.x-p.player.x,z.y-p.player.y)<1800;
    const clans=common?.clans || [...this.clans.values()].map(c=>({id:c.id,name:c.name,leader:c.leader,members:c.members.map(id=>{const q=this.players.get(id);return {id,name:q.name,online:q.online,canBuild:q.canBuild};})}));
    return {op:'state',time:this.time,count:this.online,capacity:this.rules.capacity,players:common?.players || [...this.players.values()].map(q=>this.publicPlayer(q)),clans,invitations:[...this.clans.values()].filter(c=>(c.invitations.get(p.id)||0)>this.time).map(c=>({id:c.id,name:c.name})),self:{id:p.id,inventory:p.harvesting.inventory,baseId:owner.baseId,canBuild:this.canBuild(p),cooldown:p.harvesting.cooldown,swordCooldown:p.combat.swordCooldown,deathReason:p.deathReason||'',cycle:{phase:owner.combat.cycle.phase,wave:owner.combat.cycle.wave,remaining:round(owner.combat.cycle.remaining,100)}},bases:common?.bases || [...this.players.values()].filter(q=>q.buildings.base).map(q=>({id:q.baseId,ownerId:q.id,clanId:q.clanId,territory:q.buildings.base})),buildings:common?.buildings || [...this.players.values()].flatMap(q=>q.buildings.items.map(b=>({id:`${q.baseId}:${b.id}`,baseId:q.baseId,type:b.type,x:b.x,y:b.y,tier:b.tier,health:b.health,maxHealth:b.maxHealth,active:b.active,angle:b.angle,createdAt:b.createdAt,hitUntil:b.hitUntil||0,upgradedAt:b.upgradedAt}))),zombies:[...this.players.values()].flatMap(q=>q.combat.zombies.items.filter(near).map(z=>({id:`${q.id}:${z.id}`,type:z.type,x:z.x,y:z.y,angle:z.angle,radius:z.radius,health:z.health,maxHealth:z.maxHealth,active:z.active,hitFlash:z.hitFlash,walkPhase:z.walkPhase}))),projectiles:[...this.players.values()].flatMap(q=>q.combat.towers.projectiles.filter(near).map(({hit,...rest})=>rest)),effects:[...this.players.values()].flatMap(q=>q.combat.towers.effects.filter(near)),events:this.events};
  }
}
