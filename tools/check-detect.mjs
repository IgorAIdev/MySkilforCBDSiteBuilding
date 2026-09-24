/**
 * Детектор impeccable по отрисованной странице — `npm run check:detect` (И310).
 *
 * Заведено 24.09.2026. Дизайн мерился только по файлу: семьи `check:design`
 * переписаны из справочников impeccable и видят разметку и стили. То, что
 * получается на экране из каскада и раскладки, — карточка в карточке,
 * прилипшая к краю полоса, первый экран одной колонкой, прижатый заголовок,
 * невидимое в покое, — не мерило ничто, хотя у impeccable есть детектор
 * ровно на это. Набор его не вёз: запускатель скачивает бинарь при первом
 * запуске.
 *
 * Теперь вендорена страничная сборка движка — один файл, ядро правил
 * вшито в него как WebAssembly, без сети и без запускателя
 * (`tools/vendor/impeccable/`: VENDOR.json — тег, коммит, версия, хеши;
 * SOURCE.md — лицензия и разбор на сеть). Судьба каждого его правила —
 * `tools/detect-families.mjs`: семья набора, выключено (на вопрос уже
 * отвечает набор) или только печатается.
 *
 * Как меряется страница:
 *
 *   1. открыть на ширине (375 — телефон с пальцем, 1440 — стол) и в теме
 *      (светлая, тёмная — `prefers-color-scheme`). Чужие адреса закрыты с
 *      первого запроса: пускается только сам сайт (`SITE=`);
 *   2. прокрутить до низа и вернуться — у каждого раскрытия по прокрутке был
 *      шанс сработать; ошибки скриптов за загрузку и прокрутку записываются;
 *   3. остановить показ слайдов и дождаться конца анимаций (`still`, общий с
 *      `check:craft`) — замер по неподвижной странице;
 *   4. ЗАКРЫТЬ СЕТЬ совсем: всё, что страница попросит дальше, обрывается.
 *      Детектор сети не просит (SOURCE.md); чужой адрес в этой фазе — находка
 *      «детектор пытался выйти в сеть», и проверка красная;
 *   5. убрать отработавшие `<script>`: их текст — не стиль, а Next везёт в
 *      каждой странице CSS своей запасной страницы ошибки
 *      (`body{color:#fff;background:#000}`), и разбор разметки детектором
 *      читал бы его как стиль сайта;
 *   6. вставить сборку с выключенными правилами (`DETECT_OFF`), без
 *      самозапуска и без замера контраста по снимкам (контраст — в
 *      `check:craft`; замер по снимкам грузил бы картинки) и позвать
 *      `impeccableDetect()`: он только считает, накладок не рисует;
 *   7. «невидимо в покое» — замером сборки (`impeccableMeasureHiddenText`)
 *      после прокрутки, «ошибка скрипта» — по `pageerror`: в странице сборка
 *      их не решает, их решает движок по адресу, и проход делает то же.
 *
 * Находка — правило × элемент × страница: на двух ширинах и в двух темах
 * она одна, где видна — пишется рядом. Скрытое на этой ширине (закрытая
 * шторка, меню другой ширины) не считается: его не видит покупатель.
 *
 * ХРАПОВИК по страницам: база `tools/detect-baseline.json` — счёт семей на
 * каждой странице; страница сверяется со своей строкой, отсутствующая —
 * ноль. Поэтому и узкий прогон выносит вердикт. Правило заказчика о
 * прогонах: в ходе правки — только тронутые страницы основного языка
 * (`--page` / `--pages`), полный — перед сдачей.
 *
 *   SITE=http://localhost:3020 node tools/check-detect.mjs          всё дерево
 *   … --pages /en,/en/catalog   или   --page /en                      узко
 *   … --list [семья|правило]                                          находки
 *   … --update                                                        записать базу
 *   … --json                                                          данными
 *
 * Выход 2 — «не проверено», как у других отрисованных: нет SITE=, нет
 * Playwright, файл сборки не совпал с хешем, вызов сборки незнаком, ядро не
 * запустилось.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPlaywright, still } from './browser.mjs'
import {
  VENDOR, DETECTOR, REGISTRY, DETECT_RULES, DETECT_FAMILIES, DETECT_LABELS, DETECT_MAP, DETECT_OFF, DETECT_ADVISORY,
  HIDDEN_AT_REST,
} from './detect-families.mjs'
import { sample, personal } from './routes.mjs'
import { sessionOf } from './sessions.mjs'
import { SESSIONS } from './kit-config.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASELINE = join(ROOT, 'tools/detect-baseline.json')
const rel = (p) => relative(ROOT, p).split('\\').join('/')
const WHOLE = 'страница целиком'

const notChecked = (why, how) => {
  console.error(`\n✗ Детектор impeccable НЕ ПРОВЕДЁН: ${why}`)
  if (how) console.error(`    ${how}`)
  process.exit(2)
}

const flag = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1] ?? null
}
const ONLY_PAGE = flag('--page')
const ONLY_PAGES = (flag('--pages') ?? '').split(',').map((x) => x.trim()).filter(Boolean)
const NARROW = Boolean(ONLY_PAGE || ONLY_PAGES.length)
const ASKED = ONLY_PAGES.length ? ONLY_PAGES.join(', ') : ONLY_PAGE
const SITE = (process.env.SITE ?? '').replace(/\/+$/, '')

if (!SITE) {
  notChecked('нет SITE= — сайт не назван, мерить нечего',
    'Поднять сайт и: SITE=http://localhost:3020 npm run check:detect (в ходе правки — узко: -- --pages /en,/en/catalog)')
}
const ORIGIN = new URL(SITE).origin

/* ── сборка: тот ли файл ────────────────────────────────────────────────── */

