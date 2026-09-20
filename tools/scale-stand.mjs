/*
 * Стенд шкал: страница, на которой видно, что делает строитель.
 *
 * Заведено по слову заказчика 21.09.2026: «я понятия не имею, что такое
 * строитель шкал… только визуально мне показывай, ибо я не понимаю». Он
 * прав дважды. Во-первых, выбор показывается глазами, а не списком (И197).
 * Во-вторых, шкалу словами не объяснить вообще: «рампа течёт между двумя
 * ширинами» — это описание того, что становится очевидным за одно движение
 * ползунка и не становится понятным ни от какого абзаца.
 *
 * Стенд собран ИЗ ВЫПУЩЕННОГО: он вставляет в себя `styles/scale.css` и
 * `styles/palette.css` как есть. Нарисовать он может только то, что на
 * сайте и стоит; расходиться с ним ему нечем.
 *
 *   node tools/scale-stand.mjs [куда.html]
 *
 * Показывает три вещи сразу:
 *   · ширину — ползунком от 320 до 1600, и всё в кадре течёт;
 *   · набор — «Тесный / Нынешний / Просторный» на ОДНОМ И ТОМ ЖЕ предмете;
 *   · числа — рядом с картинкой, живыми: что сейчас на экране в пикселях.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { resolve as resolveSet } from './scale.mjs'

const read = (p) => (existsSync(path.resolve(p)) ? readFileSync(path.resolve(p), 'utf8') : '')

const sets = JSON.parse(read('styles/scale.json') || '{}')
const names = Object.keys(sets)
if (!names.length) {
  console.error('✗ Нет styles/scale.json — показывать нечего.')
  process.exit(1)
}
const scaleCss = read('styles/scale.css')
if (!scaleCss) {
  console.error('✗ Нет styles/scale.css — сначала выпустите шкалы: npm run scale')
  process.exit(1)
}
const paletteCss = read('styles/palette.css')

/* ── витрина в кадре ──────────────────────────────────────────────────────
   Нарочно НЕ полоски и не образцы: полоска не показывает, как ступень
   ведёт себя рядом с ценой и с «нет в наличии» (И197). Поэтому в кадре
   стоит то, на чём ритм и виден: заголовок раздела, подводка, три карточки
   товара, цена, плашка, кнопка покупки и счётчик — и два раздела подряд,
   иначе воздуха МЕЖДУ разделами не видно вовсе. */
const card = (name, gram, price, out = false) => `
      <article class="card">
        <div class="shot" aria-hidden="true"></div>
        <div class="in">
          <p class="nm">${name}</p>
          <p class="sub">${gram}</p>
          <p class="row"><span class="price">${price}</span>${out ? '<span class="badge">няма наличност</span>' : ''}</p>
          <div class="buy">
            <div class="count"><button type="button">−</button><span>1</span><button type="button">+</button></div>
            <button type="button" class="go"${out ? ' disabled' : ''}>В количката</button>
          </div>
        </div>
      </article>`

const PREVIEW = `<!doctype html>
<html lang="bg"><head><meta charset="utf-8">
<style>
${paletteCss}
${scaleCss}
*{box-sizing:border-box;margin:0}
body{background:var(--n-1,#fff);color:var(--n-12,#222);font:400 var(--fs-base)/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.page{padding-block:var(--air-page);display:flex;flex-direction:column;gap:var(--air-page)}
.wrap{inline-size:min(1160px,100% - var(--pad-sheet) * 2);margin-inline:auto}
.band{display:flex;flex-direction:column;gap:var(--air-head)}
h2{font-size:var(--fs-2xl);line-height:1.15;font-weight:600;letter-spacing:-.02em}
.lede{font-size:var(--fs-sm);color:var(--n-11,#666);max-inline-size:58ch}
.shelf{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:var(--air-row)}
.card{background:var(--n-2,#fafafa);border:1px solid var(--line,#e5e5e5);border-radius:14px;padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--air-group)}
.shot{aspect-ratio:4/3;max-block-size:220px;border-radius:10px;background:var(--a-3,#eef3f5)}
.in{display:flex;flex-direction:column;gap:var(--air-row)}
.nm{font-size:var(--fs-sm);font-weight:600}
.sub{font-size:var(--fs-2xs);color:var(--n-11,#666)}
.row{display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap}
.price{font-size:var(--fs-xl);font-weight:600}
.badge{font-size:var(--fs-2xs);padding:2px 8px;border-radius:999px;background:var(--warn-2,#fff4ec);color:var(--warn-11,#a34400)}
.buy{display:flex;align-items:center;gap:var(--gap-targets);flex-wrap:wrap}
.count{display:flex;align-items:center;gap:var(--gap-targets)}
.count button{min-inline-size:44px;min-block-size:44px;border:1px solid var(--border,#bbb);background:transparent;color:inherit;border-radius:10px;font-size:var(--fs-base);cursor:pointer}
.count span{min-inline-size:2ch;text-align:center;font-size:var(--fs-sm)}
.go{flex:1;min-block-size:44px;padding-inline:var(--pad-inner);border:0;border-radius:10px;background:var(--a-9,#0c3a46);color:var(--on-a-9,#fff);font-size:var(--fs-sm);font-weight:600;cursor:pointer}
.go[disabled]{opacity:.45}
.note{font-size:var(--fs-2xs);color:var(--n-11,#666)}
</style></head>
<body>
  <main class="page">
    <section class="wrap band">
      <div class="band" style="gap:var(--air-block)">
        <h2>CBD масла</h2>
        <p class="lede">Пълен спектър, студено пресовано конопено масло. Съдържанието на CBD е посочено за флакон от 10 ml.</p>
      </div>
      <div class="shelf">
${card('CBD масло 5%', '10 ml · 500 mg', '49,00 лв.')}
${card('CBD масло 10%', '10 ml · 1000 mg', '89,00 лв.')}
${card('CBD масло 15%', '10 ml · 1500 mg', '129,00 лв.', true)}
      </div>
      <p class="note">Цената е за 10 ml. Хранителна добавка — не заменя разнообразното хранене.</p>
    </section>
    <section class="wrap band">
      <div class="band" style="gap:var(--air-block)">
        <h2>Капсули и капки</h2>
        <p class="lede">Вторият раздел стои тук нарочно: въздухът между разделите се вижда само когато има два.</p>
      </div>
      <div class="shelf">
${card('CBD капсули 25 mg', '30 броя', '69,00 лв.')}
${card('Капки за сън', '30 ml', '59,00 лв.')}
      </div>
    </section>
  </main>
</body></html>`

