/*
 * Стенд раскладки: коробка страницы на ползунке ширины, три шва реестра и
 * двенадцать примитивов — каждый живой, в коробке, которую тянут за угол.
 *
 * Зачем он: раскладку словами не выбирают и словами не проверяют. «Ряд
 * складывается в столбик, когда КОНТЕЙНЕРУ тесно» — это предложение ничего
 * не показывает, пока контейнер не потянули рукой и не увидели, на какой
 * ширине он сложился (CLAUDE.md, «Работа показывается отрисованной» и
 * «Выбор показывается глазами, а не списком»).
 *
 *   node tools/layout-stand.mjs [куда.html]
 *
 * Собран ИЗ ВЫПУЩЕННОГО, как и стенд органов: `styles/palette.css`,
 * `styles/scale.css`, `styles/tokens.css` и `styles/primitives.module.css`
 * вставлены в страницу как есть. Примитивы — модуль, но имена классов у них
 * обычные (`.stack`, `.grid`, `.frame`), и вне сборщика мешает ровно одна
 * строка — `composes`, которой в простом CSS нет; она снимается, остальное
 * идёт дословно. Нарисовать стенд может только то, что на сайте и стоит.
 *
 * Показывает три вещи, и каждая — своим способом:
 *   · ШВЫ — линейкой 320…1600 с отметкой на каждом шве реестра и ширинами
 *     свипа мелкими штрихами; ползунок ведёт макет страницы, и на макете
 *     видно то, чего не видно в файле: край (`--gut`), линию типографики
 *     (`--page-gut`), холст (`--wrap`) и телефонное состояние, где линия
 *     одна и снизу встаёт полоса;
 *   · ПРИМИТИВЫ — двенадцать карточек, и в каждой демонстрация лежит в
 *     коробке с `resize: horizontal`. Складывается она по ширине СВОЕЙ
 *     коробки, а не окна (правило 6) — это и проверяется рукой;
 *   · ЧИСЛА — рядом с картинкой: пороги раскладки из `tools/thresholds.mjs`
 *     и холст с краем из первого набора `styles/scale.json`.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { SEAMS } from './kit-config.mjs'
import { LAYOUT } from './thresholds.mjs'
import { sweepWidths } from './seams.mjs'
import { resolve } from './scale.mjs'

const read = (p) => (existsSync(path.resolve(p)) ? readFileSync(path.resolve(p), 'utf8') : '')

const scaleCss = read('styles/scale.css')
if (!scaleCss) {
  console.error('✗ Нет styles/scale.css — показывать нечего.')
  console.error('    Сначала выпустите шкалы: npm run scale')
  process.exit(1)
}
const primRaw = read('styles/primitives.module.css')
if (!primRaw) {
  console.error('✗ Нет styles/primitives.module.css — двенадцати примитивов в проекте ещё нет.')
  process.exit(1)
}
const paletteCss = read('styles/palette.css')
const tokensCss = read('styles/tokens.css')

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
const tokens = decls(tokensCss, /(--head-pad|--head-inset|--wrap)\s*:\s*([^;}]+)/g)

/** `var(--x)` разворачивается до числа: край на телефоне объявлен ссылкой
 *  на ступень ритма, а не своим числом, и ссылку надо пройти. */
const flat = (value, depth = 0) => {
  if (!value || depth > 4) return value
  const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(String(value).trim())
  return m && emitted.has(m[1]) ? flat(emitted.get(m[1]), depth + 1) : value
}

/** Рампа выпущенной ступени разобранная: `clamp(12px, -5.23px + 3.08vw,
 *  28px)` → {min, base, slope, max}. Постоянное число — рампа без наклона:
 *  считать её потом можно тем же выражением. */
const ramp = (value) => {
  const v = flat(value)
  if (!v) return null
  const c = /clamp\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\+\s*(-?[\d.]+)vw\s*,\s*(-?[\d.]+)px\s*\)/.exec(v)
  if (c) return { min: +c[1], base: +c[2], slope: +c[3], max: +c[4] }
  const p = /^(-?[\d.]+)px$/.exec(String(v).trim())
  return p ? { min: +p[1], base: +p[1], slope: 0, max: +p[1] } : null
}

/* Телефонный шов читается из tokens.css, а не назначается числом: там
   записано РЕШЕНИЕ «на телефоне линия одна», и ширину ему назначил тот
   файл. Вместе со швом читается и поле шапки, которое на нём сжимается. */
