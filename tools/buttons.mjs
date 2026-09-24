/*
 * Каталог кнопки: `styles/buttons.json` → `styles/buttons.css` (И252, И273).
 *
 * Кнопка основы одна (`styles/btn.module.css`); каталог — не одежды строкой,
 * а НЕЗАВИСИМЫЕ ОСИ данных: у каждой оси варианты, у варианта — роли одной
 * кнопки основы (`--ctrl-btn-*`), которые он объявляет. Сегодня осей четыре:
 * буквы (как в предложении или заглавные), главная (заливка марки), тихая
 * (вуаль чернил) и форма главной (обычная, стрелка, шеврон, двойной шеврон —
 * И276). Новая ось или вариант — запись в JSON, без правки кода
 * сайта и панели вида: панель строит раздел Buttons из осей каталога, правило
 * сочетаний читает объявленные значения (слово заказчика 24.09.2026: «по
 * кнопкам будем делать много выбора в меню, будем позже добавлять кнопки»).
 *
 * Чего каталог НЕ несёт (И273): угол — из Shape (`--r-ctrl`, у главной тот
 * же); нажатие — одно на всё нажимаемое (`.press` в styles/btn.module.css).
 * Десять прежних стилей смешивали угол, род заливки и нажатие — одна кнопка
 * решалась в трёх местах, и пары «стиль × набор цвета» рождались оттуда.
 *
 *   node tools/buttons.mjs           выпустить styles/buttons.css (только после замера)
 *   node tools/buttons.mjs --check   сверить: замер чист и выпуск не отстал
 *
 * Замер — на палитре сайта (`styles/palette.json`), обе темы, на тех полах,
 * где кнопка стоит (страница и карточка — ступени читаются из tokens.css):
 * надпись 4.5 : 1, кромка 3 : 1, заливка и вуаль видны на полу (1.15 : 1 —
 * замер набора, controls.md); вес и разрядка — из порогов TEXT; заглавные без
 * разрядки набора — находка. Наборов цвета бывает несколько (витрина, И270):
 * вариант, не прошедший ни на одном, не выпускается (`off`); не прошедший на
 * части — выпускается, пара «вариант × набор» названа (`clash`). Вариант по
 * умолчанию — первый в оси — обязан пройти на наборе по умолчанию — первом.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { roles as paletteRoles, ratio } from './palette.mjs'
import { TEXT, CONTRAST, STATE } from './thresholds.mjs'

/** Роли одной кнопки основы, которые вариант оси может объявить, и их род.
 *  btn.module.css читает каждую с запасным значением. */
export const ROLES = {
  '--ctrl-btn-case': 'keyword', '--ctrl-btn-weight': 'number', '--ctrl-btn-track': 'length',
  '--ctrl-btn-fill': 'colour', '--ctrl-btn-ink': 'colour', '--ctrl-btn-edge': 'colour',
  '--ctrl-btn-fill-pop': 'colour', '--ctrl-btn-ink-pop': 'colour', '--ctrl-btn-edge-pop': 'colour',
  /* Форма ГЛАВНОЙ кнопки (И276) — числами в долях её высоты: где начинается
     остриё и где его точка (от правого края), выемка слева, показ хвоста и
     сдвиги двух его шевронов. Контур собирает btn.module.css на самой кнопке:
     ссылка на высоту кнопки в значении корня не дожила бы до кнопки. Тихая и
     знаки — всегда прямоугольник с углом из Shape: стрелка на каждом органе —
     шум. */
  '--ctrl-btn-tip': 'number', '--ctrl-btn-tip-at': 'number', '--ctrl-btn-notch': 'number', '--ctrl-btn-echo': 'keyword',
  '--ctrl-btn-trail-1': 'number', '--ctrl-btn-trail-2': 'number',
}
const CASES = ['none', 'uppercase']
/** Разрядка заглавных — коридор набора (craft: заглавные без воздуха слипаются). */
export const CAPS_TRACK = [0.04, TEXT.trackMax]

