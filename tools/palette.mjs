/*
 * Палитра: построение шкалы и её замер. Один файл на всё.
 *
 * До 21.09.2026 математика жила внутри `check-palette.mjs` и никуда из него
 * не выходила: набор можно было ПРОВЕРИТЬ, но нельзя ПОСТРОИТЬ. Двенадцать
 * ступеней считались, чтобы тут же быть выброшенными, а цвета сайта стояли
 * в `styles/tokens.css` набранными рукой — то есть закон о шкале и краски
 * магазина не встречались нигде. Отсюда и вышло: сторож зелёный, правила
 * записаны, а собрать по ним сайт нечем.
 *
 * Теперь считают здесь, а читают трое: `check-palette.mjs` (замер),
 * `palette-css.mjs` (выпуск `styles/palette.css`, из которого собран сайт)
 * и тесты набора.
 *
 * Разбор, числа и источники — `.claude/skills/palette/references/palette.md`.
 * Закон — `SKILL.md`, «Палитра — это шкала из двенадцати ступеней».
 */

import { readFileSync } from 'node:fs'
import { CONTRAST, COLOUR } from './thresholds.mjs'

/* Профиль светлоты ступеней — L* эталонной шкалы `sand` пакета
   @radix-ui/colors 3.0.0. Числа снятые, а не назначенные. */
export const PROFILE = {
  light: [99.3, 97.9, 94.8, 92.0, 89.5, 86.7, 82.7, 75.8, 58.4, 54.2, 41.8, 12.2],
  dark: [5.0, 8.7, 13.2, 17.0, 20.2, 24.4, 30.6, 40.8, 46.0, 51.5, 72.9, 94.0],
}

/* Шаг между девятой и десятой ступенями самого эталона. */
export const SOLID_GAP = { light: 4.2, dark: 5.5 }

/* Первые два порога — WCAG 2.2 (SC 1.4.3 и 1.4.11). Третий наш: разбор в
   palette.md, «Фирменный цвет совпал с красным». */
/* Четвёртый и пятый — обещание САМОГО эталона, снятое с его файлов: 11-я
   ступень даёт Lc 60 на 2-й той же шкалы, 12-я — Lc 90. Это единственная
   метрика, в которой эталон вообще что-то обещает (И191). */
export const NEED = { text: CONTRAST.text, control: CONTRAST.control, brandApart: COLOUR.brandApart, mutedLc: COLOUR.mutedLc, mainLc: COLOUR.mainLc }

/* ── Краски: перевод и замер ─────────────────────────────────────────── */

