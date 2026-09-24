/* Снять панель вида — в магазине, построенном из шаблона, когда вид выбран
   (PANEL.md, шаги 5 и 6, «Шаблон и магазин»).

   Панель физически отделена от сайта (CLAUDE.md, «Панель настройки
   физически отделена от сайта»): всё её — папка look-panel/; в сайт она
   входит двумя местами с меткой `look-panel` — адрес app/look-panel/ и
   строка подключения в components/Shell.tsx. Снять — значит удалить папку,
   адрес и строку, свои команды в package.json, флаг LOOK_PICKER, черновик
   вида и шрифты, которых опубликованный вид не носит, варианты шапки,
   карточки товара и главной, кроме выбранных (метки `look-header:`,
   `look-card:` и `look-home:` в коде; lib/headers.ts, lib/cards.ts,
   lib/homes.ts), — и выпустить стили из
   опубликованного вида (scripts/look-slots.mjs). Вид сайта от этого не
   меняется: он — значения в источнике данных.

   Где снимать нельзя — вовсе, без ключа, который бы это разрешил: в шаблоне
   набора (templates/storefront) и в витрине шаблона — установке
   `install.mjs --storefront`, где заказчик настраивает сам шаблон. Можно —
   только в магазине: `install.mjs --storefront --shop`. Роль записана
   ставщиком в .site-kit-install.json; нет записи — нет снятия.

     npm run look:remove           показать, что уйдёт; ничего не удаляет
     npm run look:remove -- --yes  снять: сначала копия всего удаляемого в
                                   соседнюю папку <сайт>.look-backup-<время>/
                                   (и метка git, если сайт в git), затем снятие
     npm run check:look            доказать на копии рядом: без панели сайт
                                   собирается, вид тот же, чужих вариантов в
                                   отгружаемых стилях нет, упоминаний панели нет
   Вернуть панель со всеми вариантами — из набора: node install.mjs --look-panel <сайт>. */
import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, lstatSync, mkdirSync, copyFileSync, linkSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

export const TAG = 'look-panel'
/** Всё, что принадлежит панели целиком. */
export const OWNED = ['look-panel', 'app/look-panel']
/** Где искать метки и упоминания: код и настройки сайта (не документы). */
const CODE = ['app', 'components', 'lib', 'styles', 'scripts', 'public', 'tests']
const ROOT_FILES = ['package.json', 'next.config.ts', 'proxy.ts', 'tsconfig.json', 'kit.config.json', '.env', '.env.local', '.env.example', '.gitignore']
/** Следы панели, которых после снятия быть не должно. */
export const TRACES = [TAG, 'LOOK_PICKER', 'look:remove', 'check:look', 'check:choice', 'look-header', 'look-card', 'look-home']

/** Код без панели: строки с меткой и блоки `look-panel:start … end`. */
export function stripPanel(text) {
  return text
    .replace(/[ \t]*\/\*\s*look-panel:start[\s\S]*?look-panel:end\s*\*\/[ \t]*\r?\n?/g, '')
    .split('\n').filter((line) => !line.includes(TAG)).join('\n')
}

/** Разметка-варианты: метка в коде и список вариантов. */
export const VARIANTS = [
  { tag: 'look-header', field: 'header', list: 'lib/headers.ts', name: 'HEADERS' },
  { tag: 'look-card', field: 'card', list: 'lib/cards.ts', name: 'CARDS' },
  { tag: 'look-home', field: 'home', list: 'lib/homes.ts', name: 'HOMES' },
]
/** Как вариант разметки называется в плане снятия — словами для заказчика. */
const WHAT = { header: 'варианты шапки', card: 'варианты карточки товара', home: 'варианты главной' }

/** Код с одним вариантом разметки: блоки и строки `<метка>:<варианты>`
 *  остальных удалены, у выбранного сняты сами метки; строки `<метка>:*`
 *  (объяснение меток) удаляются всегда. */
export function stripVariants(text, tag, chosen) {
  const keep = (ids) => ids.split(',').includes(chosen)
  const block = new RegExp(String.raw`^[ \t]*\/\* ${tag}:([a-z,]+):start \*\/\r?\n([\s\S]*?)^[ \t]*\/\* ${tag}:\1:end \*\/\r?\n`, 'gm')
  const out = text.replace(block, (_, ids, inner) => (keep(ids) ? inner : ''))
  return out.split('\n').flatMap((line) => {
    if (line.includes(`${tag}:*`)) return []
    const m = line.match(new RegExp(`${tag}:([a-z,]+)`))
    if (!m) return [line]
    if (!keep(m[1])) return []
    return [line.replace(new RegExp(String.raw`\s*(\/\/|\/\*)\s*${tag}:[a-z,]+(\s*\*\/)?`), '')]
  }).join('\n')
}
export const stripHeaders = (text, chosen) => stripVariants(text, 'look-header', chosen)

const walk = (dir, visit) => {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue
    const at = join(dir, name)
    if (statSync(at).isDirectory()) walk(at, visit)
    else visit(at)
  }
}
const listOf = (root, v) => [...(readFileSync(join(root, v.list), 'utf8').match(new RegExp(String.raw`${v.name} = \[([\s\S]*?)\]`))?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
/** Выбранный вариант разметки: из опубликованного вида; незнакомый или
 *  не записанный (вид старше поля) — первый. */
const chosenOf = (root, look, v) => (listOf(root, v).includes(look[v.field]) ? look[v.field] : listOf(root, v)[0])
const PUBLISHED = 'lib/source/sample/look.json'
const DRAFT = 'lib/source/sample/look.draft.json'
const published = (root) => JSON.parse(readFileSync(join(root, PUBLISHED), 'utf8'))

/* ── где снимать можно ───────────────────────────────────────────────── */

/** Запись ставщика: какая это установка. */
export const RECORD = '.site-kit-install.json'
/** Роль установки из записи ставщика: 'shop' — магазин из шаблона,
 *  'showcase' — витрина шаблона; null — записи нет или роли в ней нет. */
export function roleOf(root) {
  try { return JSON.parse(readFileSync(join(root, RECORD), 'utf8')).role ?? null } catch { return null }
}
/** Почему здесь панель не снимается; null — снимается (это магазин).
 *  Отказ твёрдый: ключа, который бы его перебил, нет. */
export function refusal(root) {
  const kit = resolve(root, '../..')
  if (existsSync(join(kit, 'install.mjs')) && resolve(kit, 'templates/storefront') === resolve(root)) {
    return 'это шаблон витрины в наборе (templates/storefront). Шаблону панель нужна всегда — из него строят все витрины.'
  }
  const role = roleOf(root)
  if (role === 'shop') return null
  if (role === 'showcase') {
    return 'это витрина шаблона (поставлена `install.mjs --storefront`): на ней настраивается сам шаблон, и панель в ней остаётся.'
  }
  return `у сайта нет записи ставщика о роли (${RECORD}, поле role) — неизвестно, магазин ли это; без неё панель не снимается.`
}
const HOW = 'Снимать панель можно только в магазине, построенном из шаблона: node install.mjs --storefront --shop <папка магазина>.'

/* ── что уйдёт ───────────────────────────────────────────────────────── */

const inOwned = (rel) => OWNED.some((p) => rel === p || rel.startsWith(`${p}/`))
/** Что снятие удалит и перепишет — посчитано, ничего не тронуто. */
export function plan(root) {
  const look = published(root)
  const chosen = Object.fromEntries(VARIANTS.map((v) => [v.tag, chosenOf(root, look, v)]))
  const dropped = Object.fromEntries(VARIANTS.map((v) => [v.tag, listOf(root, v).filter((x) => x !== chosen[v.tag])]))
  const dirs = OWNED.filter((p) => existsSync(join(root, p)))
  /** Переписываемые файлы: [путь, новый текст, какие метки в нём]. */
  const edits = []
  for (const dir of ['app', 'components', 'lib', 'styles']) {
    walk(join(root, dir), (file) => {
      const rel = relative(root, file).replace(/\\/g, '/')
      if (!/\.(ts|tsx|css)$/.test(file) || inOwned(rel)) return
      const text = readFileSync(file, 'utf8')
      let next = text.includes(TAG) ? stripPanel(text) : text
      for (const v of VARIANTS) if (next.includes(v.tag)) next = stripVariants(next, v.tag, chosen[v.tag])
      if (next !== text) edits.push([rel, next, [TAG, ...VARIANTS.map((v) => v.tag)].filter((t) => text.includes(t))])
    })
  }
  const scripts = []
  if (existsSync(join(root, 'package.json'))) {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    for (const [k, v] of Object.entries(pkg.scripts ?? {})) if (String(v).includes(`${TAG}/`)) { scripts.push(k); delete pkg.scripts[k] }
    if (scripts.length) edits.push(['package.json', JSON.stringify(pkg, null, 2) + '\n', ['scripts']])
  }
  for (const f of ['.env', '.env.local', '.env.example']) {
    if (!existsSync(join(root, f))) continue
    const text = readFileSync(join(root, f), 'utf8')
    const kept = text.split('\n').filter((line) => !line.includes(TAG) && !/^\s*#?\s*LOOK_PICKER\s*=/.test(line)).join('\n')
    if (kept !== text) edits.push([f, kept, ['LOOK_PICKER']])
  }
  const files = existsSync(join(root, DRAFT)) ? [DRAFT] : []
  const used = new Set((look.fonts ?? []).flatMap((f) => f.files.map((x) => basename(x.url))))
  if (existsSync(join(root, 'public/fonts'))) for (const name of readdirSync(join(root, 'public/fonts'))) if (!used.has(name)) files.push(`public/fonts/${name}`)
  return { chosen, dropped, dirs, edits, scripts, files }
}
const empty = (p) => !p.dirs.length && !p.edits.length && !p.files.length

/** План словами — то, что увидит заказчик до подтверждения. */
export function describe(p) {
  const where = (tag) => p.edits.filter(([, , tags]) => tags.includes(tag)).map(([f]) => f).join(', ')
  const lines = []
  if (p.dirs.length) lines.push(`папки панели: ${p.dirs.map((d) => `${d}/`).join(', ')}`)
  if (where(TAG)) lines.push(`строки подключения панели: ${where(TAG)}`)
  if (p.scripts.length) lines.push(`команды в package.json: ${p.scripts.join(', ')}`)
  if (where('LOOK_PICKER')) lines.push(`флаг LOOK_PICKER: ${where('LOOK_PICKER')}`)
  if (p.files.includes(DRAFT)) lines.push(`черновик вида: ${DRAFT}`)
  const fonts = p.files.filter((f) => f.startsWith('public/fonts/'))
  if (fonts.length) lines.push(`шрифты, которых опубликованный вид не носит: ${fonts.join(', ')}`)
  for (const v of VARIANTS) {
    const what = WHAT[v.field]
    if (p.dropped[v.tag].length) lines.push(`${what}, кроме выбранного «${p.chosen[v.tag]}»: ${p.dropped[v.tag].join(', ')} (${where(v.tag)})`)
  }
  return lines
}

/* ── снятие ──────────────────────────────────────────────────────────── */

function apply(root, p) {
  for (const d of p.dirs) rmSync(join(root, d), { recursive: true, force: true })
  for (const [rel, next] of p.edits) writeFileSync(join(root, rel), next)
  for (const f of p.files) rmSync(join(root, f), { force: true })
  /* Стили — из опубликованного вида, и без панели тоже. */
  const styles = spawnSync(process.execPath, ['scripts/look-slots.mjs'], { cwd: root, encoding: 'utf8' })
  if (styles.status !== 0) throw new Error(`стили вида не выпущены: ${styles.stdout}${styles.stderr}`)
  return [...p.dirs, ...p.edits.map(([f]) => f), ...p.files, 'стили из опубликованного вида']
}

/** Снять панель в папке сайта; вернуть, что тронуто. Только в магазине. */
export function remove(root) {
  const no = refusal(root)
  if (no) throw new Error(`панель вида здесь не снимается: ${no}`)
  return apply(root, plan(root))
}

/* ── копия перед снятием ─────────────────────────────────────────────── */

const two = (n) => String(n).padStart(2, '0')
export const stamp = (d = new Date()) => `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`
/** Соседняя папка копии: <сайт>.look-backup-<ГГГГММДД-ЧЧмм>. */
export function backupDir(root, when = stamp()) {
  const base = join(dirname(resolve(root)), `${basename(resolve(root))}.look-backup-${when}`)
  let at = base
  for (let i = 2; existsSync(at); i++) at = `${base}-${i}`
  return at
}
/** Выпущенное из вида — перевыпускается при снятии; в копию едет как было. */
const EMITTED = ['styles/palette.css', 'styles/buttons.css', 'styles/scale.css', 'styles/look.css', 'lib/look-slots.json']
/** Скопировать всё, что снятие удалит или перепишет, и опубликованный вид с
 *  черновиком — в папку копии, с README о том, как вернуть. */
export function backup(root, p, to) {
  const put = (rel) => {
    const from = join(root, rel)
    if (!existsSync(from)) return
    if (statSync(from).isDirectory()) copyTree(from, join(to, rel))
    else { mkdirSync(dirname(join(to, rel)), { recursive: true }); copyFileSync(from, join(to, rel)) }
  }
  const list = [...new Set([...p.dirs, ...p.edits.map(([f]) => f), ...p.files, PUBLISHED, DRAFT, ...EMITTED])]
  for (const rel of list) put(rel)
  writeFileSync(join(to, 'README.md'), [
    '# Копия перед снятием панели вида',
    '',
    `Сайт: \`${resolve(root)}\`. Снято: ${new Date().toLocaleString('ru-RU')}. Пути внутри — те же, что в сайте.`,
    '',
    'Что здесь: папки и файлы, которые снятие удалило или переписало, опубликованный вид (`lib/source/sample/look.json`) и черновик, стили, выпущенные из вида.',
    '',
    'Вернуть панель:',
    '',
    `1. Из набора — одной командой: \`node install.mjs --look-panel "${resolve(root)}"\`. Вернёт панель, все варианты шапки, карточки и главной из шаблона набора, флаг и команды; опубликованный вид сайта останется как есть.`,
    '2. Или ровно как было до снятия: скопировать содержимое этой папки поверх сайта (кроме README.md) и выполнить `npm run build`.',
    '',
  ].join('\n'))
  return list
}
/** Метка git перед снятием, если сайт — в git. Сообщение для отчёта. */
export function tagBefore(root, when = stamp()) {
  const inside = spawnSync('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' })
  if (inside.status !== 0 || inside.stdout.trim() !== 'true') return 'сайт не в git — метки нет, копия в папке рядом'
  const name = `look-panel-before-remove-${when}`
  const r = spawnSync('git', ['-C', root, 'tag', name], { encoding: 'utf8' })
  return r.status === 0 ? `метка git ${name} (последний коммит; несохранённое — в копии рядом)` : `метка git не поставлена: ${(r.stderr || r.stdout).trim()}`
}

/** Упоминания панели в коде и настройках сайта. */
export function traces(root) {
  const found = []
  const scan = (file) => {
    if (!/\.(ts|tsx|mjs|js|css|json|md)$|\/\.env|\.gitignore$/.test(file.replace(/\\/g, '/'))) return
    const text = readFileSync(file, 'utf8')
    for (const t of TRACES) if (text.includes(t)) found.push(`${relative(root, file).replace(/\\/g, '/')}: «${t}»`)
  }
  for (const dir of CODE) walk(join(root, dir), scan)
  for (const f of ROOT_FILES) if (existsSync(join(root, f))) scan(join(root, f))
  return found
}

/* ── доказательство на копии ─────────────────────────────────────────── */

/* Копия — рядом с сайтом, на том же диске, со своей node_modules из жёстких
   ссылок (места не занимает, копируется быстро). */
const SKIP = new Set(['node_modules', '.next', '.sweep', '.git', 'out', 'tsconfig.tsbuildinfo'])
const linkTree = (from, to) => {
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    const a = join(from, name), b = join(to, name)
    const st = lstatSync(a)
    if (st.isSymbolicLink()) continue
    if (st.isDirectory()) linkTree(a, b)
    else try { linkSync(a, b) } catch { copyFileSync(a, b) }
  }
}
const copyTree = (from, to) => {
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    if (SKIP.has(name)) continue
    const a = join(from, name), b = join(to, name)
    if (statSync(a).isDirectory()) copyTree(a, b)
    else copyFileSync(a, b)
  }
}
const findFile = (dir, name) => {
  let hit = null
  walk(dir, (f) => { if (!hit && f.endsWith(name)) hit = f })
  return hit
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
/** Объявления блоков `:root{…}` сжатого стиля вне @media: [имя, значение]. */
function rootDecls(css) {
  let flat = ''
  let depth = 0
  let media = -1
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c === '@' && media < 0 && css.startsWith('@media', i)) media = depth
    if (c === '{') depth++
    if (c === '}') {
      depth--
      if (media >= 0 && depth === media) { media = -1; continue }
    }
    if (media < 0) flat += c
  }
  return [...flat.matchAll(/(?:^|[}\s]):root\{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/(--[\w-]+):([^;]*)/g)].map((d) => [d[1], d[2]]))
}
/** Значение так, как его пишет сборщик: light-dark() — парой переменных
 *  lightningcss, краски короче и строчными, без пробелов и кавычек. */
function squeeze(v) {
  const short = (h) => (h[1] === h[2] && h[3] === h[4] && h[5] === h[6] ? `#${h[1]}${h[3]}${h[5]}` : h)
  /* Вуаль строителя палитры `#RRGGBBAA` (И295) сборщик тоже укорачивает:
     `#00000099` → `#0009`. */
  const short8 = (h) => (h[1] === h[2] && h[3] === h[4] && h[5] === h[6] && h[7] === h[8] ? `#${h[1]}${h[3]}${h[5]}${h[7]}` : h)
  let s = String(v).trim().toLowerCase().replace(/#[0-9a-f]{8}\b/g, short8).replace(/#[0-9a-f]{6}\b/g, short)
  const ld = s.match(/^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/)
  if (ld) s = `var(--lightningcss-light,${ld[1]})var(--lightningcss-dark,${ld[2]})`
  return s.replace(/[\s"']/g, '').replace(/(^|[(,])0\./g, '$1.')
}
/** Свойства, которые основа набора объявляет у себя (tokens.css), а вид
 *  перекрывает в styles/look.css: шрифт и тени. */
const BASE_TOKENS = ['--face', '--face-head', '--sh-raised', '--sh-lift', '--sh-overlay', '--sh-in']

async function check(root) {
  const tmp = join(dirname(root), `.${basename(root)}-look-check`)
  rmSync(tmp, { recursive: true, force: true })
  const fail = []
  /* Наборов цвета, кнопок и ритма в отгружаемых стилях нет вовсе — ни
     чужих, ни своего под именем: вид один, на корне. Шрифтов-кандидатов нет. */
  const foreign = ['[data-palette=', '[data-button=', '[data-scale=', '[data-face=', '--f-manrope', '--f-plex', '--f-inter', '--f-serif']
  try {
    copyTree(root, tmp)
    linkTree(join(root, 'node_modules'), join(tmp, 'node_modules'))
    /* Копия — магазин: доказательство идёт и на витрине шаблона, где сама
       панель не снимается никогда. */
    const record = existsSync(join(tmp, RECORD)) ? JSON.parse(readFileSync(join(tmp, RECORD), 'utf8')) : {}
    writeFileSync(join(tmp, RECORD), JSON.stringify({ ...record, role: 'shop' }, null, 2) + '\n')
    const look = published(tmp)
    const want = Object.fromEntries(VARIANTS.map((v) => [v.field, chosenOf(tmp, look, v)]))
    const done = remove(tmp)
    console.log(`· снято на копии: ${done.length} — ${done.slice(0, 8).join(', ')}${done.length > 8 ? ' …' : ''}`)
    for (const p of OWNED) if (existsSync(join(tmp, p))) fail.push(`${p} остался`)
    for (const t of traces(tmp)) fail.push(`след панели: ${t}`)
    for (const v of VARIANTS) {
      const left = listOf(tmp, v)
      if (left.length !== 1 || left[0] !== want[v.field]) fail.push(`вариантов в ${v.list}: ${left.join(', ')} — ждали один «${want[v.field]}»`)
    }
    /* Стили сайта несут ровно опубликованный вид: каждое свойство вида —
       опубликованным значением, чужих наборов нет. */
    const { acceptValues } = await import(pathToFileURL(join(tmp, 'lib/look-values.ts')).href)
    const { slots: after } = JSON.parse(readFileSync(join(tmp, 'lib/look-slots.json'), 'utf8'))
    const published_ = acceptValues(look, after).look.vars
    for (const [name, value] of Object.entries(published_)) if (after[name]?.value !== value) fail.push(`стили сайта: ${name} — «${after[name]?.value}», опубликовано «${value}»`)
    const env = { ...process.env, LOOK_PICKER: '' }
    const run = (args, what) => {
      const r = spawnSync(process.execPath, args, { cwd: tmp, env, encoding: 'utf8' })
      if (r.status !== 0) fail.push(`${what}: ${(r.stdout + r.stderr).split('\n').filter(Boolean).slice(-12).join('\n    ')}`)
      else console.log(`· ${what}: зелёный`)
      return r
    }
    run([join(tmp, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', tmp], 'tsc без панели')
    run(['scripts/copy-icons.mjs'], 'знаки')
    run(['scripts/look-slots.mjs'], 'свойства вида')
    const build = run([join(tmp, 'node_modules/next/dist/bin/next'), 'build'], 'сборка без панели')
    if (build.status === 0) {
      const lang = readFileSync(join(tmp, 'lib/locale.ts'), 'utf8').match(/DEFAULT_LANG: Lang = '([a-z-]+)'/)?.[1] ?? 'en'
      const page = findFile(join(tmp, '.next/server/app'), `${lang}.html`)
      if (!page) fail.push(`/${lang} не собран статической страницей`)
      else {
        /* Вид тот же: блок вида на странице — ровно то, что сайт выпускает из
           опубликованного вида своим же правилом. */
        const html = readFileSync(page, 'utf8')
        const { acceptLook } = await import(pathToFileURL(join(tmp, 'lib/look-rule.ts')).href)
        const { lookCss } = await import(pathToFileURL(join(tmp, 'lib/look-values.ts')).href)
        const { slots, facts } = JSON.parse(readFileSync(join(tmp, 'lib/look-slots.json'), 'utf8'))
        const inline = lookCss(acceptLook(look, slots, facts).look)
        const got = html.match(/<style[^>]*data-href="look"[^>]*>([\s\S]*?)<\/style>/)?.[1]
        if (got !== inline) fail.push(`/${lang}: блок <style href="look"> не тот, что выпускает опубликованный вид`)
        if (!html.includes(`data-variant="${want.header}"`)) fail.push(`/${lang}: шапка не «${want.header}»`)
        if (!html.includes(`data-card="${want.card}"`)) fail.push(`/${lang}: карточка товара не «${want.card}»`)
        if (!html.includes(`data-home="${want.home}"`)) fail.push(`/${lang}: главная не «${want.home}»`)
        if (html.includes(`/${TAG}/`)) fail.push(`/${lang} всё ещё подключает панель`)
        console.log(`· /${lang}: статическая, вид тот же (${Object.keys(look.vars ?? {}).length} значений опубликовано, шапка ${want.header}, карточка ${want.card}, главная ${want.home}, шрифтов ${look.fonts?.length ?? 0})`)
      }
      /* Чужих вариантов в отгружаемых стилях нет, и значения вида в них —
         опубликованные (сжатыми, как их пишет сборщик). */
      let raw = 0, gz = 0
      const shipped = new Map()
      const fontUrls = new Set((look.fonts ?? []).flatMap((f) => f.files.map((x) => x.url)))
      walk(join(tmp, '.next/static'), (f) => {
        if (!f.endsWith('.css')) return
        const css = readFileSync(f, 'utf8')
        raw += Buffer.byteLength(css); gz += gzipSync(css, { level: 9 }).length
        for (const needle of foreign) if (css.includes(needle)) fail.push(`отгружаемый стиль ${basename(f)} несёт чужой вариант: ${needle}`)
        for (const m of css.matchAll(/@font-face\{[^}]*?url\(([^)]+)\)/g)) if (!fontUrls.has(m[1].replace(/["']/g, ''))) fail.push(`отгружаемый стиль ${basename(f)} несёт чужой шрифт: ${m[1]}`)
        for (const [name, value] of rootDecls(css)) shipped.set(name, [...(shipped.get(name) ?? []), value])
      })
      for (const [name, value] of Object.entries(published_)) {
        const got = (shipped.get(name) ?? []).map(squeeze)
        if (!got.includes(squeeze(value))) fail.push(`отгружаемый стиль: ${name} не «${value}» (${(shipped.get(name) ?? ['нет']).join(' | ')})`)
        else if (new Set(got).size > 1 && !BASE_TOKENS.includes(name)) fail.push(`отгружаемый стиль: у ${name} два значения — ${shipped.get(name).join(' | ')}`)
      }
      console.log(`· отгружаемые стили: ${Object.keys(published_).length} свойств вида — опубликованными значениями, чужих наборов нет`)
      const media = existsSync(join(tmp, '.next/static/media')) ? readdirSync(join(tmp, '.next/static/media')).filter((n) => /\.(woff2?|ttf|otf)$/.test(n)) : []
      if (media.length) fail.push(`шрифтов-кандидатов в сборке: ${media.length}`)
      console.log(`· стили без панели: ${kb(raw)}, gzip ${kb(gz)}; шрифтов в сборке: ${media.length}`)
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  if (fail.length) {
    console.error(`✗ Панель вида не снимается чисто:\n  ${fail.join('\n  ')}`)
    process.exit(1)
  }
  console.log('✓ Без панели сайт собирается, вид тот же, чужих вариантов и следов панели нет.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../..', import.meta.url))
  if (process.argv.includes('--check')) await check(root)
  else {
    const no = refusal(root)
    if (no) {
      console.error(`✗ Панель вида здесь не снимается: ${no}\n  ${HOW}`)
      process.exit(1)
    }
    const p = plan(root)
    if (empty(p)) { console.log('Панели вида здесь нет.'); process.exit(0) }
    const when = stamp()
    const to = backupDir(root, when)
    console.log(`Снятие панели вида удалит:\n  · ${describe(p).join('\n  · ')}\nи выпустит стили из опубликованного вида; сам вид (${PUBLISHED}) не меняется.`)
    if (!process.argv.includes('--yes')) {
      console.log(`\nНичего не удалено. Снять: npm run look:remove -- --yes\n  сначала всё удаляемое, вид и черновик скопируются в ${to}`)
      process.exit(0)
    }
    const saved = backup(root, p, to)
    console.log(`\nКопия: ${to} (${saved.length} путей, README.md — как вернуть)`)
    console.log(`Git: ${tagBefore(root, when)}`)
    const done = apply(root, p)
    console.log(`Панель вида снята: ${done.join(', ')}`)
    console.log(`Вернуть: из набора — node install.mjs --look-panel "${resolve(root)}"`)
  }
}
