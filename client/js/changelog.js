import { loadGameConfig, localized } from './game-config.js';
import { showDialog, closeDialog } from './dialog-motion.js';
const viewedKey='farmzombie.changelog.viewed';
export class Changelog {
  constructor(i18n) {
    this.i18n=i18n;
    this.button=document.querySelector('#changelog-button');
    this.dialog=document.querySelector('#changelog-panel');
    this.content=document.querySelector('#changelog-content');
    this.close=document.querySelector('#changelog-close');
    this.button.addEventListener('click',async()=>{
      showDialog(this.dialog);
      this.content.scrollTop=0;
      if(!this.config) await this.load();
      if(this.dialog.open && this.config) this.markViewed();
    });
    const close=()=>closeDialog(this.dialog,()=>this.button.focus({preventScroll:true}));
    this.close.addEventListener('click',close);
    this.dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  }
  async load() {
    if(this.loading) return this.loading;
    this.loading=(async()=>{
      try {this.config=await loadGameConfig();this.failed=false;} catch {this.failed=true;}
      this.render();
      if(this.dialog.open && this.config) this.markViewed();
    })();
    await this.loading;this.loading=null;
  }
  markViewed() {
    this.viewed=this.config.version;
    try {localStorage.setItem(viewedKey,this.viewed);} catch {}
    this.renderBadge();
  }
  renderBadge() {
    let viewed=this.viewed;
    try {viewed=localStorage.getItem(viewedKey)||viewed;} catch {}
    const badge=document.querySelector('#changelog-new');
    badge.textContent=this.i18n.t('changelog.new');
    badge.hidden=!this.config || viewed===this.config.version;
  }
  render() {
    const t=key=>this.i18n.t('changelog.'+key);
    document.querySelector('#changelog-title').textContent=t('title');
    this.close.textContent=t('close');
    document.querySelector('#game-version').textContent=this.config ? `${t('version')} v${this.config.version}` : t('unavailable');
    this.renderBadge();
    this.content.replaceChildren();
    if(!this.config){this.content.textContent=this.failed?t('error'):'';return;}
    const element=(tag,text,parent)=>{const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;};
    for(const [index,release] of this.config.releases.entries()) {
      const article=element('article','',this.content);
      const meta=element('div',`${t('version')} v${release.version}`,article);meta.className='release-meta';
      if(index===0)element('span',t('latest'),meta).className='update-badge';
      const date=element('time',new Intl.DateTimeFormat(this.i18n.language,{dateStyle:'long',timeZone:'UTC'}).format(new Date(release.date+'T00:00:00Z')),article);date.dateTime=release.date;
      element('h3',localized(release.title,this.i18n.language),article);
      for(const category of release.categories) {
        element('h4',t('category.'+category.id),article);
        if(!category.entries.length){element('p',t('empty'),article).className='release-empty';continue;}
        const list=element('ul','',article);
        for(const entry of category.entries)element('li',localized(entry,this.i18n.language),list);
      }
    }
  }
}