/* Краска читается так, как записана (И246): `#FFF` — белый, а не `#000FFF`;
   имя цвета, прозрачность и опечатка — отказ с именем, а не молча мусор. */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const channels = (hex) => {
  if (typeof hex !== 'string' || !HEX.test(hex)) throw new Error(`Не краска: ${JSON.stringify(hex)} — нужна краска вида #RRGGBB или #RGB`)
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex
  const n = Number.parseInt(full.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (parts) =>
  `#${parts.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`
const linear = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
const unlinear = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)
const luminance = (hex) => {
  const [r, g, b] = channels(hex).map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
/* APCA 0.0.98G-4g (Myndex) — РЯДОМ с WCAG, а не вместо неё. WCAG остаётся
   воротами (она в основе EN 301 549), APCA нужна по двум причинам: обещание
   эталона дано только в ней, и она ловит то, что формула WCAG в ТЁМНЫХ парах
   завышает контраст. Сверено с задокументированными числами эталона: 11-я на
   2-й — light 66.2–76.9, dark 60.0–86.2; 12-я в тёмной — минимум tomato 84.2
   и 19 шкал ниже 90. Совпало до десятой. */
const screenY = (hex) => {
  const [r, g, b] = channels(hex).map((v) => (v / 255) ** 2.4)
  return 0.2126729 * r + 0.7151522 * g + 0.072175 * b
}
const softBlack = (y) => (y < 0.022 ? y + (0.022 - y) ** 1.414 : y)
/* loClip 0.1 и deltaYmin 0.0005 — как в apca-w3 0.0.98G (И246): с 0.001 и без
   deltaYmin почти одинаковые краски давали не ноль, а случайное число. */
export const apca = (text, bg) => {
  const yt = softBlack(screenY(text))
  const yb = softBlack(screenY(bg))
  if (Math.abs(yb - yt) < 0.0005) return 0
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14
    return s < 0.1 ? 0 : Math.abs((s - 0.027) * 100)
  }
  const s = (yb ** 0.65 - yt ** 0.62) * 1.14
  return s > -0.1 ? 0 : Math.abs((s + 0.027) * 100)
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
/* Тон для этого не годится: золото в 43° от красного и спутать его нельзя,
   а вино — в 3° и сливается. */
export const difference = (a, b) => {
  const [x, y] = [lab(a), lab(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

/* Oklab/Oklch (Björn Ottosson). Нужен он ровно за одним: в нём у краски
   есть ТОН отдельно от светлоты и насыщенности, и ступень можно поставить
   на нужную светлоту, НЕ РАСТЕРЯВ тон. Прямая в sRGB так не умеет — из-за
   неё и обесцвечивалась середина лестницы. Проверено обратным переводом:
   шесть наших красок возвращаются в тот же шестнадцатеричный код. */
const rgbToOklab = ([r, g, b]) => {
  const R = linear(r * 255)
  const G = linear(g * 255)
  const B = linear(b * 255)
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}
const oklabToRgb = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [
    unlinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    unlinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    unlinear(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ]
}
/** [светлота 0–1, насыщенность, тон в градусах]. */
export const oklch = (hex) => {
  const [L, a, b] = rgbToOklab(channels(hex).map((v) => v / 255))
  return [L, Math.hypot(a, b), (Math.atan2(b, a) * 180) / Math.PI < 0
    ? (Math.atan2(b, a) * 180) / Math.PI + 360
    : (Math.atan2(b, a) * 180) / Math.PI]
}
const inGamut = (rgb) => rgb.every((v) => v >= -0.0008 && v <= 1.0008)
const fromOklch = ([L, C, H]) => {
  const h = (H * Math.PI) / 180
  return oklabToRgb([L, C * Math.cos(h), C * Math.sin(h)])
}
/** Краска вне охвата экрана гасится насыщенностью, а не светлотой: светлота
 *  несёт все пороги контраста, и уступать обязано то, что порогов не несёт. */
const clampChroma = ([L, C, H]) => {
  if (inGamut(fromOklch([L, C, H]))) return fromOklch([L, C, H])
  let low = 0
  let high = C
  for (let i = 0; i < 18; i += 1) {
    const mid = (low + high) / 2
    if (inGamut(fromOklch([L, mid, H]))) low = mid
    else high = mid
  }
  return fromOklch([L, low, H])
}

const blend = (from, to, amount) => {
  const a = channels(from)
  const b = channels(to)
  return toHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * amount))
}
const atLightness = (from, to, want) => {
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

/** Ступень: заданная светлота в CIE L*, заданные тон и насыщенность.
 *
 *  Светлота ищется подбором по Oklch-светлоте, потому что пороги контраста
 *  и весь набор замеров стоят на CIE L*, а тон и насыщенность держатся в
 *  Oklch. Смешивать нельзя — но и выбрасывать одно ради другого тоже:
 *  каждое отвечает за своё. */
const atStep = (wantL, chroma, hue) => {
  let low = 0
  let high = 1
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2
    if (lightness(toHex(clampChroma([mid, chroma, hue]).map((v) => v * 255))) < wantL) low = mid
    else high = mid
  }
  return toHex(clampChroma([(low + high) / 2, chroma, hue]).map((v) => v * 255))
}

/* Знак на заливке выбирается, а не хранится: у трёх чужих наборов из трёх
   назначенный ими знак на кнопке не читался. */
export const inkOn = (bg) => {
  const preferred = ratio('#FFFFFF', bg) >= ratio('#111111', bg) ? '#FFFFFF' : '#111111'
  // Mid-tone backgrounds can fail 4.5 with BOTH white and soft black.
  // Pure black is limited to this measured on-colour role, never page ink.
  return ratio(preferred, bg) >= NEED.text ? preferred : '#000000'
}

/* ── Форма лестницы ──────────────────────────────────────────────────── */

/* Слепок 30 шкал эталона: светлота, дуга насыщенности и тон девятой у
   каждой. Собран `palette-profile.mjs`, правится только им. */
/* Читается по первому спросу, а не при загрузке: слепок собирает
   `palette-profile.mjs`, и тот в свой черёд считает этим же файлом. */
let cache = null
const FAMILIES = () => {
  if (!cache) {
    cache = JSON.parse(
      readFileSync(new URL('palette-profile.json', import.meta.url), 'utf8'),
    ).scales
  }
  return cache
}

/* Нейтральные породы эталона — у них дуга пологая, у цветных крутая. Брать
   цветную породу под нейтраль значит выкрасить карточки и контролы. */
const NEUTRAL = new Set(['sand', 'sage', 'olive', 'slate', 'mauve'])

/** Ближайшая по тону порода эталона. Дуга берётся у неё, а не назначается:
 *  у `amber` пятая ступень держит 78% своей вершины, у `blue` 27%, и
 *  упирается это в охват экрана, а не во вкус. */
export function nearestFamily(hue, neutral, mode) {
  let best = null
  let gap = 360
  for (const [name, row] of Object.entries(FAMILIES())) {
    if (NEUTRAL.has(name) !== neutral) continue
    const d = Math.abs(((row[mode].hue - hue + 540) % 360) - 180)
    if (180 - d < gap) {
      gap = 180 - d
      best = name
    }
  }
  return best
}

/* ── Лестница ────────────────────────────────────────────────────────── */

/** Двенадцать ступеней.
 *
 *  Концы лестницы — то, что дал заказчик, и ничем не подменяются: первая
 *  ступень ЕСТЬ бумага, девятая цветного ряда ЕСТЬ краска, двенадцатая ЕСТЬ
 *  чернила. До 21.09.2026 первая и двенадцатая считались из профиля, и белая
 *  бумага `#FFFFFF` выходила на странице как `#FDFDFD`: заказчик задавал
 *  цвет, а получал соседний.
 *
 *  Десятая отмеряется ОТ ЗАЛИВКИ, а не гонится к отметке эталона.
 *
 *  Лестница идёт от бумаги через краску к чернилам и НЕ РАЗВОРАЧИВАЕТСЯ:
 *  ступени 1–8 держатся профиля, но не ближе 1.5 L* к краске со стороны
 *  бумаги; 11 и 12 — профиля, но каждая не ближе шага заливки к предыдущей
 *  со стороны чернил. До 20.09.2026 это держалось только в светлой теме и
 *  только у краски светлее отметки 11-й: в тёмной все восемь первых ступеней
 *  совпадали с краской, а у тёмной краски в светлой 11-я равнялась 9-й и
 *  стояла светлее 10-й (palette.md, «Шкала строится в обе стороны»).
 *
 *  Тон и насыщенность — из Oklch: тон краски держится на всех ступенях,
 *  насыщенность идёт дугой породы. Прямая в sRGB, стоявшая тут до
 *  21.09.2026, обесцвечивала середину впятеро против эталона, и тёплая
 *  марка давала серый сайт (palette.md, «Середина лестницы держит тон»). */
export function scale(paper, ink, seed, mode, on = null) {
  const toward = mode === 'light' ? '#0A0A0A' : '#FAFAFA'
  const dir = mode === 'light' ? -1 : 1 /* куда идёт L* от бумаги к чернилам */
  const gap = dir * SOLID_GAP[mode]
  const solid = seed ? lightness(seed) : 0
  const ahead = (a, b) => (dir < 0 ? Math.min(a, b) : Math.max(a, b)) /* дальше по лестнице */
  const behind = (a, b) => (dir < 0 ? Math.max(a, b) : Math.min(a, b)) /* ближе к бумаге */

  /* Якорь — та ступень, краску которой заказчик назвал сам: девятая у
     цветного ряда, двенадцатая у нейтрального. От неё берутся тон и
     насыщенность, и на неё нормируется дуга. */
  const anchor = seed ?? ink
  const at = seed ? 8 : 11
  const [, peak, hue] = oklch(anchor)
  const arc = FAMILIES()[nearestFamily(hue, !seed, mode)][mode].chroma
  const chromaAt = (i) => (arc[at] > 0 ? (arc[i] / arc[at]) * peak : 0)

  /* Ход лестницы после заливки. У цветного ряда отсчёт идёт от десятой,
     у нейтрального — от девятой: девятой краски там никто не называл, и
     взятая с потолка она уводила десятую и одиннадцатую в чёрный. */
  let last = seed ? solid + gap : PROFILE[mode][8]
  /* Пол шага держится ПРИ ПОСТРОЕНИИ, а не только в замере. Ступень 1 —
     бумага заказчика, и она не обязана стоять там, где стоит первая
     ступень профиля: у «Латуни на угле» бумага светлее второй ступени на
     0.5 L* при поле 0.6, и лестница схлопывалась на первой же паре. Замер
     это ловил и был прав — но чинить каждый набор руками значит вернуть
     подбор на глаз. */
  let prev = lightness(paper)
  /* Меряется ПОЛУЧЕННАЯ краска, а не заданная отметка. Экран знает 256
     уровней на канал, и у белого конца один уровень стоит 0.2 L*: отметка
     97.9 превращается в 98.1, и пол в 0.6 проседает до 0.59. Именно так
     «Латунь на угле» и краснела — на сотую, из-за округления до цвета,
     который экран умеет показать. Отметка двигается, пока полученное не
     возьмёт пол; упёрлись в краску — оставляем как есть, это уже
     настоящая находка, и её назовёт замер. */
  const stepped = (want, cap, i) => {
    // A reference profile is a preference, not permission to move backwards
    // when the owner's paper is darker/lighter than the reference paper.
    const monotone = ahead(want, prev + dir * STEP_MIN)
    let target = cap === null ? monotone : behind(monotone, cap)
    let hex = atStep(target, chromaAt(i), hue)
    for (let n = 0; n < 12 && dir * (lightness(hex) - prev) < STEP_MIN; n += 1) {
      const next = target + dir * 0.1
      if (cap !== null && behind(next, cap) !== next) break
      target = next
      hex = atStep(target, chromaAt(i), hue)
    }
    prev = lightness(hex)
    return hex
  }
  const row = PROFILE[mode].map((want, i) => {
    if (i === 0) return paper
    if (!seed && i === 11) return ink
    if (seed && i === 8) { prev = solid; return seed }
    if (seed && i === 9) { prev = solid + gap; return atLightness(seed, toward, solid + gap) }
    // Reserve room for EVERY remaining pre-solid step, including sRGB
    // quantisation. One fixed cap made the last four steps of lime identical.
    if (i < 8) return stepped(want, seed ? solid - dir * (8 - i) * (STEP_MIN + .25) : null, i)
    if (i === 8) return stepped(want, null, i)
    // Bright accents must leave two distinct text steps before the gamut end.
    const endpoint = dir < 0 ? .2 + (11 - i) * .8 : 99.8 - (11 - i) * .8
    last = behind(ahead(want, last + gap), endpoint)
    return stepped(last, null, i)
  })
  return withMutedText(row, on ?? row[1], hue, chromaAt(10), dir)
}

/** Одиннадцатая ступень — ЗАМЕРОМ, как граница и кольцо фокуса, а не номером
 *  из профиля.
 *
 *  Эталон обещает на ней Lc 60 на второй ступени, и `sand`, чей профиль мы
 *  заняли, стоит на этом обещании РОВНО: 60.0 — худшая его шкала из 31. С
 *  нашей бумагой и нашими чернилами запаса не осталось, и обещание
 *  переставало выполняться: в тёмной теме приглушённый текст давал Lc 59.7
 *  при WCAG 8.35 — та самая пара, где WCAG завышает, а глазом видно (И191).
 *
 *  Уводится от бумаги ровно настолько, чтобы обещание выполнить, и не ближе
 *  шага лестницы к двенадцатой. Держится и порядок лестницы — ступень идёт
 *  только ОТ бумаги.
 *
 *  Поверхность приходит снаружи, а не берётся у своего же ряда: цена
 *  фирменным цветом лежит на КАРТОЧКЕ, а не на второй ступени фирменного
 *  ряда, которой на странице вообще нигде нет. Пока строитель правил
 *  ступень против своей второй, а замер мерил против карточки, «Аптечный
 *  синий» в тёмной теме расходился на сотые и был красным (И193). */
function withMutedText(row, on, hue, chroma, dir) {
  if (apca(row[10], on) >= NEED.mutedLc) return row
  const limit = lightness(row[11]) - dir * STEP_MIN
  const out = row.slice()
  for (let push = 0.1; push <= 40; push += 0.1) {
    const want = lightness(row[10]) + dir * push
    if (dir < 0 ? want < limit : want > limit) break
    out[10] = atStep(want, chroma, hue)
    if (apca(out[10], on) >= NEED.mutedLc) break
  }
  return out
}

/** Самая тесная пара самого эталона — 1 → 2 у `sand`: 0.6 L* в тёмной.
 *  Меньше — две ступени с разной работой стали одной краской. */
export const STEP_MIN = 0.6

/** Наименьший шаг лестницы по ходу от бумаги к чернилам; отрицательный —
 *  лестница развернулась. */
function tightest(row, mode) {
  const dir = mode === 'light' ? -1 : 1
  let worst = Number.POSITIVE_INFINITY
  for (let i = 1; i < row.length; i += 1) {
    worst = Math.min(worst, dir * (lightness(row[i]) - lightness(row[i - 1])))
  }
  return worst
}

/** Ступень нажатия — та, которой в шкале нет. Вдвое дальше наведения. */
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
    if ([against].flat().every((bg) => ratio(row[i], bg) >= need)) break
  }
  return found
}

/** Фоны, на которых стоит орган: ступени 1–5 нейтрали (у Radix 1–2 — фоны
 *  страницы, 3–5 — фоны органов). Кольцо фокуса обязано держать 3 : 1 на
 *  каждой: в тёмной теме карточка — ступень 4, и кольцо, подобранное против
 *  одной первой, давало на ней 2,31 : 1 (И246). */
export const GROUNDS = (n) => n.slice(0, 5)

/* ── Роли: что из лестницы чем работает ──────────────────────────────── */

/** Краски магазина сверх фирменной. Заведены 21.09.2026 по вопросу
 *  заказчика: «есть же плашка скидки — она какого цвета?».
 *
 *  Смысл каждой взят не с потолка, а из правила админки, которое заказчик
 *  записал раньше (CLAUDE.md, «Админка», п. 8): красный — деньги теряются
 *  СЕЙЧАС, оранжевый — будут стоить ПОТОМ, зелёный — проверено и в порядке.
 *  На витрине это те же три работы: «нет в наличии», «осталось двое»,
 *  «в наличии, доставим завтра».
 *
 *  Скидка стоит отдельно от всех четырёх, и это не украшение. Плашка
 *  скидки, покрашенная фирменным, пропадает рядом с кнопкой покупки —
 *  а покрашенная красным читается как предупреждение. Поэтому она своя
 *  краска и держит от остальных то же расстояние, что и марка от красного.
 *
 *  Лестницы поверхностей у статусных красок нет намеренно: у плашки три
 *  работы — тихий фон, заливка и текст, — и ступени 3–8 ей негде применить.
 *  Заводить их значит заводить места, где правда разойдётся. */
export const STATUS = ['error', 'sale', 'warn', 'ok', 'info']
const STATUS_STEPS = [1, 8, 10] /* тихая плашка, заливка, текст */

/**
 * Плашка скидки, выведенная из марки: тон марки + 60°.
 *
 * Правило не наше. Material берёт третью краску схемы ровно так —
 * `TonalPalette.fromHueAndChroma(sanitizeDegreesDouble(sourceColorHct.hue
 * + 60.0), 24.0)` (снимок: material-color/dynamic_scheme.ts, схема
 * TONAL_SPOT, она же у Material по умолчанию). Скидка — не статус вроде
 * красного «нет в наличии», а СОСЕДКА марки: обязана быть явно другой, но
 * из того же мира.
 *
 * Дефект, которым это куплено: 21.09.2026 заказчик открыл стенд и увидел,
 * что во всех семи наборах плашка скидки одного цвета — фиалковая. Так и
 * было: его выбор для ОДНОГО набора скопировали во все семь как
 * постоянную. У синей марки фиалка оказалась в 35 ΔE — вдвое ближе, чем у
 * остальных, и «другой краской» уже не читалась.
 *
 * Если тон + 60° встаёт слишком близко к красному, оранжевому или
 * зелёному — поворот продолжается с шагом 30°, пока все пять красок не
 * разойдутся на 25 ΔE (И196).
 */
export function saleFrom(accent, others = []) {
  const [L, C, h] = oklch(accent)
  /* Насыщенность не ниже марки и не ниже 0.09: плашка скидки, вышедшая
     серой, перестаёт быть плашкой. */
  const paint = (turn) => toHex(clampChroma([L, Math.max(C, 0.09), (h + turn) % 360]).map((v) => v * 255))
  for (let turn = 60; turn <= 300; turn += 30) {
    const hex = paint(turn)
    if (others.every((other) => difference(hex, other) >= NEED.brandApart)) return hex
  }
  return paint(60)
}

/** Краски, которые обязаны быть различимы между собой. */
export const SIGNALS = ['accent', ...STATUS]

/** Как краска называется в отчёте. Заказчик читает находки с телефона, и
 *  «accent отличим от error» ему не говорит ничего. */
export const SIGNAL_NAMES = {
  accent: 'фирменный',
  error: 'красный «нет в наличии»',
  sale: 'плашка скидки',
  warn: 'оранжевый «мало осталось»',
  ok: 'зелёный «в наличии»',
  info: 'синий «просто сведение»',
}

const short = { accent: 'a', error: 'e', sale: 'sale', warn: 'warn', ok: 'ok', info: 'info' }

/** Все краски одного набора в одной теме, готовые к печати в CSS.
 *
 *  Считается ВСЁ, кроме пяти красок, которые назвал заказчик. Знак на
 *  заливке, наведение, нажатие, граница и кольцо фокуса не хранятся: каждое
 *  из них однажды было записано рукой и однажды разошлось с правдой. */
export function roles(rawSet, mode) {
  const set = withSale(rawSet, mode)
  const n = scale(set.paper, set.ink, null, mode)
  const out = {}
  n.forEach((hex, i) => { out[`--n-${i + 1}`] = hex })

  const a = scale(set.paper, set.ink, set.accent, mode, n[1])
  a.forEach((hex, i) => { out[`--a-${i + 1}`] = hex })
  out['--on-a-9'] = inkOn(a[8])
  out['--a-press'] = press(a, mode)
  out['--on-a-10'] = inkOn(a[9])
  out['--on-a-press'] = inkOn(out['--a-press'])

  for (const job of STATUS) {
    if (!set[job]) continue
    const row = scale(set.paper, set.ink, set[job], mode, n[1])
    for (const i of STATUS_STEPS) out[`--${short[job]}-${i + 1}`] = row[i]
    out[`--on-${short[job]}-9`] = inkOn(row[8])
  }

  /* Разделитель ничего не опознаёт и остаётся на тихой шестой; граница и
     кольцо опознают орган управления — и потому берутся замером. */
  out['--line'] = n[5]
  out['--border'] = firstReaching(n, n[1], NEED.control, 6)
  out['--ring'] = firstReaching(a, GROUNDS(n), NEED.control, 7)
  return out
}

/** Набор краской в CSS.
 *
 *  Первый набор файла стоит на корне — он показывается, когда никто ничего
 *  не выбирал. И **каждый** набор, первый в том числе, стоит ещё и под своим
 *  именем: без этого переключатель не может к первому вернуться, а кружок с
 *  его краской в ленте выбора показывает не его, а тот набор, который сейчас
 *  включён. Найдено 21.09.2026 на стенде выбора цвета третьей витрины.
 *
 *  Цена — четыре десятка строк на набор, и она платится один раз при выпуске;
 *  цена обратного — переключатель, который работает во все стороны, кроме
 *  одной. */
/* Три сигнала, которые ни от набора, ни от марки не зависят: красный
 * «нет в наличии», оранжевый «мало осталось», зелёный «в наличии». Их
 * узнают не по набору, а по цвету вообще: зелёная кнопка «в наличии»
 * зелёная и в аптечном наборе, и в оливковом.
 *
 * До 20.09.2026 они стояли записанными в КАЖДОМ наборе — семь наборов по
 * два значения, сорок две записи на шесть чисел. Заказчик спросил, сколько
 * красок названо рукой, счёт по файлу показал: по-настоящему рукой
 * называются ТРИ — бумага, чернила, марка; остальные три переписаны
 * одинаково семь раз (И216).
 *
 * Набор по-прежнему может назвать свои: аптека с фирменным красным вправе
 * отодвинуть «нет в наличии». Названное живёт, неназванное берётся отсюда.
 */
const FIXED = {
  error: { light: '#B3261E', dark: '#E5484D' },
  warn: { light: '#F76B15', dark: '#F76B15' },
  ok: { light: '#30A46C', dark: '#30A46C' },
}

/* Синий эталона — краска сведения. Не выводится из марки, как скидка:
 * скидка — СОСЕДКА марки и обязана быть из её мира, а сведение обязано
 * быть узнаваемым само по себе, и во всех разобранных наборах оно синее
 * (Carbon `info`, Spectrum `informative`, Polaris `info`). Radix пишет
 * прямо, что синий несёт два смысла сразу: «If you map `blue` to
 * "accent", you might also need `blue` to communicate "info"» — значит у
 * набора с синей маркой сведению нужна СВОЯ краска, а не марка. Поэтому
 * синий тут постоянный, как оранжевый «мало осталось» и зелёный «в
 * наличии», и только если он подошёл ближе 25 ΔE к чему-то из набора,
 * поворачивается тем же ходом, что и скидка. */
const INFO = '#0090FF'

export function infoFrom(others = []) {
  const [L, C, h] = oklch(INFO)
  const paint = (turn) => toHex(clampChroma([L, C, (h + turn) % 360]).map((v) => v * 255))
  for (let turn = 0; turn <= 300; turn += 30) {
    const hex = turn === 0 ? INFO : paint(turn)
    if (others.every((other) => difference(hex, other) >= NEED.brandApart)) return hex
  }
  return INFO
}

/** Набор, у которого скидка названа заказчиком, остаётся как есть; набор
 *  без скидки получает её выведенной из марки, а сведение — синим эталона.
 *
 *  Заведено 20.09.2026 вопросом заказчика «восемь не нужно?»: сообщение о
 *  факте — «доставка 3–5 дней», «закон ЕС: до 0,2 % ТГК» — красилось либо
 *  успехом (зелёный врёт: ничего не удалось), либо вниманием (оранжевый
 *  врёт: ничего не случилось). */
export const withSale = (set, mode = 'light') => {
  const full = { ...set }
  for (const [job, краски] of Object.entries(FIXED)) full[job] = set[job] || краски[mode]
  full.sale = set.sale || saleFrom(full.accent, [full.error, full.warn, full.ok, full.accent].filter(Boolean))
  full.info = set.info || infoFrom([full.accent, full.error, full.warn, full.ok, full.sale].filter(Boolean))
  return full
}

export function toCss(sets, { generator = 'tools/palette-css.mjs' } = {}) {
  const names = Object.keys(sets)
  const body = (set) => {
    const light = roles(set.light, 'light')
    const dark = roles(set.dark, 'dark')
    return Object.keys(light)
      .map((key) => `  ${key}: light-dark(${light[key]}, ${dark[key] ?? light[key]});`)
      .join('\n')
  }
  const head = `/* Собран ${generator} из styles/palette.json. Руками не правят:
   первый же выпуск сотрёт правку. Краски набора — в palette.json, всё
   остальное здесь СЧИТАЕТСЯ (палитра: ${names.length} ${names.length === 1 ? 'набор' : 'набора(ов)'}). */`
  const first = `:root{\n  color-scheme: light dark;\n${body(sets[names[0]])}\n}`
  const named = names.map((name) => `[data-palette="${name}"]{\n${body(sets[name])}\n}`)
  return [head, first, ...named].join('\n\n') + '\n'
}

/* ── Замер ───────────────────────────────────────────────────────────── */

export function auditPalette(rawSeed, mode) {
  /* Мерится то, чем сайт покрашен, а не то, что записано в файле: выведенные
     краски — такие же краски, и пропускать их мимо замера значит мерить
     половину. */
  const seed = withSale(rawSeed, mode)
  const n = scale(seed.paper, seed.ink, null, mode)
  const a = scale(seed.paper, seed.ink, seed.accent, mode, n[1])
  const pressed = press(a, mode)
  const ring = firstReaching(a, GROUNDS(n), NEED.control, 7)
  const bound = firstReaching(n, n[1], NEED.control, 6)
  const hover = Math.abs(lightness(a[9]) - lightness(a[8]))
  const pushed = Math.abs(lightness(pressed) - lightness(a[8]))

  const found = []
  const want = (rule, got, need) => {
    if (got < need) found.push({ rule, got: Number(got.toFixed(2)), need })
  }
  want('основной текст на карточке', ratio(n[11], n[1]), NEED.text)
  want('приглушённый текст на карточке', ratio(n[10], n[1]), NEED.text)
  want('цена фирменным на карточке', ratio(a[10], n[1]), NEED.text)
  want('знак на кнопке покупки', ratio(inkOn(a[8]), a[8]), NEED.text)
  want('текст кнопки при наведении', ratio(inkOn(a[9]), a[9]), NEED.text)
  want('текст нажатой кнопки', ratio(inkOn(pressed), pressed), NEED.text)
  want('кольцо фокуса на всех поверхностях', Math.min(...GROUNDS(n).map((bg) => ratio(ring, bg))), NEED.control)
  want('граница органа управления', ratio(bound, n[1]), NEED.control)

  /* Статусные краски: у каждой своя лестница, и каждая мерится как марка.
     Красный до 20.09.2026 не мерил никто (И190), а скидка, «мало осталось»
     и «в наличии» не существовали вовсе до 21.09.2026. */
  const jobs = { error: 'ошибки', sale: 'скидки', warn: 'предупреждения', ok: 'наличия', info: 'информации' }
  for (const job of STATUS) {
    if (!seed[job]) continue
    const row = scale(seed.paper, seed.ink, seed[job], mode, n[1])
    want(`текст ${jobs[job]} на карточке`, ratio(row[10], n[1]), NEED.text)
    want(`знак на заливке ${jobs[job]}`, ratio(inkOn(row[8]), row[8]), NEED.text)
    want(`${jobs[job]} держит обещание эталона`, apca(row[10], n[1]), NEED.mutedLc)
    want(`лестница ${jobs[job]} не схлопывается`, tightest(row, mode), STEP_MIN)
  }

  /* Пять красок сигналов обязаны быть различимы ПОПАРНО, а не только марка
     с красным. Плашка скидки цвета кнопки покупки рядом с ней пропадает, а
     цвета «нет в наличии» — читается как предупреждение: покупатель уходит
     в обоих случаях, и в обоих виновата не вёрстка. */
  for (let i = 0; i < SIGNALS.length; i += 1) {
    for (let j = i + 1; j < SIGNALS.length; j += 1) {
      const [x, y] = [seed[SIGNALS[i]], seed[SIGNALS[j]]]
      if (!x || !y) continue
      want(`${SIGNAL_NAMES[SIGNALS[i]]} и ${SIGNAL_NAMES[SIGNALS[j]]} — разные краски`,
        difference(x, y), NEED.brandApart)
    }
  }

  /* Обещание эталона — единственное, которое он вообще даёт, и дано оно в
     APCA (И191). На этих же парах в тёмной теме WCAG показывает 6.2–8.4 при
     норме 4.5 — «с запасом», пока APCA держится на 55.8. */
  want('приглушённый текст держит обещание эталона', apca(n[10], n[1]), NEED.mutedLc)
  want('основной текст держит обещание эталона', apca(n[11], n[1]), NEED.mainLc)
  want('цена фирменным держит обещание эталона', apca(a[10], n[1]), NEED.mutedLc)

  /* Лестница не схлопывается: две ступени с разной работой в одной краске —
     это контрол без ответа или цена, неотличимая от текста (И189). */
  want('нейтральная лестница не схлопывается', tightest(n, mode), STEP_MIN)
  want('фирменная лестница не схлопывается', tightest(a, mode), STEP_MIN)
  want('наведение кнопки заметно', hover, 2)
  want('нажатие кнопки заметно', pushed, 4)
  /* Слишком большой сдвиг — та же беда, что и нулевой: обвал янтаря заказчик
     назвал «слишком большое изменение оттенка» раньше, чем это дали числа. */
  if (hover > 8) found.push({ rule: 'наведение кнопки не обвал', got: Number(hover.toFixed(2)), need: 8 })
  if (pushed > 16) found.push({ rule: 'нажатие кнопки не обвал', got: Number(pushed.toFixed(2)), need: 16 })
  return found
}
