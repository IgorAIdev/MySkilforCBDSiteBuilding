/*
 * Каталог стилей кнопки: `styles/buttons.json` → `styles/buttons.css` (И252).
 *
 * Заказчик: «хотел бы ещё кнопок в скил добавить, чтоб можно было выбирать их
 * из множества» — и выбрал «каталог стилей»: много стилей, магазин носит один.
 * Закон остаётся (craft, controls.md, «Кнопка: голос — это очередь»): голоса
 * два — громкая и тихая; стиль — не новая кнопка, а набор РОЛЕЙ одной кнопки
 * основы (`styles/btn.module.css` читает `--ctrl-btn-*` с запасным значением).
 * Пятнадцатой одежды не бывает по построению.
 *
 *   node tools/buttons.mjs           выпустить styles/buttons.css (только после замера)
 *   node tools/buttons.mjs --check   сверить: замер чист и выпуск не отстал
 *
 * Замер — на палитре сайта (`styles/palette.json`), обе темы, на тех полах,
 * где кнопка стоит (страница и карточка — ступени читаются из tokens.css):
 * надпись 4.5 : 1, кромка 3 : 1, вуаль и тон видны (1.15 : 1 — замер набора,
 * controls.md); угол — из лестницы SHAPE, полный круг только у громкой; вес и
 * разрядка — из порогов TEXT; заглавные без разрядки — находка.
 *
 * Наборов цвета у сайта бывает несколько (витрина: выбор вида, И270), и
 * замер идёт на КАЖДОМ отдельно. Стиль, не прошедший ни на одном, не
 * выпускается; стиль, не прошедший на части наборов, выпускается, а пара
 * «стиль × набор» запрещена — её не даёт выбрать панель вида и не примет
 * сайт (`clash` в `availability`). Стиль по умолчанию обязан пройти на
 * наборе по умолчанию — первом.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { roles as paletteRoles, ratio } from './palette.mjs'
import { SHAPE, TEXT, CONTRAST, STATE } from './thresholds.mjs'

const LOUD = ['заливка', 'контур', 'тон']
const QUIET = ['вуаль', 'кромка']
const SHADOW = { нет: 'none', подъём: 'var(--sh-raised)' }
const PRESS = { сжатие: 'scale(.97)', сдвиг: 'translateY(1px)', нет: 'none' }
const CASE = { обычный: 'none', заглавные: 'uppercase' }

/** Стиль → роли одной кнопки. */
export function buttonRoles(s) {
  const out = {
    '--ctrl-btn-r': `${s.угол}px`,
    '--ctrl-btn-r-pop': s.круг ? 'var(--r-pop)' : `${s.угол}px`,
    '--ctrl-btn-weight': String(s.вес),
    '--ctrl-btn-case': CASE[s.регистр],
    '--ctrl-btn-track': s.разрядка ? `${s.разрядка}em` : 'normal',
    '--ctrl-btn-fill': s.тихая === 'вуаль' ? 'var(--quiet)' : 'transparent',
    '--ctrl-btn-edge': s.тихая === 'кромка' ? 'var(--edge)' : 'transparent',
    '--ctrl-btn-sh': SHADOW[s.тень],
    '--ctrl-btn-press': PRESS[s.нажатие],
  }
  if (s.громкая === 'заливка') Object.assign(out, {
    '--ctrl-btn-fill-pop': 'var(--pop)', '--ctrl-btn-ink-pop': 'var(--on-pop)', '--ctrl-btn-edge-pop': 'transparent',
    '--ctrl-btn-on-pop': 'color-mix(in oklab, var(--pop), var(--ink) var(--state-press))', '--ctrl-btn-line-pop': 'var(--line-w)',
  })
  if (s.громкая === 'контур') Object.assign(out, {
    '--ctrl-btn-fill-pop': 'transparent', '--ctrl-btn-ink-pop': 'var(--pop-ink)', '--ctrl-btn-edge-pop': 'var(--pop)',
    '--ctrl-btn-on-pop': 'color-mix(in srgb, var(--pop) 14%, transparent)', '--ctrl-btn-line-pop': `${SHAPE.line.strong}px`,
  })
  if (s.громкая === 'тон') Object.assign(out, {
    '--ctrl-btn-fill-pop': 'var(--a-4)', '--ctrl-btn-ink-pop': 'var(--a-11)', '--ctrl-btn-edge-pop': 'transparent',
    '--ctrl-btn-on-pop': 'var(--a-5)', '--ctrl-btn-line-pop': 'var(--line-w)',
  })
  return out
}

