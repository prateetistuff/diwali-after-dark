import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const mode=process.argv[2];
const base=JSON.parse(fs.readFileSync('dist/server/wrangler.json','utf8'));
if(mode==='local'){
 base.d1_databases=base.d1_databases.map(d=>({...d,migrations_dir:'../../drizzle'}));
 fs.writeFileSync('dist/server/wrangler.json',JSON.stringify(base,null,2));
 const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state'],{stdio:'inherit'});
 if(r.error)throw r.error;process.exit(r.status??1);
}else if(mode==='deploy'){
 const d=JSON.parse(fs.readFileSync('deploy.local.json','utf8'));
 if(!/^[a-z0-9][a-z0-9-]*$/.test(d.workerName)||!/^[a-f0-9-]{36}$/i.test(d.databaseId))throw Error('Set your worker name and real D1 database ID in deploy.local.json.');
 // Rewrite generated relative paths because this configuration lives at the repository root.
 base.name=d.workerName;delete base.topLevelName;base.main='dist/server/index.js';base.assets={...base.assets,directory:'dist/client'};
 base.d1_databases=[{binding:'DB',database_name:d.databaseName,database_id:d.databaseId,migrations_dir:'drizzle'}];
 fs.writeFileSync('wrangler.deploy.json',JSON.stringify(base,null,2));
 console.log('Prepared wrangler.deploy.json. No deployment has been performed.');
}else throw Error('Use local or deploy. Run npm run build first.');
