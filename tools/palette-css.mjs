/*
 * Выпуск палитры: `styles/palette.json` → `styles/palette.css`.
 *
 * Тот шаг, которого набору не хватало целиком. Правила шкалы были записаны,
 * сторож считал двадцать правил, разбор занимал триста строк — а покрасить
 * этим сайт было нечем: двенадцать ступеней считались внутри проверки и
 * выбрасывались, а цвета стояли в `styles/tokens.css` набранными рукой.
 * Заказчик назвал это одним словом: «нихуя не работает».
 *
 * Считает он тем же кодом, что и проверка (`palette.mjs`), — иначе зелёный
 * отчёт перестал бы говорить что-либо о том, что выпущено.
 *
 *   node tools/palette-css.mjs           выпустить styles/palette.css
 *   node tools/palette-css.mjs --check   только сверить: файл отстал — код 1
 *
 * Файл собран машиной и правится только ею: первый же выпуск сотрёт правку
 * руками (CLAUDE.md, «Против заплаток», п. 0).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { toCss } from './palette.mjs'

const FROM = path.resolve('styles/palette.json')
const TO = path.resolve('styles/palette.css')

if (!existsSync(FROM)) {
  console.error('✗ Нет styles/palette.json — красить нечем.')
  console.error('    Образцы наборов: templates/palette.json. Четыре краски на тему плюс статусные.')
  process.exit(1)
}

const sets = JSON.parse(readFileSync(FROM, 'utf8'))
const names = Object.keys(sets)
if (!names.length) {
  console.error('✗ В styles/palette.json нет ни одного набора.')
  process.exit(1)
}

const css = toCss(sets)

if (process.argv.includes('--check')) {
  const was = existsSync(TO) ? readFileSync(TO, 'utf8') : ''
  if (was === css) {
    console.log(`Палитра выпущена и не отстала: ${names.length} · ${names.join(', ')}`)
    process.exit(0)
  }
  console.error('✗ styles/palette.css отстал от styles/palette.json.')
  console.error('    Выпустить заново: node tools/palette-css.mjs')
  process.exit(1)
}

writeFileSync(TO, css)
console.log(`Выпущено: styles/palette.css · ${names.length} ${names.length === 1 ? 'набор' : 'набора(ов)'} · ${names.join(', ')}`)
console.log(`Первый набор стоит на корне; остальные — под [data-palette="имя"].`)
