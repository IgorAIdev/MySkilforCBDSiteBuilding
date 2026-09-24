/**
 * Детектор impeccable по отрисованной странице — `check:detect` (И310).
 *
 * Дефект 24.09.2026: дизайн мерился только по файлу. Карточка в карточке,
 * прилипшая к краю полоса, невидимое в покое — то, что получается на экране
 * из каскада и раскладки, — не мерилось ничем, хотя у impeccable есть
 * детектор ровно на это. Набор его не вёз: запускатель качает бинарь.
 * Вендорена страничная сборка движка 0.1.5 — без сети и без запускателя.
 *
 * Здесь держится: файл тот, что разобран (хеши VENDOR.json и SOURCE.md
 * сходятся, подмена — «не проверено»); сетевых вызовов в нём нет, кроме
 * разобранных; у каждого правила сборки ровно одна судьба; без сайта — «не
 * проверено», а не зелёное. И на настоящем браузере, если Playwright есть:
 * чистая страница — ноль, карточка в карточке, невидимое в покое,
 * прилипшая полоса и ошибка скрипта — каждая своей семьёй, храповик по
 * странице и закрытая чужая сеть.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { appendFileSync, cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  VENDOR, DETECTOR, REGISTRY, DETECT_RULES, DETECT_FAMILIES, DETECT_LABELS, DETECT_SOURCES, DETECT_MAP, DETECT_OFF, DETECT_ADVISORY,
} from '../tools/detect-families.mjs'
import { CSS_FAMILIES } from '../tools/css-families.mjs'
import { CRAFT_FAMILIES } from '../tools/craft-families.mjs'
import { DESIGN_FAMILIES } from '../tools/design-families.mjs'
import { CODE_FAMILIES } from '../tools/code-families.mjs'
import { SCRIPTS } from '../scripts.mjs'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')

test('сборка та, что разобрана: хеши VENDOR.json совпадают с файлами и с SOURCE.md', () => {
  assert.equal(sha(DETECTOR), VENDOR.sha256, 'детектор')
  assert.equal(sha(REGISTRY), VENDOR.registrySha256, 'antipatterns.json')
  for (const [name, hash] of Object.entries(VENDOR.licenseFiles)) assert.equal(sha(join(KIT, 'tools/vendor/impeccable', name)), hash, name)
  const source = readFileSync(join(KIT, 'tools/vendor/impeccable/SOURCE.md'), 'utf8')
  for (const h of [VENDOR.sha256, VENDOR.registrySha256, VENDOR.commit]) assert.ok(source.includes(h), `SOURCE.md не называет ${h}`)
  assert.match(readFileSync(join(KIT, '.gitattributes'), 'utf8'), /^tools\/vendor\/\*\* -text$/m, 'git переведёт концы строк — хеш разойдётся')
})

test('подменённая сборка — «не проверено», выход 2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-detect-sha-'))
  try {
    cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
    appendFileSync(join(dir, 'tools/vendor/impeccable', VENDOR.file), '\n;fetch("https://example.invalid")\n')
    const r = spawnSync(process.execPath, [join(dir, 'tools/check-detect.mjs')], { cwd: dir, encoding: 'utf8', env: { ...process.env, SITE: 'http://127.0.0.1:9' } })
    assert.equal(r.status, 2, r.stderr)
    assert.match(r.stderr, /НЕ ПРОВЕДЁН[\s\S]*не совпал с закреплённым/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('сеть в сборке — только разобранное: fetch лишь в неиспользуемом загрузчике wasm, картинки — лишь в замере по снимкам', () => {
  const text = readFileSync(DETECTOR, 'utf8')
  for (const rx of [/XMLHttpRequest/, /WebSocket/, /EventSource/, /sendBeacon/, /importScripts/, /\bimport\s*\(/,
    /new\s+(Shared)?Worker/, /\bnavigator\./, /\beval\s*\(/, /new\s+Function\b/, /https:\/\//,
    /createElement\(\s*['"](script|link|iframe|img|object|embed)['"]/, /\.href\s*=(?!=)/, /setAttribute\(\s*['"](src|href|action)/]) {
    const hit = text.match(rx)
    assert.ok(!hit, `нашёлся ${rx} («${hit?.[0]}») — сборку разобрать заново, не вставлять (SOURCE.md)`)
  }
  assert.equal(text.match(/\bfetch\(/g)?.length, 1, 'fetch — ровно один, в загрузчике wasm-bindgen')
  assert.ok(text.includes('wasm_bindgen.initSync({ module: __impeccableWasmBytes() })'), 'ядро встаёт из вшитых байтов, без загрузки')
  assert.equal(text.match(/__wbg_init\(/g)?.length, 1, 'асинхронный загрузчик с fetch только объявлен — не зовётся')
  assert.ok(!/\bwasm_bindgen\(/.test(text), 'асинхронный загрузчик не зовётся и по имени wasm_bindgen')
  assert.equal(text.match(/\.src\s*=(?!=)/g)?.length, 1, 'картинка грузится в одном месте — в замере контраста по снимкам')
  assert.match(readFileSync(join(KIT, 'tools/check-detect.mjs'), 'utf8'), /visualContrast: false/, 'замер по снимкам выключен — картинки не грузятся')
})

test('у каждого правила сборки ровно одна судьба; у каждой семьи — правило, подпись и источник', () => {
  const ids = DETECT_RULES.map((r) => r.id)
  assert.equal(ids.length, 61, 'правил в antipatterns.json')
  const fates = [...Object.keys(DETECT_MAP), ...Object.keys(DETECT_OFF), ...DETECT_ADVISORY]
  assert.deepEqual([...fates].sort(), [...ids].sort(), 'судьбы покрывают правила сборки ровно')
  assert.equal(new Set(fates).size, fates.length, 'у правила две судьбы')
  for (const fam of Object.values(DETECT_MAP)) assert.ok(DETECT_FAMILIES.includes(fam), `семья ${fam} не объявлена`)
  for (const fam of DETECT_FAMILIES) {
    assert.ok(Object.values(DETECT_MAP).includes(fam), `семья ${fam} без правила — правило без реализации`)
    assert.ok(DETECT_LABELS[fam], `${fam} без подписи`)
    assert.ok(DETECT_SOURCES[fam], `${fam} без источника`)
  }
  const known = new Set([...CSS_FAMILIES, ...CRAFT_FAMILIES, ...DESIGN_FAMILIES, ...CODE_FAMILIES, ...Object.keys(SCRIPTS)])
  for (const [id, by] of Object.entries(DETECT_OFF)) {
    assert.ok(by.length, `${id}: выключено, а кто отвечает — не сказано`)
    for (const x of by) assert.ok(known.has(x), `${id}: отвечает «${x}», а такой семьи или команды в наборе нет`)
  }
})

test('без сайта — «не проверено», выход 2, а не зелёное', () => {
  const env = { ...process.env }
  delete env.SITE
  const r = spawnSync(process.execPath, [join(KIT, 'tools/check-detect.mjs')], { cwd: KIT, encoding: 'utf8', env })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /НЕ ПРОВЕДЁН: нет SITE=/)
})

test('ставщик, сборщик и команды везут проход', () => {
  assert.equal(SCRIPTS['check:detect'], 'node tools/check-detect.mjs')
  assert.equal(JSON.parse(readFileSync(join(KIT, 'package.json'), 'utf8')).scripts['check:detect'], 'node tools/check-detect.mjs')
  const builder = readFileSync(join(KIT, 'tools/kit.mjs'), 'utf8')
  for (const f of ['tools/check-detect.mjs', 'tools/detect-families.mjs', `tools/vendor/impeccable/${VENDOR.file}`,
    `tools/vendor/impeccable/${VENDOR.registry}`, 'tools/vendor/impeccable/VENDOR.json', 'tools/vendor/impeccable/SOURCE.md',
    'tools/vendor/impeccable/LICENSE', 'tools/vendor/impeccable/NOTICE.md']) {
    assert.match(builder, new RegExp(`'${f.replace(/[./]/g, '\\$&')}'`), `сборщик не везёт ${f}`)
  }
})

/* ── на настоящем браузере — если Playwright есть ─────────────────────── */

