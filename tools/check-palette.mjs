/*
 * Палитра не заводится на глаз.
 *
 * Проверка меряет РЕЗУЛЬТАТ ПОСТРОЕНИЯ шкалы, а не таблицу токенов: семь
 * дефектов, которыми она куплена, рождались именно в том, как из токенов
 * считается остальное, и ни один сторож набора их не видел. Три из них
 * нашлись 20.09.2026 прогоном тех же наборов через файлы эталона Radix:
 * тёмная тема строила ступени 1–8 краской, красный не мерил никто, а
 * приглушённый текст не держал единственное обещание, которое эталон
 * вообще даёт, — и WCAG на той же паре показывала запас вдвое.
 *
 * Разбор, числа и источники — `.claude/skills/craft/references/palette.md`.
 * Закон — `SKILL.md`, «Палитра — это шкала из двенадцати ступеней».
 *
 * Запуск: node tools/check-palette.mjs [--json]
 * Набор берётся из `styles/palette.json` приложения, если он есть; иначе
 * проверяются наборы-образцы, и проверка говорит об этом вслух.
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

/* Профиль светлоты ступеней — L* эталонной шкалы `sand` пакета
   @radix-ui/colors 3.0.0. Числа снятые, а не назначенные. */
const PROFILE = {
  light: [99.3, 97.9, 94.8, 92.0, 89.5, 86.7, 82.7, 75.8, 58.4, 54.2, 41.8, 12.2],
  dark: [5.0, 8.7, 13.2, 17.0, 20.2, 24.4, 30.6, 40.8, 46.0, 51.5, 72.9, 94.0],
}

/* Шаг между девятой и десятой ступенями самого эталона. */
const SOLID_GAP = { light: 4.2, dark: 5.5 }

/* Первые два порога — WCAG 2.2 (SC 1.4.3 и 1.4.11). Третий наш: разбор в
   palette.md, «Фирменный цвет совпал с красным». */
/* Четвёртый и пятый — обещание САМОГО эталона, снятое с его файлов: 11-я
   ступень даёт Lc 60 на 2-й той же шкалы, 12-я — Lc 90. Это единственная
   метрика, в которой эталон вообще что-то обещает (И191). */
const NEED = { text: 4.5, control: 3, brandApart: 25, mutedLc: 60, mainLc: 90 }

const channels = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (parts) =>
  `#${parts.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`
