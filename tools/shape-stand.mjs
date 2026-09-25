/*
 * Стенд формы: радиус, тень, линия и кольцо — на одном товаре, в обеих
 * темах, наборами из styles/scale.json.
 *
 * Зачем он: форму словами не выбирают. «Скругление 8 у органа, 24 у
 * карточки» не говорит заказчику ничего, а «углы или пилюли» становится
 * выбором ровно в ту секунду, когда обе карточки стоят рядом на одном и том
 * же товаре (CLAUDE.md, «Выбор показывается глазами, а не списком»).
 *
 *   node tools/shape-stand.mjs [куда.html]
 *
 * ПОРЯДОК — что за чем делает заказчик, открыв страницу:
 *
 *   1. жмёт набор — «Нынешний», «Тихий», «Просторный» — и смотрит на ОДНУ
 *      карточку: радиусы меняются все разом, потому что они роли, а не
 *      числа на месте. Рядом — живые пиксели: xs / ctrl / card / sheet;
 *   2. выбирает орган — «круг или угол»: та же карточка дважды, слева как
 *      выпущено, справа с пилюлями везде. Это и есть решение, которое потом
 *      записывают в набор;
 *   3. смотрит четыре роли тени на полу и на листе: у каждой своя работа, и
 *      их четыре, а не «тень побольше и тень поменьше»;
 *   4. переключает тему и видит, что в тёмной глубина приходит светлотой
 *      поверхности, а не тенью;
 *   5. читает линию и кольцо: 1 / 2 / 3 — не текут ни с шириной, ни с
 *      набором;
 *   6. и только в самом низу — числа: пороги набора и радиусы всех наборов.
 *
 * ЧТО ВНУТРИ. Собран ИЗ ВЫПУЩЕННОГО, как стенды органов и раскладки:
 * `styles/palette.css`, `styles/scale.css`, `styles/tokens.css` и
 * `styles/primitives.module.css` вставлены в страницу как есть (у модуля
 * снимается одна строка — `composes`, которой в простом CSS нет). Радиусы,
 * линия и кольцо читаются из корня `styles/scale.css`, пороги — из
 * `SHAPE` в `tools/thresholds.mjs`, наборы — из `styles/scale.json`.
 * Нарисовать стенд может только то, что на сайте и стоит.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { SHAPE } from './thresholds.mjs'

const read = (p) => (existsSync(path.resolve(p)) ? readFileSync(path.resolve(p), 'utf8') : '')

const scaleCss = read('styles/scale.css')
if (!scaleCss) {
  console.error('✗ Нет styles/scale.css — показывать нечего.')
  console.error('    Сначала выпустите шкалы: npm run scale')
  process.exit(1)
}
const primRaw = read('styles/primitives.module.css')
if (!primRaw) {
  console.error('✗ Нет styles/primitives.module.css — фишки, счётчика и сегмента в проекте ещё нет.')
  process.exit(1)
}
let sets = {}
try { sets = JSON.parse(read('styles/scale.json') || '{}') } catch { sets = {} }
const names = Object.keys(sets)
if (!names.length) {
  console.error('✗ Нет styles/scale.json — наборов, между которыми выбирают, ещё нет.')
  process.exit(1)
}
const paletteCss = read('styles/palette.css')
/* Основа и вид сайта рядом: шрифт и тени — в styles/look.css (И385). */
const tokensCss = read('styles/tokens.css') + '\n' + read('styles/look.css')
const baseCss = read('styles/base.css')

/* `composes` — единственное, чем модуль отличается от простого CSS: он
   ссылается на класс из соседнего файла, и вне сборщика это не объявление,
   а мусор. Снимается только он; всё остальное едет дословно. */
const primCss = primRaw.replace(/composes\s*:[^;}]*;?/g, '')

/* ── чтение выпущенного ───────────────────────────────────────────────────
   Числа на стенде не набираются рукой: набранные рукой, они расходятся с
   файлом в тот же день, когда файл поправят. */

