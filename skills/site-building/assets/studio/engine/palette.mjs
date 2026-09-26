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

import profile from './palette-profile.json' with { type: 'json' }
import { CONTRAST, COLOUR, STATE } from './thresholds.mjs'

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
export const NEED = { text: CONTRAST.text, control: CONTRAST.control, brandApart: COLOUR.brandApart, mutedLc: COLOUR.mutedLc, mainLc: COLOUR.mainLc, decorLc: COLOUR.decorLc }

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
/** Вуаль поверх пола так, как её кладёт браузер: `color-mix(in srgb, X p%,
 *  transparent)` на полу — доля краски в каналах sRGB, целыми. */
const veil = (top, floor, share) => { const [t, f] = [channels(top), channels(floor)]; return toHex(t.map((v, i) => v * share + f[i] * (1 - share))) }
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
      JSON.stringify(profile),
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
 *  граница органа управления: у эталона седьмая даёт 1.49 при требуемых трёх.
 *  Мера — WCAG по умолчанию; хвост кнопки меряется APCA, кромка выключенного
 *  — под прозрачностью выключенного (И295): ступень та же, мерка своя. */
export function firstReaching(row, against, need, from, measure = ratio) {
  let found = row[from]
  for (let i = from; i < row.length; i += 1) {
    found = row[i]
    if ([against].flat().every((bg) => measure(row[i], bg) >= need)) break
  }
  return found
}

/** Фоны, на которых стоит орган: ступени 1–5 нейтрали (у Radix 1–2 — фоны
 *  страницы, 3–5 — фоны органов). Кольцо фокуса обязано держать 3 : 1 на
 *  каждой: в тёмной теме карточка — ступень 4, и кольцо, подобранное против
 *  одной первой, давало на ней 2,31 : 1 (И246). */
export const GROUNDS = (n) => n.slice(0, 5)

/* ── Роли по полу: кнопка, вуали, тени, сцена героя (И295) ───────────────

   До 24.09.2026 эти краски рождались в стилях: хвост главной кнопки —
   `color-mix(… 60% …)` в btn.module.css, кромка выключенной — 20 % чернил
   там же, вуаль героя — 86 / 72 % в стилях блока, тени, черта, тихая вуаль
   и вся палуба — долями в tokens.css и base.css. Их контраст не считал
   никто, панель не могла их гарантировать, а смена палитры меняла их по
   чужой формуле. Слово заказчика: «цвета для кнопок — это в палитре цветов
   должно быть описано». Теперь каждую выпускает строитель ролью, а стили её
   только читают (CLAUDE.md, «Делается только правильно»); цвет, рождённый в
   стилях, — находка семьи `colorOut` в check:css.

   Полов два рода. БУМАГА — страница, полоса, лист, карточка (ступени 1–5):
   на ней пишут чернила. ПАЛУБА — тёмная полоса шапки, подвала и сцены
   героя: на ней пишет её знак. У каждой роли, которая за полом идёт, две
   краски — `-paper` и `-deck`; роль переназначает пол (`data-ground`,
   `data-plate` в base.css), значения выпускаются здесь. */

/** Краска с прозрачностью — вуаль, которую браузер кладёт поверх любого
 *  пола: `#RRGGBBAA`. Ровно так она и уходит на экран: сборщик стилей
 *  (Lightning CSS) сворачивает `color-mix(… p%, transparent)` с постоянной
 *  краской в те же восемь бит, и доля 8 % становится 20/255 = 7.84 % —
 *  тихая вуаль «Аптеки» теряла на этом порог. Поэтому доля переводится в
 *  восьмибитную ВВЕРХ (`seen`: 8 % → 21/255) и меряется та, что покажет
 *  экран. Доля — число строителя, в стилях сайта её нет (семья `colorOut`). */
const seen = (share) => Math.ceil(share * 255 - 1e-9) / 255
const translucent = (hex, share) => `${hex.toUpperCase()}${Math.round(seen(share) * 255).toString(16).padStart(2, '0').toUpperCase()}`

/** Палуба. Светлая тема: обратная пара нейтрали — пол из чернил, знак из
 *  бумаги. Тёмная: знак — чернила; полы — седьмая ступень у шапки
 *  (`--chrome-bg`), вторая у подвала (`--page-deck`, И293) и первая у сцены
 *  героя (`--scrim-deck`, самая тёмная нейтраль темы). Замер палубы берёт
 *  все её полы; `stage` — сцена героя, под текстом на снимке. */
export const deckOf = (n, mode, a = null, kind = 'neutral') => {
  if (kind === 'brand') {
    /* Палуба марки (И444): пол — заливка марки (a9), знак — знак на ней
       (`inkOn`), пол один — шапка, подвал и нижняя полоса стоят на
       `--chrome-bg`. Сцена героя остаётся нейтральной: снимок под вуалью
       темнит самая тёмная нейтраль темы, а не марка. Кромка выключенного
       ищется по нейтрали от пола к знаку — той стороной, где знак. */
    if (!a) throw new Error('Палуба марки строится от ряда марки: deckOf(n, mode, a, "brand")')
    const bg = a[8]
    const ink = inkOn(bg)
    const up = lightness(ink) > lightness(bg)
    const edges = n.filter((c) => lightness(c) > lightness(bg) === up)
      .sort((x, y) => Math.abs(lightness(x) - lightness(bg)) - Math.abs(lightness(y) - lightness(bg)))
    return { bg, ink, stage: mode === 'light' ? n[11] : n[0], grounds: [bg], edges, kind }
  }
  return mode === 'light'
    ? { bg: n[11], ink: n[0], stage: n[11], grounds: [n[11]], edges: n.slice(0, 11).reverse(), kind: 'neutral' }
    : { bg: n[6], ink: n[11], stage: n[0], grounds: [n[6], n[1], n[0]], edges: n.slice(7), kind: 'neutral' }
}

