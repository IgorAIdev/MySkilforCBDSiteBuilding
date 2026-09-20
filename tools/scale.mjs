/*
 * Строитель шкал: два числа на ступень → рампа, которая между ними течёт.
 *
 * ЧТО ЭТО ТАКОЕ, одной фразой: станок, который из списка «сколько на
 * телефоне и сколько на мониторе» считает весь CSS размеров и воздуха.
 * Владелец говорит «между разделами — 56 и 80», машина пишет
 * `clamp(56px, 30.15px + 4.62vw, 80px)` и ручается, что на телефоне это
 * ровно 56, на макете ровно 80, а между ними течёт без ступенек.
 *
 * ЗАЧЕМ. До 21.09.2026 двадцать пять таких строк стояли в
 * `styles/tokens.css` набранными рукой, а формула к ним — словами в
 * комментарии рядом: «наклон = (макс − мин) / 5.2, свободный член =
 * мин − (макс − мин) × 1.0769, концы на 560 и 1080». Формула, живущая
 * словами, исполняется головой, а голова ошибается ровно там, где числа
 * похожи: у `--sp-11` свободный член скопирован у `--sp-9` (оба 30.77),
 * и ступень, обещавшая 100 на макете, доходила там до 93. Никто этого не
 * видел: ни один сторож набора не умел читать рампу.
 *
 * Это ровно тот же дефект, которым куплена палитра (И194): правило
 * записано, сторож считает, а сделать этим нечего — числа всё равно
 * набирает рука. Поэтому устройство то же самое, и намеренно:
 *
 *   styles/scale.json   — числа ВЛАДЕЛЬЦА: что на телефоне, что на макете
 *   tools/scale.mjs     — эта математика: одна на выпуск и на замер
 *   styles/scale.css    — выпущенное машиной, руками не правится
 *
 * Считает ОДИН код и для выпуска, и для проверки: иначе зелёный отчёт
 * перестанет говорить что-либо о том, чем сайт размечен.
 *
 * Разбор, числа и источники — `.claude/skills/craft/references/scale.md`.
 */

import { PREFIX, BREAKPOINTS } from './kit-config.mjs'
import { RHYTHM, AIR, TARGET, TEXT, TYPE, CONTROL, LAYOUT, SHAPE } from './thresholds.mjs'

/** Корень браузера. Поле пишется в rem (правило «поле растёт с буквами»),
 *  а считается в тех же пикселях, что и всё остальное: делить на 16
 *  приходится в одном месте, и это место здесь. */
export const ROOT_FS = 16

/** Число в CSS так, как его пишут в этом наборе: без нуля впереди
 *  (`.19vw`), без хвостовых нулей (`5vw`, а не `5.00vw`). */
export const num = (n, dp = 2) => {
  const r = Number(n.toFixed(dp))
  const s = String(r)
  if (s.startsWith('0.')) return s.slice(1)
  if (s.startsWith('-0.')) return `-${s.slice(2)}`
  return s
}

const write = (px, unit) => (unit === 'rem' ? `${num(px / ROOT_FS, 4)}rem` : `${num(px)}px`)

/**
 * Рампа одной ступени.
 *
 * `clamp(низ, свободный член + наклон·vw, верх)`, где прямая проходит
 * ЧЕРЕЗ ДВЕ НАЗВАННЫЕ ШИРИНЫ: на узкой она даёт низ, на широкой — верх.
 * Слагаемое в px обязательно: голый `vw` не растёт при зуме (WCAG 1.4.4,
 * F94) — за этим же следит семья `bareVw` в `check:css`.
 *
 * Свободный член считается по НЕокруглённому наклону и округляется после:
 * округлив сначала, получаем прямую, промахивающуюся мимо своих же концов
 * на полпикселя.
 */
export const ramp = ([min, max], [wMin, wMax], unit = 'px') => {
  if (min === max) return write(min, unit)
  const slope = (max - min) / ((wMax - wMin) / 100)
  const base = Number((min - slope * (wMin / 100)).toFixed(2))
  return `clamp(${write(min, unit)}, ${write(base, unit)} + ${num(slope)}vw, ${write(max, unit)})`
}

/** Где рампа окажется на данной ширине — тем же счётом, каким её выпустили.
 *  Нужен замеру: обещание «на 560 будет 56» проверяется подстановкой, а не
 *  доверием к формуле. */
export const at = ([min, max], [wMin, wMax], width) => {
  if (min === max) return min
  const slope = (max - min) / ((wMax - wMin) / 100)
  const base = Number((min - slope * (wMin / 100)).toFixed(2))
  return Math.min(max, Math.max(min, base + Number(num(slope)) * (width / 100)))
}

/* ── чтение набора ───────────────────────────────────────────────────────
 *
 * Ключи по-русски, и это не украшение: файл открывает владелец, а не
 * машина. «воздух → между разделами» он прочтёт, `air.page` — нет.
 *
 * Набор пишется ФОРМУЛОЙ, а не таблицей чисел (И221). Владелец называет:
 *   тело       — два кегля тела: телефон и макет (слой 4 — база);
 *   отношение  — два отношения лестницы размера: телефон и макет;
 *   размер     — имя ступени → показатель степени (base = 0, h2 = 4, xs = −2);
 *   ритм       — имя ступени → множитель тела (Utopia: 0.25 … 6), ступень
 *                округляется к клетке: 2 до 16, 4 до 64, дальше 8 (Tailwind 4);
 *   поле       — роль → имя ступени ритма (одна ступень, в rem);
 *   воздух     — роль → [ступень на телефоне, ступень на макете]: пара «через
 *                ступень» (Utopia), так воздух растёт быстрее текста, как у
 *                живых люкс-магазинов (×1.33…1.5 при росте тела ×1.1);
 *   зазор      — роль → [под курсором, под пальцем];
 *   холст      — ширина коробки страницы в px (`--wrap`): Utopia — max
 *                viewport конфигурации, cbdshop `--layout-canvas` (слой 8);
 *   край       — [ступень на телефоне, ступень на макете] → `--gut`, поле
 *                от края окна до страницы: отдельная роль от зазора сетки
 *                (Carbon: «margins … fixed … even when columns are fluid»),
 *                растёт не больше LAYOUT.edgeGrowth (люкс ×1…1.75,
 *                Atlassian ×2, Utopia ×2.2);
 *   радиус     — роль → px из лестницы SHAPE.radii (M3 ∪ Carbon): xs, ctrl,
 *                card, sheet; полный круг (`--r-pop`) — только главное
 *                действие, его не выбирают (слой 9, И228).
 * Пара чисел [низ, верх] на любом из этих мест тоже читается — так набор
 * писался до И221, и так удобно ПРОБОВАТЬ число, — но клетка и коридоры
 * спрашиваются с неё так же.
 */

