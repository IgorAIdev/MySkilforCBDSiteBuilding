/*
 * Шкалы не заводятся на глаз.
 *
 * Проверка меряет НАБОР ЧИСЕЛ владельца — то, из чего шкала считается, — а
 * не таблицу токенов: дефект, которым она куплена, родился именно в счёте.
 * У `--sp-11` свободный член был списан у `--sp-9`, и ступень, обещавшая
 * 100 пикселей на макете, доходила там до 93. Двадцать пять рукописных
 * рамп в `styles/tokens.css`, и ни один сторож набора не умел прочитать ни
 * одной: семья `nearStep` смотрела только на соседние кегли.
 *
 * Математика живёт в `scale.mjs` — там же, откуда её берёт выпуск
 * `styles/scale.css`. Здесь только запуск и отчёт: проверка и строитель
 * обязаны считать ОДНИМ кодом.
 *
 * Разбор, числа и источники — `.claude/skills/craft/references/scale.md`.
 *
 * Запуск: node tools/check-scale.mjs [--json]
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { auditScale, auditSheets } from './scale.mjs'
import { STYLE_DIRS, LADDER } from './kit-config.mjs'

/*
 * Самопроверка: два набора, на которых видно, что сама проверка работает.
 * Это НЕ образец для подражания — числа взяты нарочно разные (тесный и
 * просторный), чтобы рампы строились в обе стороны. Настоящий набор живёт
 * у проекта, в `styles/scale.json`.
 */
const SELFTEST = {
  'тесная разметка': {
    ширины: [560, 1080],
    размер: { xs: [13, 14], sm: [14.5, 15.5], base: [16, 17], xl: [18, 20] },
    ритм: { 1: [4, 4], 2: [8, 8], 3: [10, 11], 4: [12, 14], 5: [16, 18], 10: [44, 60] },
    поле: { card: [14, 16] },
    воздух: { page: 10, row: 4 },
    зазор: { targets: [8, 16] },
  },
  'просторная разметка': {
    ширины: [560, 1080],
    размер: { xs: [13.5, 15.5], sm: [15, 17], base: [17, 19.5], xl: [20, 23] },
    ритм: { 1: [4, 4], 2: [8, 8], 3: [10, 12], 4: [14, 17], 5: [20, 25], 10: [64, 92] },
    поле: { card: [20, 26] },
    воздух: { page: 10, row: 4 },
    зазор: { targets: [8, 16] },
  },
}

/* Набор берётся у проекта. Если шкалы набора в проекте стоят, а чисел нет —
   это находка, а не повод прогнать самопроверку и уйти зелёным: проверка,
   которая при отсутствии предмета отвечает «в норме», ничем не отличается
   от выключенной (то же решение — в `check-palette.mjs`). */
function load() {
  const own = path.resolve('styles/scale.json')
  if (existsSync(own)) return { sets: JSON.parse(readFileSync(own, 'utf8')), own: true }
  if (existsSync(path.resolve('styles/tokens.css'))) return { sets: null, own: true }
  return { sets: SELFTEST, own: false }
}

const { sets, own } = load()
const json = process.argv.includes('--json')

if (!sets) {
  const say = 'Шкалы набора в проекте стоят, а styles/scale.json нет — менять ритм нечем.'
  if (json) console.log(JSON.stringify({ own, missing: true, report: [] }, null, 2))
  else {
    console.error(`✗ ${say}`)
    console.error('    Заведите числа: на каждую ступень два — сколько на телефоне и сколько на макете.')
    console.error('    Потом выпустите стили: npm run scale')
  }
  process.exit(1)
}

let bad = 0
const report = []

/* Вторая половина: шкала объявлена в ОДНОМ месте. Спрашивается только с
   проекта, у которого строитель уже стоит: чужому сайту, который набор
   только проверяет, наших имён никто не обещал. */
const sheets = []
if (own) {
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry)
      if (statSync(full).isDirectory()) { walk(full); continue }
      if (!entry.endsWith('.css')) continue
      const rel = path.relative(process.cwd(), full)
      if (rel === LADDER) continue
      sheets.push({ rel, css: readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') })
    }
  }
  for (const dir of STYLE_DIRS) walk(path.resolve(dir))
}
const stray = sheets.length ? auditSheets(sheets, sets) : []
if (stray.length) bad += 1

for (const [name, set] of Object.entries(sets)) {
  const findings = auditScale(set)
  if (findings.length) bad += 1
  report.push({ name, findings })
}

if (json) {
  console.log(JSON.stringify({ own, report, stray }, null, 2))
} else {
  if (!own) console.log('Своего styles/scale.json у проекта нет — прогнана только самопроверка.\n')
  for (const row of report) {
    if (!row.findings.length) console.log(`  ✓ ${row.name}`)
    else {
      console.log(`  ✗ ${row.name}`)
      for (const f of row.findings) console.log(`      ${f.rule}: ${f.got} при норме ${f.need}`)
    }
  }
  if (stray.length) {
    console.log('  ✗ шкала объявлена мимо строителя')
    for (const f of stray) console.log(`      ${f.rule}: ${f.got} — ${f.need}`)
  }
  console.log(bad ? `\nНаборов с находками: ${bad}` : '\nШкалы в норме.')
}

process.exit(bad ? 1 : 0)
