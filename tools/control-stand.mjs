/*
 * Стенд размеров органов: три размера кнопки, поля, фишки и счётчика — на
 * одном товаре, рядом, переключаются одним нажатием.
 *
 * Зачем он: размер органа словами не выбирают. «Средняя кнопка 40» не
 * говорит ничего никому, а «малый / средний / крупный» становится выбором
 * ровно в ту секунду, когда все три стоят на настоящей карточке с ценой,
 * фишками крепости и «В количката» (CLAUDE.md, «Выбор показывается глазами,
 * а не списком»).
 *
 *   node tools/control-stand.mjs [куда.html]
 *
 * Собран ИЗ ВЫПУЩЕННОГО: `styles/palette.css`, `styles/scale.css`,
 * `styles/tokens.css` и `styles/base.css` вставлены в страницу как есть.
 * Нарисовать он может только то, что на сайте и стоит; расходиться с ним
 * ему нечем — и если роли высоты ещё не выпущены, это видно на стенде, а не
 * замазано числом.
 *
 * Показывает три вещи сразу:
 *   · размер — «Малый / Средний / Крупный» на ОДНИХ И ТЕХ ЖЕ органах;
 *   · указатель — «курсор / палец»: @media в странице не подделать, поэтому
 *     блок `@media (pointer:coarse)` читается из scale.css при сборке и
 *     выпускается как `[data-pointer="coarse"]` — те же числа, не свои;
 *   · числа — рядом с картинкой, живыми: что сейчас на экране в пикселях.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const read = (p) => (existsSync(path.resolve(p)) ? readFileSync(path.resolve(p), 'utf8') : '')

const scaleCss = read('styles/scale.css')
if (!scaleCss) {
  console.error('✗ Нет styles/scale.css — показывать нечего.')
  console.error('    Сначала выпустите шкалы: npm run scale')
  process.exit(1)
}
const paletteCss = read('styles/palette.css')
const tokensCss = read('styles/tokens.css')
const baseCss = read('styles/base.css')

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

const CTRL = /(--ctrl-h[\w-]*|--ctrl-fs-[\w-]*)\s*:\s*([^;}]+)/g
const COARSE = /(--ctrl-h[\w-]*|--gap-[\w-]*)\s*:\s*([^;}]+)/g

const root = decls(blockAt(scaleCss, scaleCss.indexOf(':root')), CTRL)

const at = scaleCss.search(/@media\s*\(\s*pointer\s*:\s*coarse\s*\)/)
const coarse = at < 0 ? new Map() : decls(blockAt(scaleCss, at), COARSE)

/* Блок под палец выпускается атрибутом, а не своим числом: медиазапрос
   внутри страницы не подделать, а второй набор чисел был бы вторым
   источником правды. */
const coarseRule = coarse.size
  ? `[data-pointer="coarse"]{ ${[...coarse].map(([k, v]) => `${k}:${v}`).join('; ')} }`
  : '/* в styles/scale.css нет блока @media (pointer:coarse) */'

const SIZES = [
  { key: 'sm', label: 'Малый', h: '--ctrl-h-sm', fs: '--ctrl-fs-xs' },
  { key: 'md', label: 'Средний', h: '--ctrl-h', fs: '--ctrl-fs-sm' },
  { key: 'lg', label: 'Крупный', h: '--ctrl-h-lg', fs: '--ctrl-fs-base' },
]
const missing = SIZES.filter((s) => !root.has(s.h)).map((s) => s.h)

/* ── кадр: то, на чём орган и виден ───────────────────────────────────────
   Нарочно НЕ полоски и не образцы: кнопка в пустоте не показывает, тесно ли
   ей рядом с ценой и попадёт ли палец мимо фишки в соседнюю. */
const CTLS = (hit) => `
        <button type="button" class="ctl btn${hit}">В количката</button>
        <button type="button" class="ctl btn-2${hit}">Сравни</button>
        <input class="ctl field" type="text" value="Код" aria-label="Код за отстъпка">
        <button type="button" class="ctl chip${hit}" aria-pressed="true">10%</button>
        <div class="ctl count"><button type="button" class="step${hit}">−</button><span class="num">1</span><button type="button" class="step${hit}">+</button></div>
        <span class="ctl sale">−20%</span>`