/** Ступень ритма по её имени в наборе: `"10"` → `var(--sp-10)`. */
const stepVar = (n) => `var(${PREFIX.space}${n})`

/** Округление к клетке ритма: 2 до 16, 4 до 64, дальше 8. Клетка —
 *  ступенчатая, как у Tailwind 4: шагов больше у базы, меньше вдали. */
export const snap = (px) => {
  const cell = RHYTHM.cell(px)
  return Math.round(px / cell) * cell
}

/** Половина пикселя — предел, до которого кегль имеет смысл писать. */
const half = (px) => Math.round(px * 2) / 2

const isPair = (v) => Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number')

/** Ступень размера: показатель степени → пара по двум отношениям.
 *  Отрицательные ступени считаются телефонным отношением на обоих концах:
 *  с бóльшим отношением макета мелкий текст на макете выходил бы МЕЛЬЧЕ,
 *  чем на телефоне (у Utopia это известная оговорка), а лестница обязана
 *  расти вместе с телом на обоих концах. */
const sizeStep = (body, ratio, n) => {
  const [r0, r1] = n < 0 ? [ratio[0], ratio[0]] : ratio
  return [half(body[0] * r0 ** n), half(body[1] * r1 ** n)]
}

/** Ступень ритма: множитель тела → пара на клетке. Ступень, чей телефонный
 *  конец не выше пола (8), — оптика и внутренность органа: она не течёт
 *  (CLAUDE.md, правило 2: геометрия контрола не течёт). */
const rhythmStep = (body, k) => {
  const lo = snap(body[0] * k)
  if (lo <= RHYTHM.floor) return [lo, lo]
  return [lo, snap(body[1] * k)]
}

/** Развёрнутый набор: каждое имя → пара чисел (низ, верх) в пикселях.
 *  Одна таблица на выпуск, на замер и на стенд — чтобы стенд показывал
 *  ровно то, что выпущено. */
export const resolve = (set) => {
  const out = {
    ширины: set.ширины, тело: set.тело, отношение: set.отношение,
    размер: {}, ритм: {}, поле: {}, воздух: {}, зазор: {},
  }
  const body = isPair(set.тело) ? set.тело : null
  for (const [name, v] of Object.entries(set.размер ?? {})) {
    if (isPair(v)) out.размер[name] = v
    else if (typeof v === 'number') {
      if (!body || !isPair(set.отношение)) throw new Error(`размер «${name}» задан показателем, а тела или отношения в наборе нет`)
      out.размер[name] = sizeStep(body, set.отношение, v)
    } else throw new Error(`размер «${name}»: показатель степени или пара [низ, верх]`)
  }
  for (const [name, v] of Object.entries(set.ритм ?? {})) {
    if (isPair(v)) out.ритм[name] = v
    else if (typeof v === 'number') {
      if (!body) throw new Error(`ритм «${name}» задан множителем, а тела в наборе нет`)
      out.ритм[name] = rhythmStep(body, v)
    } else throw new Error(`ритм «${name}»: множитель тела или пара [низ, верх]`)
  }
  /* Поле — одна ступень ритма: «одна ступень — полям, через ступень —
     воздуху» (Utopia, docs/layers.md §3.4). */
  for (const [name, v] of Object.entries(set.поле ?? {})) {
    if (isPair(v)) { out.поле[name] = v; continue }
    const pair = out.ритм[String(v)]
    if (!pair) throw new Error(`поле «${name}» просит ступень ритма ${v}, которой в наборе нет`)
    out.поле[name] = Object.assign([pair[0], pair[1]], { step: String(v) })
  }
  /* Воздух не заводит своих чисел: он ССЫЛАЕТСЯ на ступени ритма. Вторая
     шкала чисел для воздуха — путь, который Carbon прошёл (`layout-01…07`)
     и отменил обратно в единую: «do not use in new work». Пара ступеней —
     низ одной на телефоне, верх другой на макете. */
  for (const [name, v] of Object.entries(set.воздух ?? {})) {
    const [a, b] = Array.isArray(v) ? v.map(String) : [String(v), String(v)]
    const pa = out.ритм[a], pb = out.ритм[b]
    if (!pa || !pb) throw new Error(`воздух «${name}» просит ступень ритма ${!pa ? a : b}, которой в наборе нет`)
    out.воздух[name] = { step: a, steps: [a, b], pair: [pa[0], pb[1]] }
  }
  /* Зазор — пара [под курсором, под пальцем] в px, либо имя ступени ритма:
     тогда это зазор в сетке или ряду, и он течёт со ступенью. */
  for (const [name, v] of Object.entries(set.зазор ?? {})) {
    if (isPair(v)) { out.зазор[name] = v; continue }
    const pair = out.ритм[String(v)]
    if (!pair) throw new Error(`зазор «${name}» просит ступень ритма ${v}, которой в наборе нет`)
    out.зазор[name] = Object.assign([pair[0], pair[1]], { step: String(v) })
  }
  /* Холст и край — раскладка (слой 8, И227): числа коробки страницы тоже
     из набора, а не рукой в tokens.css. Край — пара ступеней, как воздух:
     он лежит между окном и предметом, с текстом не связан, в px. */
  if (set.холст !== undefined) {
    if (typeof set.холст !== 'number') throw new Error('холст — ширина коробки страницы числом в px')
    out.холст = set.холст
  }
  if (set.край !== undefined) {
    const [a, b] = Array.isArray(set.край) ? set.край.map(String) : [String(set.край), String(set.край)]
    const pa = out.ритм[a], pb = out.ритм[b]
    if (!pa || !pb) throw new Error(`край просит ступень ритма ${!pa ? a : b}, которой в наборе нет`)
    out.край = { steps: [a, b], pair: [pa[0], pb[1]] }
  }
  /* Радиусы — роли по узлу, числом из лестницы (слой 9, И228): Spectrum —
     угол растёт с масштабом, Radix — px × множитель; у нас — своё число в
     каждом наборе, и набор «Тихий» острее прочих. */
  if (set.радиус !== undefined) {
    if (!set.радиус || typeof set.радиус !== 'object') throw new Error('радиус — роли числом: { xs, ctrl, card, sheet }')
    out.радиус = {}
    for (const [name, v] of Object.entries(set.радиус)) {
      if (typeof v !== 'number') throw new Error(`радиус «${name}»: число в px из лестницы ${SHAPE.radii.join(', ')}`)
      out.радиус[name] = v
    }
  }
  return out
}

