import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TowerCombat } from '../client/js/tower-combat.js';
import { Zombies } from '../client/js/zombies.js';
import { buildingStats } from '../client/js/tier-config.js';
import { towerMultiplier } from '../client/js/damage-effectiveness.js';
import { AutoAction } from '../client/js/auto-action.js';
import { World } from '../client/js/world.js';
import { Player } from '../client/js/player.js';
import { Buildings } from '../client/js/buildings.js';
import { Combat } from '../client/js/combat.js';
import { Equipment } from '../client/js/equipment.js';
import { Harvesting } from '../client/js/harvesting.js';
import { createResource } from '../client/js/resources.js';
import { Input } from '../client/js/input.js';
import { equipmentTier } from '../client/js/equipment-config.js';

for (const type of ['ballista','cannon','melee','bomb','mage']) {
  test(`${type}: exact damage once across all 27 tier/category combinations`, () => {
    for (let tier = 1; tier <= 9; tier++) for (const category of ['green','diamond','yellow']) {
      const zombies = new Zombies({gold:0});
      const z = zombies.spawn(category, 100, 32); z.health = 10000;
      const tower = {type, tier, x:0, y:0};
      const system = new TowerCombat({size:64,items:[]}, zombies);
      const attack = buildingStats(type,tier).attack;
      system.fire(tower,z,attack);
      tower.tier = 9; // In-flight shots retain the original tier.
      system.update(1);
      const expectedMultiplier = category === 'green' || tier >= ({diamond:7,yellow:9}[category]) ? 1 : ({diamond:.25,yellow:.15}[category]);
      assert.ok(Math.abs(10000-z.health-attack.damage*expectedMultiplier)<1e-8, `${tier}/${category}`);
      assert.ok(z.health<10000);
    }
  });
  test(`${type}: all green and matching strong categories can be defeated`, () => {
    for (const [category,tier] of [['green',1],['diamond',7],['yellow',9]]) {
      const zombies = new Zombies({gold:0}), z = zombies.spawn(category,100,32);
      const tower = {type,tier,x:0,y:0};
      const system = new TowerCombat({size:64,items:[tower]},zombies);
      for(let i=0;i<1200 && z.active;i++) system.update(.05);
      assert.equal(z.active,false,category); assert.equal(zombies.kills,1);
    }
    assert.ok(buildingStats(type,9).attack.damage>buildingStats(type,1).attack.damage);
    assert.ok(buildingStats(type,9).attack.cooldown<buildingStats(type,1).attack.cooldown);
  });
}
test('effectiveness accepts balancing overrides',()=>assert.equal(towerMultiplier(1,'gold',{gold:{tier:3,multiplier:.5}}),.5));

test('area, piercing and chain hits calculate effectiveness separately for each category',()=>{
  for(const type of ['ballista','cannon','melee','bomb','mage']) {
    const zombies=new Zombies({gold:0});
    const targets=['diamond','yellow'].map(category=>zombies.spawn(category,100,32));
    for(const z of targets)z.health=10000;
    const system=new TowerCombat({size:64,items:[]},zombies),attack=buildingStats(type,7).attack;
    system.fire({type,tier:7,x:0,y:0},targets[0],attack);system.update(1);
    assert.ok(Math.abs(10000-targets[0].health-attack.damage)<1e-8,type);
    assert.ok(Math.abs(10000-targets[1].health-attack.damage*.15)<1e-8,type);
  }
});