const phoneSeam = (() => {
  const m = /@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)\s*\{\s*:root\s*\{\s*--page-gut\s*:\s*var\(\s*--gut\s*\)/.exec(tokensCss)
  return m ? Number(m[1]) : null
})()
const phonePad = (() => {
  const m = /@media\s*\(\s*max-width\s*:\s*\d+px\s*\)\s*\{\s*:root\s*\{\s*--head-pad\s*:\s*([^;}]+)/.exec(tokensCss)
  return m ? m[1].trim() : null
})()

const BOX = {
  gut: ramp(emitted.get('--gut')),
  wrap: ramp(tokens.get('--wrap') ?? emitted.get('--wrap')),
  headPad: ramp(tokens.get('--head-pad')),
  headInset: ramp(tokens.get('--head-inset')),
  phonePad: ramp(phonePad),
  phone: phoneSeam,
}

/* Потолок кадра — из самого примитива, а не из порога рядом: на странице
   работает то, что написано в CSS, и показывать надо его. */
const frameCap = (() => {
  const m = /max-block-size\s*:\s*var\(\s*--frame-cap\s*,\s*([\d.]+)svh\s*\)/.exec(primCss)
  return m ? Number(m[1]) : null
})()

/** Ручка примитива, как она объявлена в файле: `--cols: 3` → «3». */
const knob = (name) => {
  const m = new RegExp(`${name}\\s*:\\s*([^;}]+)`).exec(primCss)
  return m ? m[1].trim() : '—'
}
const GRID = { cols: knob('--cols'), cellMin: knob('--cell-min'), colsMin: knob('--cols-min') }

/* Холст и край — из набора, а не из CSS: в CSS они уже посчитаны, а
   заказчику нужно видеть, из каких ступеней (И227). */
let sets = {}
try { sets = JSON.parse(read('styles/scale.json') || '{}') } catch { sets = {} }
const setName = Object.keys(sets)[0] ?? null
let born = null
try { born = setName ? resolve(sets[setName]) : null } catch { born = null }

/** Текст реестра идёт на страницу СЛОВО В СЛОВО: стенд его не пересказывает
 *  (CLAUDE.md, «Опираясь на правило, приведи его текст, а не пересказ»).
 *  Меняется только одежда: обратные кавычки реестра — это `<code>`. */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const tick = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>')

const SWEEP = sweepWidths(LAYOUT, SEAMS)
const [W0, W1] = LAYOUT.sweep
const pct = (w) => ((w - W0) / (W1 - W0)) * 100

/* ── линейка швов ─────────────────────────────────────────────────────────
   Штрих на каждой ширине свипа; шов и пиксель над ним — толще, сложенные
   внутренние экраны — своим цветом: ломается всегда именно там. */
const seamAt = new Set(SEAMS.flatMap((s) => [s.at, s.at + 1]))
const foldAt = new Set(LAYOUT.extra ?? [])
const ticks = SWEEP.map((w) => {
  const kind = seamAt.has(w) ? 'seam' : foldAt.has(w) ? 'fold' : 'grid'
  return `<i class="s-tick" data-kind="${kind}" style="inset-inline-start:${pct(w).toFixed(3)}%" title="${w}px"></i>`
}).join('')

const seamMarks = SEAMS.map((s) => `
      <b class="s-seam" style="inset-inline-start:${pct(s.at).toFixed(3)}%"></b>
      <span class="s-seamLab" style="inset-inline-start:${pct(s.at).toFixed(3)}%">${esc(s.name)}<br>${s.at}</span>`).join('')

/* Кнопки «встать точно» — не набраны рукой: переток, каждый шов и пиксель
   над ним, сложенные экраны и верх полосы. Ровно те ширины, на которых
   ломается, и они же стоят в свипе. */
const JUMPS = [LAYOUT.reflow, ...SEAMS.flatMap((s) => [s.at, s.at + 1]), ...(LAYOUT.extra ?? []), W1]
  .filter((w, i, all) => w >= W0 && w <= W1 && all.indexOf(w) === i)
  .sort((a, b) => a - b)
  .map((w) => `<button class="s-btn" type="button" data-w="${w}">${w}</button>`).join('')

const seamCards = SEAMS.map((s) => `
    <article class="s-seamCard" data-at="${s.at}" data-on="false">
      <p class="s-nm"><span class="s-dot"></span>${esc(s.name)} · <code>${s.at}</code></p>
      <p class="s-say">${tick(s.turns)}</p>
    </article>`).join('')

/* ── двенадцать примитивов ────────────────────────────────────────────────
   Демонстрация у каждого лежит в коробке с `resize: horizontal`: раскладку
   решает ширина КОРОБКИ, и тянут её рукой. Окно про эту ширину не знает
   ничего — в том и правило (запрет 6). */
const chips = (n, from = 1) => Array.from({ length: n }, (_, i) => `<span class="chip">фишка ${i + from}</span>`).join('')
const cells = (n, cls = 's-cell') => Array.from({ length: n }, (_, i) =>
  `<div class="${cls}"><div class="s-shot"></div><b>Товар ${i + 1}</b><span class="s-say">10 ml · 1000 mg</span></div>`).join('')

const SHOT = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" role="img">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="#2d5f57"/><stop offset=".55" stop-color="#7d8f4a"/>' +
  '<stop offset="1" stop-color="#c9a227"/></linearGradient></defs>' +
  '<rect width="960" height="720" fill="url(#g)"/>' +
  '<circle cx="330" cy="250" r="140" fill="#ffffff" fill-opacity=".14"/>' +
  '<rect x="520" y="420" width="330" height="210" rx="26" fill="#000000" fill-opacity=".16"/></svg>')}`

const PRIMS = [
  {
    key: 'stack', what: 'столбик с одним ритмом',
    say: 'Отступ ставится МЕЖДУ соседями (<code>* + *</code>), а не каждому: первый не тащит за собой чужой воздух, когда его переставят выше. Ручка — <code>--stack</code>.',
    demo: `<div class="stack"><p>Первый абзац столбика.</p><p>Второй: воздух между ними — <code>--air-block</code>.</p><p>Третий. Сверху у первого не остаётся ничего.</p></div>`,
  },
  {
    key: 'cluster', what: 'строка, которая переносится',
    say: 'Перенос здесь не аварийный режим, а обычная работа: заранее неизвестно ни сколько элементов положат, ни какой длины будут слова. Ручка — <code>--cluster</code>.',
    demo: `<div class="cluster">${chips(6)}</div>`,
  },
  {
    key: 'switcher', what: 'две колонки, становящиеся одной без медиазапроса',
    say: 'Пока коробка уже <code>--switch-at</code>, каждый ребёнок забирает строку; стала шире — делят ряд. Сравнивается ширина РОДИТЕЛЯ, а не окна.',
    demo: `<div class="switcher" style="--switch-at:360px"><div class="s-pane">Колонка A</div><div class="s-pane">Колонка B</div></div>`,
  },
  {
    key: 'rail', what: 'полоса, уходящая в прокрутку',
    say: 'На телефоне ряд из восьми карточек либо переносится в четыре строки, либо едет; едет — честнее: сохраняет порядок и не съедает первый экран. Прилипание <code>proximity</code>.',
    demo: `<div class="rail">${cells(8, 's-cell s-cellFix')}</div>`,
  },
  {
    key: 'prose', what: 'бегущий текст',
    say: 'Потолка ширины у него НЕТ — правило меры снято заказчиком. Текст занимает свою колонку; примитив оставляет за собой только набор (<code>text-wrap: pretty</code>).',
    demo: `<div class="prose"><p>Конопляното масло се извлича от цвета на растението и се смесва с носещо масло. Потяните коробку за угол — строка меняет длину, а набор остаётся тем же.</p></div>`,
  },
  {
    key: 'lede', what: 'вводная пара «текст и кадр»',
    say: 'Тот же механизм, что у <code>switcher</code>, но с наклоном: колонка текста шире колонки кадра на <code>--lede-bias</code>. Порог — <code>--lede-at</code>, и сравнивается он с шириной ряда.',
    demo: `<div class="lede" style="--lede-at:420px;--lede-air:var(--air-group) var(--air-group)"><div class="ledeText"><h1>Заглавие на реда</h1><p>Абзац под ним берёт роль <code>intro</code> и меру <code>--measure-lede</code>.</p></div><div class="s-photo"></div></div>`,
  },
  {
    key: 'pinned', what: 'приклеенная колонка с встроенным потолком',
    say: 'Потолок от высоты окна ВСТРОЕН (запрет 9): взять примитив и забыть его нельзя. Бюджет высоты — <code>--pin-fit</code>, и он считается от <code>100dvh</code> минус отступ от верха и воздух снизу. Здесь колонка стоит <code>--pin-pos: static</code> — ехать ей не вдоль чего, и прокрутка страницы для показа не нужна; потолок при этом остаётся, и он в числе рядом.',
    demo: `<div class="s-pinDemo"><div class="pinned s-pinCol"><b>Сводка заказа</b><p class="s-say">Едет рядом с содержимым, пока то прокручивается.</p></div><div class="s-pinText"><p>Сосед, вдоль которого колонка едет.</p><p>Низ приклеенного приходит только с его концом — потому потолок и обязателен.</p></div></div>`,
    read: 'потолок',
  },
  {
    key: 'sidebar', what: 'узкая колонка рядом с гибкой',
    say: 'Отличие от <code>switcher</code>: там колонки равные и обе гибкие, здесь одна держит свою ширину (<code>--side-w</code>), а вторая забирает остаток и просит себе не меньше <code>--side-at</code> ряда.',
    demo: `<div class="sidebar" style="--side-w:150px;--side-at:56%;--side-gap:var(--gap-grid)"><aside class="aside s-pane">Фильтры</aside><div class="s-pane">Полка товаров</div></div>`,
  },
  {
    key: 'grid', what: 'полка, у которой число колонок вычисляется',
    say: `Дорожка берёт бо́льшее из пола ячейки (<code>--cell-min</code> = ${GRID.cellMin}) и доли ряда на <code>--cols</code> = ${GRID.cols}, но не больше доли на <code>--cols-min</code> = ${GRID.colsMin}. Лестницу «4 → 3 → 2» никто не назначал — она следствие двух чисел, и ниже ${GRID.colsMin} колонок не бывает.`,
    demo: `<div class="grid s-gridDemo" style="--cell-min:120px">${cells(7)}</div>`,
    read: 'колонок',
  },
  {
    key: 'sheet', what: 'предмет, у которого есть свой пол',
    say: 'Поле у листа СВОЁ и не бывает нулём (<code>--pad-sheet</code>), линия страницы внутри него становится его полем, угол тот же, что у шапки. Лист внутри листа получает поле карточки — ступенью ниже.',
    demo: `<div class="s-deck"><div class="sheet"><b>Лист на палубе</b><p class="s-say">Пол листа красит страница, а не раскладка. Внутри — второй лист, и поле у него уже карточное.</p><div class="sheet s-inner"><span class="s-say">Лист в листе</span></div></div></div>`,
  },
  {
    key: 'menu', what: 'бумага того, что всплывает поверх страницы',
    say: 'Только одежда: краска (<code>--menu-bg</code>, теплее листа), угол и тень. Где именно висит — решает место, а не примитив. Строка канала считает всё внутри от своего роста <code>--chan-h</code>.',
    demo: `<div class="menu menuChan s-menuDemo"><a class="chan" href="#л"><span class="chanMark">☎</span><span><b>Телефон</b><small>+359 00 000 000</small></span></a><a class="chan" href="#л"><span class="chanMark">✉</span><span><b>Поща</b><small>shop@example.bg</small></span></a><a class="chan" href="#л"><span class="chanMark">✆</span><span><b>Viber</b><small>напишете ни</small></span></a></div>`,
  },
  {
    key: 'frame', what: 'пропорция с потолком',
    say: `<code>aspect-ratio</code> — пожелание, <code>max-block-size</code> — правило (запрет 4). Потолок здесь ${frameCap === null ? 'объявлен в самом примитиве' : `<code>${frameCap}svh</code>`} — доля МАЛОГО окна: <code>dvh</code> менялся бы при прокрутке и двигал раскладку. Место занято до загрузки снимка, снимок кадрируется внутри.`,
    demo: `<div class="frame s-frameDemo"><img src="${SHOT}" alt=""></div>
      <div class="cluster s-ratios">${['1 / 1', '4 / 3', '3 / 2', '16 / 9'].map((r, i) =>
        `<button type="button" class="s-btn" data-frame="${r}" aria-pressed="${i === 1}">${r}</button>`).join('')}</div>`,
    read: 'высота кадра',
  },
]

const primCards = PRIMS.map((p) => `
    <article class="s-card">
      <p class="s-nm"><code>.${p.key}</code> — ${p.what}</p>
      <p class="s-say">${p.say}</p>
      <div class="s-box" data-key="${p.key}">${p.demo}</div>
      <p class="s-read">коробка <b data-w>—</b> px${p.read ? ` · ${p.read} <b data-x>—</b>` : ''}</p>
    </article>`).join('')

/* ── таблица чисел: она идёт РЯДОМ с картинкой, а не вместо неё ─────────── */
const fact = (what, value, why) => `<tr><td>${what}</td><td>${value}</td><td>${why}</td></tr>`
const factRows = [
  fact('швов не больше', `<code>${LAYOUT.seams}</code>`, 'M3 держит пять классов окна, Carbon пять; здесь три, и каждый с именем и причиной'),
  fact('переток', `<code>${LAYOUT.reflow}</code> px`, 'WCAG 2.2, 1.4.10: 320 — это 1280 при зуме 400 %'),
  fact('полоса свипа', `<code>${LAYOUT.sweep[0]}…${LAYOUT.sweep[1]}</code> px`, 'M3 extra-large от 1600, Carbon max 1584'),
  fact('шаг свипа', `<code>${LAYOUT.step}</code> px`, 'сетка ширин; вдобавок каждый шов и пиксель над ним'),
  fact('сложенные экраны', `<code>${(LAYOUT.extra ?? []).join(' · ')}</code>`, 'Galaxy Z Fold 5 и Pixel 9 Pro Fold: раскладка там ровно на шве'),
  fact('низкое окно', `<code>${LAYOUT.shortWindow}</code> px`, 'ноутбук 1366×768 минус полоса браузера'),
  fact('ступенька размера', `от <code>${LAYOUT.jump}</code> px`, 'между соседними ширинами свипа: вдвое круче самой крутой кривой — уже не течение'),
  fact('обрезка кадра', `<code>${Math.round(LAYOUT.crop * 100)} %</code>`, 'кадр, оставляющий меньше этой доли снимка, — лента, а не кадр'),
  fact('потолок кадра', `<code>${LAYOUT.frameCap} %</code> малого окна`, `в примитиве выпущено как ${frameCap === null ? '— (не найдено)' : `<code>${frameCap}svh</code>`}`),
  fact('рост края', `×<code>${LAYOUT.edgeGrowth[0]}…${LAYOUT.edgeGrowth[1]}</code>`, 'от телефона к макету; люкс держит край постоянным или ×1.75'),
  born?.холст !== undefined
    ? fact('холст <code>--wrap</code>', `<code>${born.холст}</code> px`, `из набора «${setName}», ключ «холст»`)
    : fact('холст <code>--wrap</code>', '—', 'в первом наборе styles/scale.json ключа «холст» нет'),
  born?.край
    ? fact('край <code>--gut</code>', `<code>${born.край.pair[0]} → ${born.край.pair[1]}</code> px`, `ступени ритма ${born.край.steps[0]} → ${born.край.steps[1]} набора «${setName}»`)
    : fact('край <code>--gut</code>', '—', 'в первом наборе styles/scale.json ключа «край» нет'),
].join('\n')

const missing = []
if (!paletteCss) missing.push('styles/palette.css')
if (!tokensCss) missing.push('styles/tokens.css')
const missingLine = missing.length
  ? `<p class="s-say s-warn">Нет ${missing.map((f) => `<code>${f}</code>`).join(', ')} — часть красок и ролей на стенде не разрешится. Это не поломка стенда: он показывает ровно то, что выпущено.</p>`
  : ''

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Стенд раскладки</title>
<style>
${paletteCss}
${tokensCss}
${scaleCss}
${primCss}
</style>
<style>
/* Своя одежда стенда. Ни одного размера и ни одного поля числом: всё —
   роли из вставленного выше (запреты 1 и 2). Краска — тоже роль. */
*{box-sizing:border-box;margin:0}
body{background:var(--page);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  font-size:var(--fs-base);line-height:var(--body-lead);
  padding:var(--air-group) var(--pad-card) var(--air-page)}
.s-col{max-inline-size:1180px;margin-inline:auto;display:flex;flex-direction:column;gap:var(--air-band)}
.s-sec{display:flex;flex-direction:column;gap:var(--air-group)}
h1{font-size:var(--fs-h2);line-height:var(--h2-lead);letter-spacing:var(--h2-track);font-weight:var(--h2-weight)}
h2{font-size:var(--fs-h3);line-height:var(--h3-lead);letter-spacing:var(--h3-track);font-weight:var(--h3-weight)}
.s-say{max-inline-size:var(--measure);color:var(--ink-soft);font-size:var(--fs-sm);line-height:var(--body-lead)}
.s-say b{color:var(--ink);font-weight:600}
.s-warn{color:var(--bad)}
.s-nm{font-size:var(--fs-base);font-weight:600;display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:var(--fs-xs);
  background:var(--pop-tint);color:var(--pop-ink);border-radius:var(--r-xs);padding:0 var(--sp-1)}
.s-panel{background:var(--plate);border:1px solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--gap-row)}
.s-line{display:flex;flex-wrap:wrap;align-items:center;gap:var(--gap-row)}
.s-lab{font-size:var(--fs-xs);color:var(--ink-soft);min-inline-size:8ch}
.s-now{font-variant-numeric:tabular-nums;font-size:var(--fs-sm);color:var(--ink-soft)}
.s-now b{color:var(--ink);font-weight:600}
input[type=range]{flex:1;min-inline-size:200px;accent-color:var(--pop);block-size:var(--ctrl-h)}
.s-btn{block-size:var(--ctrl-h-sm);padding-inline:calc(var(--ctrl-h-sm) * .4);
  border:1px solid var(--rule);border-radius:var(--r-ctrl);background:transparent;color:inherit;
  font:inherit;font-size:var(--ctrl-fs-xs);cursor:pointer}
.s-btn[aria-pressed="true"]{background:var(--pop);border-color:var(--pop);color:var(--on-pop);font-weight:600}
:focus-visible{outline:2px solid var(--pop);outline-offset:2px}

/* ── линейка швов ─────────────────────────────────────────────────────── */
.s-ruler{position:relative;block-size:var(--sp-11);margin-block:var(--air-group) var(--sp-6)}
.s-ruler::after{content:'';position:absolute;inset-inline:0;inset-block-end:0;block-size:1px;background:var(--rule)}
.s-tick{position:absolute;inset-block-end:0;inline-size:1px;block-size:var(--sp-3);background:var(--ink-soft);opacity:.45}
.s-tick[data-kind="seam"]{block-size:var(--sp-6);background:var(--pop);opacity:1}
.s-tick[data-kind="fold"]{block-size:var(--sp-5);background:var(--warn);opacity:1}
.s-seam{position:absolute;inset-block:0;inline-size:0;border-inline-start:2px dashed var(--pop)}
.s-seamLab{position:absolute;inset-block-start:0;translate:-50% 0;text-align:center;white-space:nowrap;
  font-size:var(--fs-xs);color:var(--ink-soft);line-height:var(--note-lead)}
.s-head0,.s-head1{position:absolute;inset-block-end:calc(var(--sp-3) * -1);font-size:var(--fs-xs);color:var(--ink-soft)}
.s-head0{inset-inline-start:0}.s-head1{inset-inline-end:0}
.s-cursor{position:absolute;inset-block:0;inline-size:0;border-inline-start:2px solid var(--ink)}
.s-seams{display:flex;flex-wrap:wrap;gap:var(--gap-grid)}
.s-seamCard{flex:1 1 240px;background:var(--plate);border:1px solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-inner);display:flex;flex-direction:column;gap:var(--sp-2)}
.s-seamCard[data-on="true"]{border-color:var(--pop);background:var(--pop-tint)}
.s-dot{inline-size:var(--sp-2);block-size:var(--sp-2);border-radius:var(--r-ctrl);background:var(--rule);flex:none}
.s-seamCard[data-on="true"] .s-dot{background:var(--pop)}

/* ── макет страницы на ползунке ───────────────────────────────────────── */
/* Сцена — полоса по замыслу: макет шире окна телефона едет вбок внутри неё,
   а не тащит страницу (min-inline-size:0 — иначе flex/grid-ячейка растёт до
   min-content макета и страница переполняется на 360). */
/* Таблица фактов — лента по замыслу: таблица данных не переносится (WCAG
   1.4.10 исключает её из перетока), и на 360 она едет вбок внутри панели. */
.s-scroll{overflow-x:auto;overflow-y:hidden}
.s-stage{overflow-x:auto;overflow-y:hidden;min-inline-size:0;max-inline-size:100%;border:1px solid var(--rule);border-radius:var(--r-card);
  background:var(--page-deck);padding:var(--pad-inner)}
.s-mock{position:relative;inline-size:390px;margin-inline:auto;overflow:hidden;
  background:var(--page);border:1px solid var(--rule);border-radius:var(--r-xs);
  padding-block:var(--pad-inner);display:flex;flex-direction:column;gap:var(--gap-row)}
/* Внешний край страницы — то место, где страница кончается как предмет. */
.s-mock::before,.s-mock::after{content:'';position:absolute;inset-block:0;inline-size:var(--gut);
  background:var(--pop-tint);pointer-events:none}
.s-mock::before{inset-inline-start:0}
.s-mock::after{inset-inline-end:0}
/* Внутренний край — левая линия ТИПОГРАФИКИ. */
.s-mockLine{position:absolute;inset-block:0;inline-size:0;pointer-events:none}
.s-mockLine[data-side="a"]{inset-inline-start:var(--page-gut);border-inline-start:1px dashed var(--pop)}
.s-mockLine[data-side="b"]{inset-inline-end:var(--page-gut);border-inline-end:1px dashed var(--pop)}
.s-head{padding-inline:0;background:var(--surface);border-radius:var(--r-card);box-shadow:var(--sh-raised)}
.s-headRow{display:flex;align-items:center;justify-content:space-between;gap:var(--gap-row);
  min-block-size:var(--ctrl-h);padding-inline:var(--head-pad);border-radius:var(--r-card);
  background:var(--chrome-bg);color:var(--chrome-fg);font-size:var(--ctrl-fs-xs)}
.s-body{display:flex;flex-direction:column;gap:var(--gap-row);position:relative}
.s-dock{display:none}
.s-mock[data-phone="true"] .s-dock{display:flex;align-items:center;justify-content:space-around;
  min-block-size:var(--tab-h);border-radius:var(--r-card);background:var(--chrome-bg);color:var(--chrome-fg);
  font-size:var(--ctrl-fs-xs)}
.s-mockNote{font-size:var(--fs-xs);color:var(--ink-soft)}
.s-flag{display:none}
.s-mock[data-phone="true"] .s-flag{display:inline}

/* ── карточки примитивов ──────────────────────────────────────────────── */
.s-card{background:var(--plate);border:1px solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--gap-row);min-inline-size:0}
.s-box{resize:horizontal;overflow:auto;min-inline-size:240px;max-inline-size:100%;
  background:var(--surface);border:1px dashed var(--rule);border-radius:var(--r-xs);padding:var(--pad-inner)}
.s-read{font-size:var(--fs-xs);color:var(--ink-soft);font-variant-numeric:tabular-nums}
.s-read b{color:var(--ink)}
.s-pane{background:var(--plate-quiet);border-radius:var(--r-xs);padding:var(--pad-inner);font-size:var(--fs-sm)}
.s-cell{background:var(--plate-quiet);border-radius:var(--r-xs);padding:var(--pad-inner);
  display:flex;flex-direction:column;gap:var(--sp-2);font-size:var(--fs-xs);min-inline-size:0}
.s-cellFix{inline-size:150px}
.s-shot{aspect-ratio:4 / 3;max-block-size:120px;border-radius:var(--r-xs);
  background:linear-gradient(135deg, var(--pop-tint), var(--plate-3))}
.s-photo{aspect-ratio:4 / 3;max-block-size:40svh;border-radius:var(--r-card);
  background:linear-gradient(135deg, var(--pop), var(--sale-fill))}
.s-deck{background:var(--page-deck);border-radius:var(--r-card);padding:var(--pad-inner)}
.sheet{background:var(--plate)}
.s-inner{background:var(--plate-2);margin-block-start:var(--air-row)}
.s-menuDemo{max-inline-size:100%}
.s-frameDemo{border-radius:var(--r-card)}
.s-pinDemo{display:flex;gap:var(--gap-grid);align-items:flex-start}
.s-pinCol{--pin-pos:static;flex:0 0 40%;background:var(--plate-quiet);border-radius:var(--r-xs);padding:var(--pad-inner)}
.s-pinText{flex:1 1 auto;display:flex;flex-direction:column;gap:var(--sp-3);font-size:var(--fs-sm)}
.s-gridDemo .s-cell{font-size:var(--fs-xs)}

/* ── таблица фактов ───────────────────────────────────────────────────── */
table{border-collapse:collapse;inline-size:100%;font-size:var(--fs-sm)}
th,td{text-align:start;padding:var(--sp-2) var(--sp-3);border-block-end:1px solid var(--rule);vertical-align:top}
th{font-size:var(--fs-xs);color:var(--ink-soft);font-weight:500}
td:nth-child(2){font-variant-numeric:tabular-nums;white-space:nowrap}
td:nth-child(3){color:var(--ink-soft);font-size:var(--fs-xs)}
</style></head>
<body>
<div class="s-col">
  <header class="s-sec">
    <h1>Раскладка — швы, коробка страницы и двенадцать примитивов</h1>
    <p class="s-say">Здесь три вещи, и все три <b>отрисованы</b>. Сверху — линейка ширин со швами реестра и ползунок, который ведёт макет страницы: видно край, линию типографики, холст и телефонное состояние. Ниже — <b>двенадцать примитивов</b>, и каждый лежит в коробке, которую можно потянуть за правый нижний угол: складывается он по ширине СВОЕЙ коробки, а не окна. В самом низу — числа.</p>
    <p class="s-say">Ничего на этой странице <b>не набрано рукой</b>. Стенд вставляет в себя выпущенные <code>styles/palette.css</code>, <code>styles/scale.css</code>, <code>styles/tokens.css</code> и <code>styles/primitives.module.css</code> как есть, швы читает из реестра (<code>tools/seams.mjs</code>, у проекта — <code>kit.config.json</code>), пороги — из <code>tools/thresholds.mjs</code>, холст и край — из первого набора <code>styles/scale.json</code>.</p>
${missingLine}
  </header>

  <section class="s-sec">
    <h2>Швы</h2>
    <p class="s-say">Шов — это <b>решение</b>, а не число: ширина, на которой раскладка меняет СМЫСЛ. Их ${SEAMS.length}, и больше не будет: порог набора — <code>${LAYOUT.seams}</code>. Толстые отметки — сами швы и пиксель над ними (ступенька живёт на 820 / 821), жёлтые — сложенные внутренние экраны, тонкие — сетка свипа шагом <code>${LAYOUT.step}</code>. Всего ширин съёмки: <b>${SWEEP.length}</b>.</p>
    <div class="s-panel">
      <div class="s-ruler" id="ruler">
        ${ticks}
${seamMarks}
        <b class="s-cursor" id="cursor" style="inset-inline-start:${pct(390).toFixed(3)}%"></b>
        <span class="s-head0">${W0}</span><span class="s-head1">${W1}</span>
      </div>
      <div class="s-line"><span class="s-lab">ширина окна</span>
        <input id="w" type="range" min="${W0}" max="${W1}" step="1" value="390">
        <span class="s-now"><b id="wnow">390</b> px</span></div>
      <div class="s-line"><span class="s-lab">встать точно</span>${JUMPS}</div>
      <div class="s-line s-now" id="live"></div>
    </div>

    <div class="s-seams">${seamCards}</div>
    <p class="s-say">Шов горит, пока ширина <b>не больше</b> его: ровно так читает его <code>@media (max-width: N)</code> и ровно так кончается рампа шкалы. Что на нём меняется — строка из реестра, слово в слово; выдумать своё объяснение стенд не может.</p>

    <div class="s-stage">
      <div class="s-mock" id="mock" data-phone="false">
        <span class="s-mockLine" data-side="a"></span><span class="s-mockLine" data-side="b"></span>
        <div class="wrap s-head"><div class="s-headRow"><b>Магазин</b><span>меню · количка</span></div></div>
        <div class="wrap s-body">
          <p class="s-mockNote">Текст страницы встаёт на линию <code>--page-gut</code> — под слово шапки, а не под край белой карточки.</p>
          <div class="grid" style="--cell-min:90px;--cols:4;--cols-min:2;--grid-gap:var(--gap-row)">${cells(4)}</div>
          <p class="s-mockNote"><span class="s-flag">Телефон: линия одна (<code>--page-gut</code> = <code>--gut</code>), снизу встала полоса. </span>Залитые полосы по краям — <code>--gut</code>, пунктир — <code>--page-gut</code>.</p>
        </div>
        <div class="wrap s-dock"><span>Начало</span><span>Магазин</span><span>Количка</span></div>
      </div>
    </div>
    <p class="s-say">Ползунок меняет ширину <b>коробки страницы</b>, а не настоящего окна: <code>--gut</code>, <code>--page-gut</code> и поле шапки пересчитываются по выпущенным рампам для этой ширины и ставятся на макет. Остальные ступени шкалы внутри макета считаются от настоящего окна — и это честно показывает границу: что меняется по ширине коробки, то и есть раскладка.</p>
  </section>

  <section class="s-sec">
    <h2>Примитивы: ${PRIMS.length}</h2>
    <p class="s-say">Раскладку не пишут заново — её <b>берут</b> (запрет 7). Настраиваются примитивы переменными, а не новыми классами. Тяните коробку за правый нижний угол: рядом с ней — ширина коробки в пикселях, и складывается всё по ней.</p>
    <div class="grid" style="--cell-min:340px;--cols:2;--cols-min:1;--grid-gap:var(--gap-grid)">
${primCards}
    </div>
  </section>

  <section class="s-sec">
    <h2>Факты</h2>
    <div class="s-panel s-scroll">
      <table><thead><tr><th>что</th><th>сколько</th><th>откуда</th></tr></thead>
      <tbody>
${factRows}
      </tbody></table>
      <p class="s-say">Первые десять строк — из <code>tools/thresholds.mjs</code>, <code>LAYOUT</code>: это не настройка проекта, а закон набора. Две последние — из первого набора <code>styles/scale.json</code>${setName ? ` («${setName}»)` : ''}: холст и край выпускает строитель шкал, а не рука в <code>tokens.css</code>.</p>
    </div>
  </section>
</div>

<script>
var SEAMS = ${JSON.stringify(SEAMS.map((s) => ({ at: s.at, name: s.name })))};
var BOX = ${JSON.stringify(BOX)};
var W0 = ${W0}, W1 = ${W1};

var mock = document.getElementById('mock');
var slider = document.getElementById('w');
var wnow = document.getElementById('wnow');
var live = document.getElementById('live');
var cursor = document.getElementById('cursor');

/* Рампа считается тем же выражением, каким её считает браузер:
   clamp(низ, основание + наклон·vw, верх). Числа разобраны при сборке из
   выпущенного styles/scale.css — своих здесь нет. */
function ramp(r, w){
  if(!r) return 0;
  var v = r.base + r.slope * w / 100;
  return Math.round(Math.min(Math.max(v, r.min), r.max) * 100) / 100;
}
function pct(w){ return ((w - W0) / (W1 - W0)) * 100; }

function paint(){
  var w = Number(slider.value);
  var phone = BOX.phone !== null && w <= BOX.phone;
  var gut = ramp(BOX.gut, w);
  var headPad = phone ? ramp(BOX.phonePad, w) : ramp(BOX.headPad, w);
  var pageGut = phone ? gut : gut + ramp(BOX.headInset, w) + headPad;
  var wrap = BOX.wrap ? BOX.wrap.max : 0;
  var wrapW = Math.max(0, Math.min(wrap - gut * 2, w - gut * 2));

  mock.style.inlineSize = w + 'px';
  mock.style.setProperty('--gut', gut + 'px');
  mock.style.setProperty('--head-pad', headPad + 'px');
  mock.style.setProperty('--page-gut', pageGut + 'px');
  mock.style.setProperty('--page-line', Math.round((pageGut - gut) * 100) / 100 + 'px');
  mock.setAttribute('data-phone', String(phone));

  wnow.textContent = String(w);
  cursor.style.insetInlineStart = pct(w).toFixed(3) + '%';
  live.innerHTML = 'окно <b>' + w + '</b> px · край <code>--gut</code> <b>' + gut +
    '</b> · линия <code>--page-gut</code> <b>' + Math.round(pageGut * 100) / 100 +
    '</b> · коробка <code>.wrap</code> <b>' + Math.round(wrapW) + '</b> px' +
    (phone ? ' · <b>телефон: линия одна</b>' : '');

  var cards = document.querySelectorAll('.s-seamCard');
  for(var i = 0; i < cards.length; i++){
    cards[i].setAttribute('data-on', String(w <= Number(cards[i].getAttribute('data-at'))));
  }
}
slider.addEventListener('input', paint);
var jump = document.querySelectorAll('.s-btn[data-w]');
for(var j = 0; j < jump.length; j++){
  jump[j].addEventListener('click', function(e){
    slider.value = e.currentTarget.getAttribute('data-w');
    paint();
  });
}

/* Ширина коробки — не окна: примитив меряет свой контейнер, и читать надо
   то же самое, что читает он. */
function readout(card){
  var box = card.querySelector('.s-box');
  var w = card.querySelector('[data-w]');
  var x = card.querySelector('[data-x]');
  var key = box.getAttribute('data-key');
  /* Ширина СОДЕРЖИМОГО, а не коробки с полем: складывается примитив по
     тому, сколько места ему дали, а поле коробки — не его место. */
  var cs = getComputedStyle(box);
  w.textContent = String(Math.round(box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
  if(!x) return;
  if(key === 'grid'){
    var kids = box.querySelectorAll('.grid > *');
    if(kids.length){
      var top = kids[0].offsetTop, n = 0;
      for(var i = 0; i < kids.length; i++) if(kids[i].offsetTop === top) n++;
      x.textContent = String(n);
    }
  } else if(key === 'frame'){
    var f = box.querySelector('.frame');
    x.textContent = Math.round(f.getBoundingClientRect().height) + ' px';
  } else if(key === 'pinned'){
    var p = box.querySelector('.pinned');
    x.textContent = getComputedStyle(p).maxBlockSize;
  }
}
var cards = document.querySelectorAll('.s-card');
for(var c = 0; c < cards.length; c++){
  (function(card){
    readout(card);
    if(typeof ResizeObserver === 'function'){
      new ResizeObserver(function(){ readout(card); }).observe(card.querySelector('.s-box'));
    }
  })(cards[c]);
}

/* Пропорция кадра — ручка примитива, а не новый класс: меняется --frame,
   потолок остаётся тем, который встроен. */
var ratios = document.querySelectorAll('.s-btn[data-frame]');
for(var r = 0; r < ratios.length; r++){
  ratios[r].addEventListener('click', function(e){
    var btn = e.currentTarget;
    var card = btn.closest('.s-card');
    var frame = card.querySelector('.frame');
    frame.style.setProperty('--frame', btn.getAttribute('data-frame'));
    for(var k = 0; k < ratios.length; k++) ratios[k].setAttribute('aria-pressed', String(ratios[k] === btn));
    requestAnimationFrame(function(){ readout(card); });
  });
}

paint();
</script>
</body></html>`

const out = path.resolve(process.argv[2] ?? 'layout-stand.html')
writeFileSync(out, html)

console.log(`Стенд раскладки собран: ${out}`)
console.log(`  примитивов: ${PRIMS.length} · швов: ${SEAMS.length} (${SEAMS.map((s) => s.at).join(', ')}) · ширин свипа: ${SWEEP.length}`)
console.log(`  коробка страницы: --wrap ${BOX.wrap ? `${BOX.wrap.max}px` : '—'} · --gut ${BOX.gut ? `${BOX.gut.min}…${BOX.gut.max}px` : '—'} · телефонный шов ${BOX.phone ?? '—'}`)
console.log(`  вес страницы: ${(Buffer.byteLength(html) / 1024).toFixed(0)} КБ`)
