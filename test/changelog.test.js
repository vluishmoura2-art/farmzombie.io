import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publishedReleases, localized, loadGameConfig} from '../client/js/game-config.js';
test('release history sorts by date, then numeric version, without mutating input',()=>{
 const entries=[{version:'0.9.0',date:'2026-10-01'},{version:'0.14.2',date:'2026-11-02'},{version:'0.14.10',date:'2026-11-02'}];
 assert.deepEqual(publishedReleases(entries).map(x=>x.version),['0.14.10','0.14.2','0.9.0']);assert.equal(entries[0].version,'0.9.0');
});
test('published data has localized descriptions and all release categories; config derives newest version',async()=>{
 const data=JSON.parse(await readFile(new URL('../client/data/changelog.json',import.meta.url),'utf8'));
 for(const release of data){assert.match(release.version,/^\d+\.\d+\.\d+$/);assert.ok(Number.isFinite(Date.parse(release.date)));assert.deepEqual(release.categories.map(c=>c.id),['new','improvements','fixes']);for(const lang of ['pt-BR','en','es']){assert.ok(release.title[lang]);for(const c of release.categories)for(const entry of c.entries)assert.ok(entry[lang]);}}
 const fetch=globalThis.fetch;try{globalThis.fetch=async()=>({ok:true,json:async()=>data});assert.equal((await loadGameConfig()).version,publishedReleases(data)[0].version);globalThis.fetch=async()=>({ok:false});await assert.rejects(loadGameConfig());}finally{globalThis.fetch=fetch;}
});
test('missing translations fall back to Portuguese and plain text remains supported',()=>{
 assert.equal(localized({'pt-BR':'Notas'},'es'),'Notas');assert.equal(localized('Notes','en'),'Notes');
});