/* ── выпуск ──────────────────────────────────────────────────────────── */

const block = (sets, name, indent = '  ') => {
  const set = sets[name]
  const r = resolve(set)
  const w = set.ширины
  const lines = []
  const put = (name, value, why) =>
    lines.push(`${indent}${name}: ${value};${why ? `${' '.repeat(Math.max(1, 46 - name.length - value.length))}/* ${why} */` : ''}`)

  for (const [name, pair] of Object.entries(r.размер)) {
    put(`${PREFIX.font}${name}`, ramp(pair, w), set.подписи?.размер?.[name])
  }
  for (const [name, pair] of Object.entries(r.ритм)) {
    put(`${PREFIX.space}${name}`, ramp(pair, w), set.подписи?.ритм?.[name])
  }
  /* Поле — в rem: оно лежит вокруг ТЕКСТА, и когда покупатель поднял шрифт
     в телефоне, буквы выросли, а поле в px осталось бы прежним (WCAG 1.4.4,
     Comeau). Воздух и зазор с текстом не связаны и растут только с шириной
     — они в px. Семья `padPx` не пускает поле обратно. */
  for (const [name, pair] of Object.entries(r.поле)) {
    put(`--pad-${name}`, ramp([pair[0], pair[1]], w, 'rem'), set.подписи?.поле?.[name])
  }
  /* Воздух одной ступени — ссылка на неё; пара ступеней — рампа от низа
     первой к верху второй, и это по-прежнему не своё число. */
  for (const [name, { steps, pair }] of Object.entries(r.воздух)) {
    const why = set.подписи?.воздух?.[name]
    const value = steps[0] === steps[1] ? stepVar(steps[0]) : ramp(pair, w)
    put(`--air-${name}`, value, steps[0] === steps[1] ? why : `${why ? `${why} — ` : ''}ступени ${steps[0]} → ${steps[1]}`)
  }
  for (const [gap, pair] of Object.entries(r.зазор)) {
    put(`--gap-${gap}`, pair.step ? ramp([pair[0], pair[1]], w) : `${num(pair[0])}px`, set.подписи?.зазор?.[gap])
  }
  /* Коробка страницы (слой 8): холст и край — роли раскладки из набора.
     `.wrap` берёт меньшее из холста и окна за вычетом двух краёв. */
  if (r.холст !== undefined) put('--wrap', `${num(r.холст)}px`, 'холст: ширина коробки страницы')
  if (r.край) {
    const { steps, pair } = r.край
    put('--gut', steps[0] === steps[1] ? stepVar(steps[0]) : ramp(pair, w), `край страницы: от окна до предмета — ступени ${steps[0]} → ${steps[1]}`)
  }
  /* Лестница управления: надпись органа не течёт с окном — пункт меню это
     мишень, а не абзац (scales.md, «Надпись контрола живёт в шкале
     управления»). Верхний конец каждой ступени размера, в px, — роль
     --ctrl-fs-*, а не число рукой в tokens.css (И224). */
  for (const [name, pair] of Object.entries(r.размер)) {
    put(`--ctrl-fs-${name}`, `${num(pair[1])}px`, 'надпись органа — не течёт')
  }
  /* Размер органа (слой 7, И226): три высоты из порогов CONTROL, своя семья,
     не ступень ритма. Под пальцем — те же имена, значения в блоке
     @media (pointer: coarse) ниже (coarse()). Текущий размер — `--ctrl-h` и
     `--ctrl-fs`; атрибут data-size="sm|lg" переобъявляет их (base.css). */
  const [sm, md, lg] = CONTROL.heights.fine
  put('--ctrl-h-sm', `${num(sm)}px`, 'орган малый: фишка, сегмент')
  put('--ctrl-h', `${num(md)}px`, 'орган средний: кнопка, поле, лоток — текущий размер')
  put('--ctrl-h-lg', `${num(lg)}px`, 'орган крупный: кнопка покупки, счётчик, строка меню')
  put('--ctrl-target', `${num(CONTROL.target.fine)}px`, 'цель у знака мельче органа (WCAG 2.5.8)')
  put('--ctrl-fs', `var(--ctrl-fs-${CONTROL.text[1]})`, 'надпись текущего размера')
  /* Форма (слой 9, И228): радиусы — роли по узлу из набора; полный круг —
     только главное действие; линия и кольцо — из порогов и не текут. */
  if (r.радиус) {
    for (const [role, px] of Object.entries(r.радиус)) put(`--r-${role}`, `${num(px)}px`, set.подписи?.радиус?.[role] ?? `радиус: ${role}`)
    put('--r-pop', '999px', 'главное действие — единственный полный круг')
  }
  put('--line-w', `${num(SHAPE.line.hair)}px`, 'линия: поле, разделитель, тег — не течёт')
  put('--ring-w', `${num(SHAPE.ring.width)}px`, 'кольцо фокуса (WCAG 2.4.13)')
  put('--ring-off', `${num(SHAPE.ring.offset)}px`, 'отступ кольца от органа')
  const roles = roleBlock(sets, name, indent)
  return roles ? `${lines.join('\n')}

${roles}` : lines.join('\n')
}

