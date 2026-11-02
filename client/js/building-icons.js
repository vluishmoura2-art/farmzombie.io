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
    ctx.fillStyle='#111811';ctx.fillRect(-24,-23,52,52);
    rect(-27,-27,52,52,'#68462D');rect(-23,-23,44,44,'#9F794B');
    if(type==='stash'){
      rect(-21,-9,42,30,'#8B5A2B');poly([-21,-9,-18,-22,18,-22,21,-9],'#B18140');
      rect(-21,-8,42,7,'#493421');
      circle(-11,10,7,'#F1C40F');circle(4,11,8,'#F1C40F');circle(13,4,6,'#F39C12');
      ctx.fillStyle='#FFF3B1';ctx.fillRect(-13,5,4,2);
    }else if(type==='ballista'){
      circle(0,12,11,'#5A4A31');rect(-4,-22,8,44,'#8B5A2B');
      poly([-24,-2,-19,-17,0,-23,19,-17,24,-2,18,-7,0,-17,-18,-7],'#B38248');
      ctx.beginPath();ctx.moveTo(-23,-2);ctx.lineTo(0,14);ctx.lineTo(23,-2);ctx.lineWidth=2;ctx.stroke();
      poly([-5,-18,0,-28,5,-18],'#BBC8C8');
    }else if(type==='cannon'){
      circle(0,8,17,'#3E4C54');rect(-23,3,7,20,'#222D33');rect(16,3,7,20,'#222D33');
      rect(-10,-25,20,34,'#95A5A6');rect(-9,-25,18,7,'#1D252B');ctx.fillStyle='#D8E0DD';ctx.fillRect(-6,-15,3,18);
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
      circle(0,16,12,'#465667');rect(-4,-5,8,23,'#697B87');
      poly([0,-27,13,-9,0,6,-13,-9],'#8C73BE');poly([0,-27,0,6,-13,-9],'#C1B0E2');
    }else if(type==='mine'){
      rect(-24,17,48,8,'#34495E');
      poly([-22,16,-10,-25,3,-25,-12,16],'#8B5A2B');poly([-5,-25,5,-25,22,16,12,16],'#AF8249');
      rect(-13,-15,26,6,'#95A5A6');poly([0,-4,11,8,0,21,-11,8],'#F1C40F');poly([0,-4,11,8,0,7],'#FFF3AD');
    }else if(type==='harvester'){
      rect(-23,-22,46,43,'#5E744D');
      const teeth=[];for(let i=0;i<32;i++){const a=-Math.PI/2+i*Math.PI/16,r=i%4<2?20:15;teeth.push(Math.cos(a)*r,Math.sin(a)*r);}
      poly(teeth,'#95A5A6');circle(0,0,10,'#4C626E');circle(0,0,4,'#19252B');rect(-25,19,50,6,'#C0AC83');
    }
  }
}
