import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkResources, skillRoot, within } from './check-resources.mjs'

export function copyComponent(name, destination, root = skillRoot) {
  const valid = new Set(['button', 'dropdown-menu', 'navigation-menu', 'icons', 'commerce', 'quality'])
  if (!valid.has(name)) throw new Error(`Choose: ${[...valid].join(', ')}`)
  if (!destination) throw new Error('Destination is required')
  const out = resolve(destination)
  const rel = relative(root, out)
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('Do not copy into the skill itself')
  if (existsSync(out)) throw new Error('Destination already exists; choose a new directory')
  const report = checkResources(root)
  if (report.errors.length) throw new Error(report.errors.join('\n'))
  const manifest = JSON.parse(readFileSync(join(root, 'upstream.json'), 'utf8'))
  const whole = ['icons', 'commerce', 'quality'].includes(name)
  const prefix = name === 'icons' ? 'assets/icons/lucide/' : whole ? `assets/${name}/` : 'assets/components/shadcn/'
  const selected = [...manifest.files, ...manifest.localFiles].filter(entry =>
    entry.local.startsWith(prefix) && (whole ||
      [name + '.tsx', 'cn.ts', 'LICENSE.md'].includes(basename(entry.local))))
  if (!selected.length) throw new Error('No matching resources')
  // Read/validate all inputs before creating the destination. Never overwrite.
  const inputs = selected.map(entry => ({ entry, source: within(root, entry.local) }))
  const guidePath = ['commerce', 'quality'].includes(name) ? `assets/${name}/INTEGRATION.md` : 'assets/components/INTEGRATION.md'
  const guide = readFileSync(join(root, guidePath), 'utf8')
    .replace('../../upstream.json', 'component-source.json')
  mkdirSync(out, { recursive: true })
  for (const { entry, source } of inputs) copyFileSync(source, join(out, basename(entry.local)), 1)
  writeFileSync(join(out, 'component-source.json'), JSON.stringify({
    version: 1, component: name, status: 'source-candidate-needs-project-integration',
    files: selected,
  }, null, 2) + '\n', { flag: 'wx' })
  writeFileSync(join(out, 'INTEGRATION.md'), guide, { flag: 'wx' })
  return { destination: out, files: selected.length + 2 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(copyComponent(process.argv[2], process.argv[3]), null, 2)) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
