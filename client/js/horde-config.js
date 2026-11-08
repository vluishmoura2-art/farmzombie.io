// Phase 15 balance: durations are spawn windows; blocked spawns retry without losing quota.
export const HORDE_BALANCE = Object.freeze({
  maxCrowdMovesPerUpdate: 512, maxSpawnsPerUpdate: 4, maxRadiusScale: 2.6, maxAttribute: 1e9, maxReward: 100000,
  endlessHealthGrowth: .12, endlessDamageGrowth: .08, endlessSizeGrowth: .025, endlessRewardGrowth: .04,
});
export const ZOMBIE_SIZES = Object.freeze({
  small: {scale:.65,health:.6,damage:.6,reward:.65,speed:1.12},
  normal: {scale:1,health:1,damage:1,reward:1,speed:1},
  large: {scale:1.4,health:1.7,damage:1.4,reward:1.6,speed:.9},
});
export const HORDE_BANDS = Object.freeze([
  {from:1,to:5,category:'green',sizes:{normal:1},duration:10,rate:1,health:1,damage:1,reward:1,recommendedTier:1},
  {from:6,to:9,category:'green',sizes:{normal:1},duration:10,rate:2,health:1.1,damage:1.1,reward:1.1,recommendedTier:2,ramp:.08},
  {from:10,to:15,category:'green',sizes:{small:.25,normal:.5,large:.25},duration:10,rate:5,health:1.15,damage:1.15,reward:1.2,recommendedTier:2},
  {from:16,to:20,category:'green',sizes:{large:1},duration:20,rate:10,health:1.5,damage:1.5,reward:1.5,recommendedTier:5,ramp:.08},
  {from:21,to:25,category:'diamond',sizes:{normal:1},duration:30,rate:5,health:1,damage:1,reward:1,recommendedTier:7,ramp:.04},
  {from:26,to:30,category:'diamond',sizes:{large:1},duration:40,rate:5,health:1.4,damage:1.3,reward:1.4,recommendedTier:7,ramp:.06},
  {from:31,to:35,category:'yellow',sizes:{normal:1},duration:40,rate:5,health:1,damage:1,reward:1,recommendedTier:9,ramp:.06},
  {from:36,to:Infinity,category:'yellow',sizes:{large:1},duration:40,rate:5,health:1.5,damage:1.4,reward:1.5,recommendedTier:9},
]);
export function hordeSpec(number) {
  const wave=Number.isFinite(number)?Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(number))):1;
  const band=HORDE_BANDS.find(b=>wave<=b.to), step=wave-band.from;
  const endless=band.to===Infinity;
  const growth=endless?Math.log1p(step):step*(band.ramp||0);
  return {...band,wave,target:Math.round(band.duration*band.rate),
    healthMultiplier:band.health*(1+growth*(endless?HORDE_BALANCE.endlessHealthGrowth:1)),
    damageMultiplier:band.damage*(1+growth*(endless?HORDE_BALANCE.endlessDamageGrowth:1)),
    rewardMultiplier:band.reward*(1+growth*(endless?HORDE_BALANCE.endlessRewardGrowth:1)),
    sizeMultiplier:1+(endless?growth*HORDE_BALANCE.endlessSizeGrowth:band.ramp?step*band.ramp*.15:0),endless};
}
export function chooseSize(spec,random=Math.random){let sample=random();for(const [size,weight] of Object.entries(spec.sizes)){sample-=weight;if(sample<0)return size;}return 'normal';}