/** Какой пол у палубы — ключ набора `deck` (И444): `neutral` (обратная пара
 *  нейтрали, по умолчанию) или `brand` (заливка марки). Роли те же, пол
 *  другой: всё, что на палубе, меряется на ЕЁ полу. */
export const DECKS = ['neutral', 'brand']
const deckKind = (set) => {
  const kind = set.deck ?? 'neutral'
  if (!DECKS.includes(kind)) throw new Error(`Не палуба: deck ${JSON.stringify(set.deck)} — нужна одна из ${DECKS.join(', ')}`)
  return kind
}

/** Тень под подписью на снимке (И445): два слоя чёрного — ближний у края
 *  буквы и дальний ореол, доли 0.75 и 0.5 полной силы; сила — ключ набора
 *  `caption` (1–100, доля от полной), по умолчанию 40 — сила, которую
 *  заказчик подобрал глазом на живой витрине 25.09.2026. Геометрия (сдвиг,
 *  размытие) — роль тени в стилях, краска — здесь. */
export const CAPTION = { layers: [0.75, 0.5], strength: 40 }
const captionStrength = (set) => {
  const s = set.caption ?? CAPTION.strength
  if (typeof s !== 'number' || !(s > 0 && s <= 100)) throw new Error(`Не сила тени: caption ${JSON.stringify(set.caption)} — нужно число от 1 до 100`)
  return s
}

/** Вуали — краска пола долей поверх того, что под ней: на бумаге — чернила
 *  (ступень 12), на палубе — её знак. Доли перенесены из tokens.css и
 *  base.css, где стояли числом (И295), и не менялись; обещание есть у тихой
 *  вуали (видна на каждом полу, STATE.visible) — его меряет замер ниже.
 *    paper: тихая кнопка — порог STATE.quiet; выбранная тихая — вдвое
 *           глубже; черта — 16 %; вдавленная тень (`--sh-in`) — 18 %.
 *    deck:  орган в покое 10 % (`--chrome-hover`), под рукой 18, нажатый 30;
 *           тихая 12, выбранная 22; черта 14; строка под рукой 8, нажатая
 *           14; вдавленная тень 18; знак в покое — 78 % (`--chrome-fg-2`:
 *           «степень реагирования … единый источник, чтоб системно», слово
 *           заказчика) — нижняя граница: на полу, где 78 % не держат 4.5 : 1,
 *           доля растёт (`dimShare`, И444).
 *    жёлоб (лоток над полкой, оба пола): половина под рукой 12 % — шаг
 *           состояния в 5 % давал 1.12 против жёлоба, 8 % заказчик не
 *           отличил от молчания; открытая створка 14 %, под рукой 20 % —
 *           открытое заметнее наведения (`--ctrl-hand`, `--ctrl-in`,
 *           `--ctrl-in-hand`; лежат поверх жёлоба `--ctrl`). */
const TROUGH = { 'ctrl-hand': 0.12, 'ctrl-in': 0.14, 'ctrl-in-hand': 0.2 }
export const VEIL = {
  paper: { quiet: STATE.quiet, 'quiet-on': 2 * STATE.quiet, rule: 0.16, 'sh-inset': 0.18, ...TROUGH },
  deck: { quiet: 0.12, 'quiet-on': 0.22, rule: 0.14, 'hover-row': 0.08, 'press-row': 0.14, 'hover-ctrl': 0.18, 'press-ctrl': 0.3, 'sh-inset': 0.18, ...TROUGH },
  ctrl: 0.1,
  dim: 0.78,
  /* Плашка на палубе (`--chrome-plate`, И444): палуба, посветлевшая к
     своему знаку на 14 % — доля, которую заказчик выбрал глазом у cbdin
     («белая плашка на палубе — вырвиглазно»). Тихая плашка на заливке
     (`--quiet-pop`, И446) — доля выбранной тихой на палубе: заливка кнопки —
     такой же цветной пол со своим знаком. */
  plate: 0.14,
  pop: 0.22,
}
/** Тени: в светлой теме — марка долями (волосок, ближний слой, три дальних
 *  по высоте), в тёмной и на палубе — белый волосок и чёрные слои: тень
 *  цвета своего пола не отбрасывает тени (И100, И114). */
