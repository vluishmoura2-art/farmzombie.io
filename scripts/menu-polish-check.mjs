// Standalone browser acceptance checks using installed Chrome and the existing ws dependency.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import WebSocket from 'ws';

const output=resolve('test-results/phase16');
await mkdir(output,{recursive:true});
const profile=await mkdtemp(resolve(output,'chrome-'));
const port=17816, origin='http://127.0.0.1:7780';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'7780',HOST:'127.0.0.1'},stdio:'ignore',windowsHide:true});
const chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  `--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank',
],{stdio:'ignore',windowsHide:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<200;i++){try{const result=await fn();if(result)return result;}catch{}await delay(100);}throw Error('Timed out waiting for browser/server');}
let socket;
try{
  await until(async()=>(await fetch(origin)).ok);
  const info=await until(async()=>await(await fetch(`http://127.0.0.1:${port}/json/version`)).json());
  socket=new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r,j)=>{socket.once('open',r);socket.once('error',j);});
  let seq=0,sessionId;const pending=new Map(),errors=[],websockets=[];
  socket.on('message',raw=>{const m=JSON.parse(raw);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
    if(m.method==='Network.webSocketCreated')websockets.push(m.params.url);
  });
  const send=(method,params={},session=sessionId)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}));});
  const target=await send('Target.createTarget',{url:'about:blank'});
  sessionId=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  const capture=async name=>{const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(output,`${name}.png`),Buffer.from(data,'base64'));};
  await send('Page.navigate',{url:origin});
  await until(()=>evaluate("document.querySelector('#game-version')?.textContent.includes('0.')"));
  const layouts=[];
  for(const [label,width,height] of [['desktop',1440,900],['laptop',1366,768],['ultrawide',2560,1080],['tablet',768,1024],['mobile',390,844],['small',320,640],['landscape',844,390]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    for(const lang of ['pt-BR','en','es']){
      await evaluate(`{const select=document.querySelector('#menu-language');select.value=${JSON.stringify(lang)};select.dispatchEvent(new Event('change'));}`);
      await until(()=>evaluate(`document.documentElement.lang===${JSON.stringify(lang)}`));
      const layout=await evaluate(`(()=>{
        const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
        const p=document.querySelector('.menu-description'),node=p.firstChild,lines=new Map();
        for(const match of node.textContent.matchAll(/\\S+/g)){const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);const y=range.getBoundingClientRect().top;lines.set(y,[...(lines.get(y)||[]),match[0]]);}
        return {overflow:document.documentElement.scrollWidth>innerWidth,lines:[...lines.values()],input:rect('#nickname'),play:rect('#play-button'),hint:rect('#nickname-hint'),card:rect('.menu-card'),footer:rect('.menu-footer'),language:rect('#menu-language'),tool:rect('.menu-tool')};
      })()`);
      assert.equal(layout.overflow,false,`${label}/${lang}: horizontal overflow`);
      assert.ok(layout.lines.length<=2,`${label}/${lang}: description wraps to ${layout.lines.length} lines`);
      assert.ok(layout.lines.at(-1).length>1,`${label}/${lang}: isolated final word`);
      assert.ok(layout.play.top-layout.hint.bottom>=19,`${label}/${lang}: hint spacing`);
      assert.ok(layout.play.height>=44&&layout.language.height>=44&&layout.input.height>=44,'Touch target sizes');
      assert.ok(layout.footer.top>layout.card.bottom,'Footer separation');
      assert.ok(layout.tool.bottom<layout.input.top,'Decoration does not overlap controls');
      layouts.push({label,width,height,lang,...layout});
      if(lang==='pt-BR'||label==='desktop')await capture(`${label}-${lang}`);
    }
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate("document.querySelector('#nickname').value='ab';document.querySelector('#join-form').requestSubmit()");
  assert.equal(await evaluate("document.querySelector('#nickname').getAttribute('aria-invalid')"),'true');
  assert.equal(websockets.length,0,'Invalid name must not connect');
  await evaluate("document.querySelector('#changelog-button').click()");
  assert.equal(await evaluate("document.querySelector('#changelog-panel').open"),true);
  assert.ok(await evaluate("document.querySelectorAll('#changelog-content article').length>0"));
  await evaluate("document.querySelector('#changelog-close').click()");
  await delay(200);
  assert.equal(await evaluate("document.querySelector('#changelog-panel').open"),false);
  // Native select keyboard navigation: Spanish -> English, persisting localization.
  await evaluate("document.querySelector('#menu-language').focus()");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
  await until(()=>evaluate("document.documentElement.lang==='en'"));
  assert.equal(await evaluate("localStorage.getItem('farmzombie.language')"),'en');
  await evaluate("document.querySelector('#nickname').focus()");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate("document.activeElement.id"),'play-button');
  assert.ok(await evaluate("getComputedStyle(document.activeElement).outlineStyle!=='none'"));
  await capture('keyboard-focus');
  const button=await evaluate("(()=>{const r=document.querySelector('#play-button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...button});await delay(200);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.play-arrow')).transform"),'matrix(1, 0, 0, 1, 4, 0)');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.play-arrow')).transitionDuration"),'0s');
  await evaluate("{const input=document.querySelector('#nickname');input.value='Phase16_QA';input.dispatchEvent(new Event('input'));document.querySelector('#join-form').requestSubmit();}");
  await until(()=>evaluate("document.querySelector('#main-menu').hidden && !document.querySelector('#game-shell').hidden"));
  assert.equal(websockets.length,1,'One real multiplayer WebSocket');assert.ok(websockets[0].endsWith('/ws'));
  assert.equal(await evaluate("localStorage.getItem('farmzombie.nickname')"),'Phase16_QA');
  await capture('play-connected');
  assert.deepEqual(errors,[]);
  const report={passed:['21 viewport/locale combinations: no overflow, two balanced description lines, no isolated final words','Touch target sizes, spacing and decoration clearance','Nickname validation blocks connection','Changelogs opens, renders releases and closes','All three locales, keyboard language switching and persistence','Keyboard PLAY focus, arrow hover feedback and reduced motion','PLAY admits via one real WebSocket, saves nickname and opens game','No uncaught browser exceptions'],layouts,errors};
  await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:report.passed,layouts:layouts.length},null,2));
}finally{
  socket?.close();chrome.kill();server.kill();
  await delay(500);
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
}
