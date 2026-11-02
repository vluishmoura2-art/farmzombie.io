import { drawResourceArt, drawResourceShadow } from './resource-art.js';
import { resourceImpactScale } from './art-config.js';
export class ResourceRenderer {
  constructor() {
    this.candidates=[];this.sprites={};this.shadows={};this.normal={};this.flashes={};
    for(const type of ['tree','stone']) {
      for(const flash of [false,true]) {
        const sprite=document.createElement('canvas');sprite.width=sprite.height=208;
        const ctx=sprite.getContext('2d');ctx.translate(104,104);ctx.scale(2,2);drawResourceArt(ctx,type,flash);
        this.sprites[`${type}:${flash}`]=sprite;(flash?this.flashes:this.normal)[type]=sprite;
      }
      const shadow=document.createElement('canvas');shadow.width=shadow.height=208;
      const ctx=shadow.getContext('2d');ctx.translate(104,104);ctx.scale(2,2);drawResourceShadow(ctx,type);this.shadows[type]=shadow;
    }
  }
  draw(ctx,field,left,top,width,height) {
    // A small visual margin includes the 5% impact at viewport edges, without changing physics bounds.
    field.queryBounds(left-3,top-3,left+width+3,top+height+3,this.candidates);
    for(const resource of this.candidates) {
      const flash=Boolean(resource.flashPending && resource.hitUntil>field.time);
      const scale=resource.type==='tree'?resourceImpactScale(resource.hitUntil,field.time):1,size=104*scale;
      ctx.drawImage(this.shadows[resource.type],resource.x-52,resource.y-52,104,104);
      ctx.drawImage((flash?this.flashes:this.normal)[resource.type],resource.x-size/2,resource.y-size/2,size,size);
      resource.flashPending=false;
    }
  }
}