if (!VENDOR || !DETECTOR) notChecked('нет tools/vendor/impeccable/VENDOR.json — записи о сборке')
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
for (const [file, pinned] of [[DETECTOR, VENDOR.sha256], [REGISTRY, VENDOR.registrySha256]]) {
  const got = sha(file)
  if (got !== pinned) {
    notChecked(`${rel(file)} не совпал с закреплённым: SHA-256 ${got.slice(0, 16)}… против ${String(pinned).slice(0, 16)}… в VENDOR.json`,
      'Файл заменён без записи. Разобрать новый на сеть и записать хеш — tools/vendor/impeccable/SOURCE.md, «Как обновить».')
  }
}
if (VENDOR.api !== 'impeccableDetect') {
  notChecked(`вызов сборки «${VENDOR.api}» (VENDOR.json, api) проходу незнаком`,
    'Проход зовёт impeccableDetect() и impeccableMeasureHiddenText(); другой вызов — сверить форму ответа и дописать tools/check-detect.mjs.')
}
const SOURCE = readFileSync(DETECTOR, 'utf8')
const OFF_IDS = Object.keys(DETECT_OFF)

/* ── страницы: дерево маршрутов ────────────────────────────────────────── */

/* У сайта без языка в адресе корень приходит из дерева пустой строкой. */
const TREE = [...sample(), ...personal()].map((p) => p || '/')
const PAGES = TREE.filter((p) => (ONLY_PAGES.length ? ONLY_PAGES.includes(p) : !ONLY_PAGE || p.includes(ONLY_PAGE)))
if (!PAGES.length || (ONLY_PAGES.length && PAGES.length !== ONLY_PAGES.length)) {
  console.error(ASKED
    ? `✗ Под «${ASKED}» не подошли адреса дерева${PAGES.length ? ` (подошли: ${PAGES.join(', ')})` : ''}. Список: node tools/routes.mjs --sample`
    : '✗ Дерево маршрутов пусто (нет app/**/page.tsx) — открывать нечего.')
  process.exit(1)
}

/* ── прогон ─────────────────────────────────────────────────────────────── */

const WIDTHS = [375, 1440]
const THEMES = ['light', 'dark']
const PHONE = 700
const LANES = Math.max(1, Number(process.env.DETECT_LANES ?? 4))

const { chromium } = await loadPlaywright()
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {})
const started = Date.now()

/* Сеть: пока страница грузится и прокручивается — только сам сайт; когда
   вставлен детектор — ничего. Фаза страницы — здесь. */
const phase = new WeakMap()
const shut = { load: new Set(), detect: new Set(), leak: new Set() }
const guard = (route) => {
  const req = route.request()
  const url = req.url()
  const own = url.startsWith(`${ORIGIN}/`)
  let page = null
  try { page = req.frame().page() } catch { /* запрос без кадра (служебный воркер) — ничей */ }
  const detecting = page && phase.get(page) === 'detect'
  if (!detecting && own) return route.continue().catch(() => {})
  ;(detecting ? (own ? shut.detect : shut.leak) : shut.load).add(url)
  return route.abort().catch(() => {})
}

