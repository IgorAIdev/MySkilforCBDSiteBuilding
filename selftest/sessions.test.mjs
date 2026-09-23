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