/* ── таблица чисел: она идёт РЯДОМ с картинкой, а не вместо неё ──────────── */
const rows = (name) => {
  const r = resolveSet(sets[name])
  const line = (what, pair) => `<tr><td>${what}</td><td>${pair[0]}</td><td>${pair[1]}</td></tr>`
  return [
    line('текст страницы', r.размер.base ?? ['—', '—']),
    line('заголовок раздела', r.размер['2xl'] ?? ['—', '—']),
    line('поле карточки', r.поле.card ?? ['—', '—']),
    line('воздух между полками', r.воздух.band?.pair ?? ['—', '—']),
    line('воздух между разделами', r.воздух.page?.pair ?? ['—', '—']),
  ].join('\n')
}

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Строитель шкал</title>
<style>
  :root{ color-scheme:light dark; --ink:#1b1917; --dim:#6c665e; --paper:#fbfaf8; --card:#fff; --edge:#e6e2db; --mark:#0c3a46 }
  @media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){ --ink:#ece9e4; --dim:#a29b91; --paper:#141310; --card:#1c1a17; --edge:#2f2b26; --mark:#7fc0d1 } }
  :root[data-theme="dark"]{ --ink:#ece9e4; --dim:#a29b91; --paper:#141310; --card:#1c1a17; --edge:#2f2b26; --mark:#7fc0d1 }
  *{box-sizing:border-box;margin:0}
  body{background:var(--paper);color:var(--ink);font:400 16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px 16px 64px}
  .col{max-width:1180px;margin-inline:auto;display:flex;flex-direction:column;gap:24px}
  h1{font-size:clamp(24px,2.4vw + 16px,34px);line-height:1.15;letter-spacing:-.02em;font-weight:650}
  .say{max-width:70ch;color:var(--dim);font-size:15.5px}
  .say b{color:var(--ink);font-weight:600}
  .panel{background:var(--card);border:1px solid var(--edge);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:14px}
  .line{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
  .lab{font-size:13px;color:var(--dim);min-width:74px}
  button.set,button.w{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid var(--edge);background:transparent;color:inherit;font-size:14.5px;cursor:pointer}
  button.set[aria-pressed="true"],button.w[aria-pressed="true"]{background:var(--mark);border-color:var(--mark);color:var(--paper);font-weight:600}
  input[type=range]{flex:1;min-width:200px;accent-color:var(--mark);height:44px}
  .now{font-variant-numeric:tabular-nums;font-size:14px;color:var(--dim)}
  .now b{color:var(--ink)}
  .stage{border:1px solid var(--edge);border-radius:16px;background:var(--card);padding:12px;overflow:auto}
  .frame{margin-inline:auto;border:0;display:block;background:transparent;inline-size:390px;block-size:clamp(520px,74vh,900px);box-shadow:0 0 0 1px var(--edge)}
  table{border-collapse:collapse;font-size:14px;width:100%}
  th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--edge)}
  th{font-size:12.5px;color:var(--dim);font-weight:500}
  td:nth-child(2),td:nth-child(3){font-variant-numeric:tabular-nums;width:6.5rem}
  .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px}
  code{font:500 13.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;background:color-mix(in srgb,var(--mark) 10%,transparent);padding:2px 6px;border-radius:6px}