/** Тело блока в фигурных скобках, начиная от места: со счётом вложенности,
 *  потому что у `@media` внутри лежит ещё один блок. */
const blockAt = (text, from) => {
  const open = text.indexOf('{', from)
  if (open < 0) return ''
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i)
  }
  return ''
}

/** Объявления `--имя: значение` из куска текста, первое вхождение имени. */
const decls = (text, re) => {
  const out = new Map()
  for (const m of text.matchAll(re)) if (!out.has(m[1])) out.set(m[1], m[2].trim())
  return out
}

const ANY = /(--[\w-]+)\s*:\s*([^;}]+)/g

/* Корень выпущенной шкалы — первый набор: он и стоит на `:root`. */
const emitted = decls(blockAt(scaleCss, scaleCss.indexOf(':root')), ANY)

/** Выпущенная ступень числом: `24px` → 24. Не число — прочерк, а не
 *  выдуманное значение. */
const px = (name) => {
  const m = /^(-?[\d.]+)px$/.exec(String(emitted.get(name) ?? '').trim())
  return m ? Number(m[1]) : null
}

const R = {
  xs: px('--r-xs'), ctrl: px('--r-ctrl'), card: px('--r-card'),
  sheet: px('--r-sheet'), pop: px('--r-pop'),
}
const EDGE = { line: px('--line-w'), ring: px('--ring-w'), off: px('--ring-off') }

const missing = [
  ['--r-xs', R.xs], ['--r-ctrl', R.ctrl], ['--r-card', R.card], ['--r-sheet', R.sheet],
  ['--r-pop', R.pop], ['--line-w', EDGE.line], ['--ring-w', EDGE.ring], ['--ring-off', EDGE.off],
].filter(([, v]) => v === null).map(([n]) => n)

/* Лист объявлен в `styles/base.css`: `[data-plate]` — контракт страницы, а
   не раскладка. Стенд берёт ЭТОТ блок дословно, а не переписывает его
   своими руками: в разделе про тени показывать надо именно то, что лист
   возвращает к значению темы. Приём тот же, каким стенд органов забирает
   блок `@media (pointer:coarse)` из шкалы. */
