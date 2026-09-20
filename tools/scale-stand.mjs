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
/* Файл шкал тоже вставляется: кривые, которые роль БЕРЁТ, объявлены там —
   заголовок первого экрана и заголовок страницы считают свой контейнер
   (`cqi`), а меры строки зависят от языка. Без него роль ссылается в пустоту
   и молча схлопывается до кегля тела — и стенд врёт ровно о том, ради чего
   он собран. */
const tokensCss = read('styles/tokens.css')

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
${tokensCss}
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

/* ── второй кадр: роли текста ─────────────────────────────────────────────
   Роль — пять фактов, и показывать её надо всеми пятью сразу. Заодно здесь
   стоит пара «было / стало» для заголовка страницы: до 21.09.2026 у него не
   было межстрочья вовсе, и он наследовал 1.45 от тела — на 42-м кегле это 61
   пиксель между строками при каноне 46. Словами это незаметно, глазами —
   сразу. */
const ROW = (role, label, sample, cls = '') => `
      <section class="role">
        <p class="tag">${label} · <code>--${role}-*</code></p>
        <div class="sample ${cls}">${sample}</div>
      </section>`

const PREVIEW_TYPE = `<!doctype html>
<html lang="bg"><head><meta charset="utf-8">
<style>
${paletteCss}
${tokensCss}
${scaleCss}
*{box-sizing:border-box;margin:0}
body{background:var(--n-1,#fff);color:var(--n-12,#222);font:var(--body-weight) var(--body-size)/var(--body-lead) system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.page{padding:var(--pad-sheet);display:flex;flex-direction:column;gap:var(--air-band);container-type:inline-size}
.role{display:flex;flex-direction:column;gap:var(--sp-2)}
.tag{font-size:var(--note-size);line-height:var(--note-lead);font-weight:var(--note-weight);color:var(--n-11,#777)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.hero{font-size:var(--fs-h1);line-height:var(--hero-lead);font-weight:var(--hero-weight);letter-spacing:var(--hero-track);text-wrap:pretty}
.pagehead{max-inline-size:20ch;font-size:var(--pagehead-size);line-height:var(--pagehead-lead);font-weight:var(--pagehead-weight);letter-spacing:var(--pagehead-track);text-wrap:pretty}
.was{max-inline-size:20ch;font-size:var(--pagehead-size);line-height:var(--body-lead);font-weight:var(--pagehead-weight);letter-spacing:-.03em;text-wrap:pretty}
.h2{font-size:var(--h2-size);line-height:var(--h2-lead);font-weight:var(--h2-weight);letter-spacing:var(--h2-track)}
.h3{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:var(--h3-weight);letter-spacing:var(--h3-track)}
.intro{font-size:var(--intro-size);line-height:var(--intro-lead);font-weight:var(--intro-weight);color:var(--n-11,#666)}
.lede{font-size:var(--lede-size);line-height:var(--lede-lead);font-weight:var(--lede-weight);max-inline-size:var(--lede-measure);color:var(--n-11,#666)}
.body{font-size:var(--body-size);line-height:var(--body-lead);font-weight:var(--body-weight);max-inline-size:var(--body-measure)}
.note{font-size:var(--note-size);line-height:var(--note-lead);font-weight:var(--note-weight);max-inline-size:var(--note-measure);color:var(--n-11,#666)}
.eyebrow{font-size:var(--eyebrow-size);line-height:var(--eyebrow-lead);font-weight:var(--eyebrow-weight);letter-spacing:var(--eyebrow-track);color:var(--n-11,#666)}
.pair{border-inline-start:3px solid var(--warn-9,#f76b15);padding-inline-start:var(--sp-3)}
</style></head>
<body>
  <main class="page">
${ROW('eyebrow', 'надзаголовок', 'CBD масла', 'eyebrow')}
${ROW('hero', 'витринный заголовок', 'Студено пресовано масло', 'hero')}
${ROW('pagehead', 'заголовок страницы — как стало', 'Условия за доставка и връщане', 'pagehead')}
${ROW('pagehead', 'он же до 21.09.2026: межстрочья не было — наследовал 1.45 от тела', 'Условия за доставка и връщане', 'was pair')}
${ROW('h2', 'заголовок раздела', 'Как избираме концентрацията', 'h2')}
${ROW('h3', 'подзаголовок', 'Пълен спектър или изолат', 'h3')}
${ROW('intro', 'подводка страницы', 'Изпращаме до всяко населено място в страната за един до три работни дни.', 'intro')}
${ROW('lede', 'подводка раздела', 'Съдържанието на CBD е посочено за флакон от 10 ml, а не за доза.', 'lede')}
${ROW('body', 'тело', 'Маслото се приема под езика и се задържа около минута. Започнете с най-ниската концентрация и увеличавайте постепенно. Хранителна добавка — не заменя разнообразното хранене.', 'body')}
${ROW('note', 'подпись', 'Цената е за 10 ml. Не е лекарствен продукт.', 'note')}
  </main>
</body></html>`

