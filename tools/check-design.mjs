/**
 * Храповик по дизайну: механическая половина скилла impeccable, по файлам.
 *
 * Заведено 24.09.2026 словом заказчика (И271). Он посмотрел образцовую
 * витрину — «говно везде» — и сказал: «ты ж эти скилы ещё ранее должен был
 * использовать или всегда использовать, чтоб дизайн был хорошим». Проверки
 * набора меряли механику вёрстки — кегль из шкалы, роли ритма, швы, кадр с
 * потолком, — а композицию не требовало ничего, и `impeccable`, лежавший в
 * `.claude/skills/`, не звал никто.
 *
 * Порядок работы скиллами — правило в CLAUDE.md («Дизайн делается
 * дизайнерскими скиллами»); его напоминают хук на слова заказчика и брифинг
 * этапа. Здесь — то, что из impeccable видно по файлу: запреты и рефлексы
 * его справочников (`craft-floor.md`, `typeset.md`, `layout.md`) переписаны
 * семьями — как `check:seo` переписал СЕО-скиллы. Семьи, подписи и строки
 * источника — `tools/design-families.mjs`. Его собственный детектор меряет
 * отрисованную страницу и идёт отдельной проверкой — `check:detect` (И310):
 * браузерная сборка вендорена без запускателя и без сети.
 *
 * Читается два рода файлов, и связь между ними — главное: разметка
 * (`*.tsx`) говорит, ЧТО стоит внутри чего, стили — КАК оно одето. Модуль
 * стилей ищется по ввозу (`import s from './X.module.css'`), класс —
 * по `className={s.x}`; предок, давший заголовку размер правилом
 * `.pagehead h1`, — по дереву разметки. Вкус этим не меряется: зелёная
 * проверка значит «новых механических приёмов не завелось», а не «красиво».
 *
 * ХРАПОВИК, как `check:css`: база — `tools/design-baseline.json`, счёт по
 * семьям, расти ни одной нельзя.
 *
 *   node tools/check-design.mjs                проверить
 *   node tools/check-design.mjs --list [семья] показать находки
 *   node tools/check-design.mjs --update       записать текущие числа как базу
 *   node tools/check-design.mjs --json         счёт и находки данными
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative as nativeRelative, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMPONENT_DIRS, STYLE_DIRS, PAGES, TOKENS, LADDER, PRIMITIVES, EXEMPT, DESIGN_DOC } from './kit-config.mjs'
import { DESIGN_FAMILIES, DESIGN_LABELS as NAMES, DESIGN_SOURCES as SOURCES } from './design-families.mjs'
import { declarations } from './names.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASELINE = join(ROOT, 'tools/design-baseline.json')
const rel = (p) => nativeRelative(ROOT, p).split('\\').join('/')

/* ── что читается ──────────────────────────────────────────────────────────
   Сайт — узлы, страницы и стили из kit.config.json. В наборе своего сайта
   нет, зато есть образцовая витрина: её вид и есть то, что заказчик назвал
   плохим, и мерить набор без неё — мерить пустое место. */
const TEMPLATE = 'templates/storefront'
const KIT = existsSync(join(ROOT, 'templates/palette-starter.json')) && existsSync(join(ROOT, TEMPLATE, 'components'))
const codeDirs = [...new Set([...COMPONENT_DIRS, PAGES])]
const styleDirs = [...STYLE_DIRS]
if (KIT) for (const d of ['app', 'components', 'styles']) { codeDirs.push(`${TEMPLATE}/${d}`); styleDirs.push(`${TEMPLATE}/${d}`) }
/* Сама шкала объявляет роли, а не одевает узлы; панель и лист набора в
   магазин не едут. Шкалу при этом ЧИТАЕМ — из неё считаются размеры. */
const skipCss = new Set(EXEMPT.filter((f) => f !== TOKENS && f !== LADDER).map((f) => join(ROOT, f)))

const walk = (dir, test, out = []) => {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) { if (name !== 'node_modules' && !name.startsWith('.')) walk(path, test, out); continue }
    if (test(name)) out.push(path)
  }
  return out
}
const tsxFiles = [...new Set(codeDirs.flatMap((d) => walk(join(ROOT, d), (n) => /\.(tsx|jsx)$/.test(n) && !/\.test\./.test(n))))]
const cssFiles = [...new Set(styleDirs.flatMap((d) => walk(join(ROOT, d), (n) => n.endsWith('.css'))))].filter((f) => !skipCss.has(f))

