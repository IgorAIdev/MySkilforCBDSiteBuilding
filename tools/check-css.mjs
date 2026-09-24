/**
 * Храповик по вёрстке.
 *
 * Проверяет четыре запрета из CLAUDE.md — размер шрифта в пикселях, отступ
 * в пикселях, брейкпоинт вне разрешённых трёх и пропорцию без потолка, —
 * плюс движение, и сравнивает счётчики с базой в tools/css-baseline.json.
 *
 * Падает, только если нарушений стало БОЛЬШЕ. Накопленное чинится в своём
 * темпе, новое не заводится. Проверка, которая падает с первого дня, живёт
 * ровно до первого «давай пока отключим».
 *
 *   node tools/check-css.mjs              проверить
 *   node tools/check-css.mjs --update     записать текущие числа как базу
 */

import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { RHYTHM, MOTION, STATE } from './thresholds.mjs'
import { join, relative as nativeRelative, dirname, basename } from 'node:path'
import { CSS_FAMILIES, CSS_LABELS as NAMES, hueRx } from './css-families.mjs'
import { parse as parseName, REQUIRED, optics, declarations, reads } from './names.mjs'
import { axisOf, POINTER_FORBIDDEN } from './axes.mjs'
/* Где лежат стили, как названы шкалы, сколько швов — из `kit.config.json`
   проекта, а без него — соглашения набора. Набирать это здесь рукой нельзя:
   на чужом проекте проверка тогда молчит нулём (И168). */
import { STYLE_DIRS as DIRS, LIB, TOKENS, BASE, CONTROLS, EXEMPT, FLOATING, PALETTE,
  BREAKPOINTS, SEAMS, COMPONENT_DIRS, inDirs, PREFIX, RX, ALIASES, LADDER, HUES, PRIMITIVES } from './kit-config.mjs'
import { deadSeams } from './seams.mjs'

const relative = (...args) => nativeRelative(...args).split(String.fromCharCode(92)).join('/')
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASELINE = join(ROOT, 'tools/css-baseline.json')

/* EXEMPT: шкала объявляется в пикселях внутри clamp() — это её работа, а не
   нарушение. Панель настроек рисует саму себя и в магазин не едет. Страница
   набора — тоже: она ПОКАЗЫВАЕТ контролы и знаки, и лист значков обязан
   назначить им толщину штриха, потому что в самом знаке её нет. Витриной
   она не является и в магазин не едет.

   FLOATING: предметы, которые тёмны замыслом и лежат НАД страницей, а не на
   её полу: нижняя панель, всплывающее сообщение, кружок помощника. Им
   фирменная заливка положена — белеть на палубе они не должны, они её
   закрывают.

   BREAKPOINTS: разрешённые точки — смена смысла раскладки, а не размера. */

/* Шкала ритма и имена слоёв — в регулярных выражениях, собранных от имени
   шкалы: `var(--sp-` у набора, `var(--space-` у проекта со своими именами. */
const SPACE_VAR = new RegExp(`var\\(${RX.space}`)
const LAYER_VAR = new RegExp(`var\\(${RX.layer}`)

/* Меньше 8px — оптическая доводка под скруглением штриха, а не ритм: шкалой
   такое не описывается, и запрещать его смысла нет. */
const SPACING_FLOOR = RHYTHM.floor


/** Текст всего, что может читать имя вне стилей: код проекта, инструменты,
 *  тесты, шаблоны. Считается один раз. */
let codeCache = null
function codeText() {
  if (codeCache !== null) return codeCache
  const out = []
  const walkCode = (dir) => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) { if (name !== 'node_modules') walkCode(path); continue }
      if (/\.(tsx?|jsx?|mjs|html|json)$/.test(name)) out.push(readFileSync(path, 'utf8'))
    }
  }
  for (const dir of ['app', 'components', 'lib', 'tools', 'tests', 'templates', 'selftest']) walkCode(join(ROOT, dir))
  codeCache = out.join('\n')
  return codeCache
}

const files = []
for (const dir of DIRS) walk(join(ROOT, dir))
function walk(dir) {
  /* Папки может не быть вовсе — на новом проекте `app/` или `components/`
     появляются не в первый день. Проверка, падающая на пустом проекте, до
     первого дня и не доживает. */
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (name.endsWith('.css')) files.push(path)
  }
}

/* Список семей — в своём файле: его читает и эта проверка, и сборщик набора,
   который пишет новому проекту пустую базу. Один список, два потребителя. */
const found = Object.fromEntries(CSS_FAMILIES.map((k) => [k, []]))

/* Порядок слоёв ВНУТРИ своего блока — это не спор с другими файлами: 1 и 2 у
   карточки товара говорят «подпись поверх снимка», и о шапке они ничего не
   утверждают. Спор начинается там, где число претендует на место в очереди
   ВСЕЙ страницы.

   Граница — однозначное число. Она не про величину, а про намерение: пока
   слоёв внутри блока меньше десяти, номер читается как «выше соседа», и
   выше него всё равно ничего своего нет. Двузначное число ставят, только
   когда целятся выше чужого — шапки, полосы, затемнения, — а целиться в
   чужое числом и есть запрещённое. */
const LOCAL_LAYER = 9

/* Комментарий — не код. Объяснение, ПОЧЕМУ брейкпоинт убран, само считалось
   брейкпоинтом; абзац про `padding-block: var(--sp-9)` — отступом. Режется с
   сохранением длины, пробел на символ: номера строк считаются по смещению.

   Пробела на символ мало: перенос строки внутри комментария тоже становился
   пробелом, комментарий схлопывался в одну строку, и ВСЕ номера ниже него
   уезжали вверх. Сохраняются и длина, и переносы.

   Второй проход резал комментарии, а первый — нет, и правка легла мимо.
   Признак тот же, что всегда: адрес не сходится с тем, что видно глазом. */
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

/** Тела всех блоков `@media (… pointer:coarse …)` со смещением каждого в
 *  файле: скобки считаются, потому что внутри медиазапроса лежат правила со
 *  своими скобками, и регуляркой до первой `}` тело обрывается на первом же
 *  из них. */
/** Размер, НАРИСОВАННЫЙ органу вне медиазапроса про палец, — или `null`,
 *  если размера у него нет вовсе.
 *
 *  Разница между этими двумя случаями и есть всё правило. Органу без
 *  нарисованного размера (строка списка, ссылка в тексте) минимум под палец
 *  ничего не ломает: он только задаёт пол там, где пола не было. Органу с
 *  нарисованным размером тот же минимум МЕНЯЕТ РИСУНОК — и заодно двигает
 *  всё, что стоит с ним в одной строке. */