</style></head>
<body>
<div class="col">
  <header style="display:flex;flex-direction:column;gap:12px">
    <h1>Строитель шкал — что это такое</h1>
    <p class="say">Это станок. Вы говорите ему <b>два числа на каждую ступень</b> — сколько на телефоне и сколько на большом экране, — а он пишет весь CSS: и буквы, и воздух. Между этими двумя ширинами всё <b>течёт</b>, без ступенек. Потяните ползунок ширины — и смотрите на кадр: ничего не «переключается», всё едет плавно.</p>
    <p class="say">Кнопки «Тесный / Нынешний / Просторный» — это три готовых набора чисел на <b>одном и том же товаре</b>. Меняется только ритм: буквы, поля, воздух. Ни одной картинки, ни одного цвета, ни одной строки вёрстки при этом не трогают.</p>
  </header>

  <div class="panel">
    <div class="line"><span class="lab">Набор</span><span id="setbtns" class="line" style="gap:8px"></span></div>
    <div class="line"><span class="lab">Ширина</span><input id="w" type="range" min="320" max="1600" step="1" value="390">
      <span class="now"><b id="wnow">390</b> px</span></div>
    <div class="line"><span class="lab"></span>
      <button class="w" data-w="360" type="button">телефон 360</button>
      <button class="w" data-w="768" type="button">планшет 768</button>
      <button class="w" data-w="1440" type="button">монитор 1440</button>
    </div>
    <div class="line now" id="live"></div>
  </div>

  <div class="stage"><iframe id="view" class="frame" title="витрина"></iframe></div>
  <p class="say" style="text-align:center">Витрина в рамке листается — воздух между разделами виден, когда доскроллите до второго.</p>

  <div class="two" id="tables"></div>

  <p class="say">Числа этих таблиц лежат в одном файле — <code>styles/scale.json</code>. Команда <code>npm run scale</code> пересчитывает из них <code>styles/scale.css</code>, а <code>npm run check:scale</code> проверяет: лестница не сходится в одну точку, воздух не меньше трёх полей карточки, рампа доходит до обоих своих концов, под пальцем зазор не меньше 16.</p>
</div>

<script>
const SETS = ${JSON.stringify(names)};
const PREVIEW = ${JSON.stringify(PREVIEW)};
const view = document.getElementById('view');
const w = document.getElementById('w');
const wnow = document.getElementById('wnow');
const live = document.getElementById('live');
let current = SETS[0];

const btns = document.getElementById('setbtns');
for (const name of SETS) {
  const b = document.createElement('button');
  b.className = 'set'; b.type = 'button'; b.textContent = name;
  b.setAttribute('aria-pressed', String(name === current));
  b.onclick = () => { current = name; paint(); read(); };
  btns.append(b);
}

document.getElementById('tables').innerHTML = ${JSON.stringify(
  names.map((n) => `<div class="panel"><b>${n}</b><table><thead><tr><th>что</th><th>телефон</th><th>макет</th></tr></thead><tbody>${rows(n)}</tbody></table></div>`).join(''),
)};

function paint() {
  for (const b of btns.children) b.setAttribute('aria-pressed', String(b.textContent === current));
  const doc = view.contentDocument;
  if (doc && doc.documentElement) doc.documentElement.setAttribute('data-scale', current);
}
function size() {
  const px = Number(w.value);
  view.style.inlineSize = px + 'px';
  wnow.textContent = px;
  /* Замер — ПОСЛЕ перекладки: спрошенный в той же строке, что и новая
     ширина, он отвечает вчерашним числом, и на стенде это выглядит как
     «текст не течёт». Два кадра ожидания — ровно столько, сколько браузеру
     нужно, чтобы пересчитать рамку. */
  requestAnimationFrame(() => requestAnimationFrame(read));
}
function read() {
  const doc = view.contentDocument;
  if (!doc || !doc.body) return;
  const get = (el, prop) => el ? Math.round(parseFloat(getComputedStyle(el)[prop]) * 10) / 10 : '—';
  const body = doc.body;
  const card = doc.querySelector('.card');
  const page = doc.querySelector('.page');
  live.innerHTML = 'сейчас в кадре: текст <b>' + get(body, 'fontSize') + '</b> px · ' +
    'поле карточки <b>' + get(card, 'paddingTop') + '</b> px · ' +
    'воздух между разделами <b>' + get(page, 'rowGap') + '</b> px';
}
w.addEventListener('input', size);
for (const b of document.querySelectorAll('.w')) b.onclick = () => { w.value = b.dataset.w; size();
  for (const o of document.querySelectorAll('.w')) o.setAttribute('aria-pressed', String(o === b)); };
view.addEventListener('load', () => { paint(); read(); });
view.srcdoc = PREVIEW;
size();
</script>
</body></html>`

const out = path.resolve(process.argv[2] ?? 'scale-stand.html')
writeFileSync(out, html)
console.log(`Стенд собран: ${out}`)
console.log(`Наборов на стенде: ${names.length} · ${names.join(', ')}`)