if (!tsxFiles.length && !cssFiles.length) {
  console.log(`· дизайн по детектору: проверять пока нечего — нет ни ${[...new Set([...codeDirs, ...styleDirs])].join(', ни ')}`)
  process.exit(0)
}

const found = Object.fromEntries(DESIGN_FAMILIES.map((k) => [k, []]))
const add = (fam, where, what) => { if (!found[fam].some((x) => x.startsWith(`${where} `))) found[fam].push(`${where}  ${what}`) }

/* Комментарий — не код: длина и переносы сохраняются, номера строк те же. */
const stripCss = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
const stripTs = (t) => stripCss(t).replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length))
const lineAt = (text, i) => text.slice(0, i).split('\n').length

/* ── стили: правила, селекторы, размеры ────────────────────────────────── */

/** Разрез по запятым верхнего уровня: `:is(h1, h2)` — одна часть. */
const splitTop = (s, sep = ',') => {
  const out = []
  let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}
/** Звенья селектора: `.a > .b h2` → ['.a', '.b', 'h2']. */
const compounds = (sel) => {
  const out = []
  let depth = 0, cur = ''
  for (const ch of sel) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (depth === 0 && /[\s>+~]/.test(ch)) { if (cur) out.push(cur); cur = ''; continue }
    cur += ch
  }
  if (cur) out.push(cur)
  return out
}
const classesOf = (compound) => [...compound.replace(/:(not|has)\([^)]*\)/g, '').matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1])
/** Элементы звена: `h2`, `:where(h2)`, `:is(h1,h2)`. */
const elementsOf = (compound) => {
  const bare = compound.match(/^([a-z][a-z0-9]*)/)?.[1]
  const wrapped = [...compound.matchAll(/:(?:where|is)\(([^)]*)\)/g)].flatMap((m) => splitTop(m[1]).map((x) => x.match(/^([a-z][a-z0-9]*)$/)?.[1]).filter(Boolean))
  return [...new Set([bare, ...wrapped].filter(Boolean))]
}

const css = new Map()
for (const file of cssFiles) {
  const text = stripCss(readFileSync(file, 'utf8'))
  const rules = []
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const head = m[1].trim()
    if (!head || head.startsWith('@') || /^(from|to|\d)/.test(head)) continue
    const decl = new Map()
    for (const d of m[2].split(';')) {
      const at = d.indexOf(':')
      if (at > 0) decl.set(d.slice(0, at).trim().toLowerCase(), d.slice(at + 1).trim())
    }
    const lead = m[1].length - m[1].trimStart().length
    const line = lineAt(text, m.index + lead)
    for (const sel of splitTop(head)) rules.push({ sel, parts: compounds(sel), decl, line })
  }
  css.set(file, { text, rules, module: file.endsWith('.module.css') })
}

/* Значения ролей — из шкалы и токенов: первое объявление имени, то есть
   корень и набор по умолчанию. */
