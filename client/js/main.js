import { MultiplayerClient } from './multiplayer-client.js';
import { AutoAction } from './auto-action.js';
import { VisualEffects } from './visual-effects.js';
import { Minimap } from './minimap.js';
import { TouchControls } from './touch-controls.js';
import { EquipmentShop } from './equipment-shop.js';
import { ShopUI, bindShopControls } from './shop-ui.js';
import { BuildingUpgrades } from './building-upgrades.js';
import { UpgradeUI } from './upgrade-ui.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { Renderer } from './renderer.js';
import { Equipment } from './equipment.js';
import { EquipmentRenderer } from './equipment-renderer.js';
import { EquipmentHUD } from './equipment-hud.js';
import { generateResources } from './world-generation.js';
import { Harvesting } from './harvesting.js';
import { ResourceHUD } from './resource-hud.js';
import { Buildings } from './buildings.js';
import { BuildingPlacement } from './building-placement.js';
import { BuildingHUD } from './building-hud.js';
import { roomPlacementReason } from './placement-feedback.js';
import { Combat } from './combat.js';
import { CombatHUD } from './combat-hud.js';
import { t, applyStaticText } from './i18n.js';

applyStaticText(document.querySelector('#game-shell'));

const canvas = document.querySelector('#game');
const world = new World();
generateResources(world);
const player = new Player(world.width / 2, world.height / 2);
const camera = new Camera(player.x, player.y);
const input = new Input(window, canvas);
const equipment = new Equipment();
const equipmentDrawing = new EquipmentRenderer();
const renderer = new Renderer(canvas, equipmentDrawing);
world.feedback = new VisualEffects(renderer.profile);
world.resources.feedback = world.feedback;
const minimap = new Minimap(document.querySelector('#minimap'), renderer.profile);
const equipmentHUD = new EquipmentHUD(document.querySelector('#equipment'), equipment, equipmentDrawing);
const harvesting = new Harvesting();
const autoAction = new AutoAction();
const autoButton = document.querySelector('#auto-action');
autoButton.addEventListener('click', () => { if (!paused && !combat.gameOver && !shopUI.open && !upgradeUI.open) autoAction.toggle(); });
const resourceHUD = new ResourceHUD(document.querySelector('#resource-counters'), harvesting.inventory);
const buildings = new Buildings(world, harvesting.inventory);
const placement = new BuildingPlacement(buildings);
const buildingHUD = new BuildingHUD(document.querySelector('#building-bar'), placement, renderer.buildingDrawing);
const combat = new Combat(world, player, buildings, harvesting.inventory);
const combatHUD = new CombatHUD(combat);
input.onSelectEquipment = (slot) => { placement.cancel(); equipmentHUD.select(slot); buildingHUD.refresh(); };
document.querySelector('#equipment').addEventListener('click', () => { placement.cancel(); buildingHUD.refresh(); }, true);
let pointerOnWorld = false;
window.addEventListener('pointermove', event => { pointerOnWorld = event.target === canvas; });
function inspectAt(clientX, clientY, shiftKey = false) {
  if (paused || combat.gameOver || upgradeUI.open || shopUI.open || network.open || !network.ready) return;
  placement.cancel(); buildingHUD.refresh(); clearControls();
  const rect = canvas.getBoundingClientRect();
  const x = camera.screenToWorldX(clientX - rect.left, renderer.width);
  const y = camera.screenToWorldY(clientY - rect.top, renderer.height);
  const building = buildings.items.find(b => b.active && x >= b.x && x <= b.x + buildings.size && y >= b.y && y <= b.y + buildings.size);
  if (building) upgradeUI.show(building, shiftKey);
}
canvas.addEventListener('contextmenu', event => { event.preventDefault(); inspectAt(event.clientX,event.clientY,event.shiftKey); });
const overlay = document.querySelector('#pause-overlay');
const pauseButton = document.querySelector('#pause-button');
const resumeButton = document.querySelector('#resume-button');
let paused = false;
let renderDirty = true;
let previousTime = null;
let hudElapsed = 0;
const upgrades = new BuildingUpgrades(buildings);
const upgradeUI = new UpgradeUI(document.querySelector('#upgrade-panel'), upgrades, renderer.buildingDrawing,
  () => { renderDirty=true; resourceHUD.refresh(); buildingHUD.refresh(); combatHUD.refresh(); },
  () => { clearControls(); canvas.focus({ preventScroll: true }); });
const equipmentShop = new EquipmentShop(equipment, harvesting.inventory, upgrades);
const shopUI = new ShopUI(document.querySelector('#shop-panel'), equipmentShop, equipmentDrawing,
  () => { renderDirty=true; resourceHUD.refresh(); equipmentHUD.refresh(); equipmentHUD.resize(); buildingHUD.refresh(); },
  () => { clearControls(); canvas.focus({ preventScroll: true }); });
