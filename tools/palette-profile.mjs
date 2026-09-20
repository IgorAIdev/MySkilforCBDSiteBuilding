/*
 * Слепок эталонных шкал Radix: откуда строитель берёт ФОРМУ лестницы.
 *
 * Зачем он появился. Строитель клал ступени 1–8 по прямой от бумаги к
 * краске — и середина лестницы обесцвечивалась: у сине-зелёной марки шестая
 * ступень выходила C* 4.4 там, где у эталона той же породы 21. Середина
 * лестницы — это ВСЕ поверхности магазина разом: карточка, плитка, контрол,
 * разделитель. Тёплая марка давала серый сайт, и заказчик видел это глазом,
 * а ни один сторож не видел.
 *
 * Замер 21.09.2026 по всем 31 шкале пакета: насыщенность НИ В ОДНОЙ не идёт
 * прямой. Она поднимается от первой ступени к девятой и падает к
 * двенадцатой — дуга с вершиной на заливке. Прямая линия эту дугу не
 * повторяет ни при каких красках.
 *
 * Поэтому форма берётся у эталона, а не выводится: тон — у марки заказчика,
 * светлота — из профиля, насыщенность — доля от насыщенности марки по дуге
 * ТОЙ ЖЕ ПОРОДЫ (ближайшая по тону шкала эталона). Породы нужны потому, что
 * дуги у них разные и разница не наша: `amber` на пятой ступени держит 78%
 * своей вершины, `blue` — 27%, и упирается это в охват sRGB, а не во вкус.
 *
 * Собран машиной и правится только ею:
 *
 *   node tools/palette-profile.mjs        пересобрать tools/palette-profile.json
 *
 * Источник — файлы `@radix-ui/themes` 3.3.0, снимок в
 * `research/site-building-2026-09-20/raw/sources/radix-themes/`.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { oklch, lightness } from './palette.mjs'

const SRC = new URL(
  '../research/site-building-2026-09-20/raw/sources/radix-themes/npm-themes@3.3.0/tokens/colors/',
  import.meta.url,
)

/* Серые шкалы эталона без тона: дуги у них нет (насыщенность ноль на всех
   ступенях), и ближайшей по тону такая шкала быть не может. */
const FLAT = new Set(['gray'])

const steps = (text, name, dark) => {
  const cut = text.indexOf('.dark')
  const part = dark ? text.slice(cut) : text.slice(0, cut > 0 ? cut : text.length)
  return Array.from({ length: 12 }, (_, i) => {
    const m = new RegExp(`--${name}-${i + 1}:\\s*(#[0-9a-f]{6})`, 'i').exec(part)
    return m ? m[1].toUpperCase() : null
  })
}

const out = { source: '@radix-ui/themes 3.3.0', scales: {} }

for (const file of readdirSync(SRC).sort()) {
  if (!file.endsWith('.css')) continue
  const name = file.replace(/\.css$/, '')
  if (FLAT.has(name)) continue
  const text = readFileSync(new URL(file, SRC), 'utf8')
  const row = {}
  for (const mode of ['light', 'dark']) {
    const hexes = steps(text, name, mode === 'dark')
    if (hexes.some((h) => !h)) continue
    const ok = hexes.map(oklch)
    const peak = ok[8][1]
    row[mode] = {
      /* Светлота в CIE L*: на ней держатся все пороги и все замеры набора. */
      steps: hexes.map((h) => Number(lightness(h).toFixed(1))),
      /* Насыщенность — ДОЛЯ от насыщенности девятой ступени. Доля, а не
         число: у марки заказчика своя насыщенность, и лестница строится
         от неё. */
      chroma: ok.map((c) => Number((c[1] / peak).toFixed(3))),
      /* Тон девятой — по нему выбирается ближайшая порода. */
      hue: Number(ok[8][2].toFixed(1)),
    }
  }
  if (row.light && row.dark) out.scales[name] = row
}

/* Записан в одну строку на шкалу: файл собран машиной, и читать его глазами
   построчно всё равно никто не будет, а тридцать шкал по сорок строк — это
   полторы тысячи строк в обзоре правки. */
const body = Object.entries(out.scales)
  .map(([name, row]) => `    ${JSON.stringify(name)}: ${JSON.stringify(row)}`)
  .join(',\n')
writeFileSync(
  new URL('palette-profile.json', import.meta.url),
  `{\n  "source": ${JSON.stringify(out.source)},\n  "scales": {\n${body}\n  }\n}\n`,
)
console.log(`Шкал в слепке: ${Object.keys(out.scales).length}`)
