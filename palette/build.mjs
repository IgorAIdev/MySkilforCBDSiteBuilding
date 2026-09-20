/*
 * СТРОИТЕЛЬ ПАЛИТРЫ. Здесь и только здесь из четырёх красок считаются
 * остальные тридцать.
 *
 * Разделено на три файла 21.09.2026 по слову заказчика («разведи по папкам,
 * чтоб каши не было») и потому, что строитель жил внутри проверки: в день,
 * когда витрина начнёт выводить цвета в CSS, генератор обязан взять ЭТОТ
 * модуль, а не написать свой — иначе появятся два места, где считается одно
 * и то же.
 *
 *   build.mjs   ← вы здесь: краски, шкала, ступень нажатия
 *   rules.mjs      двадцать правил и их пороги
 *   check.mjs      прогон и отчёт (`npm run check:palette`)
 *   sets.json      семь наборов-образцов
 *   starter.json   стартовый набор для нового сайта
 *
 * Разбор, числа и источники — `.claude/skills/craft/references/palette.md`.
 * Закон — `SKILL.md`, «Палитра — это шкала из двенадцати ступеней».
 */

/* Профиль светлоты ступеней — L* эталонной шкалы `sand` пакета
   @radix-ui/colors 3.0.0. Числа снятые, а не назначенные. */
export const PROFILE = {
  light: [99.3, 97.9, 94.8, 92.0, 89.5, 86.7, 82.7, 75.8, 58.4, 54.2, 41.8, 12.2],
  dark: [5.0, 8.7, 13.2, 17.0, 20.2, 24.4, 30.6, 40.8, 46.0, 51.5, 72.9, 94.0],
}

/* Шаг между девятой и десятой ступенями самого эталона. */
export const SOLID_GAP = { light: 4.2, dark: 5.5 }

/** Самая тесная пара самого эталона — 1 → 2 у `sand`: 0.6 L* в тёмной.
 *  Меньше — две ступени с разной работой стали одной краской. */
export const STEP_MIN = 0.6

/* Работа каждой ступени — дословно у Radix, и рядом то же по-русски. */
export const ROLES = [
  'лист страницы', 'карточка', 'контрол в покое', 'контрол под курсором',
  'контрол нажат', 'разделитель', 'граница', 'граница под курсором',
  'заливка кнопки', 'заливка под курсором', 'приглушённый текст', 'основной текст',
]

/* ── краски ──────────────────────────────────────────────────────────────── */

export const channels = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const toHex = (parts) =>
  `#${parts.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`

const linear = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)

export const luminance = (hex) => {
  const [r, g, b] = channels(hex).map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Контраст по WCAG 2.2. Это ВОРОТА: она в основе EN 301 549, и для магазина
 *  в ЕС это закон, а не пожелание. */
export const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** APCA 0.0.98G-4g (Myndex) — РЯДОМ с WCAG, а не вместо неё. Нужна по двум
 *  причинам: обещание эталона дано только в ней, и она ловит то, что формула
 *  WCAG в ТЁМНЫХ парах завышает. Сверено с задокументированными числами
 *  эталона и совпало до десятой: 11-я на 2-й — светлая 66.2–76.9, тёмная
 *  60.0–86.2; 12-я в тёмной — минимум `tomato` 84.2 и 19 шкал ниже 90. */
const screenY = (hex) => {
  const [r, g, b] = channels(hex).map((v) => (v / 255) ** 2.4)
  return 0.2126729 * r + 0.7151522 * g + 0.072175 * b
}
const softBlack = (y) => (y < 0.022 ? y + (0.022 - y) ** 1.414 : y)
export const apca = (text, bg) => {
  const yt = softBlack(screenY(text))
  const yb = softBlack(screenY(bg))
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14
    return Math.abs(s < 0.001 ? 0 : (s - 0.027) * 100)
  }
  const s = (yb ** 0.65 - yt ** 0.62) * 1.14
  return Math.abs(s > -0.001 ? 0 : (s + 0.027) * 100)
}