const network = new MultiplayerClient({world,player,equipment,harvesting,buildings,combat}, () => {
  renderDirty=true;resourceHUD.refresh();buildingHUD.refresh();equipmentHUD.refresh();combatHUD.refresh();
  if(upgradeUI.open){ if(buildings.items.includes(upgradeUI.building))upgradeUI.refresh();else upgradeUI.close(); }
  if(shopUI.open)shopUI.refresh();
});
combatHUD.onRestart=()=>network.send('respawn',{},result=>{if(result.ok){document.querySelector('#game-over').hidden=true;autoAction.enabled=false;network.message(t('msg.respawned'));}});
const sendUpgrade=(building,tier,ids,all)=>{
  network.send('upgrade',{id:building?.id,tier,...(all?{ids,all:true}:{})},result=>network.message(result.ok?t('msg.upgraded'):result.reason));
  return {ok:false,reason:'Waiting for server confirmation'};
};
upgrades.purchase=(b,tier)=>sendUpgrade(b,tier,null,false);
upgrades.purchaseAll=(b,tier,ids)=>sendUpgrade(b,tier,ids,true);
equipmentShop.purchase=(item,tier)=>{network.send('buy',{item,tier},r=>network.message(r.ok?t('msg.purchased'):r.reason));return {ok:false,reason:'Waiting for server confirmation'};};
const localAvailability=buildings.availability.bind(buildings);
buildings.availability=type=>network.state&&!network.state.self.canBuild?'Leader building permission required':localAvailability(type);
const localPlacementValidation = buildings.validate.bind(buildings);
buildings.validate = (type,x,y,player) => localPlacementValidation(type,x,y,player) || roomPlacementReason(type,x,y,buildings,network.state,network.id);
bindShopControls(window, document.querySelector('#shop-button'), shopUI,
  () => !paused && !combat.gameOver && !upgradeUI.open && !shopUI.open && !network.open,
  () => { clearControls(); placement.cancel(); buildingHUD.refresh(); }, false);
input.onHarvest = (screenX, screenY) => {
  if (paused || combat.gameOver || upgradeUI.open || shopUI.open || network.open || !network.ready) return;
  const worldX = camera.screenToWorldX(screenX, renderer.width);
  const worldY = camera.screenToWorldY(screenY, renderer.height);
  player.aimAt(worldX, worldY);
  if (placement.selected) {
    if (placement.pending) return;
    placement.update(worldX,worldY,player);
    if (placement.reason) { buildingHUD.show({ok:false,reason:placement.reason}); return; }
    const grid=world.gridSize;
    const request = {type:placement.selected,x:Math.floor(worldX/grid)*grid,y:Math.floor(worldY/grid)*grid};
    placement.pending = request; buildingHUD.refresh();
    network.send('place',request,result=>{
      placement.pending=null;
      buildingHUD.show(result.ok ? {ok:true,building:request} : result);
      network.message(result.ok?'':result.reason);
    });
    return;
  }
  network.act();
};

const touch = new TouchControls(document.querySelector('#touch-controls'), canvas, input,
  () => input.onHarvest(input.hasPointer ? input.pointerX : renderer.width/2+Math.cos(player.angle)*100,
    input.hasPointer ? input.pointerY : renderer.height/2+Math.sin(player.angle)*100), inspectAt);
const movement = { x: 0, y: 0 };
function clearControls() { input.clear(); touch.clear(); if(network.ready)network.send('input',{x:0,y:0,angle:player.angle,slot:equipment.selectedSlot,auto:false,blocked:true}); }
const touchMode = document.querySelector('#touch-mode');
touchMode.checked=window.matchMedia('(pointer:coarse)').matches;
const setTouchMode=()=>{document.documentElement.classList.toggle('touch-enabled',touchMode.checked);touch.clear();};
touchMode.addEventListener('change',setTouchMode);setTouchMode();
const quality = document.querySelector('#performance-mode');
quality.addEventListener('change', () => {
  renderDirty=true;renderer.setMode(quality.value); world.feedback.setProfile(renderer.profile); minimap.profile=renderer.profile;minimap.last=-Infinity;
  document.documentElement.dataset.performance=quality.value;
});

function setPaused(value) {
  if (combat.gameOver) return;
  paused = value;renderDirty=true;
  clearControls();
  previousTime = null;
  overlay.hidden = !paused;
  pauseButton.setAttribute('aria-label', t(paused ? 'game.resume' : 'game.pause'));
  if (paused) resumeButton.focus({ preventScroll: true });
  else canvas.focus({ preventScroll: true });
}

