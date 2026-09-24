/*
 * Стенд характера: четыре витрины на одном и том же товаре — «Тихий люкс»,
 * «Ровный магазин», «Аптечная ясность», «Плотная полка».
 *
 * Зачем он: характер витрины словами не выбирают. «Минимализм-люкс» и
 * «аптечная ясность» — это два разных набора ритма, два разных угла, две
 * разные кнопки и разное число подписей на карточке, и разница между ними
 * становится выбором ровно в ту секунду, когда обе полки стоят рядом на
 * одном и том же товаре (CLAUDE.md, «Правила работы»: «Всё, что заказчик
 * выбирает видом — цвет, шрифт, раскладка, форма кнопки, снимок, — приходит
 * к нему ОТРИСОВАННЫМ: страницей, на которой это видно рядом и
 * переключается»). В `docs/decisions.md` характер сегодня не назван, и шаг 0
 * основания из-за этого не закрыт.
 *
 *   node tools/mood-stand.mjs [куда.html]
 *
 * ПОРЯДОК — что за чем делает заказчик, открыв страницу:
 *
 *   1. смотрит на четыре характера, стоящие РЯДОМ: у каждого своё имя, своя
 *      строка словами и своя живая карточка того же самого масла;
 *   2. читает под каждым строку «во что это переводится»: имя набора ритма,
 *      четыре угла в пикселях, роль тени, поле карточки и воздух между
 *      разделами. Числа там живые — сняты со страницы, а не подписаны;
 *   3. жмёт характер на пульте и смотрит ПОЛНЫЙ разворот: шапка раздела,
 *      полка из трёх карточек, крупная карточка и всплывающее — одно и то
 *      же содержимое, переложенное на выбранный характер;
 *   4. переключает тему: характер не про светлое и тёмное, и это видно;
 *   5. и только в самом низу — таблица: что именно каждый характер меняет и
 *      откуда взяты его числа.
 *
 * ЧТО ВНУТРИ. Собран ИЗ ВЫПУЩЕННОГО, как стенды формы и раскладки:
 * `styles/palette.css`, `styles/scale.css`, `styles/tokens.css` и
 * `styles/primitives.module.css` вставлены в страницу как есть (у модуля
 * снимается одна строка — `composes`, которой в простом CSS нет), лист
 * (`[data-plate]`) взят из `styles/base.css` тем же блоком. Характер
 * переключается ровно теми механизмами, что в наборе УЖЕ есть: атрибут
 * `data-scale="Имя набора"` на обёртке (выпущенный `styles/scale.css` везёт
 * все наборы под `[data-scale]`) плюс локальные переобъявления РОЛЕЙ на той
 * же обёртке — `--r-card: var(--r-xs)`, `--m-sh: var(--sh-lift)`,
 * `--frame`, — а не новые числа из головы. Имена наборов и их радиусы
 * читаются из `styles/scale.json`. Нарисовать стенд может только то, что на
 * сайте и стоит.
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
const primRaw = read('styles/primitives.module.css')
if (!primRaw) {
  console.error('✗ Нет styles/primitives.module.css — карточки, полки и кадра в проекте ещё нет.')
  process.exit(1)
}
let sets = {}
try { sets = JSON.parse(read('styles/scale.json') || '{}') } catch { sets = {} }
const names = Object.keys(sets)
if (!names.length) {
  console.error('✗ Нет styles/scale.json — наборов ритма, из которых сложены характеры, ещё нет.')
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

/* Лист объявлен в `styles/base.css`: `[data-plate]` — контракт страницы, а
   не раскладка. Стенд берёт ЭТОТ блок дословно, а не переписывает его
   своими руками: крупная карточка здесь и есть лист, и в тёмной теме её
   чернила должны прийти оттуда же, откуда приходят на сайте. Приём тот же,
   каким стенд формы забирает свой блок. */
