/* Закрытый список свойств вида — lib/look-slots.json (И270).

   Вид приходит сайту значениями, и сайт принимает только свои свойства:
   те, чьи умолчания объявлены его же стилями на корне — набор цвета
   (styles/palette.css), стиль кнопок (styles/buttons.css), набор ритма
   (styles/scale.css), шрифт (--face, --face-head в styles/tokens.css) и
   отметка текущего пункта меню (styles/storefront.css). У каждого — род
   значения, группа и умолчание. Свойства, которые набор ритма
   переобъявляет под пальцем (`@media (pointer:coarse)`), в вид не входят:
   блок вида стоит после стилей и перебил бы палец.

   Рядом — факты для правила сочетаний (lib/look-rule.ts): как роли, на
   которых мерится кнопка, собраны из ступеней (tokens.css), пороги набора
   (tools/thresholds.mjs) и какие роли текста — заголовки. Сервер страниц
   tools/ не ввозит (И267): всё, что ему нужно от набора, выпускается здесь,
   самим Node, готовым файлом.

     node scripts/look-slots.mjs          выпустить (идёт в сборке)
     node scripts/look-slots.mjs --check  сверить: выпуск не отстал */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tokenMap } from '../tools/buttons.mjs'
import { rolesOf } from '../tools/scale.mjs'
import { CONTRAST, STATE } from '../tools/thresholds.mjs'

const TO = 'lib/look-slots.json'

/** Род свойства стиля кнопок — по его роли (tools/buttons.mjs, buttonRoles). */
const BUTTON = {
  r: 'length', 'r-pop': 'length', weight: 'number', case: 'keyword', track: 'length', fill: 'colour', edge: 'colour',
  sh: 'shadow', press: 'transform', 'fill-pop': 'colour', 'ink-pop': 'colour', 'edge-pop': 'colour', 'on-pop': 'colour', 'line-pop': 'length',
}
/** Род свойства отметки текущего пункта меню (styles/storefront.css). */
const MARKER = { line: 'keyword', fill: 'colour', ink: 'colour', r: 'length', pad: 'length' }

const bare = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
/** Объявления первого блока `:root{…}` вне @media. */
function rootBlock(css) {
  const text = bare(css)
  const at = text.search(/(^|\n):root\s*\{/)
  if (at < 0) return {}
  const from = text.indexOf('{', at) + 1
  const body = text.slice(from, text.indexOf('}', from))
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)].map((m) => [m[1], m[2].trim()]))
}
/** Имена, переобъявленные внутри @media. */
const inMedia = (css) => new Set([...bare(css).matchAll(/@media[^{]*\{([^{}]*\{[^}]*\})/g)].flatMap((m) => [...m[1].matchAll(/(--[\w-]+)\s*:/g)].map((x) => x[1])))

/** Список свойств и факты — из текстов стилей и чисел набора. */
export function lookSlots({ palette, buttons, scale, tokens, storefront, scales }) {
  const slots = {}
  const put = (name, type, group, value) => { slots[name] = { type, group, value } }
  for (const [k, v] of Object.entries(rootBlock(palette))) put(k, 'colour', 'palette', v)
  for (const [k, v] of Object.entries(rootBlock(buttons))) {
    const type = BUTTON[k.replace(/^--ctrl-btn-/, '')]
    if (!type) throw new Error(`${k}: род свойства кнопки неизвестен — дописать в BUTTON (scripts/look-slots.mjs)`)
    put(k, type, 'button', v)
  }
  const coarse = inMedia(scale)
  for (const [k, v] of Object.entries(rootBlock(scale))) if (!coarse.has(k)) put(k, /^-?[\d.]+$/.test(v) ? 'number' : 'length', 'scale', v)
  const map = tokenMap(tokens)
  for (const k of ['--face', '--face-head']) put(k, 'font', 'face', map[k])
  for (const [k, v] of Object.entries(rootBlock(storefront))) {
    const type = MARKER[k.replace(/^--menu-mark-/, '')]
    if (k.startsWith('--menu-mark-')) {
      if (!type) throw new Error(`${k}: род свойства отметки неизвестен — дописать в MARKER (scripts/look-slots.mjs)`)
      put(k, type, 'marker', v)
    }
  }
  /* Роли, на которых правило мерит кнопку и отметку: замыкание ссылок от
     полов и ролей кнопки до ступеней палитры (они — свойства вида). */
  const refs = (v) => [...String(v).matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1])
  const queue = ['--page', '--plate', '--surface', '--ink', '--quiet', '--pop', '--on-pop', '--pop-ink',
    ...Object.values(slots).filter((s) => s.group === 'button' || s.group === 'marker').flatMap((s) => refs(s.value))]
  const roles = {}
  while (queue.length) {
    const name = queue.shift()
    if (slots[name] || roles[name] || !map[name]) continue
    roles[name] = map[name]
    queue.push(...refs(map[name]))
  }
  const first = Object.keys(scales)[0]
  const headings = Object.entries(rolesOf(scales, first)).filter(([, r]) => r.род === 'заголовок').map(([role]) => role)
  return { slots, facts: { roles, need: { text: CONTRAST.text, control: CONTRAST.control, visible: STATE.visible }, headings } }
}

const HEAD = 'Собран scripts/look-slots.mjs из стилей сайта и порогов набора. Руками не правят.'
export const render = (data) => JSON.stringify({ about: HEAD, ...data }, null, 2) + '\n'

/** Тексты стилей сайта с диска. */
export function readSite(root = '.') {
  const at = (p) => readFileSync(resolve(root, p), 'utf8')
  return {
    palette: at('styles/palette.css'), buttons: at('styles/buttons.css'), scale: at('styles/scale.css'),
    tokens: at('styles/tokens.css'), storefront: at('styles/storefront.css'), scales: JSON.parse(at('styles/scale.json')),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = render(lookSlots(readSite()))
  const count = Object.keys(JSON.parse(text).slots).length
  if (process.argv.includes('--check')) {
    const was = existsSync(TO) ? readFileSync(TO, 'utf8').replace(/\r\n/g, '\n') : ''
    if (was === text) { console.log(`Свойства вида не отстали: ${count}`); process.exit(0) }
    console.error(`✗ ${TO} отстал от стилей сайта. Выпустить: node scripts/look-slots.mjs`)
    process.exit(1)
  }
  writeFileSync(TO, text)
  console.log(`Выпущено: ${TO} · свойств вида: ${count}`)
}
