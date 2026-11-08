import { Changelog } from './changelog.js';
import { suggestLanguage } from './localization.js';
import { i18n } from './i18n.js';
import { SESSION_KEY, readSession, clearSession } from './session.js';
import { validateNickname } from './nickname.js';
import { JoinConnection } from './join-connection.js';
import { setAdmission } from './admission.js';

const read = (storage, key) => { try { return window[storage].getItem(key); } catch { return null; } };
const save = (storage, key, value) => { try { window[storage].setItem(key,value); } catch {} };
const menu=document.querySelector('#main-menu'),form=document.querySelector('#join-form'),name=document.querySelector('#nickname'),play=document.querySelector('#play-button'),language=document.querySelector('#menu-language'),status=document.querySelector('#menu-status');
let statusKey='menu.ready',busy=false,background,started=false;
name.value=read('localStorage','farmzombie.nickname')||'';
function render() {
  changelog.render();
  document.documentElement.lang=i18n.language;
  document.title=`farmzombie.io — ${i18n.t('menu.motto')}`;
  for(const element of menu.querySelectorAll('[data-i18n]'))element.textContent=i18n.t(element.dataset.i18n);
  name.placeholder=i18n.t('menu.nicknamePlaceholder');language.value=i18n.language;
  status.textContent=i18n.t(statusKey);status.dataset.error=String(statusKey.startsWith('validation.')||['menu.serverFull','menu.connectionFailed','menu.sessionUnavailable','menu.loadFailed'].includes(statusKey));play.disabled=busy;name.disabled=busy;
  play.querySelector('[data-i18n]').textContent=i18n.t(busy?'menu.connecting':'menu.play');
}
const changelog=new Changelog(i18n);
const selected=suggestLanguage(read('localStorage','farmzombie.language'),navigator.language);
language.addEventListener('change',async()=>{try{if(await i18n.select(language.value)){save('localStorage','farmzombie.language',i18n.language);render();}}catch{statusKey='menu.connectionFailed';render();}});
// Static Portuguese labels are already visible while the small JSON dictionaries load.
try { await i18n.select(selected);render(); } catch { /* Keep the essential static menu usable. */ }
changelog.load();
const join=new JoinConnection({url:`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`,onState:key=>{statusKey=key;render();}});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||started)return;
  const validation=validateNickname(name.value);
  name.setAttribute('aria-invalid',String(!validation.ok));
  if(!validation.ok){statusKey=validation.key;render();name.focus();return;}
  busy=true;render();let admission;
  try {
    admission=await join.start(validation.name,readSession());
    save('localStorage','farmzombie.nickname',validation.name);save('sessionStorage',SESSION_KEY,admission.welcome.token);
    setAdmission(admission);
    await import('./main.js');
    started=true;background?.stop();menu.hidden=true;document.querySelector('#game-shell').hidden=false;document.body.classList.remove('in-menu');document.querySelector('#game').focus({preventScroll:true});
  }catch(error){
    admission?.ws.close();statusKey=error.key||'menu.loadFailed';
    if(statusKey==='menu.sessionUnavailable')clearSession();
    busy=false;render();
  }
});
name.addEventListener('input',()=>{name.setAttribute('aria-invalid','false');statusKey='menu.ready';render();});
// The optional illustrated world does not delay the form or locale controls.
import('./menu-background.js').then(({MenuBackground})=>{if(!started)background=new MenuBackground(document.querySelector('#menu-world'));}).catch(()=>{});
// A single static decoration uses the same pickaxe art as inventory and world tools.
import('./equipment-renderer.js').then(({EquipmentRenderer})=>{
  const canvas=menu.querySelector('.menu-tool');
  new EquipmentRenderer().drawIcon(canvas.getContext('2d'),'pickaxe',canvas.width);
}).catch(()=>{});