const plateAt = baseCss.search(/^\[data-plate\]\s*\{/m)
const plateRule = plateAt < 0
  ? '/* в styles/base.css нет блока [data-plate] — лист покажет роли пола */'
  : `[data-plate]{${blockAt(baseCss, plateAt)}}`

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const num = (v) => (v === null || v === undefined ? '—' : String(v))

/* ── четыре характера ─────────────────────────────────────────────────────
 *
 * Характер — НАЗВАННЫЙ НАБОР уже существующих настроек, а не новая одежда:
 * набор ритма из `styles/scale.json` плюс переобъявление ролей на обёртке.
 * Ни одного числа здесь нет и быть не может — только имена ролей, которые
 * выпускает строитель шкал. Поэтому характер нельзя «почти выбрать»: он
 * целиком ложится в файл набора одной записью.
 *
 * `vars` — то, что ставится на обёртку `[data-mood]`. Оно сильнее
 * `[data-scale]` не весом (оба 0,1,0), а порядком: этот блок стоит НИЖЕ
 * вставленного `styles/scale.css`.
 *
 * `facts` — сколько ярусов подписей показано на карточке. Разметка у всех
 * четырёх одна и та же, лишние ярусы гасит CSS: содержимое одно, характер
 * решает, что из него вынесено на карточку.
 */
const MOODS = [
  {
    key: 'lux',
    name: 'Тихий люкс',
    set: 'Тихий',
    facts: 1,
    sh: 'не берётся',
    shWhy: 'роль --sh-overlay остаётся только у всплывающего',
    say: 'Витрина молчит. Воздуха между разделами больше всего в наборе, поле карточки — полтора тела, углы острые, тени нет ни у карточки, ни у листа, снимок высокий и занимает больше половины карточки. Кнопка не кричит: заливка органа и обычные чернила. Подпись под товаром одна.',
    turns: [
      'набор ритма <b>«Тихий»</b> — воздух на ступень выше нынешнего, поле карточки полтора тела',
      'углы острые: <code>--r-card: var(--r-xs)</code> и <code>--r-ctrl: var(--r-xs)</code> — карточка и орган берут самую мелкую ступень набора',
      'тень карточки <b>не берётся</b>; <code>--sh-overlay</code> носит только всплывающее',
      'снимок крупный: <code>--frame: 3 / 4</code> — кадр в портрет',
      'кнопка тихая: <code>--ctrl</code> заливкой, <code>--ink</code> чернилами, угол <code>--r-ctrl</code>',
      'кромка карточки — волосок <code>--line-w</code> краской <code>--rule</code>: отделяет то, что не отделено тенью',
    ],
    vars: {
      '--r-card': 'var(--r-xs)',
      '--r-ctrl': 'var(--r-xs)',
      '--m-sh': 'none',
      '--m-edge': 'var(--rule)',
      '--m-btn-bg': 'var(--ctrl)',
      '--m-btn-fg': 'var(--ink)',
      '--m-btn-edge': 'var(--rule)',
      '--m-btn-r': 'var(--r-ctrl)',
      '--m-frame': '3 / 4',
      '--m-cols': '3',
      '--m-cell': '22ch',
    },
  },
  {
    key: 'shelf',
    name: 'Ровный магазин',
    set: 'Нынешний',
    facts: 2,
    sh: '--sh-raised',
    shWhy: 'предмет над полом в покое: карточка, лист, шапка',
    say: 'Нормальный магазин без характера напоказ. Набор ритма нынешний, углы средние — как их выпустил строитель, — карточка стоит над полом на тени покоя, кнопка громкая и круглая, подписей столько, сколько обычно нужно покупателю: спектр и объём.',
    turns: [
      'набор ритма <b>«Нынешний»</b> — ничего не переобъявлено, всё как выпустил строитель',
      'углы средние: <code>--r-card</code> и <code>--r-ctrl</code> прямо из набора',
      'тень карточки <code>--sh-raised</code> — предмет над полом в покое',
      'снимок <code>--frame: 4 / 3</code>',
      'кнопка громкая: <code>--pop</code> заливкой, <code>--on-pop</code> чернилами, полный круг <code>--r-pop</code>',
      'подписи как есть: спектр и объём',
    ],
    vars: {
      '--m-sh': 'var(--sh-raised)',
      '--m-edge': 'transparent',
      '--m-btn-bg': 'var(--pop)',
      '--m-btn-fg': 'var(--on-pop)',
      '--m-btn-edge': 'transparent',
      '--m-btn-r': 'var(--r-pop)',
      '--m-frame': '4 / 3',
      '--m-cols': '3',
      '--m-cell': '21ch',
    },
  },
  {
    key: 'clinic',
    name: 'Аптечная ясность',
    set: 'Просторный',
    facts: 3,
    sh: '--sh-lift',
    shWhy: 'подъём под рукой: то же, но под указателем или в нажатии',
    say: 'Витрина объясняет. Текст крупнее всех, скругления самые большие, состояния заметны: карточка приподнята, у кнопки нарисовано кольцо фокуса. На карточке — всё, что спросит покупатель лекарства: спектр, объём, миллиграммы, лабораторный сертификат.',
    turns: [
      'набор ритма <b>«Просторный»</b> — тело 17 → 20, лестница терциями',
      'скругления крупные: <code>--r-card: var(--r-sheet)</code> — карточка берёт угол листа, <code>--r-ctrl: var(--r-card)</code> — орган берёт угол карточки',
      'тень карточки <code>--sh-lift</code> — подъём под рукой, состояние видно в покое',
      'кольцо фокуса нарисовано всегда: <code>--ring-w</code> краской <code>--ring</code>',
      'снимок <code>--frame: 4 / 3</code>',
      'кнопка громкая: <code>--pop</code> / <code>--on-pop</code>, полный круг <code>--r-pop</code>',
      'подписей три яруса: спектр, объём, миллиграммы и сертификат',
    ],
    vars: {
      '--r-card': 'var(--r-sheet)',
      '--r-ctrl': 'var(--r-card)',
      '--m-sh': 'var(--sh-lift)',
      '--m-edge': 'transparent',
      '--m-btn-bg': 'var(--pop)',
      '--m-btn-fg': 'var(--on-pop)',
      '--m-btn-edge': 'transparent',
      '--m-btn-r': 'var(--r-pop)',
      '--m-frame': '4 / 3',
      '--m-cols': '3',
      '--m-cell': '24ch',
    },
  },
  {
    key: 'dense',
    name: 'Плотная полка',
    set: 'Тесный',
    facts: 1,
    sh: '--sh-raised',
    shWhy: 'предмет над полом в покое: карточка, лист, шапка',
    say: 'Витрина показывает ассортимент. Набор ритма тесный, воздух на ступень ниже нынешнего, карточки мелкие и квадратные, колонок на полке четыре — на том же экране помещается больше товара. Углы средние, подпись одна.',
    turns: [
      'набор ритма <b>«Тесный»</b> — воздух на ступень ниже нынешнего',
      'углы средние: <code>--r-card</code> и <code>--r-ctrl</code> прямо из набора',
      'тень карточки <code>--sh-raised</code>',
      'снимок квадратный: <code>--frame: 1 / 1</code> — карточка ниже, в ряд помещается больше',
      'полка плотнее: ручки примитива <code>grid</code> — <code>--cols: 4</code> и пол ячейки <code>--cell-min: 15ch</code> (в <code>ch</code>: течёт вместе с кеглем набора, а не стоит числом)',
      'кнопка громкая, но угол органа, а не полный круг',
      'подпись одна',
    ],
    vars: {
      '--m-sh': 'var(--sh-raised)',
      '--m-edge': 'transparent',
      '--m-btn-bg': 'var(--pop)',
      '--m-btn-fg': 'var(--on-pop)',
      '--m-btn-edge': 'transparent',
      '--m-btn-r': 'var(--r-ctrl)',
      '--m-frame': '1 / 1',
      '--m-cols': '4',
      '--m-cell': '15ch',
    },
  },
]

/* Характер, которому не на чем стоять, — не характер: набор ритма должен
   быть в styles/scale.json, иначе `[data-scale]` в выпущенном CSS не
   найдётся и обёртка молча возьмёт корень. Стенд говорит об этом вслух, а
   не подставляет похожий набор. */
const orphan = MOODS.filter((m) => !names.includes(m.set))

/* ── товар: то, на чём характер и виден ───────────────────────────────────
   Нарочно НЕ полоски и не образцы: полоска не показывает, как угол читается
   рядом с ценой, а тень — рядом с плашкой скидки. */
const GOODS = [
  {
    nm: 'CBD масло 10 %', spec: 'пълен спектър', vol: '10 ml · 1000 mg',
    mg: '1000 mg CBD', price: '89,00 лв.', was: '111,00 лв.', sale: '−20 %',
  },
  {
    nm: 'CBD масло 5 %', spec: 'широк спектър', vol: '10 ml · 500 mg',
    mg: '500 mg CBD', price: '59,00 лв.',
  },
  {
    nm: 'CBD масло 20 %', spec: 'пълен спектър', vol: '10 ml · 2000 mg',
    mg: '2000 mg CBD', price: '149,00 лв.',
  },
]

const QTY = `<div class="qty m-qty"><button type="button" aria-label="по-малко">−</button><b>1</b><button type="button" aria-label="повече">+</button></div>`

/** Подписи всех трёх ярусов стоят в разметке ВСЕГДА, и у всех четырёх
 *  характеров она одна и та же. Что показано — решает CSS по `data-facts`:
 *  содержимое одно, характер решает, что из него вынесено на карточку. */
const FACTS = (g) => `
          <div class="cluster m-facts">
            <span class="chip m-fact" data-lvl="1" data-read="ctrl">${esc(g.spec)}</span>
            <span class="chip m-fact" data-lvl="2">${esc(g.vol)}</span>
            <span class="chip m-fact" data-lvl="3">${esc(g.mg)}</span>
            <span class="chip m-fact" data-lvl="3">лабораторен сертификат</span>
          </div>`

const PRICE = (g) => `
          <p class="m-price"><span class="m-now">${esc(g.price)}</span>${g.was
    ? `<s class="m-was">${esc(g.was)}</s><span class="m-sale" data-read="xs">${esc(g.sale)}</span>`
    : ''}</p>`

/* Надпись кнопки на ПОЛКЕ короче, чем на странице товара, и это не украшение.
   Пол примитива `grid` — две колонки («карточка во всю ширину телефона
   читается как баннер»), и на переток‑ширине 320 карточке достаётся 112 px:
   «В количката» с полем от роста органа просит 138 и не помещается никогда.
   На полке жмут «Купи», в карточке товара — «В количката». */
const CARD = (g) => `
        <article class="m-card" data-read="card">
          <div class="frame m-frame"><div class="m-shot"></div></div>
          <p class="m-nm">${esc(g.nm)}</p>
${PRICE(g)}
${FACTS(g)}
          <div class="m-buy"><button type="button" class="m-go">Купи</button></div>
        </article>`

const SHELF = () => `
      <div class="grid m-shelf">
${GOODS.map(CARD).join('\n')}
      </div>`

/* Крупная карточка — лист (`[data-plate]`), и лист здесь настоящий: угол у
   него `--r-sheet`, поле — своё, а чернила он пересчитывает сам. */
const BIG = () => `
      <div class="sheet m-big" data-plate data-read="sheet">
        <div class="switcher m-bigRow">
          <div class="frame m-frame m-frameBig"><div class="m-shot"></div></div>
          <div class="bias m-bigText">
            <h3 class="m-h3">CBD масло 10 % · пълен спектър</h3>
            <p class="m-lede">Студено пресовано конопено масло с носещо масло MCT. Десет милилитра, хиляда милиграма канабидиол. По пет капки под езика, два пъти дневно.</p>
${PRICE(GOODS[0])}
${FACTS(GOODS[0])}
            <div class="m-buy">${QTY}<button type="button" class="m-go">В количката</button></div>
          </div>
        </div>
        <div class="menu m-pop">
          <b>Доставка утре</b>
          <span class="m-note">Наличност в 3 склада · Econt и Speedy</span>
        </div>
      </div>`

const HEAD = () => `
      <div class="sectionHead m-head">
        <h2>Масла</h2>
        <p>Всяка партида идва със сертификат от независима лаборатория. Съдържанието на THC е под 0,2 %.</p>
      </div>`

/** Один и тот же разворот для всех четырёх характеров: шапка раздела,
 *  полка из трёх карточек, крупная карточка и всплывающее. Меняется
 *  ТОЛЬКО пара атрибутов на обёртке. */
const STAGE = () => `${HEAD()}
${SHELF()}
${BIG()}`

/* ── пульт и карточки характеров ──────────────────────────────────────────
   Механизм тот же, что у стенда шкал: выпущенный CSS везёт каждый набор под
   `[data-scale="Имя"]`, характер — под `[data-mood="ключ"]`, и стенду
   остаётся поставить два атрибута. Второго набора чисел здесь нет. */
const attrs = (m) => `data-scale="${esc(m.set)}" data-mood="${m.key}" data-facts="${m.facts}"`

const moodBtns = MOODS.map((m, i) =>
  `<button class="m-btn m-pick" type="button" data-key="${m.key}" aria-pressed="${i === 0}">${esc(m.name)}</button>`).join('')

/* Переобъявления ролей — одним блоком на характер, СРАЗУ ПОСЛЕ вставленного
   styles/scale.css: вес у `[data-mood]` и `[data-scale]` одинаковый (0,1,0),
   и решает порядок. */
const moodCss = MOODS.map((m) => `[data-mood="${m.key}"]{
${Object.entries(m.vars).map(([k, v]) => `  ${k}:${v};`).join('\n')}
}`).join('\n')

/* Карточка характера: имя, слова, живая карточка товара в этом характере и
   строка «во что это переводится» — числа в ней снимаются со страницы. */
const moodCards = MOODS.map((m) => `
    <article class="m-mood m-unit">
      <div class="m-moodTop">
        <p class="m-nm2">${esc(m.name)}</p>
        <p class="m-say">${esc(m.say)}</p>
      </div>
      <div class="m-demo" ${attrs(m)}>
        <div class="sheet m-mini" data-plate data-read="sheet">
${CARD(GOODS[0])}
        </div>
        <div class="m-rule">
          <span class="m-gauge"><span class="m-probe" data-r="xs"></span><small class="m-note">xs</small></span>
          <span class="m-gauge"><span class="m-probe" data-r="ctrl"></span><small class="m-note">ctrl</small></span>
          <span class="m-gauge"><span class="m-probe" data-r="card"></span><small class="m-note">card</small></span>
          <span class="m-gauge"><span class="m-probe" data-r="sheet"></span><small class="m-note">sheet</small></span>
          <span class="m-gauge"><span class="m-air" data-read="air"></span><small class="m-note">воздух</small></span>
          <span class="m-note m-gaugeSay">углы набора и воздух между разделами — в натуральную величину</span>
        </div>
      </div>
      <p class="m-line" data-line>—</p>
      <ul class="m-turns">${m.turns.map((t) => `<li>${t}</li>`).join('')}</ul>
      <p><button class="m-btn m-pick" type="button" data-key="${m.key}">Показать разворотом</button></p>
    </article>`).join('')

/* ── таблица чисел: она идёт РЯДОМ с картинкой, а не вместо неё ─────────── */
const KEYS = ['xs', 'ctrl', 'card', 'sheet']
const moodRows = MOODS.map((m) => {
  const r = sets[m.set]?.радиус ?? {}
  return `<tr><td>${esc(m.name)}</td><td>${esc(m.set)}</td>${KEYS.map((k) => `<td>${num(r[k])}</td>`).join('')}<td><code>${esc(m.sh)}</code></td><td>${esc(m.vars['--m-frame'])}</td><td>${esc(m.vars['--m-cols'])} × ${esc(m.vars['--m-cell'])}</td><td>${m.facts}</td></tr>`
}).join('\n')

const fact = (what, value, why) => `<tr><td>${what}</td><td>${value}</td><td>${why}</td></tr>`
const factRows = [
  fact('характеров на стенде', `<code>${MOODS.length}</code>`,
    'каждый — названный набор уже существующих настроек, а не новая одежда'),
  fact('наборов ритма в проекте', `<code>${names.length}</code>: ${names.map((n) => esc(n)).join(' · ')}`,
    'styles/scale.json; характер берёт набор целиком, а не выборочные ступени'),
  fact('полный круг <code>--r-pop</code>', `<code>${num(px('--r-pop'))}</code> px`,
    'Spectrum: полное скругление зовёт нажать — и потому достаётся одному главному действию'),
  fact('волосок <code>--line-w</code>', `<code>${num(px('--line-w'))}</code> px`,
    'кромка карточки у тихого люкса: в forced-colors тень стирается, обводка остаётся'),
  fact('кольцо <code>--ring-w</code>', `<code>${num(px('--ring-w'))}</code> px`,
    'WCAG 2.4.13; у аптечной ясности нарисовано всегда — настоящий фокус живёт до первого щелчка мимо'),
  fact('ролей тени', '<code>4</code>: raised · lift · overlay · in',
    'роль названа по работе: «тень 2» не говорит, когда её брать'),
  fact('пол ячейки полки', '<code>ch</code>, не px',
    'ширина ячейки считается от кегля набора: у тесного тело 16 → 17, у просторного 17 → 20'),
].join('\n')

const gone = []
if (!paletteCss) gone.push('styles/palette.css')
if (!tokensCss) gone.push('styles/tokens.css')
if (!baseCss) gone.push('styles/base.css')
const goneLine = gone.length
  ? `<p class="m-say m-warn">Нет ${gone.map((f) => `<code>${f}</code>`).join(', ')} — часть красок и ролей на стенде не разрешится. Это не поломка стенда: он показывает ровно то, что выпущено.</p>`
  : ''
const orphanLine = orphan.length
  ? `<p class="m-say m-warn">В <code>styles/scale.json</code> нет ${orphan.map((m) => `набора «${esc(m.set)}» (характер «${esc(m.name)}»)`).join(', ')} — эта обёртка возьмёт корневой набор, а не свой. Подставить похожий стенд не может.</p>`
  : ''

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Стенд характера</title>
<style>
${paletteCss}
${tokensCss}
${scaleCss}
${primCss}
${plateRule}
</style>
<style>
/* Переобъявления ролей по характерам. Стоят НИЖЕ вставленного
   styles/scale.css нарочно: вес у [data-mood] и [data-scale] одинаковый
   (0,1,0), и решает порядок. Ни одного числа — только имена ролей. */
${moodCss}

/* Сколько ярусов подписей вынесено на карточку. Разметка у всех характеров
   одна и та же — содержимое одно, характер решает, что из него показано. */
[data-facts="1"] .m-fact[data-lvl="2"],
[data-facts="1"] .m-fact[data-lvl="3"],
[data-facts="2"] .m-fact[data-lvl="3"]{display:none}
</style>
<style>
/* Своя одежда стенда. Ни одного кегля, поля, отступа и зазора числом: всё —
   роли из вставленного выше (запреты 1 и 2). Углы — только роли
   <code>--r-*</code>, тени — только роли <code>--sh-*</code>, толщина линии
   и кольца — только <code>--line-w</code> и <code>--ring-w</code>. Краска —
   тоже роль. Ни <code>100vw</code>, ни <code>100vh</code>, ни одного
   внешнего шрифта, скрипта и снимка. */
*{box-sizing:border-box;margin:0}
body{background:var(--page);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  font-size:var(--fs-base);line-height:var(--body-lead);
  padding:var(--air-group) var(--pad-card) var(--air-page);
  /* Умолчания ролей характера: до первого [data-mood] на странице всё равно
     что-то должно разрешиться, и пусть это будет ровный магазин. */
  --m-sh:var(--sh-raised);--m-edge:transparent;
  --m-btn-bg:var(--pop);--m-btn-fg:var(--on-pop);--m-btn-edge:transparent;--m-btn-r:var(--r-pop);
  --m-frame:4 / 3;--m-cols:3;--m-cell:21ch}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
s{text-decoration-thickness:var(--line-w)}
.m-col{max-inline-size:1180px;margin-inline:auto;display:flex;flex-direction:column;gap:var(--air-band)}
.m-sec{display:flex;flex-direction:column;gap:var(--air-group);min-inline-size:0}
h1{font-size:var(--fs-h2);line-height:var(--h2-lead);letter-spacing:var(--h2-track);font-weight:var(--h2-weight)}
h2{font-size:var(--fs-h3);line-height:var(--h3-lead);letter-spacing:var(--h3-track);font-weight:var(--h3-weight)}
.m-say{max-inline-size:var(--measure);color:var(--ink-soft);font-size:var(--fs-sm);line-height:var(--body-lead)}
.m-say b{color:var(--ink);font-weight:600}
.m-warn{color:var(--bad)}
.m-note{font-size:var(--fs-xs);color:var(--ink-soft)}
.m-nm2{font-size:var(--fs-h3);line-height:var(--h3-lead);letter-spacing:var(--h3-track);font-weight:var(--h3-weight)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:var(--fs-xs);
  background:var(--pop-tint);color:var(--pop-ink);border-radius:var(--r-xs);padding:0 var(--sp-1)}
:focus-visible{outline:var(--ring-w) solid var(--ring);outline-offset:var(--ring-off)}

/* ── пульт: характер и тема ───────────────────────────────────────────── */
.m-panel{background:var(--plate);border:var(--line-w) solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--gap-row)}
.m-row{display:flex;flex-wrap:wrap;align-items:center;gap:var(--gap-row)}
.m-key{font-size:var(--fs-xs);color:var(--ink-soft);min-inline-size:8ch}
.m-btn{block-size:var(--ctrl-h-sm);padding-inline:calc(var(--ctrl-h-sm) * .4);
  border:var(--line-w) solid var(--rule);border-radius:var(--r-ctrl);
  font-size:var(--ctrl-fs-xs);white-space:nowrap}
