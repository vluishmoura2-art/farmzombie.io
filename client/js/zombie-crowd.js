import { HORDE_BALANCE } from './horde-config.js';
// Broad phase uses cells at least as wide as the largest enemy diameter.
export function separateCrowd(list,world,dt,player){
 let moves=HORDE_BALANCE.maxCrowdMovesPerUpdate;
 const move=(entity,x,y)=>{if(moves>0){moves--;world.move(entity,x,y);}};
 const active=list.filter(z=>z.active);if(!active.length)return;
 const cell=Math.max(1,...active.map(z=>z.radius*2)),grid=new Map();
 for(const a of active){
  if(player){const dx=a.x-player.x,dy=a.y-player.y,d=Math.hypot(dx,dy),r=a.radius+player.radius;if(d<r)move(a,(d?dx/d:1)*(r-d+.001),(d?dy/d:0)*(r-d+.001));}
  const cx=Math.floor(a.x/cell),cy=Math.floor(a.y/cell);
  for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const b of grid.get(`${x}:${y}`)||[]){
   const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),r=a.radius+b.radius;if(d>=r)continue;
   const push=Math.min((r-d)/2,120*dt),nx=d?dx/d:1,ny=d?dy/d:0;move(a,nx*push,ny*push);move(b,-nx*push,-ny*push);
  }
  const key=`${Math.floor(a.x/cell)}:${Math.floor(a.y/cell)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(a);
 }
}
