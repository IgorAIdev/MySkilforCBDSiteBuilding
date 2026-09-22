/*
 * Стенд стилей кнопки: каталог `styles/buttons.json` на одном и том же куске
 * магазина — выбор глазами, а не списком (CLAUDE.md, «Выбор показывается
 * глазами»; И252).
 *
 *   node tools/button-stand.mjs [куда.html]          по умолчанию button-stand.html
 *   node tools/button-stand.mjs --bare куда.html     без обёртки <html> — для публикации артефактом
 *
 * Собран ИЗ ВЫПУЩЕННОГО: палитра, шкалы, роли, основа, примитивы, кнопка
 * основы и каталог стилей вставлены как есть. Каждый стиль — та же кнопка
 * основы под `[data-button="имя"]`, поэтому стенд не может показать то, чего
 * сайт не наденет. Стиль, не прошедший замер на палитре сайта, показан, но
 * помечен и не выбирается — причина числом рядом.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { availability, toCss, buttonRoles } from './buttons.mjs'

const read = (p) => (existsSync(path.resolve(p)) ? readFileSync(path.resolve(p), 'utf8') : '')
const need = ['styles/palette.css', 'styles/scale.css', 'styles/tokens.css', 'styles/base.css', 'styles/primitives.module.css', 'styles/btn.module.css', 'styles/buttons.json', 'styles/palette.json', 'styles/icons.svg']
const missing = need.filter((p) => !read(p))
if (missing.length) { console.error(`✗ Нет ${missing.join(', ')} — показывать нечем.`); process.exit(1) }

const styles = JSON.parse(read('styles/buttons.json'))
const { off } = availability(styles, JSON.parse(read('styles/palette.json')))
const plain = (p) => read(p).replace(/composes\s*:[^;}]*;?/g, '')
const scaleCss = read('styles/scale.css')

/* Палец — атрибутом, теми же числами, что в блоке @media (pointer:coarse). */
const coarseAt = scaleCss.search(/@media\s*\(\s*pointer\s*:\s*coarse\s*\)/)
const coarseBody = coarseAt < 0 ? '' : scaleCss.slice(scaleCss.indexOf('{', scaleCss.indexOf('{', coarseAt) + 1) + 1, scaleCss.indexOf('}', coarseAt))
const coarseRule = `[data-pointer="coarse"]{${coarseBody}}`

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`
const shot = (hue) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="hsl(${hue} 30% 82%)"/><rect x="170" y="60" width="60" height="24" rx="5" fill="hsl(${hue} 25% 30%)"/><rect x="150" y="84" width="100" height="170" rx="16" fill="hsl(${hue} 30% 42%)"/></svg>`)}`

const scene = (big = false) => `
      <div class="scene ${big ? 'big' : ''}">
        <div class="frame shot"><img src="${shot(38)}" alt="" width="400" height="300"></div>
        <p class="eyebrow">Масла · 10 мл · 1000 мг</p>
        <p class="name">Масло с CBD 10 %</p>
        <div class="cluster row"><b class="price">29,90 €</b><span class="muted">2,99 € / мл</span></div>
        <div class="cluster">
          <button class="btn" data-voice="loud"${big ? ' data-size="lg"' : ''} type="button">${icon('shopping-cart')}Добави в количката</button>
          <button class="btn"${big ? ' data-size="lg"' : ''} type="button">Сравни</button>
        </div>
        <div class="cluster">
          <button class="btn" data-size="sm" type="button">${icon('sliders-horizontal')}Филтри</button>
          <button class="btn" data-size="sm" type="button">Сила 10 %</button>
          <button class="btn" data-voice="loud" data-size="sm" type="button" disabled>Изчерпан</button>
        </div>
      </div>`

const tile = (name, s) => {
  const r = buttonRoles(s)
  const why = off[name]?.[0]
  return `
    <article class="tile${why ? ' off' : ''}" data-button="${esc(name)}">
      <header class="head">
        <h2>${esc(name)}</h2>
        ${why ? `<p class="badge no">не для этой палитры</p>` : `<p class="badge ok">проходит</p>`}
      </header>
      <p class="what">${esc(s.что)}</p>
      ${scene()}
      <dl class="facts">
        <div><dt>угол</dt><dd>${esc(r['--ctrl-btn-r'])}${s.круг ? ' · главная — круг' : ''}</dd></div>
        <div><dt>буквы</dt><dd>${s.вес} · ${esc(s.регистр)}${s.разрядка ? ` · ${s.разрядка}em` : ''}</dd></div>
        <div><dt>главная</dt><dd>${esc(s.громкая)}${s.тень !== 'нет' ? ` · ${esc(s.тень)}` : ''}</dd></div>
        <div><dt>тихая</dt><dd>${esc(s.тихая)}</dd></div>
        <div><dt>надпись главной</dt><dd class="live" data-live="contrast">—</dd></div>
      </dl>
      ${why ? `<p class="why">${esc(why.rule)}: ${why.got} при норме ${why.need} (${why.theme === 'light' ? 'светлая' : 'тёмная'} тема)</p>` : `<button class="btn pick" type="button" data-pick="${esc(name)}">Посмотреть крупно</button>`}
    </article>`
}

const head = `<title>Стенд кнопок</title>
<style>
${read('styles/palette.css')}
${scaleCss}
${read('styles/tokens.css')}
${read('styles/base.css')}
${plain('styles/primitives.module.css')}
${read('styles/btn.module.css')}
${toCss(styles)}
${coarseRule}
body{background:var(--page);color:var(--ink);font-family:var(--face)}
.top{display:flex;flex-wrap:wrap;gap:var(--gap-row);align-items:center;justify-content:space-between;padding-block:var(--air-row)}
.top h1{font-size:var(--h2-size);line-height:var(--h2-lead);font-weight:var(--h2-weight)}
.intro{color:var(--ink-soft);max-inline-size:var(--measure-lede)}
.switch{display:flex;flex-wrap:wrap;gap:var(--sp-1)}
.gallery{--cols:3;--cell-min:300px;--cols-min:1;padding-block:var(--air-block)}
.tile{--stack:var(--air-row);background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card);box-shadow:var(--sh-raised);display:flex;flex-direction:column;gap:var(--air-row)}
.tile.off{opacity:.72}
.head{display:flex;gap:var(--gap-row);align-items:baseline;justify-content:space-between}
.head h2{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:var(--h3-weight)}
.badge{font-size:var(--note-size);font-weight:600;white-space:nowrap}
.badge.ok{color:var(--ok-11, var(--ink-soft))}
.badge.no{color:var(--bad)}
.what,.why{font-size:var(--note-size);color:var(--ink-soft)}
.why{color:var(--bad)}
.scene{display:flex;flex-direction:column;gap:var(--air-row);background:var(--page);border-radius:var(--r-ctrl);padding:var(--pad-inner)}
.shot{--frame:4 / 3;border-radius:var(--r-ctrl)}
.name{font-size:var(--h3-size);font-weight:var(--h3-weight);line-height:var(--h3-lead)}
.row{justify-content:space-between}
.price{font-size:var(--h3-size);font-weight:var(--h3-weight)}
.facts{display:grid;grid-template-columns:auto 1fr;gap:var(--sp-1) var(--gap-row);font-size:var(--note-size)}
.facts div{display:contents}
.facts dt{color:var(--ink-soft)}
.facts dd{margin:0}
.pick{align-self:flex-start}
.big{padding:var(--pad-card)}
.preview{padding-block:var(--air-block)}
.preview .sidebar{--side-w:320px}
.sum{display:flex;flex-direction:column;gap:var(--air-row);background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card)}
.sum .row{display:flex;justify-content:space-between}
[aria-pressed='true'].btn{outline:var(--ring-w) solid var(--ring);outline-offset:var(--ring-off)}
</style>`
const content = `${read('styles/icons.svg').replace('<svg ', '<svg style="display:none" ')}
<main class="wrap">
  <header class="top">
    <div class="stack">
      <h1>Стиль кнопок</h1>
      <p class="intro">Одна и та же кнопка магазина в ${Object.keys(styles).length} стилях, на одном и том же товаре. Голосов два: главная — одна на экране, тихая — всё остальное. Выберите стиль глазами; числа рядом — что он проходит на палитре сайта.</p>
    </div>
    <div class="stack">
      <div class="switch" role="group" aria-label="Тема">
        <button class="btn" data-size="sm" type="button" data-theme-set="light">Светлая</button>
        <button class="btn" data-size="sm" type="button" data-theme-set="dark">Тёмная</button>
      </div>
      <div class="switch" role="group" aria-label="Указатель">
        <button class="btn" data-size="sm" type="button" data-pointer-set="fine" aria-pressed="true">Мышь</button>
        <button class="btn" data-size="sm" type="button" data-pointer-set="coarse">Палец</button>
      </div>
    </div>
  </header>

  <section class="preview" id="preview" hidden>
    <h2 class="name" id="preview-name"></h2>
    <div class="sidebar" id="preview-body">
      ${scene(true)}
      <aside class="aside"><div class="sum">
        <div class="row"><span>Междинна сума</span><b>59,80 €</b></div>
        <div class="row"><span>Доставка</span><b>4,90 €</b></div>
        <div class="row"><strong>Общо</strong><strong class="price">64,70 €</strong></div>
        <button class="btn" data-voice="loud" data-size="lg" data-wide type="button">Към плащане</button>
        <button class="btn" data-wide type="button">Продължи пазаруването</button>
      </div></aside>
    </div>
  </section>

  <section class="grid gallery">${Object.entries(styles).map(([n, s]) => tile(n, s)).join('')}
  </section>
