import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { createApproval } from './core/snapshot.mjs'
import { createHandoff, safeExportPath } from './core/handoff.mjs'
import { selectResources } from './core/selection.mjs'
import { renderDocumentPdf } from './core/document.mjs'
import { defaults, parse, check, designTokens, describe, project } from './profile.mjs'
import { renderPage, pageHtml, cssTokens } from './render.mjs'
import { contentProvider } from './content.mjs'
const root=fileURLToPath(new URL('.',import.meta.url)), port=Number(process.env.PORT||3066)
const registry={base:{files:['site.css']},split:{files:['variants/split.css'],requires:['base']},stacked:{files:['variants/stacked.css'],requires:['base']}}
async function exportDesign(raw){
  const design=parse(raw), tokens=designTokens(design)
  if(check(design).findings.length)throw new Error('Design check failed')
  const approval=await createApproval({design,tokens,projectId:project.id,sourceRevision:project.sourceRevision,actor:'verification'})
  const selection=selectResources(registry,[design.layout])
  const files={
    'index.html':pageHtml(renderPage(design,await contentProvider())),
    'tokens.css':cssTokens(tokens),
    'build.mjs':readFileSync(resolve(root,'build.mjs'),'utf8'),
    'package.json':JSON.stringify({name:'north-selected-site',private:true,type:'module',scripts:{build:'node build.mjs'}}),
  }
  // The dependency graph is the actual file-selection source, not only export metadata.
  for(const file of selection.files)files[file.startsWith('variants/')?'layout.css':file]=readFileSync(resolve(root,file),'utf8')
  const output=await createHandoff({design,tokens,project,approval,files,markdown:describe(design,tokens),renderPdf:text=>renderDocumentPdf(text,{chromium}),manifest:{selection,masterPreserved:true}})
  const id=randomUUID(), folder=resolve(root,'exports',id)
  mkdirSync(folder,{recursive:true})
  for(const [name,bytes]of Object.entries(output)){const path=resolve(folder,safeExportPath(name));mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes)}
  const archive=resolve(root,'exports',id+'.tar')
  const tar=spawnSync('tar',['-cf',archive,'-C',folder,'.'])
  if(tar.status!==0)throw new Error('Archive failed')
  return {id:approval.id,approvedAt:approval.approvedAt,url:'/download/'+id+'.tar',folder}
}
const mime={'.mjs':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.pdf':'application/pdf','.tar':'application/x-tar'}
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:'+port)
    if(req.method==='POST'&&url.pathname==='/export'){
      if(req.headers.origin!=='http://127.0.0.1:'+port){res.writeHead(403).end();return}
      let body='';for await(const chunk of req){body+=chunk;if(body.length>65536)throw new Error('Too large')}
      const result=await exportDesign(JSON.parse(body).design)
      res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));return
    }
    if(url.pathname==='/content.json'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(await contentProvider({fail:url.searchParams.get('source')==='offline'})));return}
    if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end(pageHtml(renderPage(defaults,await contentProvider()),{editor:true,tokenCss:cssTokens(designTokens(defaults))}));return}
    let relative=url.pathname.slice(1)
    if(relative.startsWith('download/'))relative='exports/'+relative.slice(9)
    safeExportPath(relative)
    if(!/^(?:core\/|variants\/|exports\/|site\.css$|editor\.(?:css|mjs)$|profile\.mjs$|render\.mjs$|scale\.json$)/.test(relative)){res.writeHead(404).end();return}
    const file=resolve(root,relative)
    if(!existsSync(file)){res.writeHead(404).end();return}
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(readFileSync(file))
  }catch(error){res.writeHead(422,{'Content-Type':'application/json'}).end(JSON.stringify({error:error.message}))}
}).listen(port,'127.0.0.1',()=>console.log('PILOT http://127.0.0.1:'+port))
