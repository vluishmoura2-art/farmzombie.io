import { hordeSpec } from './horde-config.js';
const category=(color,size,health,speed,playerDamage,buildingDamage,stashDamage,goldReward)=>Object.freeze({color,outline:'#172018',size,health,speed,playerDamage,buildingDamage,stashDamage,goldReward});
export const ZOMBIE_TYPES=Object.freeze({
  green:category('#48B94C',.85,40,70,5,7,6,3),
  diamond:category('#55A8EA',1,160,82,15,22,19,16),
  yellow:category('#F2BD39',1.1,520,90,40,58,50,64),
});
export const ZOMBIE_ORDER=Object.freeze(Object.keys(ZOMBIE_TYPES));
export const waveWeights=wave=>ZOMBIE_ORDER.map(type=>Number(type===hordeSpec(wave).category));
export const chooseZombieType=wave=>hordeSpec(wave).category;