const plateAt = baseCss.search(/^\[data-plate\]\s*\{/m)
const plateRule = plateAt < 0
  ? '/* в styles/base.css нет блока [data-plate] — лист покажет роли пола */'
  : `[data-plate]{${blockAt(baseCss, plateAt)}}`

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const num = (v) => (v === null || v === undefined ? '—' : String(v))

/* ── карточка: то, на чём форма и видна ───────────────────────────────────
   Нарочно НЕ квадратики с разным скруглением: квадратик не показывает, как
   радиус органа читается рядом с полным кругом главного действия и не
   спорит ли угол карточки с углом снимка внутри неё. */
const CHIPS = `<div class="cluster">
          <span class="chip">пълен спектър</span>
          <span class="chip f-hair">10 ml</span>
        </div>`

const SEG = `<div class="seg" role="group" aria-label="Концентрация">
          <button type="button">5 %</button>
          <button type="button" aria-pressed="true">10 %</button>
          <button type="button">15 %</button>
        </div>`

const QTY = `<div class="qty f-qty"><button type="button" aria-label="по-малко">−</button><b>1</b><button type="button" aria-label="повече">+</button></div>`

const CARD = () => `
      <article class="f-card">
        <div class="f-shot" aria-hidden="true"></div>
        <p class="f-nm">CBD масло 10 %</p>
        <p class="f-sub">10 ml · 1000 mg</p>
        <p class="f-price">89,00 лв. <span class="f-sale">−20 %</span></p>
${CHIPS}
${SEG}
        <div class="f-buy">${QTY}<button type="button" class="f-go">В количката</button></div>
      </article>`

/* ── четыре роли тени ─────────────────────────────────────────────────────
   Роль названа по работе, а не по номеру: «тень 2» не говорит, когда её
   брать, «под рукой» говорит. Список ролей — из порогов набора, чтобы он не
   разошёлся с тем, что меряет проверка. */
const SHADOW_WORK = {
  raised: 'предмет над полом в покое: карточка, лист, шапка',
  lift: 'подъём под рукой: то же, но под указателем или в нажатии',
  overlay: 'всплывающее и закрываемое: меню, окно, шторка',
  in: 'вдавленное: поле ввода, жёлоб счётчика, нажатый сегмент',
}
const shadowBoxes = SHAPE.shadows.map((nm) => `
          <div class="f-sh" data-sh="${nm}">
            <b><code>--sh-${nm}</code></b>
            <span class="f-say">${esc(SHADOW_WORK[nm] ?? 'роль тени')}</span>
          </div>`).join('')

/* ── кнопки наборов ───────────────────────────────────────────────────────
   Механизм тот же, что у стенда шкал: выпущенный CSS везёт каждый набор
   под `[data-scale="Имя"]`, и стенду остаётся поставить атрибут. Второго
   набора чисел здесь нет и быть не может. */
const setBtns = names.map((n, i) =>
  `<button class="f-btn f-set" type="button" data-set="${esc(n)}" aria-pressed="${i === 0}">${esc(n)}</button>`).join('')

/* ── таблицы чисел: они идут РЯДОМ с картинкой, а не вместо неё ─────────── */
const fact = (what, value, why) => `<tr><td>${what}</td><td>${value}</td><td>${why}</td></tr>`
const factRows = [
  fact('лестница радиусов', `<code>${SHAPE.radii.join(', ')}</code>`,
    'M3 «size-based scale with ten styles» ∪ Carbon 2 / 4 / 8 / 16 / 24; витрина берёт три-четыре ступени'),
  fact('полный круг', `<code>${num(R.pop)}</code> px`,
    'Spectrum: «Full rounding … meant to draw attention to calls to action» — только главное действие'),
  fact('линия — волосок', `<code>${SHAPE.line.hair}</code> px`, 'поле, разделитель, тег'),
  fact('линия — сильная', `<code>${SHAPE.line.strong}</code> px`, 'главная кнопка, фокус'),
  fact('кольцо фокуса', `<code>${SHAPE.ring.width}</code> px`, 'WCAG 2.4.13: кольцо не тоньше 2px'),
  fact('отступ кольца', `<code>${SHAPE.ring.offset}</code> px`, 'чтобы кольцо не слилось с собственной кромкой органа'),
  fact('ролей тени', `<code>${SHAPE.shadows.length}</code>: ${SHAPE.shadows.join(' · ')}`,
    'Atlassian raised / overlay, Refactoring UI: небольшой набор, один источник света'),
  fact('линия не масштабируется', '—',
    'Spectrum: «border width remains the same for desktop scale and mobile scale»'),
].join('\n')

const KEYS = ['xs', 'ctrl', 'card', 'sheet']
const setRows = names.map((n) => {
  const r = sets[n]?.радиус ?? {}
  return `<tr><td>${esc(n)}</td>${KEYS.map((k) => `<td>${num(r[k])}</td>`).join('')}<td>${num(R.pop)}</td></tr>`
}).join('\n')

const gone = []
if (!paletteCss) gone.push('styles/palette.css')
if (!tokensCss) gone.push('styles/tokens.css')
if (!baseCss) gone.push('styles/base.css')
const goneLine = gone.length
  ? `<p class="f-say f-warn">Нет ${gone.map((f) => `<code>${f}</code>`).join(', ')} — часть красок и ролей на стенде не разрешится. Это не поломка стенда: он показывает ровно то, что выпущено.</p>`
  : ''
const missingLine = missing.length
  ? `<p class="f-say f-warn">В <code>styles/scale.css</code> ещё нет ${missing.map((n) => `<code>${n}</code>`).join(', ')} — эта роль на стенде будет прочерком. Выдумать число стенд не может.</p>`
  : ''

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Стенд формы</title>
<style>
${paletteCss}
${tokensCss}
${scaleCss}
${primCss}
${plateRule}
</style>
<style>
/* Своя одежда стенда. Ни одного размера, поля и зазора числом: всё — роли
   из вставленного выше (запреты 1 и 2). Углы — только роли <code>--r-*</code>,
   тени — только роли <code>--sh-*</code>, толщина линии и кольца — только
   <code>--line-w</code> и <code>--ring-w</code>. Краска — тоже роль. */
*{box-sizing:border-box;margin:0}
body{background:var(--page);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  font-size:var(--fs-base);line-height:var(--body-lead);
  padding:var(--air-group) var(--pad-card) var(--air-page)}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
input{font:inherit;color:inherit}
.f-col{max-inline-size:1100px;margin-inline:auto;display:flex;flex-direction:column;gap:var(--air-band)}
.f-sec{display:flex;flex-direction:column;gap:var(--air-group);min-inline-size:0}
h1{font-size:var(--fs-h2);line-height:var(--h2-lead);letter-spacing:var(--h2-track);font-weight:var(--h2-weight)}
h2{font-size:var(--fs-h3);line-height:var(--h3-lead);letter-spacing:var(--h3-track);font-weight:var(--h3-weight)}
.f-say{max-inline-size:var(--measure);color:var(--ink-soft);font-size:var(--fs-sm);line-height:var(--body-lead)}
.f-say b{color:var(--ink);font-weight:600}
.f-warn{color:var(--bad)}
.f-read{font-size:var(--fs-xs);color:var(--ink-soft);font-variant-numeric:tabular-nums}
.f-read b{color:var(--ink);font-weight:600}
.f-tag{font-size:var(--fs-xs);color:var(--ink-soft)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:var(--fs-xs);
  background:var(--pop-tint);color:var(--pop-ink);border-radius:var(--r-xs);padding:0 var(--sp-1)}

/* ── пульт: наборы и тема ─────────────────────────────────────────────── */
.f-panel{background:var(--plate);border:var(--line-w) solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--gap-row)}
.f-line{display:flex;flex-wrap:wrap;align-items:center;gap:var(--gap-row)}
.f-key{font-size:var(--fs-xs);color:var(--ink-soft);min-inline-size:7ch}
.f-btn{block-size:var(--ctrl-h-sm);padding-inline:calc(var(--ctrl-h-sm) * .4);
  border:var(--line-w) solid var(--rule);border-radius:var(--r-ctrl);
  font-size:var(--ctrl-fs-xs);white-space:nowrap}