.m-btn[aria-pressed="true"]{background:var(--pop);border-color:var(--pop);color:var(--on-pop);font-weight:600}

/* ── строка «во что это переводится» ──────────────────────────────────── */
.m-line{font-size:var(--fs-xs);color:var(--ink-soft);font-variant-numeric:tabular-nums;
  line-height:var(--note-lead)}
.m-line b{color:var(--ink);font-weight:600}
.m-turns{margin:0;padding-inline-start:var(--sp-5);display:flex;flex-direction:column;gap:var(--sp-2);
  font-size:var(--fs-xs);color:var(--ink-soft);line-height:var(--note-lead)}

/* ── четыре характера рядом ───────────────────────────────────────────── */
.m-moods{--cols:2;--cols-min:1;--cell-min:320px}
.m-mood{background:var(--plate);border:var(--line-w) solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--air-row);min-inline-size:0}
.m-moodTop{display:flex;flex-direction:column;gap:var(--sp-2)}
.m-demo{background:var(--page);border-radius:var(--r-xs);padding:var(--pad-inner);
  display:flex;flex-direction:column;gap:var(--gap-row);min-inline-size:0}
/* Пол листа красит тот, кто лист ставит: блок [data-plate] из
   styles/base.css объявляет чернила, линию, тень и пару состояния — но не
   заливку. Без этой строки лист берёт чернила листа и остаётся стоять на
   полу страницы. */