function setup() {
  const world = new World(), player = new Player(800,800), equipment = new Equipment(), harvesting = new Harvesting();
  const buildings = new Buildings(world,harvesting.inventory), combat = new Combat(world,player,buildings,harvesting.inventory);
  return {world,player,equipment,harvesting,combat,field:world.resources,auto:new AutoAction()};
}
test('all upgraded auto tools retain their existing rewards, damage and speed',()=>{
  for(let tier=1;tier<=9;tier++) {
    const s=setup();s.equipment.items[0]=equipmentTier('pickaxe',tier);s.field.add(createResource(1,'tree',870,800));
    s.auto.toggle();s.auto.update(s);assert.equal(s.harvesting.inventory.wood,s.equipment.selected.rewardPerMember);
    assert.equal(s.harvesting.cooldown,.3/s.equipment.selected.harvestSpeed);
    s.equipment.items[1]=equipmentTier('sword',tier);s.equipment.select(1);s.player.angle=0;
    const z=s.combat.zombies.spawn('yellow',880,800);z.health=10000;s.auto.update(s);
    assert.ok(Math.abs(10000-z.health-25*s.equipment.selected.damageMultiplier)<1e-8);
    assert.equal(s.combat.swordCooldown,.45/s.equipment.selected.attackSpeed);
  }
});
test('auto harvest pays whole single/double/mixed formations once and shares manual cooldown',()=>{
  for(const types of [['tree'],['stone'],['tree','tree'],['stone','stone'],['tree','stone']]) {
    const s=setup(); const members=types.map((type,i)=>createResource(i+1,type,870+i*100,800));
    for(const member of members){member.formationId=1;s.field.add(member);}
    s.field.formations.push({id:1,members});
    s.auto.toggle();s.auto.update(s);
    const expected={wood:types.filter(t=>t==='tree').length*3,stone:types.filter(t=>t==='stone').length*3,gold:0};
    assert.deepEqual(s.harvesting.inventory,expected);
    for(let i=0;i<100;i++)s.auto.update(s);
    s.harvesting.attempt(s.player,s.equipment,s.field);assert.deepEqual(s.harvesting.inventory,expected);
    s.harvesting.update(.3);s.auto.update(s);
    assert.equal(s.harvesting.inventory.wood,expected.wood*2);assert.equal(s.harvesting.inventory.stone,expected.stone*2);
  }
});
test('auto sword shares normal cone, range, damage and cooldown; blocking states cannot act',()=>{
  const s=setup();s.equipment.select(1);s.player.angle=0;
  const z=s.combat.zombies.spawn('yellow',880,800);s.auto.toggle();s.auto.update(s);
  assert.equal(z.health,495);s.combat.sword(s.equipment);s.auto.update(s);assert.equal(z.health,495);
  for(const blocked of ['Paused','Menu open','Building placement']) {s.combat.swordCooldown=0;s.auto.update({...s,blocked});assert.equal(z.health,495);assert.match(s.auto.status,/Unavailable/);}
  s.player.angle=Math.PI;s.auto.update(s);assert.equal(z.health,495);
  s.combat.swordCooldown=0;s.player.angle=0;z.x=1400;s.auto.update(s);assert.equal(z.health,495);
  s.combat.swordCooldown=0;z.x=880;s.auto.toggle();s.auto.update(s);assert.equal(z.health,495);
  s.auto.toggle();s.player.health=0;s.auto.update(s);assert.equal(s.auto.enabled,false);assert.equal(z.health,495);
});
test('central shortcut dispatch ignores repeats, typing and modifiers, supports all slots and clears movement',()=>{
  const target=new EventTarget(),input=new Input(target),calls=[];input.onShortcut=(...args)=>calls.push(args);
  const key=(code,patch={})=>{const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'code',{value:code});for(const [k,v]of Object.entries(patch))Object.defineProperty(event,k,{value:v});target.dispatchEvent(event);};
  for(const code of ['KeyE','KeyE','KeyQ','KeyB','Escape','KeyR','Digit1','Digit9','Digit0','Numpad2'])key(code);
  assert.deepEqual(calls.map(c=>c[0]),['auto','auto','equipment','shop','escape','rotate','slot','slot','slot','slot']);
  for(const patch of [{repeat:true},{ctrlKey:true},{altKey:true},{metaKey:true},{target:{tagName:'INPUT'}},{target:{tagName:'TEXTAREA'}},{target:{tagName:'SELECT'}},{target:{isContentEditable:true}}])key('KeyE',patch);
  assert.equal(calls.length,10);input.destroy();key('KeyD');assert.equal(input.x,0);
});
