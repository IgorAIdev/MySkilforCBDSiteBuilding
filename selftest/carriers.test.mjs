import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const REG = JSON.parse(readFileSync(join(ROOT, 'skills/site-building/assets/commerce/carriers.json'), 'utf8'))
const SERVICES = new Set(['door', 'office', 'locker'])
const ORDER = ['BG', 'RO', 'HU', 'UA', 'MD', 'GR', 'RS', 'HR', 'SI', 'PL', 'CZ', 'SK', 'LT', 'LV', 'EE', 'DE', 'AT', 'IT', 'ES', 'PT', 'FR', 'BE', 'NL', 'IE']

test('carriers: draft registry lists the agreed countries in order', () => {
  assert.equal(REG.status, 'draft')
  assert.deepEqual(REG.countries.map((c) => c.code), ORDER)
})

test('carriers: every carrier has an id, a name and closed-list services', () => {
  for (const c of REG.countries) {
    for (const k of c.carriers) {
      const at = `${c.code}/${k.id}`
      assert.ok(k.id && k.id.trim(), at)
      assert.ok(k.name && k.name.trim(), at)
      assert.ok(k.services.length && k.services.every((s) => SERVICES.has(s)), `${at}: services`)
      assert.ok(k.cod === null || typeof k.cod === 'boolean', `${at}: cod`)
    }
  }
})

/* И261: имя службы — данные. В коде шаблона витрины его нет нигде, кроме
   образца данных lib/shipping.ts: страница, которая пишет имя службы сама,
   прибита к одному рынку. */
test('carriers: the storefront template names no carrier outside its sample data', () => {
  const names = REG.countries.flatMap((c) => c.carriers.map((k) => k.name)).filter((n) => n.length > 3)
  const base = join(ROOT, 'templates/storefront')
  const files = []
  const walk = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n)
      if (statSync(p).isDirectory()) { if (!['node_modules', '.next', 'docs', 'tests'].includes(n)) walk(p) }
      else if (/\.(tsx?|mjs|css|json)$/.test(n)) files.push(p)
    }
  }
  walk(base)
  const SAMPLE = new Set(['lib/shipping.ts'])
  const hits = []
  for (const f of files) {
    const rel = relative(base, f).replaceAll('\\', '/')
    if (SAMPLE.has(rel)) continue
    const text = readFileSync(f, 'utf8')
    for (const n of names) if (text.includes(n)) hits.push(`${rel}: ${n}`)
  }
  assert.deepEqual(hits, [])
})