.m-mini,.m-big{background:var(--plate)}
.m-mini{min-inline-size:0}
/* Линейка набора: четыре угла в натуральную величину и столбик воздуха
   между разделами. Мерится она же — числа в строке ниже сняты отсюда. */
.m-rule{display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--gap-row)}
.m-gauge{display:flex;flex-direction:column;align-items:center;gap:var(--sp-1);flex:none}
.m-gaugeSay{flex:1 1 14ch;min-inline-size:0}
/* Квадрат размером с крупный орган, а не с мелкий: на мелком ступень 16 и
   ступень 32 обе дают круг, и разница между наборами пропадает ровно там,
   где её и показывают. */
.m-probe{inline-size:var(--ctrl-h-lg);block-size:var(--ctrl-h-lg);flex:none;
  background:var(--quiet);border:var(--line-w) solid var(--rule)}
.m-probe[data-r="xs"]{border-radius:var(--r-xs)}
.m-probe[data-r="ctrl"]{border-radius:var(--r-ctrl)}
.m-probe[data-r="card"]{border-radius:var(--r-card)}
.m-probe[data-r="sheet"]{border-radius:var(--r-sheet)}
.m-air{inline-size:var(--sp-2);block-size:var(--air-page);flex:none;
  border-radius:var(--r-xs);background:var(--pop-tint);border:var(--line-w) solid var(--pop)}