const linear = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
const luminance = (hex) => {
  const [r, g, b] = channels(hex).map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
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
const apca = (text, bg) => {
  const yt = softBlack(screenY(text))
  const yb = softBlack(screenY(bg))
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14
    return Math.abs(s < 0.001 ? 0 : (s - 0.027) * 100)
  }
  const s = (yb ** 0.65 - yt ** 0.62) * 1.14
  return Math.abs(s > -0.001 ? 0 : (s + 0.027) * 100)
}
const lightness = (hex) => {
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
const difference = (a, b) => {
  const [x, y] = [lab(a), lab(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
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
/* Знак на заливке выбирается, а не хранится: у трёх чужих наборов из трёх
   назначенный ими знак на кнопке не читался. */
const inkOn = (bg) => (ratio('#FFFFFF', bg) >= ratio('#111111', bg) ? '#FFFFFF' : '#111111')

/* Правила «текст на худшей поверхности» здесь НЕТ, и это замер, а не
   недосмотр. Чек-лист исследования требует мерить акцент против худшей
   поверхности, но приглушённый текст на НАЖАТОМ контроле сам эталон не
   держит: в светлой теме 25 шкал из 31 дают там ниже WCAG 4.5 (худшая
   `orange` — 3.19), в тёмной ниже Lc 60 стоят 27 из 31. Значит эталон не
   ставит приглушённый текст на контрол вовсе — обещание дано на второй
   ступени и только на ней. Это граница РОЛИ, а не порог контраста: если
   узел кладёт приглушённый текст на контрол, ловить это надо там, где
   роли применяются, а не здесь (palette.md, «Два правила исследования,
   которые правилами не стали»). */

/** Двенадцать ступеней. Девятая цветного ряда — сама краска, десятая
 *  отмеряется ОТ НЕЁ, а не гонится к отметке эталона.
 *
 *  Лестница идёт от бумаги через краску к чернилам и НЕ РАЗВОРАЧИВАЕТСЯ:
 *  ступени 1–8 держатся профиля, но не ближе 1.5 L* к краске со стороны
 *  бумаги; 11 и 12 — профиля, но каждая не ближе шага заливки к предыдущей
 *  со стороны чернил. До 20.09.2026 это держалось только в светлой теме и
 *  только у краски светлее отметки 11-й: в тёмной все восемь первых ступеней
 *  совпадали с краской, а у тёмной краски в светлой 11-я равнялась 9-й и
 *  стояла светлее 10-й (palette.md, «Шкала строится в обе стороны»). */
function scale(paper, ink, seed, mode) {
  const toward = mode === 'light' ? '#0A0A0A' : '#FAFAFA'
  const dir = mode === 'light' ? -1 : 1 /* куда идёт L* от бумаги к чернилам */
  const gap = dir * SOLID_GAP[mode]
  const solid = seed ? lightness(seed) : 0
  const ahead = (a, b) => (dir < 0 ? Math.min(a, b) : Math.max(a, b)) /* дальше по лестнице */
  const behind = (a, b) => (dir < 0 ? Math.max(a, b) : Math.min(a, b)) /* ближе к бумаге */
  let last = solid + gap
  const row = PROFILE[mode].map((want, i) => {
    if (!seed) return atLightness(paper, ink, want)
    if (i === 8) return seed
    if (i === 9) return atLightness(seed, toward, solid + gap)
    if (i < 8) return atLightness(paper, seed, behind(want, solid - dir * 1.5))
    last = ahead(want, last + gap)
    return atLightness(seed, toward, last)
  })
  return withMutedText(row, seed || paper, seed ? toward : ink, dir)
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
 *  шага лестницы к двенадцатой: сдвиг выходит 0.1–0.3 L*, один уровень
 *  канала. Держится и порядок лестницы — ступень идёт только ОТ бумаги. */
function withMutedText(row, from, to, dir) {
  if (apca(row[10], row[1]) >= NEED.mutedLc) return row
  const limit = lightness(row[11]) - dir * STEP_MIN
  const out = row.slice()
  for (let push = 0.1; push <= 40; push += 0.1) {
    const want = lightness(row[10]) + dir * push
    if (dir < 0 ? want < limit : want > limit) break
    out[10] = atLightness(from, to, want)
    if (apca(out[10], row[1]) >= NEED.mutedLc) break
  }
  return out
}

/** Самая тесная пара самого эталона — 1 → 2 у `sand`: 0.6 L* в тёмной.
 *  Меньше — две ступени с разной работой стали одной краской. */
const STEP_MIN = 0.6

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
function press(accent, mode) {
  const toward = mode === 'light' ? '#0A0A0A' : '#FAFAFA'
  return atLightness(accent[8], toward, lightness(accent[8]) + (mode === 'light' ? -2 : 2) * SOLID_GAP[mode])
}

/** Первая ступень, которая берёт порог. Именно так выбираются кольцо фокуса и
 *  граница органа управления: у эталона седьмая даёт 1.49 при требуемых трёх. */
function firstReaching(row, against, need, from) {
  let found = row[from]
  for (let i = from; i < row.length; i += 1) {
    found = row[i]
    if (ratio(row[i], against) >= need) break
  }
  return found
}

export function auditPalette(seed, mode) {
  const n = scale(seed.paper, seed.ink, null, mode)
  const a = scale(seed.paper, seed.ink, seed.accent, mode)
  const e = scale(seed.paper, seed.ink, seed.error, mode)
  const pressed = press(a, mode)
  const ring = firstReaching(a, n[0], NEED.control, 7)
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
  want('кольцо фокуса на листе', ratio(ring, n[0]), NEED.control)
  want('граница органа управления', ratio(bound, n[1]), NEED.control)
  want('фирменный отличим от красного', difference(a[8], e[8]), NEED.brandApart)
  /* Красный — такая же шкала, как марка: на нём стоит «нет в наличии» и
     текст ошибки у поля, и до 20.09.2026 его не мерил никто (И190). */
  want('текст ошибки на карточке', ratio(e[10], n[1]), NEED.text)
  want('знак на заливке ошибки', ratio(inkOn(e[8]), e[8]), NEED.text)
  /* Обещание эталона — единственное, которое он вообще даёт, и дано оно в
     APCA (И191). На этих же парах в тёмной теме WCAG показывает 6.2–8.4 при
     норме 4.5 — «с запасом», пока APCA держится на 55.8: приглушённый текст,
     то есть цена и текст ошибки, стоял ниже обещания у всех четырёх наборов. */
  want('приглушённый текст держит обещание эталона', apca(n[10], n[1]), NEED.mutedLc)
  want('основной текст держит обещание эталона', apca(n[11], n[1]), NEED.mainLc)
  want('цена фирменным держит обещание эталона', apca(a[10], n[1]), NEED.mutedLc)
  want('текст ошибки держит обещание эталона', apca(e[10], n[1]), NEED.mutedLc)

  /* Лестница не схлопывается: две ступени с разной работой в одной краске —
     это контрол без ответа или цена, неотличимая от текста (И189). */
  want('нейтральная лестница не схлопывается', tightest(n, mode), STEP_MIN)
  want('фирменная лестница не схлопывается', tightest(a, mode), STEP_MIN)
  want('красная лестница не схлопывается', tightest(e, mode), STEP_MIN)
  want('наведение кнопки заметно', hover, 2)
  want('нажатие кнопки заметно', pushed, 4)
  /* Слишком большой сдвиг — та же беда, что и нулевой: обвал янтаря заказчик
     назвал «слишком большое изменение оттенка» раньше, чем это дали числа. */
  if (hover > 8) found.push({ rule: 'наведение кнопки не обвал', got: Number(hover.toFixed(2)), need: 8 })
  if (pushed > 16) found.push({ rule: 'нажатие кнопки не обвал', got: Number(pushed.toFixed(2)), need: 16 })
  return found
}

/*
 * Самопроверка: две пары красок, на которых видно, что сама проверка работает.
 *
 * Это НЕ наборы какого-либо магазина и не образец для подражания — краски
 * взяты нарочно разные (тёплая и холодная), чтобы шкала строилась в обе
 * стороны. Настоящий набор живёт в приложении, `styles/palette.json`:
 * переносимый набор не знает и не должен знать, какого цвета чужая марка.
 */
const SELFTEST = {
  'тёплая марка': {
    light: { paper: '#FDFCF8', ink: '#2A2622', accent: '#B07A2E', error: '#B3261E' },
    dark: { paper: '#121110', ink: '#EDEBE8', accent: '#B07A2E', error: '#F2B8B5' },
  },
  'холодная марка': {
    light: { paper: '#FBFCFD', ink: '#1C2226', accent: '#2C6E8F', error: '#B3261E' },
    dark: { paper: '#0E1114', ink: '#E9ECEE', accent: '#4E9BBE', error: '#F2B8B5' },
  },
}

function load() {
  const own = path.resolve('styles/palette.json')
  if (existsSync(own)) return { sets: JSON.parse(readFileSync(own, 'utf8')), own: true }
  return { sets: SELFTEST, own: false }
}

const { sets, own } = load()
const json = process.argv.includes('--json')
let bad = 0
const report = []

for (const [name, byMode] of Object.entries(sets)) {
  for (const mode of ['light', 'dark']) {
    const findings = auditPalette(byMode[mode], mode)
    if (findings.length) bad += 1
    report.push({ name, mode, findings })
  }
}

if (json) {
  console.log(JSON.stringify({ own, report }, null, 2))
} else {
  if (!own) console.log('В приложении нет styles/palette.json — прогнана только самопроверка.\n')
  for (const row of report) {
    const where = `${row.name} · ${row.mode === 'light' ? 'светлая' : 'тёмная'}`
    if (!row.findings.length) console.log(`  ✓ ${where}`)
    else {
      console.log(`  ✗ ${where}`)
      for (const f of row.findings) console.log(`      ${f.rule}: ${f.got} при норме ${f.need}`)
    }
  }
  console.log(bad ? `\nНаборов с находками: ${bad}` : '\nПалитра в норме.')
}

process.exit(bad ? 1 : 0)
