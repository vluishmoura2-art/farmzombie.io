import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../client/js/world.js';
import { Player } from '../client/js/player.js';
import { Buildings, circleOverlapsSquare } from '../client/js/buildings.js';
import { generateResources, FORMATION_TYPES } from '../client/js/world-generation.js';
import { createResource } from '../client/js/resources.js';
import { Harvesting } from '../client/js/harvesting.js';
import { Equipment } from '../client/js/equipment.js';
import { AutomaticHarvester } from '../client/js/automatic-harvester.js';
import { ResourceHUD } from '../client/js/resource-hud.js';
import { readFileSync } from 'node:fs';
import { i18n } from '../client/js/i18n.js';
i18n.dictionaries.set('en', JSON.parse(readFileSync(new URL('../client/locales/en.json', import.meta.url), 'utf8')));
i18n.language = 'en';
import { Camera } from '../client/js/camera.js';

test('all five formation types have exact membership', () => {
  const world = new World(); generateResources(world);
  assert.deepEqual([...new Set(world.resources.formations.map(f => f.type))].sort(), ['A','B','C','D','E']);
  let total = 0;
  for (const formation of world.resources.formations) {
    const config = FORMATION_TYPES[formation.type];
    assert.equal(formation.members.length, config.count);
    for (const [index, member] of formation.members.entries()) {
      assert.equal(member.type, config.memberTypes?.[index] || config.resource);
      assert.equal(member.formationId, formation.id);
      assert.ok(world.resources.items.includes(member));
    }
    if (config.count === 2) {
      const [a,b] = formation.members;
      assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-(a.radius+b.radius+12)) < 1e-8);
    }
    total += config.count;
  }
  assert.equal(total, 320);
});

test('generation checks existing buildings and commits formations atomically', () => {
  const world = new World(), player = new Player(1000,1000);
  const buildings = new Buildings(world,{wood:100,stone:100,gold:100});
  const stash = buildings.place('stash',3232,3104,player).building;
  assert.ok(stash); generateResources(world);
  assert.equal(world.resources.items.length,320);
  for(const node of world.resources.items) assert.equal(circleOverlapsSquare(node,stash.x,stash.y,buildings.size),false);
  for(const formation of world.resources.formations) assert.equal(formation.members.length,FORMATION_TYPES[formation.type].count);
});


function fixture(types) {
  const world = new World(), player = new Player(1000, 920), equipment = new Equipment(), h = new Harvesting();
  const members = types.map((type, i) => createResource(`member-${i}`, type, 1000 + i * 103, 1000));
  const formation = { id: 'pair', type: types.join('+'), x: 1051.5, y: 1000, members };
  for (const node of members) { node.formationId = formation.id; world.resources.add(node); }
  world.resources.formations.push(formation);
  return { world, player, equipment, h, formation, members };
}
for (const [types, wood, stone] of [[['tree'],3,0], [['stone'],0,3], [['tree','tree'],6,0], [['stone','stone'],0,6], [['tree','stone'],3,3]]) {
  test(`${types.join('+')} pays for every member simultaneously, indefinitely`, () => {
    const {world,player,equipment,h,formation,members} = fixture(types);
    const unrelated = createResource('unrelated','stone',1000,1005); world.resources.add(unrelated);
    for (let i=1;i<=1000;i++) {
      world.resources.update(.3);
      const result = h.attempt(player,equipment,world.resources,-9999,9999);
      assert.equal(result.formation,formation); assert.equal(result.amount,wood+stone);
      assert.deepEqual(result.rewards,{wood,stone});
      assert.deepEqual(h.inventory,{wood:i*wood,stone:i*stone,gold:0});
      for (const member of members) { assert.equal(member.hitUntil,world.resources.time+.16); assert.equal(member.active,true); assert.equal('health' in member,false); }
      assert.equal(unrelated.hitUntil,0);
      assert.equal(h.attempt(player,equipment,world.resources).status,'cooldown');
      h.update(.299); assert.equal(h.attempt(player,equipment,world.resources).status,'cooldown'); h.update(.001);
    }
    assert.equal(world.resources.items.length,members.length+1);
  });
}
test('closest formation uses world distance, ignores cursor/camera and preserves facing', () => {
  const {world,player,equipment,h,formation,members} = fixture(['tree','stone']);
  const single=createResource('single','stone',1000,990);world.resources.add(single);
  player.angle=2; const camera=new Camera(500,500);
  camera.update(.1,player);
  assert.equal(h.attempt(player,equipment,world.resources,camera.screenToWorldX(-999,1280),0).resource,single);
  assert.equal(h.inventory.wood,0);h.update(.3);
  player.x=members[1].x; player.y=920;
  assert.equal(h.attempt(player,equipment,world.resources).formation,formation);
  assert.deepEqual(h.inventory,{wood:3,stone:6,gold:0});assert.equal(player.angle,2);
});
test('formation boundary, sword and invalid members reject whole actions', () => {
  const {world,player,equipment,h,members} = fixture(['tree','stone']);
  player.y=899.99;assert.equal(h.attempt(player,equipment,world.resources).status,'out-of-range');
  player.y=900;equipment.select(1);assert.equal(h.attempt(player,equipment,world.resources).status,'wrong-tool');equipment.select(0);
  members[1].rewardPerHit=NaN;assert.equal(h.attempt(player,equipment,world.resources).status,'out-of-range');
  assert.deepEqual(h.inventory,{wood:0,stone:0,gold:0});assert.equal(members[0].hitUntil,0);
  members[1].rewardPerHit=3;assert.equal(h.attempt(player,equipment,world.resources).amount,6);
});
test('automatic and manual formation actions share accounting without duplicate payouts', () => {
  const {world,player,equipment,h,formation} = fixture(['tree','stone']);
  h.attempt(player,equipment,world.resources);
  const buildings={items:[{type:'harvester',x:1000,y:920,harvestElapsed:0}],rules:{harvestInterval:2,harvestRange:260},world,inventory:h.inventory,size:64};
  const automatic=new AutomaticHarvester(buildings);
  automatic.update(1.999);assert.deepEqual(h.inventory,{wood:3,stone:3,gold:0});
  automatic.update(.001);assert.deepEqual(h.inventory,{wood:6,stone:6,gold:0});
  automatic.update(6);assert.deepEqual(h.inventory,{wood:15,stone:15,gold:0});
  assert.equal(formation.members[0].hitUntil,formation.members[1].hitUntil);
});
test('mixed HUD immediately displays both rewards and totals', () => {
  const {world,player,equipment,h}=fixture(['tree','stone']);
  const hud={inventory:h.inventory,wood:{},stone:{},gold:{},feedback:{},refresh:ResourceHUD.prototype.refresh};
  ResourceHUD.prototype.show.call(hud,h.attempt(player,equipment,world.resources));
  assert.equal(hud.wood.value,'3');assert.equal(hud.stone.value,'3');assert.equal(hud.feedback.textContent,'Wood +3 · Stone +3');
});