const envs = []
for (const width of WIDTHS) {
  for (const theme of THEMES) {
    const phone = width < PHONE
    const context = await browser.newContext({
      colorScheme: theme,
      viewport: { width, height: phone ? 812 : 900 },
      /* Ядро детектора — WebAssembly; политика страницы без
         'wasm-unsafe-eval' не дала бы ему запуститься. Меряется вид, а не
         политика. */
      bypassCSP: true,
      ...(phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}),
    })
    await context.route('**/*', guard)
    envs.push({ name: `${width}·${theme === 'light' ? 'светлая' : 'тёмная'}`, context })
  }
}

const byPage = new Map(PAGES.map((p) => [p, new Map()]))
let dead = null
let broken = null

/** Прокрутить до низа шагами и вернуться: раскрытия по прокрутке срабатывают. */
const sweep = () => new Promise((resolve) => {
  const step = Math.max(200, Math.round(innerHeight * 0.8))
  let y = 0, n = 0
  const tick = () => {
    const end = document.documentElement.scrollHeight
    if (y >= end || n++ > 80) {
      scrollTo(0, end)
      setTimeout(() => { scrollTo(0, 0); setTimeout(resolve, 120) }, 200)
      return
    }
    scrollTo(0, y)
    y += step
    requestAnimationFrame(() => setTimeout(tick, 60))
  }
  tick()
})

async function measure({ path, env }) {
  if (dead || broken) return
  const page = await env.context.newPage()
  phase.set(page, 'load')
  const errors = []
  page.on('pageerror', (e) => { if (phase.get(page) !== 'detect') errors.push(String(e.message).split('\n')[0]) })
  try {
    const { path: clean, cookie } = sessionOf(path, SESSIONS.cookie)
    if (cookie) await page.setExtraHTTPHeaders({ cookie })
    let res
    try {
      res = await page.goto(SITE + clean, { waitUntil: 'networkidle', timeout: 60_000 })
    } catch (e) {
      dead ??= `${SITE}${path} не открылся: ${String(e.message).split('\n')[0]} — сервер жив?`
      return
    }
    if (res && res.status() >= 500) { dead ??= `${SITE}${path} ответил ${res.status()} — это сервер, а не находка`; return }
    await page.evaluate(sweep)
    await page.waitForLoadState('networkidle').catch(() => {})
    await still(page)
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})))).catch(() => {})
    await page.waitForTimeout(150)

    phase.set(page, 'detect')
    await page.evaluate((off) => {
      for (const s of document.querySelectorAll('script')) s.remove()
      window.__IMPECCABLE_CONFIG__ = { autoScan: false, visualContrast: false, disabledRules: off }
    }, OFF_IDS)
    await page.evaluate(SOURCE)
    const out = await page.evaluate(() => ({
      core: window.__impeccableCoreError ?? null,
      groups: window.__impeccableCoreError ? [] : window.impeccableDetect(),
      hidden: window.__impeccableCoreError ? null : window.impeccableMeasureHiddenText(),
    }))
    if (out.core) { broken ??= out.core; return }

    const found = byPage.get(path)
    const add = (rule, selector, detail) => {
      const key = `${rule}\u0000${selector}`
      const hit = found.get(key) ?? { page: path, rule, selector, detail, seen: [] }
      if (!hit.seen.includes(env.name)) hit.seen.push(env.name)
      found.set(key, hit)
    }
    for (const g of out.groups) {
      if (g.isHidden) continue
      for (const f of g.findings) if (!OFF_IDS.includes(f.type)) add(f.type, g.isPageLevel ? WHOLE : g.selector, f.detail)
    }
    const h = out.hidden
    if (h && h.totalChars >= HIDDEN_AT_REST.minChars && h.hiddenChars / h.totalChars >= HIDDEN_AT_REST.share) {
      add('content-hidden-at-rest', WHOLE, `после прокрутки невидимо ${Math.round((h.hiddenChars / h.totalChars) * 100)}% текста `
        + `(${h.hiddenChars} из ${h.totalChars} знаков): «${(h.hiddenSamples ?? [])[0] ?? ''}»`)
    }
    if (errors.length) add('script-error', WHOLE, `${errors.length} ошибк(и) при загрузке: ${errors[0]}`)
  } finally {
    await page.close().catch(() => {})
  }
}

