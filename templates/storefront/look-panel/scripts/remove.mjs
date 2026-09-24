/* Снять панель вида одной командой — когда вид выбран (PANEL.md, шаг 5).

   Панель физически отделена от сайта (CLAUDE.md, «Панель настройки
   физически отделена от сайта»): всё её — папка look-panel/; в сайт она
   входит двумя местами с меткой `look-panel` — адрес app/look-panel/ и
   строка подключения в components/Shell.tsx. Снять — значит удалить папку,
   адрес и строку, свои команды в package.json, флаг LOOK_PICKER, черновик
   вида и шрифты, которых опубликованный вид не носит, и варианты шапки,
   кроме выбранного (метки `look-header:` в коде, lib/headers.ts). Вид сайта
   от этого не меняется: он — значения в источнике данных.

     npm run look:remove     снять здесь
     npm run check:look      доказать на копии рядом: без панели сайт
                             собирается, вид тот же, чужих вариантов в
                             отгружаемых стилях нет, упоминаний панели нет */
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
export const TRACES = [TAG, 'LOOK_PICKER', 'look:remove', 'check:look', 'check:choice', 'look-header']

/** Код без панели: строки с меткой и блоки `look-panel:start … end`. */
export function stripPanel(text) {
  return text
    .replace(/[ \t]*\/\*\s*look-panel:start[\s\S]*?look-panel:end\s*\*\/[ \t]*\r?\n?/g, '')
    .split('\n').filter((line) => !line.includes(TAG)).join('\n')
}

/** Код с одной шапкой: блоки и строки `look-header:<варианты>` остальных
 *  удалены, у выбранного сняты сами метки; строки `look-header:*`
 *  (объяснение меток) удаляются всегда. */
export function stripHeaders(text, chosen) {
  const keep = (ids) => ids.split(',').includes(chosen)
  const out = text.replace(/^[ \t]*\/\* look-header:([a-z,]+):start \*\/\r?\n([\s\S]*?)^[ \t]*\/\* look-header:\1:end \*\/\r?\n/gm,
    (_, ids, inner) => (keep(ids) ? inner : ''))
  return out.split('\n').flatMap((line) => {
    if (line.includes('look-header:*')) return []
    const m = line.match(/look-header:([a-z,]+)/)
    if (!m) return [line]
    if (!keep(m[1])) return []
    return [line.replace(/\s*(\/\/|\/\*)\s*look-header:[a-z,]+(\s*\*\/)?/, '')]
  }).join('\n')
}

