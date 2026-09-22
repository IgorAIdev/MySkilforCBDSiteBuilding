import { mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installStudio } from '../skills/site-building/scripts/install-studio.mjs'
const root=fileURLToPath(new URL('../',import.meta.url))
const target=resolve(process.argv[2]||resolve(root,'dist','studio-pilot-'+Date.now()))
if(existsSync(target))throw new Error('Pilot destination already exists')
function copy(source,destination){
  mkdirSync(destination,{recursive:true})
  for(const entry of readdirSync(source,{withFileTypes:true})){
    if(['node_modules','core','exports','review'].includes(entry.name))continue
    const from=resolve(source,entry.name),to=resolve(destination,entry.name)
    if(entry.isDirectory())copy(from,to);else copyFileSync(from,to)
  }
}
copy(resolve(root,'selftest/studio-pilot'),target)
copyFileSync(resolve(root,'styles/scale.json'),resolve(target,'scale.json'))
installStudio(resolve(target,'core'))
console.log(target)
