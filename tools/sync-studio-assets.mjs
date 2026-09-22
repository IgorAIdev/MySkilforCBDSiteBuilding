import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { PREFIX, BREAKPOINTS } from './kit-config.mjs'
const target = new URL('../skills/site-building/assets/studio/engine/', import.meta.url)
const checking = process.argv.includes('--check')
if (!checking) mkdirSync(target, { recursive: true })
for (const name of ['scale.mjs', 'palette.mjs', 'thresholds.mjs', 'palette-profile.json']) {
  let source = readFileSync(new URL(name, import.meta.url), 'utf8')
  if (name === 'scale.mjs') source = source.replace("import { PREFIX, BREAKPOINTS } from './kit-config.mjs'", `const PREFIX = ${JSON.stringify(PREFIX)}\nconst BREAKPOINTS = ${JSON.stringify(BREAKPOINTS)}`)
  if (name === 'palette.mjs') source = source.replace("import { readFileSync } from 'node:fs'", "import profile from './palette-profile.json' with { type: 'json' }").replace(/readFileSync\(new URL\('palette-profile.json', import.meta.url\), 'utf8'\)/, 'JSON.stringify(profile)')
  source = source.replace(/\r\n/g, '\n')
  if (checking) {
    if (readFileSync(new URL(name, target), 'utf8').replace(/\r\n/g, '\n') !== source) throw new Error(`Stale studio engine: ${name}`)
  } else writeFileSync(new URL(name, target), source)
}
console.log(checking ? 'Studio engines match canonical sources' : 'Studio engines generated')
const manifestUrl = new URL('../skills/site-building/upstream.json', import.meta.url)
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'))
for (const path of ['snapshot.mjs', 'store.mjs', 'document.mjs', 'handoff.mjs', 'selection.mjs', 'engine/scale.mjs', 'engine/palette.mjs', 'engine/thresholds.mjs', 'engine/palette-profile.json']) {
  const local = 'assets/studio/' + path
  const sha256 = createHash('sha256').update(readFileSync(new URL('../' + path, target), 'utf8').replace(/\r\n/g, '\n')).digest('hex')
  const entry = manifest.localFiles.find(file => file.local === local)
  if (checking) { if (entry?.sha256 !== sha256) throw new Error('Unrecorded studio source: ' + path) }
  else if (entry) entry.sha256 = sha256
  else manifest.localFiles.push({ local, sha256, origin: path.startsWith('engine/') ? 'Generated from the canonical SiteBuildingSkill tools; Node I/O replaced for browser portability. Not imported from a commerce repository.' : 'Original portable runtime extracted and generalized from the owner’s CBD studio; no third-party implementation copied.' })
}
if (!checking) writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n')