/** Зазор под пальцем — второе значение той же переменной, а не вторая
 *  переменная: Primer держит `controlStack.gap` 8 под курсором и 16 под
 *  пальцем одним именем, и всё про палец у набора живёт в этом запросе. */
const coarse = (set, sel) => {
  const pairs = Object.entries(set.зазор ?? {}).filter(([, p]) => isPair(p) && p[1] !== p[0])
  const [sm, md, lg] = CONTROL.heights.coarse
  const body = [
    ...pairs.map(([name, p]) => `--gap-${name}:${num(p[1])}px`),
    `--ctrl-h-sm:${num(sm)}px`, `--ctrl-h:${num(md)}px`, `--ctrl-h-lg:${num(lg)}px`, `--ctrl-target:${num(CONTROL.target.coarse)}px`,
  ].join('; ')
  return `\n@media (pointer:coarse){ ${sel}{ ${body} } }\n`
}

/**
 * Весь файл: `styles/scale.json` → `styles/scale.css`.
 *
 * Первый набор стоит на корне — он показывается, когда никто ничего не
 * выбирал, — И под своим именем, как все (И198: иначе переключатель наборов
 * работает во все стороны, кроме возврата к первому).
 */
export const toCss = (sets) => {
  const names = Object.keys(sets)
  const head =
    `/* Собран tools/scale-css.mjs из styles/scale.json. Руками не правят:\n` +
    `   первый же выпуск сотрёт правку. Числа владельца — в scale.json, здесь\n` +
    `   они СЧИТАНЫ по одной формуле (шкал: ${names.length}).\n\n` +
    `   Рампа каждой ступени проходит через две названные ширины: на узкой\n` +
    `   даёт свой низ, на широкой — свой верх. Концы — швы раскладки. */\n\n`
  let out = head + `:root{\n${block(sets, names[0])}\n}\n` + coarse(sets[names[0]], ':root')
  for (const name of names) {
    const sel = `[data-scale="${name}"]`
    out += `\n${sel}{\n${block(sets, name)}\n}\n` + coarse(sets[name], sel)
  }
  return out
}

/* ── замер ───────────────────────────────────────────────────────────────
 *
 * Меряется НАБОР ЧИСЕЛ, а не выпущенный файл: все дефекты, которыми эта
 * работа куплена, рождаются в числах, а файл — их следствие. Отстал ли файл
 * от чисел, спрашивает `scale-css.mjs --check`.
 */

/** Порог различимости соседних ступеней. Тот же, что у семьи `nearStep` в
 *  `check:css`, и по той же причине: ниже 8% разница в 13 и 14 пикселей не
 *  видна никому, включая того, кто её ставил. */
export const NEAR = RHYTHM.near
/** Разброс одной ступени. Utopia роняет ступень, когда верх больше низа в
 *  2.5 раза: выше этого рампа при зуме 200% упирается в потолок раньше,
 *  чем текст вырастет вдвое (WCAG 1.4.4). */
export const SPREAD = RHYTHM.spread
/** Воздух между разделами к полю карточки. Замер семи живых люкс-магазинов
 *  20.09.2026: Muji 2.6…3.5 : 1, Glossier 5 : 1 (docs/layers.md, §3.3).
 *  Ниже трёх предметы и промежутки одного размера — ритма нет. */
export const AIR_TO_PAD = AIR.toPad
/** Насколько роль растёт от телефона к макету. Тот же замер: ×1.33…1.5 у
 *  всех семи. Спрашивается с воздуха — он и держит «дорогой» вид. */
export const GROWTH = AIR.growth
/** Поле не бывает нулём: предмет, содержимое которого лежит на его
 *  собственном крае, — не предмет, а обрыв. Ниже 8 — доводка, не ступень. */
export const PAD_FLOOR = RHYTHM.floor
/** Зазор между соседними целями под пальцем. WCAG 2.2 «Target Size
 *  (Minimum)» засчитывает цель меньше 24 только при таком же просвете;
 *  Primer держит 16. */
export const TAP_GAP = TARGET.gap.coarse

const ladder = (pairs, kind, findings) => {
  const names = Object.keys(pairs)
  for (let i = 1; i < names.length; i++) {
    const a = pairs[names[i - 1]], b = pairs[names[i]]
    for (const end of [0, 1]) {
      const where = end === 0 ? 'узкий конец' : 'широкий конец'
      if (b[end] <= a[end]) {
        findings.push({
          rule: `лестница ${kind} не убывает`,
          got: `${names[i - 1]} → ${names[i]}: ${a[end]} → ${b[end]}px (${where})`,
          need: 'следующая ступень больше предыдущей на обоих концах',
        })
      } else if (b[end] / a[end] < NEAR) {
        findings.push({
          rule: `ступени ${kind} различимы`,
          got: `${names[i - 1]} → ${names[i]}: ${a[end]} → ${b[end]}px (+${Math.round((b[end] / a[end] - 1) * 100)}%, ${where})`,
          need: `не ближе ${Math.round((NEAR - 1) * 100)}%`,
        })
      }
    }
  }
}

