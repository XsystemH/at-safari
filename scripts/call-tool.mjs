// Diagnostic client using the same MCP stdio transport as an agent host.
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {fileURLToPath} from 'node:url';

const [name='safari_status',json='{}']=process.argv.slice(2);
const client=new Client({name:'at-safari-diagnostic',version:'0.1.0'});
const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../plugins/at-safari/runtime/main.mjs',import.meta.url))],stderr:'inherit'});
try {
  await client.connect(transport);
  const result=await client.callTool({name,arguments:JSON.parse(json)});
  console.log(JSON.stringify(result,null,2));
  if(result.isError)process.exitCode=1;
} finally {await client.close();}
