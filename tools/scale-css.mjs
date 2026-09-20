/*
 * Выпуск шкал: `styles/scale.json` → `styles/scale.css`.
 *
 * Тот же шаг, которого не хватало палитре (И194): правило про шкалы было
 * записано с первого дня, сторожа считали числа в файлах — а САМИ шкалы
 * стояли набранными рукой, и поменять ритм сайта владельцу было нечем.
 *
 * Считает он тем же кодом, что и замер (`scale.mjs`), — иначе зелёный отчёт
 * перестал бы говорить что-либо о том, чем сайт размечен.
 *
 *   node tools/scale-css.mjs           выпустить styles/scale.css
 *   node tools/scale-css.mjs --check   только сверить: файл отстал — код 1
 *
 * Файл собран машиной и правится только ею: первый же выпуск сотрёт правку
 * руками (CLAUDE.md, «Против заплаток», п. 0).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { toCss } from './scale.mjs'

const FROM = path.resolve('styles/scale.json')
const TO = path.resolve('styles/scale.css')

if (!existsSync(FROM)) {
  console.error('✗ Нет styles/scale.json — размечать нечем.')
  console.error('    В нём на каждую ступень два числа: сколько на телефоне и сколько на макете.')
  process.exit(1)
}

const sets = JSON.parse(readFileSync(FROM, 'utf8'))
const names = Object.keys(sets)
if (!names.length) {
  console.error('✗ В styles/scale.json нет ни одного набора.')
  process.exit(1)
}

let css
try { css = toCss(sets) } catch (e) {
  console.error(`✗ ${e.message}`)
  process.exit(1)
}

if (process.argv.includes('--check')) {
  const was = existsSync(TO) ? readFileSync(TO, 'utf8') : ''
  if (was === css) {
    console.log(`Шкалы выпущены и не отстали: ${names.length} · ${names.join(', ')}`)
    process.exit(0)
  }
  console.error('✗ styles/scale.css отстал от styles/scale.json.')
  console.error('    Выпустить заново: node tools/scale-css.mjs')
  process.exit(1)
}

writeFileSync(TO, css)
console.log(`Выпущено: styles/scale.css · ${names.length} ${names.length === 1 ? 'набор' : 'набора(ов)'} · ${names.join(', ')}`)
console.log('Первый набор стоит на корне; все — под [data-scale="имя"].')