export const SHADE = {
  names: ['ring', 'near', 'far-1', 'far-2', 'far-3'],
  brand: [0.18, 0.18, 0.4, 0.55, 0.7],
  deep: [['#FFFFFF', 0.05], ['#000000', 0.5], ['#000000', 0.6], ['#000000', 0.68], ['#000000', 0.75]],
}
/** Затемнение под окном и шторкой: самая тёмная нейтраль темы долей — в
 *  обеих темах тёмное (из чернил вышла бы белая вуаль в тёмной), в тёмной
 *  гуще: у тёмной страницы меньше своего контраста. */
export const SCRIM = { light: 0.55, dark: 0.72 }
/** Стекло главной кнопки (И427): доля краски стекла — от 0.6 (Fluent
 *  Acrylic: «tint opacity» 0.6…0.8 у светлой и тёмной темы; ниже стекло
 *  читается пустым местом) и выше, пока надпись не держит 4.5 : 1 над
 *  каждым полом и любым снимком; кромка-
 *  блик — светлая краска долей 0.4 (Apple Materials: светлый волосок по
 *  краю стекла отделяет его от фона). */
export const GLASS = { tint: [0.6, 1], rim: 0.4 }

const lcApart = (a, b) => Math.abs(apca(a, b))
const offSeen = (edge, bg) => ratio(veil(edge, bg, STATE.off[0]), bg)

/** Хвост главной кнопки (И276): два тона ряда марки рядом с заливкой (a9) —
 *  на том полу, где кнопка стоит. Дальний — первая ступень марки ОТ ПОЛА К
 *  ЗАЛИВКЕ, которая видна на каждом полу (APCA Lc ≥ COLOUR.decorLc —
 *  украшение от 5px) и отстоит от заливки не меньше её шага (SOLID_GAP — шаг
 *  заливки к наведению); ближний — ступень, которой в шкале нет: середина
 *  светлоты между дальним и заливкой (так же выведено нажатие, `press`).
 *  Сторона пола — по светлоте: на светлой бумаге — ступени светлее a9, на
 *  тёмной палубе светлой темы — темнее.
 *
 *  Заливка может стоять вплотную к полу — светлая марка на светлой бумаге,
 *  тёмная на тёмной, — и тогда со стороны пола видной ступени нет, или она
 *  той же светлоты, что заливка. Хвост тогда идёт по другую сторону
 *  заливки: украшение подстраивается под марку, а не марка под украшение.
 *  Иначе строитель двигал бы саму марку ради шеврона — жёлтая #FFE600
 *  уходила в горчицу на ΔE 21. */
function trailOf(a, grounds, mode) {
  const fill = a[8]
  const lf = lightness(fill)
  const far = (c) => Math.abs(lightness(c) - lf)
  const up = grounds.reduce((s, bg) => s + lightness(bg), 0) / grounds.length > lf
  const steps = a.filter((_, i) => i !== 8)
  const toward = steps.filter((c) => lightness(c) > lf === up).sort((x, y) => far(y) - far(x))
  const beyond = steps.filter((c) => lightness(c) > lf !== up).sort((x, y) => far(x) - far(y))
  const apart = (c, bg) => (far(c) >= SOLID_GAP[mode] ? lcApart(c, bg) : 0)
  const tone = firstReaching([...toward, ...beyond], grounds, NEED.decorLc, 0, apart)
  return { near: atLightness(fill, tone, (lightness(tone) + lf) / 2), far: tone, got: Math.min(...grounds.map((bg) => apart(tone, bg))) }
}

/** Вуаль героя (И280): текст сцены лежит на снимке заказчика, и снимок
 *  может быть любым, вплоть до белого. Дальняя ступень — наименьшая доля
 *  (шагом в сотую), при которой самая тихая строка героя — знак палубы
 *  долей `VEIL.dim` — держит 4.5 : 1 на белом снимке под вуалью; ближняя —
 *  на полпути от неё к сплошной. До 24.09.2026 стояли 86 / 72 % на все
 *  палитры, и у трёх наборов из семи тихая строка героя проваливала порог
 *  (Аптека — 4.15 : 1). */
function scrimOf(deck) {
  const on = (share) => {
    const bg = veil(deck.stage, '#FFFFFF', seen(share))
    return ratio(veil(deck.ink, bg, seen(VEIL.dim)), bg)
  }
  let far = 1
  for (let k = 50; k <= 100; k += 1) if (on(k / 100) >= NEED.text) { far = k / 100; break }
  const near = Math.round((far + (1 - far) / 2) * 100) / 100
  return { far, near, got: on(far) }
}

/** Знак пола в покое (`--chrome-fg-2`, И444): доля знака от `VEIL.dim` и
 *  выше — наименьшая, при которой тихое слово держит 4.5 : 1 на каждом полу
 *  палубы. На нейтральной палубе запас знака велик, и доля остаётся 78 %; на
 *  палубе марки знак держит 4.5 : 1 впритык, и 78 % роняли тихое слово шапки
 *  cbdin в тёмной теме до 3.1 : 1. Не держит и сплошной — знак целиком
 *  (`inkOn` гарантирует 4.5 : 1). */
function dimShare(sign, grounds) {
  for (let k = Math.round(VEIL.dim * 100); k <= 100; k += 1) {
    if (Math.min(...grounds.map((bg) => ratio(veil(sign, bg, seen(k / 100)), bg))) >= NEED.text) return k / 100
  }
  return 1
}

