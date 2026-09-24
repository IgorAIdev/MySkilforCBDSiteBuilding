/**
 * Семьи `check:craft` из внешнего разбора 24.09.2026 — на настоящем браузере.
 *
 *   name        — поле без подписи (подсказка внутри поля именем не считается);
 *   fieldZoom   — поле мельче 16px на телефоне (iOS увеличивает страницу);
 *   autofill    — поле оформления без autocomplete (WCAG 1.3.5), личные страницы;
 *   h1Lines     — главный заголовок длиннее трёх строк;
 *   scriptError — страница бросила ошибку при загрузке.
 *
 * Поднимается крошечный сервер с тремя страницами — грязной, личной (форма
 * оформления) и чистой, — и настоящая проверка идёт по ним узким прогоном.
 * Браузер нужен настоящий: семьи меряют отрисованное. Где Playwright и sharp
 * не поставлены (у набора своих node_modules нет), тест пропускается с
 * причиной; прогнать его — указать папку с ними: CRAFT_MODULES=…/node_modules
 * (проверка получает их путями `PLAYWRIGHT=` и `SHARP=`, tools/browser.mjs).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))

/** Папка с playwright и sharp: названная словом или своя у набора. */
const modules = (() => {
  if (process.env.CRAFT_MODULES) return existsSync(join(process.env.CRAFT_MODULES, 'playwright')) ? process.env.CRAFT_MODULES : null
  try {
    const req = createRequire(join(KIT, 'package.json'))
    req.resolve('playwright'); req.resolve('sharp')
    return join(KIT, 'node_modules')
  } catch { return null }
})()

const shell = (title, body, style = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8">`
  + `<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>`
  + `<style>body{margin:0;font:16px/1.5 sans-serif}main{padding:24px}${style}</style></head>`
  + `<body><header><a href="/">Shop</a></header><main>${body}</main></body></html>`

const PAGES = {
  '/home': shell('Dirty',
    '<h1 class="narrow">A very long product name that keeps wrapping line after line</h1>'
    + '<input type="text" name="q" placeholder="Search">'
    + '<script>throw new Error("boom at load")</script>',
    '.narrow{inline-size:140px;font-size:32px;line-height:40px;margin:0}input{font-size:13px}'),
  '/checkout': shell('Checkout',
    '<h1>Contact</h1><form>'
    + '<label for="e">Email</label><input id="e" type="email" name="email">'
    + '<label>Phone <input type="tel" name="phone" autocomplete="off"></label>'
    + '<label>City <input name="city" autocomplete="address-level2"></label>'
    + '<label>Coupon <input name="code" autocomplete="off"></label>'
    + '</form>',
    'input{font-size:16px}'),
  '/clean': shell('Clean',
    '<h1>Short name</h1><label for="n">Name</label><input id="n" name="name" autocomplete="name">',
    'input{font-size:16px}'),
}

const serve = () => new Promise((resolve) => {
  const server = createServer((req, res) => {
    const url = req.url.split('?')[0]
    if (PAGES[url]) { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGES[url]) } else { res.writeHead(404); res.end('') }
  })
  server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }))
})

const run = (dir, base, args) => new Promise((resolve) => {
  const child = spawn(process.execPath, [join(dir, 'tools/check-craft.mjs'), ...args], {
    cwd: dir,
    env: { ...process.env, SITE: base, CRAFT_LANES: '2',
      PLAYWRIGHT: join(modules, 'playwright/index.mjs'), SHARP: join(modules, 'sharp/dist/index.mjs') },
  })
  let stdout = '', stderr = ''
  child.stdout.on('data', (d) => { stdout += d })
  child.stderr.on('data', (d) => { stderr += d })
  child.on('close', (status) => resolve({ status, stdout, stderr }))
})

test('craft: поле без подписи, мелкое поле, автозаполнение, три строки заголовка, ошибка скрипта',
  { skip: modules ? false : 'нет Playwright и sharp — CRAFT_MODULES=…/node_modules, где они стоят', timeout: 300_000 }, async () => {
  const { server, base } = await serve()
  const dir = mkdtempSync(join(tmpdir(), 'kit-craft-'))
  try {
    cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true,"type":"module"}')
    for (const p of ['app/home', 'app/checkout', 'app/clean']) { mkdirSync(join(dir, p), { recursive: true }); writeFileSync(join(dir, p, 'page.tsx'), 'export default () => null\n') }
    writeFileSync(join(dir, 'kit.config.json'), JSON.stringify({ sessions: { cookie: 'sid', pages: { '/checkout': ['s1'] } } }))
    const out = join(dir, 'found.json')
    const r = await run(dir, base, ['--pages', '/home,/checkout#as=s1,/clean', '--only', 'name,fieldZoom,autofill,h1Lines,scriptError', '--json', out])
    assert.equal(r.status, 0, r.stdout + r.stderr)
    const { found } = JSON.parse(readFileSync(out, 'utf8'))
    const on = (fam, page) => found[fam].filter((l) => l.startsWith(`${page} `))

    assert.ok(on('name', '/home').some((l) => /поле input\[type=text\] name="q" — без подписи \(подсказка «Search» — не имя\)/.test(l)), found.name.join('\n'))
    assert.deepEqual(on('name', '/checkout#as=s1'), [], 'подпись label[for] и обёрткой — имя')

    assert.deepEqual(on('fieldZoom', '/home').map((l) => l.split('  ')[0]), ['/home @390'], 'мелкое поле — только на телефоне')
    assert.match(on('fieldZoom', '/home')[0], /13px при 16/)
    assert.deepEqual([...on('fieldZoom', '/checkout#as=s1'), ...on('fieldZoom', '/clean')], [])

    const af = on('autofill', '/checkout#as=s1')
    assert.equal(af.length, 2, af.join('\n'))
    assert.ok(af.some((l) => /name="email" — без autocomplete/.test(l)))
    assert.ok(af.some((l) => /name="phone" — autocomplete="off"/.test(l)))
    assert.deepEqual([...on('autofill', '/home'), ...on('autofill', '/clean')], [], 'автозаполнение меряется на личных страницах')

    assert.ok(on('h1Lines', '/home').length >= 1, 'заголовок в узкой колонке — длиннее трёх строк')
    assert.deepEqual(on('h1Lines', '/clean'), [])

    assert.deepEqual(on('scriptError', '/home'), ['/home  при загрузке: boom at load'], 'одна ошибка — одна находка, а не по ширинам')
    assert.deepEqual([...on('scriptError', '/checkout#as=s1'), ...on('scriptError', '/clean')], [])
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }) }
})
