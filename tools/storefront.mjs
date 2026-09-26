/*
 * Витрина из шаблона — для правки шаблона (И432).
 *
 * Шаблон витрины (`templates/storefront`) сам не запускается: его ставят в
 * папку (`install.mjs --storefront`), и уже поставленная витрина
 * собирается и открывается. Правят при этом ШАБЛОН — в копии правка
 * никуда не попадёт. Эта команда держит обе стороны вместе:
 *
 *   1. ставит витрину из шаблона в `.storefront/` (в git не идёт), если её
 *      там нет, кладёт ей вид витрины шаблона из `showcase/` и ставит
 *      зависимости;
 *   2. запускает её сервером разработки (порт 3020 или `PORT`, панель вида
 *      включена, `LOOK_PICKER=on`);
 *   3. следит за набором: правка файла шаблона сразу кладётся в витрину
 *      тем же путём, и сервер разработки её подхватывает; правка всего
 *      остального (стили и инструменты набора, каталог панели, удалённый
 *      файл) — ставит витрину поверх заново (`--force`, ~10 с). Данные
 *      витрины — опубликованный вид, черновик, шрифты, `.env` — переустановка
 *      не трогает.
 *
 *   npm run storefront                 поставить (если нет), запустить, следить
 *   npm run storefront -- --fresh      снести `.storefront/` и поставить заново
 *   npm run storefront -- --no-watch   только запустить
 *   npm run storefront -- --sample     новая постановка без вида витрины —
 *                                      вид шаблона по умолчанию
 *   npm run storefront -- --save-look  опубликованный в панели вид — в showcase/
 *   npm run storefront -- --port 3030  свой порт (или PORT=3030)
 *   npm run storefront -- --prepare    только поставить (витрина, вид, зависимости),
 *                                      не запускать — так её собирает сервер
 *                                      (deploy/storefront.Dockerfile, И434)
 *
 * Вид витрины шаблона, выбранный заказчиком в панели (палитра, шрифт,
 * ритм …), лежит в `showcase/` набора: `look.json` — опубликованный вид,
 * `fonts/` — его шрифты. Шаблон его не везёт: витрина, поставленная
 * установщиком, встречает видом по умолчанию — решённым набором набора
 * (docs/decisions.md).
 *
 * Торговля — образец данных. Настоящий Vendure — переменные окружения
 * (`SOURCE=vendure`, `VENDURE_SHOP_API_URL`, `VENDURE_CHANNEL_TOKEN`,
 * `VENDURE_FALLBACK_LANG`): их задают окружению сессии или кладут в
 * `.storefront/.env`, в репозиторий они не идут.
 */

import { existsSync, rmSync, watch, mkdirSync, copyFileSync, statSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined }
const KIT = fileURLToPath(new URL('..', import.meta.url))
const SITE = join(KIT, '.storefront')
const TEMPLATE = join(KIT, 'templates', 'storefront')
const SHOWCASE = join(KIT, 'showcase')
const PUBLISHED = join(SITE, 'lib', 'source', 'sample', 'look.json')
const WIN = process.platform === 'win32'
const say = (line) => console.log(`[storefront] ${line}`)

const run = (cmd, argv, cwd, quiet = false) => {
  const r = spawnSync(cmd, argv, { cwd, stdio: quiet ? 'pipe' : 'inherit', shell: WIN && cmd === 'npm', encoding: 'utf8' })
  if (r.status !== 0) {
    if (quiet) process.stderr.write(`${r.stdout ?? ''}${r.stderr ?? ''}`)
    throw new Error(`${cmd} ${argv.join(' ')} — код ${r.status}`)
  }
}
const install = (force) => run(process.execPath, [join(KIT, 'install.mjs'), '--storefront', ...(force ? ['--force'] : []), SITE], KIT, force)

/* Вид витрины шаблона — в поставленную витрину, и пересчитать им каталог
   панели и стили (И352: значения выводятся из имён нынешним каталогом). */
