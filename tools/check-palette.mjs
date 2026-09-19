/*
 * Палитра не заводится на глаз.
 *
 * Проверка меряет РЕЗУЛЬТАТ ПОСТРОЕНИЯ шкалы, а не таблицу токенов: четыре
 * дефекта, которыми она куплена, рождались именно в том, как из токенов
 * считается остальное, и ни один сторож набора их не видел.
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
const NEED = { text: 4.5, control: 3, brandApart: 25 }

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

/** Двенадцать ступеней. Девятая цветного ряда — сама краска, десятая
 *  отмеряется ОТ НЕЁ, а не гонится к отметке эталона. */
function scale(paper, ink, seed, mode) {
  const toward = mode === 'light' ? '#0A0A0A' : '#FAFAFA'
  const gap = mode === 'light' ? -SOLID_GAP.light : SOLID_GAP.dark
  return PROFILE[mode].map((want, i) => {
    if (!seed) return atLightness(paper, ink, want)
    if (i === 8) return seed
    if (i === 9) return atLightness(seed, toward, lightness(seed) + gap)
    if (i < 8) return atLightness(paper, seed, Math.max(want, lightness(seed) + 1.5))
    return atLightness(seed, toward, want)
  })
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
