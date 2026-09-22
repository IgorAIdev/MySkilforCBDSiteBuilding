/**
 * Страницы с живого сервера — режим `SITE=` источника `tools/pages.mjs`.
 *
 * Поднимается крошечный сервер в самом тесте: карта сайта на два адреса,
 * страницы, один адрес, которого нет, и один, который падает. Куплено
 * дефектом И174: проверки поиска, умевшие читать только `out/`, молча
 * перестали существовать на серверной сборке.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))

const serve = (broken = false) => new Promise((resolve) => {
  const server = createServer((req, res) => {
    const url = req.url.split('?')[0]
    if (url === '/sitemap.xml') {
      res.writeHead(200, { 'content-type': 'application/xml' })
      res.end('<urlset><url><loc>https://shop.example/bg</loc></url><url><loc>https://shop.example/bg/gone</loc></url></urlset>')
    } else if (url === '/robots.txt') {
      res.writeHead(200); res.end('User-agent: *\nSitemap: https://shop.example/sitemap.xml\n')
    } else if (url === '/bg') {
      if (broken) { res.writeHead(500); res.end('boom'); return }
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end('<html lang="bg"><head><title>Магазин</title><link rel="canonical" href="https://shop.example/bg"></head><body><a href="/bg/cart">кошница</a></body></html>')
    } else if (url === '/bg/cart') {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end('<html lang="bg"><head><meta name="robots" content="noindex"><title>Кошница</title></head><body></body></html>')
    } else { res.writeHead(404); res.end('нет') }
  })
  server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }))
})

/** Проект-пустышка с инструментами набора: `routes.mjs` без данных даёт дерево без динамики. */
const project = () => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-pages-'))
  mkdirSync(join(dir, 'tools'), { recursive: true })
  cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
  writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true}')
  return dir
}

/* Дитя запускается асинхронно: сервер живёт в этом же процессе, и
   `spawnSync` заморозил бы его цикл событий — проверка ждала бы ответа,
   которого некому дать. */
const run = (dir, tool, base) => new Promise((resolve) => {
  const child = spawn(process.execPath, [join(dir, 'tools', tool)], { cwd: dir, env: { ...process.env, SITE: base } })
  let stdout = '', stderr = ''
  child.stdout.on('data', (d) => { stdout += d })
  child.stderr.on('data', (d) => { stderr += d })
  child.on('close', (status) => resolve({ status, stdout, stderr }))
})

test('живой сервер: карта сайта обещает адрес, которого нет, — красный с именем адреса', async () => {
  const { server, base } = await serve()
  const dir = project()
  try {
    const r = await run(dir, 'check-urls.mjs', base)
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /\/bg\/gone — такой страницы нет/)
    assert.doesNotMatch(r.stderr, /\/bg\/cart/, 'страница с noindex не «молчит»')
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }) }
})

test('живой сервер: разметка читается по HTTP — семьи поиска считают её, а не пустоту', async () => {
  const { server, base } = await serve()
  const dir = project()
  try {
    const r = await run(dir, 'check-seo.mjs', base)
    const out = r.stdout + r.stderr
    assert.doesNotMatch(out, /Нет out\//)
    assert.match(out, /description|viewport|og/, 'семьи разметки прошли по странице и что-то насчитали')
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }) }
})

test('упавший сервер — не находка разметки, а красный с адресом', async () => {
  const { server, base } = await serve(true)
  const dir = project()
  try {
    const r = await run(dir, 'check-seo.mjs', base)
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /не отдал страницы/)
    assert.match(r.stderr, /\/bg — ответ 500/)
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }) }
})
