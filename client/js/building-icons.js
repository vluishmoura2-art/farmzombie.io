import { INK } from './art-config.js';
// Dedicated small-scale artwork: world building designs and occupancy stay untouched.
export class BuildingIcons {
  constructor(){this.cache=new Map();}
  draw(ctx,type,x,y,size){
    let sprite=this.cache.get(type);
    if(!sprite){sprite=document.createElement('canvas');sprite.width=sprite.height=128;const c=sprite.getContext('2d');c.translate(64,64);c.scale(2,2);this.drawGeometry(c,type);this.cache.set(type,sprite);}
    ctx.drawImage(sprite,x,y,size,size);
  }
  drawGeometry(ctx,type){
    ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.lineJoin='miter';
    const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);};
    const circle=(x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();};
    const poly=(points,color)=>{ctx.beginPath();ctx.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.stroke();};
    if(type==='stash'){
      poly([-25,9,20,5,26,21,-22,25],'#8B5A2B');
      for(const [x,y,r] of [[-14,8,8],[1,12,9],[16,7,8],[-6,-3,9],[9,-7,8],[-1,-16,7]])circle(x,y,r,'#F1C40F');
      ctx.fillStyle='#FFF3B1';ctx.fillRect(-13,5,4,2);
    }else if(type==='ballista'){
      circle(0,12,11,'#5A4A31');rect(-4,-22,8,44,'#8B5A2B');
      poly([-24,-2,-19,-17,0,-23,19,-17,24,-2,18,-7,0,-17,-18,-7],'#B38248');
      ctx.beginPath();ctx.moveTo(-23,-2);ctx.lineTo(0,14);ctx.lineTo(23,-2);ctx.lineWidth=2;ctx.stroke();
      poly([-5,-18,0,-28,5,-18],'#BBC8C8');
    }else if(type==='cannon'){
      circle(0,8,17,'#3E4C54');rect(-23,3,7,20,'#222D33');rect(16,3,7,20,'#222D33');
      poly([-12,9,-9,-23,10,-26,13,7],'#95A5A6');
      ctx.fillStyle='#1D252B';ctx.beginPath();ctx.ellipse(0,-23,10,5,-.15,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#D8E0DD';ctx.fillRect(-6,-15,3,18);
    }else if(type==='melee'){
      circle(0,14,12,'#4D5960');rect(-4,-3,8,26,'#8B5A2B');
      poly([-7,-2,-8,-17,0,-28,8,-17,7,-2],'#AABABC');rect(-15,-2,30,6,'#8D9698');
      ctx.fillStyle='#F1F3ED';ctx.beginPath();ctx.moveTo(-4,-5);ctx.lineTo(-4,-15);ctx.lineTo(0,-23);ctx.lineTo(0,-5);ctx.fill();
    }else if(type==='bomb'){
      circle(0,3,19,'#25333F');rect(-5,-21,10,8,'#556976');
      ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1,-21);ctx.lineTo(8,-28);ctx.lineTo(16,-23);ctx.stroke();
      poly([16,-28,20,-24,16,-20,12,-24],'#F39C12');
      ctx.fillStyle='#95A5A6';ctx.beginPath();ctx.moveTo(-13,-5);ctx.lineTo(-8,-10);ctx.lineTo(-3,-8);ctx.lineTo(-9,-2);ctx.closePath();ctx.fill();
    }else if(type==='mage'){
      poly([-17,24,-11,15,10,15,18,24],'#697B87');
      poly([0,-27,13,-9,0,6,-13,-9],'#8C73BE');poly([0,-27,0,6,-13,-9],'#C1B0E2');
      ctx.fillStyle='#C1B0E2';ctx.fillRect(19,-12,3,3);ctx.fillRect(-21,3,3,3);
    }else if(type==='field'){
      // Three golden ears standing on a strip of tilled soil.
      rect(-26,14,52,11,'#6B4627');
      ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-22,19);ctx.lineTo(22,19);ctx.stroke();ctx.lineWidth=3;
      for(const [x,lean] of [[-13,-.25],[0,0],[13,.25]]){
        ctx.save();ctx.translate(x,14);ctx.rotate(lean);
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-22);ctx.strokeStyle='#9A6B1C';ctx.stroke();ctx.strokeStyle=INK;
        for(const y of [-30,-24,-18])for(const side of [-1,1]){ctx.fillStyle='#F1C94A';ctx.beginPath();ctx.ellipse(side*3,y,3,5,side*.5,0,Math.PI*2);ctx.fill();ctx.lineWidth=1.5;ctx.stroke();ctx.lineWidth=3;}
        ctx.restore();
      }
    }else if(type==='windmill'){
      poly([-11,26,-7,-6,7,-6,11,26],'#E9E1CC');poly([-10,-5,0,-15,10,-5],'#A57348');rect(-3,15,6,11,'#6B4627');
      ctx.save();ctx.translate(0,-8);
      for(let i=0;i<4;i++){ctx.save();ctx.rotate(Math.PI/4+i*Math.PI/2);rect(-1.5,-24,3,22,'#8B5A2B');rect(1.5,-23,7,16,'#F3ECD8');ctx.restore();}
      circle(0,0,4,'#5A4A33');ctx.restore();
    }else if(type==='harvester'){
      rect(2,-17,23,36,'#5E744D');rect(-24,17,49,7,'#8B5A2B');
      ctx.save();ctx.translate(-8,-2);ctx.scale(.82,.82);
      const teeth=[];for(let i=0;i<32;i++){const a=-Math.PI/2+i*Math.PI/16,r=i%4<2?20:15;teeth.push(Math.cos(a)*r,Math.sin(a)*r);}
      poly(teeth,'#95A5A6');circle(0,0,10,'#4C626E');circle(0,0,4,'#19252B');ctx.restore();
      rect(9,-27,8,10,'#B38248');
    }
  }
}
