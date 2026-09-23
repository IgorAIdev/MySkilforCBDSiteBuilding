import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sessionUrls, sessionOf } from '../tools/sessions.mjs'
import { spawn } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const langs = (shape) => ['ro', 'hu'].map((l) => shape.replace('[lang]', l))

test('sessions: every personal shape opens full, per language, with its own query', () => {
  const pages = { '/[lang]/cart': ['sample-cart'], '/[lang]/checkout/delivery': ['sample-contact', 'sample-pickup?city=Bucure%C8%99ti'] }
  assert.deepEqual(sessionUrls(pages, langs), [
    '/ro/cart#as=sample-cart',
    '/hu/cart#as=sample-cart',
    '/ro/checkout/delivery#as=sample-contact',
    '/ro/checkout/delivery?city=Bucure%C8%99ti#as=sample-pickup',
    '/hu/checkout/delivery#as=sample-contact',
    '/hu/checkout/delivery?city=Bucure%C8%99ti#as=sample-pickup',
  ])
})

test('sessions: the tail becomes a cookie header and never reaches the server', () => {
  assert.deepEqual(sessionOf('/ro/checkout/delivery?city=X#as=sample-pickup', 'shop_session'), { path: '/ro/checkout/delivery?city=X', cookie: 'shop_session=sample-pickup' })
  assert.deepEqual(sessionOf('/ro/cart', 'shop_session'), { path: '/ro/cart', cookie: null })
  assert.deepEqual(sessionOf('/ro/cart#as=sample-cart', null), { path: '/ro/cart', cookie: null })
})

/* «sessions.pages» кривой — не список сессий по форме, а само поле не тем,
 * чем должно быть: null, массив, строка. `ses.pages ?? {}` спасает только
 * ОТСУТСТВУЮЩИЙ ключ; `pages: null`, записанный рукой, проходил молча и падал
 * не здесь, а внутри sessionUrls() без единого слова о причине — там, где
 * читающий уже не видит kit.config.json. Изолированная копия, как у
 * `selftest/not-found.test.mjs`: свои tools/, свой kit.config.json, отдельный
 * процесс — падает ли ЗАГРУЗКА kit-config.mjs, а не что-то дальше по цепочке. */
const KIT = fileURLToPath(new URL('..', import.meta.url))
const TOOLS = ['kit-config.mjs', 'seams.mjs', 'thresholds.mjs']

async function loadWith(sessions) {
  const root = mkdtempSync(join(tmpdir(), 'kit-config-'))
  try {
    mkdirSync(join(root, 'tools'))
    for (const f of TOOLS) copyFileSync(join(KIT, 'tools', f), join(root, 'tools', f))
    writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ sessions }))
    const child = spawn(process.execPath, ['-e', "import('./tools/kit-config.mjs')"], { cwd: root })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    const code = await new Promise((done) => child.on('close', done))
    return { code, out }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('sessions: «pages» null падает громко, не молча внутри sessionUrls', async () => {
  const { code, out } = await loadWith({ cookie: 'shop_session', pages: null })
  assert.equal(code, 1, out)
  assert.match(out, /«sessions\.pages» — объект \{ форма: \[сессии\] \}, не null и не список/)
})

test('sessions: «pages» списком или строкой падает тем же словом; объект проходит', async () => {
  const arr = await loadWith({ cookie: 'shop_session', pages: [] })
  assert.equal(arr.code, 1, arr.out)
  assert.match(arr.out, /«sessions\.pages» — объект/)

  const str = await loadWith({ cookie: 'shop_session', pages: 'sample-cart' })
  assert.equal(str.code, 1, str.out)
  assert.match(str.out, /«sessions\.pages» — объект/)

  const ok = await loadWith({ cookie: 'shop_session', pages: { '/[lang]/cart': ['sample-cart'] } })
  assert.equal(ok.code, 0, ok.out)
})

/* Предупреждения, а не выходы (итоговый разбор плана 2): запись, которая
 * молча выключает замер полных страниц, говорит об этом строкой, но
 * проверку не роняет — остальное меряется. Сессии названы, а cookie нет —
 * личные страницы не меряются полными вовсе. */
test('sessions: сессии без cookie — одна строка предупреждения, не выход', async () => {
  const warned = await loadWith({ cookie: null, pages: { '/[lang]/cart': ['sample-cart'] } })
  assert.equal(warned.code, 0, warned.out)
  const lines = warned.out.split('\n').filter((l) => /sessions\.cookie/.test(l))
  assert.equal(lines.length, 1, warned.out)
  assert.match(lines[0], /«sessions\.pages» названы, а «sessions\.cookie» — null/)

  const quiet = await loadWith({ cookie: null, pages: {} })
  assert.equal(quiet.code, 0, quiet.out)
  assert.equal(quiet.out.trim(), '')
})

/* Форма из «sessions.pages», которой нет в дереве маршрутов (переименовали
 * страницу, опечатка), не меряется никогда — и молчала. Теперь личные
 * страницы отдаются без неё, а она названа строкой. */
const ROUTE_TOOLS = ['routes.mjs', 'sessions.mjs', 'kit-config.mjs', 'seams.mjs', 'thresholds.mjs']

async function personalWith(pages) {
  const root = mkdtempSync(join(tmpdir(), 'personal-'))
  try {
    mkdirSync(join(root, 'tools'))
    for (const f of ROUTE_TOOLS) copyFileSync(join(KIT, 'tools', f), join(root, 'tools', f))
    mkdirSync(join(root, 'app', '[lang]', 'cart'), { recursive: true })
    writeFileSync(join(root, 'app', '[lang]', 'cart', 'page.tsx'), 'export default function Page() { return null }\n')
    mkdirSync(join(root, 'lib'))
    writeFileSync(join(root, 'lib', 'locale.ts'), "export const LOCALES = ['ro', 'hu'] as const\nexport const DEFAULT_LANG = 'ro'\n")
    writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ sessions: { cookie: 'shop_session', pages } }))
    const child = spawn(process.execPath, ['-e', "import('./tools/routes.mjs').then((m) => console.log(JSON.stringify(m.personal())))"], { cwd: root })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    const code = await new Promise((done) => child.on('close', done))
    return { code, out, err }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('sessions: форма не из дерева маршрутов названа предупреждением, остальные отданы', async () => {
  const r = await personalWith({ '/[lang]/cart': ['sample-cart'], '/[lang]/cabinet': ['sample-cart'] })
  assert.equal(r.code, 0, r.err)
  assert.deepEqual(JSON.parse(r.out), ['/ro/cart#as=sample-cart', '/hu/cart#as=sample-cart'])
  assert.match(r.err, /\/\[lang\]\/cabinet/)
  assert.doesNotMatch(r.err, /\/\[lang\]\/cart\b/)

  const clean = await personalWith({ '/[lang]/cart': ['sample-cart'] })
  assert.equal(clean.code, 0, clean.err)
  assert.equal(clean.err.trim(), '')
})
