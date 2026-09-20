/*
 * Палитра не заводится на глаз.
 *
 * Проверка меряет РЕЗУЛЬТАТ ПОСТРОЕНИЯ шкалы, а не таблицу токенов: все
 * дефекты, которыми она куплена, рождались именно в том, как из красок
 * считается остальное, и ни один сторож набора их не видел.
 *
 * Математика живёт в `palette.mjs` — там же, откуда её берёт выпуск
 * `styles/palette.css`. Здесь только запуск и отчёт: проверка и строитель
 * обязаны считать ОДНИМ кодом, иначе зелёный отчёт перестанет говорить
 * что-либо о том, чем сайт покрашен.
 *
 * Разбор, числа и источники — `.claude/skills/craft/references/palette.md`.
 * Закон — `SKILL.md`, «Палитра — это шкала из двенадцати ступеней».
 *
 * Запуск: node tools/check-palette.mjs [--json]
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { auditPalette } from './palette.mjs'

/*
 * Самопроверка: две пары красок, на которых видно, что сама проверка работает.
 *
 * Это НЕ наборы какого-либо магазина и не образец для подражания — краски
 * взяты нарочно разные (тёплая и холодная), чтобы шкала строилась в обе
 * стороны. Настоящий набор живёт в приложении, `styles/palette.json`:
 * переносимый набор не знает и не должен знать, какого цвета чужая марка.
 */
const SIGNALS = { error: '#B3261E', sale: '#D6409F', warn: '#F76B15', ok: '#30A46C' }
const SELFTEST = {
  'тёплая марка': {
    light: { paper: '#FDFCF8', ink: '#2A2622', accent: '#B07A2E', ...SIGNALS },
    dark: { paper: '#121110', ink: '#EDEBE8', accent: '#B07A2E', ...SIGNALS, error: '#E5484D' },
  },
  'холодная марка': {
    light: { paper: '#FBFCFD', ink: '#1C2226', accent: '#2C6E8F', ...SIGNALS },
    dark: { paper: '#0E1114', ink: '#E9ECEE', accent: '#4E9BBE', ...SIGNALS, error: '#E5484D' },
  },
}

/* Набор берётся у приложения. Если шкалы набора в проекте стоят, а красок
   нет — это находка, а не повод прогнать самопроверку и уйти зелёным:
   проверка, которая при отсутствии предмета отвечает «в норме», ничем не
   отличается от выключенной. Тем же сломался прогон тестов на папке без
   тестов — `check-test.mjs`, «молчаливый ноль выглядит как результат».

   Признак «шкалы стоят» — `styles/tokens.css`, а не просто папка `styles/`:
   у чужого сайта, который набор только проверяет (`install --audit`), своя
   папка стилей и своя система цвета, и требовать от неё нашего файла
   нечестно. Там проверка остаётся самопроверкой и говорит об этом вслух. */
function load() {
  const own = path.resolve('styles/palette.json')
  if (existsSync(own)) return { sets: JSON.parse(readFileSync(own, 'utf8')), own: true }
  if (existsSync(path.resolve('styles/tokens.css'))) return { sets: null, own: true }
  return { sets: SELFTEST, own: false }
}

const { sets, own } = load()
const json = process.argv.includes('--json')

if (!sets) {
  const say = 'Шкалы набора в проекте стоят, а styles/palette.json нет — красить сайт нечем.'
  if (json) console.log(JSON.stringify({ own, missing: true, report: [] }, null, 2))
  else {
    console.error(`✗ ${say}`)
    console.error('    Возьмите образец из templates/palette.json или заведите свой:')
    console.error('    семь красок на тему — бумага, чернила, фирменный и четыре сигнала.')
    console.error('    Потом выпустите стили: npm run palette')
  }
  process.exit(1)
}

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
  if (!own) console.log('Своего styles/palette.json у проекта нет — прогнана только самопроверка.\n')
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