const VARS = new Map()
for (const f of [LADDER, TOKENS].filter(Boolean)) {
  const path = join(ROOT, f)
  if (existsSync(path)) for (const [k, v] of declarations(stripCss(readFileSync(path, 'utf8')))) if (!VARS.has(k)) VARS.set(k, v.value)
}
const toPx = (t) => {
  const m = String(t).trim().match(/^(-?[\d.]+)(px|rem)?$/)
  if (!m) return null
  return m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])
}
/** Пределы величины в пикселях: `clamp(a, …, c)` → [a, c]; имя — через шкалу. */
const range = (value, seen = new Set()) => {
  const v = String(value ?? '').trim()
  const ref = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/)
  if (ref) {
    if (VARS.has(ref[1]) && !seen.has(ref[1])) return range(VARS.get(ref[1]), new Set([...seen, ref[1]]))
    return ref[2] ? range(ref[2], seen) : null
  }
  const clamp = v.match(/^clamp\(([\s\S]+)\)$/)
  if (clamp) {
    const [lo, , hi] = splitTop(clamp[1])
    const a = range(lo, seen), b = range(hi, seen)
    return a && b ? [a[0], b[1]] : null
  }
  const px = toPx(v)
  return px === null ? null : [px, px]
}
/** Уровень, которому принадлежит роль размера: --h2-size → 2. */
const levelOfRole = (value) => {
  const roles = [...String(value).matchAll(/--(hero|pagehead|h[1-6])-size\b|--(?:ctrl-)?fs-(h[1-6])\b/g)].map((m) => m[1] ?? m[2])
  const role = roles.at(-1)
  if (!role) return null
  return { role: `--${roles.at(-1)}`, level: /^h(\d)/.test(role) ? Number(role[1]) : 1 }
}
const sizeOf = (decl) => {
  if (decl.has('font-size')) return decl.get('font-size')
  const font = decl.get('font')
  if (!font || /^(inherit|initial|unset)$/.test(font)) return null
  return font.match(/var\([^()]*(?:\([^()]*\))?[^()]*\)|clamp\([^)]*\)|[\d.]+(?:px|rem)/)?.[0] ?? null
}
const hiddenRule = (decl) => /inset\(50%\)/.test(decl.get('clip-path') ?? '') || /rect\(/.test(decl.get('clip') ?? '')

/** Правила, одевающие класс: класс стоит в ПОСЛЕДНЕМ звене селектора. */
const ownRules = (file, cls) => (css.get(file)?.rules ?? []).filter((r) => classesOf(r.parts.at(-1)).includes(cls))
const globalFiles = [...css.entries()].filter(([, v]) => !v.module).map(([f]) => f)

/* ── разметка: дерево элементов ─────────────────────────────────────────── */

const PRIM = PRIMITIVES ? join(ROOT, PRIMITIVES) : null
/** `@/x` — от корня сайта: у витрины в наборе это папка шаблона, а общие
 *  стили основы лежат у набора (ставщик кладёт их рядом). */
const resolveCss = (from, spec) => {
  const site = rel(from).startsWith(`${TEMPLATE}/`) ? join(ROOT, TEMPLATE) : ROOT
  const tries = spec.startsWith('@/') ? [join(site, spec.slice(2)), join(ROOT, spec.slice(2))]
    : spec.startsWith('.') ? [join(dirname(from), spec)] : []
  return tries.find((p) => css.has(p) || existsSync(p)) ?? null
}

/** Разбор разметки без разборщика: открывающие и закрывающие теги со
 *  стеком родителей. `<` принимается за тег, только если перед ним не
 *  имя и не скобка — так `Array<string>` и `a < b` тегами не становятся. */
function elements(src) {
  const out = []
  const stack = []
  let i = 0
  while ((i = src.indexOf('<', i)) !== -1) {
    if (src[i + 1] === '/') {
      const close = src.slice(i).match(/^<\/\s*([A-Za-z][\w.]*)?\s*>/)
      if (close) {
        const name = close[1] ?? ''
        const at = stack.map((e) => e.tag).lastIndexOf(name)
        if (at !== -1) stack.length = at
        i += close[0].length
        continue
      }
      i++; continue
    }
    const lead = src.slice(Math.max(0, i - 40), i).trimEnd()
    const before = lead.at(-1) ?? ''
    const name = src.slice(i).match(/^<([A-Za-z][\w.]*)?(?=[\s/>])/)
    /* `return <p>` — тег после слова-оператора, а не сравнение и не тип */
    const keyword = /(^|[^\w$])(return|yield|await|default|case|else)$/.test(lead)
    if (!name || (/[\w$)\]]/.test(before) && !keyword)) { i++; continue }
    /* атрибуты до `>` верхнего уровня: выражения в фигурных скобках
       могут нести и `>`, и целые элементы */
    let j = i + name[0].length, depth = 0, quote = null
    for (; j < src.length; j++) {
      const ch = src[j]
      if (quote) { if (ch === quote) quote = null; continue }
      if (depth === 0 && (ch === '"' || ch === "'")) { quote = ch; continue }
      if (ch === '{') depth++
      else if (ch === '}') depth--
      else if (ch === '>' && depth === 0) break
    }
    const attrs = src.slice(i + name[0].length, j)
    const selfClose = attrs.trimEnd().endsWith('/')
    const el = { tag: name[1] ?? '', attrs, line: lineAt(src, i), start: i, parent: stack.at(-1) ?? null }
    out.push(el)
    if (!selfClose) stack.push(el)
    i = j + 1
  }
  return out
}

