/*
 * Движок мастерской — копия tools/ для браузера: одна математика для панели,
 * сайта, проверок и выгрузки.
 *
 *   node tools/sync-studio-assets.mjs           выпустить копию и записать хеши
 *   node tools/sync-studio-assets.mjs --check   сверить: текст, переносимость и ВЫВОД
 *
 * И247: прежняя сверка сравнивала копию с тем же заменённым текстом — сменилась
 * строка ввоза, замена молча не сработала, копия ввозила `kit-config.mjs` или
 * `node:fs`, а проверка печатала «совпадает». Теперь:
 *   - каждое правило замены срабатывает ровно один раз, иначе отказ;
 *   - копия ввозит только соседей по папке движка — ни `node:`, ни конфиг;
 *   - сверка ЗАПУСКАЕТ обе версии и сравнивает вывод на всех наборах шкал
 *     и палитр набора: одна математика — это один и тот же ответ.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { PREFIX, BREAKPOINTS } from './kit-config.mjs'

const target = new URL('../skills/site-building/assets/studio/engine/', import.meta.url)
const checking = process.argv.includes('--check')
const ENGINE = ['scale.mjs', 'palette.mjs', 'thresholds.mjs', 'palette-profile.json']

const RULES = {
  'scale.mjs': [["import { PREFIX, BREAKPOINTS } from './kit-config.mjs'", `const PREFIX = ${JSON.stringify(PREFIX)}\nconst BREAKPOINTS = ${JSON.stringify(BREAKPOINTS)}`]],
  'palette.mjs': [
    ["import { readFileSync } from 'node:fs'", "import profile from './palette-profile.json' with { type: 'json' }"],
    [/readFileSync\(new URL\('palette-profile.json', import.meta.url\), 'utf8'\)/, 'JSON.stringify(profile)'],
  ],
}

const fail = (message) => { console.error(`✗ ${message}`); process.exit(1) }

/** Ввозы копии: только соседи по папке движка. */
function portable(name, source) {
  for (const m of source.matchAll(/(?:^|\n)\s*import\s[^'"]*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1] ?? m[2] ?? m[3]
    if (!spec.startsWith('./') || !ENGINE.includes(spec.slice(2))) fail(`studio engine ${name} imports ${spec}: not portable to the browser (only ./${ENGINE.join(', ./')})`)
  }
}

function transform(name, source) {
  for (const [from, to] of RULES[name] ?? []) {
    const hits = typeof from === 'string' ? source.split(from).length - 1 : (source.match(new RegExp(from.source, 'g')) ?? []).length
    if (hits !== 1) fail(`studio sync rule for ${name} matched ${hits} times — the import in tools/${name} changed; update tools/sync-studio-assets.mjs`)
    source = source.replace(from, to)
  }
  source = source.replace(/\r\n/g, '\n')
  if (name.endsWith('.mjs')) portable(name, source)
  return source
}

if (!checking) mkdirSync(target, { recursive: true })
for (const name of ENGINE) {
  const source = transform(name, readFileSync(new URL(name, import.meta.url), 'utf8'))
  if (checking) {
    const copy = readFileSync(new URL(name, target), 'utf8').replace(/\r\n/g, '\n')
    if (name.endsWith('.mjs')) portable(name, copy)
    if (copy !== source) fail(`Stale studio engine: ${name} — выпустить: node tools/sync-studio-assets.mjs`)
  } else writeFileSync(new URL(name, target), source)
}

/* Один ответ: обе версии считают все наборы шкал и палитр набора. */
const canonical = (value) => JSON.stringify(value)
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const [toolScale, toolPalette, engineScale, enginePalette] = await Promise.all([
  import('./scale.mjs'), import('./palette.mjs'),
  import(new URL('scale.mjs', target).href), import(new URL('palette.mjs', target).href),
]).catch((e) => fail(`studio engine does not load: ${e.message}`))
const scaleSets = read('../styles/scale.json')
const paletteSets = { ...read('../styles/palette.json'), ...read('../templates/palette.json') }
const compare = (what, a, b) => { if (canonical(a) !== canonical(b)) fail(`studio engine output differs from tools/: ${what}`) }
compare('scale toCss', toolScale.toCss(scaleSets), engineScale.toCss(scaleSets))
for (const [name, set] of Object.entries(scaleSets)) compare(`scale audit ${name}`, toolScale.auditScale(set), engineScale.auditScale(set))
for (const [name, set] of Object.entries(paletteSets)) {
  for (const mode of ['light', 'dark'].filter((m) => set[m])) {
    compare(`palette roles ${name} ${mode}`, toolPalette.roles(set[mode], mode), enginePalette.roles(set[mode], mode))
    compare(`palette audit ${name} ${mode}`, toolPalette.auditPalette(set[mode], mode), enginePalette.auditPalette(set[mode], mode))
  }
}
const sets = Object.keys(scaleSets).length + Object.keys(paletteSets).length
console.log(checking ? `Studio engines match canonical sources and give the same output on ${sets} sets` : `Studio engines generated; same output on ${sets} sets`)

const manifestUrl = new URL('../skills/site-building/upstream.json', import.meta.url)
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'))
for (const path of ['snapshot.mjs', 'store.mjs', 'document.mjs', 'handoff.mjs', 'selection.mjs', 'engine/scale.mjs', 'engine/palette.mjs', 'engine/thresholds.mjs', 'engine/palette-profile.json']) {
  const local = 'assets/studio/' + path
  const sha256 = createHash('sha256').update(readFileSync(new URL('../' + path, target), 'utf8').replace(/\r\n/g, '\n')).digest('hex')
  const entry = manifest.localFiles.find(file => file.local === local)
  if (checking) { if (entry?.sha256 !== sha256) fail('Unrecorded studio source: ' + path) }
  else if (entry) entry.sha256 = sha256
  else manifest.localFiles.push({ local, sha256, origin: path.startsWith('engine/') ? 'Generated from the canonical SiteBuildingSkill tools; Node I/O replaced for browser portability. Not imported from a commerce repository.' : 'Original portable runtime extracted and generalized from the owner’s CBD studio; no third-party implementation copied.' })
}
if (!checking) writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n')