const FRAME = `<!doctype html>
<html lang="bg" data-view="shop" data-size="md" data-pointer="fine"><head><meta charset="utf-8">
<style>
${paletteCss}
${tokensCss}
${scaleCss}
${baseCss}
</style>
<style>
${coarseRule}
body{background:var(--page);color:var(--ink);padding:var(--pad-card)}
.wrap{display:flex;flex-direction:column;gap:var(--air-block);max-inline-size:620px;margin-inline:auto}
.view{display:none;flex-direction:column;gap:var(--air-group)}
[data-view="shop"] .v-shop,[data-view="row"] .v-row{display:flex}

/* Орган: одна ручка — его высота. Поле внутри и надпись считаются ОТ НЕЁ,
   а не своими числами (CLAUDE.md, правило 2: «геометрия контрола — от его
   высоты… одна ручка, всё внутри считается от неё»). Ни одного пикселя
   рукой: высота — роль, надпись — роль. */
.ctl{--h:var(--ctrl-h);block-size:var(--h);padding-inline:calc(var(--h) * .4);font-size:var(--ctrl-fs-sm);
  display:inline-flex;align-items:center;justify-content:center;gap:var(--sp-2);flex:0 0 auto;
  border:1px solid var(--border);border-radius:var(--r-xs);background:transparent;color:inherit;white-space:nowrap}
[data-size="sm"] .ctl{--h:var(--ctrl-h-sm);font-size:var(--ctrl-fs-xs)}
[data-size="lg"] .ctl{--h:var(--ctrl-h-lg);font-size:var(--ctrl-fs-base)}
.btn{border:0;border-radius:var(--r-pill);background:var(--pop);color:var(--on-pop);font-weight:600}
@media (hover:hover){ .btn:hover{background:var(--pop-hover)} }
.btn-2{border-radius:var(--r-pill);background:var(--ctrl);border-color:var(--rule)}
.field{display:block;background:var(--field);inline-size:100%}
.chip{border-radius:var(--r-pill)}
.chip[aria-pressed="true"]{background:var(--pop-tint);color:var(--pop-ink);border-color:var(--pop)}
.count{padding-inline:0;overflow:hidden}
.count .step{block-size:100%;inline-size:var(--h);font-size:inherit;background:var(--ctrl);border:0;color:inherit;display:grid;place-items:center}
.count .num{inline-size:calc(var(--h) * .9);text-align:center}
.sale{background:var(--sale-fill);color:var(--on-sale);border:0;border-radius:var(--r-pill);font-weight:600}
:focus-visible{outline:2px solid var(--ring);outline-offset:2px}

/* Запас нажатия — ТОЛЬКО под пальцем, и только там, где орган мельче
   сорока четырёх: max() сам ничего не добавляет крупному. Идея взята из
   «.tap» в styles/primitives.module.css; условие — устройство ввода, здесь
   подставленное атрибутом, потому что медиазапрос внутри страницы не
   подделать. */
[data-pointer="coarse"] .hit{position:relative}
[data-pointer="coarse"] .hit::after{content:'';position:absolute;left:50%;top:50%;translate:-50% -50%;
  inline-size:max(100%, var(--tap, 44px));block-size:max(100%, var(--tap, 44px))}

.card{background:var(--plate);border:1px solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--air-group)}
.shot{aspect-ratio:4/3;max-block-size:180px;border-radius:var(--r-xs);background:var(--pop-tint)}
.nm{font-size:var(--body-size);font-weight:600}
.sub,.cap{font-size:var(--note-size);color:var(--ink-soft)}
.price{font-size:var(--h3-size);font-weight:600;display:flex;align-items:center;gap:var(--gap-row)}
.chips{display:flex;flex-wrap:wrap;gap:var(--gap-row)}
.lab{display:flex;flex-direction:column;gap:var(--sp-2);font-size:var(--note-size);color:var(--ink-soft)}
.buy{display:flex;align-items:center;gap:var(--gap-targets);flex-wrap:wrap}
.buy .btn{flex:1 1 auto}
.band{background:var(--plate);border:1px solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-inner);display:flex;flex-direction:column;gap:var(--air-group)}
.ruler{display:flex;align-items:center;flex-wrap:wrap;gap:var(--gap-targets);border-block:1px dashed var(--rule)}
</style></head>
<body>
  <main class="wrap">
    <section class="view v-shop">
      <article class="card">
        <div class="shot" aria-hidden="true"></div>
        <p class="nm">CBD масло 10%</p>
        <p class="sub">10 ml · 1000 mg</p>
        <p class="price">89,00 лв. <span class="ctl sale">−20%</span></p>
        <div class="chips">
          <button type="button" class="ctl chip hit" aria-pressed="false">5%</button>
          <button type="button" class="ctl chip hit" aria-pressed="true">10%</button>
          <button type="button" class="ctl chip hit" aria-pressed="false">15%</button>
        </div>
        <label class="lab">Код за отстъпка
          <input class="ctl field" type="text" value="ESEN20"></label>
        <div class="buy">
          <div class="ctl count"><button type="button" class="step hit">−</button><span class="num">1</span><button type="button" class="step hit">+</button></div>
          <button type="button" class="ctl btn hit">В количката</button>
        </div>
      </article>
      <p class="cap">Один размер на всю карточку: переключатель сверху меняет кнопку, поле, фишку и счётчик разом.</p>
    </section>
    <section class="view v-row">
      <div class="band">
        <p class="cap">Кнопка, второстепенная, поле, фишка, счётчик и плашка скидки — в одном ряду. Пунктир сверху и снизу показывает, что высота у всех одна.</p>
        <div class="ruler">${CTLS(' hit')}</div>
      </div>
      <p class="cap">Ряд нужен затем, что неровную высоту видно только рядом: на карточке органы стоят порознь и расхождение в два пикселя не читается.</p>
    </section>
  </main>
</body></html>`