.f-btn[aria-pressed="true"]{background:var(--pop);border-color:var(--pop);color:var(--on-pop);font-weight:600}
:focus-visible{outline:var(--ring-w) solid var(--ring);outline-offset:var(--ring-off)}

/* ── пол стенда: на нём и стоит всё показанное ────────────────────────── */
/* Тема переключается ЗДЕСЬ, а не на странице: токены написаны через
   light-dark(), и один атрибут color-scheme на этой коробке переворачивает
   всё, что внутри, — второй копии палитры для тёмной темы не существует. */
.f-demo{background:var(--page);color:var(--ink);
  border:var(--line-w) solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-sheet);display:flex;flex-direction:column;gap:var(--air-band)}

/* ── карточка товара ──────────────────────────────────────────────────── */
.f-card{background:var(--plate);border-radius:var(--r-card);padding:var(--pad-card);
  box-shadow:var(--sh-raised);display:flex;flex-direction:column;gap:var(--air-group);
  inline-size:100%;max-inline-size:min(38ch, 100%);min-inline-size:0}
/* Концентрика: угол снимка = угол карточки минус поле между ними. Пропорция
   с потолком — запрет 4: без потолка снимок съел бы экран на узком окне. */
.f-shot{aspect-ratio:4 / 3;max-block-size:30svh;border-radius:calc(var(--r-card) - var(--pad-inner));
  background:linear-gradient(135deg, var(--pop-tint), var(--plate-3))}