/** Находки одного набора. Пустой список — набор в норме. */
export const auditScale = (set) => {
  const findings = []
  const w = set.ширины

  if (!Array.isArray(w) || w.length !== 2 || !(w[0] < w[1])) {
    findings.push({ rule: 'две ширины', got: JSON.stringify(w ?? null), need: 'узкая и широкая, узкая меньше' })
    return findings
  }
  /* Концы рампы — НАЗВАННЫЕ швы, а не произвольные числа. Иначе шкала
     течёт мимо тех ширин, на которых раскладка меняет смысл, и «ступенька
     размера на шве» (запрет 3) появляется там, где её никто не искал. */
  for (const width of w) {
    if (!BREAKPOINTS.includes(width)) {
      findings.push({
        rule: 'концы рампы — швы раскладки',
        got: `${width}px`,
        need: `один из швов ${BREAKPOINTS.join(', ')}`,
      })
    }
  }

  let r
  try { r = resolve(set) } catch (e) {
    findings.push({ rule: 'набор читается', got: e.message, need: 'см. заголовок tools/scale.mjs' })
    return findings
  }
  /* Основание (слой 4): два кегля тела и отношение лестницы — в коридоре.
     Ниже малой секунды ступени неразличимы, выше квинты между телом и
     заголовком не помещается подзаголовок. */
  if (isPair(set.отношение)) {
    for (const [i, ratio] of set.отношение.entries()) {
      if (ratio < TYPE.ratio[0] || ratio > TYPE.ratio[1]) {
        findings.push({ rule: 'отношение лестницы', got: `${i ? 'макет' : 'телефон'}: ${ratio}`, need: `${TYPE.ratio[0]}…${TYPE.ratio[1]}` })
      }
    }
  }
  ladder(r.размер, 'размера', findings)
  ladder(r.ритм, 'ритма', findings)

  for (const [kind, table] of [['размера', r.размер], ['ритма', r.ритм], ['поля', r.поле]]) {
    for (const [name, [min, max]] of Object.entries(table)) {
      if (max < min) {
        findings.push({ rule: `верх не ниже низа (${kind})`, got: `${name}: ${min} → ${max}px`, need: 'на макете не меньше, чем на телефоне' })
      }
    }
  }
  /* Нижний конец каждой ступени — телефонный размер по нормам (scales.md,
     «Нижний конец шкалы — это телефонный размер, и он по нормам»). */
  for (const [name, floor] of Object.entries(TYPE.floor)) {
    const pair = r.размер[name]
    if (pair && pair[0] < floor) {
      findings.push({ rule: 'нижний конец по нормам', got: `${name}: ${pair[0]}px на телефоне`, need: `не меньше ${floor}px` })
    }
  }
  if (r.размер.h2 && r.размер.base && r.размер.h2[0] / r.размер.base[0] < TYPE.headContrast) {
    findings.push({ rule: 'заголовок к телу', got: `${r.размер.h2[0]} : ${r.размер.base[0]} = ${(r.размер.h2[0] / r.размер.base[0]).toFixed(2)} : 1 на телефоне`, need: `не меньше ${TYPE.headContrast} : 1` })
  }
  /* Клетка: концы ступени ритма лежат на клетке — 2 до 16, 4 до 64, дальше 8.
     Почти все числа семи люкс-магазинов кратны 4, большинство — 8. */
  for (const [name, pair] of Object.entries(r.ритм)) {
    for (const [i, px] of pair.entries()) {
      if (px !== snap(px)) {
        findings.push({ rule: 'клетка ритма', got: `${name}: ${px}px (${i ? 'макет' : 'телефон'})`, need: `на клетке ${RHYTHM.cell(px)} — ${snap(px)}px` })
      }
    }
  }

  for (const [kind, table] of [['размера', r.размер], ['ритма', r.ритм], ['поля', r.поле]]) {
    for (const [name, [min, max]] of Object.entries(table)) {
      if (max / min > SPREAD) {
        findings.push({
          rule: `разброс ступени ${kind}`,
          got: `${name}: ${min} → ${max}px (×${(max / min).toFixed(2)})`,
          need: `верх не больше ${SPREAD} низов`,
        })
      }
      /* Обещание подстановкой: на узкой ширине рампа обязана дать свой низ,
         на широкой — свой верх. Так ловится свободный член, списанный у
         соседней ступени: `--sp-11` обещал 100 и давал 93. */
      for (const [width, want] of [[w[0], min], [w[1], max]]) {
        const got = at([min, max], w, width)
        if (Math.abs(got - want) > 0.1) {
          findings.push({
            rule: `рампа держит свой конец (${kind})`,
            got: `${name}: на ${width}px даёт ${got.toFixed(2)}px`,
            need: `${want}px`,
          })
        }
      }
    }
  }

  for (const [name, [min]] of Object.entries(r.поле)) {
    if (min < PAD_FLOOR) {
      findings.push({ rule: 'поле не ноль', got: `${name}: ${min}px на узком конце`, need: `не меньше ${PAD_FLOOR}px` })
    }
  }

  /* Воздух страницы к полю карточки — то, чем держится дорогой вид. Роли
     названы в наборе; если владелец назвал их иначе, правило молчит, а не
     придумывает себе предмет. */
  const air = r.воздух['page'] ?? r.воздух['страница']
  const pad = r.поле['card'] ?? r.поле['карточка']
  if (air && pad) {
    for (const end of [0, 1]) {
      const ratio = air.pair[end] / pad[end]
      if (ratio < AIR_TO_PAD) {
        findings.push({
          rule: 'воздух к полю',
          got: `${air.pair[end]} : ${pad[end]} = ${ratio.toFixed(1)} : 1 (${end === 0 ? 'узкий' : 'широкий'} конец)`,
          need: `не меньше ${AIR_TO_PAD} : 1`,
        })
      }
    }
  }
  /* Рост спрашивается с КАЖДОГО воздуха, взятого парой ступеней: это те роли,
     что держат «дорогой» вид, и у живых магазинов все они растут в одном
     коридоре. Воздух одной ступени растёт с текстом — с него не спрашивается. */
  for (const [name, { steps, pair }] of Object.entries(r.воздух)) {
    if (steps[0] === steps[1]) continue
    const growth = pair[1] / pair[0]
    const [lo, hi] = name === 'page' || name === 'страница' ? GROWTH.page : GROWTH.other
    if (growth < lo || growth > hi) {
      findings.push({
        rule: 'воздух растёт в коридоре',
        got: `${name}: ${pair[0]} → ${pair[1]}px (×${growth.toFixed(2)}, ступени ${steps[0]} → ${steps[1]})`,
        need: `×${lo}…${hi} — ${lo === GROWTH.page[0] ? 'замер воздуха между разделами у живых магазинов' : 'от роста текста до самого широкого замеренного расстояния'}`,
      })
    }
  }

  for (const [name, [fine, tap]] of Object.entries(r.зазор)) {
    /* Зазор ступенью — не пара под указатель: с него спрашивается клетка, не палец. */
    if (r.зазор[name].step) continue
    if (tap < TAP_GAP) {
      findings.push({ rule: 'зазор под пальцем', got: `${name}: ${tap}px`, need: `не меньше ${TAP_GAP}px` })
    }
    if (tap < fine) {
      findings.push({ rule: 'палец не теснее курсора', got: `${name}: ${tap} против ${fine}px`, need: 'под пальцем не меньше' })
    }
  }

  /* Коробка страницы (слой 8). Холст не уже верхнего шва — иначе верх рамп
     недостижим: страница кончилась раньше, чем шкала дошла до макета. Край
     растёт в своём коридоре: люкс держит его почти постоянным, системы — до
     ×2.2; выше — край съедает телефон или пустует на макете. */
  if (r.холст !== undefined && r.холст < w[1]) {
    findings.push({ rule: 'холст не уже верхнего шва', got: `${r.холст}px`, need: `не меньше ${w[1]}px` })
  }
  /* Форма (слой 9): каждый радиус — ступень лестницы M3 ∪ Carbon, лист
     скруглён не меньше карточки, карточка — не меньше органа (концентрика:
     внешний угол не острее внутреннего). */
  if (r.радиус) {
    for (const [role, px] of Object.entries(r.радиус)) {
      if (!SHAPE.radii.includes(px)) {
        findings.push({ rule: 'радиус из лестницы', got: `${role}: ${px}px`, need: `одна из ступеней ${SHAPE.radii.join(', ')} (M3, Carbon)` })
      }
    }
    const order = ['ctrl', 'card', 'sheet'].filter((k) => k in r.радиус).map((k) => [k, r.радиус[k]])
    for (let i = 1; i < order.length; i++) {
      if (order[i][1] < order[i - 1][1]) {
        findings.push({ rule: 'радиусы вложены', got: `${order[i][0]} ${order[i][1]}px < ${order[i - 1][0]} ${order[i - 1][1]}px`, need: 'внешний предмет не острее вложенного: орган ≤ карточка ≤ лист' })
      }
    }
  }
  if (r.край) {
    const { steps, pair } = r.край
    const growth = pair[1] / pair[0]
    const [lo, hi] = LAYOUT.edgeGrowth
    if (growth < lo || growth > hi) {
      findings.push({
        rule: 'край растёт в коридоре',
        got: `${pair[0]} → ${pair[1]}px (×${growth.toFixed(2)}, ступени ${steps[0]} → ${steps[1]})`,
        need: `×${lo}…${hi} — люкс держит край почти постоянным (Diptyque 12 / 12, Byredo ×1.75), Atlassian 16 → 32, Utopia 18 → 40`,
      })
    }
  }

  return findings
}