/* ── таблица чисел: она идёт РЯДОМ с картинкой, а не вместо неё ─────────── */
const tableRows = SIZES.map((s) => {
  const desk = root.get(s.h)
  const finger = coarse.get(s.h) ?? (desk ? 'то же' : '—')
  return `<tr><td><code>${s.h}</code></td><td>${desk ?? '—'}</td><td>${finger}</td><td><code>${s.fs}</code> = ${root.get(s.fs) ?? '—'}</td></tr>`
}).join('\n')

const pointerLine = coarse.size
  ? `<div class="line"><span class="lab">Указатель</span>
      <button class="sw" type="button" data-k="pointer" data-v="fine" aria-pressed="true">курсор</button>
      <button class="sw" type="button" data-k="pointer" data-v="coarse" aria-pressed="false">палец</button>
      <span class="cap">так под пальцем — те же числа, что в <code>@media (pointer:coarse)</code></span></div>`
  : `<p class="say">В <code>styles/scale.css</code> нет блока <code>@media (pointer:coarse)</code> — показывать под пальцем нечего, и переключатель убран: выдумать числа стенд не может.</p>`

const missingLine = missing.length
  ? `<p class="say warn">В <code>styles/scale.css</code> ещё нет ${missing.length === 1 ? 'роли' : 'ролей'} ${missing.map((n) => `<code>${n}</code>`).join(', ')} — орган этого размера встанет по содержимому, а не по роли. Это не поломка стенда: он показывает ровно то, что выпущено.</p>`
  : ''

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Размеры органов</title>
<style>
  :root{ color-scheme:light dark; --ink:#1b1917; --dim:#6c665e; --paper:#fbfaf8; --card:#fff; --edge:#e6e2db; --mark:#0c3a46; --hot:#a84400 }
  @media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){ --ink:#ece9e4; --dim:#a29b91; --paper:#141310; --card:#1c1a17; --edge:#2f2b26; --mark:#7fc0d1; --hot:#ff996a } }
  :root[data-theme="dark"]{ --ink:#ece9e4; --dim:#a29b91; --paper:#141310; --card:#1c1a17; --edge:#2f2b26; --mark:#7fc0d1; --hot:#ff996a }
  *{box-sizing:border-box;margin:0}
  body{background:var(--paper);color:var(--ink);font:400 16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px 16px 64px}
  .col{max-width:1100px;margin-inline:auto;display:flex;flex-direction:column;gap:24px}
  h1{font-size:clamp(24px,2.4vw + 16px,34px);line-height:1.15;letter-spacing:-.02em;font-weight:650}
  .say{max-width:70ch;color:var(--dim);font-size:15.5px}
  .say b{color:var(--ink);font-weight:600}
  .say.warn{color:var(--hot)}
  .panel{background:var(--card);border:1px solid var(--edge);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:14px}
  .line{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
  .lab{font-size:13px;color:var(--dim);min-width:84px}
  .cap{font-size:13px;color:var(--dim)}
  button.sw,button.w{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid var(--edge);background:transparent;color:inherit;font-size:14.5px;cursor:pointer}
  button.sw[aria-pressed="true"],button.w[aria-pressed="true"]{background:var(--mark);border-color:var(--mark);color:var(--paper);font-weight:600}
  .now{font-variant-numeric:tabular-nums;font-size:14px;color:var(--dim)}
  .now b{color:var(--ink)}
  .stage{border:1px solid var(--edge);border-radius:16px;background:var(--card);padding:12px;overflow:auto}
  .frame{margin-inline:auto;border:0;display:block;background:transparent;inline-size:390px;block-size:clamp(520px,74vh,900px);box-shadow:0 0 0 1px var(--edge)}
  table{border-collapse:collapse;font-size:14px;width:100%}
  th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--edge)}
  th{font-size:12.5px;color:var(--dim);font-weight:500}
  td:nth-child(2),td:nth-child(3){font-variant-numeric:tabular-nums;width:7rem}
  code{font:500 13.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;background:color-mix(in srgb,var(--mark) 10%,transparent);padding:2px 6px;border-radius:6px}
</style></head>
<body>
<div class="col">
  <header style="display:flex;flex-direction:column;gap:12px">
    <h1>Размеры органов — три, и ни одним больше</h1>
    <p class="say">Здесь стоит <b>одна и та же карточка товара</b>, и у неё переключается размер того, что нажимают: кнопки, поля, фишки крепости, счётчика. Три размера — <b>малый, средний, крупный</b>, — и четвёртого не будет: каждый следующий размер это ещё одна строка, которую потом правят в четырёх местах. Смотрите на карточку, а не на числа: выбирать тут нечего, кроме того, удобно ли попасть пальцем и не кричит ли кнопка громче цены.</p>
    <p class="say">Числа на этой странице <b>не набраны рукой</b>. Стенд вставляет в себя выпущенные <code>styles/palette.css</code>, <code>styles/scale.css</code>, <code>styles/tokens.css</code> и <code>styles/base.css</code> как есть и читает роли прямо из них. Показать он может только то, что на сайте и стоит; если роли ещё нет — это видно, а не замазано.</p>
  </header>

  <div class="panel">
    <div class="line"><span class="lab">Кадр</span>
      <button class="sw" type="button" data-k="view" data-v="shop" aria-pressed="true">Витрина</button>
      <button class="sw" type="button" data-k="view" data-v="row" aria-pressed="false">Ряд органов</button>
    </div>
    <div class="line"><span class="lab">Размер</span>
      <button class="sw" type="button" data-k="size" data-v="sm" aria-pressed="false">Малый</button>
      <button class="sw" type="button" data-k="size" data-v="md" aria-pressed="true">Средний</button>
      <button class="sw" type="button" data-k="size" data-v="lg" aria-pressed="false">Крупный</button>
    </div>
${pointerLine}
    <div class="line"><span class="lab">Ширина</span>
      <button class="w" type="button" data-w="390" aria-pressed="true">телефон 390</button>
      <button class="w" type="button" data-w="768" aria-pressed="false">планшет 768</button>
      <button class="w" type="button" data-w="1440" aria-pressed="false">монитор 1440</button>
    </div>
    <div class="line now" id="live"></div>
  </div>

  <div class="stage"><iframe id="view" class="frame" title="витрина с органами"></iframe></div>
${missingLine}

  <div class="panel">
    <b>Три размера, как они выпущены</b>
    <table><thead><tr><th>роль высоты</th><th>на мониторе</th><th>под пальцем</th><th>надпись органа</th></tr></thead>
    <tbody>
${tableRows}
    </tbody></table>
    <p class="cap">Столбцы читаются из <code>styles/scale.css</code> при сборке стенда: левый — из корня, «под пальцем» — из блока <code>@media (pointer:coarse)</code>. Прочерк значит, что роли в файле нет.</p>
  </div>

  <p class="say">Высота органа — <b>единственная ручка</b>: поле внутри считается как <code>высота × .4</code>, надпись берётся из своей роли (<code>--ctrl-fs-xs</code> / <code>--ctrl-fs-sm</code> / <code>--ctrl-fs-base</code>), а не пишется числом на месте. Поэтому размеров и три: чтобы поменять все органы сайта, меняются три числа в одном файле. Под пальцем ступень сдвигается на одну — так требует цель нажатия в сорок четыре пикселя, и мелкий орган добирает её невидимым запасом вокруг себя, как <code>.tap</code> в наборе примитивов.</p>
</div>

<script>
const frame = document.getElementById('view');
const live = document.getElementById('live');
const state = { view:'shop', size:'md', pointer:'fine' };

function paint(){
  const doc = frame.contentDocument;
  if(!doc || !doc.documentElement) return;
  for(const k of Object.keys(state)) doc.documentElement.setAttribute('data-' + k, state[k]);
  /* Замер — ПОСЛЕ перекладки: спрошенный в той же строке, что и новый
     размер, он отвечает вчерашним числом, и на стенде это выглядит как
     «ничего не поменялось». Два кадра ожидания — ровно столько, сколько
     браузеру нужно, чтобы пересчитать рамку. */
  requestAnimationFrame(() => requestAnimationFrame(measure));
}
function measure(){
  const doc = frame.contentDocument;
  if(!doc || !doc.body) return;
  const seen = (sel) => [].slice.call(doc.querySelectorAll(sel)).filter(el => el.offsetParent)[0] || null;
  const px = (el, prop) => el ? Math.round(parseFloat(getComputedStyle(el)[prop]) * 10) / 10 : '—';
  const b = seen('.btn'), f = seen('.field'), c = seen('.chip');
  live.innerHTML = 'сейчас в кадре: кнопка <b>' + px(b,'height') + '</b> px · поле <b>' + px(f,'height') +
    '</b> px · фишка <b>' + px(c,'height') + '</b> px · надпись <b>' + px(b,'fontSize') + '</b> px';
}
function press(group, on){
  for(const o of document.querySelectorAll(group)) o.setAttribute('aria-pressed', String(o === on));
}
for(const b of document.querySelectorAll('.sw')) b.onclick = () => {
  state[b.dataset.k] = b.dataset.v;
  press('.sw[data-k="' + b.dataset.k + '"]', b);
  paint();
};
for(const b of document.querySelectorAll('.w')) b.onclick = () => {
  frame.style.inlineSize = b.dataset.w + 'px';
  press('.w', b);
  requestAnimationFrame(() => requestAnimationFrame(measure));
};
frame.addEventListener('load', paint);
frame.srcdoc = ${JSON.stringify(FRAME).replace(/<\//g, '<\\/')};
</script>
</body></html>`

const out = path.resolve(process.argv[2] ?? 'control-stand.html')
writeFileSync(out, html)
console.log(`Стенд органов собран: ${out}`)