.f-nm{font-size:var(--body-size);font-weight:600}
.f-sub{font-size:var(--note-size);color:var(--ink-soft)}
.f-price{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:600;
  display:flex;align-items:center;flex-wrap:wrap;gap:var(--gap-row)}
.f-sale{display:inline-flex;align-items:center;block-size:var(--ctrl-h-sm);
  padding-inline:calc(var(--ctrl-h-sm) * .3);border-radius:var(--r-ctrl);
  background:var(--sale-fill);color:var(--on-sale);font-size:var(--ctrl-fs-xs);font-weight:600}
.f-buy{display:flex;align-items:center;flex-wrap:wrap;gap:var(--gap-targets)}
/* Единственный полный круг на странице — и он у того, что зовут нажать. */
.f-go{display:inline-flex;align-items:center;justify-content:center;flex:1 1 auto;
  block-size:var(--ctrl-h-lg);padding-inline:calc(var(--ctrl-h-lg) * .4);
  border-radius:var(--r-pop);background:var(--pop);color:var(--on-pop);
  font-size:var(--ctrl-fs-sm);font-weight:600;white-space:nowrap}
.f-qty{--qty-h:var(--ctrl-h-lg)}
.f-sheet{background:var(--plate);box-shadow:var(--sh-raised)}
.f-hair{border:var(--line-w) solid var(--rule)}

/* ── пара «круг или угол» ─────────────────────────────────────────────── */
.f-pair{--switch-at:520px;--switch-gap:var(--gap-grid);align-items:flex-start}
.f-half{display:flex;flex-direction:column;gap:var(--gap-row);min-inline-size:0}

/* ── четыре роли тени ─────────────────────────────────────────────────── */
.f-shRow{display:flex;flex-wrap:wrap;gap:var(--gap-grid)}
.f-sh{flex:1 1 14ch;min-inline-size:0;background:var(--surface);border-radius:var(--r-card);
  padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--sp-2);font-size:var(--fs-sm)}
.f-sh[data-sh="raised"]{box-shadow:var(--sh-raised)}
.f-sh[data-sh="lift"]{box-shadow:var(--sh-lift)}
.f-sh[data-sh="overlay"]{box-shadow:var(--sh-overlay)}
.f-sh[data-sh="in"]{box-shadow:var(--sh-in)}
.f-plate{background:var(--plate);border-radius:var(--r-sheet);padding:var(--pad-sheet);
  display:flex;flex-direction:column;gap:var(--gap-row)}

/* ── линия и кольцо ───────────────────────────────────────────────────── */
.f-lab{display:flex;flex-direction:column;gap:var(--sp-2);font-size:var(--note-size);color:var(--ink-soft)}
.f-field{display:block;inline-size:100%;max-inline-size:24ch;block-size:var(--ctrl-h);
  padding-inline:calc(var(--ctrl-h) * .4);border:var(--line-w) solid var(--border);
  border-radius:var(--r-ctrl);background:var(--field);font-size:var(--ctrl-fs-sm)}
/* Кольцо нарисовано НАСТОЯЩИМ outline, но показано всегда: настоящий фокус
   на стенде живёт ровно до первого щелчка мимо, и показать его нельзя. */
.f-ring{outline:var(--ring-w) solid var(--ring);outline-offset:var(--ring-off)}
.f-div{border-block-start:var(--line-w) solid var(--rule)}

/* ── таблицы ──────────────────────────────────────────────────────────── */
/* Таблица данных — лента по замыслу: она не переносится (WCAG 1.4.10
   исключает её из перетока), и на 360 едет вбок внутри своей коробки. */
.f-scroll{overflow-x:auto;overflow-y:hidden}
table{border-collapse:collapse;inline-size:100%;font-size:var(--fs-sm)}
th,td{text-align:start;padding:var(--sp-2) var(--sp-3);border-block-end:var(--line-w) solid var(--rule);vertical-align:top}
th{font-size:var(--fs-xs);color:var(--ink-soft);font-weight:500}
td:nth-child(2){font-variant-numeric:tabular-nums}
.f-radii td:not(:first-child){font-variant-numeric:tabular-nums}
</style></head>
<body>
<div class="f-col">
  <header class="f-sec">
    <h1>Форма — угол, тень, линия и кольцо</h1>
    <p class="f-say">Здесь выбирают <b>форму</b>, и выбирают её глазами. Сверху пульт: набор ритма и тема. Ниже — одна и та же карточка товара, на которой видно всё сразу: угол карточки, угол снимка внутри неё, угол фишки и сегмента, полный круг главного действия, тень под листом, линия поля и кольцо фокуса. Числа стоят рядом с картинкой, а не вместо неё.</p>
    <p class="f-say">Ничего на этой странице <b>не набрано рукой</b>. Стенд вставляет в себя выпущенные <code>styles/palette.css</code>, <code>styles/scale.css</code>, <code>styles/tokens.css</code> и <code>styles/primitives.module.css</code> как есть, лист (<code>[data-plate]</code>) берёт из <code>styles/base.css</code> тем же блоком, радиусы и толщины читает из корня шкалы, а пороги — из <code>SHAPE</code> в <code>tools/thresholds.mjs</code>.</p>
${goneLine}
${missingLine}
  </header>

  <div class="f-panel">
    <div class="f-line"><span class="f-key">Набор</span>${setBtns}</div>
    <div class="f-line"><span class="f-key">Тема</span>
      <button class="f-btn f-theme" type="button" data-theme="light" aria-pressed="false">светлая</button>
      <button class="f-btn f-theme" type="button" data-theme="dark" aria-pressed="false">тёмная</button>
      <button class="f-btn f-theme" type="button" data-theme="" aria-pressed="true">системная</button>
    </div>
    <p class="f-read" id="live">—</p>
  </div>

  <div class="f-demo" id="demo" data-scale="${esc(names[0])}">
    <section class="f-sec">
      <h2>Радиус по наборам</h2>
      <p class="f-say">Угол — не украшение карточки, а <b>роль</b>: <code>--r-xs</code> у мелкого, <code>--r-ctrl</code> у органа, <code>--r-card</code> у карточки, <code>--r-sheet</code> у листа. Жмите наборы на пульте: меняются все разом, потому что все четыре выпускает строитель шкал из ключа <code>радиус</code>, а не рука на месте.</p>
${CARD()}
      <div class="sheet f-sheet">
        <p class="f-say">Лист — предмет, у которого есть свой пол: поле, угол <code>--r-sheet</code> и тень роли <code>raised</code>. Угол у него на ступень выше карточки, а поле внутри — на ступень ниже своего.</p>
      </div>
      <p class="f-read">радиусы набора: xs <b data-r="--r-xs">—</b> · ctrl <b data-r="--r-ctrl">—</b> · card <b data-r="--r-card">—</b> · sheet <b data-r="--r-sheet">—</b></p>
      <p class="f-say">Снимок внутри карточки скруглён <b>концентрически</b>: <code>calc(var(--r-card) - var(--pad-inner))</code> — угол карточки минус поле между ними, иначе внутренний угол зрительно острее внешнего. А <code>--r-pop</code> = <b>${num(R.pop)}px</b> — полный круг, и читает его на всей странице ровно одна вещь: «В количката». Spectrum: полное скругление предназначено привлекать внимание к призыву к действию, а привлекать внимание может только то, чего мало.</p>
    </section>

    <section class="f-sec">
      <h2>Орган: круг или угол</h2>
      <p class="f-say">Вот сам выбор. Слева — как выпущено сейчас: у фишек, сегментов и счётчика угол <code>--r-ctrl</code>, а полный круг — только у кнопки покупки. Справа — <code>--r-ctrl: var(--r-pop)</code>: пилюли везде. Товар, цена и порядок один и тот же, разница только в углах.</p>
      <div class="switcher f-pair">
        <div class="f-half">
          <p class="f-tag">как выпущено · <code>--r-ctrl</code> = <b data-r="--r-ctrl">—</b> px</p>
${CARD()}
        </div>
        <div class="f-half" style="--r-ctrl:var(--r-pop)">
          <p class="f-tag">пилюли везде · <code>--r-ctrl: var(--r-pop)</code></p>
${CARD()}
        </div>
      </div>
      <p class="f-say">Исследование советует левое: полный круг — только у призыва к действию (Spectrum), а тихому люксу — три радиуса и один полный круг. Выбор записывается в <code>styles/scale.json</code>, ключ <code>радиус.ctrl</code> набора: сегодня там <b>${num(R.ctrl)}</b>, пилюля — это <code>999</code>.</p>
    </section>

    <section class="f-sec">
      <h2>Тени — четыре роли</h2>
      <p class="f-say">Ролей <b>${SHAPE.shadows.length}</b>, и каждая названа по работе, а не по номеру: «тень 2» не говорит, когда её брать. Геометрия у всех одна и источник света один — меняется только сила.</p>
      <div class="f-shRow">${shadowBoxes}
      </div>
      <p class="f-tag">то же самое на листе — <code>[data-plate]</code>: лист объявляет себя полом, и тень внутри него пересчитывается от его собственных чернил, а не от пола, на котором он лежит</p>
      <div class="f-plate" data-plate>
        <div class="f-shRow">${shadowBoxes}
        </div>
      </div>
      <p class="f-say">Переключите тему на пульте. В <b>тёмной</b> теме глубина приходит не тенью, а <b>светлотой поверхности</b>: на тёмном полу тень почти не видна, и предмет выходит вперёд тем, что он светлее (Carbon, Atlassian). Поэтому тёмная тема — не светлая наизнанку, а своя лестница.</p>
    </section>

    <section class="f-sec">
      <h2>Линия и кольцо</h2>
      <p class="f-say">Линия и кольцо — единственное на этой странице, что <b>не течёт</b>: ни с шириной окна, ни с набором ритма. Волосок в один пиксель остаётся волоском и на телефоне, и на мониторе (Spectrum: толщина кромки одна и та же для настольного и мобильного масштаба).</p>
      <div class="f-line">
        <label class="f-lab">Код за отстъпка
          <input class="f-field" type="text" value="ESEN20"></label>
        <span class="chip f-hair">волосок по кромке</span>
        <button type="button" class="f-go f-ring">кольцо фокуса</button>
      </div>
      <div class="f-div"></div>
      <p class="f-read">линия <b>${num(EDGE.line)}</b> px · кольцо <b>${num(EDGE.ring)}</b> px · отступ кольца <b>${num(EDGE.off)}</b> px — из корня <code>styles/scale.css</code></p>
      <p class="f-say">Разделитель выше — та же линия: <code>border-block-start: var(--line-w) solid var(--rule)</code>. Кольцо нарисовано настоящим <code>outline</code>, но показано всегда: настоящий фокус живёт до первого щелчка мимо. И ещё одно, чего не видно глазом: <b>в forced-colors тень стирается, а обводка остаётся</b> — поэтому то, что отделено только тенью, в режиме высокой контрастности сливается, а отделённое линией — нет.</p>
    </section>
  </div>

  <section class="f-sec">
    <h2>Факты</h2>
    <div class="f-panel f-scroll">
      <table><thead><tr><th>что</th><th>сколько</th><th>откуда</th></tr></thead>
      <tbody>