export const lightness = (hex) => {
  const y = luminance(hex)
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y
}

const lab = (hex) => {
  const [r, g, b] = channels(hex).map(linear)
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047)
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b)
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

/** Тон для этого не годится: золото в 43° от красного и спутать его нельзя,
 *  а вино — в 3° и сливается. */
export const difference = (a, b) => {
  const [x, y] = [lab(a), lab(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

const blend = (from, to, amount) => {
  const a = channels(from)
  const b = channels(to)
  return toHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * amount))
}

export const atLightness = (from, to, want) => {
  let low = 0
  let high = 1
  const rising = lightness(to) > lightness(from)
  for (let i = 0; i < 22; i += 1) {
    const mid = (low + high) / 2
    if (rising ? lightness(blend(from, to, mid)) < want : lightness(blend(from, to, mid)) > want) low = mid
    else high = mid
  }
  return blend(from, to, (low + high) / 2)
}

/** Знак на заливке выбирается, а не хранится: у трёх чужих наборов из трёх
 *  назначенный ими знак на кнопке не читался. */
export const inkOn = (bg) => (ratio('#FFFFFF', bg) >= ratio('#111111', bg) ? '#FFFFFF' : '#111111')

/* ── шкала ───────────────────────────────────────────────────────────────── */

/** Двенадцать ступеней. Девятая цветного ряда — сама краска, десятая
 *  отмеряется ОТ НЕЁ, а не гонится к отметке эталона.
 *
 *  Лестница идёт от фона через краску к тексту и НЕ РАЗВОРАЧИВАЕТСЯ:
 *  ступени 1–8 держатся профиля, но не ближе 1.5 L* к краске со стороны
 *  фона; 11 и 12 — профиля, но каждая не ближе шага заливки к предыдущей
 *  со стороны текста (И189).
 *
 *  ПРОФИЛЬ ДАЁТ ИНТЕРВАЛЫ, А НЕ ОТМЕТКИ (И194). Первая ступень — это фон,
 *  который выбрал заказчик, и он не обязан лежать там, где лежит первая
 *  ступень `sand`. Пока ступени гнались к абсолютным отметкам профиля,
 *  первый шаг лестницы зависел от того, насколько тёмный фон достался: в
 *  тёмной теме карточка поднималась над листом на 2.8–4.2 L* у семи наборов
 *  вместо ровного шага, а в светлой — на 0.7–2.1. Теперь интервалы профиля
 *  откладываются ОТ ФОНА, и шаг у всех наборов один. Это то же правило,
 *  которым уже чинилась десятая ступень, просто применённое с другого конца
 *  лестницы. */
export function scale(paper, ink, seed, mode, card = null) {
  const toward = mode === 'light' ? '#0A0A0A' : '#FAFAFA'
  const dir = mode === 'light' ? -1 : 1 /* куда идёт L* от фона к тексту */
  const gap = dir * SOLID_GAP[mode]
  const solid = seed ? lightness(seed) : 0
  const ahead = (a, b) => (dir < 0 ? Math.min(a, b) : Math.max(a, b)) /* дальше по лестнице */
  const behind = (a, b) => (dir < 0 ? Math.max(a, b) : Math.min(a, b)) /* ближе к фону */
  /* интервалы профиля, отложенные от настоящего фона */
  const base = lightness(paper)
  const mark = (i) => base + (PROFILE[mode][i] - PROFILE[mode][0])
  let last = solid + gap
  const row = PROFILE[mode].map((_, i) => {
    const want = mark(i)
    if (!seed) return i === 0 ? paper : atLightness(paper, ink, want)
    if (i === 8) return seed
    if (i === 9) return atLightness(seed, toward, solid + gap)
    if (i === 0) return paper
    if (i < 8) return atLightness(paper, seed, behind(want, solid - dir * 1.5))
    last = ahead(want, last + gap)
    return atLightness(seed, toward, last)
  })
  return withMutedText(row, seed || paper, seed ? toward : ink, dir, card ?? row[1])
}

/** Одиннадцатая ступень — ЗАМЕРОМ, как граница и кольцо фокуса, а не номером
 *  из профиля.
 *
 *  Эталон обещает на ней Lc 60 на второй ступени, и `sand`, чей профиль мы
 *  заняли, стоит на этом обещании РОВНО: 60.0 — худшая его шкала из 31. С
 *  нашим фоном и нашим текстом запаса не осталось, и обещание переставало
 *  выполняться: в тёмной теме приглушённый текст давал Lc 59.7 при WCAG
 *  8.35 — та самая пара, где WCAG завышает (И191).
 *
 *  Уводится от фона ровно настолько, чтобы обещание выполнить, и не ближе
 *  шага лестницы к двенадцатой: сдвиг выходит 0.1–0.3 L*, один уровень
 *  канала.
 *
 *  Меряется на ТОЙ ЖЕ карточке, на которой меряет правило (И195). Цена и
 *  текст ошибки стоят на нейтральной карточке магазина, а не на второй
 *  ступени собственной цветной шкалы, и пока строитель целился в свою —
 *  он останавливался чуть раньше, чем требует правило: «текст ошибки держит
 *  обещание эталона: 59.98 при норме 60». Дефект скрытый: на семи наборах он
 *  вылез только после того, как лестницу привязали к настоящему фону. */
function withMutedText(row, from, to, dir, card) {
  if (apca(row[10], card) >= 60) return row
  const limit = lightness(row[11]) - dir * STEP_MIN
  const out = row.slice()
  for (let push = 0.1; push <= 40; push += 0.1) {
    const want = lightness(row[10]) + dir * push
    if (dir < 0 ? want < limit : want > limit) break
    out[10] = atLightness(from, to, want)
    if (apca(out[10], card) >= 60) break
  }
  return out
}

/** Наименьший шаг лестницы по ходу от фона к тексту; отрицательный —
 *  лестница развернулась. */
export function tightest(row, mode) {
  const dir = mode === 'light' ? -1 : 1
  let worst = Number.POSITIVE_INFINITY
  for (let i = 1; i < row.length; i += 1) {
    worst = Math.min(worst, dir * (lightness(row[i]) - lightness(row[i - 1])))
  }
  return worst
}

/** Ступень нажатия — та, которой в шкале нет. Вдвое дальше наведения.
 *  Это единственное место, где число дописано нами: у эталона `solid-active`
 *  нет, а на телефоне курсора не существует, и нажатие — единственный ответ,
 *  который получает большинство покупателей. */
export function press(accent, mode) {
  const toward = mode === 'light' ? '#0A0A0A' : '#FAFAFA'
  return atLightness(accent[8], toward, lightness(accent[8]) + (mode === 'light' ? -2 : 2) * SOLID_GAP[mode])
}

/** Первая ступень, которая берёт порог. Именно так выбираются кольцо фокуса и
 *  граница органа управления: у эталона седьмая даёт 1.49 при требуемых трёх. */
export function firstReaching(row, against, need, from) {
  let found = row[from]
  for (let i = from; i < row.length; i += 1) {
    found = row[i]
    if (ratio(row[i], against) >= need) break
  }
  return found
}

/** Весь набор разом: три шкалы, ступень нажатия, граница и кольцо фокуса. */
export function build(paints, mode) {
  const n = scale(paints.paper, paints.ink, null, mode)
  /* Цветные шкалы меряются на НЕЙТРАЛЬНОЙ карточке: цена и текст ошибки
     стоят на ней, а не на второй ступени собственной шкалы (И195). */
  const a = scale(paints.paper, paints.ink, paints.accent, mode, n[1])
  const e = scale(paints.paper, paints.ink, paints.error, mode, n[1])
  const pushed = press(a, mode)
  return {
    mode, paints, n, a, e, pressed: pushed,
    ring: firstReaching(a, n[0], 3, 7),
    bound: firstReaching(n, n[1], 3, 6),
    hover: Math.abs(lightness(a[9]) - lightness(a[8])),
    pushedBy: Math.abs(lightness(pushed) - lightness(a[8])),
  }
}
