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

/* Знаки лежат там, где лежит скилл: в наборе — `skills/`, в поставленном
   сайте — `.agents/skills/` и `.claude/skills/` (install.mjs кладёт обе
   копии). Искали только первое — и проверка листа падала на каждом сайте.
   Берётся первое существующее; шапка листа называет путь набора, чтобы лист
   сайта и лист набора не расходились ни байтом. */
const SOURCE = 'skills/site-building/assets/icons/lucide'
const PLACES = [SOURCE, `.agents/${SOURCE}`, `.claude/${SOURCE}`]
const found = PLACES.find((p) => existsSync(path.resolve(p)))
const TO = path.resolve('styles/icons.svg')

if (!found) {
  console.error(`✗ Нет знаков набора ни в одном из мест: ${PLACES.join(', ')} — собирать лист не из чего.`)
  process.exit(1)
}
const FROM = path.resolve(found)

const SHAPES = /<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*?)\s*\/?>/g
const lucide = readdirSync(FROM).filter((n) => n.endsWith('.svg')).sort()
/* Чужие марки (`brands/` рядом с `lucide/`, Simple Icons, CC0): мессенджеры
   окна быстрого заказа (И442). Силуэт, а не штрих: марку узнают по форме
   пятна, перерисованная контуром она перестаёт быть собой; поэтому знак
   залит, без штриха и без `vector-effect`. Краску назначает место, как у
   всех знаков листа. Имя знака — в одном месте из двух. */
const BRANDS = path.join(path.dirname(FROM), 'brands')
const brands = existsSync(BRANDS) ? readdirSync(BRANDS).filter((n) => n.endsWith('.svg')).sort() : []
const clash = brands.filter((n) => lucide.includes(n))
if (clash.length) {
  console.error(`✗ Имя знака и в lucide/, и в brands/: ${clash.join(', ')} — у знака одно место.`)
  process.exit(1)
}
const names = [...lucide, ...brands]
const brand = (file) => {
  const id = file.replace(/\.svg$/, '')
  const svg = readFileSync(path.join(BRANDS, file), 'utf8').replace(/\r\n/g, '\n')
  const shapes = [...svg.matchAll(SHAPES)].map((m) => `<${m[1]}${m[2]}/>`)
  if (!shapes.length) throw new Error(`${file}: в знаке нет фигур`)
  return `  <symbol id="${id}" viewBox="0 0 24 24" fill="currentColor" stroke="none">${shapes.join('')}</symbol>`
}
const symbols = names.map((file) => {
  if (brands.includes(file)) return brand(file)
  const id = file.replace(/\.svg$/, '')
  const svg = readFileSync(path.join(FROM, file), 'utf8').replace(/\r\n/g, '\n')
  const body = svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const shapes = [...body.matchAll(SHAPES)].map((m) => `<${m[1]}${m[2]} vector-effect="non-scaling-stroke"/>`)
  if (!shapes.length) throw new Error(`${file}: в знаке нет фигур`)
  return `  <symbol id="${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${shapes.join('')}</symbol>`
})

/* Вид знака (`#<имя>-view`): тот же рисунок, поставленный в ряд, и окно на
   него — лист отдаётся картинкой одного знака по адресу `/icons.svg#<имя>-view`.
   Так знак берёт стиль, которому нужна картинка, а не разметка: маска
   кружка главной кнопки (styles/btn.module.css) вырезает стрелку из листа, а
   не рисует свою. Страничный `<use href="#имя">` видов не касается. */
const views = names.map((file, i) => {
  const id = file.replace(/\.svg$/, '')
  return `  <use href="#${id}" x="${i * 24}" y="0" width="24" height="24" stroke-width="1.75"/><view id="${id}-view" viewBox="${i * 24} 0 24 24"/>`
})

/* Краска и концы штриха — на КАЖДОМ знаке: `<use>` наследует от места
   вызова, а не от корня листа, и атрибуты корня до знака не доходят. */
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- Собран tools/icons.mjs из skills/site-building/assets/icons/lucide (Lucide, ISC) и icons/brands (Simple Icons, CC0); см. LICENSE там же.
       Руками не правят: первый же выпуск сотрёт правку. Знаков: ${names.length}. -->
${symbols.join('\n')}
${views.join('\n')}
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