const playwright = spawnSync(process.execPath, ['--input-type=module', '-e',
  `await import(${JSON.stringify(pathToFileURL(join(KIT, 'tools/browser.mjs')).href)}).then((m) => m.loadPlaywright())`], { encoding: 'utf8' })
const NO_BROWSER = playwright.status === 0 ? false : 'нет Playwright (PLAYWRIGHT=… или npm i -D playwright) — страницы-образцы не проверены'

const TEXT = 'Body text long enough to be read as a paragraph by the detector and by a person reading the page. '
const HEAD = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>probe</title><style>
body{font:16px/1.5 system-ui, sans-serif;margin:0;padding:24px;color:#222;background:#fff}
h1{font-size:40px;margin:0 0 24px} h2{margin:32px 0 12px} p{margin:0 0 16px;max-width:60ch}
.card{background:#f3f3f3;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.2);padding:24px;margin:16px 0}
.inner{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.2);padding:16px;margin-top:12px}
.rail{display:flex;gap:12px;overflow-x:auto;padding:0}
.rail > div{flex:0 0 240px;background:#eee;border:1px solid #ccc;border-radius:10px;padding:16px;min-height:120px}
.reveal{opacity:0}
</style></head><body><h1>Probe</h1><main>`
const FIXTURES = (extra = {}) => ({
  '/clean': `<h2>Section</h2><p>${TEXT}</p><p>${TEXT}</p>`,
  '/card': `<h2>Cards</h2><div class="card"><p>${TEXT}</p><div class="inner"><p>${TEXT}</p></div></div>${extra.card ?? ''}`,
  '/hidden': `<h2>Hidden</h2><section class="reveal"><p>${TEXT.repeat(2)}</p><p>${TEXT.repeat(2)}</p></section>`,
  '/rail': `<h2>Rail</h2><div class="rail">${'<div>Card with some words</div>'.repeat(6)}</div>`,
  '/error': `<h2>Error</h2><p>${TEXT}</p><img src="http://example.invalid/pic.png" width="10" height="10" alt=""><script>throw new Error('boom on load')</script>`,
})

const run = (dir, args, env) => new Promise((resolve) => {
  const child = spawn(process.execPath, [join(dir, 'tools/check-detect.mjs'), ...args], { cwd: dir, env: { ...process.env, ...env } })
  let stdout = '', stderr = ''
  child.stdout.on('data', (d) => { stdout += d })
  child.stderr.on('data', (d) => { stderr += d })
  child.on('close', (status) => resolve({ status, stdout, stderr }))
})

test('образцы: чистая — ноль, остальные — каждая своей семьёй; храповик по странице; чужая сеть закрыта',
  { skip: NO_BROWSER, timeout: 300_000 }, async () => {
    let pages = FIXTURES()
    const server = createServer((req, res) => {
      const body = pages[req.url.split('?')[0]]
      res.writeHead(body ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' })
      res.end(body ? `${HEAD}${body}</main></body></html>` : 'no')
    })
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const SITE = `http://127.0.0.1:${server.address().port}`
    const dir = mkdtempSync(join(tmpdir(), 'kit-detect-'))
    try {
      cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
      writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true}')
      for (const p of Object.keys(pages)) {
        mkdirSync(join(dir, 'app', p), { recursive: true })
        writeFileSync(join(dir, 'app', p, 'page.tsx'), 'export default function Page() { return null }\n')
      }

      const json = await run(dir, ['--json'], { SITE })
      assert.equal(json.status, 0, json.stderr)
      const data = JSON.parse(json.stdout)
      assert.deepEqual(data.pages['/clean'], {}, `чистая страница не чиста: ${JSON.stringify(data.found.filter((f) => f.page === '/clean'))}`)
      assert.equal(data.pages['/card'].cardInCard, 1, 'карточка в карточке')
      assert.equal(data.pages['/hidden'].hiddenAtRest, 1, 'невидимое в покое')
      assert.equal(data.pages['/rail'].edgeFlush, 1, 'прилипшая полоса')
      assert.equal(data.pages['/error'].scriptError, 1, 'ошибка скрипта при загрузке')
      assert.ok(data.net.load.includes('http://example.invalid/pic.png'), 'чужой адрес не закрыт с первого запроса')

      const first = await run(dir, [], { SITE })
      assert.equal(first.status, 1, `страницы без строки базы прошли:\n${first.stdout}${first.stderr}`)
      assert.match(first.stderr, /cardInCard[\s\S]*было 0, стало 1/)

      assert.equal((await run(dir, ['--update'], { SITE })).status, 0)
      const base = JSON.parse(readFileSync(join(dir, 'tools/detect-baseline.json'), 'utf8'))
      assert.equal(base['/card'].cardInCard, 1)
      const same = await run(dir, [], { SITE })
      assert.equal(same.status, 0, `${same.stdout}${same.stderr}`)

      pages = FIXTURES({ card: `<div class="card"><p>${TEXT}</p><div class="inner"><p>${TEXT}</p></div></div>` })
      const grown = await run(dir, ['--pages', '/card'], { SITE })
      assert.equal(grown.status, 1)
      assert.match(grown.stderr, /cardInCard[\s\S]*\/card: было 1, стало 2/)
    } finally {
      server.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })
