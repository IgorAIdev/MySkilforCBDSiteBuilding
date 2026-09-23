/* Снять панель «Look» с сайта одной командой — когда вид выбран.

   Панель — отдельный контейнер (public/look/), и всё, чем сайт её касается,
   помечено меткой `look-panel`: строка подключения в components/Shell.tsx,
   просмотр по cookie в lib/look.ts, адрес чернового режима
   app/api/look-preview/. Снять — значит удалить папку, помеченные файлы и
   строки, свои команды в package.json и флаг LOOK_PICKER в .env. Вид
   сайта от этого не меняется: он приходит данными источника (look()).

     npm run look:remove           снять здесь
     npm run check:look            доказать на копии: без панели сайт
                                   проходит tsc и сборку, и <html> несёт
                                   атрибуты вида из источника */
import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, lstatSync, mkdirSync, copyFileSync, linkSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const TAG = 'look-panel'
/** Файлы и папки панели — целиком. */
export const OWNED = ['public/look', 'app/api/look-preview', 'scripts/look-options.mjs', 'scripts/look-remove.mjs', 'tests/look-panel.test.ts']
const CODE = ['app', 'components', 'lib']

/** Код без панели: помеченные блоки `/* look-panel:start … look-panel:end *\/`
 *  и строки с меткой. */
export function strip(text) {
  return text
    .replace(/[ \t]*\/\*\s*look-panel:start[\s\S]*?look-panel:end\s*\*\/[ \t]*\r?\n?/g, '')
    .split('\n').filter((line) => !line.includes(TAG)).join('\n')
}

const walk = (dir, visit) => {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const at = join(dir, name)
    if (statSync(at).isDirectory()) walk(at, visit)
    else visit(at)
  }
}

/** Снять панель в папке сайта; вернуть, что тронуто. */
export function remove(root) {
  const done = []
  for (const p of OWNED) {
    const at = join(root, p)
    if (existsSync(at)) { rmSync(at, { recursive: true, force: true }); done.push(p) }
  }
  for (const dir of CODE) {
    walk(join(root, dir), (file) => {
      if (!/\.(ts|tsx)$/.test(file)) return
      const text = readFileSync(file, 'utf8')
      if (!text.includes(TAG)) return
      writeFileSync(file, strip(text))
      done.push(relative(root, file).replace(/\\/g, '/'))
    })
  }
  const pkgFile = join(root, 'package.json')
  if (existsSync(pkgFile)) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
    for (const k of ['look:remove', 'check:look']) delete pkg.scripts?.[k]
    for (const k of ['dev', 'build']) if (pkg.scripts?.[k]) pkg.scripts[k] = pkg.scripts[k].replace(' && node scripts/look-options.mjs', '')
    writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n')
    done.push('package.json')
  }
  for (const f of ['.env', '.env.local', '.env.example', '.gitignore']) {
    const at = join(root, f)
    if (!existsSync(at)) continue
    const text = readFileSync(at, 'utf8')
    const kept = text.split('\n').filter((line) => !line.includes(TAG) && !/^\s*LOOK_PICKER\s*=/.test(line) && !line.includes('public/look/')).join('\n')
    if (kept !== text) { writeFileSync(at, kept); done.push(f) }
  }
  return done
}

/* ── доказательство на копии ─────────────────────────────────────────── */

/* Копия — рядом с сайтом, на том же диске, со своей node_modules из жёстких
   ссылок (места не занимает, копируется быстро). Не ссылка на папку и не
   копия внутри сайта: ссылку на node_modules вне своего корня Turbopack не
   принимает, а сборка копии внутри сайта задела .next самого сайта. */
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
const attrs = (html) => Object.fromEntries([...(html.match(/<html\b([^>]*)>/)?.[1] ?? '').matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
const findFile = (dir, name) => {
  let hit = null
  walk(dir, (f) => { if (!hit && f.endsWith(name)) hit = f })
  return hit
}

function check(root) {
  const tmp = join(dirname(root), `.${basename(root)}-look-check`)
  rmSync(tmp, { recursive: true, force: true })
  const fail = []
  try {
    copyTree(root, tmp)
    linkTree(join(root, 'node_modules'), join(tmp, 'node_modules'))
    const done = remove(tmp)
    console.log(`· снято на копии: ${done.join(', ')}`)
    for (const p of OWNED) if (existsSync(join(tmp, p))) fail.push(`${p} остался`)
    for (const dir of [...CODE, 'scripts', 'public']) walk(join(tmp, dir), (f) => { if (/\.(ts|tsx|mjs|js)$/.test(f) && readFileSync(f, 'utf8').includes(TAG)) fail.push(`${relative(tmp, f)}: метка осталась`) })
    const env = { ...process.env, LOOK_PICKER: '' }
    const run = (args, what) => {
      const r = spawnSync(process.execPath, args, { cwd: tmp, env, encoding: 'utf8' })
      if (r.status !== 0) fail.push(`${what}: ${(r.stdout + r.stderr).split('\n').filter(Boolean).slice(-12).join('\n    ')}`)
      else console.log(`· ${what}: зелёный`)
      return r
    }
    run([join(tmp, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', tmp], 'tsc без панели')
    run(['scripts/copy-icons.mjs'], 'знаки')
    const build = run([join(tmp, 'node_modules/next/dist/bin/next'), 'build'], 'сборка без панели')
    if (build.status === 0) {
      const lang = readFileSync(join(tmp, 'lib/locale.ts'), 'utf8').match(/DEFAULT_LANG: Lang = '([a-z-]+)'/)?.[1] ?? 'en'
      const page = findFile(join(tmp, '.next/server/app'), `${lang}.html`)
      if (!page) fail.push(`/${lang} не собран статической страницей — вид сделал её динамической?`)
      else {
        const html = readFileSync(page, 'utf8')
        const got = attrs(html)
        const look = JSON.parse(readFileSync(join(tmp, 'lib/source/sample/look.json'), 'utf8'))
        for (const k of ['face', 'button', 'header', 'palette']) {
          if (got[`data-${k}`] !== look[k]) fail.push(`<html data-${k}> «${got[`data-${k}`]}», а look() — «${look[k]}»`)
        }
        if (html.includes('/look/look.js')) fail.push('страница всё ещё подключает /look/look.js')
        console.log(`· /${lang}: статическая, <html data-face="${got['data-face']}" data-button="${got['data-button']}" data-header="${got['data-header']}" data-palette="${got['data-palette']}">`)
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  if (fail.length) {
    console.error(`✗ Панель «Look» не снимается чисто:\n  ${fail.join('\n  ')}`)
    process.exit(1)
  }
  console.log('✓ Без панели «Look» сайт собирается, и вид приходит из источника.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd()
  if (process.argv.includes('--check')) check(root)
  else {
    const done = remove(root)
    console.log(done.length ? `Панель «Look» снята: ${done.join(', ')}` : 'Панели «Look» здесь нет.')
  }
}