/* ── разворот: одно и то же содержимое в выбранном характере ──────────── */
/* Тема переключается ЗДЕСЬ, а не на странице: токены написаны через
   light-dark(), и один color-scheme на этой коробке переворачивает всё, что
   внутри, — второй копии палитры для тёмной темы не существует. */
.m-stageBox{background:var(--page);color:var(--ink);
  border:var(--line-w) solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-sheet);display:flex;flex-direction:column;gap:var(--air-group);min-inline-size:0}
/* Воздух МЕЖДУ разделами — этот зазор, и он же снимается в строку чисел. */
.m-stage{display:flex;flex-direction:column;gap:var(--air-page);min-inline-size:0}

/* ── карточка товара ──────────────────────────────────────────────────── */
.m-shelf{--cols:var(--m-cols);--cell-min:var(--m-cell);--cols-min:2}
.m-card{background:var(--surface);border:var(--line-w) solid var(--m-edge);
  border-radius:var(--r-card);padding:var(--pad-card);box-shadow:var(--m-sh);
  display:flex;flex-direction:column;gap:var(--air-row);min-inline-size:0}
.m-frame{--frame:var(--m-frame);border-radius:calc(var(--r-card) - var(--pad-inner))}
.m-frameBig{--frame:var(--m-frame)}
/* «Снимок» — градиент на div: внешних картинок на стенде нет вовсе. */
.m-shot{inline-size:100%;block-size:100%;
  background:linear-gradient(135deg, var(--pop), var(--plate-3) 55%, var(--sale-fill))}
