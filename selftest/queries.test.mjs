/**
 * Страницы с запросом в дереве маршрутов (И345): `queries` в kit.config.json —
 * форма маршрута → строки запроса. Поиск с запросом (`/[lang]/search?q=…`) —
 * та же страница, другая раскладка; дерево строится по файлам `page.tsx`, и
 * без записи отрисованные проверки мерили только поиск без запроса.
 * Изолированная копия, как у `sessions.test.mjs`: свои tools/, свой
 * kit.config.json, своё дерево `app/`, отдельный процесс.
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

function routesWith(config) {
  const root = mkdtempSync(join(tmpdir(), 'kit-queries-'))
  try {
    mkdirSync(join(root, 'tools'))
    for (const f of TOOLS) copyFileSync(join(KIT, 'tools', f), join(root, 'tools', f))
    for (const page of ['app/[lang]/page.tsx', 'app/[lang]/search/page.tsx', 'app/[lang]/cart/page.tsx']) {
      mkdirSync(join(root, page, '..'), { recursive: true })
      writeFileSync(join(root, page), 'export default function Page() { return null }\n')
    }
    mkdirSync(join(root, 'lib'))
    writeFileSync(join(root, 'lib/locale.ts'), "export const LOCALES = ['ro', 'en'] as const\nexport const DEFAULT_LANG: Lang = 'en'\n")
    writeFileSync(join(root, 'kit.config.json'), JSON.stringify(config))
    const run = spawnSync(process.execPath, ['-e', "import('./tools/routes.mjs').then((m) => console.log(JSON.stringify({ all: m.all(), sample: m.sample() })))"], { cwd: root, encoding: 'utf8' })
    return { code: run.status, out: run.stdout, err: run.stderr, lists: run.status === 0 ? JSON.parse(run.stdout.trim().split('\n').pop()) : null }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('queries: a search with and without results is in both lists, per language', () => {
  const r = routesWith({ queries: { '/[lang]/search': ['q=cbd', 'q=zzzz'] } })
  assert.equal(r.code, 0, r.err)
  for (const list of [r.lists.all, r.lists.sample]) {
    for (const url of ['/en/search?q=cbd', '/en/search?q=zzzz', '/ro/search?q=cbd', '/ro/search?q=zzzz', '/en/search']) {
      assert.ok(list.includes(url), `${url} — нет в списке: ${list.join(' ')}`)
    }
    assert.ok(!list.some((u) => u.startsWith('/en/cart?')), 'запрос лёг на чужую форму')
  }
})

test('queries: no key — no query pages; a shape outside the tree warns and is skipped', () => {
  const none = routesWith({})
  assert.equal(none.code, 0, none.err)
  assert.ok(!none.lists.sample.some((u) => u.includes('?q=')))
  const typo = routesWith({ queries: { '/[lang]/serch': ['q=cbd'] } })
  assert.equal(typo.code, 0, typo.err)
  assert.match(typo.err, /«\/\[lang\]\/serch» из «queries» — не из дерева маршрутов/)
  assert.ok(!typo.lists.sample.some((u) => u.includes('?q=')))
})

test('queries: a crooked record fails loudly, not silently dropping the page', () => {
  for (const bad of [null, [], { '/[lang]/search': 'q=cbd' }, { '/[lang]/search': [] }, { '/[lang]/search': ['?q=cbd'] }, { 'search': ['q=cbd'] }, { '/[lang]/search': ['q=cbd#x'] }]) {
    const r = routesWith({ queries: bad })
    assert.equal(r.code, 1, `${JSON.stringify(bad)} принято:\n${r.out}${r.err}`)
    assert.match(r.err, /«queries/)
  }
})