const jobs = PAGES.flatMap((path) => envs.map((env) => ({ path, env })))
let next = 0
try {
  await Promise.all(Array.from({ length: Math.min(LANES, jobs.length) }, async () => {
    for (let i = next++; i < jobs.length; i = next++) await measure(jobs[i])
  }))
} catch (e) {
  await browser.close()
  console.error(`\n✗ Детектор упал на странице: ${e.message}`)
  process.exit(1)
}
await browser.close()
if (broken) notChecked(`ядро детектора не запустилось: ${broken}`)
if (dead) {
  console.error(`\n✗ ${dead}\n    Поднять сайт заново и повторить: npm run build && npm run start`)
  process.exit(1)
}

/* ── счёт ───────────────────────────────────────────────────────────────── */

const all = [...byPage.values()].flatMap((m) => [...m.values()])
  .map((f) => ({ ...f, seen: f.seen.sort() }))
  .sort((a, b) => a.page.localeCompare(b.page) || a.rule.localeCompare(b.rule) || a.selector.localeCompare(b.selector))
const counted = all.filter((f) => DETECT_MAP[f.rule])
const advisory = all.filter((f) => DETECT_ADVISORY.includes(f.rule))
/* Правило, которого нет в таблице судеб, — сборка и запись разошлись. */
const stray = all.filter((f) => !DETECT_MAP[f.rule] && !DETECT_ADVISORY.includes(f.rule))

const counts = Object.fromEntries(PAGES.map((p) => [p, {}]))
for (const f of counted) {
  const fam = DETECT_MAP[f.rule]
  counts[f.page][fam] = (counts[f.page][fam] ?? 0) + 1
}
const totals = (pages, only) => {
  const out = {}
  for (const [p, fams] of Object.entries(pages)) {
    if (only && !only.includes(p)) continue
    for (const [k, n] of Object.entries(fams)) out[k] = (out[k] ?? 0) + n
  }
  return out
}
const scope = `${PAGES.length} страниц${NARROW ? ` под «${ASKED}»` : ' дерева'} × ${WIDTHS.join(' и ')} × обе темы, `
  + `impeccable ${VENDOR.engine} (${String(VENDOR.commit).slice(0, 7)}), ${Math.round((Date.now() - started) / 1000)} с`
const line = (f) => `    ${f.page}  ${f.selector}  — ${f.rule}: ${f.detail}  [${f.seen.join(', ')}]`
const list = (set) => [...set].sort()

/* Сеть. Своё, попрошенное при закрытых дверях, — клон документа, по
   которому детектор читает разметку, заново просит файлы страницы (спрайт
   знаков у `<use href>`). Чужое при загрузке — закрыто, и замер шёл без
   него. Чужое при вставленном детекторе — находка, и проверка красная. */
const printNet = () => {
  if (shut.detect.size) console.log(`\n· сеть закрыта на время замера; клон страницы снова просил свои файлы (${shut.detect.size}): ${list(shut.detect).slice(0, 4).map((u) => u.slice(ORIGIN.length)).join(', ')}`)
  if (shut.load.size) {
    console.log(`\n· чужие адреса закрыты с первого запроса — страница мерилась без них (${shut.load.size}):`)
    for (const u of list(shut.load).slice(0, 6)) console.log(`    ${u}`)
  }
}
const printAdvisory = () => {
  if (!advisory.length) return
  console.log(`\nТолько печатается, не считается (${advisory.length}) — вкус брифа решает заказчик глазами; про тексты — строкой в docs/open.md, тексты заказчика:`)
  for (const f of advisory) console.log(line(f))
}

if (shut.leak.size) {
  console.error(`\n✗ детектор пытался выйти в сеть — закрыто (${shut.leak.size}):`)
  for (const u of list(shut.leak).slice(0, 8)) console.error(`    ${u}`)
  console.error('    Сборка просила чужой адрес при вставленном детекторе. Разобрать её заново (tools/vendor/impeccable/SOURCE.md) и не доверять находкам.')
  process.exit(1)
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ pages: counts, found: all, net: { load: list(shut.load), detect: list(shut.detect) }, scope }))
  process.exit(stray.length ? 1 : 0)
}