.m-nm{font-size:var(--body-size);font-weight:600;text-wrap:pretty}
.m-price{display:flex;align-items:center;flex-wrap:wrap;gap:var(--gap-row);
  font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:600}
.m-was{font-size:var(--note-size);font-weight:400;color:var(--ink-soft)}
.m-sale{display:inline-flex;align-items:center;block-size:var(--ctrl-h-sm);
  padding-inline:calc(var(--ctrl-h-sm) * .3);border-radius:var(--r-xs);
  background:var(--sale-fill);color:var(--on-sale);font-size:var(--ctrl-fs-xs);font-weight:600}
.m-facts{min-inline-size:0}
/* Подпись на ТЕСНОЙ карточке переносится по словам. Полка в две колонки —
   пол примитива grid (--cols-min:2, «карточка во всю ширину телефона
   читается как баннер»), и на 360 ряду достаётся 132 px, а «широк спектър»
   в одну строку — 154. Ужимается ПОДПИСЬ, а не орган: рост пилюля держит
   ступенью органа, просто перестаёт быть одной строкой. */
.m-facts .chip{white-space:normal;block-size:auto;min-block-size:var(--ctrl-h-sm);
  padding-block:var(--sp-1);text-align:start}
.m-buy{display:flex;align-items:center;flex-wrap:wrap;gap:var(--gap-targets)}
.m-go{display:inline-flex;align-items:center;justify-content:center;flex:1 1 auto;
  min-block-size:var(--ctrl-h-lg);padding-block:var(--sp-1);
  padding-inline:calc(var(--ctrl-h-lg) * .4);
  border:var(--line-w) solid var(--m-btn-edge);border-radius:var(--m-btn-r);
  background:var(--m-btn-bg);color:var(--m-btn-fg);
  font-size:var(--ctrl-fs-sm);font-weight:600;text-align:center}
/* «Заметные состояния» аптечной ясности: кольцо фокуса нарисовано всегда —
   настоящий фокус живёт ровно до первого щелчка мимо, и показать его
   иначе нельзя. */
[data-mood="clinic"] .m-go{outline:var(--ring-w) solid var(--ring);outline-offset:var(--ring-off)}

/* ── крупная карточка и всплывающее ───────────────────────────────────── */
.m-big{display:flex;flex-direction:column;gap:var(--air-block);min-inline-size:0}
.m-bigRow{--switch-at:460px;--switch-gap:var(--gap-grid);align-items:flex-start}
.m-bigText{display:flex;flex-direction:column;gap:var(--air-row);min-inline-size:0}
.m-h3{font-size:var(--h3-size);line-height:var(--h3-lead);letter-spacing:var(--h3-track);
  font-weight:var(--h3-weight);text-wrap:pretty}
.m-lede{font-size:var(--lede-size);line-height:var(--lede-lead);color:var(--ink-soft);
  max-inline-size:var(--measure-lede)}
/* Единственное, что всплывает поверх страницы, — и у тихого люкса это
   единственное, у чего есть тень. */
.m-pop{padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--sp-2);
  max-inline-size:var(--measure-note)}

/* ── таблицы ──────────────────────────────────────────────────────────── */
/* Таблица данных — лента по замыслу: она не переносится (WCAG 1.4.10
   исключает её из перетока), и на 360 едет вбок внутри своей коробки. */
.m-scroll{overflow-x:auto;overflow-y:hidden}
table{border-collapse:collapse;inline-size:100%;font-size:var(--fs-sm)}
th,td{text-align:start;padding:var(--sp-2) var(--sp-3);
  border-block-end:var(--line-w) solid var(--rule);vertical-align:top}