/* ── вторая половина замера: шкала объявлена в одном месте ────────────────
 *
 * Строитель отвечает за свои числа, но не мешает написать рядом ещё одну
 * ступень рукой — а это тот самый признак заплатки из правил проекта: на
 * вопрос «где это решается?» ответов стало два. Ровно так и жил `--sp-11`:
 * рампа, набранная рукой рядом с формулой, описанной словами.
 */

/** Имена, которые выпускает строитель: их объявляет он и только он. */
export const builtNames = (sets) => {
  const names = new Set()
  for (const set of Object.values(sets)) {
    const r = resolve(set)
    for (const name of Object.keys(r.размер)) names.add(`${PREFIX.font}${name}`)
    for (const name of Object.keys(r.ритм)) names.add(`${PREFIX.space}${name}`)
    for (const name of Object.keys(r.поле)) names.add(`--pad-${name}`)
    for (const name of Object.keys(r.воздух)) names.add(`--air-${name}`)
    for (const name of Object.keys(r.зазор)) names.add(`--gap-${name}`)
    for (const name of Object.keys(r.размер)) names.add(`--ctrl-fs-${name}`)
    for (const name of ['--ctrl-h-sm', '--ctrl-h', '--ctrl-h-lg', '--ctrl-target', '--ctrl-fs']) names.add(name)
    if (r.холст !== undefined) names.add('--wrap')
    if (r.край) names.add('--gut')
    if (r.радиус) { for (const role of Object.keys(r.радиус)) names.add(`--r-${role}`); names.add('--r-pop') }
    for (const name of ['--line-w', '--ring-w', '--ring-off']) names.add(name)
  }
  for (const setName of Object.keys(sets)) {
    for (const [role, r] of Object.entries(rolesOf(sets, setName))) {
      for (const part of ['lead', 'weight', 'track']) names.add(`--${role}-${part}`)
      if (Array.isArray(r.размер) || r.размер !== `--${role}-size`) names.add(`--${role}-size`)
      if (r.мера && r.мера !== 'нет') names.add(`--${role}-measure`)
    }
  }
  return names
}

/** Разбор рампы обратно в числа: `clamp(48px, 30.77px + 3.08vw, 64px)` →
 *  низ, верх, свободный член, наклон. Не рампа — `null`. */