if (stray.length) {
  console.error(`\n✗ Детектор отдал правила, у которых нет судьбы в tools/detect-families.mjs: ${[...new Set(stray.map((f) => f.rule))].join(', ')}`)
  console.error('    Сборка и запись разошлись: дать каждому правилу семью, выключение или «только печатается».')
  process.exit(1)
}

if (process.argv.includes('--update')) {
  /* Узкий прогон пишет свои страницы и не трогает чужие; полный пишет
     дерево целиком — ушедшие страницы уходят и из базы. */
  let kept = {}
  if (NARROW) try { kept = JSON.parse(readFileSync(BASELINE, 'utf8')) } catch { kept = {} }
  const merged = { ...kept, ...counts }
  const sorted = Object.fromEntries(Object.keys(merged).sort().map((p) => [p, Object.fromEntries(Object.entries(merged[p]).sort())]))
  writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n')
  const t = totals(counts)
  console.log(`База детектора обновлена${NARROW ? ' по измеренным страницам' : ''}: ${counted.length} находок — ${scope}`)
  for (const k of DETECT_FAMILIES) console.log(`    ${k}: ${t[k] ?? 0} — ${DETECT_LABELS[k]}`)
  printAdvisory()
  printNet()
  process.exit(0)
}

const li = process.argv.indexOf('--list')
if (li !== -1) {
  const pick = process.argv[li + 1]
  const fams = DETECT_FAMILIES.includes(pick) ? [pick] : DETECT_MAP[pick] ? [DETECT_MAP[pick]] : DETECT_FAMILIES
  for (const k of fams) {
    const hits = counted.filter((f) => DETECT_MAP[f.rule] === k && (!DETECT_MAP[pick] || f.rule === pick))
    console.log(`\n${k} — ${DETECT_LABELS[k]} — ${hits.length}`)
    for (const f of hits) console.log(line(f))
  }
  printAdvisory()
  console.log(`\n· детектор impeccable: ${counted.length} находок — ${scope}`)
  printNet()
  process.exit(0)
}

let base
try {
  base = JSON.parse(readFileSync(BASELINE, 'utf8'))
} catch {
  console.error(`Нет ${rel(BASELINE)}. Создать: SITE=${SITE} npm run check:detect -- --update`)
  process.exit(1)
}

const now = totals(counts)
const was = totals(base, PAGES)
let failed = false
for (const k of DETECT_FAMILIES) {
  const grown = PAGES.filter((p) => (counts[p][k] ?? 0) > (base[p]?.[k] ?? 0))
  if (grown.length) {
    failed = true
    console.error(`\n✗ ${k} — ${DETECT_LABELS[k]}: было ${was[k] ?? 0}, стало ${now[k] ?? 0}`)
    for (const p of grown) {
      console.error(`  ${p}: было ${base[p]?.[k] ?? 0}, стало ${counts[p][k]}`)
      for (const f of counted.filter((x) => x.page === p && DETECT_MAP[x.rule] === k).slice(0, 6)) console.error(line(f))
    }
  } else if ((now[k] ?? 0) < (was[k] ?? 0)) {
    console.log(`✓ ${k}: ${was[k]} → ${now[k] ?? 0}`)
  } else if (now[k]) {
    console.log(`· ${k}: ${now[k]} — ${DETECT_LABELS[k]}`)
  }
}
printAdvisory()
printNet()

if (failed) {
  console.error('\nНаходок стало больше. Чинить — дизайнерскими скиллами по порядку (CLAUDE.md,')
  console.error('«Дизайн делается дизайнерскими скиллами»); осознанное исключение — базой:')
  console.error(`SITE=${SITE} npm run check:detect -- --update, с причиной в коммите.`)
  process.exit(1)
}
const wasTotal = Object.values(was).reduce((a, b) => a + b, 0)
console.log(`\n· детектор impeccable: ${counted.length} находок — ${scope}`)
console.log(`  правил в сборке ${DETECT_RULES.length}: считаются ${Object.keys(DETECT_MAP).length}, выключено ${OFF_IDS.length} (отвечает набор), печатается ${DETECT_ADVISORY.length}`)
if (counted.length < wasTotal) {
  console.log(`\nДолг сократился: ${wasTotal} → ${counted.length}. Обновите базу: SITE=${SITE} npm run check:detect -- --update${NARROW ? ` ${ONLY_PAGES.length ? `--pages ${ONLY_PAGES.join(',')}` : `--page ${ONLY_PAGE}`}` : ''}`)
}
