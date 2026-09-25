/**
 * Открывается ли каждая страница — в РАЗРАБОТКЕ, а не только в сборке.
 *
 * Заведено по дефекту соседнего магазина, и дефект прожил в `main` восемь
 * дней: `<Image>` с `fill` и `width` разом. Боевой сайт отдавал 200, а
 * главная, каталог и поиск в разработке падали — работать над ними было
 * нельзя. Обе отрисованные проверки ходили по собранной витрине и обе были
 * зелёные: ответ у них честный, он просто про другую подачу.
 *
 * Часть проверок фреймворк делает только в `dev`. Значит просить каждую
 * страницу дерева маршрутов надо и там — иначе «зелено» означает «зелено на
 * одной из трёх подач», а сломанной оказывается та, в которой работают.
 *
 * Браузера здесь нет и снимков нет: спрашивается только код ответа и то, что
 * в ответе настоящая страница, а не экран ошибки. Сто восемь адресов
 * проходят за полминуты.
 *
 *   node tools/check-open.mjs            поднять `next dev` и обойти всё
 *   node tools/check-open.mjs --built    обойти уже поднятый сайт (SITE=…)
 *
 * Ставится ПЕРЕД сборкой: обе пишут в `.next`, и последней должна
 * заканчиваться сборка.
 */

import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { all, sample, shapes, langSegment, LOCALES, DEFAULT_LANG, useLive } from './routes.mjs'
import { whyNotOwn, whyNotQuiet, missKind } from './not-found.mjs'
import { PROBES } from './kit-config.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** СВОБОДНЫЙ порт, а не один и тот же навсегда.
 *
 *  Постоянное число (3197) держалось до первого раза, когда прошлый прогон
 *  не успел за собой прибрать: на занятом порту `next dev` либо спрашивает
 *  человека, брать ли соседний, либо отдаёт чужой сервер — и проверка висит
 *  без единой строчки в отчёте. На своём ранере это стоило получаса очереди:
 *  машина одна, и вставший прогон держит её целиком.
 *
 *  Порт спрашивается у системы: она отдаёт заведомо свободный. `PORT` в
 *  окружении остаётся ручкой — им пользуются, когда порт нужно знать заранее.
 */
const freePort = () => new Promise((done, fail) => {
  const probe = createServer()
  probe.once('error', fail)
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address()
    probe.close(() => done(port))
  })
})

const PORT = Number(process.env.PORT ?? await freePort())
const BASE = process.env.SITE ?? `http://127.0.0.1:${PORT}`
const built = process.argv.includes('--built')
/* Список адресов — после того, как сайт поднят: у внешнего источника
   (SOURCE=vendure) адреса полок и товаров знает сам сайт, его карта (И414). */
let urls = []

let dev = null

/** Убить сервер вместе со всем, что он под собой поднял.
 *
 *  Объявлено ДО запуска: ветка «не поднялся» зовёт его первой, и объявление
 *  ниже роняло проверку `ReferenceError: Cannot access 'stop' before
 *  initialization` вместо отчёта о причине (И240). На Windows отрицательного
 *  pid группы нет — дерево гасит `taskkill /T`. */