export const readRamp = (value) => {
  const m = String(value).match(
    /clamp\(\s*(-?[\d.]+)(px|rem)\s*,\s*(-?[\d.]+)(px|rem)\s*\+\s*(-?[\d.]+)vw\s*,\s*(-?[\d.]+)(px|rem)\s*\)/)
  if (!m) return null
  const k = (n, unit) => Number(n) * (unit === 'rem' ? ROOT_FS : 1)
  return { min: k(m[1], m[2]), base: k(m[3], m[4]), slope: Number(m[5]), max: k(m[6], m[7]) }
}

/**
 * Держит ли рукописная рампа свои концы на названных ширинах.
 *
 * Тот самый замер, которого не было: `--sp-11` обещал 100 пикселей на
 * макете и давал там 93, потому что свободный член был списан у `--sp-9`.
 * Глазом это не видно — числа правдоподобные, — а подстановкой видно сразу.
 */
export const missesEnds = (value, [wMin, wMax]) => {
  const r = readRamp(value)
  if (!r) return null
  const on = (width) => r.base + r.slope * (width / 100)
  const lo = on(wMin), hi = on(wMax)
  const off = []
  if (Math.abs(lo - r.min) > 0.5) off.push(`на ${wMin}px даёт ${lo.toFixed(1)} вместо ${r.min}`)
  if (Math.abs(hi - r.max) > 0.5) off.push(`на ${wMax}px даёт ${hi.toFixed(1)} вместо ${r.max}`)
  return off.length ? off.join('; ') : null
}

/**
 * Находки по файлам стилей: имя строителя, объявленное мимо него, и
 * рукописная рампа, промахивающаяся мимо своих концов.
 *
 * `sheets` — список `{ rel, css }` (выпущенный файл в него не входит: его
 * пишет машина). `widths` — две названные ширины первого набора.
 */
export const auditSheets = (sheets, sets) => {
  const built = builtNames(sets)
  const widths = Object.values(sets)[0]?.ширины ?? [560, 1080]
  const findings = []
  for (const { rel, css } of sheets) {
    for (const m of css.matchAll(/(?:^|[;{])\s*(--[\w-]+)\s*:\s*([^;}]+)/g)) {
      const [, name, value] = m
      const line = css.slice(0, m.index).split('\n').length
      if (built.has(name)) {
        /* Переобъявить роль РОЛЬЮ — законно и нужно: лист на тёмной палубе
           берёт поле карточки (`--pad-sheet:var(--pad-card)`), витрина
           переобъявляет роли, а не шкалу (docs/layers.md, §3.4). Находка —
           только ЧИСЛО на имени строителя: это и есть второй источник.
           Чего правило не ловит, сказано вслух: подмену роли ролью на корне
           — она тоже второй источник выбора, но отличить её от законной
           местной подмены чтением файла нельзя. */
        if (/-?[\d.]+(px|rem|em|vw|vh|cqi|cqw|%)/.test(value.replace(/var\([^()]*(?:\([^()]*\)[^()]*)*\)/g, ' '))) {
          findings.push({
            rule: 'число на имени строителя',
            got: `${rel}:${line}  ${name}: ${value.trim().slice(0, 40)}`,
            need: 'ступени и роли выпускает строитель — правьте styles/scale.json',
          })
        }
        continue
      }
      if (!new RegExp(`^(?:${PREFIX.font}|${PREFIX.space}|--pad-)`).test(name)) continue
      const off = missesEnds(value, widths)
      if (off) {
        findings.push({ rule: 'рампа мимо своих концов', got: `${rel}:${line}  ${name}: ${off}`, need: 'считать по формуле — npm run scale' })
      }
    }
  }
  return findings
}

/**
 * Ступень — по просителю. Ступень, которую не читает ни роль набора, ни один
 * файл стилей, — не ступень, а число про запас: у Radix девять ступеней
 * ритма потому, что девять просят, у Tailwind 4 в теме ни одного `--spacing-N`
 * (docs/layers.md, §3.2). Так жил `--sp-11`: выпускался, не читался никем и
 * промахивался мимо своего конца — и никто не видел.
 */
export const auditReaders = (sheets, sets) => {
  const findings = []
  const first = Object.values(sets)[0]
  if (!first) return findings
  const r = resolve(first)
  const css = sheets.map((s) => s.css).join('\n')
  /* Просители собираются по ВСЕМ наборам: ступени у них общие, и ступень,
     которую просит воздух хотя бы одного набора, живая. */
  const asked = new Set()
  for (const name of Object.keys(sets)) {
    const rs = resolve(sets[name])
    for (const p of Object.values(rs.поле)) if (p.step) asked.add(`${PREFIX.space}${p.step}`)
    for (const a of Object.values(rs.воздух)) for (const st of a.steps) asked.add(`${PREFIX.space}${st}`)
    for (const g of Object.values(rs.зазор)) if (g.step) asked.add(`${PREFIX.space}${g.step}`)
    if (rs.край) for (const st of rs.край.steps) asked.add(`${PREFIX.space}${st}`)
    for (const role of Object.values(rolesOf(sets, name))) {
      if (typeof role.размер === 'string') asked.add(role.размер)
    }
  }
  const names = [
    ...Object.keys(r.размер).map((n) => `${PREFIX.font}${n}`),
    ...Object.keys(r.ритм).map((n) => `${PREFIX.space}${n}`),
  ]
  for (const name of names) {
    if (asked.has(name)) continue
    if (new RegExp(`var\\(${name}[,)]`).test(css)) continue
    /* Лестница управления берёт верх ступени размера числом: орган, читающий
       --ctrl-fs-sm, просит и ступень --fs-sm. */
    if (name.startsWith(PREFIX.font) && new RegExp(`var\\(--ctrl-fs-${name.slice(PREFIX.font.length)}[,)]`).test(css)) continue
    findings.push({ rule: 'ступень без просителя', got: name, need: 'ступень заводится там, где её просит роль или файл стилей — уберите из styles/scale.json или назовите просителя' })
  }
  return findings
}

