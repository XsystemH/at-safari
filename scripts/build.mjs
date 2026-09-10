import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile,readdir} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
await mkdir('plugins/at-safari/runtime',{recursive:true});
const result=await build({entryPoints:['packages/mcp/main.mjs'],outfile:'plugins/at-safari/runtime/main.mjs',bundle:true,platform:'node',target:'node22',format:'esm',metafile:true,banner:{js:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);"}});
await copyFile('LICENSE','plugins/at-safari/LICENSE');
// Preserve license notices for bundled dependencies.
const packages=new Map();
for(const input of Object.keys(result.metafile.inputs)){
  if(!input.includes('node_modules/'))continue;
  let folder=dirname(resolve(input));
  while(folder!==dirname(folder)){
    try{const p=JSON.parse(await readFile(join(folder,'package.json'),'utf8'));if(p.name){packages.set(p.name,{...p,folder});break;}}catch{}
    folder=dirname(folder);
  }
}
const notices=[];
for(const [name,p]of packages){const licenses=(await readdir(p.folder)).filter(f=>/^(license|copying)(\.|$)/i.test(f));let text=`--- ${name}@${p.version} (${p.license||'see package'}) ---\n`;for(const f of licenses)text+=await readFile(join(p.folder,f),'utf8');notices.push(text);}
await writeFile('plugins/at-safari/THIRD_PARTY_NOTICES.txt',notices.join('\n\n'));
console.log('Built self-contained MCP runtime (Node 22+ required).');