th{font-size:var(--fs-xs);color:var(--ink-soft);font-weight:500}
td{white-space:nowrap}
.m-facttab td:nth-child(3){white-space:normal;color:var(--ink-soft);font-size:var(--fs-xs)}
.m-moodtab td:nth-child(n+3):nth-child(-n+6){font-variant-numeric:tabular-nums}
</style></head>
<body>
<div class="m-col">
  <header class="m-sec">
    <h1>Характер витрины — четыре, на одном товаре</h1>
    <p class="m-say">Здесь выбирают <b>характер</b>, и выбирают его глазами. Четыре характера стоят рядом на одной и той же карточке масла; под каждым — строка «во что это переводится» с живыми числами. Ниже — пульт и полный разворот: шапка раздела, полка из трёх карточек, крупная карточка со счётчиком и всплывающее. Содержимое у всех четырёх <b>одно и то же</b>; меняются два атрибута на обёртке.</p>
    <p class="m-say">Характер — не новая одежда, а <b>названный набор уже существующих настроек</b>: набор ритма из <code>styles/scale.json</code> плюс переобъявление ролей (<code>--r-card</code>, <code>--r-ctrl</code>, роль тени, <code>--frame</code>, ручки полки) на той же обёртке. Ни одного нового числа. Выбранный характер ложится в файл набора одной записью, а не расползается по блокам.</p>
    <p class="m-say">Ничего на этой странице <b>не набрано рукой</b>. Стенд вставляет в себя выпущенные <code>styles/palette.css</code>, <code>styles/scale.css</code>, <code>styles/tokens.css</code> и <code>styles/primitives.module.css</code> как есть, лист (<code>[data-plate]</code>) берёт из <code>styles/base.css</code> тем же блоком, имена наборов и их радиусы читает из <code>styles/scale.json</code>. Числа в строках «во что это переводится» сняты <code>getComputedStyle</code> с самой страницы.</p>
${goneLine}
${orphanLine}
  </header>

  <section class="m-sec">
    <h2>Четыре характера рядом</h2>
    <p class="m-say">Полоска цвета и список имён выбором не являются. Поэтому каждый характер стоит здесь на <b>настоящей карточке товара</b> — с ценой, плашкой скидки, подписями и кнопкой покупки, — а рядом с ней линейка: четыре угла набора в натуральную величину и столбик воздуха между разделами.</p>
    <div class="grid m-moods">
${moodCards}
    </div>
  </section>

  <section class="m-sec">
    <h2>Разворот</h2>
    <p class="m-say">Одно и то же содержимое в выбранном характере. Жмите характер — меняются <code>data-scale</code> и <code>data-mood</code> на обёртке, и больше ничего.</p>
    <div class="m-panel">
      <div class="m-row"><span class="m-key">Характер</span>${moodBtns}</div>
      <div class="m-row"><span class="m-key">Тема</span>
        <button class="m-btn m-theme" type="button" data-theme="light" aria-pressed="false">светлая</button>
        <button class="m-btn m-theme" type="button" data-theme="dark" aria-pressed="false">тёмная</button>
        <button class="m-btn m-theme" type="button" data-theme="" aria-pressed="true">системная</button>
      </div>
    </div>

    <div class="m-stageBox m-unit" id="stageBox">
      <div class="m-stage" id="stage" ${attrs(MOODS[0])}>
${STAGE()}
      </div>
      <p class="m-line" data-line>—</p>
    </div>
    <p class="m-say">Воздух между шапкой раздела, полкой и крупной карточкой — это <code>--air-page</code>, и он же снят в строку чисел выше. Тень у карточки берётся ролью: у тихого люкса не берётся вовсе, и тогда единственное, что отбрасывает тень на странице, — всплывающая бумага <code>--sh-overlay</code> внизу.</p>
    <p class="m-say">У «Плотной полки» на ряду <b>четыре</b> дорожки, а товара три — четвёртое место остаётся пустым нарочно: число колонок вычисляется, а не назначается (запрет 5), и пустая дорожка и есть тот самый запас, ради которого плотную полку выбирают. Положите четвёртый товар — он встанет в неё сам.</p>
  </section>

  <section class="m-sec">
    <h2>Числа</h2>
    <div class="m-panel m-scroll">
      <table class="m-moodtab"><thead><tr><th>характер</th><th>набор ритма</th><th>xs</th><th>ctrl</th><th>card</th><th>sheet</th><th>тень карточки</th><th>снимок</th><th>полка</th><th>ярусов подписей</th></tr></thead>
      <tbody>
${moodRows}
      </tbody></table>
    </div>
    <p class="m-say">Радиусы в таблице — ключ <code>радиус</code> каждого набора из <code>styles/scale.json</code>, <b>до</b> переобъявления характером: «Тихий люкс» ставит карточке <code>--r-card: var(--r-xs)</code>, и на странице у неё угол мелкой ступени, а не выпущенный. Что стоит на экране — в строках «во что это переводится», они живые.</p>
    <div class="m-panel m-scroll">
      <table class="m-facttab"><thead><tr><th>что</th><th>сколько</th><th>откуда</th></tr></thead>
      <tbody>
${factRows}
      </tbody></table>
    </div>
  </section>

  <section class="m-sec">
    <h2>Что дальше</h2>
    <p class="m-say">Названный характер записывается в <code>docs/decisions.md</code>, раздел «Характер витрины», одной строкой словами заказчика и с датой — так же, как туда записан набор цвета «Латунь на угле». Вместе с ним закрывается и открытый пункт оттуда же: «<b>Набор ритма</b> — ещё не назван заказчиком глазами», — потому что характер везёт набор ритма с собой.</p>
  </section>
</div>

