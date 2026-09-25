/**
 * Семья `viewport` в `check:seo`: мета окна по отданной разметке и стилям.
 *
 * Дефект (И301): стили набора читают вырез экрана — `--edge-b` в
 * styles/tokens.css стоит на `env(safe-area-inset-bottom)`, — а витрина не
 * просила окно во весь экран (`viewport-fit=cover`), и на iPhone значение
 * всегда ноль: роль мертва ровно там, ради чего заведена. Вторая половина —
 * запрет увеличения (`user-scalable=no`, `maximum-scale=1`): WCAG 1.4.4.
 *
 * Поднимается крошечный сервер: страница, чья таблица стилей читает вырез,
 * без `viewport-fit=cover`; страница, запретившая увеличение; и чистая.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))

const page = (viewport, head = '') => `<html lang="en"><head><title>T ${viewport}</title><meta name="description" content="d ${viewport}">`
  + `<meta name="viewport" content="${viewport}">${head}</head><body><main>x</main></body></html>`

const PAGES = {
  '/cutout': page('width=device-width, initial-scale=1', '<link rel="stylesheet" href="/s/edge.css">'),
  '/inline': page('width=device-width, initial-scale=1', '<style>.bar{padding-bottom:env( safe-area-inset-bottom )}</style>'),
  '/locked': page('width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'),
  '/clean': page('width=device-width, initial-scale=1, viewport-fit=cover', '<link rel="stylesheet" href="/s/edge.css"><link rel="stylesheet" href="https://fonts.example/f.css">'),
  '/plain': page('width=device-width, initial-scale=1', '<link rel="stylesheet" href="/s/plain.css">'),
}

const serve = () => new Promise((resolve) => {
  const server = createServer((req, res) => {
    const url = req.url.split('?')[0]
    if (url === '/sitemap.xml') {
      res.writeHead(200, { 'content-type': 'application/xml' })
      res.end(`<urlset>${Object.keys(PAGES).map((p) => `<url><loc>https://shop.example${p}</loc></url>`).join('')}</urlset>`)
    } else if (url === '/robots.txt') {
      res.writeHead(200); res.end('User-agent: *\nSitemap: https://shop.example/sitemap.xml\n')
    } else if (url === '/s/edge.css') {
      res.writeHead(200, { 'content-type': 'text/css' }); res.end(':root{--edge-b:env(safe-area-inset-bottom,0px)}')
    } else if (url === '/s/plain.css') {
      res.writeHead(200, { 'content-type': 'text/css' }); res.end('body{margin:0}')
    } else if (PAGES[url]) {
      res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGES[url])
    } else { res.writeHead(404); res.end('нет') }
  })
  server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }))
})

const run = (dir, base, ...args) => new Promise((resolve) => {
  const child = spawn(process.execPath, [join(dir, 'tools/check-seo.mjs'), ...args], { cwd: dir, env: { ...process.env, SITE: base } })
  let stdout = '', stderr = ''
  child.stdout.on('data', (d) => { stdout += d })
  child.stderr.on('data', (d) => { stderr += d })
  child.on('close', (status) => resolve({ status, stdout, stderr }))
})

test('viewport: вырез читают стили — окно обязано его отдать; увеличение не запрещают; чистое молчит', async () => {
  const { server, base } = await serve()
  const dir = mkdtempSync(join(tmpdir(), 'kit-seo-'))
  cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
  writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true}')
  try {
    const r = await run(dir, base, '--list', 'viewport')
    const lines = r.stdout.split('\n').filter((l) => /^\s+\//.test(l)).map((l) => l.trim())
    const of = (url) => lines.filter((l) => l.startsWith(`${url} `))
    assert.match(of('/cutout').join('\n'), /вырез экрана.*viewport-fit=cover/, 'таблица стилей читает вырез, окно его не отдаёт')
    assert.match(of('/inline').join('\n'), /вырез экрана/, 'вписанный <style> — тоже отданные стили')
    assert.match(of('/locked').join('\n'), /увеличение запрещено.*1\.4\.4/)
    assert.deepEqual(of('/clean'), [], 'окно во весь экран — вырез отдан; чужой хост шрифтов не спрашивается')
    assert.deepEqual(of('/plain'), [], 'стили выреза не читают — и просить нечего')
    assert.equal(lines.length, 3, lines.join('\n'))
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }) }
})