function applyShowcase() {
  const look = join(SHOWCASE, 'look.json')
  if (!existsSync(look)) return
  copyFileSync(look, PUBLISHED)
  const fonts = join(SHOWCASE, 'fonts')
  if (existsSync(fonts)) {
    mkdirSync(join(SITE, 'public', 'fonts'), { recursive: true })
    for (const f of readdirSync(fonts)) copyFileSync(join(fonts, f), join(SITE, 'public', 'fonts', f))
  }
  run(process.execPath, [join(SITE, 'look-panel', 'scripts', 'build-catalog.mjs'), '--from', KIT], SITE, true)
  run(process.execPath, [join(SITE, 'scripts', 'look-slots.mjs')], SITE, true)
  say('вид витрины шаблона — из showcase/')
}

/* Опубликованный в панели вид — в `showcase/`, чтобы его взяли следующая
   постановка, сервер и облачная сессия. С `--from <адрес>` — с витрины
   скилла на сервере (панель отдаёт его по /look-panel/published, И434), без
   него — из `.storefront/`. Шрифты — ровно те, что называет вид: сперва всё
   скачивается, потом пишется, прежние файлы шрифтов уходят. */
async function saveLook() {
  const from = opt('--from')?.replace(/\/+$/, '')
  const get = async (path) => {
    const res = await fetch(`${from}${path}`)
    if (!res.ok) throw new Error(`${from}${path} — ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
  const body = from ? await get('/look-panel/published') : readFileSync(PUBLISHED)
  const look = JSON.parse(body.toString('utf8'))
  const urls = (look.fonts ?? []).flatMap((f) => f.files.map((x) => x.url))
  const files = []
  for (const url of urls) files.push([url.split('/').pop(), from ? await get(url) : readFileSync(join(SITE, 'public', url))])
  const fonts = join(SHOWCASE, 'fonts')
  rmSync(fonts, { recursive: true, force: true })
  mkdirSync(fonts, { recursive: true })
  writeFileSync(join(SHOWCASE, 'look.json'), body)
  for (const [name, data] of files) writeFileSync(join(fonts, name), data)
  say(`вид ${from ? `с ${from}` : 'витрины'} сохранён в showcase/ — закоммитьте его`)
}

/* Постановка, запуск и слежка. Отдельно от сохранения вида: после `fetch`
   Node на Windows падает на `process.exit` (UV_HANDLE_CLOSING), поэтому
   сохранение просто заканчивается, а остальное не запускается. */
function start() {
  if (args.includes('--fresh') && existsSync(SITE)) {
    say('сношу .storefront/ и ставлю заново')
    rmSync(SITE, { recursive: true, force: true })
  }
  /* Поставлена — значит, есть запись ставщика: `package.json` остаётся и от
     постановки, прерванной на полпути. Папка не пуста, а витрины в ней нет —
     ставится поверх. */
  if (!existsSync(join(SITE, '.site-kit-install.json'))) {
    say(`ставлю витрину из шаблона в ${relative(process.cwd(), SITE) || '.'}`)
    install(existsSync(SITE) && readdirSync(SITE).length > 0)
    if (!args.includes('--sample')) applyShowcase()
  }
  /* Витрина внутри репозитория набора — свой репозиторий (И447). Набор
     исключает `.storefront/` в `.gitignore`, а линтер (oxlint) уважает
     `.gitignore` репозитория, в котором лежит: все файлы витрины выпадали, и
     `check:lint` печатал «не отдал разбираемый отчёт — НЕ ПРОВЕРЕНО ничего».
     Свой `.git` — граница: чужой `.gitignore` сквозь неё не читается. Набор
     папку по-прежнему не видит — она у него исключена. */
  if (!relative(KIT, SITE).startsWith('..') && !existsSync(join(SITE, '.git'))) {
    try {
      run('git', ['init', '-q'], SITE, true)
    } catch {
      say('git не найден — линтер в витрине увидит ноль файлов (check:lint)')
    }
  }
  if (!existsSync(join(SITE, 'node_modules', 'next'))) {
    say('ставлю зависимости витрины (npm install)')
    run('npm', ['install', '--no-audit', '--no-fund'], SITE)
  }
  if (args.includes('--prepare')) {
    say('витрина поставлена')
    process.exit(0)
  }

  /* То же, что `npm run dev` витрины, но порт — из `--port` или PORT (по
     умолчанию 3020, как у витрины): где 3020 занят другой витриной — свой. */
  const PORT = opt('--port') ?? process.env.PORT ?? '3020'
  run(process.execPath, [join(SITE, 'scripts', 'copy-icons.mjs')], SITE, true)
  run(process.execPath, [join(SITE, 'scripts', 'look-slots.mjs')], SITE, true)
  say(`запускаю: http://localhost:${PORT} (панель вида — полоса «Look» внизу)`)
  /* Next — прямо этим же node, без оболочки: через `npx` в оболочке Windows
     остановка команды убивала оболочку, а сервер оставался сиротой — держал
     порт и файлы `.storefront/`, и следующая постановка падала с EPERM. */
  const dev = spawn(process.execPath, [join(SITE, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--port', PORT], { cwd: SITE, stdio: 'inherit', env: { ...process.env, LOOK_PICKER: process.env.LOOK_PICKER ?? 'on' } })
  dev.on('exit', (code) => process.exit(code ?? 0))
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { dev.kill(sig); process.exit(0) })

  if (!args.includes('--no-watch')) {
    /* Что кладётся прямо: файл шаблона тем же путём. Что требует переустановки:
       каталог и правило панели, список свойств и выпуск вида (их пересчитывает
       сборка каталога), и всё вне шаблона, что установщик раскладывает сам. */
    const REBUILD = /^(look-panel\/|lib\/look-|scripts\/look-slots\.mjs|lib\/source\/sample\/look\.json|package\.json)/
    const WATCHED = ['templates/storefront', 'styles', 'tools', 'skills/site-building/assets']
    /* Временные файлы редакторов (`x.ts.tmp.123`, `x~`, `.x.swp`) живут миг:
       их не кладут и из-за них не переставляют. */
    const temp = (rel) => /\.tmp\.[^/]*$|~$|\.sw[a-p]$/.test(rel)
    const skip = (rel) => /(^|\/)(node_modules|\.next)(\/|$)/.test(rel) || rel === 'tools/storefront.mjs' || temp(rel)
    let pending = null
    let reinstall = false
    const direct = new Set()
    const flush = () => {
      pending = null
      try {
        if (reinstall) {
          say('правка набора — ставлю витрину поверх заново')
          install(true)
          say('готово')
        } else {
          for (const rel of direct) {
            if (!existsSync(join(TEMPLATE, rel))) continue
            const to = join(SITE, rel)
            mkdirSync(dirname(to), { recursive: true })
            /* Одной записью и ещё раз чуть погодя: на Windows сервер
               разработки читает файл, пока его пишут, получает «файл занят»
               (os error 32) и держит ошибку до следующей правки — повторная
               запись её снимает. */
            const body = readFileSync(join(TEMPLATE, rel))
            writeFileSync(to, body)
            setTimeout(() => { try { writeFileSync(to, body) } catch { /* следующая правка положит */ } }, 700)
            say(`→ ${rel}`)
          }
        }
      } catch (e) { say(`не вышло: ${e.message}`) }
      reinstall = false
      direct.clear()
    }
    for (const root of WATCHED) {
      const base = join(KIT, root)
      if (!existsSync(base)) continue
      watch(base, { recursive: true }, (_event, file) => {
        if (!file) return
        const full = join(base, file.toString())
        const rel = relative(KIT, full).split(sep).join('/')
        if (skip(rel)) return
        if (rel.startsWith('templates/storefront/')) {
          const inTemplate = rel.slice('templates/storefront/'.length)
          const gone = !existsSync(full)
          /* Удалён — только то, что было в витрине: редактор сохраняет через
             временный файл рядом, и тот «исчезает» сразу после записи. */
          if (gone && !existsSync(join(SITE, inTemplate))) return
          if (!gone && statSync(full).isDirectory()) return
          if (gone || REBUILD.test(inTemplate)) reinstall = true
          else direct.add(inTemplate)
        } else reinstall = true
        clearTimeout(pending)
        pending = setTimeout(flush, 400)
      })
    }
    say(`слежу за ${WATCHED.join(', ')}: правьте шаблон, витрина подхватит сама`)
  }
}

if (args.includes('--save-look')) await saveLook()
else start()
