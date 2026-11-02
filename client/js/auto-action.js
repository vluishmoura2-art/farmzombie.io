export class AutoAction {
  constructor() { this.enabled = false; this.status = 'OFF'; }
  toggle() { this.enabled = !this.enabled; }
  update({ player, equipment, harvesting, field, combat, blocked = '' }) {
    if (combat.gameOver || player.health <= 0) { this.enabled = false; this.status = 'OFF · Player defeated'; return; }
    if (!this.enabled) { this.status = 'OFF'; return; }
    if (blocked) { this.status = `ON · Unavailable: ${blocked}`; return; }
    if (equipment.selected.id === 'sword') {
      if (!combat.zombies.items.some(z => combat.swordEligible(z))) { this.status = 'ON / No enemy in attack arc'; return; }
      const hits = combat.sword(equipment);
      this.status = hits ? 'ON · Attacking' : combat.swordCooldown > 0 ? 'ON · Sword cooldown' : 'ON · No enemy in attack arc';
    } else {
      const result = harvesting.attempt(player, equipment, field);
      if (result.status === 'hit') player.startHarvestSwing();
      this.status = result.status === 'hit' ? 'ON · Harvesting' : result.status === 'cooldown' ? 'ON · Harvest cooldown' : 'ON · No resource in range';
    }
  }
}
