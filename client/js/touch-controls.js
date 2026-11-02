// Supplemental touch input; desktop keyboard/mouse handlers remain in place.
export class TouchControls {
  constructor(root, canvas, input, onAction, onInspect) {
    this.held = new Set(); this.x = 0; this.y = 0; this.timer = null;
    const vectors = { up:[0,-1],down:[0,1],left:[-1,0],right:[1,0] };
    const refresh = () => { this.x = 0; this.y = 0; for (const key of this.held) { this.x += vectors[key][0]; this.y += vectors[key][1]; } };
    for (const button of root.querySelectorAll('[data-move]')) {
      button.addEventListener('pointerdown', event => { event.preventDefault();button.setPointerCapture(event.pointerId);this.held.add(button.dataset.move);refresh(); });
      const release = () => { this.held.delete(button.dataset.move);refresh(); };
      for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event,release);
    }
    root.querySelector('[data-action]').addEventListener('click',onAction);
    canvas.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='touch')return;
      clearTimeout(this.timer);this.startX=event.clientX;this.startY=event.clientY;input.skipNextClick=false;
      this.timer=setTimeout(()=>{input.skipNextClick=true;onInspect(this.startX,this.startY);},500);
    });
    canvas.addEventListener('pointermove',event=>{if(event.pointerType==='touch'&&Math.hypot(event.clientX-this.startX,event.clientY-this.startY)>12)clearTimeout(this.timer);});
    for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>clearTimeout(this.timer));
    window.addEventListener('blur',()=>this.clear());
  }
  clear() { this.held.clear();this.x=this.y=0;clearTimeout(this.timer); }
}
