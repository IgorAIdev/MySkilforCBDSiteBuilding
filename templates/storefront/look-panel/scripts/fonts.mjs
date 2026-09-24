/* Шрифт выбранного вида — в сайт, на свой адрес (PANEL.md, шаг 4).

   Страница покупателя к Google не ходит (LG München, 20.01.2022): шрифт
   вида лежит у сайта в public/fonts/ и отдаётся с его адреса `/fonts/…`
   (app/fonts/[file]/route.ts — и для файла, положенного после запуска).
   Скачивает его панель, на сервере, в миг черновика или публикации: браузер
   покупателя в этом не участвует. Подмножества — латиница и расширенная
   (румынские ș ț ă î â, венгерские ő ű), по одному файлу на начертание; у
   переменного шрифта Google отдаёт один файл на все толщины — он и
   записывается диапазоном толщин. */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const SUBSETS = ['latin', 'latin-ext']

/** Адрес CSS Google Fonts для семейства и толщин. */
export const cssUrl = (family, weights) => `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weights.join(';')}&display=swap`

/** CSS Google Fonts → начертания нужных подмножеств: подмножество, адрес
 *  файла, толщины, диапазон знаков. Один адрес на несколько толщин —
 *  переменный шрифт. */
export function parseFaces(css) {
  const byUrl = new Map()
  for (const m of css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    const [, subset, body] = m
    if (!SUBSETS.includes(subset)) continue
    const url = body.match(/url\((https:[^)]+\.woff2)\)/)?.[1]
    const weight = Number(body.match(/font-weight:\s*(\d+)/)?.[1])
    const range = body.match(/unicode-range:\s*([^;]+);/)?.[1].trim()
    if (!url || !weight || !range) continue
    const face = byUrl.get(url) ?? { subset, url, weights: [], range }
    face.weights.push(weight)
    byUrl.set(url, face)
  }
  return [...byUrl.values()]
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Скачать семейство в папку шрифтов сайта → шрифт вида (LookFont). */
export async function fetchFont({ family, weights }, dir) {
  /* Мимо кэша данных Next (`no-store`) и со второй попытки: сервер страниц
     однажды отдал первому запросу ответ без начертаний woff2. */
  let faces = []
  for (let attempt = 0; attempt < 2 && !faces.length; attempt++) {
    const res = await fetch(cssUrl(family, weights), { headers: { 'user-agent': UA }, cache: 'no-store' })
    if (!res.ok) throw new Error(`Google Fonts не отдал «${family}»: ${res.status}`)
    faces = parseFaces(await res.text())
  }
  if (!faces.length) throw new Error(`«${family}»: в ответе нет начертаний ${SUBSETS.join(', ')}`)
  mkdirSync(dir, { recursive: true })
  const files = []
  for (const face of faces) {
    const bytes = Buffer.from(await (await fetch(face.url)).arrayBuffer())
    const name = `${slug(family)}-${face.subset}-${createHash('sha256').update(bytes).digest('hex').slice(0, 10)}.woff2`
    if (!existsSync(join(dir, name))) writeFileSync(join(dir, name), bytes)
    const lo = Math.min(...face.weights)
    const hi = Math.max(...face.weights)
    files.push({ url: `/fonts/${name}`, weight: lo === hi ? String(lo) : `${lo} ${hi}`, range: face.range })
  }
  return { family, files }
}

/** Все семейства выбранного шрифта. */
export const fetchFonts = async (need, dir) => Promise.all(need.map((f) => fetchFont(f, dir)))