<script>
var MOODS = ${JSON.stringify(MOODS.map((m) => ({ key: m.key, name: m.name, set: m.set, facts: m.facts, sh: m.sh })))};
var SH = {}, SET = {}, FACT = {};
for(var i = 0; i < MOODS.length; i++){
  SH[MOODS[i].key] = MOODS[i].sh;
  SET[MOODS[i].key] = MOODS[i].set;
  FACT[MOODS[i].key] = MOODS[i].facts;
}

/* Числа читаются с ЖИВОЙ страницы, а не из набора: на экране работает то,
   что посчитал браузер, и показывать надо его. Углы снимаются с НАСТОЯЩИХ
   предметов — плашки скидки, пилюли, карточки и листа, — а не с копии
   объявления: объявление можно переобъявить и не заметить. */
function readout(unit){
  var root = unit.querySelector('[data-mood]');
  var line = unit.querySelector('[data-line]');
  if(!root || !line) return;
  var card = root.querySelector('[data-read="card"]');
  var chip = root.querySelector('[data-read="ctrl"]');
  var sale = root.querySelector('[data-read="xs"]');
  var leaf = root.querySelector('[data-read="sheet"]');
  var airEl = root.querySelector('[data-read="air"]');

  function radius(el){
    if(!el) return '—';
    var v = parseFloat(getComputedStyle(el).borderTopLeftRadius);
    return isNaN(v) ? '—' : String(Math.round(v));
  }
  function pad(el){
    if(!el) return '—';
    var v = parseFloat(getComputedStyle(el).paddingTop);
    return isNaN(v) ? '—' : String(Math.round(v));
  }
  /* Воздух: у карточки характера он стоит столбиком в натуральную величину,
     у разворота это НАСТОЯЩИЙ зазор между разделами. Обе величины — одна и
     та же роль --air-page, снятая там, где она работает. */
  var air = airEl
    ? Math.round(airEl.getBoundingClientRect().height)
    : Math.round(parseFloat(getComputedStyle(root).rowGap) || 0);

  var key = root.getAttribute('data-mood');
  var drawn = card && getComputedStyle(card).boxShadow !== 'none' ? 'есть' : 'нет';
  line.innerHTML = 'набор ритма <b>' + root.getAttribute('data-scale') + '</b>' +
    ' · углы xs <b>' + radius(sale) + '</b> / ctrl <b>' + radius(chip) +
    '</b> / card <b>' + radius(card) + '</b> / sheet <b>' + radius(leaf) + '</b> px' +
    ' · тень карточки <b>' + (SH[key] || '—') + '</b> (на экране: ' + drawn + ')' +
    ' · поле карточки <b>' + pad(card) + '</b> px' +
    ' · воздух между разделами <b>' + air + '</b> px';
}

var units = document.querySelectorAll('.m-unit');
function paint(){
  for(var i = 0; i < units.length; i++) readout(units[i]);
}

var stage = document.getElementById('stage');
var picks = document.querySelectorAll('.m-pick');
for(var p = 0; p < picks.length; p++){
  picks[p].addEventListener('click', function(e){
    var key = e.currentTarget.getAttribute('data-key');
    stage.setAttribute('data-mood', key);
    stage.setAttribute('data-scale', SET[key]);
    stage.setAttribute('data-facts', String(FACT[key]));
    for(var k = 0; k < picks.length; k++){
      if(picks[k].hasAttribute('aria-pressed')){
        picks[k].setAttribute('aria-pressed', String(picks[k].getAttribute('data-key') === key));
      }
    }
    requestAnimationFrame(paint);
  });
}

/* Тема ставится атрибутом style на сам пол разворота: токены написаны через
   light-dark(), и переключать нечего, кроме color-scheme. */
var box = document.getElementById('stageBox');
var themes = document.querySelectorAll('.m-theme');
for(var t = 0; t < themes.length; t++){
  themes[t].addEventListener('click', function(e){
    var b = e.currentTarget;
    var v = b.getAttribute('data-theme');
    if(v) box.style.colorScheme = v;
    else box.style.removeProperty('color-scheme');
    for(var k = 0; k < themes.length; k++) themes[k].setAttribute('aria-pressed', String(themes[k] === b));
    requestAnimationFrame(paint);
  });
}

/* Ступени течения: угол не течёт, а поле и воздух — да, и на другой ширине
   числа другие. Строка обязана это показывать, иначе она врёт. */
if(typeof ResizeObserver === 'function'){
  new ResizeObserver(function(){ paint(); }).observe(document.documentElement);
} else {
  window.addEventListener('resize', paint);
}

paint();
</script>
</body></html>`

const out = path.resolve(process.argv[2] ?? 'mood-stand.html')
writeFileSync(out, html)

console.log(`Стенд характера собран: ${out}`)
console.log(`  характеров: ${MOODS.length} — ${MOODS.map((m) => `${m.name} (${m.set})`).join(' · ')}`)
for (const m of MOODS) {
  const r = sets[m.set]?.радиус ?? {}
  console.log(`  ${m.name}: набор «${m.set}» · углы xs ${num(r.xs)} / ctrl ${num(r.ctrl)} / card ${num(r.card)} / sheet ${num(r.sheet)} · тень ${m.sh} · снимок ${m.vars['--m-frame']} · полка ${m.vars['--m-cols']} × ${m.vars['--m-cell']} · ярусов подписей ${m.facts}`)
}
console.log(`  наборов в styles/scale.json: ${names.length} (${names.join(', ')})${orphan.length ? ` · без набора: ${orphan.map((m) => m.name).join(', ')}` : ''}`)
console.log(`  вес страницы: ${(Buffer.byteLength(html) / 1024).toFixed(0)} КБ`)
