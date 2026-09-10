import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())await walk(p);else if(/\.(mjs|js)$/.test(e.name)){const r=spawnSync(process.execPath,['--check',p],{stdio:'inherit'});if(r.status)process.exit(r.status);}}}
for(const dir of ['packages','apps/safari/web-extension','scripts','tests'])await walk(dir);
console.log('JavaScript syntax checks passed.');
