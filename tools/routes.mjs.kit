/**
 * Страницы сайта как их видит поиск — из собранного `out/` или с живого
 * сервера.
 *
 * Заведено по дефекту (`docs/rules.md`, И174). Проверки разметки и адресов
 * читали статический экспорт: `out/bg/cart.html` → `/bg/cart`. Витрина,
 * переехавшая на серверную сборку (`output: 'standalone'`), папки `out/`
 * не имеет — и обе проверки с того дня отвечали «нет out/, сначала сборка»,
 * то есть молча перестали существовать: команда есть, вызвать некому. Две
 * недели разметка для поиска и карта сайта второй витрины не проверялись
 * никем.
 *
 * Отсюда один источник страниц на обе проверки, и у него два входа:
 *
 *   out/                     — как раньше: файлы статического экспорта;
 *   SITE=http://localhost:3020 — живой сервер: адреса из его карты сайта и из
 *                              дерева маршрутов, разметка — по HTTP.
 *
 * Обеим проверкам всё равно, откуда пришла разметка; разница — только в том,
 * что значит «страница существует»: файл на диске или ответ 200.
 *
 *   const site = await loadSite({ routes: all() })
 *   site.pages   Map адрес → разметка
 *   site.sitemap текст карты сайта ('' — нет)
 *   site.robots  текст robots.txt ('' — нет)
 *   site.exists(адрес) → Promise<boolean>
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const ROOT = new URL('..', import.meta.url).pathname
export const OUT = join(ROOT, 'out')
/** Адрес живого сервера, если проверка идёт по нему. */
export const LIVE = (process.env.SITE ?? '').replace(/\/+$/, '')

const norm = (u) => (u.replace(/\/+$/, '') || '/')

export async function loadSite({ routes = [] } = {}) {
  if (LIVE) return fromServer(LIVE, routes)
  if (!existsSync(OUT)) {
    console.error('\n✗ Нет out/ и не задан SITE=. Статическому экспорту — сначала npm run build:site;')
    console.error('  серверной сборке — поднять её и задать адрес: SITE=http://localhost:3020 npm run check:seo')
    process.exit(1)
  }
  return fromFiles()
}

/* ── статический экспорт ─────────────────────────────────────────────── */

function fromFiles() {
  const pages = new Map()
  const walk = (dir, url) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        if (name.startsWith('_')) continue
        walk(path, `${url}/${name}`)
      } else if (name.endsWith('.html')) {
        const bare = name === 'index.html' ? (url || '/') : `${url}/${name.slice(0, -5)}`
        pages.set(bare, readFileSync(path, 'utf8'))
      }
    }
  }
  walk(OUT, '')
  const text = (name) => (existsSync(join(OUT, name)) ? readFileSync(join(OUT, name), 'utf8') : '')
  /** Есть ли по адресу что ОТДАТЬ. Папка не считается, и это поймал
   *  обратный ход: рядом с каждой страницей статический экспорт кладёт
   *  одноимённую папку со служебными файлами, и `existsSync` находил её —
   *  а нгинкс по такому адресу страницу не отдаст. */
  const exists = async (url) => {
    const bare = norm(url)
    if (pages.has(bare) || pages.has(`${bare}/index`)) return true
    const file = join(OUT, bare.slice(1))
    return existsSync(file) && statSync(file).isFile()
  }
  return { mode: 'out', pages, sitemap: text('sitemap.xml'), robots: text('robots.txt'), exists }
}

/* ── живой сервер ─────────────────────────────────────────────────────── */

async function fromServer(base, routes) {
  const get = async (path) => {
    try {
      const r = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(30_000) })
      return { status: r.status, text: r.status === 200 ? await r.text() : '' }
    } catch (e) {
      return { status: 0, text: '', error: e.message }
    }
  }
  const sitemap = (await get('/sitemap.xml')).text
  const robots = (await get('/robots.txt')).text
  /* Адреса — из карты сайта (какой хост она ни называла бы: проверяется
     сервер, который её отдал) и из дерева маршрутов: страницы без карты —
     корзина, оформление — тоже страницы, и о них надо знать. */
  const wanted = new Set()
  for (const m of sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)) {
    try { wanted.add(norm(new URL(m[1]).pathname)) } catch { /* не адрес — семья robots скажет */ }
  }
  /* Адрес с параметрами (`/bg/catalog/oils?brand=…`) — вид страницы, а не
     страница: его canonical по праву ведёт на полку без фильтра. В статическом
     экспорте таких файлов не было, и проверки их не видели; по HTTP они
     отвечают 200 — и считались бы страницами с чужим canonical, чужим
     заголовком и без места в карте. */
  for (const r of routes) if (!r.includes('?')) wanted.add(norm(r))

  const pages = new Map()
  const status = new Map()
  const errors = []
  const queue = [...wanted]
  /* Шесть в полёте: сервер один и рядом, а страниц полторы сотни. */
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const path = queue.shift()
      const r = await get(path)
      status.set(path, r.status)
      if (r.status === 200) pages.set(path, r.text)
      else if (r.status === 0 || r.status >= 500) errors.push(`${path} — ${r.error ?? `ответ ${r.status}`}`)
    }
  }))
  if (errors.length) {
    console.error(`\n✗ Сервер ${base} не отдал страницы: ${errors.length}`)
    for (const e of errors.slice(0, 10)) console.error(`    ${e}`)
    console.error('\n  Это не находка разметки, а упавший сервер: чинить его, а не проверку.')
    process.exit(1)
  }
  if (pages.size === 0) {
    console.error(`\n✗ Сервер ${base} отвечает, но ни одной страницы не отдал: ни карты сайта, ни дерева маршрутов.`)
    process.exit(1)
  }
  /** Ответ 200 — страница есть; остальное — нет. Спрошено один раз на адрес. */
  const exists = async (url) => {
    const bare = norm(url)
    if (pages.has(bare)) return true
    if (!status.has(bare)) status.set(bare, (await get(bare)).status)
    return status.get(bare) === 200
  }
  return { mode: 'live', pages, sitemap, robots, exists }
}