/* ── таблица чисел: она идёт РЯДОМ с картинкой, а не вместо неё ──────────── */
const rows = (name) => {
  const set = sets[name]
  const r = resolveSet(set)
  const line = (what, pair) => `<tr><td>${what}</td><td>${pair[0]}</td><td>${pair[1]}</td></tr>`
  const pc = r.поле.card, ap = r.воздух.page?.pair
  return [
    line('тело — от него всё считается', set.тело ?? r.размер.base ?? ['—', '—']),
    line('отношение лестницы', set.отношение ?? ['—', '—']),
    line('заголовок раздела', r.размер.h2 ?? ['—', '—']),
    line('поле карточки', pc ? [pc[0], pc[1]] : ['—', '—']),
    line('воздух между полками', r.воздух.band?.pair ?? ['—', '—']),
    line('воздух между разделами', ap ?? ['—', '—']),
    line('воздух к полю', pc && ap ? [`${(ap[0] / pc[0]).toFixed(1)} : 1`, `${(ap[1] / pc[1]).toFixed(1)} : 1`] : ['—', '—']),
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
  button.set,button.w,button.v{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid var(--edge);background:transparent;color:inherit;font-size:14.5px;cursor:pointer}
  button.set[aria-pressed="true"],button.w[aria-pressed="true"],button.v[aria-pressed="true"]{background:var(--mark);border-color:var(--mark);color:var(--paper);font-weight:600}
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
    <p class="say">Это станок. Вы называете ему <b>два кегля тела</b> — на телефоне и на большом экране — и <b>отношение лестницы</b>, а он считает всё остальное: размеры заголовков, ступени воздуха на клетке, поля, воздух между разделами. Между двумя ширинами всё <b>течёт</b>, без ступенек. Потяните ползунок — и смотрите на кадр: ничего не «переключается», всё едет плавно.</p>
    <p class="say">Кнопки наборов — готовые наборы формул на <b>одном и том же товаре</b>. Меняется только ритм: буквы, поля, воздух. «Тихий» — тихий люкс, как у Byredo и Cuyana по замеру: умеренный кегль, а «дорого» — воздухом. Ни одной картинки, ни одного цвета, ни одной строки вёрстки при этом не трогают.</p>
  </header>

  <div class="panel">
    <div class="line"><span class="lab">Кадр</span>
      <button class="v" type="button" data-view="shop" aria-pressed="true">Витрина</button>
      <button class="v" type="button" data-view="type" aria-pressed="false">Роли текста</button>
    </div>
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

  <p class="say">Формулы этих наборов лежат в одном файле — <code>styles/scale.json</code>. Команда <code>npm run scale</code> считает из них <code>styles/scale.css</code>, а <code>npm run check:scale</code> проверяет: ступени на клетке, лестница не сходится в одну точку, тело не мельче 16 на телефоне, воздух между разделами не меньше трёх полей карточки и растёт как у живых магазинов, рампа доходит до обоих своих концов, под пальцем зазор не меньше 16, и у каждой ступени есть проситель.</p>
</div>

<script>
const SETS = ${JSON.stringify(names)};
const VIEWS = { shop: ${JSON.stringify(PREVIEW)}, type: ${JSON.stringify(PREVIEW_TYPE)} };
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
  const crown = doc.querySelector('.pagehead'), was = doc.querySelector('.was');
  if (crown && was) {
    live.innerHTML = 'сейчас в кадре: текст <b>' + get(body, 'fontSize') + '</b> px · ' +
      'заголовок страницы <b>' + get(crown, 'fontSize') + '</b> px, между строками <b>' +
      get(crown, 'lineHeight') + '</b> px — было <b>' + get(was, 'lineHeight') + '</b>';
    return;
  }
  live.innerHTML = 'сейчас в кадре: текст <b>' + get(body, 'fontSize') + '</b> px · ' +
    'поле карточки <b>' + get(card, 'paddingTop') + '</b> px · ' +
    'воздух между разделами <b>' + get(page, 'rowGap') + '</b> px';
}
w.addEventListener('input', size);
for (const b of document.querySelectorAll('.w')) b.onclick = () => { w.value = b.dataset.w; size();
  for (const o of document.querySelectorAll('.w')) o.setAttribute('aria-pressed', String(o === b)); };
view.addEventListener('load', () => { paint(); read(); });
let shown = 'shop';
for (const b of document.querySelectorAll('.v')) b.onclick = () => {
  shown = b.dataset.view;
  for (const o of document.querySelectorAll('.v')) o.setAttribute('aria-pressed', String(o === b));
  view.srcdoc = VIEWS[shown];
};
view.srcdoc = VIEWS[shown];
size();
</script>
</body></html>`

const out = path.resolve(process.argv[2] ?? 'scale-stand.html')
writeFileSync(out, html)
console.log(`Стенд собран: ${out}`)
console.log(`Наборов на стенде: ${names.length} · ${names.join(', ')}`)
