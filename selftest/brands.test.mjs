/**
 * Реестр марок, который считается из каталога (И455): марка — грань движка,
 * адрес — ключ из имени (`brandKeyOf`) или поле `brandKey` товара, списка
 * `{ slug, name }` в `lib/brands.ts` нет. Дефект 26.09.2026: на cbdin.bg
 * `assertData` ронял обход дерева «разбор данных дал пусто — BRANDS», и
 * проект чинил это своей копией `routes.mjs`. Изолированная копия, как у
 * `live-routes.test.mjs`: свои tools/, своё `lib/`, отдельный процесс.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const TOOLS = ['kit-config.mjs', 'seams.mjs', 'thresholds.mjs', 'routes.mjs', 'sessions.mjs']
const CATALOGUE = [
  "export const CATEGORIES = [{ slug: 'oils' }]",
  "  { id:'a-5', cat:'oils', brand:'Rila Botanics', family:'a' },",
  "  { id:'a-10', cat:'oils', brand:'Rila Botanics', family:'a' },",
  "  { id:'b-5', cat:'oils', brand:'Pirin Leaf', brandKey:'pirin', family:'b' },",
  '',
].join('\n')

function brandsOf(brandsFile) {
  const root = mkdtempSync(join(tmpdir(), 'kit-brands-'))
  try {
    mkdirSync(join(root, 'tools'))
    for (const f of TOOLS) copyFileSync(join(KIT, 'tools', f), join(root, 'tools', f))
    mkdirSync(join(root, 'lib'))
    writeFileSync(join(root, 'lib/products.ts'), CATALOGUE)
    writeFileSync(join(root, 'lib/brands.ts'), brandsFile)
    const probe = "const m = await import('./tools/routes.mjs'); m.assertData(); console.log(JSON.stringify(m.BRANDS))"
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: root, encoding: 'utf8' })
    return { status: r.status, brands: r.status === 0 ? JSON.parse(r.stdout) : null, err: r.stderr }
  } finally { rmSync(root, { recursive: true, force: true }) }
}

test('реестр, посчитанный из каталога через brandKeyOf, даёт марки с ключом из имени или brandKey (И455)', () => {
  const r = brandsOf("import { PRODUCTS, brandKeyOf } from './products.ts'\nexport const brandsOf = (list = PRODUCTS) => list.map((p) => ({ slug: brandKeyOf(p), name: p.brand }))\n")
  assert.equal(r.status, 0, r.err)
  assert.deepEqual(r.brands, [{ slug: 'rila-botanics', name: 'Rila Botanics' }, { slug: 'pirin', name: 'Pirin Leaf' }])
})

test('реестр списком читается списком — каталог его не подменяет', () => {
  const r = brandsOf("export const BRANDS = [\n  { slug: 'rila', name: 'Rila Botanics' },\n]\n")
  assert.equal(r.status, 0, r.err)
  assert.deepEqual(r.brands, [{ slug: 'rila', name: 'Rila Botanics' }])
})

test('файл марок без списка и без brandKeyOf — по-прежнему сломанный разбор', () => {
  const r = brandsOf("export const BRANDS = [{ slug: \"rila\", name: \"Rila Botanics\" }]\n")
  assert.equal(r.status, 1)
  assert.match(r.err, /разбор данных дал пусто — BRANDS/)
})
