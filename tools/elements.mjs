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

/** Имена значков листа набора (`styles/icons.svg`). */
export const sheetIds = (svg) => [...svg.matchAll(/<symbol[^>]*\bid="([\w-]+)"/g)].map((m) => m[1])

/** Лист значков для страниц папки: страница с диска (`file://`) не достаёт
 *  внешний `<use href="…svg#id">`, поэтому лист вставляется скриптом — тем же
 *  листом набора, без второй копии рисунка (И249). */
export const iconsJs = (svg) => `/* Собран tools/elements.mjs из styles/icons.svg. Руками не правят. */\n` +
  `document.currentScript.insertAdjacentHTML('beforebegin', ${JSON.stringify(svg.trim().replace(/<svg /, '<svg style="display:none" aria-hidden="true" '))})\n`

/** Находки каталога строками «кто: что». `read(путь)` — текст файла из папки
 *  элементов или null; `icons` — имена значков листа набора. Единая форма
 *  (И337): отрисовка стоит на основе `../base.css`, своих стилей и красок не
 *  несёт — отличие только атрибутами основы; значки — из листа набора. */
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
    for (const [facet, v] of Object.entries(e.метки ?? {})) {
      if (!facets.includes(facet)) { bad(who, `метки «${facet}» нет в словаре`); continue }
      for (const x of [v].flat()) if (!vocab[facet].includes(x)) bad(who, `${facet}: «${x}» не из словаря`)
    }
    for (const facet of facets) if (!(facet in (e.метки ?? {}))) bad(who, `метка «${facet}» не поставлена`)
    for (const s of ['наведение', 'нажатие', 'фокус']) if (!e.состояния?.[s]) bad(who, `состояние «${s}» не продумано`)
    for (const k of ['снято', 'приведено']) if (!Array.isArray(e[k])) bad(who, `«${k}» — список, пусть и пустой`)
    if (read(`${e.папка}/${e.источник}`) == null) bad(who, `нет источника ${e.источник}`)
    const page = read(`${e.папка}/element.html`)
    if (page == null) { bad(who, 'нет отрисовки element.html'); continue }
    if (!/data-state="hover"/.test(page) || !/data-state="press"/.test(page)) bad(who, 'наведение и нажатие не показаны застывшими (data-state)')
    if (!/<link rel="stylesheet" href="\.\.\/base\.css">/.test(page)) bad(who, 'отрисовка не на основе ../base.css')
    const markup = page.replace(/<!--[\s\S]*?-->/g, '')
    if (/<style[\s>]/.test(markup) || /\sstyle="/.test(markup)) bad(who, 'свои стили — отличие пишется атрибутом основы, а не правилом')
    if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(markup.replace(/href="#[\w-]+"/g, ''))) bad(who, 'своя краска — краски только в основе')
    for (const m of markup.matchAll(/<use href="#([\w-]+)"/g)) if (icons.length && !icons.includes(m[1])) bad(who, `значка «${m[1]}» нет в листе набора`)
  }
  return found
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const chips = (list, cls = '') => list.map((x) => `<span class="chip${cls}">${esc(x)}</span>`).join('')

/** Страница выбора: семьи по порядку каталога, в семье — её элементы. */
export function toHtml(cat) {
  const card = (e) => `
      <article data-kind="${esc(e.род.join(' '))}">
        <header><h3>${esc(e.папка.slice(0, 2))} · ${esc(e.имя)}</h3>${chips(e.род, ' kind')}</header>
        <p class="note">${esc(e.что)}</p>
        <div class="tags">${Object.entries(e.метки).map(([k, v]) => `<span class="chip"><i>${esc(k)}</i> ${esc([v].flat().join(', '))}</span>`).join('')}</div>
        <dl>${Object.entries(e.состояния).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}${e.снято.length ? `<dt>снято</dt><dd>${esc(e.снято.join('; '))}</dd>` : ''}${e.приведено.length ? `<dt>приведено</dt><dd>${esc(e.приведено.join('; '))}</dd>` : ''}</dl>
        <div class="pair">
          <figure><div class="src">${/\.(png|jpe?g|webp)$/.test(e.источник) ? `<img src="${esc(e.папка)}/${esc(e.источник)}" alt="Источник: ${esc(e.имя)}">` : `<a href="${esc(e.папка)}/${esc(e.источник)}">${esc(e.источник)}</a>`}</div><figcaption>Источник — ${esc(e.откуда)}</figcaption></figure>
          <figure><iframe src="${esc(e.папка)}/element.html" height="${Number(e.высота) || 240}" title="${esc(e.имя)}"></iframe><figcaption>Нарисовано — <a href="${esc(e.папка)}/element.html">${esc(e.папка)}/element.html</a></figcaption></figure>
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
  .src img{max-inline-size:100%;display:block}
  iframe{inline-size:100%;border:1px solid #E4E3DF;border-radius:12px;background:#fff}
  a{color:inherit}
  [hidden]{display:none !important}
</style>
</head>
<body>
<main>
  <h1>Элементы на выбор</h1>
  <p class="lead">Каждый элемент нарисован по источнику, разобран до базового и показан в трёх состояниях. Сгруппированы по семье стиля — внутри семьи элементы подходят друг к другу. В сайт не встроены.</p>
  <div class="filter" role="group" aria-label="Род">
    <button type="button" data-kind="" aria-pressed="true">Все</button>${kinds.map((k) => `
    <button type="button" data-kind="${esc(k)}" aria-pressed="false">${esc(k)}</button>`).join('')}
  </div>${families}
</main>
<script>
for (const b of document.querySelectorAll('.filter button')) b.onclick = () => {
  for (const x of document.querySelectorAll('.filter button')) x.setAttribute('aria-pressed', String(x === b))
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
  writeFileSync(path.join(DIR, 'icons.js'), iconsJs(sheet))
  writeFileSync(path.join(DIR, 'index.html'), toHtml(cat))
  console.log(`✓ elements/index.html · ${cat.элементы.length} элементов, семей ${Object.keys(cat.семьи).length}`)
}
