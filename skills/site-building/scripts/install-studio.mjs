import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
const source = fileURLToPath(new URL('../assets/studio/', import.meta.url))
const hash = content => createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
export function installStudio(destination, check = false) {
  if (!destination) throw new Error('Destination required')
  const target = resolve(destination)
  const sourceRelative = relative(source, target)
  if (!sourceRelative || (!sourceRelative.startsWith('..') && !isAbsolute(sourceRelative))) throw new Error('Cannot install into the source')
  const manifestPath = resolve(target, 'studio-source.json')
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { files: {} }
  const inputs = []
  function walk(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, item.name)
      if (item.isSymbolicLink()) throw new Error('Symlink in resource source')
      if (item.isDirectory()) walk(path)
      else inputs.push({ path: relative(source, path).replaceAll('\\', '/'), text: readFileSync(path, 'utf8').replace(/\r\n/g, '\n') })
    }
  }
  walk(source)
  // Validate the entire update before any write; unowned files remain untouched.
  for (const input of inputs) {
    const path = resolve(target, input.path)
    const actual = existsSync(path) ? hash(readFileSync(path, 'utf8')) : null
    const expected = hash(input.text)
    if (check && actual !== expected) throw new Error(`Stale studio resource: ${input.path}`)
    if (!check && actual && actual !== expected && actual !== previous.files[input.path]) throw new Error(`Local changes: ${input.path}; merge before updating`)
  }
  if (!check) {
    for (const input of inputs) { const path = resolve(target, input.path); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, input.text) }
    writeFileSync(manifestPath, JSON.stringify({ version: 1, files: Object.fromEntries(inputs.map(input => [input.path, hash(input.text)])) }, null, 2) + '\n')
  }
  return { files: inputs.length, destination: target, checked: check }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(installStudio(process.argv.slice(2).find(value => value !== '--check'), process.argv.includes('--check')))) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
