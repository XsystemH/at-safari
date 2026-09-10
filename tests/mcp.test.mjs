import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {credentials,Broker} from '../packages/bridge/server.mjs';
test('actual MCP stdio discovery, status and pairing',async()=>{
  const home=await mkdtemp(join(tmpdir(),'at-safari-mcp-'));
  const config=await credentials(home);
  const broker=await new Broker({...config,port:0,home}).start();
  await writeFile(join(home,'broker.json'),JSON.stringify({...config,port:broker.port}));
  const transport=new StdioClientTransport({command:process.execPath,args:[resolve('plugins/at-safari/runtime/main.mjs')],env:{...process.env,AT_SAFARI_HOME:home},stderr:'pipe'});
  const client=new Client({name:'at-safari-test',version:'1.0.0'});
  try {
    await client.connect(transport);
    const list=await client.listTools();assert.equal(list.tools.length,7);
    const status=await client.callTool({name:'safari_status',arguments:{}});assert.ok(!status.isError);assert.equal(JSON.parse(status.content[0].text).connected,0);
    const pair=await client.callTool({name:'safari_pairing',arguments:{}});assert.match(JSON.parse(pair.content[0].text).code,/^[A-F0-9]{12}$/);
    const bad=await client.callTool({name:'safari_snapshot',arguments:{tabHandle:'not-authorized'}});assert.equal(bad.isError,true);
  } finally {await client.close();await broker.close();await rm(home,{recursive:true,force:true});}
});