${factRows}
      </tbody></table>
    </div>
    <div class="f-panel f-scroll">
      <table class="f-radii"><thead><tr><th>набор</th><th>xs</th><th>ctrl</th><th>card</th><th>sheet</th><th>pop</th></tr></thead>
      <tbody>
${setRows}
      </tbody></table>
    </div>
    <p class="f-say">Верхняя таблица — из <code>SHAPE</code> в <code>tools/thresholds.mjs</code>: это не настройка проекта, а закон набора. Нижняя — ключ <code>радиус</code> каждого набора из <code>styles/scale.json</code>; <code>pop</code> у всех один, потому что полный круг — не ступень лестницы, а единственное исключение из неё.</p>
  </section>
</div>

<script>
var demo = document.getElementById('demo');
var live = document.getElementById('live');

/* Числа читаются с ЖИВОЙ страницы, а не из набора: на экране работает то,
   что посчитал браузер, и показывать надо его. */
function readout(){
  var cs = getComputedStyle(demo);
  var reads = document.querySelectorAll('[data-r]');
  for(var i = 0; i < reads.length; i++){
    var v = (cs.getPropertyValue(reads[i].getAttribute('data-r')) || '').trim();
    reads[i].textContent = v ? v.replace('px', '') : '—';
  }
  var scheme = demo.style.colorScheme || 'системная';
  live.textContent = 'набор: ' + demo.getAttribute('data-scale') +
    ' · тема: ' + (scheme === 'light' ? 'светлая' : scheme === 'dark' ? 'тёмная' : scheme) +
    ' · угол карточки ' + ((cs.getPropertyValue('--r-card') || '').trim() || '—') +
    ' · угол органа ' + ((cs.getPropertyValue('--r-ctrl') || '').trim() || '—');
}

function press(list, on){
  for(var i = 0; i < list.length; i++) list[i].setAttribute('aria-pressed', String(list[i] === on));
}

var setBtns = document.querySelectorAll('.f-set');
for(var s = 0; s < setBtns.length; s++){
  setBtns[s].addEventListener('click', function(e){
    var b = e.currentTarget;
    demo.setAttribute('data-scale', b.getAttribute('data-set'));
    press(setBtns, b);
    requestAnimationFrame(readout);
  });
}

/* Тема ставится атрибутом style на сам пол стенда: токены написаны через
   light-dark(), и переключать нечего, кроме color-scheme. */
var themeBtns = document.querySelectorAll('.f-theme');
for(var t = 0; t < themeBtns.length; t++){
  themeBtns[t].addEventListener('click', function(e){
    var b = e.currentTarget;
    var v = b.getAttribute('data-theme');
    if(v) demo.style.colorScheme = v;
    else demo.style.removeProperty('color-scheme');
    press(themeBtns, b);
    requestAnimationFrame(readout);
  });
}

readout();
</script>
</body></html>`

const out = path.resolve(process.argv[2] ?? 'shape-stand.html')
writeFileSync(out, html)

console.log(`Стенд формы собран: ${out}`)
console.log(`  наборов: ${names.length} (${names.join(', ')}) · ролей тени: ${SHAPE.shadows.length} (${SHAPE.shadows.join(', ')})`)
console.log(`  радиусы корня: xs ${num(R.xs)} · ctrl ${num(R.ctrl)} · card ${num(R.card)} · sheet ${num(R.sheet)} · pop ${num(R.pop)}`)
console.log(`  линия ${num(EDGE.line)} · кольцо ${num(EDGE.ring)} · отступ кольца ${num(EDGE.off)}${missing.length ? ` · не выпущено: ${missing.join(', ')}` : ''}`)
console.log(`  вес страницы: ${(Buffer.byteLength(html) / 1024).toFixed(0)} КБ`)