/* ── чтение ролей основы: какой ступенью что покрашено ─────────────────── */

const tokensText = () => readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8')
export function tokenMap(text = tokensText()) {
  const map = {}
  for (const m of text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) if (!(m[1] in map)) map[m[1]] = m[2].trim()
  return map
}
/** Имя роли → hex в теме: палитра, затем tokens.css, light-dark и var().
 *  Ввозится и панелью вида витрины: плитка набора красится теми же ролями,
 *  что сайт (look-panel/scripts/build-catalog.mjs витрины). */
export function resolver(palette, tokens, theme) {
  const get = (name, depth = 0) => {
    if (depth > 12) throw new Error(`цикл ролей у ${name}`)
    const v = palette[name] ?? tokens[name]
    if (!v) throw new Error(`роль ${name} не объявлена`)
    if (/^#[0-9a-f]{6}$/i.test(v)) return v
    const ld = v.match(/^light-dark\(\s*([^,]+?)\s*,\s*([^)]+\)?)\s*\)$/)
    if (ld) return value(theme === 'light' ? ld[1] : ld[2], depth)
    return value(v, depth)
  }
  const value = (v, depth) => {
    const ref = v.trim().match(/^var\((--[\w-]+)\)$/)
    if (ref) return get(ref[1], depth + 1)
    if (/^#[0-9a-f]{6}$/i.test(v.trim())) return v.trim()
    throw new Error(`не краска: ${v}`)
  }
  return get
}
const mix = (top, under, share) => {
  const c = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
  const [a, b] = [c(top), c(under)]
  return `#${a.map((v, i) => Math.round(v * share + b[i] * (1 - share)).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/* ── замер ─────────────────────────────────────────────────────────────── */

export function auditButtons(styles, palettes, tokens = null) {
  const found = []
  if (Object.keys(palettes).length) tokens ??= tokenMap()
  const quietShare = Number((tokens?.['--quiet'] ?? '').match(/(\d+(?:\.\d+)?)%/)?.[1] ?? 8) / 100
  for (const [name, s] of Object.entries(styles)) {
    const bad = (rule, got, need) => found.push({ style: name, kind: 'structure', palette: '—', theme: '—', rule, got, need })
    if (!SHAPE.radii.includes(s.угол)) bad('угол из лестницы', `${s.угол}px`, SHAPE.radii.join(', '))
    if (!TEXT.weights.includes(s.вес)) bad('толщина букв из порогов', s.вес, TEXT.weights.join(', '))
    if (!(s.разрядка >= 0 && s.разрядка <= TEXT.trackMax)) bad('разрядка в коридоре', `${s.разрядка}em`, `0…${TEXT.trackMax}em`)
    if (!(s.регистр in CASE)) bad('регистр', s.регистр, Object.keys(CASE).join(', '))
    if (s.регистр === 'заглавные' && !(s.разрядка >= 0.02)) bad('заглавные с разрядкой', `${s.разрядка}em`, 'не меньше 0.02em: заглавные без воздуха слипаются')
    if (!LOUD.includes(s.громкая)) bad('громкая: заливка, контур или тон', s.громкая, LOUD.join(', '))
    if (!QUIET.includes(s.тихая)) bad('тихая: вуаль или кромка — без признака органа кнопка вне очереди', s.тихая, QUIET.join(', '))
    if (!(s.тень in SHADOW)) bad('тень', s.тень, Object.keys(SHADOW).join(', '))
    if (!(s.нажатие in PRESS)) bad('нажатие', s.нажатие, Object.keys(PRESS).join(', '))
    if (typeof s.круг !== 'boolean') bad('круг — да или нет', s.круг, 'true / false')
    if (found.some((f) => f.style === name)) continue

    for (const [pName, set] of Object.entries(palettes)) {
      for (const theme of ['light', 'dark'].filter((t) => set[t])) {
        const pal = paletteRoles(set[theme], theme)
        const role = resolver(pal, tokens, theme)
        /* `part` и `floor` — то же, что `rule`, для машины: по ним панель
           вида и сайт называют причину своими словами (И270). */
        /* Округление вниз: 2,996 при пороге 3 — «2.99», а не «3 при норме 3». */
        const want = (part, floor, rule, got, need) => { if (got < need) found.push({ style: name, kind: 'palette', palette: pName, theme, part, floor, rule, got: Math.floor(got * 100) / 100, need }) }
        for (const [where, at, floorName] of [['страница', 'page', '--page'], ['карточка', 'card', '--plate']]) {
          const floor = role(floorName)
          if (s.тихая === 'вуаль') want('quiet-veil', at, `тихая видна на полу (${where})`, ratio(mix(role('--ink'), floor, quietShare), floor), STATE.visible)
          if (s.тихая === 'кромка') want('quiet-edge', at, `кромка тихой (${where})`, ratio(role('--edge'), floor), CONTRAST.control)
          if (s.громкая === 'контур') {
            want('outline-ink', at, `надпись громкой-контура (${where})`, ratio(role('--pop-ink'), floor), CONTRAST.text)
            want('outline-line', at, `контур громкой (${where})`, ratio(role('--pop'), floor), CONTRAST.control)
          }
          if (s.громкая === 'тон') want('tone-fill', at, `тон громкой виден (${where})`, ratio(role('--a-4'), floor), STATE.visible)
        }
        if (s.громкая === 'заливка') want('fill-ink', null, 'надпись на заливке', ratio(role('--on-pop'), role('--pop')), CONTRAST.text)
        if (s.громкая === 'тон') want('tone-ink', null, 'надпись на тоне', ratio(role('--a-11'), role('--a-4')), CONTRAST.text)
      }
    }
  }
  return found
}

/** Какие стили сайт может носить и с какими наборами цвета: ошибка
 *  каталога — отказ целиком; стиль, не прошедший замер ни на одном наборе
 *  палитры сайта, не выпускается и называется (`off`); не прошедший на
 *  части наборов — выпускается, а пары «стиль × набор» названы первой
 *  находкой (`clash[стиль][набор]`). Набор один — `clash` пуст. */
export function availability(styles, palettes, tokens) {
  const found = auditButtons(styles, palettes, tokens)
  const structure = found.filter((f) => f.kind === 'structure')
  const names = Object.keys(palettes)
  const fails = {}
  for (const f of found.filter((x) => x.kind === 'palette')) ((fails[f.style] ??= {})[f.palette] ??= []).push(f)
  const off = {}
  const clash = {}
  for (const [style, byPalette] of Object.entries(fails)) {
    if (names.every((p) => byPalette[p])) off[style] = Object.values(byPalette).flat()
    else clash[style] = Object.fromEntries(Object.entries(byPalette).map(([p, list]) => [p, list[0]]))
  }
  const on = Object.keys(styles).filter((n) => !off[n] && !structure.some((f) => f.style === n))
  return { structure, off, on, clash }
}

/* ── выпуск ────────────────────────────────────────────────────────────── */

const block = (sel, style) => `${sel}{\n${Object.entries(buttonRoles(style)).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`
export function toCss(styles, off = {}, clash = {}) {
  const names = Object.keys(styles).filter((n) => !off[n])
  const skipped = Object.keys(off)
  const pairs = Object.entries(clash).map(([n, by]) => `${n} — ${Object.keys(by).join(', ')}`)
  return `/* Собран tools/buttons.mjs из styles/buttons.json. Руками не правят.\n` +
    `   Стиль — роли одной кнопки основы (styles/btn.module.css). На корне —\n` +
    `   первый стиль; выбрать другой — [data-button="имя"] на документе.\n` +
    `   Стилей: ${names.length} — ${names.join(' · ')}.` +
    (skipped.length ? `\n   Не выпущены — не прошли замер на палитре сайта: ${skipped.join(' · ')}.` : '') +
    (pairs.length ? `\n   Не носятся с частью наборов цвета (пару не примет сайт): ${pairs.join('; ')}.` : '') + ' */\n\n' +
    [block(':root', styles[names[0]]), ...names.map((n) => block(`[data-button="${n}"]`, styles[n]))].join('\n\n') + '\n'
}

/* ── команда ───────────────────────────────────────────────────────────── */

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const FROM = path.resolve('styles/buttons.json')
  const TO = path.resolve('styles/buttons.css')
  const PALETTE = path.resolve('styles/palette.json')
  if (!existsSync(FROM)) { console.error('✗ Нет styles/buttons.json — каталога стилей нет.'); process.exit(1) }
  if (!existsSync(PALETTE)) { console.error('✗ Нет styles/palette.json — мерить стили не на чем.'); process.exit(1) }
  const styles = JSON.parse(readFileSync(FROM, 'utf8'))
  /* Ошибка каталога называется раньше, чем понадобятся роли основы. */
  const broken = auditButtons(styles, {})
  if (broken.length) {
    console.error(`✗ Каталог кнопок не выпущен: ошибка каталога. styles/buttons.css не тронут.`)
    for (const f of broken.slice(0, 12)) console.error(`    ${f.style}: ${f.rule} — ${f.got}; нужно ${f.need}`)
    process.exit(1)
  }
  const TOKENS = path.resolve('styles/tokens.css')
  if (!existsSync(TOKENS)) { console.error('✗ Нет styles/tokens.css — не видно, какой ступенью покрашены пол и кнопка.'); process.exit(1) }
  const tokens = tokenMap(readFileSync(TOKENS, 'utf8'))
  const palettes = JSON.parse(readFileSync(PALETTE, 'utf8'))
  const { structure, off, clash } = availability(styles, palettes, tokens)
  const first = Object.keys(styles)[0]
  const firstPalette = Object.keys(palettes)[0]
  const firstOff = off[first] ?? (clash[first]?.[firstPalette] ? [clash[first][firstPalette]] : null)
  if (structure.length || firstOff) {
    const why = structure.length ? structure : firstOff
    const what = structure.length ? 'ошибка каталога' : `стиль по умолчанию «${first}» не прошёл замер на наборе по умолчанию «${firstPalette}»`
    console.error(`✗ Каталог кнопок не выпущен: ${what}. styles/buttons.css не тронут.`)
    for (const f of why.slice(0, 12)) console.error(`    ${f.style} · ${f.palette} · ${f.theme}: ${f.rule} — ${f.got}; нужно ${f.need}`)
    process.exit(1)
  }
  for (const [name, list] of Object.entries(off)) {
    console.log(`· «${name}» не выпущен для этой палитры: ${list[0].rule} — ${list[0].got} (${list[0].theme}); нужно ${list[0].need}`)
  }
  for (const [name, by] of Object.entries(clash)) {
    for (const [p, f] of Object.entries(by)) console.log(`· «${name}» не носится с набором «${p}»: ${f.rule} — ${f.got} (${f.theme}); нужно ${f.need}`)
  }
  const css = toCss(styles, off, clash)
  const count = Object.keys(styles).length - Object.keys(off).length
  if (process.argv.includes('--check')) {
    const was = existsSync(TO) ? readFileSync(TO, 'utf8').replace(/\r\n/g, '\n') : ''
    if (was === css) { console.log(`Каталог кнопок в норме и не отстал: ${count} стилей`); process.exit(0) }
    console.error('✗ styles/buttons.css отстал от styles/buttons.json. Выпустить: node tools/buttons.mjs')
    process.exit(1)
  }
  writeFileSync(TO, css)
  console.log(`Выпущено: styles/buttons.css · ${count} стилей · на корне «${first}»`)
}
