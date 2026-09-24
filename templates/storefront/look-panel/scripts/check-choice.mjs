/* Проверка выбранного вида до публикации (PANEL.md, шаг 3).

   Отдельно от `check:look` (та доказывает, что панель снимается). Здесь —
   годится ли сочетание. Сначала правило сайта по значениям
   (lib/look-values.ts, lib/look-rule.ts) и покрытие — вид даёт значение
   каждому свойству сайта (lib/look-slots.json, И353), без отрисовки, сразу. Потом
   `check:craft` на трёх страницах основного языка — главная, первая полка
   (масла), первый товар полки — в обеих темах, на всех ширинах, с видом,
   поставленным черновым режимом Next и черновиком источника, как его видит
   заказчик. Вердикт — храповиком, как у самой `check:craft`: вид годится,
   если не добавил нарушений к тому, с чем его сравнивают, — к
   опубликованному виду, а опубликованный — к стилям самого сайта. Долг,
   который уже есть и видом не вызван, называется отдельно. Вердикт словами.

     npm run check:choice                       опубликованный вид (look.json)
     npm run check:choice -- '<скопированный выбор>'   этот выбор (черновиком;
                                                  прежний черновик вернётся)
     npm run check:choice -- --draft            текущий черновик как есть
   Сервер — SITE (по умолчанию http://localhost:3020), с LOOK_PICKER=on. */
import { existsSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { acceptLook } from '../../lib/look-rule.ts'
import { lookCss } from '../../lib/look-values.ts'
import { compose, clashes, complete, title, uncovered } from '../ui/choice.mjs'
import { fetchFonts } from './fonts.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SITE = (process.env.SITE ?? 'http://localhost:3020').replace(/\/+$/, '')
const SAMPLE = join(ROOT, 'lib/source/sample')
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))
const catalog = read('look-panel/ui/catalog.json')
const { slots, facts } = read('lib/look-slots.json')
const HEADERS = [...readFileSync(join(ROOT, 'lib/headers.ts'), 'utf8').match(/HEADERS = \[([\s\S]*?)\]/)[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
const LANG = readFileSync(join(ROOT, 'lib/locale.ts'), 'utf8').match(/DEFAULT_LANG: Lang = '([a-z-]+)'/)?.[1] ?? 'en'
const DRAFT = join(SAMPLE, 'look.draft.json')

/** Провал — исключением: черновик заказчика возвращается в `finally`. */
class Failure extends Error { constructor(lines) { super('choice'); this.lines = lines } }
const fail = (lines) => { throw new Failure(lines) }

/** Выбор из строки: JSON как его копирует панель, или то же без кавычек
 *  (PowerShell снимает их у аргумента): {palette:Аптека,button:Пилюля}. */
function parseChoice(text) {
  try { return JSON.parse(text) } catch { /* ниже — без кавычек */ }
  const body = text.trim().replace(/^\{|\}$/g, '')
  return Object.fromEntries(body.split(',').map((kv) => kv.split(':').map((x) => x.trim().replace(/^['"]|['"]$/g, ''))).filter(([k, v]) => k && v))
}

/** Вид из выбора: собран из каталога, шрифты скачаны. */
async function lookOfChoice(args) {
  const given = parseChoice(args.join(' '))
  const unknown = Object.entries(given).filter(([f, id]) => !catalog.groups[f]?.some((o) => o.id === id))
  if (unknown.length) fail(unknown.map(([f, id]) => `${f}: «${id}» — такого варианта в каталоге панели нет`))
  const chosen = complete({ ...(read('lib/source/sample/look.json').names ?? {}), ...given }, catalog)
  const bad = clashes(chosen, catalog.pairs)
  if (bad.length) fail(bad.map((p) => `${title(catalog, p.x.field, p.x.id)} (${p.x.field}) не носится с ${title(catalog, p.y.field, p.y.id)} (${p.y.field}): ${p.why}`))
  const { look, need } = compose(chosen, catalog)
  return { ...look, fonts: await fetchFonts(need, join(ROOT, 'public/fonts')) }
}

/** Черновик → черновой режим: cookie, с которыми сайт рисует черновик. */
async function asDraft(look) {
  if (look) writeFileSync(DRAFT, JSON.stringify(look, null, 2) + '\n')
  /* Второй раз — не из вежливости: соединение, оставшееся от прошлого
     запроса, сервер закрывает через 5 с, и POST по нему падает. */
  const post = () => fetch(`${SITE}/look-panel/preview`, { method: 'POST' })
  const res = await post().catch(post).catch((e) => { fail([`${SITE}/look-panel/preview не ответил (${e.cause?.code ?? e.message}) — сервер поднят и LOOK_PICKER=on?`]) })
  if (!res.ok) fail([`${SITE}/look-panel/preview ответил ${res.status} — LOOK_PICKER=on?`])
  return res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
}

/** Сайт рисует именно этот вид: блок вида и шапка на главной. */
async function shows(look, cookie) {
  const res = await fetch(`${SITE}/${LANG}`, { headers: cookie ? { cookie } : {} })
  if (!res.ok) fail([`/${LANG} ответила ${res.status} — страница не открывается`])
  const html = await res.text()
  if ((html.match(/<style[^>]*data-href="look"[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? null) !== lookCss(look)) fail([`сайт рисует не этот вид: блок <style href="look"> на /${LANG} не совпал с проверяемым`])
  if (!html.includes(`data-variant="${look.header}"`)) fail([`на /${LANG} не та шапка: ждали «${look.header}»`])
  if (!html.includes(`data-card="${look.card}"`)) fail([`на /${LANG} не та карточка товара: ждали «${look.card}»`])
}

/** check:craft на трёх страницах → находки по семьям. */
async function craft(pages, cookie) {
  const out = join(mkdtempSync(join(tmpdir(), 'look-choice-')), 'craft.json')
  const run = spawnSync(process.execPath, [join(ROOT, 'tools/check-craft.mjs'), '--pages', pages.join(','), '--json', out], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, SITE, CRAFT_COOKIE: cookie },
  })
  if (run.status !== 0 || !existsSync(out)) fail([`check:craft не отработал (код ${run.status}):`, ...(run.stdout + run.stderr).trim().split('\n').slice(-6)])
  return JSON.parse(readFileSync(out, 'utf8'))
}

async function check(mode, args) {
  const raw = mode === 'choice' ? await lookOfChoice(args) : read(`lib/source/sample/${mode === 'draft' ? 'look.draft.json' : 'look.json'}`)
  /* Правило сайта — то же, что принимает вид на сервере. */
  const { look, notes } = acceptLook(raw, slots, facts)
  if (notes.length) fail(notes.map((n) => `${n.what} ${n.why}`))
  /* Вид покрывает каждое свойство сайта (И353): не данное взяло бы
     умолчание стилей — краску другой палитры рядом с выбранной. */
  const bare = uncovered(raw.vars, slots)
  if (bare.length) fail([`вид не даёт значения ${bare.length} свойствам сайта (${bare.slice(0, 6).join(', ')}${bare.length > 6 ? ' …' : ''}): они взяли бы умолчания стилей — чужие этому выбору`,
    mode === 'published' ? 'пересчитать опубликованный вид из его имён: npm run look:catalog -- --from <папка набора> (И352)' : 'выбрать ещё раз в панели: черновик соберётся из имён нынешним каталогом'])
  console.log(`Проверяю вид: ${Object.entries(look.names).map(([f, id]) => `${f} ${title(catalog, f, id)}`).join(' · ') || '(имена не записаны)'}`)

  const { CATEGORIES, PRODUCTS } = await import('../../tools/routes.mjs')
  const shelf = CATEGORIES[0]
  const pages = [`/${LANG}`, `/${LANG}/catalog/${shelf}`, `/${LANG}/product/${PRODUCTS.find((p) => p.cat === shelf)?.id}`]
  console.log(`check:craft: ${pages.join(', ')} — обе темы, все ширины`)

  /* Проверяемый вид и то, с чем его сравнивают. */
  let now
  let ref
  let against
  if (mode === 'published') {
    await shows(look, '')
    now = await craft(pages, '')
    const cookie = await asDraft({ header: HEADERS[0], vars: {}, fonts: [], names: {} })
    ref = await craft(pages, cookie)
    against = 'стилей самого сайта'
  } else {
    const cookie = await asDraft(mode === 'choice' ? raw : null)
    await shows(look, cookie)
    now = await craft(pages, cookie)
    ref = await craft(pages, '')
    against = 'опубликованного вида'
  }
  const rest = (list, base) => {
    const left = [...base]
    return list.filter((l) => { const i = left.indexOf(l); if (i < 0) return true; left.splice(i, 1); return false })
  }
  /* Счёт по семьям, как у храповика `check:craft`: строка находки несёт
     размеры, и другой ритм меняет её текст, не добавляя нарушения. */
  const worse = Object.entries(now.found).filter(([family, list]) => list.length > (ref.found[family] ?? []).length)
  const debt = Object.entries(now.found).filter(([, list]) => list.length).map(([family, list]) => `${now.names[family]} — ${list.length}`)
  if (worse.length) fail(worse.flatMap(([family, list]) => [`${now.names[family]} — ${list.length}, у ${against} ${(ref.found[family] ?? []).length}:`, ...rest(list, ref.found[family] ?? []).slice(0, 4).map((l) => `   ${l}`)]))
  console.log(`\n✓ ГОДИТСЯ — можно публиковать. Правило сайта чисто; ${pages.length} страницы, обе темы, все ширины — нарушений сверх того, что есть у ${against}, нет.`)
  if (debt.length) console.log(`  Долг, который уже есть и выбором не вызван (чинится отдельно): ${debt.join('; ')}.`)
}

const args = process.argv.slice(2)
const mode = args.includes('--draft') ? 'draft' : args.length ? 'choice' : 'published'
const before = existsSync(DRAFT) ? readFileSync(DRAFT, 'utf8') : null
try {
  await check(mode, args)
} catch (e) {
  if (!(e instanceof Failure)) throw e
  console.error(`\n✗ НЕ ГОДИТСЯ — не публиковать.\n${e.lines.map((l) => `  · ${l}`).join('\n')}`)
  process.exitCode = 1
} finally {
  /* Проверка писала черновик — вернуть черновик заказчика. */
  if (mode !== 'draft') {
    if (before === null) rmSync(DRAFT, { force: true })
    else writeFileSync(DRAFT, before)
  }
}
