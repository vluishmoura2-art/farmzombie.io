import { INK, TREE_ART, ROCK_ART } from './art-config.js';
export function starVertices(points, outer, inner, dx=0, dy=0) {
  return Object.freeze(Array.from({length:points*2},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/points,radius=i%2?inner:outer;return Object.freeze([dx+Math.cos(angle)*radius,dy+Math.sin(angle)*radius]);}));
}
export const TREE_CANOPY=starVertices(TREE_ART.points,TREE_ART.outer,TREE_ART.inner);
export const TREE_LIGHT_CANOPY=starVertices(TREE_ART.points,TREE_ART.lightOuter,TREE_ART.lightInner,-3,-4);
const ROCK_UPPER=Object.freeze([[-25,-8],[-12,-24],[13,-21],[18,-2],[-5,9],[-20,6]]);
const ROCK_FACET=Object.freeze([[13,-21],[27,-2],[15,23],[-5,9],[18,-2]]);
export function polygon(ctx, vertices) {
  ctx.beginPath();ctx.moveTo(vertices[0][0],vertices[0][1]);
  for(let i=1;i<vertices.length;i++)ctx.lineTo(vertices[i][0],vertices[i][1]);ctx.closePath();
}
export function drawResourceArt(ctx, type, flash=false) {
  ctx.strokeStyle=INK;ctx.lineJoin='miter';
  if(type==='tree') {
    ctx.lineWidth=TREE_ART.outline;ctx.fillStyle=flash?'#FFFFFF':TREE_ART.trunk;
    ctx.fillRect(-5,20,10,25);ctx.strokeRect(-5,20,10,25);
    polygon(ctx,TREE_CANOPY);ctx.fillStyle=flash?'#FFFFFF':TREE_ART.dark;ctx.fill();ctx.stroke();
    polygon(ctx,TREE_LIGHT_CANOPY);ctx.fillStyle=flash?'#FFFFFF':TREE_ART.light;ctx.fill();
    if(!flash){ctx.lineWidth=1.5;ctx.strokeStyle='#354B20';ctx.stroke();}
  } else {
    ctx.lineWidth=ROCK_ART.outline;polygon(ctx,ROCK_ART.points);ctx.fillStyle=flash?'#FFFFFF':ROCK_ART.base;ctx.fill();
    if(!flash){polygon(ctx,ROCK_UPPER);ctx.fillStyle=ROCK_ART.upper;ctx.fill();polygon(ctx,ROCK_FACET);ctx.fillStyle='#4D6473';ctx.fill();
      ctx.beginPath();ctx.moveTo(-12,-24);ctx.lineTo(0,-3);ctx.lineTo(13,-21);ctx.closePath();ctx.fillStyle=ROCK_ART.highlight;ctx.fill();
      ctx.lineWidth=1.5;ctx.strokeStyle='#253544';ctx.beginPath();ctx.moveTo(-18,20);ctx.lineTo(-5,9);ctx.lineTo(18,-2);ctx.stroke();}
    ctx.lineWidth=ROCK_ART.outline;ctx.strokeStyle=INK;polygon(ctx,ROCK_ART.points);ctx.stroke();
  }
}
export function drawResourceShadow(ctx,type) {
  ctx.fillStyle='#1B2818';ctx.beginPath();
  if(type==='tree')ctx.ellipse(5,27,35,19,0,0,Math.PI*2);else ctx.ellipse(4,18,25,10,0,0,Math.PI*2);
  ctx.fill();
}
