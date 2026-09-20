/*
 * Стенд цвета: одна и та же карточка товара во всех наборах красок.
 *
 * Заведено по вопросу владельца 21.09.2026: «что такое стенд цвета?» —
 * то есть ему его ни разу не показывали, а пункт ворот «набор цвета показан
 * заказчику отрисованным» стоял и ждал. Словами цвет не выбирают: `#B79339`
 * не говорит ничего никому, а полоска краски не показывает, как этот цвет
 * ведёт себя рядом с ценой, кнопкой покупки и «няма наличност»
 * (CLAUDE.md, «Выбор показывается глазами, а не списком»).
 *
 *   node tools/palette-stand.mjs [куда.html]
 *
 * Наборы берутся из `styles/palette.json` (то, чем сайт покрашен сейчас) и
 * `templates/palette.json` (образцы набора). Краски и всё, что из них
 * считается, — тем же кодом, что красит сайт: расходиться стенду не с чем.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { toCss, ratio, apca, roles } from './palette.mjs'

const read = (p) => (existsSync(path.resolve(p)) ? readFileSync(path.resolve(p), 'utf8') : '')
const load = (p) => { const t = read(p); return t ? JSON.parse(t) : {} }

const own = load('styles/palette.json')
const samples = load('templates/palette.json')
/* Свой набор — первым: он стоит на сайте, остальные рядом для сравнения. */
const sets = { ...own, ...Object.fromEntries(Object.entries(samples).filter(([n]) => !(n in own))) }
const names = Object.keys(sets)
if (!names.length) {
  console.error('✗ Ни styles/palette.json, ни templates/palette.json — показывать нечего.')
  process.exit(1)
}

const css = toCss(sets, { generator: 'tools/palette-stand.mjs' })

/** Числа рядом с картинкой: они отвечают на свой вопрос — что проходит
 *  проверку и какой ценой, — а выбирает владелец глазами. */
const numbers = (name) => {
  const out = []
  for (const mode of ['light', 'dark']) {
    const r = roles(sets[name][mode], mode)
    out.push({
      mode,
      text: ratio(sets[name][mode].ink, sets[name][mode].paper).toFixed(1),
      textLc: Math.abs(apca(sets[name][mode].ink, sets[name][mode].paper)).toFixed(0),
      button: ratio(r['--on-a-9'], r['--a-9']).toFixed(1),
      sale: ratio(r['--on-sale-9'], r['--sale-9']).toFixed(1),
    })
  }
  return out
}

const card = (name) => `
  <section class="set" data-palette="${name}">
    <p class="name">${name}</p>
    <article class="card">
      <div class="shot"></div>
      <div class="in">
        <p class="eyebrow">CBD масла</p>
        <p class="nm">CBD масло 10%</p>
        <p class="sub">10 ml · 1000 mg</p>
        <p class="row">
          <span class="price">89,00 лв.</span>
          <span class="was">112,00 лв.</span>
          <span class="sale">−20%</span>
        </p>
        <div class="buy">
          <button type="button" class="go">В количката</button>
        </div>
        <p class="out">няма наличност</p>
      </div>
    </article>
    <dl class="nums">
      ${numbers(name).map((n) => `
        <div><dt>${n.mode === 'light' ? 'светлая' : 'тёмная'}</dt>
        <dd>текст ${n.text} · кнопка ${n.button} · скидка ${n.sale}</dd></div>`).join('')}
    </dl>
  </section>`

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Наборы цвета</title>
<style>
${css}
:root{ color-scheme: light dark; --edge:#e6e2db }
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){ --edge:#2f2b26 } }
:root[data-theme="dark"]{ --edge:#2f2b26 }
*{box-sizing:border-box;margin:0}
body{background:var(--n-2);color:var(--n-12);font:400 16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px 16px 64px;-webkit-font-smoothing:antialiased}
.col{max-width:1180px;margin-inline:auto;display:flex;flex-direction:column;gap:24px}
h1{font-size:clamp(24px,2.4vw + 16px,34px);line-height:1.15;font-weight:650;letter-spacing:-0.64px}
.say{max-width:70ch;color:var(--n-11);font-size:15.5px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:20px}
.set{background:var(--n-1);border:1px solid var(--n-6);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;color:var(--n-12)}
.name{font-weight:650;font-size:15px}
.card{background:var(--n-2);border:1px solid var(--n-6);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px}
.shot{aspect-ratio:4/3;max-block-size:180px;border-radius:10px;background:var(--a-3)}
.in{display:flex;flex-direction:column;gap:8px}
.eyebrow{font-size:13px;font-weight:600;color:var(--n-11);letter-spacing:0.16px}
.nm{font-size:16px;font-weight:600}
.sub{font-size:13px;color:var(--n-11)}
.row{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.price{font-size:20px;font-weight:650}
.was{font-size:13px;color:var(--n-11);text-decoration:line-through}
.sale{font-size:13px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--sale-9);color:var(--on-sale-9)}
.go{min-block-size:44px;padding-inline:16px;border:0;border-radius:10px;background:var(--a-9);color:var(--on-a-9);font-size:15px;font-weight:600;cursor:pointer;inline-size:100%}
.go:active{background:var(--a-press)}
.out{font-size:13px;color:var(--e-11)}
.nums{font-size:12.5px;color:var(--n-11);font-variant-numeric:tabular-nums;display:flex;flex-direction:column;gap:2px}
.nums div{display:flex;gap:8px}
.nums dt{min-inline-size:5.5rem}
.bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
button.t{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid var(--n-7);background:transparent;color:inherit;font-size:14.5px;cursor:pointer}
button.t[aria-pressed="true"]{background:var(--n-12);color:var(--n-1);border-color:var(--n-12);font-weight:600}
</style></head>
<body>
<div class="col">
  <header style="display:flex;flex-direction:column;gap:10px">
    <h1>Наборы цвета</h1>
    <p class="say">Одна и та же карточка товара, ${names.length} наборов красок. Смотрите, как цвет ведёт себя рядом с ценой, зачёркнутой ценой, плашкой скидки, кнопкой покупки и надписью «няма наличност» — полоска краски этого не показывает.</p>
    <p class="say">Первый набор — тот, которым сайт покрашен сейчас. Числа под карточкой — во сколько раз текст светлее фона: 4.5 и выше проходит проверку для мелкого текста, 3 — для крупного и для кнопок.</p>
    <div class="bar">
      <button class="t" type="button" data-theme="light" aria-pressed="true">Светлая</button>
      <button class="t" type="button" data-theme="dark" aria-pressed="false">Тёмная</button>
    </div>
  </header>
  <div class="grid">
${names.map(card).join('\n')}
  </div>
  <p class="say">Скажете имя набора — поставлю его на сайт одной правкой: краски лежат в <code>styles/palette.json</code>, всё остальное из них считается.</p>
</div>
<script>
for (const b of document.querySelectorAll('.t')) b.onclick = () => {
  document.documentElement.setAttribute('data-theme', b.dataset.theme)
  for (const o of document.querySelectorAll('.t')) o.setAttribute('aria-pressed', String(o === b))
}
</script>
</body></html>`

const out = path.resolve(process.argv[2] ?? 'palette-stand.html')
writeFileSync(out, html)
console.log(`Стенд цвета собран: ${out}`)
console.log(`Наборов: ${names.length} · ${names.join(', ')}`)