pauseButton.addEventListener('click', () => setPaused(!paused));
resumeButton.addEventListener('click', () => setPaused(false));
input.onShortcut = (action, slot) => {
  if (action === 'escape') {
    if(network.open){network.dialog.close();return;}
    if (shopUI.open) { shopUI.close(); return; }
    if (upgradeUI.open) { upgradeUI.close(); return; }
    if (placement.selected && !paused) { placement.cancel(); buildingHUD.refresh(); return; }
    setPaused(!paused); return;
  }
  if (action === 'shop' && shopUI.open) { shopUI.close(); return; }
  if (paused || combat.gameOver || upgradeUI.open || shopUI.open || network.open || !network.ready) return;
  if (action === 'auto') autoAction.toggle();
  if (action === 'equipment') input.onSelectEquipment(1 - equipment.selectedSlot);
  if (action === 'shop') { clearControls(); placement.cancel(); buildingHUD.refresh(); shopUI.show(); }
  if (action === 'slot') {
    if (slot === 1 || slot === 2) input.onSelectEquipment(slot - 1);
    else buildingHUD.buttons[slot === 0 ? 7 : slot - 3]?.click();
  }
  // Existing square buildings have no directional behavior to rotate.
};
window.addEventListener('blur', () => setPaused(true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
});
window.addEventListener('resize', () => {
  renderDirty=true;renderer.resize();
  equipmentHUD.resize();
  buildingHUD.resize();
  input.refreshPointer();
});
canvas.addEventListener('pointerdown', () => canvas.focus({ preventScroll: true }));

function frame(timestamp) {
  // Discard long tab/sleep gaps instead of teleporting the player on return.
  const realDelta = previousTime === null ? 0 : (timestamp - previousTime) / 1000;
  const deltaTime = Math.min(realDelta, .05);
  renderer.metrics.tick(realDelta);
  previousTime = timestamp;
  const running = network.ready && !paused && !combat.gameOver && !upgradeUI.open && !shopUI.open && !network.open;
  if (running) {
    world.feedback.update(deltaTime);
    resourceHUD.update(deltaTime);
    buildingHUD.update(deltaTime);
    movement.x=input.x+touch.x; movement.y=input.y+touch.y;
    player.update(deltaTime, movement, world);
    if (combat.gameOver) { clearControls(); placement.cancel(); combatHUD.refresh(); }
    camera.update(deltaTime, player);
    // Recompute from the current camera every frame, even if the cursor has
    // not moved. Screen coordinates are CSS pixels, independent of DPR.
    if (input.hasPointer) {
      player.aimAt(camera.screenToWorldX(input.pointerX, renderer.width), camera.screenToWorldY(input.pointerY, renderer.height));
    }
  }
  const blocked = !running || Boolean(placement.selected);
  network.input(Math.max(0,realDelta),blocked,autoAction.enabled,input.x+touch.x,input.y+touch.y);
  network.update();
  if(!player.active && network.ready)autoAction.enabled=false;
  autoAction.status=!autoAction.enabled?'off':!network.ready||blocked?'paused':equipment.selected.id==='sword'?'attack':'harvest';
  autoButton.setAttribute('aria-pressed', String(autoAction.enabled));
  const autoText = t(`auto.${autoAction.status}`);
  if (autoButton.textContent !== autoText) autoButton.textContent = autoText;
  // A DPR change can happen when moving the window between monitors.
  if (renderer.pixelRatio !== renderer.targetRatio) {
    renderDirty=true;renderer.resize();
    equipmentHUD.resize();
    buildingHUD.resize();
  }
  placement.update(camera.screenToWorldX(input.pointerX, renderer.width), camera.screenToWorldY(input.pointerY, renderer.height), player, input.hasPointer && pointerOnWorld && !paused && !combat.gameOver && !upgradeUI.open && !shopUI.open && !network.open);
  if(network.ready || renderDirty){renderer.render(world, player, camera, equipment, placement, combat);renderDirty=false;}
  minimap.update(timestamp,world,player,combat);
  hudElapsed += deltaTime;
  if (hudElapsed >= .1) {
    // Read by the QA browser scripts; not shown in the HUD.
    canvas.dataset.playerX = String(Math.round(player.x));
    canvas.dataset.playerY = String(Math.round(player.y));
    resourceHUD.refresh();
    buildingHUD.refresh();
    combatHUD.refresh();
    if (paused) document.querySelector('#performance-stats').textContent = `${renderer.metrics.fps || '—'} FPS`;
    hudElapsed = 0;
  }
  requestAnimationFrame(frame);
}

canvas.focus({ preventScroll: true });
requestAnimationFrame(frame);
