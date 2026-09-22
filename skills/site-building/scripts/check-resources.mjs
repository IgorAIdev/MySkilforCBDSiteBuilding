import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const skillRoot = fileURLToPath(new URL('..', import.meta.url))
export const digest = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex')
export function within(root, path) {
  const full = resolve(root, path)
  const rel = relative(root, full)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Path outside resource root: ${path}`)
  return full
}

export function checkResources(root = skillRoot) {
  const manifest = JSON.parse(readFileSync(join(root, 'upstream.json'), 'utf8'))
  const errors = []
  const files = [...manifest.files, ...manifest.localFiles]
  const known = new Set()
  for (const entry of files) {
    if (known.has(entry.local)) errors.push(`Duplicate resource: ${entry.local}`)
    known.add(entry.local)
    const full = within(root, entry.local)
    if (!existsSync(full) || digest(readFileSync(full, 'utf8')) !== entry.sha256) {
      errors.push(`Resource missing or changed: ${entry.local}`)
    }
    if (entry.repo) {
      if (!/^[a-f0-9]{40}$/.test(entry.commit)) errors.push(`Unpinned resource: ${entry.local}`)
      if (!entry.licenseFile || !existsSync(within(root, entry.licenseFile))) errors.push(`Missing license: ${entry.local}`)
    }
  }
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])
  for (const file of walk(root).filter(f => f.endsWith('.md'))) {
    const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '')
    for (const [, raw] of text.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^[a-z]+:|^#/i.test(raw)) continue
      const target = decodeURIComponent(raw.split('#')[0])
      const full = resolve(dirname(file), target)
      const rel = relative(root, full)
      if (rel.startsWith('..') || isAbsolute(rel) || !existsSync(full)) errors.push(`Broken or external local link: ${relative(root, file)} -> ${raw}`)
    }
  }
  return { files: files.length, errors }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = checkResources()
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = report.errors.length ? 1 : 0
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
