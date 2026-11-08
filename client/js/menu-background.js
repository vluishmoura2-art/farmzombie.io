import { drawResourceArt } from './resource-art.js';
import { BuildingRenderer } from './building-renderer.js';
import { HumanoidRenderer } from './humanoid.js';

export class MenuBackground {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.static = document.createElement('canvas'); this.buildings = new BuildingRenderer(); this.zombies = new HumanoidRenderer();
    this.motion = matchMedia('(prefers-reduced-motion: reduce)'); this.last = 0; this.running = true;
    this.resize = () => { this.paintStatic(); this.draw(0); };
    this.visibility = () => { cancelAnimationFrame(this.frame); if (!document.hidden && this.running) this.schedule(); };
    this.motionChange = () => { cancelAnimationFrame(this.frame); this.draw(0); this.schedule(); };
    window.addEventListener('resize', this.resize); document.addEventListener('visibilitychange', this.visibility); this.motion.addEventListener('change', this.motionChange);
    this.resize(); this.schedule();
  }
  paintStatic() {
    this.width = innerWidth; this.height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    for (const canvas of [this.canvas, this.static]) { canvas.width = Math.round(this.width * dpr); canvas.height = Math.round(this.height * dpr); }
    const ctx = this.static.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle = '#5AAE33'; ctx.fillRect(0,0,this.width,this.height);
    // One cached layer. Geometry is uniform: no stretching trees or buildings.
    ctx.strokeStyle = '#4f9d2e'; ctx.lineWidth = 1;ctx.beginPath();
    for(let x=0;x<this.width;x+=40){ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,this.height);}
    for(let y=0;y<this.height;y+=40){ctx.moveTo(0,y+.5);ctx.lineTo(this.width,y+.5);}ctx.stroke();
    const positions=[[.06,.12,'tree'],[.15,.22,'tree'],[.24,.09,'stone'],[.91,.12,'tree'],[.84,.24,'tree'],[.96,.35,'stone'],[.09,.73,'tree'],[.19,.83,'stone'],[.04,.92,'tree'],[.9,.81,'tree'],[.79,.91,'stone'],[.96,.98,'tree'],[.3,.94,'tree'],[.73,.07,'stone']];
    for(const [x,y,type]of positions){ctx.save();ctx.translate(x*this.width,y*this.height);ctx.scale(1.2,1.2);drawResourceArt(ctx,type);ctx.restore();}
    const bx=this.width*.18,by=this.height*.5;
    ctx.fillStyle='#83613d';ctx.strokeStyle='#3d4228';ctx.lineWidth=4;ctx.fillRect(bx-76,by-78,152,155);ctx.strokeRect(bx-76,by-78,152,155);
    for(const [type,x,y,tier]of [['stash',-32,-32,1],['ballista',-110,-120,3],['cannon',60,45,2],['mage',-115,60,5]])this.buildings.draw(ctx,type,bx+x,by+y,64,0,tier);
    const x=this.width*.82,y=this.height*.55;this.buildings.draw(ctx,'windmill',x,y,64,0,2);this.buildings.draw(ctx,'field',x-70,y+10,64,0,1,3);this.buildings.draw(ctx,'field',x-70,y+80,64,0,1,2);this.buildings.draw(ctx,'melee',x+80,y-75,64,0,1);
  }
  draw(timestamp) {
    const ctx=this.ctx,dpr=Math.min(devicePixelRatio||1,1.5);ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(this.static,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
    const time=this.motion.matches?0:timestamp/1000;
    for(const [x,y,phase]of [[.1,.43,0],[.87,.7,2],[.72,.27,4],[.29,.7,1]]){
      ctx.save();ctx.translate(x*this.width+Math.sin(time*.25+phase)*14,y*this.height+Math.cos(time*.25+phase)*9);ctx.rotate(phase+Math.sin(time*.2)*.15);ctx.scale(.85,.85);this.zombies.draw(ctx,'#48B94C','#287C32');ctx.restore();
    }
  }
  schedule() { if(this.motion.matches || !this.running || document.hidden)return;this.frame=requestAnimationFrame(t=>{if(t-this.last>=1000/24){this.draw(t);this.last=t;}this.schedule();}); }
  stop() { this.running=false;cancelAnimationFrame(this.frame);window.removeEventListener('resize',this.resize);document.removeEventListener('visibilitychange',this.visibility);this.motion.removeEventListener('change',this.motionChange); }
}