</main>
<script>
document.documentElement.dataset.pointer ??= 'fine'
document.documentElement.lang ||= 'bg'
const lum = (c) => { const [r, g, b] = c.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const solid = (el) => { for (let e = el; e; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor; if (!/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg } return 'rgb(255,255,255)' }
function live() {
  for (const tile of document.querySelectorAll('.tile')) {
    const loud = tile.querySelector('.btn[data-voice="loud"]')
    const cs = getComputedStyle(loud)
    tile.querySelector('[data-live="contrast"]').textContent = ratio(cs.color, solid(loud)).toFixed(2) + ' : 1'
  }
}
for (const b of document.querySelectorAll('[data-theme-set]')) b.onclick = () => { document.documentElement.dataset.theme = b.dataset.themeSet; for (const x of document.querySelectorAll('[data-theme-set]')) x.setAttribute('aria-pressed', String(x === b)); requestAnimationFrame(live) }
for (const b of document.querySelectorAll('[data-pointer-set]')) b.onclick = () => { document.documentElement.dataset.pointer = b.dataset.pointerSet; for (const x of document.querySelectorAll('[data-pointer-set]')) x.setAttribute('aria-pressed', String(x === b)) }
for (const b of document.querySelectorAll('[data-pick]')) b.onclick = () => {
  const p = document.getElementById('preview'); p.hidden = false; p.dataset.button = b.dataset.pick
  document.getElementById('preview-name').textContent = 'Крупно: ' + b.dataset.pick
  p.scrollIntoView({ block: 'start' })
}
live()
</script>`

const bare = process.argv.includes('--bare')
const out = process.argv.filter((a) => !a.startsWith('--'))[2] ?? 'button-stand.html'
writeFileSync(out, bare ? `${head}
${content}
` : `<!doctype html>
<html lang="bg" data-pointer="fine">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
</head>
<body>
${content}
</body>
</html>
`)
console.log(`✓ стенд кнопок: ${out} · ${Object.keys(styles).length} стилей, не для этой палитры: ${Object.keys(off).join(', ') || 'нет'}`)