/** Оси каталога списком: { id, имя, name, что, options: [{ id, имя, name, что, роли }] }. */
export const axesOf = (catalog) => Object.entries(catalog).map(([id, a]) => ({ id, имя: a.имя, name: a.name, что: a.что, options: Object.entries(a.варианты ?? {}).map(([oid, o]) => ({ id: oid, ...o })) }))
/** Роли выбора: вариант каждой оси (не названный — первый). */
export function buttonRoles(catalog, choice = {}) {
  return Object.assign({}, ...axesOf(catalog).map((a) => (a.options.find((o) => o.id === choice[a.id]) ?? a.options[0])?.роли ?? {}))
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
/** Краска значения поверх пола: `transparent` — null; вуаль
 *  `color-mix(in srgb|oklab, X p%, transparent)` — X долей p по полу; ссылка
 *  на вуаль (`var(--quiet)` → `var(--quiet-paper)` → вуаль, выпущенная
 *  строителем палитры, И295) — так же, по всей цепочке ссылок. */
function painter(palette, tokens, theme) {
  const get = resolver(palette, tokens, theme)
  const over = (v, floor, depth = 0) => {
    const s = String(v).trim()
    if (s === 'transparent') return null
    const veil = s.match(/^color-mix\(in (?:srgb|oklab), (.+) (\d+(?:\.\d+)?)%, transparent\)$/)
    if (veil) { const top = over(veil[1], floor, depth + 1); return top ? mix(top, floor, Number(veil[2]) / 100) : null }
    if (/^#[0-9a-f]{6}$/i.test(s)) return s
    const ref = s.match(/^var\((--[\w-]+)\)$/)
    if (ref && depth < 12) {
      const raw = (palette[ref[1]] ?? tokens[ref[1]] ?? '').trim()
      if (/^color-mix|^transparent$|^var\(/.test(raw)) return over(raw, floor, depth + 1)
      return get(ref[1])
    }
    return get(s)
  }
  return { get, over }
}

/* ── замер ─────────────────────────────────────────────────────────────── */

const VOICES = [['--ctrl-btn-fill', '--ctrl-btn-ink', '--ctrl-btn-edge', 'тихая', 'quiet'], ['--ctrl-btn-fill-pop', '--ctrl-btn-ink-pop', '--ctrl-btn-edge-pop', 'громкая', 'loud']]

/** Находки каталога: устройство (`structure`) и замер на наборах цвета
 *  (`palette`). Имя варианта — `ось/вариант`. */
export function auditButtons(catalog, palettes, tokens = null) {
  const found = []
  const axes = axesOf(catalog)
  const owner = {}
  for (const a of axes) {
    const bad = (style, rule, got, need) => found.push({ style, axis: a.id, kind: 'structure', palette: '—', theme: '—', rule, got, need })
    if (!a.имя || !a.name || !a.options.length) bad(a.id, 'ось с именем и вариантами', Object.keys(catalog[a.id] ?? {}).join(', '), 'имя, name, варианты')
    const first = Object.keys(a.options[0]?.роли ?? {}).sort().join()
    for (const o of a.options) {
      const style = `${a.id}/${o.id}`
      if (!o.имя || !o.name || !o.что || !o.роли) { bad(style, 'вариант: имя, name, что, роли', Object.keys(o).join(', '), 'имя, name, что, роли'); continue }
      if (Object.keys(o.роли).sort().join() !== first) bad(style, 'варианты оси объявляют одни и те же роли', Object.keys(o.роли).join(', '), first)
      for (const [k, v] of Object.entries(o.роли)) {
        if (!ROLES[k]) { bad(style, `роль ${k} кнопке основы неизвестна`, k, Object.keys(ROLES).join(', ')); continue }
        if (owner[k] && owner[k] !== a.id) bad(style, `роль ${k} объявляют две оси`, `${owner[k]}, ${a.id}`, 'одна ось на роль')
        owner[k] = a.id
        if (typeof v !== 'string' || /[;{}<>]/.test(v)) bad(style, `значение ${k}`, String(v), 'строка без ; { } < >')
      }
      const r = o.роли
      if ('--ctrl-btn-weight' in r && !TEXT.weights.includes(Number(r['--ctrl-btn-weight']))) bad(style, 'толщина букв из порогов', r['--ctrl-btn-weight'], TEXT.weights.join(', '))
      if ('--ctrl-btn-case' in r && !CASES.includes(r['--ctrl-btn-case'])) bad(style, 'регистр', r['--ctrl-btn-case'], CASES.join(', '))
      const trackText = r['--ctrl-btn-track']
      const track = trackText === 'normal' ? 0 : Number.parseFloat(trackText)
      if ('--ctrl-btn-track' in r && !(trackText === 'normal' || (/^\d*\.?\d+em$/.test(trackText) && track <= TEXT.trackMax))) bad(style, 'разрядка в коридоре', trackText, `normal или 0…${TEXT.trackMax}em`)
      if (r['--ctrl-btn-case'] === 'uppercase' && !(track >= CAPS_TRACK[0] && track <= CAPS_TRACK[1])) bad(style, 'заглавные с разрядкой набора', trackText, `${CAPS_TRACK[0]}…${CAPS_TRACK[1]}em: заглавные без воздуха слипаются`)
      for (const k of ['--ctrl-btn-tip', '--ctrl-btn-tip-at', '--ctrl-btn-notch']) if (k in r && !(Number(r[k]) >= 0 && Number(r[k]) <= 1.5)) bad(style, `${k}: доля высоты кнопки 0…1.5`, r[k], '0…1.5')
      if ('--ctrl-btn-tip' in r && Number(r['--ctrl-btn-tip-at']) > Number(r['--ctrl-btn-tip'])) bad(style, 'точка острия правее его начала', r['--ctrl-btn-tip-at'], `не больше ${r['--ctrl-btn-tip']}`)
      if ('--ctrl-btn-echo' in r && !['none', 'block'].includes(r['--ctrl-btn-echo'])) bad(style, 'эхо-шеврон — none или block', r['--ctrl-btn-echo'], 'none, block')
      for (const [fill, , edge, voice] of VOICES) {
        if (fill in r && r[fill] === 'transparent' && (r[edge] ?? 'transparent') === 'transparent') bad(style, `${voice}: без заливки и кромки кнопка не видна как орган`, 'transparent', 'заливка, вуаль или кромка')
      }
    }
  }
  if (!Object.keys(palettes).length || found.length) return found
  tokens ??= tokenMap()
  for (const a of axes) {
    for (const o of a.options) {
      const r = o.роли
      for (const [pName, set] of Object.entries(palettes)) {
        for (const theme of ['light', 'dark'].filter((t) => set[t])) {
          const { get, over } = painter(paletteRoles(set[theme], theme), tokens, theme)
          /* `part` и `floor` — то же, что `rule`, для машины; округление
             вниз: 2,996 при пороге 3 — «2.99», а не «3 при норме 3». */
          const want = (part, floor, rule, got, need) => { if (got < need) found.push({ style: `${a.id}/${o.id}`, axis: a.id, kind: 'palette', palette: pName, theme, part, floor, rule, got: Math.floor(got * 100) / 100, need }) }
          for (const [where, at, floorName] of [['страница', 'page', '--page'], ['карточка', 'card', '--plate']]) {
            const floor = get(floorName)
            for (const [fill, ink, edge, voice, part] of VOICES) {
              if (!(fill in r)) continue
              const bg = over(r[fill], floor)
              if (bg) want(`${part}-fill`, at, `${voice} видна на полу (${where})`, ratio(bg, floor), STATE.visible)
              const e = edge in r ? over(r[edge], floor) : null
              if (e) want(`${part}-edge`, at, `кромка: ${voice} (${where})`, ratio(e, floor), CONTRAST.control)
              if (ink in r) {
                const under = bg ?? floor
                const t = over(r[ink], under)
                if (t) want(`${part}-ink`, at, `надпись: ${voice} (${where})`, ratio(t, under), CONTRAST.text)
              }
            }
          }
        }
      }
    }
  }
  return found
}

/** Какие варианты сайт может носить и с какими наборами цвета: ошибка
 *  каталога — отказ целиком; вариант, не прошедший замер ни на одном наборе
 *  палитры сайта, не выпускается и называется (`off`); не прошедший на
 *  части наборов — выпускается, а пары «вариант × набор» названы первой
 *  находкой (`clash['ось/вариант'][набор]`). */
export function availability(catalog, palettes, tokens) {
  const found = auditButtons(catalog, palettes, tokens)
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
  const on = axesOf(catalog).flatMap((a) => a.options.map((o) => `${a.id}/${o.id}`)).filter((n) => !off[n] && !structure.some((f) => f.style === n))
  return { structure, off, on, clash }
}

/* ── выпуск ────────────────────────────────────────────────────────────── */

const block = (sel, roles) => `${sel}{\n${Object.entries(roles).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`
export function toCss(catalog, off = {}, clash = {}) {
  const axes = axesOf(catalog).map((a) => ({ ...a, options: a.options.filter((o) => !off[`${a.id}/${o.id}`]) }))
  const skipped = Object.keys(off)
  const pairs = Object.entries(clash).map(([n, by]) => `${n} — ${Object.keys(by).join(', ')}`)
  const root = Object.assign({}, ...axes.map((a) => a.options[0]?.роли ?? {}))
  return `/* Собран tools/buttons.mjs из styles/buttons.json. Руками не правят.\n` +
    `   Роли одной кнопки основы (styles/btn.module.css) по осям каталога. На\n` +
    `   корне — первый вариант каждой оси; другой — [data-button-<ось>="вариант"].\n` +
    `   Оси: ${axes.map((a) => `${a.id} — ${a.options.map((o) => o.id).join(' · ')}`).join('; ')}.` +
    (skipped.length ? `\n   Не выпущены — не прошли замер на палитре сайта: ${skipped.join(' · ')}.` : '') +
    (pairs.length ? `\n   Не носятся с частью наборов цвета (пару не примет сайт): ${pairs.join('; ')}.` : '') + ' */\n\n' +
    [block(':root', root), ...axes.flatMap((a) => a.options.map((o) => block(`[data-button-${a.id}="${o.id}"]`, o.роли)))].join('\n\n') + '\n'
}

/* ── команда ───────────────────────────────────────────────────────────── */

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const FROM = path.resolve('styles/buttons.json')
  const TO = path.resolve('styles/buttons.css')
  const PALETTE = path.resolve('styles/palette.json')
  if (!existsSync(FROM)) { console.error('✗ Нет styles/buttons.json — каталога кнопки нет.'); process.exit(1) }
  if (!existsSync(PALETTE)) { console.error('✗ Нет styles/palette.json — мерить кнопку не на чем.'); process.exit(1) }
  const catalog = JSON.parse(readFileSync(FROM, 'utf8'))
  /* Ошибка каталога называется раньше, чем понадобятся роли основы. */
  const broken = auditButtons(catalog, {})
  if (broken.length) {
    console.error(`✗ Каталог кнопок не выпущен: ошибка каталога. styles/buttons.css не тронут.`)
    for (const f of broken.slice(0, 12)) console.error(`    ${f.style}: ${f.rule} — ${f.got}; нужно ${f.need}`)
    process.exit(1)
  }
  const TOKENS = path.resolve('styles/tokens.css')
  if (!existsSync(TOKENS)) { console.error('✗ Нет styles/tokens.css — не видно, какой ступенью покрашены пол и кнопка.'); process.exit(1) }
  const tokens = tokenMap(readFileSync(TOKENS, 'utf8'))
  const palettes = JSON.parse(readFileSync(PALETTE, 'utf8'))
  const { structure, off, clash } = availability(catalog, palettes, tokens)
  const firstPalette = Object.keys(palettes)[0]
  const firsts = axesOf(catalog).map((a) => `${a.id}/${a.options[0].id}`)
  const firstOff = firsts.flatMap((n) => off[n] ?? (clash[n]?.[firstPalette] ? [clash[n][firstPalette]] : []))
  if (structure.length || firstOff.length) {
    const why = structure.length ? structure : firstOff
    const what = structure.length ? 'ошибка каталога' : `вариант по умолчанию не прошёл замер на наборе по умолчанию «${firstPalette}»`
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
  const css = toCss(catalog, off, clash)
  const count = axesOf(catalog).reduce((n, a) => n + a.options.length, 0) - Object.keys(off).length
  if (process.argv.includes('--check')) {
    const was = existsSync(TO) ? readFileSync(TO, 'utf8').replace(/\r\n/g, '\n') : ''
    if (was === css) { console.log(`Каталог кнопок в норме и не отстал: ${count} вариантов по ${axesOf(catalog).length} осям`); process.exit(0) }
    console.error('✗ styles/buttons.css отстал от styles/buttons.json. Выпустить: node tools/buttons.mjs')
    process.exit(1)
  }
  writeFileSync(TO, css)
  console.log(`Выпущено: styles/buttons.css · ${count} вариантов по ${axesOf(catalog).length} осям`)
}
