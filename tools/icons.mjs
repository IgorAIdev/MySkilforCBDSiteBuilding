/*
 * Лист знаков: `skills/site-building/assets/icons/lucide/*.svg` → `styles/icons.svg`.
 *
 * Слой 11 основания (И249): один лист знаков на сайт, рисунок каждого знака —
 * в одном месте, вес штриха — одной строкой в `styles/base.css`. До листа
 * знак рисовался по месту: семь весов штриха на сорок одно объявление
 * (craft, references/icons.md).
 *
 *   node tools/icons.mjs           выпустить styles/icons.svg
 *   node tools/icons.mjs --check   только сверить: лист отстал — код 1
 *
 * Лист — общий слой (CLAUDE.md, «Переносимость»): простой SVG без движка.
 * Next.js кладёт его в `public/` и зовёт `<svg><use href="/icons.svg#cart"/></svg>`;
 * Liquid и PHP — так же. Знак без подписи рядом получает имя (`aria-label`
 * на кнопке), рисунок — `aria-hidden`.
 *
 * Внутри `<use>` селекторы страницы не достают до фигур, а `vector-effect`
 * не наследуется: правило `svg *{vector-effect:non-scaling-stroke}` из
 * base.css до знака из листа не доехало бы. Поэтому лист ставит его
 * атрибутом на каждую фигуру; толщину (`stroke-width`) знак наследует от
 * своего `<svg>` на странице — её держит base.css.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const FROM = path.resolve('skills/site-building/assets/icons/lucide')
const TO = path.resolve('styles/icons.svg')

if (!existsSync(FROM)) {
  console.error(`✗ Нет ${path.relative(process.cwd(), FROM)} — собирать лист не из чего.`)
  process.exit(1)
}

const SHAPES = /<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*?)\s*\/?>/g
const names = readdirSync(FROM).filter((n) => n.endsWith('.svg')).sort()
const symbols = names.map((file) => {
  const id = file.replace(/\.svg$/, '')
  const svg = readFileSync(path.join(FROM, file), 'utf8').replace(/\r\n/g, '\n')
  const body = svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const shapes = [...body.matchAll(SHAPES)].map((m) => `<${m[1]}${m[2]} vector-effect="non-scaling-stroke"/>`)
  if (!shapes.length) throw new Error(`${file}: в знаке нет фигур`)
  return `  <symbol id="${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${shapes.join('')}</symbol>`
})

/* Краска и концы штриха — на КАЖДОМ знаке: `<use>` наследует от места
   вызова, а не от корня листа, и атрибуты корня до знака не доходят. */
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- Собран tools/icons.mjs из skills/site-building/assets/icons/lucide (Lucide, ISC; см. LICENSE там же).
       Руками не правят: первый же выпуск сотрёт правку. Знаков: ${names.length}. -->
${symbols.join('\n')}
</svg>
`

if (process.argv.includes('--check')) {
  const was = existsSync(TO) ? readFileSync(TO, 'utf8').replace(/\r\n/g, '\n') : ''
  if (was === sheet) {
    console.log(`Лист знаков выпущен и не отстал: ${names.length} знаков`)
    process.exit(0)
  }
  console.error('✗ styles/icons.svg отстал от знаков набора. Выпустить заново: node tools/icons.mjs')
  process.exit(1)
}

writeFileSync(TO, sheet)
console.log(`Выпущено: styles/icons.svg · ${names.length} знаков: ${names.map((n) => n.replace('.svg', '')).join(', ')}`)
