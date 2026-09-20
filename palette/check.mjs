/*
 * ПРОГОН ПАЛИТРЫ: строит шкалы и меряет двадцать правил.
 *
 * Набор берётся из `styles/palette.json` приложения, если он есть; иначе
 * проверяются наборы-образцы, и проверка говорит об этом вслух.
 *
 *   npm run check:palette
 *   node palette/check.mjs --json      машине
 *   node palette/check.mjs --sets      прогнать образцы набора (palette/sets.json)
 *
 * Строитель — `build.mjs`, правила — `rules.mjs`. Разбор и числа —
 * `.claude/skills/craft/references/palette.md`.
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { audit } from './rules.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/*
 * Самопроверка: две пары красок, на которых видно, что сама проверка
 * работает. Это НЕ наборы какого-либо магазина и не образец для подражания —
 * краски взяты нарочно разные (тёплая и холодная), чтобы шкала строилась в
 * обе стороны. Настоящий набор живёт в приложении, `styles/palette.json`:
 * переносимый набор не знает и не должен знать, какого цвета чужая марка.
 */
const SELFTEST = {
  'тёплая марка': {
    light: { paper: '#FDFCF8', ink: '#2A2622', accent: '#B07A2E', error: '#B3261E' },
    dark: { paper: '#121110', ink: '#EDEBE8', accent: '#B07A2E', error: '#E5484D' },
  },
  'холодная марка': {
    light: { paper: '#FBFCFD', ink: '#1C2226', accent: '#2C6E8F', error: '#B3261E' },
    dark: { paper: '#0E1114', ink: '#E9ECEE', accent: '#4E9BBE', error: '#E5484D' },
  },
}

function load() {
  if (process.argv.includes('--sets')) {
    return { sets: JSON.parse(readFileSync(path.join(HERE, 'sets.json'), 'utf8')), from: 'образцы набора (palette/sets.json)' }
  }
  const own = path.resolve('styles/palette.json')
  if (existsSync(own)) return { sets: JSON.parse(readFileSync(own, 'utf8')), from: null }
  return { sets: SELFTEST, from: 'самопроверка: в приложении нет styles/palette.json' }
}

const { sets, from } = load()
const json = process.argv.includes('--json')
let bad = 0
const report = []

for (const [name, byMode] of Object.entries(sets)) {
  for (const mode of ['light', 'dark']) {
    const findings = audit(byMode[mode], mode)
    if (findings.length) bad += 1
    report.push({ name, mode, findings })
  }
}

if (json) {
  console.log(JSON.stringify({ own: !from, report }, null, 2))
} else {
  if (from) console.log(`Прогнана ${from}.\n`)
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