function drawnSize(css, sel, prop) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('(?:^|[},])\\s*' + esc + '\\s*\\{([^{}]*)\\}', 'g')
  let best = null
  for (const m of css.matchAll(re)) {
    const d = [...m[1].matchAll(new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*(\\d+(?:\\.\\d+)?)px', 'g'))]
    for (const x of d) best = best === null ? Number(x[1]) : Math.min(best, Number(x[1]))
  }
  return best
}

function coarseBlocks(css) {
  const out = []
  for (const m of css.matchAll(/@media[^{]*pointer\s*:\s*coarse[^{]*\{/g)) {
    let depth = 1
    let i = m.index + m[0].length
    const from = i
    while (i < css.length && depth) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    out.push({ at: from, body: css.slice(from, i - 1) })
  }
  return out
}

/* Управляющий байт в файле стилей — не мелочь и не косметика.
 *
 * По правилам CSS нулевой байт внутри объявления делает его недействительным:
 * браузер выбрасывает СТРОКУ ЦЕЛИКОМ и молчит. Так у кнопки выхода пропало
 * `padding` — надпись встала впритык к краю, и выглядело это как «кнопка не
 * подстраивается под текст». Шесть таких байтов попали в файл правкой
 * скриптом; ни один инструмент об этом не сказал.
 *
 * Проверка валит сборку сразу, а не считает храповиком: это не долг, который
 * чинят в своём темпе, а испорченный файл. */
const dirty = []
for (const path of files) {
  const raw = readFileSync(path)
  const bad = [...raw].filter((b) => b < 9 || (b > 13 && b < 32)).length
  if (bad) dirty.push(`${relative(ROOT, path)}: ${bad}`)
}
if (dirty.length) {
  /* Все сразу, а не первый попавшийся: испорчен обычно не один файл — их
     портит одна и та же неудачная правка скриптом. */
  console.error('\n✗ Управляющие байты в файлах стилей:')
  for (const d of dirty) console.error(`    ${d}`)
  console.error('\n  Браузер выбросит объявления, в которых они стоят, и не скажет об этом.')
  console.error('  Починить все:')
  console.error("    node -e \"const fs=require('fs');for(const f of process.argv.slice(1)){const b=fs.readFileSync(f);fs.writeFileSync(f,Buffer.from([...b].filter(c=>c>=32||[9,10,13].includes(c))))}\" " + dirty.map((d) => d.split(':')[0]).join(' '))
  process.exit(1)
}

for (const path of files) {
  const rel = relative(ROOT, path)
  if (EXEMPT.includes(rel)) continue
  const css = strip(readFileSync(path, 'utf8'))
  const at = (index) => `${rel}:${css.slice(0, index).split('\n').length}`

  /* Одно объявление — одна находка. `padding:20px 26px 8px` — это три числа,
     но ОДНО место, которое чинится одной правкой. Считая числа, проверка
     показывала 60 там, где мест было втрое меньше, и долг выглядел страшнее,
     чем есть. Долг мерится работой, а не арифметикой. */
  const seen = new Set()
  const add = (fam, line) => {
    if (seen.has(fam + line)) return
    seen.add(fam + line)
    found[fam].push(line)
  }

  for (const m of css.matchAll(/font-size:\s*([\d.]+)px/g)) {
    add('fontPx', `${at(m.index)}  font-size:${m[1]}px`)
  }

  /* Число, спрятанное в запас переменной, — то же число.
   *
   * `font-size:var(--more-fs,14px)` проверка не видела: её признаком был
   * размер сразу после двоеточия. А `--more-fs` не объявлен НИГДЕ — значит
   * до экрана доезжает ровно 14px, и шкала к этой надписи не приходит. Так
   * жили пять контролов (кнопка «ещё» в четырёх видах и счётчик) и подпись
   * героя: база честно показывала ноль, а в отданном CSS стояли числа.
   *
   * Признак строгий — запас ЦЕЛИКОМ число: `var(--x, 14px)`. Запас из
   * другого имени (`var(--h2-size, var(--fs-h2))`) — это шкала, а не число.
   * Пиксели внутри clamp() у блока, меряющего свой контейнер, тоже не запас:
   * иначе сюда попал бы `clamp(15px, 3.4cqi, 18px)` — собственная кривая
   * блока, разрешённая правилом 6. */
  for (const m of css.matchAll(/font-size:[^;}]*var\(\s*--[\w-]+\s*,\s*([\d.]+)px\s*\)/g)) {
    add('fontPx', `${at(m.index)}  font-size: запас у переменной — ${m[1]}px`)
  }

  /* Ритм и геометрия — разные вещи, и правило 2 про первое.
   *
   * Ритм — это расстояния МЕЖДУ вещами: воздух между разделами, просвет
   * между карточками, отбивка заголовка. Он обязан течь со шкалой, потому
   * что 64px между разделами на десктопе — воздух, а на телефоне треть
   * экрана.
   *
   * Геометрия контрола — это его собственное устройство: поле внутри
   * пилюли, просвет до иконки. Оно не течёт и течь не должно: пилюля
   * высотой 28px не становится 34px на широком мониторе.
   *
   * Больше того, эти числа не произвольны. Поле внутри пилюли — доля её
   * высоты, и доля растёт вместе с высотой: 0.385 при 26px, 0.478 при 46,
   * 0.519 при 54. Это оптика, а не неряшливость: у мелкой пилюли плечо
   * ограничено снизу боковыми пробелами самого шрифта. Загнать их в одну
   * ступень — испортить, а не собрать.
   *
   * Отличаются они по признаку, который виден в файле: у контрола в том же
   * блоке назначен СВОЙ размер — `height` или `width` числом. Правило,
   * которое задаёт себе высоту и поле внутри, описывает предмет. Правило,
   * которое задаёт только отступ, описывает расстояние.
   *
   * `margin` из послабления исключён всегда: это расстояние до соседа, то
   * есть ритм, даже когда стоит на контроле.
   *
   * `(?<![-a-z])` отсекает объявление собственной переменной: в
   * `--grid-gap:14px` иначе находится `gap:14px`, и шкала, ради которой
   * всё затевалось, считалась бы нарушением правила о шкале. */
  const OWN_SIZE = /(?:^|[;{])\s*(?:min-|max-)?(?:height|width|block-size|inline-size)\s*:\s*\d+(?:\.\d+)?px/
  /* Пилюля — контрол и тогда, когда высоты у неё в файле нет: высоту ей
     ДАЁТ подкладка вместе со строкой текста. Признак собственного размера
     её не ловил, и `padding:9px 13px` у ссылки в меню считался ритмом —
     а это её устройство, то самое, где доля растёт вместе с высотой.
     Скруглением в половину высоты ничто, кроме контрола, не бывает; с И228
     орган берёт свой радиус ролью `--r-ctrl`, главное действие — `--r-pop`,
     и признак тот же: радиус органа читает только орган. */
  const IS_PILL = /border-radius\s*:\s*var\(--r-(?:pop|ctrl)\)/
  for (const m of css.matchAll(/(?<![-a-z])(padding|margin|gap|inset)[a-z-]*:\s*([^;}]+)/g)) {
    /* блок, внутри которого стоит объявление */
    const open = css.lastIndexOf('{', m.index)
    const close = css.indexOf('}', m.index)
    const block = open >= 0 && close > open ? css.slice(open, close) : ''
    const geometry = m[1] !== 'margin' && (OWN_SIZE.test(block) || IS_PILL.test(block))
    if (geometry) continue
    /* Запасное значение переменной — не выбор отступа: в
       `padding:calc(var(--qty-h,54px) * .074)` число 54 это высота контрола,
       объявленная где-то ещё, а здесь лишь названная на случай, если её не
       назначили. Считать его нарушением значит требовать шкалу от того, что
       шкалой не является. */
    /* `clamp(var(--sp-8), 4.62vw - 9.85px, var(--sp-9))` — это ступень
       между двумя ступенями, текущая с шириной: ровно то, чего правило и
       требует. Число внутри — наклон прямой, а не отступ. Признак: в
       значении есть и `vw`, и шкала. */
    if (/vw/.test(m[2]) && SPACE_VAR.test(m[2])) continue
    const bare = m[2].replace(/var\([^()]*\)/g, '')
    for (const px of bare.matchAll(/(\d+(?:\.\d+)?)px/g)) {
      if (Number(px[1]) >= SPACING_FLOOR) {
        add('spacingPx', `${at(m.index)}  ${m[0].trim().slice(0, 48)}`)
      }
    }
  }

  /* Роль переопределяется ПАРОЙ.

     Тёмная палуба переопределяла только цвет знака (`--sage-12` → белый), а
     `--surface` оставался белым листом: пилюли героя вышли белым по белому,
     слов не видно вовсе. Заказчик нашёл это глазом на витрине.

     Сломалась бы любая плашка внутри палубы, а не только пилюли: знак и то,
     на чём он стоит, — одна пара, и переопределять её половиной нельзя.
     Проверка смотрит ровно это: блок, назначающий цвет знака, обязан в том
     же блоке назначить и поверхность. `:root` не в счёт — там объявлено всё.

     Отрисованной проверкой это не ловится: она открывает витрину в одном
     состоянии настроек, а палуба — одно из многих. Признак виден в файле,
     значит место ему здесь. */
  for (const m of css.matchAll(/(?:^|[;{])\s*--sage-1[12]\s*:/g)) {
    const open = css.lastIndexOf('{', m.index)
    const close = css.indexOf('}', m.index)
    if (open < 0 || close < open) continue
    const head = css.slice(Math.max(0, css.lastIndexOf('}', open) + 1), open)
    if (/:root/.test(head)) continue
    const block = css.slice(open, close)
    if (/--surface\s*:/.test(block)) continue
    add('halfRole', `${at(m.index)}  ${head.trim().slice(0, 44)} — знак переопределён, поверхность нет`)
  }

  /* Та же пара, сломанная с другой стороны: фон записан ЛИТЕРАЛОМ, а краска
     взята токеном, который зависит от фона раздела.

     Стрелка героя на наведении: `background:#fff; color:var(--sage-12)`. На
     тёмной палубе `--sage-12` становится белым — и знак пропадает на белом
     кружке. Заказчик снова нашёл это глазом, уже второй раз в тот же день:
     первый был у пилюль, и починен был только он. Дефект чинится во всех
     местах сразу, а не там, где показали, — потому и проверка. */
  for (const m of css.matchAll(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|white)\s*[;}]/g)) {
    const open = css.lastIndexOf('{', m.index)
    const close = css.indexOf('}', m.index)
    if (open < 0 || close < open) continue
    const block = css.slice(open, close)
    const ink = block.match(/(?:^|[;{])\s*color\s*:\s*var\(--(sage-1[12]|chrome-fg[a-z0-9-]*)\)/)
    if (!ink) continue
    const head = css.slice(Math.max(0, css.lastIndexOf('}', open) + 1), open)
    add('halfRole', `${at(m.index)}  ${head.trim().slice(0, 40)} — фон литералом, краска токеном --${ink[1]}`)
  }

  /* Та же пара, сломанная с третьей стороны, и это тот же день и тот же
     глаз заказчика: состояние контрола покрашено ФИРМЕННЫМ цветом.

     `--accent-solid` — не только цвет кнопки, это ещё и цвет тёмного пола:
     `--page-deck: var(--chrome-bg)`, а `--chrome-bg` и `--accent-solid` —
     один и тот же `#0C3A46`. Пилюля героя на палубе под указателем красилась
     В ЦВЕТ ПАЛУБЫ и исчезала целиком вместе со словом. Так же исчезла бы
     любая основная кнопка, любой выбранный пункт, любая нажатая плитка,
     попади они на палубу или на лист подвала.

     Поэтому у состояния теперь своя роль — `--pop` / `--on-pop` /
     `--pop-hover`, — и тёмный пол переопределяет её парой вместе с
     `--surface`. Фирменный цвет остаётся только там, где предмет тёмен
     ЗАМЫСЛОМ и лежит НАД страницей: нижняя панель, всплывающее сообщение,
     кружок помощника. Они пол закрывают, а не стоят на нём. */
  if (!FLOATING.includes(rel)) {
    for (const m of css.matchAll(/background(?:-color)?\s*:\s*var\(--(accent-solid|hover-solid)\)/g)) {
      const open = css.lastIndexOf('{', m.index)
      const head = open < 0 ? '' : css.slice(Math.max(0, css.lastIndexOf('}', open) + 1), open)
      add('halfRole', `${at(m.index)}  ${head.trim().slice(0, 40)} — состояние фирменным цветом (нужен --pop)`)
    }
  }

  /* `@container` — не брейкпоинт. Контейнерный запрос меряет ширину своего
     родителя, а не окна: это ровно то, к чему правило 6 и призывает, и
     запрещать его числами разрешённых точек — запрещать правильное.
     Карточка товара мерит себя на 260 и 212 — столько она и бывает в рельсе,
     к раскладке страницы эти числа отношения не имеют. */
  const inContainer = (i) => {
    const at = css.lastIndexOf('@', i)
    return at >= 0 && css.slice(at, at + 10).startsWith('@container')
  }
  for (const m of css.matchAll(/\((?:min|max)-width:\s*(\d+)px\)/g)) {
    if (inContainer(m.index)) continue
    const w = Number(m[1])
    /* Ниже 200px — не про раскладку страницы: так меряют собственную ширину
       контейнера в @container. */
    /* Шов имеет ДВА края, и оба его. Пара, не дающая правилам наложиться,
       пишется `(min-width: 860px)` и `(max-width: 859px)`: одно и то же
       решение, взятое «отсюда и выше» и «строго ниже». Признавался только
       верхний край (`w - 1`), и нижний — тот, которым пара и пишется чаще, —
       считался неназванной шириной. На cbdshop.bg так вышли обе находки
       семьи: `859` при шве 860 и `1023` в паре к её же `(min-width: 1024px)`,
       стоящему десятью строками выше. Обе — правильная запись правильного
       шва. */
    if (w >= 200 && !BREAKPOINTS.some((b) => Math.abs(b - w) <= 1)) {
      add('breakpoint', `${at(m.index)}  ${m[0]}`)
    }
  }

  /* Две семьи о том же медиазапросе (слой 8, И227).
   *
   * УЗЕЛ МЕРЯЕТ ОКНО. Правило 6 говорит: компонент меряет свой контейнер, а
   * не окно — и до 20.09.2026 не имело семьи. Замер cbdshop.bg: 146 запросов
   * по ширине окна внутри `components/*.module.css`. Карточка, спросившая
   * окно, в узкой боковой колонке на широком экране получает «широкий» вид
   * (MDN: «the card can be reused … without needing to know where it will
   * be placed»; web.dev: макро-раскладка — медиазапрос, микро — контейнер).
   * Решение уровня страницы живёт в стилях страницы и в токенах — им окно
   * мерить положено.
   *
   * СТУПЕНЬКА РАЗМЕРА НА ШВЕ. Правило 3: шов ставится там, где меняется
   * СМЫСЛ раскладки; «меняется величина — это шкала». Блок медиазапроса, в
   * котором нет ни одного свойства раскладки, а только кегль, поле, зазор,
   * ширина, — та самая ступенька, которую рампа не дописала (cbdshop: 23
   * таких блока из 173). Переменные (`--x:`) не считаются: переобъявить
   * роль на шве — законный способ сказать «здесь линия одна». */
  const LAYOUT_PROP = /^(display|grid-template[a-z-]*|grid-area|grid-column|grid-row|grid-auto[a-z-]*|flex-direction|flex-wrap|flex-basis|flex-flow|flex|order|position|inset[a-z-]*|top|left|right|bottom|visibility|place-[a-z]+|align-[a-z]+|justify-[a-z]+|overflow[a-z-]*|columns|column-count|container[a-z-]*|float|content|transform|translate|rotate|scale|clip-path|pointer-events|z-index|list-style[a-z-]*|writing-mode|direction|white-space|text-wrap|object-fit|object-position|scroll[a-z-]*|touch-action|cursor|appearance)$/
  const SIZE_PROP = /^(font-size|line-height|letter-spacing|padding[a-z-]*|margin[a-z-]*|gap|row-gap|column-gap|inline-size|block-size|width|height|min-inline-size|max-inline-size|min-width|max-width|min-block-size|max-block-size|min-height|max-height|border-radius|border[a-z-]*width|inset-[a-z]+|font-weight)$/
  for (const m of css.matchAll(/@media[^{]*\((?:min|max)-width:\s*\d+px\)[^{]*\{/g)) {
    if (inContainer(m.index)) continue
    if (rel.endsWith('.module.css') && inDirs(rel, COMPONENT_DIRS)) {
      add('nodeWindow', `${at(m.index)}  ${m[0].replace(/\s+/g, ' ').trim().slice(0, 48)} — узел меряет окно`)
    }
    let depth = 1, i = m.index + m[0].length
    const from = i
    while (i < css.length && depth) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++ }
    const body = css.slice(from, i - 1)
    const props = [...body.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/g)].map((d) => d[1])
    if (!props.length || props.some((p) => LAYOUT_PROP.test(p))) continue
    const sizes = props.filter((p) => SIZE_PROP.test(p))
    if (sizes.length) add('seamStep', `${at(m.index)}  ${m[0].replace(/\s+/g, ' ').trim().slice(0, 40)} меняет только ${[...new Set(sizes)].slice(0, 3).join(', ')} — величина, не смысл`)
  }

  /* Верхний слой браузера вместо номеров.
   *
   * Номер получает только то, что висит на экране ВСЕГДА: шапка, нижняя
   * полоса, помощник, всплывающее сообщение, ссылка «к содержимому». Их
   * пять, они не открываются, порядок между ними — решение, и у каждого
   * есть имя: `var(--layer-header)`, `var(--layer-tabbar)`, …
   *
   * Всё, что ОТКРЫВАЕТСЯ поверх страницы, номера не получает вовсе: его
   * место в верхнем слое браузера — `<dialog>` с `showModal()` для окон и
   * шторок, атрибут `popover` для меню. Что открыто последним, то и сверху;
   * это правило браузера, и перебить его чужим числом из чужого файла
   * нельзя.
   *
   * Заведено по дефекту соседнего магазина: пилюля сортировки носила
   * `z-index: 71`, чтобы её шторка перекрыла затемнение, — и закрытая
   * пилюля лезла поверх шторки фильтров. Число, поставленное элементу ради
   * его СОДЕРЖИМОГО, ломает страницу всегда, потому что спорить ему
   * приходится с числами, которых автор не видел.
   *
   * Верхний слой уносит с собой целый класс ошибок: Escape, возврат фокуса
   * и затемнение (`::backdrop`) приходят от браузера, и «нажали мимо» через
   * `closest` больше не пишется руками.
   *
   * Запрещать номера, не дав имён, нельзя: правило без реализации хуже
   * отсутствующего. Имена — в `styles/tokens.css`, семья `--layer-*`. */
  for (const m of css.matchAll(/(?<![-a-z])z-index\s*:\s*([^;}]+)/g)) {
    const v = m[1].trim()
    if (LAYER_VAR.test(v)) continue
    if (/^(auto|inherit|initial|unset|revert)$/.test(v)) continue
    const n = Number(v)
    if (Number.isFinite(n) && Math.abs(n) <= LOCAL_LAYER) continue
    add('zIndex', `${at(m.index)}  z-index:${v} — имя из ${PREFIX.layer}* или верхний слой`)
  }

  /* `!important` — сила вместо порядка. Правило с ним нельзя перебить ни
   * более точным селектором, ни более поздним файлом — только ещё одним
   * `!important`, и с этого места каскад перестаёт быть каскадом.
   *
   * Разрешён только в основании (`base.css`): сброс `[hidden]` и остановка
   * движения по `prefers-reduced-motion` обязаны перебивать всё — это и есть
   * пол, на котором стоит остальное. Взято у cbdshop.bg: там запрет держал
   * линтер, которого никто не запускал (И172). */
  if (rel !== BASE) {
    for (const m of css.matchAll(/!\s*important\b/g)) {
      add('important', `${at(m.index)}  !important — каскад перебит силой`)
    }
  }

  /* Нажатие обязано отвечать — на телефоне это единственный отклик.
   *
   * Наведение на телефоне не бывает: `@media (hover:hover)` его туда и не
   * пускает, и это правильно. Серую рамку, которую Android рисовал поверх
   * нажатого, мы сняли (`-webkit-tap-highlight-color` в `styles/base.css`):
   * она не знает ни формы предмета, ни его цвета и держится ещё долю
   * секунды после того, как палец ушёл.
   *
   * Снять чужой отклик можно только вместе со своим. Контрол, у которого
   * объявлено `:hover` и не объявлено ничего для нажатого состояния, на
   * телефоне теперь не отвечает ВОВСЕ: наведения нет, рамки нет, своего нет.
   *
   * Отклик засчитывается трёх видов, и все три — видимая перемена в момент
   * нажатия: `:active`, состояние из `aria-` (переключатель показывает
   * собственное новое положение) и состояние из `data-`. */
  const answers = (sel) => {
    if (!sel) return false
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(esc + '(?::active|\\[aria-|\\[data-)').test(css)
  }
  /* Ответ, ВЗЯТЫЙ у другого класса через `composes` (И175). Дизайн-система
     первой витрины держит нажатие в одном месте — `pressable` в
     `Control.module.css`, — а блок пишет себе только свой вид и, бывает,
     своё наведение. Проверка, читающая один файл, видела `:hover` без
     `:active` и звала это молчанием: двадцать находок, из них настоящих —
     три. Смотрится цепочка на один шаг, как и обещает сам `composes`:
     класс → что взял → есть ли у взятого `:active` в его файле. */
  const chained = new Map()
  /** Текст файла, названного в `composes … from`; путь — от файла, где написано. */
  const source = (from, at) => {
    /* Имя пакета (`@shop/ui/control.css`) — в файл по `aliases` из kit.config.json;
       без записи такой источник пуст, и взятое у него не засчитывается. */
    const alias = Object.entries(ALIASES).find(([k]) => (k.endsWith('/') ? from.startsWith(k) : from === k))
    const key = from.startsWith('.') ? join(dirname(at), from) : alias ? join(ROOT, alias[1] + from.slice(alias[0].length)) : from
    if (!chained.has(key)) chained.set(key, existsSync(key) ? strip(readFileSync(key, 'utf8')) : '')
    return { text: chained.get(key), file: key }
  }
  /** Что берёт каждый класс файла: `.x { composes: a b from './y.css' }`. */
  const composesOf = (text) => {
    const map = new Map()
    for (const m of text.matchAll(/\.([\w-]+)\s*\{[^}]*?composes\s*:\s*([^;}]+?)(?:\s+from\s+'([^']+)')?\s*[;}]/g)) {
      const list = map.get(m[1]) ?? []
      list.push({ names: m[2].trim().split(/\s+/), from: m[3] ?? null })
      map.set(m[1], list)
    }
    return map
  }
  /* Взятое может быть взято само: `.close` берёт `sheetClose` у окна, окно
     берёт `pressable` у контрола. Три шага — с запасом: цепочки длиннее в
     проектах набора не встречались. */
  const answered = (cls, text, file, depth) => {
    if (new RegExp(`\\.${cls}(?![\\w-])[^{]*:active`).test(text)) return true
    if (depth === 0) return false
    return (composesOf(text).get(cls) ?? []).some(({ names, from }) => {
      const next = from ? source(from, file) : { text, file }
      return names.some((name) => answered(name, next.text, next.file, depth - 1))
    })
  }
  /** Свойство, взятое через `composes` (И176): класс → что взял → есть ли
   *  свойство в блоке взятого, до трёх шагов. Сдержка прокрутки у окон
   *  первой витрины стоит в одном общем узле, `dialogSurface`, — и девять
   *  окон берут её, а не пишут. */
  const composedProp = (cls, prop, text, file, depth) => {
    if (new RegExp(`\\.${cls}(?![\\w-])[^{]*\\{[^}]*${prop}`).test(text)) return true
    if (depth === 0) return false
    return (composesOf(text).get(cls) ?? []).some(({ names, from }) => {
      const next = from ? source(from, file) : { text, file }
      return names.some((name) => composedProp(name, prop, next.text, next.file, depth - 1))
    })
  }
  const takes = (sel, prop) => [...sel.matchAll(/\.([\w-]+)/g)].some((m) => composedProp(m[1], prop, css, path, 3))
  const inherits = (sel) => {
    const own = [...sel.matchAll(/\.([\w-]+)/g)].map((m) => m[1])
    return own.some((cls) => (composesOf(css).get(cls) ?? []).some(({ names, from }) => {
      const next = from ? source(from, path) : { text: css, file: path }
      return names.some((name) => answered(name, next.text, next.file, 2))
    }))
  }
  /* Ответ, стоящий на том же элементе (вторая половина И175). Класс из этого
     файла надет в разметке либо на компонент, который отвечает сам
     (`<CtaPill className={styles.submit}>` — пилюля берёт нажатие в своём
     модуле), либо рядом с классом, который отвечает (`${styles.button}
     ${styles.buttonPrimary}`). Читаются соседние `.tsx`, берущие этот модуль;
     засчитывается только если ТАК надето каждое место — одно голое место без
     ответа остаётся находкой. Класс, не надетый нигде, — не ответ, а мёртвая
     одежда, и её считает своя семья. `Link` — компонент, рисующий голую
     ссылку, и голой она и судится. */
  const worn = (() => {
    const dir = dirname(path)
    const mod = basename(path).replace(/[.]/g, '\\.')
    const out = []
    for (const name of readdirSync(dir)) {
      if (!/\.(tsx|jsx)$/.test(name)) continue
      const code = readFileSync(join(dir, name), 'utf8')
      const alias = code.match(new RegExp(`import\\s+(\\w+)\\s+from\\s+'\\./${mod}'`))?.[1]
      if (alias) out.push({ alias, code })
    }
    return out
  })()
  const BARE = new Set(['Link'])
  const wornAnswered = (sel) => {
    const cls = sel.match(/\.([\w-]+)/)?.[1]
    if (!cls || !worn.length) return false
    let any = false
    for (const { alias, code } of worn) {
      const use = new RegExp(`${alias}\\.${cls}(?![\\w])`, 'g')
      let m
      while ((m = use.exec(code))) {
        any = true
        const before = code.slice(0, m.index)
        const open = before.lastIndexOf('<')
        const close = code.indexOf('>', m.index)
        if (open < 0 || close < 0) return false
        const tagText = code.slice(open, close)
        const tag = tagText.match(/^<([A-Za-z][\w.]*)/)?.[1] ?? ''
        const onComponent = /^[A-Z]/.test(tag) && !BARE.has(tag)
        const siblings = [...tagText.matchAll(new RegExp(`${alias}\\.([\\w]+)`, 'g'))].map((x) => x[1]).filter((x) => x !== cls)
        const siblingAnswers = siblings.some((s) => answers(`.${s}`) || inherits(`.${s}`))
        if (!onComponent && !siblingAnswers) return false
      }
    }
    return any
  }
  for (const m of css.matchAll(/([.#][^{},@]*?):hover/g)) {
    const raw = m[1].trim()
    if (!raw || raw.startsWith('@')) continue
    /* Спрашивается трижды. Сперва про сам селектор — так найдётся пара
       `.wrap[data-faq='sheet'] .item:hover` / `… .item:active`. Потом про
       него же без состояний: `.sw[aria-checked='true']` — это переключатель
       во включённом положении, а отвечает на нажатие переключатель, и
       отвечает он сменой того самого состояния; `:not([data-current])` —
       такое же состояние, только с отрицанием, и `.pill:active` его
       покрывает. Потом — про взятый ответ. */
    const bare = raw.replace(/:not\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim()
    if (answers(raw) || answers(bare) || inherits(raw) || wornAnswered(raw)) continue
    add('noPress', `${at(m.index)}  ${raw} — есть :hover, нет отклика на нажатие`)
  }

  /* ── нажатие не повторяет наведение ──────────────────────────────────────
   *
   * Семья-близнец предыдущей, и заведена сразу после неё — потому что
   * предыдущую чинили неправильно. Требование «на нажатие должен быть отклик»
   * выполняли, дописывая `:active` КОПИЕЙ правила `:hover`. На мыши разницы
   * не видно, а на телефоне это дефект: у пальца нет «до», касание ставит оба
   * состояния разом, и блок ПОДПРЫГИВАЛ вверх ровно в тот миг, когда его
   * вдавливают.
   *
   * Замерено на касании, до починки: кнопка «в корзину» уезжала на 1.75
   * пикселя вверх и одновременно ужималась до 0.97. Нашёл заказчик вопросом:
   * «а на телефоне при нажатии кнопка будет подниматься?» — восемь мест в
   * проекте, из них пять живых.
   *
   * Признак дешёвый и не спорный: `:active`, двигающий предмет ВВЕРХ.
   * Подъём — это «сюда можно», то есть ответ на наведение; нажатие отвечает
   * вглубь: провалом, уменьшением, тенью. Вниз двигаться `:active` не
   * запрещено. */
  for (const m of css.matchAll(/:active[^{]*\{[^}]*?(?:transform\s*:\s*translateY|translate\s*:)\s*[^;}]*?(?:\(\s*-|-\s*\d|calc\(\s*-1)/g)) {
    add('liftOnPress', `${at(m.index)}  нажатие поднимает предмет вверх — это ответ на наведение, не на нажатие`)
  }

  /* ── запас под палец не меняет размер органа ─────────────────────────────
   *
   * Палец это 44×44, и орган, нарисованный мельче по делу, обязан их иметь.
   * ВОПРОС В ТОМ, ЧЕМ. Запасом — невидимым прямоугольником, вынутым из
   * потока (примитив `tap`): раскладка вокруг о нём не знает. Или ростом —
   * и тогда орган толкает всё, что стоит с ним в одной строке.
   *
   * Дефект, купивший семью, заказчик нашёл дважды одними и теми же словами:
   * «белая полоса в верхнем меню, её уже уменьшали, почему-то она снова выше
   * стала». Полосу действительно уменьшали — и оба раза она возвращалась,
   * потому что причина была не в ней. Кнопка темы внутри неё носила
   * `min-height:44px` под `pointer:coarse`, росла с 28 до 44 и поднимала
   * полосу целиком: белого над тёмной строкой выходило 52 вместо 44.
   * Заодно съезжала вниз и надпись рядом — «кнопка не симметрична по
   * вертикали».
   *
   * Признак дешёвый: в блоке `@media (pointer:coarse)` назначен размер в
   * сорок пикселей и больше. Рост законен ровно в одном случае — органы
   * стоят ВПЛОТНУЮ колонкой, и невидимые запасы соседей наложились бы друг
   * на друга (строки списка в подвале); таких мест немного, они записаны в
   * базе храповика и объяснены комментарием на месте. Новое не заводится.
   *
   * `max(100%, …)` — это сам рецепт запаса (`.tap::after`), а не рост. */
  for (const block of coarseBlocks(css)) {
    for (const rule of block.body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = rule[1].trim()
      for (const m of rule[2].matchAll(/(?:^|;)\s*(min-)?(height|width)\s*:\s*(\d+(?:\.\d+)?)px/g)) {
        if (Number(m[3]) < 40) continue
        const drawn = drawnSize(css, sel, m[2])
        if (drawn === null || drawn >= Number(m[3])) continue
        add('tapGrows', `${at(block.at + rule.index)}  ${sel}: ${m[2]} ${drawn} → ${m[3]} под пальцем — палец меняет рисунок органа`)
      }
    }
  }

  /* Приклеенное, написанное рукой. Колонка, едущая рядом с содержимым
     (галерея товара, сводка заказа, панель фильтров), — это примитив
     `pinned` в `styles/primitives.module.css`, и потолок от окна встроен в
     него: приклеенное выше окна нельзя увидеть целиком никогда, его низ
     приходит только с концом соседа. Заказчик увидел это на ноутбуке:
     «изображение и дополнительные не помещаются в экран». Пять колонок были
     написаны рукой — `position:sticky; top:…` — и четыре из пяти без потолка.
     Поэтому семья ловит не «без потолка», а «рукой»: своё `position:sticky`
     со смещением от верха — вторая копия примитива, у которой потолок
     забудут. Полосы у самого края (`top:0` внутри своей прокрутки,
     `bottom:`) и слои шапки (`--layer-*`) — не колонки. Сам примитив пишет
     позицию через ручку и под этот поиск не попадает. */
  for (const m of css.matchAll(/position\s*:\s*sticky/g)) {
    const open = css.lastIndexOf('{', m.index)
    let depth = 1, i = open + 1
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    const block = css.slice(open, i)
    if (!/(?:^|[;{\s])top\s*:/.test(block)) continue
    if (/(?:^|[;{\s])top\s*:\s*0(?:px)?\s*[;}]/.test(block)) continue
    if (new RegExp(`z-index\\s*:\\s*var\\(${RX.layer}`).test(block)) continue
    add('stickyCap', `${at(m.index)}  приклеенное рукой — есть примитив pinned с потолком от окна`)
  }

  /* ── Прокрутка панели утекает на страницу ────────────────────────────────
   *
   * Открытое поверх страницы — шторка, окно, меню, панель фильтров — само
   * себе экран. Докрутив его до конца, палец продолжает движение, и браузер
   * по умолчанию передаёт остаток ПОДЛОЖКЕ: страница под шторкой уезжает, и
   * человек, закрыв шторку, оказывается не там, где был. Лечится одной
   * строкой — `overscroll-behavior:contain`, — и в проекте она стоит у
   * шести панелей из семи.
   *
   * Седьмой было меню телефона: `overflow-y:auto` есть, а сдержки нет. Это и
   * есть болезнь, от которой семья: правило, которое помнят шесть раз из
   * семи, — это правило, которого нет. Из живого списка Vercel
   * («overscroll-behavior: contain in modals/drawers/sheets»).
   *
   * Признак — не имя класса, а устройство: блок прокручивается САМ
   * (`overflow-y:auto|scroll`) и при этом вынут из потока или меряется
   * окном. Обычная колонка страницы под это не попадает. */
  for (const m of css.matchAll(/overflow(?:-y)?\s*:\s*(?:auto|scroll)/g)) {
    const open = css.lastIndexOf('{', m.index)
    let depth = 1, i = open + 1
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    const block = css.slice(open, i)
    const overlay = /position\s*:\s*(?:fixed|absolute)/.test(block) ||
                    /(?:max-)?(?:block-size|height)\s*:[^;}]*(?:dvh|svh|vh)/.test(block)
    if (!overlay) continue
    if (/overscroll-behavior/.test(block)) continue
    /* Сдержка, взятая через composes у общего узла окна, — та же сдержка. */
    const selector = css.slice(Math.max(css.lastIndexOf('}', open), css.lastIndexOf(';', open)) + 1, open)
    if (takes(selector, 'overscroll-behavior')) continue
    add('scrollBleed', `${at(m.index)}  панель прокручивается сама, а остаток уезжает на страницу`)
  }

  /* Полоса, которая едет не только вбок.
   *
   * `overflow-x:auto` НЕ оставляет вторую ось «видимой»: по правилу CSS она
   * тоже становится `auto`. Полоса, у которой содержимое хоть на пиксель
   * выше ячейки, начинает прокручиваться вверх-вниз — движение, которого
   * никто не задумывал и которое на телефоне выглядит поломкой.
   *
   * Заказчик нашёл это глазом на поле плиток: «в плитках какой-то скроллинг,
   * и внутри плиток, и плитки скролятся в блоке — откуда эта хуета взялась».
   * В файле не видно ничем: там написана одна ось. */
  for (const m of css.matchAll(/overflow-x\s*:\s*(?:auto|scroll)/g)) {
    const open = css.lastIndexOf('{', m.index)
    let depth = 1, i = open + 1
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    const block = css.slice(open, i)
    if (/overflow-y\s*:/.test(block)) continue
    add('railY', `${at(m.index)}  полоса едет вбок — вторая ось молча стала такой же`)
  }

  /* Одежда ползунка на том, кто не крутится.

     Полосу прокрутки браузер рисует у той коробки, которая прокручивается.
     Одета же она бывает у другой — и молчит: правило есть, крутится не он,
     браузер рисует свой родной ползунок, со стрелками на концах и во всю
     высоту.

     Дефект заказчик нашёл дважды. Сперва сам ползунок: «указатель скрола
     имеет дефект на углах, он вылазит, может просто удалить стрелку на
     концах» — одели, стало тонко и без стрелок. Потом прокрутка переехала
     внутрь панели (чтобы бегунок не ложился на дугу угла), а одежда осталась
     на листе — и родной ползунок вернулся. Второй заход того же дефекта
     через месяц, на том же месте.

     Правило было, проверки не было. Признак виден прямо в файле: одевает —
     значит крутится. `html`, `body`, `:root` и `*` не в счёт: страница
     прокручивается всегда, и говорить ей об этом нечем. */
  {
    const ruleAt = (i) => {
      const open = css.lastIndexOf('{', i)
      if (open < 0) return null
      return { open, sel: selOf(open) }
    }
    const selOf = (open) => {
      const head = css.slice(0, open)
      const cut = Math.max(head.lastIndexOf('}'), head.lastIndexOf('{'), head.lastIndexOf(';'))
      return head.slice(cut + 1).trim()
    }
    const list = (sel) => sel.split(',').map((x) => x.trim()).filter(Boolean)
    const PAGE = /^(?:html|body|:root|\*)$/

    /* Кто крутится — по всему файлу: правило с прокруткой и правило с одеждой
       живут в разных местах и в разных медиазапросах, и это нормально. */
    const scrolls = new Set()
    for (const m of css.matchAll(/overflow(?:-x|-y|-block|-inline)?\s*:\s*(?:auto|scroll)/g)) {
      const r = ruleAt(m.index)
      if (r) for (const one of list(r.sel)) scrolls.add(one)
    }

    const dressed = []
    for (const m of css.matchAll(/(?:^|[;{\s])scrollbar-(?:width|color)\s*:/g)) {
      const r = ruleAt(m.index)
      if (r) dressed.push([m.index, list(r.sel)])
    }
    /* Псевдоэлемент стоит В СЕЛЕКТОРЕ, то есть ДО открывающей скобки: его
       правило ищется вперёд, а не назад. */
    for (const m of css.matchAll(/::-webkit-scrollbar[\w-]*/g)) {
      const open = css.indexOf('{', m.index)
      if (open < 0) continue
      const sel = selOf(open)
      /* Псевдоэлемент, названный в УСЛОВИИ (`@supports selector(…)`), — не
         одежда, а вопрос «умеет ли браузер её понимать». Считая его одеждой,
         проверка объявляла хозяином сам `@supports`. */
      if (sel.startsWith('@')) continue
      dressed.push([m.index, list(sel).map((one) => one.replace(/::-webkit-scrollbar[\w-]*/, '').trim())])
    }

    for (const [i, bases] of dressed) {
      if (bases.some((one) => !one || PAGE.test(one) || scrolls.has(one))) continue
      add('barNoScroll', `${at(i)}  ползунок одет на «${bases[0]}» — а крутится не он`)
    }
  }

  /* Вид предмета, который пишет СВОЮ раскладку.
     
     Виды — это одежда: поверхность, краска, поле. Раскладку внутри предмета
     вид не меняет, и как только начинает — раскладка размножается по числу
     видов. Заказчик нашёл это глазом на листе набора: у четырёх видов плитки
     знак «куда ведёт» стоял на четырёх разных высотах, потому что строка
     подписи была написана четыре раза.

     Признак точный: ДВА правила в одном файле, селекторы которых отличаются
     только значением `[data-…]`, а тела совпадают дословно и говорят про
     раскладку. Совпадающие тела — это и есть «одна раскладка, размноженная
     по видам»; если бы они различались, это была бы разная раскладка, и
     разговор был бы другой. */
  {
    const layout = /(?:^|;)\s*(?:display|grid-template-columns|grid-template-areas|grid-column|grid-row|flex-direction)\s*:/
    const seen = new Map()
    /* Без «начала правила» в выражении: закрывающая скобка, съеденная
       предыдущим совпадением, прятала бы каждое второе правило подряд — а
       копии видов как раз и стоят подряд. Границу и так держит `[^{}]*`:
       дальше чужой скобки он не уйдёт. */
    for (const m of css.matchAll(/([^{}]*\[data-[^{}]*)\{([^{}]*)\}/g)) {
      const sel = m[1].trim()
      const body = m[2].replace(/\s+/g, '').replace(/;$/, '')
      if (!layout.test(m[2])) continue
      /* Одно объявление — это не раскладка, а состояние: «этот вид спрятан»,
         «этот вид в строку». Раскладкой считаем то, что описано НЕСКОЛЬКИМИ
         объявлениями разом: сетка, её колонки, выравнивание. Иначе семья
         ловила бы `display:none` у двух состояний одной панели — а они не
         копия раскладки, а два имени одного «не показывать». */
      if (body.split(';').filter(Boolean).length < 2) continue
      /* Селектор без значения вида: так два вида одного предмета сходятся в
         один ключ, а два разных предмета — нет. */
      const key = sel.replace(/\[data-([a-z-]+)=['"][^'"]*['"]\]/g, '[data-$1]') + '|' + body
      const was = seen.get(key)
      if (was === undefined) { seen.set(key, m.index); continue }
      add('dressLayout', `${at(m.index)}  та же раскладка уже написана выше (${at(was)}) — у другого вида того же предмета`)
    }
  }

  /* ОДНО СВОЙСТВО — ОДИН ХОЗЯИН: переход и показ на одной вещи.

     Метка слайдера отвечала на два вопроса одной шириной: переход вёл её на
     нажатие, показ — на ход кадра. Оба конца плохи, и оба замерены. На входе
     переход стоит в каскаде ВЫШЕ показа и уводит вещь за свои двести
     миллисекунд, а показ тянет обратно. На выходе, когда показ снят, вещь
     схлопывается ОДНИМ КАДРОМ: перехода от значения, которое вело показ,
     браузер не заводит. Замер на поднятом сайте: 22.0 → 6.0 за кадр, и
     заказчик увидел это глазом — «после того как полоска дошла до конца,
     какое-то дёрганье происходит».

     Признак в файле: свойство, которое названо И в кадрах показа, И в
     переходе того же предмета. «Тот же предмет» — совпадение последних двух
     частей селектора без значений видов и состояний: показ обычно объявлен
     на состоянии (`[data-on='true'] b`), а переход — на покое (`b`).

     Лечится не выбором одного из двух, а разведением по ДВУМ предметам:
     коробка едет рукой, вещь внутри — часами. */
  {
    /* Что двигают кадры показа: имя набора → набор свойств. */
    const moves = new Map()
    for (const k of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
      let depth = 1, i = k.index + k[0].length
      while (i < css.length && depth > 0) {
        if (css[i] === '{') depth++
        else if (css[i] === '}') depth--
        i++
      }
      const props = new Set()
      for (const d of css.slice(k.index, i).matchAll(/[{;]\s*([a-z-]+)\s*:/g)) props.add(d[1])
      moves.set(k[1], props)
    }
    if (moves.size) {
      /* Предмет без вида и без состояния: две последних части селектора. */
      const thing = (sel) => sel
        .replace(/\[[^\]]*\]/g, '')
        .replace(/:(?:hover|active|focus|focus-visible|focus-within|disabled)\b/g, '')
        .replace(/\s+/g, ' ').trim().split(' ').slice(-2).join(' ')
      const eased = new Map()   // предмет → какие свойства он везёт переходом
      const shown = []          // предмет → какие свойства везёт показ
      for (const r of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const sel = r[1].replace(/\/\*[\s\S]*?\*\//g, '').trim()
        if (!sel || sel.startsWith('@') || sel.startsWith('%') || /^\d/.test(sel)) continue
        const body = r[2]
        const key = thing(sel)
        const tr = body.match(/[{;]?\s*transition(?:-property)?\s*:\s*([^;}]+)/)
        if (tr) {
          const props = new Set()
          for (const part of tr[1].split(',')) {
            const name = part.trim().split(/\s+/)[0]
            if (name) props.add(name)
          }
          eased.set(key, new Set([...(eased.get(key) ?? []), ...props]))
        }
        const an = body.match(/[{;]?\s*animation(?:-name)?\s*:\s*([^;}]+)/)
        if (an) {
          for (const [name, props] of moves) {
            if (new RegExp(`(^|\\s)${name}(\\s|$)`).test(an[1])) shown.push([key, props, r.index])
          }
        }
      }
      for (const [key, props, at_] of shown) {
        const by = eased.get(key)
        if (!by) continue
        const both = [...props].filter((x) => by.has(x) || by.has('all'))
        if (both.length) {
          add('twoOwners', `${at(at_)}  «${both.join(', ')}» ведут двое: и показ, и переход одной вещи (${key})`)
        }
      }
    }
  }

  /* Пропорция без потолка: ищем блок, в котором есть aspect-ratio, и
     смотрим, есть ли в нём же ограничение высоты. */
  for (const m of css.matchAll(/aspect-ratio:/g)) {
    const open = css.lastIndexOf('{', m.index)
    let depth = 1, i = open + 1
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    const block = css.slice(open, i)
    /* Пропорция, заданная от высоты (`height:100%; aspect-ratio:1` — кружок
       в строке, который берёт её высоту и считает ширину), потолка по высоте
       не требует: высоту ей уже назначили. Правило про обратный случай —
       когда высота вычисляется из ширины и потому ничем не ограничена. */
    const byHeight = /(?:^|[;{])\s*(?:height|block-size)\s*:/.test(block)

    /* Потолок мог быть назначен ТОМУ ЖЕ селектору в основном правиле, а
       медиазапрос — менять только пропорцию. Тогда потолок никуда не делся,
       и требовать его второй раз значит требовать дубликат.

       Ровно так стояли плитки категорий и поводов: `aspect-ratio:.87;
       max-block-size:min(64svh,460px)` в основном правиле и
       `aspect-ratio:1.2` под 560. Проверка видела второе правило и не видела
       первого. */
    const cut = Math.max(css.lastIndexOf('}', open - 1), css.lastIndexOf('{', open - 1))
    const sel = css.slice(cut + 1, open)
      .replace(/\/\*[\s\S]*?\*\//g, '').trim()
    const capped = sel && new RegExp(
      sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*?(?:max-block-size|max-height)'
    ).test(css)

    /* Пропорция при ОГРАНИЧЕННОЙ ШИРИНЕ ограничена по высоте — это
       арифметика, а не послабление: квадрат шириной не больше 560 не бывает
       выше 560. Требовать сверх этого второй потолок значит требовать
       записать одно и то же дважды и следить, чтобы копии не разошлись.

       Процент не считается: `max-width:100%` не ограничивает ничего — он
       повторяет ширину родителя, которая и была неизвестной.

       Дефект, из-за которого послабление заведено: галерея товара на
       cbdshop.bg — `max-width: min(560px, 52vh); aspect-ratio: 1/1`, где
       потолок высоты записан прямо в ширине и вдобавок меряется окном. */
    const byWidth = [...block.matchAll(/(?:^|[;{])\s*max-(?:width|inline-size)\s*:\s*([^;}]+)/g)]
      .some((w) => !w[1].includes('%'))

    if (!byHeight && !byWidth && !capped && !/max-block-size|max-height/.test(block)) {
      add('ratioNoCap', `${at(m.index)}  aspect-ratio без потолка`)
    }
  }

  /* Сплошной текст, разрезанный на колонки. Многоколоночный набор годится
     списку, где каждая строка сама по себе; связному абзацу — нет: глаз,
     дочитав левую половину до низа, возвращается наверх за правой, и чем
     длиннее абзац, тем дороже этот возврат. На экране, в отличие от газеты,
     колонка не кончается вместе со страницей.

     Заведено находкой заказчика: оговорка в подвале стояла в две колонки.
     Его слова: «нахера это разбивать на два столбца, он же единый абзац».
     Лечится мерой набора (`prose`, `max-inline-size`), а не колонками.

     Сетка из `grid`/`flex` под это не попадает: там колонка — предмет, а
     не продолжение строки. Ловится именно `columns`/`column-count`. */
  for (const m of css.matchAll(/(?:^|[;{\s])(columns|column-count)\s*:/g)) {
    add('proseCols', `${at(m.index)}  ${m[1]} у сплошного текста — абзац читается сверху вниз один раз`)
  }

  /* Лестница колонок. Правило 5 говорит: число колонок ВЫЧИСЛЯЕТСЯ, а не
     назначается, — `repeat(auto-fit, minmax(280px, 1fr))` вместо ступеней
     «4 → 3 → 2» на медиазапросах. Правило было с первого дня, а проверки
     у него не было, и лестницы накопились там, где их не видно чтением
     диффа: главная сетка каталога считает колонки формулой на широком
     экране и тут же перебивает её жёсткой двойкой ниже 820.

     Ловится именно ЛЕСТНИЦА — назначение двух и более колонок внутри
     медиазапроса по ширине. Схлопывание в одну колонку не ловится: две
     колонки, ставшие одной, — это смена СМЫСЛА раскладки, и правило 3
     такой брейкпоинт прямо разрешает.

     Заведено по списку, который заказчик принёс из другого разговора:
     «сетки — auto-fit minmax(), не медиазапросы». Список назвал то, что у
     нас уже записано правилом, — и тем показал, что записанное правилом,
     но не ставшее проверкой, держится ровно до следующей сессии. */
  for (const m of css.matchAll(/@media[^{]*\((?:min|max)-width[^{]*\{/g)) {
    let depth = 1, i = m.index + m[0].length
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    const block = css.slice(m.index, i)
    for (const d of block.matchAll(/grid-template-columns\s*:\s*([^;}]+)/g)) {
      const value = d[1].trim()
      if (/auto-fit|auto-fill/.test(value)) continue
      /* Сколько колонок назначено: `repeat(N, …)` берётся числом, иначе
         считаются дорожки верхнего уровня — скобки `minmax()` и `calc()`
         при этом не разрезаются. */
      const rep = value.match(/repeat\(\s*(\d+)/)
      const list = value.split(/\s+(?![^(]*\))/)
      const tracks = rep ? +rep[1] : list.length
      if (tracks < 2) continue
      /* Только РАВНЫЕ дорожки. `72px minmax(0,1fr)` — снимок и подпись
         рядом, `calc(100% * 5/12) minmax(0,1fr) auto` — разворот с полем:
         это композиция, у которой дорожки разного рода, а не полка из
         одинаковых ячеек. Правило 5 про число ячеек, и загонять под него
         композицию значит учить закрывать глаза на проверку. */
      if (!rep && new Set(list).size > 1) continue
      add('colLadder', `${at(m.index + d.index)}  ${tracks} колонок назначено в медиазапросе — число колонок вычисляется (правило 5)`)
    }
  }

  /* ── взятое и берущий спорят об одном свойстве ────────────────────────────
   *
   * `composes` не вкладывает правило в правило — он ДОПИСЫВАЕТ класс рядом:
   * на элементе оказываются оба, и вес у них одинаковый (0,1,0). Кто победит,
   * решает порядок правил в собранном файле, а его решает сборщик: порядок
   * кусков меняется от того, какая страница попала в сборку первой. Значит
   * правило, переопределяющее взятое, работает «пока работает» — и
   * разъезжается между разработкой и боем, между двумя выкатами.
   *
   * Переопределяют ручкой (`--pinned-pos: static` вместо `position: static`)
   * или силой места (потомочный селектор). Ни то ни другое не спорит.
   *
   * `:where()` у взятого — не спор: его вес ноль, и переопределять его берущий
   * вправе. Это и есть тот способ, которым общий узел сознательно уступает.
   *
   * Дефект: 19.09.2026 на cbdshop.bg три приклеенные колонки взяли примитив
   * `pinned` и тут же написали себе `position: static` под свою узкую
   * раскладку — тот же вес, тот же элемент. На витрине это ловил её
   * собственный сторож; в наборе такого правила не было, и следующая витрина
   * получила бы то же самое молча. */
  /** Правила ГОЛОГО класса: селектор ровно `.имя`, где бы он ни стоял —
   *  и в медиазапросе тоже: медиазапрос веса не добавляет, и порядок решает
   *  ровно так же. Что задаёт голый класс, то и спорит. */
  const bareRules = (text, name) => {
    const out = []
    for (const rule of text.matchAll(new RegExp(`([^{}]*)\\{([^{}]*)\\}`, 'g'))) {
      if (!rule[1].split(',').some((part) => part.trim() === `.${name}`)) continue
      out.push({ at: rule.index, body: rule[2] })
    }
    return out
  }
  const declared = (body) =>
    new Map(
      [...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:\s*([^;}]+)/g)]
        .filter((d) => d[1] !== 'composes' && !d[1].startsWith('--'))
        .map((d) => [d[1], d[2].trim()]),
    )

  for (const [cls, taken] of composesOf(css)) {
    const own = new Map()
    for (const rule of bareRules(css, cls)) {
      for (const [prop, value] of declared(rule.body)) own.set(prop, { value, at: rule.at })
    }
    if (!own.size) continue
    for (const { names, from } of taken) {
      /* Взятое из ЭТОГО же файла спора не создаёт: оба правила едут одним
         куском и в том порядке, в котором написаны, — побеждает нижнее, и
         это видно чтением. Разъезжается только взятое из ЧУЖОГО файла:
         куски собираются в том порядке, в каком их затребовали страницы. */
      if (!from) continue
      const next = source(from, path)
      if (!next.text) continue
      for (const name of names) {
        for (const rule of bareRules(next.text, name)) {
          /* Вес у взятого снят намеренно (`:where()`) — спора нет: взятое
             само уступило, и переопределять его берущий вправе. */
          if (/:where\(/.test(next.text.slice(Math.max(0, rule.at - 120), rule.at + 1))) continue
          for (const [prop, value] of declared(rule.body)) {
            const mine = own.get(prop)
            if (!mine || mine.value === value) continue
            add('takenTwice', `${at(mine.at)}  .${cls} и взятое у него .${name}: оба задают ${prop} — победит порядок кусков сборки`)
          }
        }
      }
    }
  }
}

/* ── шкала и её рампы: три семьи, читающие сам файл токенов ───────────────
   Файл шкал стоит в EXEMPT: числа в px внутри clamp() — его работа. Но три
   правила ниже — именно о нём, и потому читаются здесь, мимо исключения.
   `at` и `add` свои: цикл выше этот файл не открывает. */
{
  const sheets = files.map((path) => {
    const rel = relative(ROOT, path)
    const css = strip(readFileSync(path, 'utf8'))
    return { rel, css, at: (index) => `${rel}:${css.slice(0, index).split('\n').length}` }
  })
  const seen = new Set()
  const add = (fam, line) => { if (!seen.has(fam + line)) { seen.add(fam + line); found[fam].push(line) } }

  /* Рампа обязана иметь px/rem-слагаемое.

     `clamp(17.5px, 3.4cqi, 21px)` растёт только с шириной: при зуме 200%
     ширина в CSS-пикселях вдвое меньше, и размер уезжает на пол — текст не
     увеличивается, это провал WCAG 1.4.4 (техника F94). Utopia пишет
     середину как `rem + vw` ровно поэтому: rem-слагаемое — единственное, что
     растёт при зуме. Голый `vw` вдобавок не проходит через названные точки:
     у соседней витрины `clamp(48px, 6.1vw, 88px)` стоял на полу до 787px —
     ступень, замаскированная под рампу (docs/layers.md, §3.1).
     Наклон между двумя ступенями шкалы (`clamp(var(--sp-8), 4.62vw - 9.85px,
     var(--sp-9))`) слагаемое имеет; чистая ссылка на ступень — не рампа. */
  for (const { css, at } of sheets) {
    for (const m of css.matchAll(/clamp\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
      const parts = m[1].split(',')
      if (parts.length !== 3) continue
      const mid = parts[1].replace(/var\([^()]*\)/g, ' ')
      if (!/\d(vw|vi|vh|cqi|cqw|cqb|cqmin|cqmax)\b/.test(mid)) continue
      if (/\d(px|rem|em)\b/.test(mid)) continue
      add('bareVw', `${at(m.index)}  ${m[0].slice(0, 48)}`)
    }
  }

  /* Две семьи ниже спрашивают РОЛИ — поле и воздух. С 21.09.2026 роли
     выпускает строитель в `styles/scale.css`, а `tokens.css` остался файлом
     всего остального; читаются оба. Семья, оставшаяся на одном файле,
     не покраснела бы после переезда — она бы замолчала нулём (И202). */
  for (const sheet of sheets.filter((s) => s.rel === LADDER || s.rel === TOKENS)) {
    const { css, at } = sheet

    /* Поле рядом с текстом — в rem.

       Роль `--pad-*` лежит вокруг содержимого предмета, то есть вокруг букв.
       Объявленная в px или ступенью px-шкалы, она не растёт, когда покупатель
       поднял шрифт в настройках телефона: буквы крупнее, коробка та же —
       тесно становится тому, кому нужно просторнее (WCAG 1.4.4; решение
       заказчика 20.09.2026, docs/layers.md, §3.5). Воздух (`--air-*`) и зазор
       между целями (`--gap-*`) с текстом не связаны и остаются в px. */
    for (const m of css.matchAll(/(?:^|[;{])\s*(--pad-[\w-]+)\s*:\s*([^;}]+)/g)) {
      const value = m[2]
      if (/^\s*var\(--pad-[\w-]+\)\s*$/.test(value)) continue
      const bare = value.replace(/var\([^()]*\)/g, ' ')
      if (/\dpx\b/.test(bare) || /var\(--sp-\d/.test(value)) {
        add('padPx', `${at(m.index)}  ${m[1]}: ${value.trim().slice(0, 40)}`)
      }
    }

    /* Воздух между разделами — не меньше трёх полей карточки.

       Замер семи живых магазинов 20.09.2026 (docs/layers.md, §3.3):
       промежуток между полосами страницы к полю внутри карточки держится
       3–5 : 1 (Muji 2.6→3.5, Glossier 5). Ниже трёх предметы и промежутки
       одного размера — глаз не отличает «внутри» от «между», и ритма нет. У
       набора было 2.7 : 1. Сравниваются оба конца рампы: телефон и монитор. */
    const declOf = (name) => {
      const hit = css.match(new RegExp('(?:^|[;{])\\s*' + name + '\\s*:\\s*([^;}]+)'))
      return hit ? hit[1].trim() : null
    }
    const toPx = (text) => {
      const n = text.match(/(-?[\d.]+)(px|rem)\b/)
      return n ? Number(n[1]) * (n[2] === 'rem' ? 16 : 1) : null
    }
    const endsOf = (value, depth = 0) => {
      if (!value || depth > 4) return null
      const alias = value.match(/^var\((--[\w-]+)\)$/)
      if (alias) return endsOf(declOf(alias[1]), depth + 1)
      const ramp = value.match(/^clamp\(([^,]+),.*,([^,]+)\)$/)
      if (ramp) {
        const lo = toPx(ramp[1]), hi = toPx(ramp[2])
        return lo !== null && hi !== null ? [lo, hi] : null
      }
      const one = toPx(value)
      return one !== null ? [one, one] : null
    }
    const air = endsOf(declOf('--air-page')), pad = endsOf(declOf('--pad-card'))
    if (air && pad && pad[0] > 0 && pad[1] > 0) {
      const lo = air[0] / pad[0], hi = air[1] / pad[1]
      if (lo < 3 || hi < 3) {
        add('airRatio', `${at(css.indexOf('--air-page'))}  --air-page : --pad-card = ${lo.toFixed(2)} на телефоне, ${hi.toFixed(2)} на мониторе (норма ≥ 3)`)
      }
    }
  }

  /* Узел берёт роль, а не оттенок.
   *
   * Три яруса, ссылки в одну сторону (docs/layers.md, §4): hex — только в
   * файле палитры; роли ссылаются на палитру; узлы — только на роли. Имя
   * по оттенку (--sage-12) — ярус ЗНАЧЕНИЙ, и это не дефект сам по себе:
   * так его называют все. Дефект — когда к нему тянется узел, минуя роль:
   * тогда один вопрос решается в двух местах и они расходятся молча.
   *
   * Цена показана 21.09.2026: плашка скидки стояла `background:
   * var(--amber-9)`, заказчик выбрал скидке фиалку, она легла в палитру
   * ролью `--sale-9` — и до плашки не дошла (И205). Пятьдесят пять мест
   * перевели на роли, а сторожа не завели: следующий узел снова возьмёт
   * оттенок, и никто не заметит.
   *
   * Семьи яруса значений — `kit.config.json`, ключ `hues`: у каждого
   * проекта свои имена, и помнить их проверке нельзя. */
  if (HUES.length) {
    const hue = hueRx(HUES)
    for (const { rel, css, at } of sheets) {
      if (EXEMPT.includes(rel) || rel === LADDER) continue
      for (const m of css.matchAll(hue)) {
        add("hueDirect", `${at(m.index)}  ${m[0].replace("var(", "").trim()}… — возьмите роль`)
      }
    }
  }

  /* Имена и ярусы — слой 1 (И224).
   *
   * Четыре семьи, все по одному реестру `tools/names.mjs`:
   *   nameGrammar — объявленное имя не разбирается: понятие не из списка
   *                 (sage, cyan, live — по виду; btnBgHov — не по форме);
   *   stepDirect  — файл узла читает ступень напрямую: сырьё только для
   *                 ссылок из роли. Оптика не выше пола (--sp-1, --sp-2) —
   *                 законна, геометрия органа не течёт;
   *   deadName    — объявлено в стилях, а читателя нет ни в стилях, ни в коде,
   *                 ни в инструментах, и роль не из списка обязательных;
   *   tierUp      — сырьё читает роль, роль читает ручку узла, ручка узла
   *                 объявлена на корне (так --stack стал шрифтовым стеком, и
   *                 отступ примитива stack был нулём).
   * Замер 20.09.2026: 50 имён без читателя, узлы читали --live-3 / --live-11
   * и --sp-N в двадцати пяти местах, --n сетки совпадал с семьёй --n-N. */
  {
    const valueFiles = new Set([LADDER, TOKENS, 'styles/palette.css'].filter(Boolean))
    let sets = {}
    try { sets = JSON.parse(readFileSync(join(ROOT, 'styles/scale.json'), 'utf8')) } catch { /* набора шкал нет — оптика пуста */ }
    const allowed = optics(sets, SPACING_FLOOR)
    const declaredWhere = new Map()
    for (const { rel, css } of sheets) for (const [name, d] of declarations(css)) if (!declaredWhere.has(name)) declaredWhere.set(name, { rel, ...d })
    const everything = sheets.map((s) => s.css).join('\n') + codeText()
    for (const { rel, css, at } of sheets) {
      const decls = declarations(css)
      for (const [name, d] of decls) {
        const p = parseName(name)
        if (!p) { add('nameGrammar', `${at(d.index)}  ${name}`); continue }
        if (p.tier === 'node' && rel === TOKENS) add('tierUp', `${at(d.index)}  ${name} — ручка примитива объявлена на корне`)
        for (const r of reads(d.value)) {
          const q = parseName(r)
          if (!q) continue
          if (p.tier === 'value' && q.tier !== 'value') add('tierUp', `${at(d.index)}  ${name} читает ${r} (${q.tier})`)
          if (p.tier === 'role' && q.tier === 'node') add('tierUp', `${at(d.index)}  ${name} читает ручку узла ${r}`)
        }
        if (p.tier !== 'value' && !REQUIRED[name] && !new RegExp(`var\\(\\s*${name}(?![\\w-])`).test(everything) && !new RegExp(`${name}(?![\\w-])`).test(codeText())) {
          add('deadName', `${at(d.index)}  ${name}`)
        }
      }
      if (valueFiles.has(rel) || EXEMPT.includes(rel)) continue
      for (const m of css.matchAll(/var\(\s*(--[a-z][a-z0-9-]*)/g)) {
        const q = parseName(m[1])
        if (q?.tier === 'value' && !allowed.has(m[1])) add('stepDirect', `${at(m.index)}  ${m[1]} — возьмите роль`)
      }
    }
  }

  /* Оси — слой 2 (И225). Четыре семьи по реестру `tools/axes.mjs`:
   *   axisUnknown — @media по признаку, которого в реестре нет (orientation,
   *                 resolution, prefers-color-scheme вне списка): ось не
   *                 названа — значит не проверяется и не показывается;
   *   axisTheme   — `--*:` под [data-theme] или prefers-color-scheme: тема
   *                 ставит только color-scheme, цвет живёт в light-dark()
   *                 (next_theming, правило 1 и проверка 5);
   *   axisScope   — под pointer / hover меняется раскладка или видимость:
   *                 «по ним меняют размер цели и отклик, но не прячут
   *                 содержимое и не переключают раскладку» (next_responsive,
   *                 правило 17);
   *   axisHover   — :hover вне @media (hover: hover): залипшая кнопка на
   *                 телефоне (правило 16). */
  for (const { rel, css, at } of sheets) {
    const stack = []
    let pending = null
    for (const m of css.matchAll(/\{|\}|:hover\b|@media[^{]*/g)) {
      const t = m[0]
      if (t.startsWith('@media')) { pending = t; continue }
      if (t === '{') { stack.push(pending ?? ''); pending = null; continue }
      if (t === '}') { stack.pop(); continue }
      if (!stack.some((q) => /hover\s*:\s*hover/.test(q))) add('axisHover', `${at(m.index)}  :hover вне (hover: hover)`)
    }
    for (const m of css.matchAll(/@media([^{]*)\{/g)) {
      const key = axisOf(m[1])
      let depth = 1, i = m.index + m[0].length
      const from = i
      while (i < css.length && depth) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++ }
      const body = css.slice(from, i - 1)
      if (!key) { add('axisUnknown', `${at(m.index)}  @media${m[1].trim().slice(0, 50)}`); continue }
      if (key === 'theme' && /--[a-z][a-z0-9-]*\s*:/.test(body)) add('axisTheme', `${at(m.index)}  переменная под prefers-color-scheme`)
      if (key === 'pointer') {
        const bad = body.match(POINTER_FORBIDDEN)
        if (bad) add('axisScope', `${at(m.index)}  ${bad[1]} под ${m[1].trim().slice(0, 30)}`)
      }
    }
    for (const m of css.matchAll(/\[data-theme[^\]]*\]\s*\{([^}]*)\}/g)) {
      if (/--[a-z][a-z0-9-]*\s*:/.test(m[1])) add('axisTheme', `${at(m.index)}  переменная под [data-theme]`)
    }
  }

  /* Швы в обе стороны (слой 8, И227). Семья `breakpoint` выше ловит ширину
   * в CSS, которой нет в реестре; эта — запись реестра, которую не читает ни
   * один медиазапрос и ни один конец рампы. Реестр без читателя — та же
   * «цифра без причины», только с другой стороны: cbdshop.bg держал 1080 и
   * 560 списком, а в CSS их читали только концы рамп. Концы рамп — тоже
   * решение о ширине, они считаются. */
  /* Пока файлов стилей нет вовсе, решать нечего — проверка молчит нулём,
     как check:port без packages/ (И168): реестр набора на пустом проекте —
     не долг. */
  if (sheets.length) {
    let ends = []
    try { ends = Object.values(JSON.parse(readFileSync(join(ROOT, 'styles/scale.json'), 'utf8'))).flatMap((s) => s.ширины ?? []) } catch { ends = [] }
    for (const line of deadSeams(SEAMS, sheets, ends)) add('deadSeam', `tools/seams.mjs  ${line}`)
  }

  /* Единицы окна (слой 8, И227). `100vw` считается без полосы прокрутки
   * только если её нет: на десктопе с классической полосой блок в 100vw
   * шире страницы и рождает горизонтальную прокрутку; `100vh` на телефоне
   * равен большому окну (lvh) — низ под адресной строкой. Ширина «во всю
   * страницу» — 100 %; высота шторки — `dvh`; потолок кадра — `svh`.
   * `container-type: size` схлопывает узел без назначенной высоты в ноль
   * (спецификация: «intrinsic sizes … determined as if the element had no
   * content») — узлу нужен `inline-size`. */
  for (const { rel, css, at } of sheets) {
    for (const m of css.matchAll(/\b100(vw|vh|lvw|lvh)\b/g)) add('fullVw', `${at(m.index)}  100${m[1]}`)
    for (const m of css.matchAll(/container-type\s*:\s*size\b/g)) add('sizeContain', `${at(m.index)}  container-type: size`)
  }

  /* Имя без объявления (И231).
   *
   * `var(--x)` без запасного значения, когда `--x` не объявлен нигде в
   * стилях набора, делает НЕДЕЙСТВИТЕЛЬНОЙ всю запись, а не только себя:
   * `font-family: var(--face)` при `--face: var(--f-plex), var(--face-stack)`
   * и необъявленном `--f-plex` падает не на стек рядом, а на унаследованное,
   * то есть на умолчание браузера. Замер 21.09.2026: страница на чистых
   * стилях набора садилась на Times New Roman — при том, что строка рядом
   * обещала обратное. В файле дефекта не видно: обе переменные выглядят
   * верными, и стенды маскировали его собственным `font-family`.
   *
   * Ручка примитива, которую ставит узел или код, объявляется не в стилях —
   * поэтому спрашивается только имя БЕЗ запасного значения: у ручки оно
   * есть всегда (`var(--tap, var(--ctrl-target))`). */
  {
    const declared = new Set()
    for (const { css } of sheets) {
      for (const d of css.matchAll(/(?:^|[;{])\s*(--[a-z][a-z0-9-]*)\s*:/g)) declared.add(d[1])
    }
    for (const { rel, css, at } of sheets) {
      if (EXEMPT.includes(rel) && rel !== TOKENS && rel !== LADDER) continue
      for (const m of css.matchAll(/var\(\s*(--[a-z][a-z0-9-]*)\s*\)/g)) {
        if (declared.has(m[1])) continue
        add('varMissing', `${at(m.index)}  ${m[1]} — читается, не объявлен, запасного значения нет`)
      }
    }
  }

  /* Утилиты и исключения (слой 13, И230).
   *
   * Исключение — ПОМЕТКА на существующем предмете, а не второй класс и не
   * клон: CUBE — «состояния через атрибут», «не должно variate a block to
   * the point where it isn't recognisable anymore». У набора это уже
   * заведено (`data-size`, `data-tray`, `data-ground`), и у атрибута есть
   * второе достоинство: вес `.chip[data-chip='lab']` (0,2,0) бьёт голый
   * `.chip` (0,1,0) при любом порядке файлов — поэтому слоёв каскада
   * (`@layer`) набор не заводит вовсе (docs/decisions.md).
   *
   * `dressClass`: класс, чьё имя начинается с имени другого класса, все
   * свойства которого уже есть у базы И который ПЕРЕОДЕВАЕТ её — то есть
   * переобъявляет не меньше половины её собственных свойств (`.chipLab`
   * шесть из десяти у `.chip`, `.sectionTight` единственное у `.section`).
   * ЧАСТЬ предмета свои свойства приносит (`.sectionHead`, `.ledeText`,
   * `.chanMark`) либо задевает базу краем: `.ledeSpill` внутри
   * контейнерного запроса объявляет один `display: contents` из шести
   * свойств `.lede` — это растворяющаяся обёртка, а не вторая одежда.
   *
   * `stateClass`: состояние именем класса (`.is-open`, `.active`,
   * `.disabled`) — вспомогательная техника его не видит, и порядок файлов
   * снова решает, кто победит.
   *
   * `dressGrown`: вариант объявил свойств больше, чем сам предмет, — блок
   * перестал быть узнаваемым, и это уже новый блок, а не исключение. */
  const STATE_NAME = /^(?:is|has)[-A-Z]|^(?:active|open|opened|closed|selected|current|disabled|checked|loading|busy|error|invalid|hidden|shown|expanded|collapsed|dragging|pressed)$/
  for (const { rel, css, at } of sheets) {
    if (EXEMPT.includes(rel)) continue
    const own = new Map()
    const where = new Map()
    for (const rule of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const m = /^\.([A-Za-z][\w-]*)$/.exec(rule[1].trim())
      if (!m) continue
      const set = own.get(m[1]) ?? new Set()
      for (const d of rule[2].matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/g)) set.add(d[1])
      own.set(m[1], set)
      if (!where.has(m[1])) where.set(m[1], rule.index)
    }
    for (const [name, props] of own) {
      if (STATE_NAME.test(name)) {
        add('stateClass', `${at(where.get(name))}  .${name} — состояние классом, нужен атрибут`)
        continue
      }
      if (!props.size) continue
      for (const [base, baseProps] of own) {
        if (base === name || base.length < 3 || !name.toLowerCase().startsWith(base.toLowerCase())) continue
        if (![...props].every((p) => baseProps.has(p))) continue
        if (props.size * 2 < baseProps.size) continue
        add('dressClass', `${at(where.get(name))}  .${name} — вариант .${base} вторым классом: атрибут или ручка`)
        break
      }
    }
    for (const rule of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const m = /^\.([A-Za-z][\w-]*)\[[^\]]+\]$/.exec(rule[1].trim())
      if (!m || !own.has(m[1])) continue
      const n = [...rule[2].matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/g)].length
      if (n > own.get(m[1]).size) add('dressGrown', `${at(rule.index)}  ${rule[1].trim().slice(0, 40)} — свойств ${n} против ${own.get(m[1]).size} у базы`)
    }
  }

  /* Движение и состояния (слой 10, И229).
   *
   * Длительность числом в узле — движение, подобранное под один блок:
   * cbdin набрал 11 находок семьи `motion`, и ни одна не была ролью. Три
   * роли по работе — `--press-t`, `--hover-t`, `--open-t` — и две кривые;
   * число миллисекунд вне файла ролей и основания (там живёт блок
   * `prefers-reduced-motion` с .01ms) — семья `msLiteral`. Сами роли
   * спрашиваются с коридоров MOTION (Atlassian 50…150 / 150…400, Carbon до
   * 700, M3 — не больше шести) — `motionOut`; вуали состояния и выключенное —
   * с STATE (M3 8 / 10 / 16 %, замер тихой кнопки 4…5 %) — `stateOut`. */
  for (const { rel, css, at } of sheets) {
    if (EXEMPT.includes(rel) || rel === LADDER || rel === TOKENS || rel === BASE) continue
    for (const m of css.matchAll(/(?<![-a-z])(?:transition|animation)(?:-duration|-delay)?\s*:\s*([^;}]+)/g)) {
      const v = m[1].replace(/var\([^)]*\)/g, '').replace(/cubic-bezier\([^)]*\)/g, '')
      const d = v.match(/(?:^|[\s,])(\d*\.?\d+)(m?s)\b/)
      if (d && Number(d[1]) > 0) add('msLiteral', `${at(m.index)}  ${d[1]}${d[2]} — возьмите --press-t / --hover-t / --open-t`)
    }
  }
  {
    const tokens = sheets.find((s) => s.rel === TOKENS)
    if (tokens) {
      const { css, at } = tokens
      const ms = (name) => {
        const m = css.match(new RegExp(`(?:^|[;{])\\s*${name}\\s*:\\s*([\\d.]+)(m?s)\\b`))
        return m ? { ms: m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]), i: m.index } : null
      }
      for (const [name, [lo, hi]] of [['--press-t', MOTION.press], ['--hover-t', MOTION.hover], ['--open-t', MOTION.open]]) {
        const d = ms(name)
        if (!d) { add('motionOut', `${TOKENS}  нет роли ${name}`); continue }
        if (d.ms < lo || d.ms > hi) add('motionOut', `${at(d.i)}  ${name}: ${d.ms}ms вне ${lo}…${hi}`)
        if (d.ms > MOTION.max) add('motionOut', `${at(d.i)}  ${name}: ${d.ms}ms дольше ${MOTION.max} — ожидание, не переход`)
      }
      const durations = [...css.matchAll(/(?:^|[;{])\s*(--[a-z-]+-t)\s*:\s*[\d.]+m?s\b/g)].map((m) => m[1])
      if (durations.length > MOTION.tokens) add('motionOut', `${TOKENS}  длительностей ${durations.length}, не больше ${MOTION.tokens}: ${durations.join(', ')}`)
      const pct = (name) => { const m = css.match(new RegExp(`(?:^|[;{])\\s*${name}\\s*:\\s*([\\d.]+)%`)); return m ? { v: Number(m[1]) / 100, i: m.index } : null }
      for (const [name, [lo, hi]] of [['--state-hover', STATE.hover], ['--state-press', STATE.press]]) {
        const p = pct(name)
        if (!p) { add('stateOut', `${TOKENS}  нет роли ${name}`); continue }
        if (p.v < lo || p.v > hi) add('stateOut', `${at(p.i)}  ${name}: ${Math.round(p.v * 100)}% вне ${lo * 100}…${hi * 100}%`)
      }
      const off = css.match(/(?:^|[;{])\s*--state-off\s*:\s*([\d.]+)/)
      if (!off) add('stateOut', `${TOKENS}  нет роли --state-off`)
      else if (Number(off[1]) < STATE.off[0] || Number(off[1]) > STATE.off[1]) add('stateOut', `${at(off.index)}  --state-off: ${off[1]} вне ${STATE.off.join('…')}`)
    }
  }

  /* Цвет, рождённый вне палитры (И295; CLAUDE.md, «Делается только
   * правильно — сразу, а не по вопросу заказчика»: «краска и её оттенок —
   * строитель палитры → роль»).
   *
   * Дефект, купивший семью: тона хвоста главной кнопки смешивались прямо в
   * её стилях (`color-mix(… 60% …)`), кромка выключенной — 20 % чернил, вуаль
   * героя — 86 / 72 %, тени, черта и вся палуба — долями в tokens.css и
   * base.css. Их контраст не считал никто, панель вида не могла их
   * гарантировать, а смена палитры меняла их по чужой формуле. Проверки были
   * зелёные — нарушение просто не мерилось.
   *
   * Находка — объявление, в значении которого краска родилась на месте:
   *   · литерал — `#hex`, `rgb()`/`hsl()`/`hwb()`/`lab()`/`lch()`/`oklab()`/
   *     `oklch()`/`color()`, имя краски (`white`, `red`…); `transparent`,
   *     `currentColor`, `inherit` и системные краски (`Canvas`, `Highlight`)
   *     — не краски палитры и не находка;
   *   · `color-mix()` с долей числом или без доли вовсе (молчаливые 50 %).
   *     Доля ролью — `var(--state-hover)` — законна: это механизм состояния
   *     набора (И229); доля ручкой узла (`--leaf-in: 14%`) — тот же литерал,
   *     спрятанный в переменную.
   * Не меряются: файл палитры (`styles/palette.css` — его выпускает
   * строитель, это единственное место, где цвет рождается); маска
   * (`mask`, `mask-image` — берёт у краски только прозрачность); панель вида
   * (`look-panel/`) — она вне сайта, рисует саму себя своими красками и
   * после финала снимается целиком (PANEL.md). */
  {
    const NAMED = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '))
    /* Свойства, в значениях которых имя — не краска: гарнитура, имя
       анимации, область сетки, имя контейнера, текст. Маска — см. выше. */
    const NOT_PAINT = /^(?:font|animation|transition|grid-area|grid-template|grid-row|grid-column|container|content|quotes|counter-|view-transition|will-change|list-style-type|mask|-webkit-mask)/
    /** Тело вызова `name(` с уравновешенными скобками: [начало тела, конец]. */
    const callsOf = (text, name) => {
      const out = []
      const rx = new RegExp(`(?<![\\w-])${name}\\(`, 'gi')
      for (const m of text.matchAll(rx)) {
        let depth = 1, i = m.index + m[0].length
        const from = i
        while (i < text.length && depth) { if (text[i] === '(') depth++; else if (text[i] === ')') depth--; i++ }
        out.push(text.slice(from, i - 1))
      }
      return out
    }
    /** Верхние запятые списка аргументов. */
    const topArgs = (body) => {
      const out = []
      let depth = 0, from = 0
      for (let i = 0; i < body.length; i++) {
        if (body[i] === '(') depth++
        else if (body[i] === ')') depth--
        else if (body[i] === ',' && depth === 0) { out.push(body.slice(from, i).trim()); from = i + 1 }
      }
      out.push(body.slice(from).trim())
      return out
    }
    /** Почему значение рождает краску, или null. */
    const bornHere = (value) => {
      const v = value.replace(/url\([^)]*\)/gi, ' ')
      const hex = v.match(/#[0-9a-f]{3,8}(?![\w-])/i)
      if (hex) return `литерал ${hex[0]}`
      const fn = v.match(/(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i)
      if (fn) return `литерал ${fn[1]}()`
      for (const m of v.replace(/var\(\s*--[\w-]+/g, ' ').matchAll(/(?<![\w-])([a-z]+)(?![\w-])/gi)) {
        if (NAMED.has(m[1].toLowerCase())) return `имя краски ${m[1]}`
      }
      for (const body of callsOf(v, 'color-mix')) {
        const colours = topArgs(body).slice(1)
        let shares = 0
        for (const arg of colours) {
          const plain = arg.replace(/var\([^()]*(?:\([^()]*\)[^()]*)*\)/g, (r) => r.replace(/[\d%]/g, ' '))
          const pct = plain.match(/(\d*\.?\d+)%/)
          if (pct) return `color-mix с долей числом ${pct[0]}`
          const refs = [...arg.matchAll(/var\(\s*(--[\w-]+)/g)].map((r) => r[1])
          /* Доля — вторая ссылка аргумента (`var(--ink) var(--state-hover)`)
             или ссылка после краски-литерала. */
          const share = refs.length > 1 ? refs[refs.length - 1] : null
          if (!share) continue
          shares++
          const p = parseName(share)
          if (!p || p.tier !== 'role') return `color-mix с долей ручкой узла ${share}`
        }
        if (!shares) return 'color-mix без доли — молчаливые 50 %'
      }
      return null
    }
    /** Объявления файла на любой глубине — и во вложенных правилах
     *  (`:root{ … &:lang(bg){ … } … }`): текст между `;`, `{` и `}` вне
     *  скобок; то, что стоит перед `{`, — селектор, не объявление. */
    const declsOf = (css) => {
      const out = []
      let from = 0, depth = 0, paren = 0
      for (let i = 0; i < css.length; i++) {
        const c = css[i]
        if (c === '(') paren++
        else if (c === ')') paren = Math.max(0, paren - 1)
        else if (paren === 0 && (c === ';' || c === '{' || c === '}')) {
          const text = css.slice(from, i)
          if (c !== '{' && depth > 0 && text.includes(':')) out.push({ text, at: from + (text.length - text.trimStart().length) })
          if (c === '{') depth++
          if (c === '}') depth = Math.max(0, depth - 1)
          from = i + 1
        }
      }
      return out
    }
    for (const { rel, css, at } of sheets) {
      if (rel === PALETTE || rel.split('/').includes('look-panel')) continue
      for (const { text, at: here } of declsOf(css)) {
        const colon = text.indexOf(':')
        const prop = text.slice(0, colon).trim().toLowerCase()
        if (!prop || NOT_PAINT.test(prop)) continue
        const why = bornHere(text.slice(colon + 1))
        if (why) add('colorOut', `${at(here)}  ${prop} — ${why}: краску выпускает строитель палитры ролью (tools/palette.mjs), стили её читают`)
      }
    }
  }

  /* Форма (слой 9, И228): радиус, линия и тень — роли, не числа.
   *
   * Радиус числом в узле — та же «маленькая кнопка и маленькое поле разного
   * маленького»: cbdshop держал 12 имён радиусов и ещё сырые 40 / 36 по
   * узлам. Тень числом — тень, «подобранная на глаз под конкретный блок»
   * (Refactoring UI); в forced-colors она стирается, и предмет без обводки
   * исчезает вместе с ней. Толщина линии не масштабируется и не выбирается
   * по месту (Spectrum: 1 / 2 / 4 со смыслом). Полный круг — только главное
   * действие (Spectrum): `--r-pop` вне домов контролов — размытое выделение.
   * `0`, `50%` и `inherit` у радиуса — не число из головы: круг и «как у
   * родителя» смысла не выбирают. */
  for (const { rel, css, at } of sheets) {
    if (EXEMPT.includes(rel) || rel === LADDER || rel === TOKENS) continue
    for (const m of css.matchAll(/(?:^|[;{])\s*border-radius\s*:\s*([^;}]+)/g)) {
      const v = m[1].replace(/var\([^)]*\)/g, '').trim()
      if (/\d*\.?\d+(?:px|rem|em)\b/.test(v)) add('radiusPx', `${at(m.index)}  border-radius:${m[1].trim().slice(0, 40)} — возьмите --r-*`)
    }
    for (const m of css.matchAll(/(?:^|[;{])\s*box-shadow\s*:\s*([^;}]+)/g)) {
      const v = m[1].replace(/var\([^)]*\)/g, '').replace(/color-mix\([^)]*\)/g, '')
      if (/(?:^|[\s,])(?!0(?:px)?\b)\d*\.?\d+px\b/.test(v)) add('shadowPx', `${at(m.index)}  box-shadow:${m[1].trim().slice(0, 40)} — возьмите --sh-*`)
    }
    for (const m of css.matchAll(/(?:^|[;{])\s*(border(?:-(?:top|right|bottom|left|inline|block)(?:-start|-end)?)?(?:-width)?|outline(?:-width)?)\s*:\s*([^;}]+)/g)) {
      const v = m[2].replace(/var\([^)]*\)/g, '')
      const w = v.match(/(?:^|\s)(\d*\.?\d+)px\b/)
      if (w && Number(w[1]) > 0) add('linePx', `${at(m.index)}  ${m[1]}:${m[2].trim().slice(0, 32)} — возьмите --line-w / --ring-w`)
    }
    if (!CONTROLS.includes(rel)) {
      for (const m of css.matchAll(/var\(--r-pop[,)]/g)) add('popRadius', `${at(m.index)}  полный круг вне дома контролов`)
    }
  }

  /* Размер органа — роль, не число (слой 7, И226). Высота в px на узле —
   * «маленькая кнопка» и «маленькое поле» разного маленького (Curtis).
   * Волосок 1px и знак (svg) — не орган. */
  for (const { rel, css, at } of sheets) {
    if (EXEMPT.includes(rel) || rel === LADDER || rel === TOKENS) continue
    for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const sel = m[1].trim()
      if (/svg|::before|::after|img|picture|video|hr\b|\.sr|visually/.test(sel)) continue
      for (const d of m[2].matchAll(/(?:^|;)\s*(height|min-height|block-size|min-block-size)\s*:\s*(\d+(?:\.\d+)?)px/g)) {
        if (Number(d[2]) <= 1) continue
        add('ctrlSize', `${at(m.index)}  ${sel.slice(0, 40)} ${d[1]}:${d[2]}px — возьмите --ctrl-h-*`)
      }
    }
  }

  /* Роль текста, набранная наполовину.
   *
   * Роль — это пять фактов: размер, межстрочье, вес, разрядка, мера. Когда
   * названа одна пятая, остальные набирает каждое место само — и набирает
   * по-разному. Замер 21.09.2026: два крупных заголовка в одном файле
   * примитивов, `.ledeText h1` и `.pagehead h1`, разошлись разрядкой
   * (−.04 против −.03), а у второго межстрочья не было вовсе — он наследовал
   * 1.45 от тела страницы, то есть 61 пиксель между строками на 42-м кегле
   * при каноне 46.
   *
   * Спрашивается с правила, которое БЕРЁТ размер из шкалы или роли: там, где
   * размер взят, остальное обязано быть взято тоже. Запасное число внутри
   * `var(--body-lead, 1.45)` — такой же второй источник: правишь роль, а
   * земля держит своё.
   *
   * Вес НЕ спрашивается: жирность у контролов — их собственное дело, и она
   * стоит в двух десятках мест, не имеющих отношения к набору текста. */
    const fromScale = /font-size\s*:[^;}]*var\(\s*--(?:fs-|[\w-]+-size)/
    const literalLead = /(line-height|letter-spacing)\s*:\s*(?:-?[\d.]+|var\([^)]*,\s*-?[\d.]+(?:em|rem|px|%)?\s*\))/
    for (const { rel, css, at } of sheets) {
    if (EXEMPT.includes(rel)) continue
    for (const rule of css.matchAll(/([^{}]*){([^}]*)}/g)) {
      const body = rule[2]
      if (!fromScale.test(body)) continue
      const hit = literalLead.exec(body)
      if (!hit) continue
      add('typeGuess', `${at(rule.index)}  ${rule[1].trim().slice(0, 40)}: ${hit[0].trim()}`)
    }
  }
}

/* ── контрол, нарисованный дважды ──────────────────────────────────────────
   Правило 10: одна вещь, которую нажимают, описана ОДИН раз. Рисунок знака
   живёт в `components/Icons.tsx`, его устройство и ответ на руку — в
   `styles/go.module.css`, а блоки этот контрол БЕРУТ, а не рисуют заново.

   Дефект, купивший правило, нашёл заказчик глазом: стрелка на снимке героя
   росла хвостом назад и ломалась на стыке. Причина была не в ней — указующих
   знаков было пять систем и семь мест, одиннадцать одежд, размеры 38 / 40 /
   44 / 54, и ответ на нажатие не у всех. Починить показанное место значило
   бы оставить шесть остальных.

   Признак в файле простой и не спорный: файл сам задаёт РИСУНОК знака
   (толщину и концы штриха у svg) или его ДВИЖЕНИЕ (`--nudge`). И то и другое
   — свойства одного общего контрола, и второе их описание всегда разойдётся
   с первым.

   Храповик: сегодняшний долг записан, новое не заводится. Число падает по
   мере того, как блоки переезжают на общий контрол. */
/* `styles/base.css` в этом списке потому, что вес штриха теперь живёт ИМЕННО
   там, и живёт один: одно объявление `svg{stroke-width}` плюс
   `vector-effect:non-scaling-stroke` на фигурах. До этого толщина стояла в
   сорока одном месте семью значениями — ровно тот долг, который эта семья и
   считала. Канонический дом не может читаться как долг: иначе проверка
   требует убрать то, ради чего убирали остальное. Причина и замер записаны
   в самом `base.css` над правилом. Список — `controls` в `kit.config.json`. */
for (const path of files) {
  const rel = relative(ROOT, path)
  /* Канонические файлы — те самые, где контрол и должен быть описан.
     Их три, и это не послабление: знак, который ведёт, кнопка со словом и
     поле ввода отвечают на разные вопросы — «куда», «что сделать» и «что вы
     вводите». Слово стрелкой не нарисовать, а поле — ни тем, ни другим.
     Четвёртого не заводить: блоки БЕРУТ отсюда. */
  if (CONTROLS.includes(rel) || EXEMPT.includes(rel)) continue
  const css = strip(readFileSync(path, 'utf8'))
  const at = (index) => `${rel}:${css.slice(0, index).split('\n').length}`
  const seen = new Set()
  for (const m of css.matchAll(/(?<![-a-z])stroke-(?:width|linecap)\s*:/g)) {
    const line = at(m.index)
    if (seen.has(line)) continue
    seen.add(line)
    found.twiceDrawn.push(`${line}  рисунок знака задан на месте — он один, и он в base.css (вес) + Icons.tsx (фигура)`)
  }
  for (const m of css.matchAll(/var\(--nudge\)/g)) {
    const line = at(m.index)
    if (seen.has(line)) continue
    seen.add(line)
    found.twiceDrawn.push(`${line}  движение знака задано на месте — оно одно, и оно в go.module.css`)
  }
}

/* ── `vector-effect`, поставленный не туда ─────────────────────────────────
   `vector-effect` НЕ наследуется. Поставленный на `svg`, он не делает
   ничего — и не говорит об этом: ни ошибки, ни предупреждения. Правка
   выглядит сделанной, а штрих по-прежнему сжимается вместе с коробкой.

   Стоила эта строка одного захода: `non-scaling-stroke` на `svg` дал ровно
   то же, что и без него, и поймал это только замер отрисованных пикселей
   (0.7 / 1.51 / 3 при размерах знака 12 / 24 / 48 — то есть толщина плавала
   по-прежнему). На фигурах встала на 1.51 при всех трёх.

   Проверка смотрит на СЕЛЕКТОР: если он кончается на `svg`, свойство лежит
   на самом узле и мертво. Нужное написание — `svg *`.

   Семья ходит по ВСЕМ файлам, включая канонические: ошибка эта не про «долг
   в блоках», а про строку, которая не работает нигде. Поэтому и отдельная
   семья, а не приписка к `twiceDrawn`. */
for (const path of files) {
  const rel = relative(ROOT, path)
  const css = strip(readFileSync(path, 'utf8'))
  const at = (index) => `${rel}:${css.slice(0, index).split('\n').length}`
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/(?<![-a-z])vector-effect\s*:/.test(m[2])) continue
    const dead = m[1].split(',').some((sel) => /(?:^|[\s>+~])svg\s*$/.test(sel.trim()))
    if (!dead) continue
    found.deadEffect.push(`${at(m.index)}  vector-effect на самом svg — свойство не наследуется и молча не работает; писать «svg *»`)
  }
}

/* ── движение ──────────────────────────────────────────────────────────────
   Вытащено из открытого набора Emil Kowalski (MIT) — из того, что можно
   померить, а не из того, что надо чувствовать. Ощущение остаётся его
   работой; здесь только два факта, которые проверяются чтением файла.

   ПЕРВОЕ: анимировать можно `transform` и `opacity`. Они пропускают
   раскладку и отрисовку и считаются видеокартой. `width`, `height`, `top`,
   `left`, `padding`, `margin` запускают все три шага заново — и запускают
   их шестьдесят раз в секунду, на каждом кадре. На телефоне это видно
   глазом, а на карточке товара, где такая анимация повторена восемьдесят
   шесть раз, видно и на мониторе.

   Ширина, едущая по `transition`, — самый частый случай в этом коде: так
   раскрывается поле поиска. Починка не в том, чтобы убрать движение, а в
   том, чтобы двигать `transform: scaleX()` или `clip-path`.

   ВТОРОЕ: движение интерфейса живёт меньше 500ms. Его собственная таблица:
   нажатие 100–160, подсказка 125–200, выпадающий список 150–250, окно и
   выдвижная панель 200–500. Дольше — это уже не отклик, а ожидание. */
const LAYOUT_PROPS = /(?:^|[\s,])(width|height|top|left|right|bottom|margin|padding|inset|block-size|inline-size|font-size|border-width)[a-z-]*(?=[\s,]|$)/

for (const file of files) {
  /* Комментарии вырезаются, но длину сохраняем: номера строк считаются по
     смещению, и если текст просто убрать, все они уедут. Пробел вместо
     каждого символа — и номера прежние, и прозы для проверки нет.

     Заведено потому, что проверка читала СОБСТВЕННЫЙ комментарий: строка
     «Стояло `@media (min-width:1241px)`», объясняющая, почему брейкпоинта
     больше нет, считалась брейкпоинтом. */
  const css = strip(readFileSync(file, 'utf8'))
  const rel = relative(ROOT, file)
  if (EXEMPT.includes(rel)) continue
  const at = (i) => `${rel}:${css.slice(0, i).split('\n').length}`

  for (const m of css.matchAll(/(?<![-a-z])transition(?:-property)?\s*:\s*([^;}]+)/g)) {
    const value = m[1]
    /* по частям: `transition: width .45s ease, background .2s ease` */
    for (const part of value.split(',')) {
      if (LAYOUT_PROPS.test(part) && !/var\(/.test(part.split(/\s+/)[0] || '')) {
        found.motion.push(`${at(m.index)}  двигает раскладку: ${part.trim().slice(0, 44)}`)
      }
    }
    for (const d of value.matchAll(/([0-9.]+)(m?s)/g)) {
      const ms = d[2] === 's' ? Number(d[1]) * 1000 : Number(d[1])
      if (ms > 500) found.motion.push(`${at(m.index)}  дольше 500ms: ${d[0]}`)
    }
  }
  for (const m of css.matchAll(/animation\s*:\s*([^;}]+)/g)) {
    for (const d of m[1].matchAll(/([0-9.]+)(m?s)/g)) {
      const ms = d[2] === 's' ? Number(d[1]) * 1000 : Number(d[1])
      /* Показ слайдера живёт секундами по делу — это не отклик, а пауза
         между кадрами, и приходит она переменной. Числом в файле дольше
         полусекунды бывает только анимация интерфейса. */
      if (ms > 500 && !/var\(/.test(m[1])) found.motion.push(`${at(m.index)}  дольше 500ms: ${d[0]}`)
    }
  }
  /* `ease-in` начинается медленно — ровно в тот момент, на который смотрит
     человек. `ease-out` в 200ms ОЩУЩАЕТСЯ быстрее, чем `ease-in` в 200ms. */
  for (const m of css.matchAll(/(?<![-a-z])(?:transition|animation)[a-z-]*\s*:\s*([^;}]*\bease-in\b(?!-out)[^;}]*)/g)) {
    found.motion.push(`${at(m.index)}  ease-in на интерфейсе: ${m[1].trim().slice(0, 40)}`)
  }
  /* «Переход на всё» — `transition: all` или сокращение без свойства (тогда
     браузер подставляет `all`): под руку едет всё, что поменялось, — и
     раскладка, и то, что двигаться не должно, а следующая правка стиля
     молча добавит в движение новое свойство (Refero, craft-details.md §9
     #50). Свойства называются по одному. */
  for (const m of css.matchAll(/(?<![-a-z])transition(-property)?\s*:\s*([^;}]+)/g)) {
    for (const part of m[2].split(',')) {
      const first = part.trim().split(/\s+/)[0] ?? ''
      if (first === 'all' || (!m[1] && /^[\d.]+m?s$/.test(first))) {
        found.motion.push(`${at(m.index)}  переход на всё: ${part.trim().slice(0, 40)} — свойства называются по одному`)
      }
    }
  }
  /* Появление из ничего — `scale(0)`: в мире ничто не возникает из точки,
     и глаз читает это как вспышку (Эмиль Ковальский, STANDARDS.md,
     «Physicality»: «Never scale(0)»). Появление — от 0.9…0.97 с прозрачностью. */
  for (const m of css.matchAll(/(?<![-\w])scale(?:3d)?\(\s*0(?:\.0*)?\s*(?:,\s*0(?:\.0*)?\s*)*\)|(?<![-\w])scale\s*:\s*0(?:\.0*)?\s*[;}]/g)) {
    found.motion.push(`${at(m.index)}  появление из scale(0): ${m[0].replace(/[;}]$/, '').trim()} — от 0.9…0.97 с прозрачностью`)
  }

  /* ── фокус, убранный и не заменённый ────────────────────────────────────
   *
   * `outline:none` — самый частый способ сломать клавиатуру, и ломает он
   * молча: мышью всё работает, дифф безупречен, а человек, который ходит по
   * сайту табом, теряет место на странице целиком. У покупателя это не
   * редкость: клавиатурой пользуются и те, у кого не работает рука, и те,
   * кому просто быстрее.
   *
   * Убирается ПАРОЙ — ровно как чужая рамка Android у семьи `noPress`: снял
   * кольцо браузера — обязан нарисовать своё. Само по себе `outline:none`
   * не дефект: у нас все три случая законны — `.find input` гасит кольцо у
   * поля, а рисует его рамкой на `.find:focus-within`, и `.sw` переносит
   * кольцо с органа на дорожку внутри него. Дефект — когда замены нет
   * нигде.
   *
   * Спрашивается по ФАЙЛУ, и это не приблизительность: модуль CSS — это один
   * компонент, и если кольцо не нарисовано здесь, его не нарисует никто.
   * Правило из открытого списка Vercel (Web Interface Guidelines), из той
   * его половины, которую можно померить чтением файла. */
  const kills = [...css.matchAll(/outline\s*:\s*(?:none|0)\b|outline-style\s*:\s*none\b|outline-width\s*:\s*0\b/g)]
  if (kills.length) {
    /* Замена — любая краска, назначенная В СОСТОЯНИИ ФОКУСА: своё кольцо,
       тень-кольцо, рамка, фон. Ищем правило, у которого в селекторе есть
       `:focus`, а в теле — чем рисовать. */
    const paints = /(?:^|[;{\s])(outline(?:-color|-width|-style|-offset)?|box-shadow|border(?:-[a-z]+)?|background(?:-color)?|text-decoration[a-z-]*)\s*:/
    let replaced = false
    for (const rule of css.matchAll(/([^{}]*:focus[^{}]*)\{([^}]*)\}/g)) {
      if (!paints.test(rule[2])) continue
      if (/outline\s*:\s*(?:none|0)\b/.test(rule[2]) && !paints.test(rule[2].replace(/outline\s*:\s*(?:none|0)\b/g, ''))) continue
      replaced = true
      break
    }
    if (!replaced) {
      for (const m of kills) found.focusGone.push(`${at(m.index)}  кольцо фокуса снято, замены в файле нет`)
    }
  }
}

/* Пружина с перелётом — кривая, проскакивающая цель: `cubic-bezier` с y
   вне коридора `MOTION.overshoot` (impeccable, bounce-easing; Эмиль
   Ковальский, STANDARDS.md, «Springs»: «avoid bounce in most UI»). Меряется
   и в файле шкал: роль `--ease` живёт там, и пружина ролью — та же пружина. */
for (const file of files) {
  const rel = relative(ROOT, file)
  if (EXEMPT.includes(rel) && rel !== TOKENS) continue
  const css = strip(readFileSync(file, 'utf8'))
  const at = (i) => `${rel}:${css.slice(0, i).split('\n').length}`
  const [lo, hi] = MOTION.overshoot
  for (const m of css.matchAll(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g)) {
    if ([Number(m[2]), Number(m[4])].some((y) => y < lo || y > hi)) {
      found.motion.push(`${at(m.index)}  пружина с перелётом: ${m[0]} — y вне ${lo}…${hi}`)
    }
  }
}

/* Ступени, которые глаз не различает.
 *
 * Шкала размера была: 11 · 12.5 · 13 · 14 · 15 · 16 · 18 · 22 · 26. Четыре
 * соседние пары отличались на 4–7% — это не две роли, а одна, записанная
 * дважды. Роль, неотличимая от соседней, не работает: подпись под карточкой
 * и текст в ней читаются как одно, и выбирать между ними приходится наугад.
 *
 * Порог 8% взят снизу: ниже него разница в 13 и 14 пикселей не видна никому,
 * включая того, кто её ставил. Шкалы, на которые ссылаются пособия (Material,
 * модульные лестницы), шагают на 12–25%.
 *
 * Мерятся ОБА конца clamp: шкала течёт, и сойтись ступени могут на любом.
 */
/* Где искать лестницу. С 21.09.2026 её выпускает строитель
   (`styles/scale.css`), и смотреть надо туда: файл шкал остался на месте,
   а ступеней в нём больше нет. Семья, продолжавшая читать только
   `tokens.css`, не покраснела бы — она бы замолчала нулём, а молчаливый
   ноль читается как «в проекте чисто» (И202). */
const WHERE = [LADDER, TOKENS].filter(Boolean).map((p) => join(ROOT, p)).find(existsSync)
if (WHERE) {
  /* Только набор, стоящий на корне: в выпущенном файле те же ступени
     повторены под именем каждого набора, и одна сошедшаяся пара считалась
     бы столько раз, сколько наборов завёл владелец. */
  const css = strip(readFileSync(WHERE, 'utf8')).split('[data-scale')[0]
  const steps = []
  const step = new RegExp(`${RX.font}([a-z0-9-]+)\\s*:\\s*clamp\\(\\s*([\\d.]+)px[^,]*,[^,]*,\\s*([\\d.]+)px\\s*\\)`, 'g')
  for (const m of css.matchAll(step)) {
    steps.push({ name: m[1], min: Number(m[2]), max: Number(m[3]) })
  }
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1], b = steps[i]
    for (const end of ['min', 'max']) {
      const ratio = b[end] / a[end]
      if (ratio > 1 && ratio < 1.08) {
        found.nearStep.push(
          `${relative(ROOT, WHERE)}  ${PREFIX.font}${a.name} → ${PREFIX.font}${b.name}: ${a[end]} → ${b[end]}px ` +
          `(${Math.round((ratio - 1) * 100)}%, ${end === 'min' ? 'узкий' : 'широкий'} конец)`)
      }
    }
  }
}


/* ── Разметка: числа, которых проверка не видела ──────────────────────────
 *
 * Обход читал только `.css`, и база честно показывала `fontPx: 0`. Ноль в
 * базе значит «в стилях чисто», а читается как «в проекте чисто» — это
 * ровно тот молчаливо неполный замер, который выглядит как результат.
 *
 * Долг лежал в разметке: `fontSize: 38` на странице «не найдено`,
 * `fontSize: 17`, `padding: '96px 0 120px'`, `marginTop: 28` — десять мест
 * в пяти файлах. Инлайновый стиль вдобавок СИЛЬНЕЕ любого правила в файле
 * стилей: число в разметке накрывает кривую clamp() и отменяет всю
 * текучесть, которую шкала обеспечивает.
 *
 * Панель настроек рисует саму себя и в магазин не едет — её числа не считаются.
 */
const CODE = []
for (const dir of DIRS) walkCode(join(ROOT, dir))
function walkCode(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walkCode(path)
    else if (/\.tsx?$/.test(name)) CODE.push(path)
  }
}

/* ── ОДЕЖДА ЗА АТРИБУТОМ, КОТОРОГО НИКТО НЕ СТАВИТ ───────────────────────
 *
 * Вид предмета приходит атрибутом на `<html>`: `html[data-qty='chev']`,
 * `html[data-hover='raise']`. Пока вид ВЫБИРАЮТ, это честно. Как только
 * выбрали, атрибут перестают ставить — а правила остаются, и остаётся то,
 * что куда дороже: РАЗМЕТКА под невыбранные виды. Она едет покупателю,
 * её грузит браузер, её читает поиск, и не видит её никто.
 *
 * Заказчик увидел это на карточке товара и сказал коротко: «пиздец, я и не
 * знал, что одновременно подгружались все четыре вида карточек». Карточка
 * несла четыре набора фактов и прятала три; счётчик нёс в каждой кнопке два
 * знака и прятал один. Оба нашлись разбором руками — теперь их находит
 * проверка.
 *
 * Признак точный: селектор на `html[data-X…]`, где `X` не ставится ни в
 * одном файле кода. Атрибут, который ставит панель настроек, сюда не
 * попадает: она пишет его тем же `data-X=`. */
{
  /* Кто ставит атрибуты — ищется ШИРЕ, чем стили: в `lib/` живут и панель
     настроек (она пишет атрибут таблицей), и скрипт, который ставит отпечаток
     до первой отрисовки. Ищи мы только в `app/` и `components/`, проверка
     ругалась бы на каждую живую одежду шапки. */
  const writers = [...CODE]
  const libDir = join(ROOT, LIB)
  const walkLib = (dir) => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walkLib(path)
      else if (/\.tsx?$/.test(name)) writers.push(path)
    }
  }
  walkLib(libDir)

  const written = new Set()
  for (const path of writers) {
    /* КОММЕНТАРИИ НЕ СЧИТАЮТСЯ. Первый заход считал, и проверка молчала о
       счётчике: в макете осталась строка «Счётчик (`data-qty="pill"`) отсюда
       ушёл» — рассказ о том, что атрибут СНЯТ, проверка прочла как его
       постановку. Проверка, которую успокаивает объяснение, бесполезна. */
    const code = strip(readFileSync(path, 'utf8'))
      .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))
    for (const m of code.matchAll(/data-([a-z][a-z0-9-]*)\s*=/g)) written.add(m[1])
    /* Имя атрибута строкой — `setAttribute('data-search-open', …)`, константа
       `OPEN_ATTRIBUTE = 'data-search-open'` — и через `dataset.searchOpen =`:
       одежда, надетая кодом, а не разметкой, надета так же (И178). */
    for (const m of code.matchAll(/['"`]data-([a-z][a-z0-9-]*)['"`]/g)) written.add(m[1])
    for (const m of code.matchAll(/\.dataset\.([a-zA-Z][a-zA-Z0-9]*)\s*=/g)) written.add(m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()))
    /* Панель пишет атрибут через таблицу: `wire: { to: 'attr', name: 'head' }`. */
    for (const m of code.matchAll(/to:\s*'attr',\s*name:\s*'([a-z][a-z0-9-]*)'/g)) written.add(m[1])
  }
  const seen = new Set()
  for (const path of files) {
    const rel = relative(ROOT, path)
    if (rel.includes('studio')) continue
    const css = readFileSync(path, 'utf8')
    for (const m of css.matchAll(/html\[data-([a-z][a-z0-9-]*)/g)) {
      const name = m[1]
      if (written.has(name)) continue
      const line = `${rel}:${css.slice(0, m.index).split('\n').length}  data-${name} — правило есть, ставить атрибут некому`
      if (seen.has(line)) continue
      seen.add(line)
      found.deadDress.push(line)
    }
  }
}

for (const path of CODE) {
  const rel = relative(ROOT, path)
  if (rel.includes('studio')) continue
  const code = strip(readFileSync(path, 'utf8').replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length)))
  const at = (index) => `${rel}:${code.slice(0, index).split('\n').length}`
  const seen = new Set()
  const add = (line) => { if (!seen.has(line)) { seen.add(line); found.inlinePx.push(line) } }

  for (const m of code.matchAll(/style=\{\{([\s\S]*?)\}\}/g)) {
    const body = m[1]
    const where = at(m.index)

    /* Пользовательское свойство — механизм, а не размер: через него в
       вёрстку уезжает то, что известно только в браузере (сдвиг пальца,
       ширина панели). Шкалой такое не описывается. */
    const own = body.replace(/\['--[^\]]*'[^,]*,?/g, '')

    if (/\bfontSize:\s*['"]?[\d.]+/.test(own)) add(`${where} (размер)`)

    for (const d of own.matchAll(/\b(padding|margin|gap|inset|top|left|right|bottom|width|height|maxWidth|minHeight)[A-Za-z]*:\s*(['"][^'"]*['"]|[\d.]+)/g)) {
      /* Меньше 8px — оптическая доводка, шкалой не описывается (как и в
         стилях). Считаются числа, а не выражения: `${pull}px` — величина,
         вычисленная в браузере, и ступени у неё быть не может. */
      const nums = [...String(d[2]).matchAll(/([\d.]+)px|^\s*([\d.]+)\s*$/g)]
        .map((x) => Number(x[1] ?? x[2])).filter((n) => Number.isFinite(n))
      if (nums.some((n) => n >= SPACING_FLOOR)) add(`${where} (ритм)`)
    }
  }
}

/* ── Две правды об одном факте ────────────────────────────────────────────
 *
 * Цена, оценка, партия и состав товара живут в `lib/`. Набранные ВТОРОЙ раз
 * в компоненте, они расходятся — и расходятся молча, потому что оба числа
 * выглядят правдоподобно.
 *
 * Заведено по счёту, и счёт был €30. Таблица крепостей на странице товара
 * держала `{ id: 'zelenika-30', price: 54.00, cbd: 2000 }`, а в каталоге
 * `zelenika-30` — это 30%, 3000 мг и €84. Кнопка показывала €54 и клала в
 * корзину товар за €84. В диффе обе строки безупречны.
 *
 * Признак, видимый в файле: в одном месте стоят и идентификатор товара, и
 * его факт. Значит факт набран рукой там, где его надо было спросить.
 *
 * Это НЕ храповик и не долг: разошедшиеся цены — не то, что чинят в своём
 * темпе. Как и управляющий байт, валит сборку сразу.
 */
/**
 * Набор стилей, прочитанный через клиентский компонент.
 *
 * `export { s as cardStyles }` в файле с 'use client' и `cardStyles.grid` в
 * серверной странице — это `undefined`. Сборка молчит, `tsc` молчит: для
 * серверного файла экспорт клиентского модуля не значение, а ссылка на
 * клиента, и свойство у неё пустое. В разметку уезжает `<div>` без класса, и
 * раскладки просто нет.
 *
 * Заведено по счёту, и счёт был велик. Полка «сравните с» на всех сорока
 * страницах товара стояла БЕЗ сетки — карточки шли столбиком во всю ширину.
 * Раздел отчёта тем же способом терял свои две колонки: текст обещал «анализ
 * справа», а таблица всё это время была снизу. Оба дефекта уехали на прод и
 * прожили там всё время, пока страница существует.
 *
 * Лечится одной строкой: набор стилей импортируется из своего же
 * `*.module.css`, а не через компонент. CSS-модуль можно открыть из любого
 * файла — и серверного, и клиентского.
 *
 * Это НЕ храповик: раскладки, которой нет, не бывает наполовину.
 */
const clientStyles = []
{
  /* Кто отдаёт наружу набор стилей, будучи клиентским. */
  const exported = new Map()
  for (const path of CODE) {
    const code = readFileSync(path, 'utf8')
    if (!/^['"]use client['"]/m.test(code)) continue
    const locals = new Set(
      [...code.matchAll(/import\s+(\w+)\s+from\s+'[^']+\.module\.css'/g)].map((m) => m[1]),
    )
    if (!locals.size) continue
    const names = new Set()
    for (const m of code.matchAll(/export\s*\{\s*(\w+)\s+as\s+(\w+)\s*\}/g)) {
      if (locals.has(m[1])) names.add(m[2])
    }
    for (const m of code.matchAll(/export\s+const\s+(\w+)\s*=\s*(\w+)\b/g)) {
      if (locals.has(m[2])) names.add(m[1])
    }
    if (names.size) exported.set(relative(ROOT, path).replace(/\.tsx?$/, ''), names)
  }
  /* Кто это читает, не будучи клиентским. */
  for (const path of CODE) {
    const rel = relative(ROOT, path)
    if (rel.includes('studio')) continue
    const code = readFileSync(path, 'utf8')
    if (/^['"]use client['"]/m.test(code)) continue
    const at = (index) => `${rel}:${code.slice(0, index).split('\n').length}`
    for (const m of code.matchAll(/import\s*(?:\w+\s*,\s*)?\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
      const spec = m[2]
      const from = spec.startsWith('@/')
        ? spec.slice(2)
        : spec.startsWith('.') ? relative(ROOT, join(dirname(path), spec)) : null
      if (!from) continue
      const names = exported.get(from)
      if (!names) continue
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/).pop()?.trim()
        if (name && names.has(name)) {
          clientStyles.push(`${at(m.index)}: ${name} из ${spec} — клиентский экспорт, на сервере это undefined`)
        }
      }
    }
  }
}
if (clientStyles.length) {
  console.error('\n✗ Набор стилей, прочитанный через клиентский компонент:')
  for (const t of clientStyles) console.error(`    ${t}`)
  console.error('\n  Импортируйте сам *.module.css — его можно открыть из любого файла. Через')
  console.error('  клиентский компонент свойство приходит пустым, и раскладки не будет вовсе.')
  process.exit(1)
}

/**
 * Класс из модуля, которого в модуле нет.
 *
 * `s.like` там, где правило `.like` уехало в примитивы, — это не ошибка типов
 * и не ошибка сборки: CSS-модуль отдаёт `undefined`, оно спокойно уезжает в
 * `className`, и в разметке остаётся строка «undefined». Вещь просто теряет
 * весь свой набор правил. Заказчик увидит это как исчезнувшее сердце на
 * снимке, а дифф будет безупречен.
 *
 * Заведено по счёту: сердце и значок скидки на карте товара ссылались на
 * классы, только что переехавшие в примитивы. Обе вещи пропали с витрины
 * молча, а `tsc` был зелёным — для него это `any`.
 *
 * Это НЕ храповик: класс, которого нет, не долг, который платят в своём
 * темпе. Валит сборку сразу.
 */
const missingClass = []
for (const path of CODE) {
  const rel = relative(ROOT, path)
  if (rel.includes('studio')) continue
  const code = readFileSync(path, 'utf8')
  /* Какие модули этот файл открыл и под какими именами. */
  const mods = new Map()
  for (const m of code.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)) {
    const [, local, spec] = m
    const file = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : join(dirname(path), spec)
    if (!existsSync(file)) continue
    const css = readFileSync(file, 'utf8')
    /* Множество берётся шире, чем надо: всякое `.имя` в файле. Ошибиться в
       сторону «класс есть» безопасно — проверка молчит; ошибиться в
       обратную значило бы врать про исправный код. */
    mods.set(local, { spec, names: new Set([...css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((x) => x[1])) })
  }
  if (!mods.size) continue
  const at = (index) => `${rel}:${code.slice(0, index).split('\n').length}`
  for (const [local, mod] of mods) {
    const use = new RegExp(`\\b${local}\\.([A-Za-z_][\\w]*)\\b`, 'g')
    for (const m of code.matchAll(use)) {
      if (mod.names.has(m[1])) continue
      missingClass.push(`${at(m.index)}: ${local}.${m[1]} — в ${mod.spec} такого класса нет`)
    }
  }
}
if (missingClass.length) {
  console.error('\n✗ Класс из модуля, которого в модуле нет:')
  for (const t of missingClass) console.error(`    ${t}`)
  console.error('\n  CSS-модуль отдаёт undefined, оно уезжает в className, и вещь теряет весь')
  console.error('  свой набор правил молча. Ни tsc, ни сборка об этом не скажут.')
  process.exit(1)
}

const ids = new Set()
const families = new Set()
/* Каталога может не быть вовсе: в проект, куда набор только что лёг,
   `lib/products.ts` приедет не сегодня. Раньше этот же кусок читал файл
   молча и валил всю проверку стеком вызовов на первом же запуске в новом
   проекте — то есть набор не переживал собственной установки. Нет данных —
   семья не мерится, и об этом сказано вслух: молчаливый ноль неотличим от
   «всё чисто». */
const DATA = join(ROOT, 'lib/products.ts')
const hasData = existsSync(DATA)
if (hasData) {
  const data = readFileSync(DATA, 'utf8')
  for (const m of data.matchAll(/^  \{ id:'([^']*)'/gm)) ids.add(m[1])
  for (const m of data.matchAll(/family:'([^']*)'/g)) families.add(m[1])
} else {
  console.log('· две правды об одном факте: не мерилась — нет lib/products.ts')
}
/* Приставка марки берётся из самих данных, а не из списка в проверке: список
   разошёлся бы с каталогом на первой новой марке. */
const brands = new Set([...ids].map((id) => id.split('-')[0]))
const twoTruths = []
for (const path of CODE) {
  const rel = relative(ROOT, path)
  if (rel.includes('studio')) continue
  const code = strip(readFileSync(path, 'utf8').replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length)))
  const at = (index) => `${rel}:${code.slice(0, index).split('\n').length}`

  for (const m of code.matchAll(/'([a-z][a-z0-9]*-[a-z0-9-]+)'/g)) {
    const v = m[1]
    if (!brands.has(v.split('-')[0])) continue
    if (ids.has(v) || families.has(v)) continue
    twoTruths.push(`${at(m.index)}: '${v}' — такого товара в каталоге нет`)
  }

  /* Идентификатор и факт в одном объявлении. Строка, а не файл: рядом с
     идентификатором — это и значит «в этом же объекте». */
  for (const line of code.split('\n').entries()) {
    const [i, text] = line
    const id = /id:\s*'([a-z][a-z0-9]*-[a-z0-9-]+)'/.exec(text)
    if (!id || !brands.has(id[1].split('-')[0])) continue
    const fact = /\b(price|cbd|rating|reviews|batch|was)\s*:/.exec(text)
    if (fact) twoTruths.push(`${rel}:${i + 1}: ${fact[1]} товара '${id[1]}' набран рукой — в каталоге он уже есть`)
  }
}
if (twoTruths.length) {
  console.error('\n✗ Две правды об одном факте:')
  for (const t of twoTruths) console.error(`    ${t}`)
  console.error('\n  Факт товара живёт в lib/products.ts. Набранный второй раз, он расходится')
  console.error('  молча: оба числа выглядят правдоподобно. Спросите его, а не набирайте.')
  process.exit(1)
}

/* ── ПОЛ, СКЛЕИВАЮЩИЙ СОСЕДЕЙ ────────────────────────────────────────────
   Настройка обязана вести себя ОДИНАКОВО при всех своих значениях. Правило,
   написанное на пару одинаковых соседей (`[data-ground='paper'] +
   …[data-ground='paper']`), делает ровно обратное: два блока с одной краской
   склеиваются в один, а с другой — остаются двумя, и объяснить эту разницу
   покупателю нечем.

   Дефект: заказчик поставил двум соседним полкам «Paper» — они слились в
   один бесконечный блок; поставил «Deck» — разделились. Показал двумя
   снимками. */
for (const path of files) {
  const rel = relative(ROOT, path)
  if (EXEMPT.includes(rel)) continue
  const css = strip(readFileSync(path, 'utf8'))
  for (const m of css.matchAll(/\[data-([a-z-]+)=(['"])([a-z-]+)\2\][^{;},\n]*\+[^{;},\n]*\[data-\1=\2\3\2\]/g)) {
    /* Шов ОПЛАЧИВАЕТСЯ одним из соседей — это законно и на разных полах
       делается так же (`padding-bottom:0`, потому что платит следующий).
       Дефект — когда шов СНИМАЮТ: гасят угол или просвет, и два предмета
       становятся одним. */
    const body = css.slice(css.indexOf('{', m.index) + 1, css.indexOf('}', m.index))
    if (!/(?:border[a-z-]*radius|margin-(?:top|block-start))\s*:\s*0/.test(body)) continue
    found.groundGlue.push(
      `${rel}:${css.slice(0, m.index).split('\n').length}  ${m[0].trim().slice(0, 52)} — соседи с одним полом слиты в один предмет`)
  }
}

/* ── ОДЕЖДА ПОЛЗУНКА, КОТОРУЮ БРАУЗЕР ВЫБРОСИТ ───────────────────────────
   Записей две, и они не складываются. Общая (`scrollbar-width`,
   `scrollbar-color`) умеет только «тоньше» и «такого цвета»; вдвинуть
   ползунок от скруглённого края и убрать стрелки умеют только
   `::-webkit-scrollbar`. Условие у вторых жёсткое: движок Chrome
   выбрасывает их ЦЕЛИКОМ, если на том же предмете стоит общая запись, — а
   она у нас стоит на `html` и наследуется всем.

   Значит, РИСУЮЩИЕ правила ползунка законны только под
   `@supports selector(::-webkit-scrollbar)`, где общая запись сброшена к
   своему умолчанию. Правила, которые ползунок ПРЯЧУТ (`display:none`), под
   охрану не идут: спрятать его умеет и общая запись, и они лишь подпорка
   старым браузерам.

   Дефект: восемь строк одежды панели фильтров были написаны, прочитаны и
   отброшены, а браузер рисовал свой ползунок — на самом краю дуги и со
   стрелкой наверху. Это был ТРЕТИЙ заход одного дефекта, и заказчик каждый
   раз находил его глазом. */
for (const path of files) {
  const rel = relative(ROOT, path)
  if (EXEMPT.includes(rel)) continue
  const css = strip(readFileSync(path, 'utf8'))
  /* Что стоит под охраной — вырезается, и остаток проверяется как есть. */
  let open = css.indexOf('@supports selector(::-webkit-scrollbar)')
  let bare = css
  while (open >= 0) {
    let i = bare.indexOf('{', open)
    let depth = 0
    let end = i
    for (; end < bare.length; end++) {
      if (bare[end] === '{') depth++
      else if (bare[end] === '}' && --depth === 0) break
    }
    bare = bare.slice(0, open) + ' '.repeat(end + 1 - open) + bare.slice(end + 1)
    open = bare.indexOf('@supports selector(::-webkit-scrollbar)')
  }
  for (const m of bare.matchAll(/::-webkit-scrollbar[a-z-]*[^{]*\{([^}]*)\}/g)) {
    const body = m[1]
    /* Прячущее правило законно где угодно. */
    if (/display\s*:\s*none/.test(body) && !/background|border-radius|color/.test(body)) continue
    const line = `${rel}:${bare.slice(0, m.index).split('\n').length}  рисует ползунок мимо @supports selector(::-webkit-scrollbar) — браузер выбросит`
    found.barTwice.push(line)
  }
}

/* ── ЛИСТ, КОТОРЫЙ НЕ ОБЪЯВИЛ СЕБЯ ПОЛОМ ─────────────────────────────────
   Белая карточка на тёмной палубе — новый пол для всего, что в ней. Палуба
   переназначает роли (чернила, поверхность, пару состояния), роли идут вниз
   по наследству, а `--plate` за полом не идёт: выходит белая карточка с
   белыми буквами. Заказчик нашёл это глазом на блоке вопросов — вопрос
   виден, ответа нет вовсе.

   Сторожится с двух концов, потому что и щели бывают двух родов.

   ПЕРВЫЙ — список: всё, что переназначила палуба, лист обязан вернуть.
   Списки сверяются строка в строку, и невернувшаяся роль валит проверку.
   Забыть одну строку иначе нельзя ничем: она не видна ни в файле, ни на
   светлом полу — только глазом на витрине и только на палубе.

   ВТОРОЙ — разметка: предмет красится `--plate`, а атрибут `data-plate` ему
   никто не поставил. Проверка грубая нарочно — она смотрит, есть ли атрибут
   хоть где-то в разметке, которая этот модуль берёт, а не на том ли он
   предмете. Точнее без разбора JSX не скажешь, а «совсем забыли» — как раз
   тот случай, который и случается. */
{
  const basePath = BASE ? join(ROOT, BASE) : null
  if (basePath && existsSync(basePath)) {
    const base = strip(readFileSync(basePath, 'utf8'))
    const bodyOf = (sel) => {
      const i = base.indexOf(sel + '{')
      if (i < 0) return null
      return base.slice(i + sel.length + 1, base.indexOf('}', i))
    }
    const rolesOf = (body) =>
      new Set([...body.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
    const deck = bodyOf("[data-ground='deck']")
    const plate = bodyOf('[data-plate]')
    if (deck && plate) {
      const back = rolesOf(plate)
      for (const role of rolesOf(deck)) {
        if (!back.has(role)) {
          found.plateGap.push(`${BASE}  палуба переназначает ${role}, лист её не возвращает`)
        }
      }
      if (/(^|[{;])\s*color\s*:/.test(deck) && !/(^|[{;])\s*color\s*:/.test(plate)) {
        found.plateGap.push(`${BASE}  палуба меняет краску строки, лист её не возвращает`)
      }
    }
  }

  /* Кто берёт какой модуль — из самих файлов разметки, а не списком в
     проверке: список отстал бы от первого нового блока. */
  const users = new Map()
  for (const path of CODE) {
    const code = readFileSync(path, 'utf8')
    for (const m of code.matchAll(/from\s+'[^']*\/([A-Za-z0-9._-]+\.module\.css)'/g)) {
      if (!users.has(m[1])) users.set(m[1], [])
      users.get(m[1]).push(code)
    }
  }
  for (const path of files) {
    const rel = relative(ROOT, path)
    if (!rel.endsWith('.module.css')) continue
    const css = strip(readFileSync(path, 'utf8'))
    const m = /background:\s*var\(--plate\)/.exec(css)
    if (!m) continue
    const takers = users.get(rel.split('/').pop()) ?? []
    if (takers.some((code) => code.includes('data-plate'))) continue
    const at = `${rel}:${css.slice(0, m.index).split('\n').length}`
    found.plateGap.push(`${at}  красится листом, а полом себя не объявил (нужен data-plate)`)
  }
}

/* ── РУЧКА ПРИМИТИВА НА РАВНОМ ВЕСЕ (knobTie, И320, И346) ─────────────────
 *
 * Примитив объявляет свою ручку у себя голым классом: `.grid{--cols:…;
 * --cell-min:…}`, `.frame{--frame:…}`. Узел, который стоит на том же
 * элементе, что и примитив (`className={`${p.grid} ${s.ticks}`}`), и
 * переобъявляет ту же ручку ТОЖЕ голым классом (`.ticks{--cell-min:…}`),
 * спорит с ним равным весом (0,1,0) — и побеждает тот, чей кусок сборки
 * встал ниже. Порядок кусков решает сборщик по тому, какая страница их
 * затребовала первой, — между разработкой и боем он разный.
 *
 * Дефект: 24.09.2026, пакет B — галочки шторки фильтров стояли одной
 * колонкой вместо двух: модуль фильтров собирался раньше примитивов, и
 * `.grid{--cell-min:240px}` бил `.ticks{--cell-min:…}`. Правило И320
 * записали, а сторожа к нему не было — полка каталога и кадр карточки
 * держались на том же везении, и следующий такой узел никто бы не увидел.
 *
 * Признак, видимый без браузера: в одном `className` стоят класс
 * примитива и класс узла; у примитива ручка объявлена голым `.X`, у узла
 * та же ручка — голым `.Y`. Сила места — атрибут на том же узле
 * (`.shelf[data-catalog-grid]`) или предок (`.values .ticks`) — спора не
 * создаёт, и находкой не считается. `:where()` у примитива — вес ноль,
 * тоже не спор.
 */
{
  const bare = (text) => {
    const out = []
    for (const rule of text.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const names = rule[1].split(',').map((part) => part.trim()).filter((part) => /^\.[A-Za-z_][\w-]*$/.test(part)).map((part) => part.slice(1))
      if (!names.length) continue
      const knobs = [...rule[2].matchAll(/(?:^|;)\s*(--[\w-]+)\s*:/g)].map((d) => d[1])
      if (knobs.length) out.push({ names, knobs, at: rule.index + rule[0].indexOf('{') })
    }
    return out
  }
  const primFile = PRIMITIVES ? join(ROOT, PRIMITIVES) : null
  const knobsOf = new Map()
  if (primFile && existsSync(primFile)) {
    for (const r of bare(strip(readFileSync(primFile, 'utf8')))) {
      for (const n of r.names) {
        if (!knobsOf.has(n)) knobsOf.set(n, new Set())
        for (const k of r.knobs) knobsOf.get(n).add(k)
      }
    }
  }
  /* Голые правила узлов — один раз на файл модуля. */
  const nodeRules = new Map()
  const rulesOf = (file) => {
    if (!nodeRules.has(file)) {
      const css = strip(readFileSync(file, 'utf8'))
      const line = (i) => `${relative(ROOT, file)}:${css.slice(0, i).split('\n').length}`
      nodeRules.set(file, bare(css).map((r) => ({ ...r, where: line(r.at) })))
    }
    return nodeRules.get(file)
  }
  /* Одно правило узла против одного примитива — одна находка: чинится одной
     правкой, сколько бы ручек в нём ни стояло. */
  const ties = new Map()
  if (knobsOf.size) {
    for (const path of CODE) {
      const rel = relative(ROOT, path)
      if (rel.includes('studio')) continue
      const code = strip(readFileSync(path, 'utf8').replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length)))
      const mods = new Map()
      for (const m of code.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)) {
        const file = m[2].startsWith('@/') ? join(ROOT, m[2].slice(2)) : join(dirname(path), m[2])
        if (existsSync(file)) mods.set(m[1], file)
      }
      const prims = [...mods].filter(([, file]) => file === primFile).map(([local]) => local)
      if (!prims.length) continue
      /* Выражение `className={…}` целиком: скобки считаются, внутри шаблонной
         строки стоят свои `${…}`. */
      for (const m of code.matchAll(/className=\{/g)) {
        let depth = 1
        let i = m.index + m[0].length
        while (i < code.length && depth) {
          if (code[i] === '{') depth++
          else if (code[i] === '}') depth--
          i++
        }
        const expr = code.slice(m.index + m[0].length, i - 1)
        const refs = [...expr.matchAll(/\b(\w+)\.([A-Za-z_]\w*)\b/g)].filter((r) => mods.has(r[1]))
        const onPrim = refs.filter((r) => prims.includes(r[1]) && knobsOf.has(r[2])).map((r) => r[2])
        if (!onPrim.length) continue
        for (const r of refs) {
          if (prims.includes(r[1])) continue
          for (const rule of rulesOf(mods.get(r[1]))) {
            if (!rule.names.includes(r[2])) continue
            for (const prim of onPrim) {
              const both = rule.knobs.filter((knob) => knobsOf.get(prim).has(knob))
              if (!both.length) continue
              const key = `${rule.where}|${r[2]}|${prim}`
              if (!ties.has(key)) ties.set(key, { where: rule.where, node: r[2], prim, knobs: new Set(), on: `${rel}:${code.slice(0, m.index).split('\n').length}` })
              for (const knob of both) ties.get(key).knobs.add(knob)
            }
          }
        }
      }
    }
  }
  for (const t of ties.values()) {
    found.knobTie.push(`${t.where}  .${t.node} и примитив .${t.prim} на одном узле (${t.on}): оба задают ${[...t.knobs].join(', ')} голым классом — победит порядок кусков сборки; ручку примитива — под :where(), узлу — силой места`)
  }
}

const counts = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.length]))

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n')
  console.log('База обновлена:', counts)
  process.exit(0)
}

let base
try {
  base = JSON.parse(readFileSync(BASELINE, 'utf8'))
} catch {
  console.error(`Нет ${relative(ROOT, BASELINE)}. Создать: npm run check:css -- --update`)
  process.exit(1)
}

/* Подписи семей — в реестре `css-families.mjs`: их же печатает скилл. */

/* `--list [семья]` печатает сами находки. Без него долг видно числом, но
   не видно местом: 60 отступов — это не адрес, а настроение. Платить долг
   вслепую нельзя, а прошлые сессии именно этим и занимались. */
const li = process.argv.indexOf('--list')
if (li !== -1) {
  const pick = process.argv[li + 1]
  const fams = found[pick] ? [pick] : Object.keys(NAMES)
  for (const k of fams) {
    console.log(`\n${NAMES[k]} — ${found[k].length}`)
    for (const line of found[k]) console.log(`    ${line}`)
  }
  process.exit(0)
}

let failed = false
for (const key of Object.keys(NAMES)) {
  const now = counts[key], was = base[key] ?? 0
  if (now > was) {
    failed = true
    console.error(`\n✗ ${NAMES[key]}: было ${was}, стало ${now}`)
    for (const line of found[key].slice(-(now - was) * 3)) console.error(`    ${line}`)
  } else if (now < was) {
    console.log(`✓ ${NAMES[key]}: ${was} → ${now}`)
  } else {
    console.log(`· ${NAMES[key]}: ${now}`)
  }
}

if (failed) {
  console.error('\nНарушений стало больше. Либо чините, либо — если это осознанное')
  console.error('решение — обновляйте базу: npm run check:css -- --update')
  process.exit(1)
}

const total = Object.values(counts).reduce((a, b) => a + b, 0)
const wasTotal = Object.values(base).reduce((a, b) => a + b, 0)
if (total < wasTotal) console.log(`\nДолг сократился: ${wasTotal} → ${total}. Обновите базу.`)
