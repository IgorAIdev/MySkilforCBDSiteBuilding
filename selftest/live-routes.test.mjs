/**
 * Дерево маршрутов у внешнего источника (И414): при `SOURCE=vendure` полок и
 * товаров в файлах нет — адреса знает сам сайт, его `/sitemap.xml`. Дефект
 * 25.09.2026: `check:open` на витрине с каталогом cbdin стучался в полки и
 * товары образца — 48 адресов из 96 «не найдено», а сайт был цел.
 * Изолированная копия, как у `queries.test.mjs`: свои tools/, своё дерево
 * `app/`, свой `.env`, отдельный процесс; карту сайта отдаёт маленький
 * сервер здесь же.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const TOOLS = ['kit-config.mjs', 'seams.mjs', 'thresholds.mjs', 'routes.mjs', 'sessions.mjs']
const PAGES = ['app/[lang]/page.tsx', 'app/[lang]/cart/page.tsx', 'app/[lang]/catalog/[cat]/page.tsx', 'app/[lang]/product/[id]/page.tsx']

function site(env) {
  const root = mkdtempSync(join(tmpdir(), 'kit-live-'))
  mkdirSync(join(root, 'tools'))
  for (const f of TOOLS) copyFileSync(join(KIT, 'tools', f), join(root, 'tools', f))
  for (const page of PAGES) {
    mkdirSync(join(root, page, '..'), { recursive: true })
    writeFileSync(join(root, page), 'export default function Page() { return null }\n')
  }
  mkdirSync(join(root, 'lib'), { recursive: true })
  writeFileSync(join(root, 'lib/locale.ts'), "export const LOCALES = ['ro', 'en'] as const\nexport const DEFAULT_LANG: Lang = 'en'\n")
  /* Образец в файлах — чужие имена: у внешнего источника их брать нельзя. */
  writeFileSync(join(root, 'lib/products.ts'), "export const C = [{ slug: 'uleiuri' }]\n  { id:'ulei-cbd-5', cat:'uleiuri' }\n")
  writeFileSync(join(root, '.env'), env)
  return root
}

function lists(root, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['-e', "import('./tools/routes.mjs').then((m) => console.log(JSON.stringify({ source: m.SOURCE, all: m.all(), sample: m.sample() })))"], {
      cwd: root, env: { ...process.env, SOURCE: '', ...extraEnv },
    })
    let out = '', err = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('close', (code) => resolve({ code, err, lists: code === 0 ? JSON.parse(out.trim().split('\n').pop()) : null }))
  })
}

const SITEMAP = ['/en', '/ro', '/en/catalog/oil', '/en/catalog/flowers', '/ro/catalog/ulei', '/en/product/gelato', '/en/product/buds', '/en/product/oil-10', '/ro/product/gelato']

test('live routes: an external source takes shelves and products from the live sitemap, per language', async () => {
  const server = createServer((req, res) => {
    res.setHeader('content-type', 'application/xml')
    res.end(`<urlset>${SITEMAP.map((p) => `<url><loc>http://example.test${p}</loc></url>`).join('')}</urlset>`)
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const root = site('SOURCE=vendure\n')
  try {
    const r = await lists(root, { SITE: `http://127.0.0.1:${server.address().port}` })
    assert.equal(r.code, 0, r.err)
    assert.equal(r.lists.source, 'vendure')
    for (const url of ['/en/catalog/oil', '/en/catalog/flowers', '/ro/catalog/ulei', '/en/product/gelato', '/en/product/oil-10', '/ro/product/gelato', '/en/cart', '/ro/cart', '/en']) {
      assert.ok(r.lists.all.includes(url), `${url} — нет в списке: ${r.lists.all.join(' ')}`)
    }
    assert.ok(!r.lists.all.some((u) => u.includes('uleiuri') || u.includes('ulei-cbd-5')), 'в список попали имена образца')
    assert.ok(!r.lists.all.includes('/ro/catalog/oil'), 'имя полки одного языка подставлено в другой')
    /* Образцы — два конца по форме и языку, не все товары. */
    assert.deepEqual(r.lists.sample.filter((u) => u.startsWith('/en/product/')), ['/en/product/gelato', '/en/product/oil-10'])
  } finally {
    server.close()
    rmSync(root, { recursive: true, force: true })
  }
})

test('live routes: an external source without SITE stops and names what it needs', async () => {
  const root = site('SOURCE=vendure\n')
  try {
    const r = await lists(root, { SITE: '' })
    assert.notEqual(r.code, 0)
    assert.match(r.err, /источник витрины — vendure; адреса полок и товаров знает сам сайт/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('live routes: the sample source keeps the file data, as before', async () => {
  const root = site('# без источника\n')
  try {
    const r = await lists(root, { SITE: '' })
    assert.equal(r.code, 0, r.err)
    assert.equal(r.lists.source, 'sample')
    assert.ok(r.lists.all.includes('/en/catalog/uleiuri'), r.lists.all.join(' '))
    assert.ok(r.lists.all.includes('/en/product/ulei-cbd-5'), r.lists.all.join(' '))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
