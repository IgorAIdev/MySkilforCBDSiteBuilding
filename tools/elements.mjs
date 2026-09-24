/*
 * Элементы на выбор: `elements/elements.json` → `elements/index.html` (И336).
 *
 * Порядок — что за чем:
 *   1. заказчик присылает элемент — скриншот, код, ссылку;
 *   2. он ложится в свою папку `elements/NN-имя/`: источник и отрисовка
 *      `element.html` — разобранная до базовой: лишнее (тень, размытие,
 *      заливка фоном при наведении) снято сразу и названо в `снято`;
 *   3. состояния продуманы сразу — наведение, нажатие, фокус — и показаны
 *      застывшими рядом с живым (`data-state="hover"`, `data-state="press"`),
 *      чтобы их было видно без мыши, с телефона;
 *   4. в каталоге — род, семья стиля и метки из словаря: элементы одной
 *      семьи стоят рядом и предлагаются вместе;
 *   5. эта команда проверяет каталог и собирает страницу выбора.
 *
 * Ни сайт, ни панель вида эту папку не читают: выбранное встраивается потом
 * — кнопка вариантом каталога `styles/buttons.json`, по правилам набора.
 *
 *   node tools/elements.mjs           проверить и собрать elements/index.html
 *   node tools/elements.mjs --check   только проверить
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { toCss as paletteCss } from './palette.mjs'

/** Имена значков листа набора (`styles/icons.svg`). */
export const sheetIds = (svg) => [...svg.matchAll(/<symbol[^>]*\bid="([\w-]+)"/g)].map((m) => m[1])

