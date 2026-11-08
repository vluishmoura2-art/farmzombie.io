import { COMBAT_RULES } from './combat-config.js';
import { HORDE_BALANCE, hordeSpec } from './horde-config.js';
export class WaveCycle {
  constructor(rules=COMBAT_RULES){this.rules=rules;this.reset();}
  reset(){this.phase='preparation';this.wave=0;this.remaining=this.rules.daySeconds;this.pending=0;this.spawnTimer=0;this.spawned=0;}
  snapshot(){const spec=hordeSpec(this.wave||1);return {phase:this.phase,wave:this.wave,remaining:this.remaining,pending:this.pending,spawned:this.spawned,category:spec.category,nextCategory:hordeSpec(this.wave+1).category,recommendedTier:spec.recommendedTier,endless:spec.endless};}
  update(dt,hasStash,spawn){
    if(!hasStash||!Number.isFinite(dt)||dt<=0)return;
    if(this.phase==='preparation')this.phase='day';
    // Bound catch-up work after stalls; never burst an entire horde in one frame.
    if(this.phase==='day'){
      this.remaining=Math.max(0,this.remaining-dt);
      if(this.remaining>1e-9)return;
      this.wave=Math.min(Number.MAX_SAFE_INTEGER,this.wave+1);this.phase='night';
      const spec=hordeSpec(this.wave);this.remaining=spec.duration;this.pending=spec.target;this.spawned=0;this.spawnTimer=1/spec.rate;
      return;
    }
    const spec=hordeSpec(this.wave);
    this.remaining=Math.max(0,this.remaining-dt);this.spawnTimer-=dt;
    let budget=HORDE_BALANCE.maxSpawnsPerUpdate;
    while(this.pending>0&&this.spawnTimer<=1e-9&&budget-->0){
      if(!spawn(this.wave)){this.spawnTimer=1/spec.rate;break;}
      this.pending--;this.spawned++;this.spawnTimer+=1/spec.rate;
    }
    if(this.remaining<=1e-9&&this.pending===0){this.phase='day';this.remaining=this.rules.daySeconds;}
  }
}
