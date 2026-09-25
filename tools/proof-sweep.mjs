/*
 * Свип страницы-доказательства (И243): основа обязана держать раскладку на
 * ВСЕХ ширинах, а не на тех, где её смотрели. Страница открывается на
 * ширинах свипа (сетка 320…1600 + каждый шов и пиксель над ним) мышью и
 * пальцем, и на каждой меряется:
 *
 *   scroll    страница шире окна — горизонтальная прокрутка
 *   escape    видимый предмет вылез за край окна
 *   clip      текст обрезан своей коробкой
 *   overlap   соседи в ряду наехали друг на друга
 *   frame     кадр выше потолка (доля малого окна)
 *   target    под пальцем цель нажатия меньше 44 × 44
 *   jump      размер роли текста прыгнул между соседними ширинами (ступенька)
 *   shrink    размер роли текста уменьшился, когда окно выросло
 *
 *   node tools/proof-stand.mjs && node tools/proof-sweep.mjs [страница.html]
 *
 * Снимки — dist/proof/*.png, отчёт — dist/proof/report.json. Код выхода 1,
 * если нашлось хоть что-то: это не храповик — основа без дефектов раскладки
 * и есть то, что набор обещает.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadPlaywright } from './browser.mjs'
import { LAYOUT, TARGET } from './thresholds.mjs'
import { SEAMS } from './kit-config.mjs'
import { sweepWidths } from './seams.mjs'

const page = path.resolve(process.argv[2] ?? 'proof-stand.html')
if (!existsSync(page)) {
  console.error(`✗ Нет ${page}. Сначала: node tools/proof-stand.mjs`)
  process.exit(2)
}
const OUT = path.resolve('dist/proof')
mkdirSync(OUT, { recursive: true })

const { chromium } = await loadPlaywright()
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {})
const widths = sweepWidths(LAYOUT, SEAMS)
const HEIGHT = 800
const SHOTS = new Set([360, 768, 1280])
const finger = TARGET?.coarse ?? 44

/* Замер внутри страницы: одна функция, без знаний о блоках — по геометрии. */
const measure = ({ coarse, finger, cap }) => {
  const vw = document.documentElement.clientWidth
  const vh = innerHeight
  const out = { scroll: [], escape: [], clip: [], overlap: [], frame: [], target: [], sizes: {} }
  const name = (el) => {
    const t = (el.textContent || el.getAttribute('aria-label') || el.alt || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} «${t}»`
  }
  const visible = (el) => {
    const s = getComputedStyle(el)
    if (s.visibility === 'hidden' || s.display === 'none') return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const inScroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true } return false }
  if (document.documentElement.scrollWidth > vw + 1) out.scroll.push(`${document.documentElement.scrollWidth} > ${vw}`)
  const all = [...document.querySelectorAll('body *')].filter((el) => !el.closest('.skip, .said, option, select, details:not([open]) > :not(summary)') && visible(el))
  for (const el of all) {
    const r = el.getBoundingClientRect()
    if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) out.escape.push(`${name(el)} ${Math.round(r.left)}…${Math.round(r.right)} из ${vw}`)
    const s = getComputedStyle(el)
    if (el.children.length === 0 && el.textContent.trim() && (s.overflowX === 'hidden' || s.overflowX === 'clip' || s.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) out.clip.push(name(el))
  }
  for (const box of document.querySelectorAll('.cluster, .switcher, .sidebar, .lede, .grid, .seg, .qty')) {
    const kids = [...box.children].filter(visible).map((k) => [k, k.getBoundingClientRect()])
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const [a, ra] = kids[i], [b, rb] = kids[j]
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (w > 1 && h > 1) out.overlap.push(`${name(a)} ↔ ${name(b)} ${Math.round(w)}×${Math.round(h)}`)
    }
  }
  for (const f of document.querySelectorAll('.frame')) {
    const r = f.getBoundingClientRect()
    if (r.height > vh * cap + 1) out.frame.push(`${name(f)} ${Math.round(r.height)} > ${Math.round(vh * cap)}`)
  }
  if (coarse) {
    for (const el of all.filter((e) => e.matches('a[href], button, input, select, textarea, summary, label.tick'))) {
      /* Галочка внутри строки-подписи: цель — вся строка, она и меряется. */
      if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label.tick')) continue
      const r = el.getBoundingClientRect()
      const tap = el.closest('.tap')
      if (!tap && (r.width < finger - 0.5 || r.height < finger - 0.5)) out.target.push(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`)
    }
  }
  const roles = { h1: '.ledeText h1', h2: '.sectionHead h2', h3: '.name', body: '.ledeText p', btn: '.btn', label: '.label', note: '.facts' }
  for (const [role, sel] of Object.entries(roles)) {
    const el = document.querySelector(sel)
    if (el) out.sizes[role] = parseFloat(getComputedStyle(el).fontSize)
  }
  return out
}