const stop = () => {
  if (!dev || dev.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(dev.pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  try { process.kill(-dev.pid, 'SIGTERM') } catch { dev.kill('SIGTERM') }
}
process.on('exit', stop)

if (!built) {
  /* Своей группой процессов — и убивать её целиком. `next dev` поднимает
     под собой ещё один процесс, и SIGTERM одному лишь родителю оставляет
     сервер жить: проверка тогда не завершается вовсе, а выглядит как
     «долго идёт». Полчаса ушло ровно на это. */
  const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')
  dev = spawn(process.execPath, [nextBin, 'dev', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    windowsHide: true,
    env: { ...process.env, BROWSER: 'none' },
  })
  const log = []
  dev.stdout.on('data', (d) => log.push(String(d)))
  dev.stderr.on('data', (d) => log.push(String(d)))

  /* Ждём не «сколько-нибудь миллисекунд», а признак: сервер ответил. Число
     миллисекунд врёт на любой машине, кроме той, где его подобрали. */
  const until = Date.now() + 90_000
  let up = false
  while (Date.now() < until && !up) {
    await new Promise((r) => setTimeout(r, 500))
    if (dev.exitCode !== null) break
    up = await fetch(BASE, { redirect: 'manual' }).then(() => true, () => false)
  }
  if (!up) {
    console.error(dev.exitCode !== null
      ? `\n✗ next dev завершился с кодом ${dev.exitCode}, не ответив на ${BASE}.`
      : `\n✗ next dev не поднялся за 90 секунд на ${BASE}.`)
    console.error(log.join('').split('\n').slice(-20).map((l) => `    ${l}`).join('\n'))
    stop()
    process.exit(1)
  }
}


await useLive(BASE)
urls = all()

const bad = []

/** Один запрос со сроком. */
const ask = (url) =>
  fetch(BASE + url, { redirect: 'manual', signal: AbortSignal.timeout(60_000) })

/* Разогрев: по одному адресу на форму маршрута, ПО ОЧЕРЕДИ.
 *
 * Сервер разработки собирает страницу на первый запрос к ней, и четыре
 * запроса, пришедшие к несобранной форме разом, получают 500 — не потому
 * что страница сломана, а потому что её ещё нет. Первый честный прогон этой
 * проверки так и сказал: «/bg/404 — 500», а тот же адрес в одиночку
 * отдавался с 200.
 *
 * Проверка обязана мерить то, что видит человек, а человек обновляет
 * страницу. Поэтому сперва по разу на форму, и только потом обход. */
for (const url of built ? [] : sample()) await ask(url).catch(() => {})

/* По четыре разом: формы уже собраны, дальше идёт чтение готового. */
const queue = [...urls]
const worker = async () => {
  for (let url = queue.shift(); url; url = queue.shift()) {
    let res
    try {
      /* Свой срок у каждого запроса: сервер, задумавшийся на одном адресе,
         иначе останавливает весь обход и выглядит как медленная проверка. */
      res = await ask(url)
      /* Второй заход на ответ сервера: страница, собирающаяся прямо сейчас,
         отдаёт 500 один раз. Сломанная отдаёт его оба. */
      if (res.status >= 500) res = await ask(url)
    } catch (e) {
      bad.push(`${url} — не ответил: ${e.message}`)
      continue
    }
    const html = await res.text()
    if (res.status !== 200) { bad.push(`${url} — ${res.status}`); continue }
    /* Экран ошибки разработки отдаётся с кодом 200: код тут не признак.
       Признак — что в ответе нет страницы сайта. */
    if (!/<main[\s>]/.test(html)) {
      const why = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'без <main>'
      bad.push(`${url} — 200, но это не страница: ${why.slice(0, 70)}`)
    }
  }
}
await Promise.all([worker(), worker(), worker(), worker()])

/* Несуществующая страница — тоже страница (И257).
 *
 * Обход выше ходит только по адресам, которые ЕСТЬ, и потому ни разу не
 * видел, чем сайт отвечает на адрес, которого нет. На первой витрине это
 * была встроенная английская страница Next без языка — на каждом промахе, и
 * все проверки были зелёные.
 *
 * Пробы берутся из дерева маршрутов, а не набираются рукой: на каждом языке
 * адрес под языком (`/ro/__kit-missing__`), адрес в один сегмент там, где
 * язык — приставка (`/__kit-missing__`: `/contact` и `/bg` падали в макет
 * языка и отдавали пустую страницу ошибки), и промах товара, если маршрут
 * товара в дереве есть. Род промаха решает дерево (`missKind`): форма
 * маршрута принимает адрес — промах данных, 404 и `noindex`; не принимает —
 * адрес мимо дерева, своя страница с кодом 404 на языке адреса. Причину
 * провала формулирует `tools/not-found.mjs`, здесь её только печатают.
 *
 * Пробы строгие — чужая страница «не найдено» настоящий дефект, — но у
 * сайта, который набор застал готовым, их провал приходит в день
 * обновления, на том же коде, что вчера был зелёным. Поэтому провал
 * печатает рецепт, а отказ возможен — только словом проекта в
 * kit.config.json (`"probes": { "notFound": false }`), и проверка говорит
 * вслух, что пробы пропущены. */
const SKIPPED = !PROBES.notFound
const MISSING = '__kit-missing__'
const tree = shapes()
const langSeg = langSegment()
/* Сайт без языка в адресе отвечает на основном; сайт без языков — любым. */
const langs = langSeg ? LOCALES : [LOCALES.length ? DEFAULT_LANG : '']
const fill = (shape, lang) => shape.split('/').map((seg) =>
  seg === '[lang]' ? lang
    : seg === '[locale]' ? (lang === DEFAULT_LANG ? '' : lang)
      : /^\[.*\]$/.test(seg) ? MISSING : seg).join('/').replace(/\/{2,}/g, '/') || '/'
const product = tree.find((s) => /\/product\/\[[^\]]+\]$/.test(s))
/* Адрес и язык, которым на нём обязан ответить сайт. */
const probes = new Map()
for (const lang of SKIPPED ? [] : langs) {
  probes.set(fill(`${langSeg ? `/${langSeg}` : ''}/${MISSING}`, lang), lang)
  if (product) probes.set(fill(product, lang), lang)
}
/* Один сегмент под приставкой языка: чужое слово на месте языка. Отвечает
   основным языком. У `[locale]` этот адрес — промах основного языка, он уже
   в списке. */
if (langSeg === '[lang]' && !SKIPPED) probes.set(`/${MISSING}`, DEFAULT_LANG)
const lost = []
const tally = { stray: 0, data: 0 }
for (const [url, lang] of probes) {
  const kind = missKind(url, tree, LOCALES)
  tally[kind]++
  try {
    let res = await ask(url)
    if (res.status >= 500) res = await ask(url)
    const got = { status: res.status, html: await res.text(), lang }
    const why = kind === 'data' ? whyNotQuiet(got) : whyNotOwn(got)
    if (why) {
      lost.push(`${url} — ${why}: ${kind === 'data'
        ? 'промах данных обязан отвечать кодом 404 и noindex'
        : `адрес мимо дерева обязан отвечать своей страницей с кодом 404${lang ? ` на «${lang}»` : ''}`}`)
    }
  } catch (e) {
    lost.push(`${url} — не ответил: ${e.message}`)
  }
}

stop()

/* Пропуск называется вслух и при провале обхода: иначе отчёт о провале
   выглядел бы полным. */
const SKIP_LINE = '· пробы «не найдено» пропущены словом проекта: kit.config.json → "probes": { "notFound": false } (И257)'

if (bad.length || lost.length) {
  if (bad.length) {
    console.error(`\n✗ Не открылось: ${bad.length} из ${urls.length}`)
    for (const b of bad.slice(0, 20)) console.error(`    ${b}`)
    if (bad.length > 20) console.error(`    …и ещё ${bad.length - 20}`)
  }
  if (lost.length) {
    console.error('\n✗ Несуществующая страница отвечает не так (И257):')
    for (const b of lost) console.error(`    ${b}`)
    /* Рецепт — тот, по которому это починено в витрине набора
       (templates/storefront); разбор — docs/rules.md, И257. */
    console.error('\n  Как чинится (docs/rules.md, И257):')
    console.error('    · адрес мимо дерева — своя страница, отрисованная сервером: app/global-not-found.tsx')
    console.error('      и experimental: { globalNotFound: true } в next.config;')
    console.error('    · язык этой страницы — из адреса: proxy.ts копирует язык первого сегмента')
    console.error('      в заголовок запроса, страница читает его через headers();')
    console.error('    · язык — закрытый список: dynamicParams = false в макете языка')
    console.error('      (app/[lang]/layout.tsx), чужое слово на месте языка уходит мимо дерева;')
    console.error('    · промах данных — notFound() и noindex: 404, поиск адрес не запомнит.')
    console.error('  Отказаться от проб можно только словом проекта: kit.config.json →')
    console.error('  "probes": { "notFound": false } — и проверка скажет, что они пропущены.')
  }
  if (SKIPPED) console.error(`\n${SKIP_LINE}`)
  console.error('\n  Это НЕ храповик: страница, которая не открывается, — не долг,')
  console.error('  который платят в своём темпе.')
  process.exit(1)
}

console.log(`· открылись все ${urls.length} адресов (${built ? 'собранный сайт' : 'next dev'})`)
if (SKIPPED) console.log(SKIP_LINE)
else {
  console.log(`· «не найдено»: адресов мимо дерева ${tally.stray} — своя страница с кодом 404${langs[0] ? ` (${langs.join(', ')})` : ''}; ` +
    (product ? `промахов данных ${tally.data} — 404 и noindex` : 'проба промаха данных пропущена: в дереве нет маршрута товара (…/product/[id])'))
}
/* Явный выход: соединения `fetch` держат цикл событий ещё несколько секунд
   после последнего ответа, и проверка выглядела бы висящей. */
process.exit(0)