/** Значки листа: имя → рамка, атрибуты символа и рисунок. */
export const sheetSigns = (svg) => Object.fromEntries([...svg.matchAll(/<symbol([^>]*)>([\s\S]*?)<\/symbol>/g)].map(([, head, inner]) => {
  const attrs = Object.fromEntries([...head.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
  const { id, viewBox = '0 0 24 24', ...rest } = attrs
  return [id, { viewBox, attrs: rest, inner: inner.trim() }]
}))

/** Сцена страниц папки (И338): палитра и тема — из адреса (`?palette=…&theme=…`,
 *  их ставит переключатель страницы выбора), значки — `<svg data-sign="имя">`
 *  из листа набора, вставленные прямо в страницу: так движение достаёт до
 *  линии и головы стрелки, а страница с диска (`file://`) не ходит за внешним
 *  `<use>`. Рисунок — тот же лист набора, второй копии нет (И249). */
export const stageJs = (svg) => `/* Собран tools/elements.mjs из styles/icons.svg. Руками не правят. */
(() => {
  const q = new URLSearchParams(location.search)
  const root = document.documentElement
  if (q.get('palette')) root.dataset.palette = q.get('palette')
  if (q.get('theme')) root.dataset.theme = q.get('theme')
  const SIGNS = ${JSON.stringify(sheetSigns(svg))}
  const fill = () => {
    for (const el of document.querySelectorAll('svg[data-sign]')) {
      const s = SIGNS[el.dataset.sign]
      if (!s) continue
      el.setAttribute('viewBox', s.viewBox)
      for (const [k, v] of Object.entries(s.attrs)) el.setAttribute(k, v)
      el.setAttribute('aria-hidden', 'true')
      el.innerHTML = s.inner
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill)
  else fill()
})()
`

/** Подключения каждой отрисовки: палитры набора, роли, основа, сцена. */
export const LINKS = ['<link rel="stylesheet" href="../palettes.css">', '<link rel="stylesheet" href="../../styles/tokens.css">', '<link rel="stylesheet" href="../base.css">', '<script src="../stage.js"></script>']
/** Род, у которого нет состояний и меток органа: это рисунки, а не орган. */
export const DRAWINGS = 'набор значков'

/** Находки каталога строками «кто: что». `read(путь)` — текст файла из папки
 *  элементов или null; `icons` — имена значков листа набора. Единая форма
 *  (И337): отрисовка стоит на основе `../base.css`, краски берёт ролями
 *  палитры набора, своих стилей и красок не несёт — отличие только атрибутами
 *  основы; значки — из листа набора (`data-sign`). */
export function auditElements(cat, read, icons = []) {
  const found = []
  const bad = (who, what) => found.push(`${who}: ${what}`)
  const vocab = cat.метки ?? {}
  const kinds = Object.keys(vocab.род ?? {})
  const facets = Object.keys(vocab).filter((k) => k !== 'род')
  for (const [id, f] of Object.entries(cat.семьи ?? {})) {
    if (!f.имя || !f.что) bad(`семья ${id}`, 'нет имени или описания')
    for (const c of f.характеры ?? []) if (!(cat.характеры ?? []).includes(c)) bad(`семья ${id}`, `характер «${c}» не из списка`)
  }
  const used = new Set()
  for (const e of cat.элементы ?? []) {
    const who = e.папка ?? '?'
    if (!/^\d{2}-[a-z0-9-]+$/.test(e.папка ?? '')) bad(who, 'папка — NN-имя латиницей')
    if (used.has(e.папка)) bad(who, 'папка названа дважды')
    used.add(e.папка)
    if (!e.имя || !e.что || !e.откуда) bad(who, 'нет имени, описания или происхождения')
    if (!(e.род ?? []).length) bad(who, 'род не назван')
    for (const k of e.род ?? []) if (!kinds.includes(k)) bad(who, `род «${k}» не из словаря`)
    if (!cat.семьи?.[e.семья]) bad(who, `семья «${e.семья}» не заведена`)
    const drawings = (e.род ?? []).every((k) => k === DRAWINGS)
    for (const [facet, v] of Object.entries(e.метки ?? {})) {
      if (!facets.includes(facet)) { bad(who, `метки «${facet}» нет в словаре`); continue }
      for (const x of [v].flat()) if (!vocab[facet].includes(x)) bad(who, `${facet}: «${x}» не из словаря`)
    }
    if (!drawings) for (const facet of facets) if (!(facet in (e.метки ?? {}))) bad(who, `метка «${facet}» не поставлена`)
    if (!drawings) for (const s of ['наведение', 'нажатие', 'фокус']) if (!e.состояния?.[s]) bad(who, `состояние «${s}» не продумано`)
    for (const k of ['снято', 'приведено']) if (!Array.isArray(e[k])) bad(who, `«${k}» — список, пусть и пустой`)
    for (const src of [e.источник].flat()) if (read(`${e.папка}/${src}`) == null) bad(who, `нет источника ${src}`)
    const page = read(`${e.папка}/element.html`)
    if (page == null) { bad(who, 'нет отрисовки element.html'); continue }
    if (!drawings && (!/data-state="hover"/.test(page) || !/data-state="press"/.test(page))) bad(who, 'наведение и нажатие не показаны застывшими (data-state)')
    if (!page.includes(LINKS[2])) bad(who, 'отрисовка не на основе ../base.css')
    for (const link of LINKS.filter((l) => l !== LINKS[2])) if (!page.includes(link)) bad(who, `нет подключения ${link.match(/(?:href|src)="([^"]+)"/)[1]}: краски — ролями палитры набора, значки — из листа`)
    const markup = page.replace(/<!--[\s\S]*?-->/g, '')
    if (/<style[\s>]/.test(markup) || /\sstyle="/.test(markup)) bad(who, 'свои стили — отличие пишется атрибутом основы, а не правилом')
    if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(markup.replace(/href="#[\w-]+"/g, ''))) bad(who, 'своя краска — краски только в основе')
    if (/<use\b/.test(markup)) bad(who, 'значок через <use> — пишется <svg data-sign="имя">, рисунок вставляет ../stage.js')
    for (const m of markup.matchAll(/data-sign="([\w-]+)"/g)) if (icons.length && !icons.includes(m[1])) bad(who, `значка «${m[1]}» нет в листе набора`)
    if (!drawings && /<(path|circle|rect|line|polyline|polygon|ellipse)\b/.test(markup)) bad(who, 'свой рисунок значка — значки только из листа набора')
  }
  return found
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const chips = (list, cls = '') => list.map((x) => `<span class="chip${cls}">${esc(x)}</span>`).join('')

/** Страница выбора: семьи по порядку каталога, в семье — её элементы;
 *  сверху — палитра набора и тема, которые получают все отрисовки разом. */
export function toHtml(cat, palettes = []) {
  const source = (e, src) => (/\.(png|jpe?g|webp)$/.test(src) ? `<img src="${esc(e.папка)}/${esc(src)}" alt="Источник: ${esc(e.имя)}">` : `<a href="${esc(e.папка)}/${esc(src)}">${esc(src)}</a>`)
  const card = (e) => `
      <article data-kind="${esc(e.род.join(' '))}">
        <header><h3>${esc(e.папка.slice(0, 2))} · ${esc(e.имя)}</h3>${chips(e.род, ' kind')}</header>
        <p class="note">${esc(e.что)}</p>
        <div class="tags">${Object.entries(e.метки).map(([k, v]) => `<span class="chip"><i>${esc(k)}</i> ${esc([v].flat().join(', '))}</span>`).join('')}</div>
        <dl>${Object.entries(e.состояния).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}${e.снято.length ? `<dt>снято</dt><dd>${esc(e.снято.join('; '))}</dd>` : ''}${e.приведено.length ? `<dt>приведено</dt><dd>${esc(e.приведено.join('; '))}</dd>` : ''}</dl>
        <div class="pair">
          <figure><div class="src">${[e.источник].flat().map((src) => source(e, src)).join('')}</div><figcaption>Источник — ${esc(e.откуда)}</figcaption></figure>
          <figure><iframe data-src="${esc(e.папка)}/element.html" src="${esc(e.папка)}/element.html" height="${Number(e.высота) || 240}" title="${esc(e.имя)}"></iframe><figcaption>Нарисовано — <a href="${esc(e.папка)}/element.html">${esc(e.папка)}/element.html</a></figcaption></figure>
        </div>
      </article>`
  const families = Object.entries(cat.семьи).map(([id, f]) => {
    const list = cat.элементы.filter((e) => e.семья === id)
    return list.length ? `
    <section class="family" data-family="${esc(id)}">
      <h2>${esc(f.имя)}</h2>
      <p class="note">${esc(f.что)}. Подходит к характеру: ${esc(f.характеры.join(', '))}.</p>
      ${list.map(card).join('')}
    </section>` : ''
  }).join('')
  const kinds = Object.keys(cat.метки.род)
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Элементы на выбор</title>
<!-- Собран tools/elements.mjs из elements/elements.json. Руками не правят. -->
<style>
  body{margin:0;padding:24px 16px 48px;background:#F4F4F2;color:#1C1A18;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
  main{max-inline-size:1100px;margin-inline:auto;display:flex;flex-direction:column;gap:24px}
  h1{margin:0;font-size:1.5rem;font-weight:600}
  h2{margin:0;font-size:1.25rem;font-weight:600}
  h3{margin:0;font-size:1.0625rem;font-weight:600}
  .lead,.note{margin:0;color:#5F5E5A;max-inline-size:75ch}
  .filter{display:flex;flex-wrap:wrap;gap:8px}
  .filter button{font:inherit;font-size:.875rem;padding:6px 14px;border:0;border-radius:999px;background:#E6E5E1;color:#1C1A18;cursor:pointer}
  .filter button[aria-pressed='true']{background:#1C1A18;color:#fff}
  .family{display:flex;flex-direction:column;gap:14px}
  article{background:#fff;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:12px}
  article header{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  .chip{font-size:.8125rem;padding:3px 10px;border-radius:999px;background:#F1F0EC;color:#3D3B37}
  .chip i{font-style:normal;color:#8A877F}
  .chip.kind{background:#1C1A18;color:#fff}
  dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:.875rem}
  dt{color:#8A877F}
  dd{margin:0}
  .pair{display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 320px), 1fr));gap:16px}
  figure{margin:0;display:flex;flex-direction:column;gap:8px}
  figcaption{font-size:.8125rem;color:#5F5E5A}
  .src{border:1px solid #E4E3DF;border-radius:12px;overflow:hidden;background:#fff;display:grid;place-items:center;min-block-size:120px}
  .src{gap:8px;padding:8px}
  .src img{max-inline-size:100%;display:block}
  .bar{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center}
  .bar > span{font-size:.875rem;color:#5F5E5A}
  iframe{inline-size:100%;border:1px solid #E4E3DF;border-radius:12px;background:#fff}
  a{color:inherit}
  [hidden]{display:none !important}
</style>
</head>
<body>
<main>
  <h1>Элементы на выбор</h1>
  <p class="lead">Каждый элемент нарисован по источнику, разобран до базового и показан в трёх состояниях. Сгруппированы по семье стиля — внутри семьи элементы подходят друг к другу. В сайт не встроены.</p>
  <div class="bar">
    <span>Палитра набора</span>
    <div class="filter" role="group" aria-label="Палитра" data-set="palette">${palettes.map((n, i) => `
      <button type="button" data-value="${esc(n)}" aria-pressed="${i === 0}">${esc(n)}</button>`).join('')}
    </div>
  </div>
  <div class="bar">
    <span>Тема</span>
    <div class="filter" role="group" aria-label="Тема" data-set="theme">
      <button type="button" data-value="light" aria-pressed="true">Светлая</button>
      <button type="button" data-value="dark" aria-pressed="false">Тёмная</button>
    </div>
    <span>Род</span>
    <div class="filter" role="group" aria-label="Род" data-set="kind">
      <button type="button" data-kind="" aria-pressed="true">Все</button>${kinds.map((k) => `
      <button type="button" data-kind="${esc(k)}" aria-pressed="false">${esc(k)}</button>`).join('')}
    </div>
  </div>${families}
</main>
<script>
const pick = { palette: ${JSON.stringify(palettes[0] ?? '')}, theme: 'light' }
const frames = () => { for (const f of document.querySelectorAll('iframe[data-src]')) f.src = f.dataset.src + '?' + new URLSearchParams(pick) }
for (const g of document.querySelectorAll('[data-set="palette"], [data-set="theme"]')) for (const b of g.querySelectorAll('button')) b.onclick = () => {
  for (const x of g.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b))
  pick[g.dataset.set] = b.dataset.value
  frames()
}
for (const b of document.querySelectorAll('[data-set="kind"] button')) b.onclick = () => {
  for (const x of document.querySelectorAll('[data-set="kind"] button')) x.setAttribute('aria-pressed', String(x === b))
  for (const a of document.querySelectorAll('article')) a.hidden = !!b.dataset.kind && !a.dataset.kind.split(' ').includes(b.dataset.kind)
  for (const s of document.querySelectorAll('.family')) s.hidden = ![...s.querySelectorAll('article')].some((a) => !a.hidden)
}
</script>
</body>
</html>
`
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const DIR = path.resolve('elements')
  const FROM = path.join(DIR, 'elements.json')
  if (!existsSync(FROM)) { console.error('✗ Нет elements/elements.json — каталога элементов нет.'); process.exit(1) }
  const cat = JSON.parse(readFileSync(FROM, 'utf8'))
  const read = (p) => (existsSync(path.join(DIR, p)) ? readFileSync(path.join(DIR, p), 'utf8') : null)
  const SHEET = path.resolve('styles/icons.svg')
  if (!existsSync(SHEET)) { console.error('✗ Нет styles/icons.svg — значкам не из чего браться.'); process.exit(1) }
  const sheet = readFileSync(SHEET, 'utf8')
  const found = auditElements(cat, read, sheetIds(sheet))
  if (found.length) {
    console.error('✗ Каталог элементов не сходится:')
    for (const f of found) console.error(`    ${f}`)
    process.exit(1)
  }
  if (process.argv.includes('--check')) { console.log(`Каталог элементов в норме: ${cat.элементы.length} элементов, семей ${Object.keys(cat.семьи).length}`); process.exit(0) }
  /* Палитры набора — те же, что у панели вида: палитра сайта первой, затем
     образцы набора; строитель тот же, что у сайта (tools/palette.mjs). */
  const paletteSets = { ...JSON.parse(readFileSync(path.resolve('styles/palette.json'), 'utf8')), ...JSON.parse(readFileSync(path.resolve('templates/palette.json'), 'utf8')) }
  writeFileSync(path.join(DIR, 'palettes.css'), paletteCss(paletteSets, { generator: 'tools/elements.mjs из styles/palette.json и templates/palette.json' }))
  writeFileSync(path.join(DIR, 'stage.js'), stageJs(sheet))
  writeFileSync(path.join(DIR, 'index.html'), toHtml(cat, Object.keys(paletteSets)))
  console.log(`✓ elements/index.html · ${cat.элементы.length} элементов, семей ${Object.keys(cat.семьи).length}`)
}