const found = []
const series = { fine: [], coarse: [] }
for (const coarse of [false, true]) {
  /* Палец — мобильный контекст с касанием: только он включает `pointer: coarse`
     в Chromium на всех ширинах (одна CDP-эмуляция касания слетала при смене окна). */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: HEIGHT }, hasTouch: coarse, isMobile: coarse })
  const tab = await ctx.newPage()
  await tab.goto(pathToFileURL(page).href)
  for (const w of widths) {
    await tab.setViewportSize({ width: w, height: HEIGHT })
    await tab.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    const coarseNow = await tab.evaluate(() => matchMedia('(pointer: coarse)').matches)
    if (coarse && !coarseNow) found.push({ kind: 'setup', w, pointer: 'палец', what: 'pointer: coarse не включился — цели под пальцем не мерены' })
    const m = await tab.evaluate(measure, { coarse: coarse && coarseNow, finger, cap: LAYOUT.frameCap / 100 })
    series[coarse ? 'coarse' : 'fine'].push({ w, sizes: m.sizes })
    for (const kind of ['scroll', 'escape', 'clip', 'overlap', 'frame', 'target']) {
      for (const what of m[kind]) found.push({ kind, w, pointer: coarse ? 'палец' : 'мышь', what })
    }
  }
  /* Снимки — отдельными вкладками ПОСЛЕ замера: снимок страницы целиком
     сбрасывает мобильную эмуляцию, и все ширины после него мерились мышью. */
  for (const w of widths.filter((x) => SHOTS.has(x))) {
    const shot = await ctx.newPage()
    await shot.setViewportSize({ width: w, height: HEIGHT })
    await shot.goto(pathToFileURL(page).href)
    await shot.screenshot({ path: path.join(OUT, `${w}-${coarse ? 'palec' : 'mysh'}.png`), fullPage: true })
    await shot.close()
  }
  await ctx.close()
}
await browser.close()

/* Ступенька — разрыв, а не крутой наклон: больше полпикселя за один-два
   пикселя окна (шов и пиксель над ним) или больше 15 % за шаг сетки.
   Сжатие — роль ушла ниже своего прежнего максимума больше чем на пиксель,
   пока окно росло: текст мельчает на широком. */
for (const [pointer, rows] of Object.entries(series)) {
  const peak = {}
  for (let i = 0; i < rows.length; i++) {
    const b = rows[i]
    for (const role of Object.keys(b.sizes)) {
      const y = b.sizes[role]
      if (!y) continue
      if (peak[role] && y < peak[role].size - 1 && !peak[role].told) {
        found.push({ kind: 'shrink', w: b.w, pointer, what: `${role}: ${peak[role].size.toFixed(1)}px на ${peak[role].w} → ${y.toFixed(1)}px на ${b.w}` })
        peak[role].told = true
      }
      if (!peak[role] || y > peak[role].size) peak[role] = { size: y, w: b.w }
      if (!i) continue
      const a = rows[i - 1], x = a.sizes[role]
      if (!x) continue
      const dw = b.w - a.w, d = Math.abs(y - x)
      if ((dw <= 2 && d > 0.5) || d / x > 0.15) found.push({ kind: 'jump', w: b.w, pointer, what: `${role}: ${x.toFixed(1)}px → ${y.toFixed(1)}px за ${dw}px ширины` })
    }
  }
}

const byKind = Object.groupBy(found, (f) => f.kind)
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ page, widths, found, series }, null, 2))
console.log(`Ширин: ${widths.length} × мышь и палец. Снимки и отчёт: ${path.relative(process.cwd(), OUT)}`)
if (!found.length) {
  console.log('✓ раскладка держится на всех ширинах: без прокрутки, вылетов, обрезки, наездов, ступенек и мелких целей')
  process.exit(0)
}
for (const [kind, list] of Object.entries(byKind)) {
  console.log(`\n✗ ${kind}: ${list.length}`)
  const seen = new Set()
  for (const f of list) {
    const key = f.what.replace(/\d+…\d+|\d+ > \d+|\d+×\d+/g, '#')
    if (seen.has(key)) continue
    seen.add(key)
    console.log(`    ${f.pointer} ${f.w}px  ${f.what}`)
    if (seen.size >= 8) break
  }
}
process.exit(1)