/** Поверхность на цветном полу со своим знаком (И444, И446): орган и
 *  плашка на палубе, тихая плашка на заливке кнопки. Сначала — к знаку на
 *  долю `share` и ниже, пока знак на ней держит 4.5 : 1, а сама она видна
 *  на полу (STATE.visible). У пола, где знак держит 4.5 : 1 впритык, так не
 *  выходит ни при какой доле: всякая видимая вуаль знака роняет надпись.
 *  Тогда плашка идёт от знака — наименьшая видимая доля чёрного (знак
 *  светлее пола) или белого: надпись важнее того, в какую сторону плашка
 *  светлеет. Меряется на каждом полу из `grounds`. */
function surfaceOn(sign, grounds, share, invert = false) {
  const holds = (paint, s) => {
    const under = grounds.map((bg) => veil(paint, bg, seen(s)))
    return { text: Math.min(...under.map((u) => ratio(sign, u))), seen: Math.min(...under.map((u, i) => ratio(u, grounds[i]))), ink: sign }
  }
  for (let k = Math.round(share * 100); k >= 1; k -= 1) {
    const m = holds(sign, k / 100)
    if (m.seen < STATE.visible) break
    if (m.text >= NEED.text) return { paint: sign, s: k / 100, ...m }
  }
  const away = lightness(sign) > lightness(grounds[0]) ? '#000000' : '#FFFFFF'
  for (let k = 1; k <= 100; k += 1) {
    const m = holds(away, k / 100)
    if (m.seen >= STATE.visible) return { paint: away, s: k / 100, ...m }
  }
  /* Пол — сам край (белая пилюля, чёрная палуба): от знака идти некуда.
     Плашка с надписью (`invert`) тогда выворачивается: заливка — знак,
     надпись — пол; пара та же, что у пола со знаком, и держит то же. */
  if (invert && grounds.length === 1) {
    const [floor] = grounds
    return { paint: sign, s: 1, text: ratio(floor, sign), seen: ratio(sign, floor), ink: floor }
  }
  return { paint: sign, s: share, ...holds(sign, share) }
}

/** Подпись на снимке у края буквы (И445): оба слоя тени под подписью
 *  складываются на белом снимке — худшем для светлой подписи. Норма —
 *  3 : 1 крупного текста (WCAG 1.4.3): подпись без вуали бывает только
 *  крупной; мелкий текст на снимке лежит под вуалью героя (`--scrim-*`).
 *  Сила набора — нижняя граница, а не приговор: не держит подпись — сила
 *  растёт на единицу, пока не удержит (так же подбирается вуаль героя).
 *  Светлая подпись тёмной темы — чернила, а не белый, — при силе 40 давала
 *  2.75 : 1. */
function captionOf(ink, named) {
  const at = (strength) => {
    const [near, far] = CAPTION.layers.map((k) => (k * strength) / 100)
    const bg = veil('#000000', veil('#000000', '#FFFFFF', seen(far)), seen(near))
    return { strength, near, far, got: ratio(ink, bg) }
  }
  for (let s = named; s < 100; s += 1) if (at(s).got >= NEED.control) return at(s)
  return at(100)
}

/** Роли по полу и их замер — одним расчётом: выпуск (`roles`), замер
 *  (`auditPalette`) и панель вида («Guaranteed») читают одни и те же
 *  краски и одни и те же числа. `checks` — строки замера: id для панели,
 *  имя для отчёта, число и норма. */
export function groundRoles(n, a, mode, set = {}) {
  const out = {}
  const checks = []
  const check = (id, rule, got, need, unit = ':1') => checks.push({ id, rule, got, need, unit })
  /* Палуба — та, что назвал набор (`deck`, И444); сцена героя — всегда
     нейтральная палуба темы: её знак светел в обеих темах, а пол — самая
     тёмная нейтраль. */
  const deck = deckOf(n, mode, a, deckKind(set))
  const hero = deckOf(n, mode)
  const G = GROUNDS(n)
  const ink = n[11]

  /* Палуба: пол, знак, знак в покое, орган в покое, плашка; сцена героя.
     Знак в покое и орган в покое меряются на полу палубы (И444): до
     26.09.2026 их доли стояли одним числом на любую палубу и не мерились. */
  out['--chrome-bg'] = deck.bg
  out['--chrome-fg'] = deck.ink
  const dim = dimShare(deck.ink, deck.grounds)
  out['--chrome-fg-2'] = translucent(deck.ink, dim)
  check('chrome-fg-2', 'тихое слово палубы читается', Math.min(...deck.grounds.map((bg) => ratio(veil(deck.ink, bg, seen(dim)), bg))), NEED.text)
  const organ = surfaceOn(deck.ink, deck.grounds, VEIL.ctrl)
  out['--chrome-hover'] = translucent(organ.paint, organ.s)
  check('chrome-hover', 'орган в покое на палубе виден', organ.seen, STATE.visible)
  check('chrome-hover-text', 'знак палубы читается на органе в покое', organ.text, NEED.text)
  const plate = surfaceOn(deck.ink, [deck.bg], VEIL.plate)
  out['--chrome-plate'] = veil(plate.paint, deck.bg, seen(plate.s))
  check('chrome-plate', 'плашка на палубе видна', plate.seen, STATE.visible)
  check('chrome-plate-text', 'знак палубы читается на плашке', plate.text, NEED.text)
  /* Кольцо фокуса на палубе (И444): первая ступень марки от a8, берущая
     3 : 1 на каждом полу палубы; нет такой (палуба марки — сама a9) — знак
     палубы. На бумаге кольцо то же, что `--ring`: пара для листа. */
  out['--ring-paper'] = firstReaching(a, G, NEED.control, 7)
  out['--ring-deck'] = firstReaching([...a.slice(7), deck.ink], deck.grounds, NEED.control, 0)
  check('ring-deck', 'кольцо фокуса видно на палубе', Math.min(...deck.grounds.map((bg) => ratio(out['--ring-deck'], bg))), NEED.control)
  out['--scrim-deck'] = hero.stage

  /* Вуали обоих полов. */
  for (const [job, share] of Object.entries(VEIL.paper)) out[`--${job}-paper`] = translucent(ink, share)
  for (const [job, share] of Object.entries(VEIL.deck)) out[`--${job}-deck`] = translucent(deck.ink, share)
  check('quiet', 'тихая вуаль видна на всех поверхностях', Math.min(...G.map((bg) => ratio(veil(ink, bg, seen(VEIL.paper.quiet)), bg))), STATE.visible)
  check('quiet-deck', 'тихая вуаль видна на палубе', Math.min(...deck.grounds.map((bg) => ratio(veil(deck.ink, bg, seen(VEIL.deck.quiet)), bg))), STATE.visible)

  /* Тени обоих полов. */
  SHADE.names.forEach((job, i) => {
    const deep = translucent(...SHADE.deep[i])
    out[`--sh-${job}-paper`] = mode === 'light' ? translucent(a[8], SHADE.brand[i]) : deep
    out[`--sh-${job}-deck`] = deep
  })

  /* Затемнение под окном и вуаль героя. */
  out['--scrim'] = translucent(hero.stage, SCRIM[mode])
  const scrim = scrimOf(hero)
  out['--scrim-near'] = translucent(hero.stage, scrim.near)
  out['--scrim-far'] = translucent(hero.stage, scrim.far)
  check('scrim', 'текст героя читается на любом снимке', scrim.got, NEED.text)

  /* Тень под подписью на снимке (И445): краска слоёв — чёрный долями силы
     набора; подпись — светлый знак сцены героя. */
  const caption = captionOf(hero.ink, captionStrength(set))
  out['--sh-caption-near'] = translucent('#000000', caption.near)
  out['--sh-caption-far'] = translucent('#000000', caption.far)
  check('caption', 'подпись на снимке читается у края буквы', caption.got, NEED.control)

  /* Кнопка. Громкая — `--pop` / `--on-pop` (ступень 9 марки и знак на ней;
     на палубе — обратная пара), их роли уже есть. Под рукой на палубе —
     знак палубы на шаг заливки к её полу, как ступень 10 от 9; под пальцем —
     на два (И444). Шаг не идёт дальше, чем надпись пилюли — краска пола —
     держит 4.5 : 1: у палубы марки запас знака узкий, и полный шаг ронял бы
     надпись. */
  const pill = (steps) => {
    const way = lightness(deck.bg) > lightness(deck.ink) ? 1 : -1
    for (let d = steps * SOLID_GAP[mode]; d > 0; d -= 0.1) {
      const c = atLightness(deck.ink, deck.bg, lightness(deck.ink) + way * d)
      if (ratio(deck.bg, c) >= NEED.text) return c
    }
    return deck.ink
  }
  out['--pop-hover-deck'] = pill(1)
  out['--pop-press-deck'] = pill(2)
  check('pop-deck', 'светлая пилюля палубы под рукой читается', ratio(deck.bg, out['--pop-hover-deck']), NEED.text)
  check('pop-press-deck', 'светлая пилюля палубы под пальцем читается', ratio(deck.bg, out['--pop-press-deck']), NEED.text)

  /* Тихая плашка на заливке кнопки (И446): счётчик на кнопке покупки —
     вуаль знака кнопки на её заливке, на бумаге (a9, знак on-a-9) и на
     палубе (пилюля — знак палубы, надпись — её пол). Строитель выпускал
     вуали только из чернил пола, и знак на заливке брался смесью в стилях. */
  const quietPop = (sign, fill) => {
    const q = surfaceOn(sign, [fill], VEIL.pop, true)
    return { fill: translucent(q.paint, q.s), ...q }
  }
  const qp = quietPop(inkOn(a[8]), a[8])
  const qd = quietPop(deck.bg, deck.ink)
  out['--quiet-pop-paper'] = qp.fill
  out['--quiet-pop-deck'] = qd.fill
  /* Надпись на тихой плашке — знак кнопки; у белой пилюли палубы марки
     (тёмная тема cbdin: надпись 4.78 : 1) любая видимая вуаль роняла её
     до 3.6 : 1, и плашка выворачивается — надпись тогда пол пилюли. */
  out['--on-quiet-pop-paper'] = qp.ink
  out['--on-quiet-pop-deck'] = qd.ink
  check('quiet-pop', 'тихая плашка видна на заливке кнопки', qp.seen, STATE.visible)
  check('quiet-pop-text', 'знак кнопки читается на тихой плашке', qp.text, NEED.text)
  check('quiet-pop-deck', 'тихая плашка видна на пилюле палубы', qd.seen, STATE.visible)
  check('quiet-pop-deck-text', 'надпись пилюли читается на тихой плашке', qd.text, NEED.text)

  /* Хвост — ступени марки на обоих полах: заливка главной кнопки и на
     палубе — марка (роль кнопки из каталога посчитана на корне), меняется
     только пол, к которому хвост сходит. */
  const paper = trailOf(a, G, mode)
  const onDeck = trailOf(a, deck.grounds, mode)
  out['--pop-trail-near-paper'] = paper.near
  out['--pop-trail-far-paper'] = paper.far
  out['--pop-trail-near-deck'] = onDeck.near
  out['--pop-trail-far-deck'] = onDeck.far
  check('trail', 'хвост главной кнопки виден на полу', paper.got, NEED.decorLc, 'Lc')
  check('trail-deck', 'хвост на палубе виден', onDeck.got, NEED.decorLc, 'Lc')

  /* Второй конец градиента главной (И424; элементы 06, 19): заливка,
     сдвинутая по светлоте на два шага заливки — от надписи, а где в ту
     сторону нет запаса, к ней, пока надпись держит 4.5 : 1. Готовой краски
     для этого нет: нажатая краска марки и тона хвоста роняли надпись до
     3.1–3.3 : 1 на части образцов. Пары «бумага / палуба» нет (И443): роль
     каталога раскрывается на корне, и на палубе кнопка несёт ту же заливку
     и тот же второй конец, что на бумаге; оба непрозрачны, пол сквозь них
     не виден — надпись меряется на них самих. */
  const gradOf = (fill, onFill) => {
    const gap = SOLID_GAP[mode] * 2
    const L = lightness(fill)
    const away = lightness(onFill) < L ? ['#FFFFFF', 1] : ['#000000', -1]
    const back = away[1] > 0 ? ['#000000', -1] : ['#FFFFFF', 1]
    const tries = [away, back].map(([to, dir]) => atLightness(fill, to, L + dir * gap))
    const ok = tries.filter((c) => ratio(onFill, c) >= NEED.text)
    return (ok.length ? ok : tries).sort((x, y) => Math.abs(lightness(y) - L) - Math.abs(lightness(x) - L))[0]
  }
  out['--pop-grad'] = gradOf(a[8], inkOn(a[8]))
  check('pop-grad', 'надпись главной читается на втором конце градиента', ratio(inkOn(a[8]), out['--pop-grad']), NEED.text)

  /* Стекло главной (И427; элемент 66): заливка просвечивает — сквозь неё
     видно размытое то, что под кнопкой. Краска главной раскрывается на
     корне и одна на всех полах: на бумаге, на карточке, на палубе и поверх
     снимка героя — стекло держит надпись над каждым из них и над любым
     снимком (чёрное и белое — края любого), а на бумаге видно само
     (STATE.visible). Краска — ступень марки, доля — наименьшая в коридоре
     GLASS.tint, при которой это выполнено; при равной доле — ступень
     ближе к заливке. Не хватает коридора ни у одной — надпись важнее
     просвета: заливка марки целиком. Кромка — блик: светлый конец
     нейтрали долей GLASS.rim; на светлом полу он не виден и не должен —
     он для снимка. */
  const glassOf = (label) => {
    const under = [...G, ...deck.grounds, deck.stage, '#000000', '#FFFFFF']
    const worst = (paint, s) => Math.min(...under.map((bg) => ratio(label, veil(paint, bg, seen(s)))))
    const seenOn = (paint, s) => Math.min(...G.map((bg) => ratio(veil(paint, bg, seen(s)), bg)))
    let best = { paint: a[8], s: 1 }
    a.forEach((paint, i) => {
      for (let s = GLASS.tint[0]; s < best.s || (s === best.s && Math.abs(i - 8) < Math.abs(a.indexOf(best.paint) - 8)); s = Math.round((s + 0.01) * 100) / 100) {
        if (worst(paint, s) >= NEED.text && seenOn(paint, s) >= STATE.visible) { best = { paint, s }; break }
      }
    })
    return { fill: translucent(best.paint, best.s), got: worst(best.paint, best.s), seen: seenOn(best.paint, best.s) }
  }
  const glass = glassOf(inkOn(a[8]))
  out['--pop-glass'] = glass.fill
  out['--pop-rim'] = translucent(lightness(n[0]) > lightness(n[11]) ? n[0] : n[11], GLASS.rim)
  check('pop-glass', 'надпись главной читается на стекле над каждым полом и любым снимком', glass.got, NEED.text)
  check('pop-glass-seen', 'стекло главной видно на всех поверхностях', glass.seen, STATE.visible)

  /* Кромка выключенного органа: видна и под прозрачностью выключенного —
     на нижнем краю коридора STATE.off; первая ступень нейтрали от пола,
     которая это держит. Выключенное читается кромкой, не только тоном. */
  out['--edge-off-paper'] = firstReaching(n.slice(5), G, STATE.visible, 0, offSeen)
  out['--edge-off-deck'] = firstReaching(deck.edges, deck.grounds, STATE.visible, 0, offSeen)
  check('edge-off', 'кромка выключенного органа видна на всех поверхностях', Math.min(...G.map((bg) => offSeen(out['--edge-off-paper'], bg))), STATE.visible)
  check('edge-off-deck', 'кромка выключенного органа видна на палубе', Math.min(...deck.grounds.map((bg) => offSeen(out['--edge-off-deck'], bg))), STATE.visible)

  return { roles: out, checks }
}

/** Замер ролей по полу для одного набора в теме — то же, что меряет
 *  `auditPalette`, числами: его строки читает панель вида («Guaranteed»). */
export function groundChecks(rawSet, mode) {
  const set = withSale(rawSet, mode)
  const n = scale(set.paper, set.ink, null, mode)
  const a = scale(set.paper, set.ink, set.accent, mode, n[1])
  return groundRoles(n, a, mode, set).checks
}

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
  /* Кромка органа, который стоит на ЛЮБОМ полу (тихая кнопка с кромкой):
     3 : 1 на фонах 1–5. `--border` подобран к полю (ступень 2) и на светлой
     странице даёт 2,56 — поля ввода стоят на подложке и облик не меняют;
     органы на полу берут эту роль (И252). */
  out['--edge'] = firstReaching(n, GROUNDS(n), NEED.control, 6)
  out['--ring'] = firstReaching(a, GROUNDS(n), NEED.control, 7)
  /* Палуба, вуали, тени, сцена героя, хвост и кромка выключенной кнопки —
     роли по полу (И295). */
  Object.assign(out, groundRoles(n, a, mode, set).roles)
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
  const edge = firstReaching(n, GROUNDS(n), NEED.control, 6)
  want('кромка органа на всех поверхностях', Math.min(...GROUNDS(n).map((bg) => ratio(edge, bg))), NEED.control)
  /* Роли по полу (И295) — тем же расчётом, что их выпускает: тихая вуаль
     на бумаге и на палубе (орган без кромки виден только ею; «Аптека» до
     24.09.2026 выходила с тихой кнопкой 1.14 : 1 на полу страницы, И285),
     хвост главной кнопки на обоих полах, кромка выключенной, пилюля палубы
     под рукой и текст героя на любом снимке. */
  for (const c of groundRoles(n, a, mode, seed).checks) want(c.rule, c.got, c.need)

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

/* ── Строитель для заказчика: верен по построению (И275) ────────────────

   Заказчик задаёт НАМЕРЕНИЕ, а не три краски: цвет марки (тон он хочет
   именно этот), бумагу — тёплую, нейтральную или холодную, с лёгким тоном
   или без, и чернила — сами или с уходом в марку. Строитель превращает
   намерение в набор, который проходит ВЕСЬ замер набора (`auditPalette`) в
   обеих темах, и одной строкой говорит, что он подвинул. Списка ошибок
   заказчик не видит никогда: замер остаётся инструментом того, кто ведёт
   набор, а инструмент заказчика гарантирует (слово заказчика 24.09.2026:
   «не понимаю, зачем мне давать выбор цвета, а затем он не подходит и
   ошибки в меню»).

   Поиск ближайшего: тон марки держится, светлота и насыщенность перебираются
   от заданной краски наружу по ΔE, и берётся первая, при которой замер
   чист; тон двигается только если ни одна светлота не прошла — и тогда это
   названо. Чернила темнеют (светлеют в тёмной теме), пока текст не сдержит
   обещание эталона. */

const PAPER_HUE = { warm: 80, cool: 250, neutral: 80 }
const PAPER_TINT = { none: 0.003, light: 0.012 }
const THEME = {
  light: { paper: 0.988, ink: [0.25, 0.23, 0.21, 0.19, 0.17, 0.15, 0.13] },
  dark: { paper: 0.18, ink: [0.94, 0.955, 0.97, 0.985] },
}
const hexOf = (lch) => toHex(clampChroma(lch).map((v) => v * 255))
/** К чему относится находка замера — по её имени (замер тот же, И275). */
const partOf = (rule) => (/разные краски/.test(rule) ? 'signals'
  : /ошибки|скидки|предупреждения|наличия|информации/.test(rule) ? 'status'
    : /фирменн|кнопк|кольцо фокуса|наведение|нажатие/.test(rule) ? 'brand' : 'neutral')

/** Бумага и чернила темы из намерения: чернила уходят от бумаги, пока
 *  нейтральная часть замера не станет чистой. */
function groundOf(intent, mode) {
  const warmth = intent.paper ?? 'warm'
  const hue = PAPER_HUE[warmth] ?? 80
  const tint = warmth === 'neutral' ? 0 : PAPER_TINT[intent.tint ?? 'none'] ?? 0.003
  const paper = hexOf([THEME[mode].paper, tint, hue])
  const [, bC, bH] = oklch(intent.brand)
  const inkHue = intent.inkTowardBrand ? bH : hue
  const inkC = intent.inkTowardBrand ? Math.min(0.03, bC * 0.3) : Math.max(tint, 0.004)
  let ink = null
  for (const L of THEME[mode].ink) {
    ink = hexOf([L, inkC, inkHue])
    if (!auditPalette({ paper, ink, accent: intent.brand }, mode).some((f) => partOf(f.rule) === 'neutral')) break
  }
  return { paper, ink }
}

