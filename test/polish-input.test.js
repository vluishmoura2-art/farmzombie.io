import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TouchControls } from '../client/js/touch-controls.js';
import { Input } from '../client/js/input.js';
import { showDialog, closeDialog } from '../client/js/dialog-motion.js';
import { ResourceHUD } from '../client/js/resource-hud.js';
function target(extra={}) {
 const handlers=new Map();return { ...extra, addEventListener(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn);},removeEventListener(){},emit(name,event={}){for(const fn of handlers.get(name)||[])fn(event);} };
}
function fakeTimers(t) {
 const timers=new Map();let id=0;
 t.mock.method(globalThis,'setTimeout',(fn,ms)=>{timers.set(++id,{fn,ms});return id;});
 t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));return timers;
}
test('touch movement clears on release/blur, action fires once, long inspect suppresses its click and drag cancels inspection',t=>{
 const timers=fakeTimers(t),originalWindow=globalThis.window,win=target();globalThis.window=win;
 try{
  const canvas=target({getBoundingClientRect:()=>({left:10,top:20})});const buttons=['up','down','left','right'].map(key=>target({dataset:{move:key},setPointerCapture(){}})),action=target();
  const root={querySelectorAll:()=>buttons,querySelector:()=>action};const input=new Input(win,canvas);let harvests=0,inspects=0;
  input.onHarvest=()=>harvests++;const touch=new TouchControls(root,canvas,input,()=>harvests++,()=>inspects++);
  const event={preventDefault(){},pointerId:1};buttons[0].emit('pointerdown',event);buttons[3].emit('pointerdown',event);assert.equal(touch.x,1);assert.equal(touch.y,-1);
  buttons[0].emit('pointerup');assert.equal(touch.y,0);win.emit('blur');assert.equal(touch.x,0);
  action.emit('click');assert.equal(harvests,1);
  canvas.emit('pointerdown',{pointerType:'touch',clientX:100,clientY:100});const pending=[...timers.values()][0];assert.equal(pending.ms,500);pending.fn();assert.equal(inspects,1);assert.equal(input.skipNextClick,true);
  canvas.emit('click',{button:0,clientX:100,clientY:100});assert.equal(harvests,1);assert.equal(input.skipNextClick,false);
  canvas.emit('click',{button:0,clientX:100,clientY:100});assert.equal(harvests,2);
  touch.clear();canvas.emit('pointerdown',{pointerType:'touch',clientX:100,clientY:100});canvas.emit('pointermove',{pointerType:'touch',clientX:125,clientY:100});assert.equal(timers.size,0);
  input.destroy();
 }finally{if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}
});
test('dialog transitions close in 110ms, reject duplicate closing, reopen cleanly and respect reduced motion',t=>{
 const timers=fakeTimers(t),originalWindow=globalThis.window;globalThis.window={matchMedia:()=>({matches:false})};
 try{
  const classes=new Set(),dialog={open:false,classList:{add:s=>classes.add(s),remove:s=>classes.delete(s)},showModal(){this.open=true;},close(){this.open=false;}};let closed=0;
  showDialog(dialog);assert.equal(dialog.open,true);closeDialog(dialog,()=>closed++);closeDialog(dialog,()=>closed++);assert.equal(timers.size,1);assert.equal([...timers.values()][0].ms,110);
  showDialog(dialog);assert.equal(timers.size,0);assert.equal(classes.has('closing'),false);
  closeDialog(dialog,()=>closed++);[...timers.values()][0].fn();assert.equal(dialog.open,false);assert.equal(closed,1);
  globalThis.window.matchMedia=()=>({matches:true});showDialog(dialog);closeDialog(dialog,()=>closed++);assert.equal(dialog.open,false);assert.equal(closed,2);
 }finally{if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}
});
test('unchanged resource counters avoid repeated DOM writes while exact balances remain visible',()=>{
 let writes=0;const counter=()=>{let value='3';return{get value(){return value;},set value(next){value=next;writes++;}};};
 const hud={inventory:{wood:3,stone:3,gold:3},wood:counter(),stone:counter(),gold:counter()};
 for(let i=0;i<100;i++)ResourceHUD.prototype.refresh.call(hud);assert.equal(writes,0);
 hud.inventory.gold=9000000;ResourceHUD.prototype.refresh.call(hud);assert.equal(writes,1);assert.equal(hud.gold.value,'9000000');
});