const walk = (dir, visit) => {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue
    const at = join(dir, name)
    if (statSync(at).isDirectory()) walk(at, visit)
    else visit(at)
  }
}
const headersOf = (root) => [...(readFileSync(join(root, 'lib/headers.ts'), 'utf8').match(/HEADERS = \[([\s\S]*?)\]/)?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
const published = (root) => JSON.parse(readFileSync(join(root, 'lib/source/sample/look.json'), 'utf8'))

/** Снять панель в папке сайта; вернуть, что тронуто. */
export function remove(root) {
  const done = []
  const look = published(root)
  const chosen = headersOf(root).includes(look.header) ? look.header : headersOf(root)[0]
  for (const p of OWNED) {
    const at = join(root, p)
    if (existsSync(at)) { rmSync(at, { recursive: true, force: true }); done.push(p) }
  }
  for (const dir of ['app', 'components', 'lib', 'styles']) {
    walk(join(root, dir), (file) => {
      if (!/\.(ts|tsx|css)$/.test(file)) return
      const text = readFileSync(file, 'utf8')
      let next = text.includes(TAG) ? stripPanel(text) : text
      if (next.includes('look-header')) next = stripHeaders(next, chosen)
      if (next !== text) { writeFileSync(file, next); done.push(relative(root, file).replace(/\\/g, '/')) }
    })
  }
  const pkgFile = join(root, 'package.json')
  if (existsSync(pkgFile)) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
    for (const [k, v] of Object.entries(pkg.scripts ?? {})) if (String(v).includes(`${TAG}/`)) delete pkg.scripts[k]
    writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n')
    done.push('package.json')
  }
  for (const f of ['.env', '.env.local', '.env.example']) {
    const at = join(root, f)
    if (!existsSync(at)) continue
    const text = readFileSync(at, 'utf8')
    const kept = text.split('\n').filter((line) => !line.includes(TAG) && !/^\s*#?\s*LOOK_PICKER\s*=/.test(line)).join('\n')
    if (kept !== text) { writeFileSync(at, kept); done.push(f) }
  }
  const draft = join(root, 'lib/source/sample/look.draft.json')
  if (existsSync(draft)) { rmSync(draft); done.push('lib/source/sample/look.draft.json') }
  const fontsDir = join(root, 'public/fonts')
  const used = new Set((look.fonts ?? []).flatMap((f) => f.files.map((x) => basename(x.url))))
  if (existsSync(fontsDir)) {
    for (const name of readdirSync(fontsDir)) if (!used.has(name)) { rmSync(join(fontsDir, name)); done.push(`public/fonts/${name}`) }
  }
  return done
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

async function check(root) {
  const tmp = join(dirname(root), `.${basename(root)}-look-check`)
  rmSync(tmp, { recursive: true, force: true })
  const fail = []
  /* Чужие варианты — всё, что есть в каталоге панели и чего нет в стилях сайта. */
  const catalog = JSON.parse(readFileSync(join(root, 'look-panel/ui/catalog.json'), 'utf8'))
  const own = (file) => Object.keys(JSON.parse(readFileSync(join(root, file), 'utf8')))
  const foreign = [
    ...catalog.groups.palette.map((o) => o.id).filter((id) => !own('styles/palette.json').includes(id)).map((id) => `[data-palette="${id}"]`),
    ...catalog.groups.button.map((o) => o.id).filter((id) => !own('styles/buttons.json').includes(id)).map((id) => `[data-button="${id}"]`),
    ...catalog.groups.scale.map((o) => o.id).filter((id) => !own('styles/scale.json').includes(id)).map((id) => `[data-scale="${id}"]`),
    '[data-face=', '--f-manrope', '--f-plex', '--f-inter', '--f-serif', '@font-face',
  ]
  try {
    copyTree(root, tmp)
    linkTree(join(root, 'node_modules'), join(tmp, 'node_modules'))
    const look = published(tmp)
    const done = remove(tmp)
    console.log(`· снято на копии: ${done.length} — ${done.slice(0, 8).join(', ')}${done.length > 8 ? ' …' : ''}`)
    for (const p of OWNED) if (existsSync(join(tmp, p))) fail.push(`${p} остался`)
    for (const t of traces(tmp)) fail.push(`след панели: ${t}`)
    const headers = headersOf(tmp)
    if (headers.length !== 1 || headers[0] !== look.header) fail.push(`шапок в lib/headers.ts: ${headers.join(', ')} — ждали одну «${look.header}»`)
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
        const want = lookCss(acceptLook(look, slots, facts, headers).look)
        const got = html.match(/<style[^>]*data-href="look"[^>]*>([\s\S]*?)<\/style>/)?.[1]
        if (got !== want) fail.push(`/${lang}: блок <style href="look"> не тот, что выпускает опубликованный вид`)
        if (!html.includes(`data-variant="${look.header}"`)) fail.push(`/${lang}: шапка не «${look.header}»`)
        if (html.includes(`/${TAG}/`)) fail.push(`/${lang} всё ещё подключает панель`)
        console.log(`· /${lang}: статическая, вид тот же (${Object.keys(look.vars ?? {}).length} значений опубликовано, шапка ${look.header}, шрифтов ${look.fonts?.length ?? 0})`)
      }
      /* Чужих вариантов в отгружаемых стилях нет. */
      let raw = 0, gz = 0
      walk(join(tmp, '.next/static'), (f) => {
        if (!f.endsWith('.css')) return
        const css = readFileSync(f, 'utf8')
        raw += Buffer.byteLength(css); gz += gzipSync(css, { level: 9 }).length
        for (const needle of foreign) if (css.includes(needle)) fail.push(`отгружаемый стиль ${basename(f)} несёт чужой вариант: ${needle}`)
      })
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
    const done = remove(root)
    console.log(done.length ? `Панель вида снята: ${done.join(', ')}` : 'Панели вида здесь нет.')
  }
}
