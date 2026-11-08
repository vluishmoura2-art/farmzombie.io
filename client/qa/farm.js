// Isolated farm fixture: production renderer, wheat economy, wave cycle and
// zombie AI on a funded local base. It never talks to the game server.
import { World } from '../js/world.js';
import { Player } from '../js/player.js';
import { Camera } from '../js/camera.js';
import { Equipment } from '../js/equipment.js';
import { EquipmentRenderer } from '../js/equipment-renderer.js';
import { Renderer } from '../js/renderer.js';
import { Buildings } from '../js/buildings.js';
import { BuildingPlacement } from '../js/building-placement.js';
import { GoldEconomy } from '../js/gold-economy.js';
import { Combat } from '../js/combat.js';
import { VisualEffects } from '../js/visual-effects.js';

let world, player, buildings, economy, combat, renderer, camera, placement, equipment, speed = 1;
const canvas = document.querySelector('#game'), state = document.querySelector('#qa-state');

function setup() {
  world = new World();
  player = new Player(3072 + 900, 3072 + 900);
  const inventory = { wood: 100000, stone: 100000, gold: 0 };
  buildings = new Buildings(world, inventory);
  equipment = new Equipment();
  renderer ??= new Renderer(canvas, new EquipmentRenderer());
  world.feedback = new VisualEffects(renderer.profile);
  placement = new BuildingPlacement(buildings);
  buildings.place('stash', 3040, 3040, player);
  for (const [dx, dy] of [[-192, -128], [-128, -128], [-64, -128], [64, -128], [128, -128], [192, -128], [-128, 96], [128, 96]]) buildings.place('field', 3040 + dx, 3040 + dy, player);
  buildings.place('windmill', 3040, 3040 - 128, player);
  buildings.place('windmill', 3040, 3040 + 96, player);
  economy = new GoldEconomy(buildings);
  combat = new Combat(world, player, buildings, inventory);
  camera = new Camera(3072, 3040);
}

function step(dt) {
  world.resources.update(dt);
  world.feedback.update(dt);
  economy.update(dt, combat.cycle.phase);
  combat.update(dt);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (let i = 0; i < speed; i++) step(dt);
  camera.x = 3072; camera.y = 3040;
  renderer.resize();
  renderer.render(world, player, camera, equipment, placement, combat);
  const fields = buildings.items.filter(b => b.type === 'field');
  state.textContent = `Fase: ${combat.cycle.phase} · onda ${combat.cycle.wave} · ${Math.ceil(combat.cycle.remaining)}s
Ouro: ${buildings.inventory.gold} · Zumbis: ${combat.zombies.items.length}${combat.gameOver ? ' · ' + combat.reason : ''}
Trigo: ${fields.map(f => Math.round((f.growth || 0) * 100) + '%').join(' ')}`;
  requestAnimationFrame(frame);
}

document.querySelector('#speed').onclick = event => { speed = speed === 1 ? 5 : speed === 5 ? 20 : 1; event.target.textContent = `Velocidade ×${speed}`; };
document.querySelector('#ripen').onclick = () => { for (const b of buildings.items) if (b.type === 'field') b.growth = 1; };
document.querySelector('#night').onclick = () => { if (combat.cycle.phase !== 'night') combat.cycle.remaining = .01; };
document.querySelector('#reset').onclick = setup;
setup();
requestAnimationFrame(frame);
