import { Localization } from './localization.js';

// One dictionary instance for the menu and the game: the menu loads the
// chosen language before main.js is imported.
export const i18n = new Localization();

export function t(key, vars) {
  const text = i18n.t(key);
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export const tierName = level => t(`tier.${level}`);
export const materialName = material => t(`resource.${material}`);
export const buildingName = type => t(`building.${type}.name`);
export const buildingDescription = type => t(`building.${type}.description`);
export const equipmentName = item => item ? t(`equipment.${item.id}`, { material: t(`material.${item.tier || 1}`) }) : '';

// Gameplay modules and the server answer in English; translate at display time.
const REASONS = {
  'Not enough resources': 'reason.notEnoughResources',
  'Placement limit reached': 'reason.limitReached',
  'Place the Gold Stash first': 'reason.stashFirst',
  'Must align to the grid': 'reason.grid',
  'Outside the world': 'reason.outsideWorld',
  'Outside your base': 'reason.outsideBase',
  'Cells already occupied': 'reason.occupied',
  'Occupied by a building': 'reason.occupied',
  'Move away from the footprint': 'reason.moveAway',
  'An enemy occupies the footprint': 'reason.enemyInFootprint',
  'Natural resource occupies this footprint': 'reason.resourceInFootprint',
  'Player occupies footprint': 'reason.playerInFootprint',
  'Leader building permission required': 'reason.permission',
  'Leader has not granted building permission': 'reason.permission',
  'Building permission required': 'reason.permission',
  'Only the leader can establish the clan base': 'reason.leaderStash',
  'Only the leader can upgrade the Stash': 'reason.leaderUpgradeStash',
  'Territory must fit inside world': 'reason.territoryWorld',
  'Base territories cannot overlap': 'reason.territoryOverlap',
  'Not your base building': 'reason.notYourBuilding',
  'Unknown building': 'reason.generic',
  'Building is no longer available.': 'reason.buildingGone',
  'Maximum tier reached: Emerald.': 'reason.maxTier',
  'Upgrade the Gold Stash to unlock the next tier.': 'reason.unlockTier',
  'Upgrade the Gold Stash to unlock this tier.': 'reason.unlockTier',
  'Not enough resources for this upgrade.': 'reason.notEnoughResources',
  'Not enough resources for the entire group.': 'reason.notEnoughGroup',
  'Gold Stash upgrades individually only.': 'reason.stashIndividual',
  'Offer changed. Review the next upgrade.': 'reason.offerChanged',
  'Offer changed. Review the next tier.': 'reason.offerChanged',
  'Group changed. Review the total cost again.': 'reason.offerChanged',
  'Not enough gold.': 'reason.notEnoughGold',
  'Unknown equipment.': 'reason.generic',
  'Already in a clan': 'reason.alreadyInClan',
  'Clan limit reached': 'reason.clanLimit',
  'Clan is full': 'reason.clanFull',
  'Invalid clan name': 'reason.clanName',
  'No valid invitation': 'reason.invitation',
  'Not in a clan': 'reason.notInClan',
  'Only the leader may manage members': 'reason.leaderOnly',
  'Nickname must contain 3-16 letters, numbers or underscores': 'validation.characters',
  'Player is dead': 'reason.dead',
  'Still alive': 'reason.generic',
  'Actions unavailable': 'reason.generic',
  'Not connected': 'reason.disconnected',
  'Disconnected': 'reason.disconnected',
  'Waiting for server confirmation': 'reason.waiting',
  'You were defeated.': 'death.player',
  'Your Gold Stash was destroyed.': 'death.stash',
  'Base defense': 'death.baseDefense',
};

export function reasonText(reason) {
  if (!reason) return '';
  const key = REASONS[reason];
  if (key) return t(key);
  const defeated = /^Defeated by (.+)$/.exec(reason);
  if (defeated) return t('death.byPlayer', { name: defeated[1] });
  return reason;
}

// data-i18n → text, data-i18n-aria → aria-label, data-i18n-title → title,
// data-i18n-placeholder → placeholder.
export function applyStaticText(root) {
  for (const element of root.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of root.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t(element.dataset.i18nAria));
  for (const element of root.querySelectorAll('[data-i18n-title]')) element.title = t(element.dataset.i18nTitle);
  for (const element of root.querySelectorAll('[data-i18n-placeholder]')) element.placeholder = t(element.dataset.i18nPlaceholder);
}