/* ── роли текста ─────────────────────────────────────────────────────────
 *
 * Ступень отвечает на «какого размера», но набор текста — это пять фактов,
 * а не один: размер, межстрочье, вес, разрядка и мера строки. Пока названа
 * одна пятая, остальные четыре набирает каждое место само — и набирает
 * по-разному.
 *
 * Замер 21.09.2026 показал это ровно: два крупных заголовка в одном файле
 * примитивов. `.ledeText h1` — межстрочье 1.1, вес 700, разрядка −.04em.
 * `.pagehead h1` — вес 700, разрядка −.03em и НИ ОДНОГО межстрочья, то есть
 * наследует 1.45 от тела страницы: на 42 пикселях это 61 пиксель между
 * строками там, где канон крупного заголовка — 46. Заголовок из двух строк
 * разваливается, и виноватого в файле не видно: там просто нечего смотреть.
 *
 * Поэтому роль объявляется целиком и в одном месте. Размер она БЕРЁТ —
 * ступень шкалы или названную кривую (`--hero-size`, `--fs-page` считаются
 * от своего контейнера, а не от окна, и остаются там, где объявлены).
 */

/** Вес, который вообще бывает у текста. 800 и выше — это счётчик на
 *  контроле, а не роль набора. */
export const WEIGHTS = TEXT.weights
/** Межстрочье заголовка: 1.1…1.25 — канон крупного кегля, он уже был
 *  записан словами в примитиве. Выше — строки разъезжаются. */
export const HEAD_LEAD = TEXT.headLead
/** Межстрочье текста: ниже 1.35 строки склеиваются; 1.5 обязан не ломать
 *  вёрстку (WCAG 1.4.12), и коридор держится вокруг него. */
export const TEXT_LEAD = TEXT.textLead
/** Разрядка: больше 0.05em в любую сторону — это уже не набор, а приём. */
export const TRACK_MAX = TEXT.trackMax

/** Роли текста набора. Объявляет их ПЕРВЫЙ набор: межстрочье и вес — факты
 *  типографики, а не плотности, и от «тесно/просторно» не зависят. Набор,
 *  объявивший своё, берёт своё. */
export const rolesOf = (sets, name) =>
  sets[name]?.текст ?? sets[Object.keys(sets)[0]]?.текст ?? {}

const roleBlock = (sets, name, indent = '  ') => {
  const roles = rolesOf(sets, name)
  const w = sets[name].ширины
  const lines = []
  for (const [role, r] of Object.entries(roles)) {
    const size = Array.isArray(r.размер) ? ramp(r.размер, w) : `var(${r.размер})`
    /* Роль, чей размер ЕСТЬ переменная того же имени (`hero` ← `--hero-size`),
       своего `--hero-size` не объявляет: это ссылка на саму себя, и браузер
       погасит её вместе со всей ролью. */
    if (Array.isArray(r.размер) || r.размер !== `--${role}-size`) {
      lines.push(`${indent}--${role}-size: ${size};`)
    }
    lines.push(`${indent}--${role}-lead: ${r.межстрочье};`)
    lines.push(`${indent}--${role}-weight: ${r.вес};`)
    lines.push(`${indent}--${role}-track: ${r.разрядка};`)
    if (r.мера && r.мера !== 'нет') lines.push(`${indent}--${role}-measure: var(${r.мера});`)
  }
  return lines.join('\n')
}

/** Находки по ролям текста. Числа порогов — выше, каждое со своей причиной. */
export const auditRoles = (sets, name) => {
  const findings = []
  const roles = rolesOf(sets, name)
  for (const [role, r] of Object.entries(roles)) {
    const need = (field, what) => {
      if (r[field] === undefined || r[field] === null || r[field] === '') {
        findings.push({ rule: 'роль текста неполна', got: `${role}: нет «${field}»`, need: what })
        return false
      }
      return true
    }
    /* Мера спрашивается наравне с остальными, и «нет» — законный ответ:
       заголовку меру назначают вёрсткой, а не шкалой. Незаполненной она
       быть не может: молчание и «нет» — разные вещи. */
    const full = ['размер', 'межстрочье', 'вес', 'разрядка', 'род', 'мера']
      .map((f) => need(f, 'роль объявляется целиком: размер, межстрочье, вес, разрядка, род, мера'))
      .every(Boolean)
    if (!full) continue

    if (!['заголовок', 'текст'].includes(r.род)) {
      findings.push({ rule: 'род роли', got: `${role}: «${r.род}»`, need: 'заголовок или текст' })
      continue
    }
    const head = r.род === 'заголовок'
    const [lo, hi] = head ? HEAD_LEAD : TEXT_LEAD
    if (r.межстрочье < lo || r.межстрочье > hi) {
      findings.push({
        rule: `межстрочье ${head ? 'заголовка' : 'текста'}`,
        got: `${role}: ${r.межстрочье}`,
        need: `${lo}…${hi}`,
      })
    }
    if (!WEIGHTS.includes(r.вес)) {
      findings.push({ rule: 'вес роли', got: `${role}: ${r.вес}`, need: WEIGHTS.join(', ') })
    }
    const track = Number(String(r.разрядка).replace('em', '')) || 0
    if (Math.abs(track) > TRACK_MAX) {
      findings.push({ rule: 'разрядка', got: `${role}: ${r.разрядка}`, need: `не больше ${TRACK_MAX}em в любую сторону` })
    }
    /* Сжимают КРУПНОЕ: на большом кегле буквы и так стоят просторно.
       Разгоняют МЕЛКОЕ: подпись и надзаголовок читаются по буквам. */
    if (track < 0 && !head) {
      findings.push({ rule: 'разрядка сжимает текст', got: `${role}: ${r.разрядка}`, need: 'отрицательная — только у заголовка' })
    }
    if (track > 0 && head) {
      findings.push({ rule: 'разрядка разгоняет заголовок', got: `${role}: ${r.разрядка}`, need: 'положительная — только у мелкого текста' })
    }
  }
  return findings
}
