/**
 * Строитель палитры — глазами: страница, где три краски набора превращаются
 * во все остальные, и видно, как именно.
 *
 * Заведено по слову заказчика 20.09.2026: «покажи мне работу твою, как
 * формируется палитра цвета». Стенд (`palette-stand.mjs`) показывает ВЫБОР
 * — наборы рядом на одной карточке; лист (`palette-sheet.mjs`) — СОСТАВ,
 * все выпущенные краски с подписью работы. Этот показывает ХОД: проверку
 * красок до построения, лестницы с работой каждой ступени, пять сигналов,
 * роли на карточке магазина и замер числами — в обеих темах, с живой
 * правкой красок наверху.
 *
 * Строитель `palette.mjs` вшивается в страницу КАК ЕСТЬ, без правок: только
 * снимается ввоз из node:fs, а слепок пород (`palette-profile.json`)
 * кладётся внутрь. Иначе демонстрация врёт: показывает одно, а сайт красит
 * другим. Это сторожит тест: в выпущенной странице обязаны быть функции
 * строителя и все наборы.
 *
 *   node tools/palette-builder.mjs [куда.html]     самостоятельная страница
 *   node tools/palette-builder.mjs --bare куда.html без обёртки <html> — для артефакта
 *
 * Наборы берутся из `styles/palette.json` (то, чем сайт покрашен сейчас) и
 * `templates/palette.json` (образцы набора, если лежат рядом).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const args = process.argv.slice(2)
const BARE = args.includes('--bare')
const OUT = args.find((a) => a.endsWith('.html')) || 'строитель-палитры.html'

const load = (p) => (existsSync(path.resolve(p)) ? JSON.parse(readFileSync(path.resolve(p), 'utf8')) : {})
const own = load('styles/palette.json')
const samples = load('templates/palette.json')
/* Свой набор — первым: он стоит на сайте, остальные рядом для сравнения. */
const sets = { ...own, ...Object.fromEntries(Object.entries(samples).filter(([n]) => !(n in own))) }
if (!Object.keys(sets).length) {
  console.error('✗ Ни styles/palette.json, ни templates/palette.json — показывать нечего.')
  process.exit(1)
}

/* Строитель в браузер: тот же файл, без ввоза и без вывоза. */
let builder = readFileSync(path.join(HERE, 'palette.mjs'), 'utf8')
builder = builder.replace("import { readFileSync } from 'node:fs'\n", '')
builder = builder.replace(/let cache = null\nconst FAMILIES = \(\) => \{[\s\S]*?\n\}\n/, 'const FAMILIES = () => PROFILE_JSON.scales\n')
if (!builder.includes('PROFILE_JSON.scales')) {
  console.error('✗ В palette.mjs не нашёлся загрузчик слепка пород — страница не соберётся честно.')
  process.exit(1)
}
builder = builder.replace(/^export (const|function) /gm, '$1 ')
if (/^\s*(export|import)\b/m.test(builder)) {
  console.error('✗ В строителе остался ввоз или вывоз — в браузере он не запустится.')
  process.exit(1)
}

const profile = readFileSync(path.join(HERE, 'palette-profile.json'), 'utf8').trim()
const tpl = readFileSync(path.join(HERE, 'palette-builder.html'), 'utf8')
let html = tpl
  .replace('__PROFILE__', () => profile)
  .replace('__SETS__', () => JSON.stringify(sets))
  .replace('__BUILDER__', () => builder)

if (!BARE) {
  const cut = html.indexOf('</style>') + '</style>'.length
  html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${html.slice(0, cut)}
</head><body>
${html.slice(cut)}
</body></html>
`
}
writeFileSync(path.resolve(OUT), html)
console.log(`✓ строитель палитры: ${OUT} — ${Object.keys(sets).length} набор(ов), ${Buffer.byteLength(html)} байт`)