/** Свои чернила темы, доведённые до замера НАИМЕНЬШИМ сдвигом: тон и
 *  насыщенность те же, светлота уходит от бумаги шагом 0.005 OKLCH, пока
 *  нейтральная часть замера не станет чистой. null — не дошли и за 0.2:
 *  тогда чернила подбирает намерение (`groundOf`). Так же доводятся и
 *  готовые наборы набора (И285): верен по построению не только строитель. */
function deeperInk(ground, accent, mode) {
  const [L, C, H] = oklch(ground.ink)
  const way = mode === 'light' ? -1 : 1
  for (let d = 0.005; d <= 0.2; d += 0.005) {
    const ink = hexOf([L + way * d, C, H])
    if (!auditPalette({ ...ground, ink, accent }, mode).some((f) => partOf(f.rule) === 'neutral')) return ink
  }
  return null
}

/** Ближайшая к `brand` краска марки, при которой замер темы чист целиком. */
function brandFor(brand, ground, mode) {
  const [L, C, H] = oklch(brand)
  const clean = (accent) => auditPalette({ ...ground, accent }, mode).length === 0
  if (clean(brand)) return { accent: brand, hue: 0 }
  const tried = new Set()
  for (const turn of [0, 8, -8, 16, -16, 24, -24, 32, -32]) {
    const candidates = []
    for (const c of [C, C * 0.8, C * 0.6, C * 0.4]) {
      for (let d = 0; d <= 0.5; d += 0.02) for (const l of d ? [L - d, L + d] : [L]) if (l > 0.15 && l < 0.93) candidates.push(hexOf([l, c, (H + turn + 360) % 360]))
    }
    candidates.sort((a, b) => difference(a, brand) - difference(b, brand))
    for (const hex of candidates) {
      if (tried.has(hex)) continue
      tried.add(hex)
      if (clean(hex)) return { accent: hex, hue: turn }
    }
  }
  return null
}

/** Почему краску марки пришлось подвинуть — словами для заказчика. */
function whyMoved(from, to, ground, mode) {
  const parts = new Set(auditPalette({ ...ground, accent: from }, mode).map((f) => partOf(f.rule)))
  const way = lightness(to) < lightness(from) ? 'a little darker' : 'a little lighter'
  if (parts.has('signals')) return `${way}, so it stays apart from the sale and stock colours`
  if (parts.has('brand')) return `${way}, so the button text and the focus ring read`
  return `${way}, so every text on it reads`
}

/** Намерение → набор, который проходит замер в обеих темах, и что
 *  подвинуто. `intent`: { brand: '#hex', paper: 'warm'|'neutral'|'cool',
 *  tint: 'none'|'light', inkTowardBrand: boolean }. `exact` (тонкая
 *  настройка) — свои бумага и чернила темы: они тоже доводятся до замера. */
export function fitPalette(intent, exact = null) {
  const out = { light: null, dark: null }
  const notes = []
  const used = {}
  for (const mode of ['light', 'dark']) {
    let ground = exact?.[mode] ? { paper: exact[mode].paper, ink: exact[mode].ink } : groundOf(intent, mode)
    const accent = exact?.[mode]?.accent ?? intent.brand
    const weak = exact?.[mode] ? auditPalette({ ...ground, accent }, mode).filter((f) => partOf(f.rule) === 'neutral') : []
    if (weak.length) {
      const ink = deeperInk(ground, accent, mode) ?? groundOf(intent, mode).ink
      const why = weak.every((f) => /вуаль/.test(f.rule)) ? 'the ink was made a touch deeper, so quiet buttons show on the page' : 'the ink was made deeper, so body text reads'
      notes.push({ what: 'ink', mode, from: ground.ink, to: ink, why })
      ground = { paper: ground.paper, ink }
    }
    const want = exact?.[mode]?.accent ?? intent.brand
    const found = brandFor(want, ground, mode)
    if (!found) return { ok: false, seed: null, notes: [{ what: 'brand', mode, from: want, to: want, why: 'no tone of this colour works as a button here; try another colour' }] }
    if (found.accent !== want) notes.push({ what: 'brand', mode, from: want, to: found.accent, why: found.hue ? `the hue was turned ${Math.abs(found.hue)}°, so it stays apart from the sale and stock colours` : whyMoved(want, found.accent, ground, mode) })
    out[mode] = { ...ground, accent: found.accent }
    used[mode] = found.accent
  }
  return { ok: true, seed: out, notes, used }
}

/** Набор → намерение, из которого строитель его повторит (для «Edit»). */
export function intentOf(set) {
  const [, pC, pH] = oklch(set.light.paper)
  const [, iC] = oklch(set.light.ink)
  const paper = pC < 0.0045 ? 'neutral' : pH >= 20 && pH < 160 ? 'warm' : 'cool'
  return { brand: set.light.accent.toUpperCase(), paper, tint: pC >= 0.007 ? 'light' : 'none', inkTowardBrand: iC >= 0.02 }
}
