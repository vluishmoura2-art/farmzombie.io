// Visual dimensions only. Physics, rewards and weapon statistics live elsewhere.
export const INK = '#080A09';
export const PLAYER_ART = Object.freeze({ radius: 24, outline: 4, skin: '#E8B18A', eyeRadius: 2.5 });
export const TOOL_ATTACHMENT = Object.freeze({ x: 14, y: 12 });
export const TOOL_ART = Object.freeze({ handle: '#8B5A2B', steel: '#95A5A6', highlight: '#FFFFFF', outline: 3 });
export const TREE_ART = Object.freeze({ points: 8, outer: 42, inner: 32, lightOuter: 34, lightInner: 25,
  dark: '#455F27', light: '#70B33B', trunk: '#493320', outline: 3.5 });
export const ROCK_ART = Object.freeze({ base: '#34495E', upper: '#7F8C8D', highlight: '#A3AEAE', outline: 3.5,
  points: Object.freeze([[-25,-8],[-12,-24],[13,-21],[27,-2],[15,23],[-18,20]].map(Object.freeze)) });
export const RESOURCE_IMPACT_DURATION = .16;
export function resourceImpactScale(hitUntil, time) {
  const remaining = hitUntil - time;
  if (remaining <= 0 || remaining > RESOURCE_IMPACT_DURATION) return 1;
  return 1 + .05 * Math.sin(Math.PI * (1 - remaining / RESOURCE_IMPACT_DURATION));
}