const views = []
for (const file of tsxFiles) {
  const src = stripTs(readFileSync(file, 'utf8'))
  const mods = new Map()
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+\.module\.css)['"]/g)) {
    const path = resolveCss(file, m[2])
    if (path) mods.set(m[1], path)
  }
  /* `const H = level === 1 ? 'h1' : 'h2'` — заголовок под именем. */
  const aliases = new Map()
  for (const m of src.matchAll(/const\s+([A-Z]\w*)\s*=\s*([^\n;]+)/g)) {
    const lv = [...m[2].matchAll(/['"]h([1-6])['"]/g)].map((x) => Number(x[1]))
    if (lv.length && !/[<(]/.test(m[2].replace(/['"]h[1-6]['"]/g, ''))) aliases.set(m[1], lv)
  }
  const els = elements(src)
  for (const el of els) {
    const cn = el.attrs.match(/className\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"[^"]*"|'[^']*')/)?.[1] ?? ''
    el.classes = [
      ...[...cn.matchAll(/(\w+)\.([A-Za-z_]\w*)/g)].filter((m) => mods.has(m[1])).map((m) => ({ file: mods.get(m[1]), name: m[2] })),
      ...[...cn.matchAll(/(\w+)\[['"]([\w-]+)['"]\]/g)].filter((m) => mods.has(m[1])).map((m) => ({ file: mods.get(m[1]), name: m[2] })),
      ...(/^["']/.test(cn) ? cn.slice(1, -1).split(/\s+/).filter(Boolean).map((name) => ({ file: null, name })) : []),
    ]
    el.levels = /^h[1-6]$/.test(el.tag) ? [Number(el.tag[1])] : aliases.get(el.tag) ?? null
  }
  views.push({ file, src, els })
}
const rulesFor = (c) => (c.file ? ownRules(c.file, c.name) : globalFiles.flatMap((f) => ownRules(f, c.name)))
const ancestors = (el) => { const out = []; for (let p = el.parent; p; p = p.parent) out.push(p); return out }
const where = (view, el) => `${rel(view.file)}:${el.line}`

/* ── семьи по разметке ─────────────────────────────────────────────────── */

for (const view of views) {
  const { els } = view
  const siblings = (el) => els.filter((e) => e.parent === el.parent)

  for (const el of els) {
    /* eyebrow — надпись прямо над заголовком (craft-floor.md:27). */
    const kicker = el.classes.find((c) => /eyebrow|kicker|overline|pretitle|supertitle/i.test(c.name))
    if (kicker) {
      const sib = siblings(el)
      const next = sib[sib.indexOf(el) + 1]
      if (next?.levels) add('eyebrow', where(view, el), `«${kicker.name}» над <h${next.levels[0]}>`)
    }

    /* bareHeading · headRole — чем одет заголовок: свой класс, правило
       предка `.x h2`, правило основания на самом h2. */
    if (el.levels) {
      const own = el.classes.flatMap(rulesFor)
      if (own.some((r) => hiddenRule(r.decl))) continue
      for (const level of el.levels) {
        let size = own.map((r) => sizeOf(r.decl)).find(Boolean) ?? null
        if (!size) {
          for (const anc of ancestors(el)) {
            for (const c of anc.classes) {
              const files = c.file ? [c.file] : globalFiles
              for (const f of files) {
                const hit = (css.get(f)?.rules ?? []).find((r) => r.parts.length > 1
                  && elementsOf(r.parts.at(-1)).includes(`h${level}`) && !classesOf(r.parts.at(-1)).length
                  && r.parts.slice(0, -1).some((p) => classesOf(p).includes(c.name)) && sizeOf(r.decl))
                if (hit) { size = sizeOf(hit.decl); break }
              }
              if (size) break
            }
            if (size) break
          }
        }
        if (!size) {
          for (const f of globalFiles) {
            const hit = css.get(f).rules.find((r) => r.parts.length === 1 && elementsOf(r.parts[0]).includes(`h${level}`)
              && !classesOf(r.parts[0]).length && sizeOf(r.decl))
            if (hit) { size = sizeOf(hit.decl); break }
          }
        }
        const tag = el.tag === `h${level}` ? `<h${level}>` : `<${el.tag}> (h${level})`
        if (!size) { add('bareHeading', where(view, el), `${tag} без роли размера — браузер ставит свой`); continue }
        const role = levelOfRole(size)
        if (role && role.level !== level) add('headRole', `${where(view, el)}:h${level}`, `${tag} набран ролью ${role.role} (уровень ${role.level})`)
      }
    }

    /* navSmall — ссылки навигации мельче тела (typeset.md:46). Крошки —
       не меню: у них своя роль, и мельче тела они по делу. */
    if (el.tag === 'nav' && !/crumb/i.test(`${basename(view.file)} ${el.attrs}`)) {
      const inside = els.filter((e) => e === el || ancestors(e).includes(el))
      const refs = inside.flatMap((e) => e.classes)
      const links = inside.filter((e) => /^(a|Link)$/.test(e.tag))
      const linkClasses = new Set(links.flatMap((e) => e.classes.map((c) => c.name)))
      /* Правило с отметкой (`[data-around='quiet']`) метит только ту ссылку,
         что отметку несёт: «куда ведёт» набора (`go`) с плашкой — орган, а
         голая стрелка листания в `nav` набрана кеглем строки. Без этого
         стрелка страниц каталога числилась мелким меню по правилу плашки,
         которого у неё нет. */
      const carried = (sel) => {
        const marks = [...sel.matchAll(/\[([\w-]+)=['"]?([\w-]+)['"]?\]/g)]
        return !marks.length || links.some((l) => marks.some((m) => new RegExp(m[1] + '=[{"\'`\\s]*' + m[2] + '\\b').test(l.attrs)))
      }
      for (const file of new Set(refs.map((c) => c.file).filter(Boolean))) {
        const names = new Set(refs.filter((c) => c.file === file).map((c) => c.name))
        for (const r of css.get(file)?.rules ?? []) {
          const last = r.parts.at(-1)
          const aimsLink = (elementsOf(last).includes('a') || classesOf(last).some((c) => linkClasses.has(c))) && carried(last)
          if (!aimsLink || !r.parts.some((p) => classesOf(p).some((c) => names.has(c)))) continue
          const size = sizeOf(r.decl)
          const px = size && range(size)
          if (px && px[1] < 16) add('navSmall', `${rel(file)}:${r.line}`, `${r.sel} — ${size} (до ${+px[1].toFixed(1)}px) мельче тела`)
        }
      }
    }
  }

  /* flatRhythm — между пунктами не больше воздуха, чем внутри пункта
     (layout.md:20). Шаг «между детьми» — ручка примитива (`--stack`,
     `--grid-gap`, `--cluster`) или свой `gap` / `row-gap`. */
  const primName = (el, name) => el.classes.some((c) => c.name === name && c.file === PRIM)
  const knob = (el, name) => el.classes.filter((c) => c.file !== PRIM).flatMap(rulesFor).map((r) => r.decl.get(name)).find(Boolean)
    ?? el.classes.filter((c) => c.file === PRIM).flatMap(rulesFor).map((r) => r.decl.get(name)).find(Boolean)
  /* Меряется шаг ПО ВЕРТИКАЛИ — тот, что отделяет строки и группы друг от
     друга. Ряд вбок (`cluster`, строковый flex) разводит соседей в строке:
     его зазор с вертикальным ритмом не сравнивают. */
  const step = (el) => {
    if (primName(el, 'stack')) return knob(el, '--stack') ?? 'var(--air-block)'
    if (primName(el, 'grid')) return knob(el, '--grid-gap') ?? 'var(--gap-grid)'
    if (primName(el, 'cluster') || primName(el, 'switcher')) return null
    const own = el.classes.flatMap(rulesFor).filter((r) => r.parts.length === 1)
    const has = (prop, rx) => own.some((r) => rx.test(r.decl.get(prop) ?? ''))
    const rowGap = own.map((r) => r.decl.get('row-gap')).find(Boolean)
    if (rowGap) return rowGap
    const vertical = has('display', /grid/) || has('flex-direction', /column/) || has('flex-flow', /column/)
    const gap = own.map((r) => r.decl.get('gap')).find(Boolean)
    return vertical && gap ? splitTop(gap, ' ')[0] : null
  }
  for (const el of els) {
    const outer = step(el)
    if (!outer) continue
    const po = range(outer)
    if (!po) continue
    for (const child of els.filter((e) => e.parent === el)) {
      const inner = step(child)
      const pi = inner && range(inner)
      if (pi && po[0] <= pi[0] && po[1] <= pi[1]) {
        add('flatRhythm', where(view, child), `между пунктами ${outer}, внутри пункта ${inner} — группа не отделена`)
      }
    }
  }

  /* iconCards — список карточек «значок + заголовок + текст»
     (craft-floor.md:25). */
  for (const m of view.src.matchAll(/\.map\(\s*(?:\([^)]*\)|\w+)\s*=>\s*\(?\s*</g)) {
    const start = m.index + m[0].length - 1
    const root = els.find((e) => e.start === start)
    if (!root) continue
    const inside = els.filter((e) => e === root || ancestors(e).includes(root))
    const icon = inside.findIndex((e) => /^(Icon|svg)$/.test(e.tag))
    const head = inside.findIndex((e) => e.levels)
    const text = inside.findIndex((e, k) => k > head && e.tag === 'p')
    if (icon !== -1 && head > icon && text > head) add('iconCards', where(view, root), 'по списку: значок, заголовок, текст — одинаковые карточки как устройство раздела')
  }

  /* glyphIcon — символ вместо знака (craft-floor.md:40). */
  const GLYPH = /^[\p{Extended_Pictographic}\u2190-\u21FF\u2713-\u2718\u00D7\u2605\u2606\u2630\u25B2-\u25BC\u276F\u2039\u203A\u00AB\u00BB]{1,3}$/u
  for (const m of view.src.matchAll(/>\s*([^\s<>{}][^<>{}]{0,5}?)\s*<|\{\s*['"]([^'"]{1,6})['"]\s*\}/g)) {
    const text = (m[1] ?? m[2]).trim()
    if (GLYPH.test(text)) add('glyphIcon', `${rel(view.file)}:${lineAt(view.src, m.index)}`, `«${text}» вместо знака из листа`)
  }
}

/* ── семьи по стилям ────────────────────────────────────────────────────── */

/** Тени по слоям: `x y blur [spread] цвет`, `inset` отдельно. */
const shadows = (value) => splitTop(value).map((layer) => {
  const inset = /\binset\b/.test(layer)
  const lens = [...layer.replace(/\binset\b/, '').matchAll(/var\([^()]*(?:\([^()]*\))?[^()]*\)|-?[\d.]+(?:px|rem|em)?(?=\s|$)/g)].map((m) => m[0])
  return { inset, lens: lens.slice(0, 3).map((t) => (t.startsWith('var(') ? range(t) : [toPx(t) ?? NaN, toPx(t) ?? NaN])) }
})

let surfaces = { selection: false, caret: false, underline: false, focus: false, scrollbar: false, numerals: false }
let stripped = null, restored = false
for (const [file, sheet] of css) {
  for (const r of sheet.rules) {
    const at = `${rel(file)}:${r.line}`
    const last = r.parts.at(-1)
    for (const [prop, value] of r.decl) {
      if (prop.endsWith('background-clip') && /\btext\b/.test(value)) add('gradientText', at, `${r.sel} — ${prop}: ${value}`)
      /* «Glass and blur as decoration rather than as a specific effect»: особый
         эффект — стекло главной (И427), порог формы `--frost-blur`, умноженный
         на выключатель варианта (0 по умолчанию, 1 — выбран в панели). Иное
         размытие — украшение. */
      if (/^(-webkit-)?backdrop-filter$/.test(prop) && /blur\(/.test(value) && !/^blur\(calc\(var\(--frost-blur\) \* var\(--[\w-]+\)\)\)/.test(value)) add('glassBlur', at, `${r.sel} — ${prop}: ${value}`)
      if (/^border-(left|right|inline-start|inline-end)(-width)?$/.test(prop)) {
        const widths = [...value.matchAll(/var\([^()]*\)|-?[\d.]+px/g)].map((m) => range(m[0])).filter(Boolean)
        if (widths.some((w) => w[1] > 1)) add('sideStripe', at, `${r.sel} — ${prop}: ${value}`)
      }
      if (prop === 'box-shadow' || prop.startsWith('--sh-')) {
        for (const s of shadows(value)) {
          if (s.inset || s.lens.length < 3 || s.lens.some((l) => !l || Number.isNaN(l[0]))) continue
          const [x, y, blur] = s.lens
          if (blur[1] === 0 && Math.max(Math.abs(x[1]), Math.abs(y[1])) >= 2) add('hardShadow', at, `${r.sel} — ${prop}: ${value}`)
          if (x[1] === 0 && y[1] === 0 && blur[0] >= 4) add('glowHalo', at, `${r.sel} — ${prop}: ${value}`)
        }
      }
      if (prop === 'letter-spacing' || /^--[\w-]+-track$/.test(prop)) {
        const em = value.match(/^(-?[\d.]+)em$/)
        if (em && Number(em[1]) < -0.04) add('trackTight', at, `${r.sel} — ${prop}: ${value}`)
      }
      if (prop === 'font-family' && /monospace|ui-monospace|menlo|consolas|courier/i.test(value)
        && !/code|pre|kbd|samp|mono|data|num|tabular|sku|batch/i.test(r.sel)) add('monoCostume', at, `${r.sel} — ${value}`)
      if (/::selection/.test(r.sel)) surfaces.selection = true
      if (prop === 'caret-color') surfaces.caret = true
      if (prop === 'text-underline-offset') surfaces.underline = true
      if (/:focus-visible/.test(r.sel) && prop.startsWith('outline')) surfaces.focus = true
      if (/^scrollbar-(color|width)$/.test(prop) || /::-webkit-scrollbar/.test(r.sel)) surfaces.scrollbar = true
      if (prop === 'font-variant-numeric' && /tabular-nums/.test(value)) surfaces.numerals = true
    }
    /* proseLink: подчёркивание снято со всех ссылок — и возвращено ли в тексте. */
    if (elementsOf(last).includes('a')) {
      const deco = r.decl.get('text-decoration-line') ?? r.decl.get('text-decoration') ?? ''
      if (r.parts.length === 1 && !classesOf(last).length && /\bnone\b/.test(deco)) stripped ??= at
      /* возвращено там, где ссылка стоит в тексте: `p a`, `:where(p, li) a`, `.prose a` */
      const context = r.parts.slice(0, -1).join(' ')
      if (/underline/.test(deco) && (/\.prose\b/.test(context) || /(^|[\s(,])(p|li|dd|blockquote|figcaption)(?=$|[\s),.:[])/.test(context))) restored = true
    }
  }
}
if (cssFiles.length) {
  const NAMES_SURF = { selection: '::selection', caret: 'caret-color', underline: 'text-underline-offset', focus: ':focus-visible с outline', scrollbar: 'scrollbar-color / scrollbar-width', numerals: 'font-variant-numeric: tabular-nums' }
  for (const [k, ok] of Object.entries(surfaces)) if (!ok) add('browserSurface', `стили:${k}`, `нет ${NAMES_SURF[k]} — браузер рисует своё`)
  if (stripped && !restored) add('proseLink', stripped, 'a { text-decoration: none } — и в абзаце, пункте, определении подчёркивание не возвращено')
}

/* ── DESIGN.md: вид описан ролями, а не числами (И300) ─────────────────────
 *
 * Шаг 1 порядка дизайна (CLAUDE.md) читает `DESIGN.md` — как устроен вид.
 * Формат Google Labs разрешает файл без шапки («The frontmatter is
 * optional»), и у набора шапки нет нарочно: краски выпускает строитель
 * палитры, размер и ритм — строитель шкал, и число в описании было бы
 * второй правдой рядом с ними (CLAUDE.md, «Делается только правильно»:
 * краска → строитель палитры → роль). Поэтому две семьи:
 *
 *   docValue — число вида в описании: #код, rgb()/oklch()…, px, rem, ms;
 *   docDead  — названная роль `--имя`, которой не объявляет ни один файл
 *              стилей (`--имя-*` — ни одна с такой приставкой): описание
 *              разошлось с системой («truth drift», impeccable doctor.md).
 *
 * У набора файл лежит в образцовой витрине; у сайта — `designDoc` в
 * kit.config.json (по умолчанию `DESIGN.md` в корне). Нет файла — нечего
 * мерить: наличие спрашивают ворота этапа 2 (tools/stages.mjs). */
const DOC = KIT ? `${TEMPLATE}/DESIGN.md` : DESIGN_DOC
const docPath = DOC ? join(ROOT, DOC) : null
let docLines = 0
if (docPath && existsSync(docPath)) {
  const declared = new Set()
  for (const { text } of css.values()) for (const m of text.matchAll(/(?:^|[;{\s])(--[a-z][\w-]*)\s*:/g)) declared.add(m[1])
  const VALUE = /#[0-9a-f]{3,8}\b|(?<![\w.-])\d+(?:\.\d+)?(?:px|rem|em|ms|s|vw|vh|svh|dvh|cqi)\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/gi
  const lines = readFileSync(docPath, 'utf8').split('\n')
  docLines = lines.length
  lines.forEach((line, i) => {
    const at = `${rel(docPath)}:${i + 1}`
    for (const m of line.matchAll(VALUE)) add('docValue', `${at} ${m[0]}`, `«${m[0]}» — число вида в описании: называется роль, число выпускает строитель`)
    for (const m of line.matchAll(/(?<![\w-])(--[a-z][a-z0-9]*(?:-[a-z0-9]+)*)(-\*)?/g)) {
      const [, name, wild] = m
      const alive = wild ? [...declared].some((d) => d.startsWith(`${name}-`)) : declared.has(name)
      if (!alive) add('docDead', `${at} ${name}${wild ?? ''}`, `${name}${wild ?? ''} — такой роли не объявляет ни один файл стилей`)
    }
  })
}

/* ── вердикт ───────────────────────────────────────────────────────────── */

const counts = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.length]))
const total = Object.values(counts).reduce((a, b) => a + b, 0)
const scope = `${tsxFiles.length} файлов разметки, ${cssFiles.length} стилей${docLines ? `, ${DOC}` : ''}${KIT ? ` (набор: основа и ${TEMPLATE})` : ''}`

/* `--json` — счёт и находки данными: им проверяют саму проверку. */
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ counts, found }))
  process.exit(0)
}

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n')
  console.log(`База обновлена: ${total} находок — ${scope}`)
  process.exit(0)
}

const li = process.argv.indexOf('--list')
if (li !== -1) {
  const pick = process.argv[li + 1]
  const fams = found[pick] ? [pick] : DESIGN_FAMILIES
  for (const k of fams) {
    console.log(`\n${k} — ${NAMES[k]} — ${found[k].length}\n    источник: impeccable, ${SOURCES[k]}`)
    for (const line of found[k]) console.log(`    ${line}`)
  }
  console.log(`\n· ${total} находок — ${scope}`)
  process.exit(0)
}

let base
try {
  base = JSON.parse(readFileSync(BASELINE, 'utf8'))
} catch {
  console.error(`Нет ${rel(BASELINE)}. Создать: npm run check:design -- --update`)
  process.exit(1)
}

let failed = false
for (const key of DESIGN_FAMILIES) {
  const now = counts[key], was = base[key] ?? 0
  if (now > was) {
    failed = true
    console.error(`\n✗ ${key} — ${NAMES[key]}: было ${was}, стало ${now}\n    источник: impeccable, ${SOURCES[key]}`)
    for (const line of found[key].slice(-(now - was) * 3)) console.error(`    ${line}`)
  } else if (now < was) {
    console.log(`✓ ${key}: ${was} → ${now}`)
  } else if (now) {
    console.log(`· ${key}: ${now}`)
  }
}

if (failed) {
  console.error('\nНаходок стало больше. Чинить — дизайнерскими скиллами по порядку (CLAUDE.md,')
  console.error('«Дизайн делается дизайнерскими скиллами»); осознанное исключение — базой:')
  console.error('npm run check:design -- --update, с причиной в коммите.')
  process.exit(1)
}

const wasTotal = Object.values(base).reduce((a, b) => a + b, 0)
console.log(`· дизайн по детектору: ${total} находок — ${scope}`)
if (total < wasTotal) console.log(`\nДолг сократился: ${wasTotal} → ${total}. Обновите базу: npm run check:design -- --update`)
