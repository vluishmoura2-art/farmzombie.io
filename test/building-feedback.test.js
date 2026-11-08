import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingResources, missingMessage } from '../client/js/building-feedback.js';
import { roomPlacementReason } from '../client/js/placement-feedback.js';
import { World } from '../client/js/world.js';
import { Buildings } from '../client/js/buildings.js';

test('construction feedback reports exact live deficits and safely normalizes inventory', () => {
  const inventory = {wood:12,stone:3,gold:6};
  assert.equal(missingMessage('ballista',inventory),'Missing 3 stone');
  inventory.stone=6;
  assert.deepEqual(missingResources('ballista',inventory),[]);
  inventory.gold=NaN;
  assert.equal(missingMessage('ballista',inventory),'Missing 6 gold');
  assert.equal(missingMessage('stash',{}),'');
});

test('room preview rejects territory bounds, overlap, remote players and permission denial', () => {
  const buildings = new Buildings(new World(),{wood:100,stone:100,gold:100});
  const state={self:{canBuild:true,baseId:'own'},bases:[],players:[]};
  const reason=(type,x,y)=>roomPlacementReason(type,x,y,buildings,state,'me');
  assert.equal(reason('stash',0,0),'Territory must fit inside world');
  assert.equal(reason('stash',1024,1024),'');
  state.bases=[{id:'other',territory:{left:900,top:900,right:1400,bottom:1400}}];
  assert.equal(reason('stash',1024,1024),'Base territories cannot overlap');
  state.players=[{id:'other',active:true,x:1056,y:1056,radius:35}];
  assert.equal(reason('mine',1024,1024),'Player occupies footprint');
  state.players[0].active=false;
  assert.equal(reason('mine',1024,1024),'');
  state.self.canBuild=false;
  assert.equal(reason('mine',1024,1024),'Leader building permission required');
  state.self.canBuild=true;
  state.players=[{id:'me',clanId:'clan'}];state.clans=[{id:'clan',leader:'leader'}];
  assert.equal(reason('stash',1024,1024),'Only the leader can establish the clan base');
});
