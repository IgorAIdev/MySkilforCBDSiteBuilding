/**
 * Храповик по переносимости.
 *
 * Правило заказчика, сентябрь: «всё, что мы производим, должно быть
 * универсальным и становиться на разный бекенд и движки — WordPress,
 * Shopify, Medusa». Оно не про один файл и не про один этап: сайт будут
 * править дальше, и каждая новая правка либо остаётся переносимой, либо
 * тихо прибивает вёрстку к Next.js.
 *
 * Заведено по счёту. Вопрос был про размеры шрифта, а вскрылось другое:
 * переносимый пакет `packages/ui` просит у себя четырнадцать переменных,
 * которых у него нет, — вся шкала размера в том числе. На сайте это не
 * видно ничем: там переменные объявлены. Видно только у заказчика,
 * открывшего витрину на Shopify, — карточка товара набирается одной
 * величиной, потому что объявление с неизвестной переменной браузер
 * выбрасывает целиком.
 *
 * Это и есть болезнь, от которой лечит эта проверка: расхождение между
 * ДВУМЯ исполнениями одного и того же. Пока исполнение одно, ошибку
 * не видно; в день переноса она вылезает вся сразу, и работа выглядит
 * не переносом, а починкой.
 *
 * Шесть семей, и все — про одно: где вёрстка перестала быть переносимой.
 *
 *   varGone        переносимый слой просит переменную, которой у него нет
 *   twoValues      один токен в двух местах с РАЗНЫМИ значениями
 *   markupDrift    класс есть у одного движка и отсутствует у другого
 *   dataInView     компонент сам берёт список из данных, а не получает его
 *   moneyLiteral   валюта числом в вёрстке — на другом рынке не переедет
 *   engineInShared движок протёк в общий слой (next, react, {{ }}, <?php)
 *   backendInView  компонент сам ходит в бекенд: SDK Vendure/Payload/GraphQL
 *                  или адаптер сайта (lib/vendure, lib/cms, sources) — И248
 *   moneyMath      компонент считает деньги сам (/ 100, toFixed) — И248
 *
 * Режим храповика: падает, только если нарушений стало БОЛЬШЕ. Сегодняшний
 * долг записан в `tools/port-baseline.json` и чинится в день переноса —
 * этап 5, там же стоят ворота «долга по переносимости нет». Новое не
 * заводится с сегодня.
 *
 *   node tools/check-port.mjs              проверить
 *   node tools/check-port.mjs --list       показать находки
 *   node tools/check-port.mjs --update     записать текущие числа как базу
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PORT_FAMILIES, emptyPortBaseline } from './port-families.mjs'
import { CODE_DIRS, BLOCK_DIRS, COMPONENT_DIRS, STYLE_DIRS, LIB, TOKENS } from './kit-config.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASELINE = join(ROOT, 'tools/port-baseline.json')

/* Три слоя, и разница между ними — вся суть проверки.
 *
 *   общий    — то, что обязано работать без движка вообще: простой CSS на
 *              именах классов, сноп значков. Отсюда его берут и Next, и
 *              Liquid, и PHP;
 *   движки   — переходники: Liquid для Shopify, PHP для WordPress. Они
 *              движок и есть, и держать в них можно что угодно своё;
 *   сайт     — этот проект. Ему разрешено всё, кроме одного: быть
 *              единственным местом, где живёт решение.
 */
const SHARED = ['packages']
const ENGINES = ['themes']
/* Папки сайта — из `kit.config.json` проекта или соглашения набора (И168). */
const SITE = [...new Set([...CODE_DIRS, ...STYLE_DIRS])]

const found = Object.fromEntries(PORT_FAMILIES.map((k) => [k, []]))

/* ── чтение ───────────────────────────────────────────────────────────── */

function walk(dir, test, out = []) {
  const full = join(ROOT, dir)
  if (!existsSync(full)) return out
  for (const name of readdirSync(full)) {
    const rel = join(dir, name)
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, test, out)
    else if (test(name)) out.push(rel)
  }
  return out
}

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

/* Комментарий — не код. Тот же приём, что в `check-css.mjs`: режется с
   сохранением длины и переносов, чтобы номера строк считались по смещению
   и сходились с тем, что видно глазом. Без этого абзац про «разошлась с
   каталогом на €30» считался бы ценой в вёрстке. */
const strip = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))

const lineOf = (text, index) => text.slice(0, index).split('\n').length

/**
 * Тела правил, чей селектор — ровно `:root`, на верхнем уровне файла.
 *
 * Считается скобками, а не образцом, и это не придирка. Образец `[^{}]*`
 * молча не нашёл В ГЛАВНОМ файле сайта ничего: внутри его `:root` есть
 * вложенное правило (`&:lang(bg){ --measure:64ch }`), и на первой же
 * фигурной скобке совпадение обрывалось. Проверка при этом честно
 * печатала «расхождений 0» — то есть сравнивала пустоту с пустотой.
 *
 * Вложенные блоки пропускаются вместе с содержимым: `&:lang(bg)` и
 * `[data-theme]` — это состояния, а не основа, и сравнивать значение
 * тёмной темы со значением дневной означает находить расхождение там,
 * где его нет.
 */
function rootBodies(css) {
  const out = []
  /* Только верхний уровень: `:root` сразу после `{` — это `:root` внутри
     медиазапроса, то есть снова состояние, а не основа. */
  const re = /(^|[};])\s*:root\s*\{/g
  let m
  while ((m = re.exec(css))) {
    let depth = 1, body = '', i = re.lastIndex
    for (; i < css.length && depth > 0; i++) {
      const c = css[i]
      if (c === '{') depth++
      else if (c === '}') { depth--; if (!depth) break }
      else if (depth === 1) body += c
    }
    out.push(body)
    re.lastIndex = i
  }
  return out
}

/* ── 1 · varGone ───────────────────────────────────────────────────────
 *
 * Переменная, которую переносимый слой просит и сам не объявляет.
 *
 * По правилам CSS объявление с неизвестной переменной недействительно, и
 * браузер выбрасывает его ЦЕЛИКОМ, молча. На сайте этого не видно: там
 * переменная объявлена в `styles/tokens.css`, и всё сходится. В Shopify и в
 * WordPress рядом нет ничего — и карточка товара теряет размер, цвет или
 * то и другое.
 *
 * Замер в день, когда семья заведена: четырнадцать имён, из них пять
 * ступеней шкалы размера и две роли цвета. То есть переносимого в
 * «переносимом пакете» было меньше, чем написано на коробке.
 *
 * Запас (`var(--x, 14px)`) находку не снимает: он спасает вид, но означает,
 * что вне сайта работает ЗАПАС, а не шкала. Расхождение с сайтом остаётся,
 * просто становится незаметным — то самое, что чинить дороже всего.
 */
const kitCss = walk(SHARED[0], (n) => n.endsWith('.css'))
{
  const text = kitCss.map(read).join('\n')
  const have = new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
  const seen = new Set()
  for (const rel of kitCss) {
    const css = strip(read(rel))
    for (const m of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (have.has(m[1]) || seen.has(m[1])) continue
      seen.add(m[1])
      found.varGone.push(`${rel}:${lineOf(css, m.index)}  ${m[1]} — просит, а объявления нет`)
    }
  }
}

/* ── 2 · twoValues ─────────────────────────────────────────────────────
 *
 * Один токен объявлен и у сайта, и в переносимом слое — с разными
 * значениями. Это не «копия», это две правды: сайт покажет одно, Shopify
 * другое, и увидит это только тот, кто откроет обе витрины рядом.
 *
 * Семья названа по следствию, а не по причине: причина — что копия вообще
 * существует. Лечится она не здесь, а переносом шкал в один файл, который
 * читают оба; до того дня эта семья держит копии в согласии.
 */
{
  /* Сравнивается только основа — голый `:root`.
   *
   * Первый заход сравнивал все объявления подряд и ловил не то: у `--face`
   * шесть значений (по одному на начертание), у `--gut` три (по одному на
   * ширину), и «значение не совпало» означало лишь, что сравнили тёмную
   * тему с дневной. Это ложная находка, а ложная находка в храповике хуже
   * отсутствующей: её начинают обходить.
   *
   * Основа же у обоих файлов одна и сравнима честно: медиазапросы и
   * состояния вырезаются вместе с содержимым, остаются только правила,
   * чей селектор — ровно `:root`. */
  const values = (css) => {
    const map = new Map()
    for (const body of rootBodies(strip(css))) {
      for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
        const name = m[1], value = m[2].replace(/\s+/g, ' ').trim()
        if (!map.has(name)) map.set(name, new Set())
        map.get(name).add(value)
      }
    }
    return map
  }
  const site = TOKENS && existsSync(join(ROOT, TOKENS)) ? values(read(TOKENS)) : new Map()
  for (const rel of kitCss) {
    for (const [name, set] of values(read(rel))) {
      const mine = site.get(name)
      if (!mine) continue
      for (const v of set) {
        if (!mine.has(v)) {
          found.twoValues.push(`${rel}  ${name}: «${v}» — у сайта «${[...mine][0]}»`)
        }
      }
    }
  }
}

/* ── 3 · markupDrift ───────────────────────────────────────────────────
 *
 * Договор переносимого слоя — имя класса и форма разметки: `.cb-card` с
 * `cb-card__foot` внутри. Стиль один, исполнений три (React, Liquid, PHP), и
 * если одно из них потеряло элемент, блок ломается ТОЛЬКО на том движке.
 *
 * Сравниваются лишь те блоки, которые движок уже исполняет: блок, которого
 * у него нет вовсе, — это не расхождение, а непортированное. Сколько такого
 * осталось, печатается отдельной строкой в конце; долгом оно не считается,
 * потому что перенос назначен на этап 5.
 */
{
  const classesIn = (text) => new Set([...text.matchAll(/cb-[a-z0-9]+(?:__[a-z0-9-]+)?/g)].map((m) => m[0]))
  const engines = new Map()
  const dress = kitCss.filter((f) => !/tokens/.test(f))
  if (dress.length) engines.set('стиль (packages/ui)', classesIn(dress.map(read).join('\n')))
  for (const dir of ENGINES) {
    for (const rel of walk(dir, () => true)) {
      const engine = rel.split('/')[1] ?? rel
      const set = engines.get(engine) ?? new Set()
      for (const c of classesIn(read(rel))) set.add(c)
      engines.set(engine, set)
    }
  }
  const blockOf = (c) => c.split('__')[0]
  const all = new Set([...engines.values()].flatMap((s) => [...s]))
  for (const cls of [...all].sort()) {
    const block = blockOf(cls)
    /* Кто ВООБЩЕ исполняет этот блок. Отсутствие блока целиком — не дефект:
       рельса ещё не портирована, и это видно в строке паритета. */
    const does = [...engines].filter(([, set]) => [...set].some((c) => blockOf(c) === block))
    if (does.length < 2) continue
    const missing = does.filter(([, set]) => !set.has(cls)).map(([name]) => name)
    if (missing.length) {
      found.markupDrift.push(`${cls} — нет у: ${missing.join(', ')}`)
    }
  }

  /* Строка паритета: сколько блоков вёрстки уже существует в переносимом
     виде. Не семья и не долг — мера того, сколько работы в дне переноса. */
  const modules = COMPONENT_DIRS.flatMap((d) => walk(d, (n) => n.endsWith('.module.css'))).length
  const ported = new Set([...(engines.get('стиль (packages/ui)') ?? [])].map(blockOf)).size
  found.parity = `блоков в вёрстке ${modules}, в переносимом виде ${ported}`
}

/* ── 4 · dataInView ────────────────────────────────────────────────────
 *
 * Компонент, который САМ берёт список из данных, прибит к тому, откуда эти
 * данные взялись. Сегодня это массив в `lib/`, завтра — запрос к Medusa или
 * к Payload: массив читается мгновенно, запрос — нет, и компонент, который
 * ходил за списком сам, придётся переписывать вместе с источником.
 *
 * Граница проходит не по файлу, а по тому, ЧТО берут:
 *   · тип (`type Product`) и формула (`perMg`, `cutOf`) — чистые, переносимы;
 *   · СПИСОК (`PRODUCTS`, `CATEGORIES`) — это источник, и спрашивать его
 *     должна страница, а компоненту — передать.
 *
 * Поэтому находкой считается только импорт МАССИВА в `components/`.
 * Страницы (`app/`) за данными ходить обязаны — там это и есть их работа.
 */
{
  /* Что в `lib/` является списком: `export const ИМЯ: T[] = [` или
     `export const ИМЯ = [`. Числа и строки (`VAT_RATE`, `FREE_SHIPPING`) —
     не список: они переедут вместе с данными, а не вместо них. */
  const lists = new Set()
  for (const rel of walk(LIB, (n) => /\.tsx?$/.test(n))) {
    for (const m of read(rel).matchAll(/export const ([A-Z][A-Z0-9_]+)(?:\s*:[^=]+)?=\s*\[/g)) {
      lists.add(m[1])
    }
  }
  /* Только блоки: странице (`pages` в конфиге) за списком ходить положено. */
  for (const rel of COMPONENT_DIRS.flatMap((d) => walk(d, (n) => /\.tsx?$/.test(n)))) {
    /* Панель настроек рисует саму себя и в магазин не едет — её из обхода
       исключают все проверки проекта, и эта не исключение. */
    if (rel.includes('studio')) continue
    const code = strip(read(rel))
    for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']*lib\/([\w/-]+)'/g)) {
      for (const raw of m[1].split(',')) {
        const name = raw.replace(/\btype\b/, '').trim()
        if (lists.has(name)) {
          found.dataInView.push(`${rel}:${lineOf(code, m.index)}  берёт список ${name} сам (lib/${m[2]})`)
        }
      }
    }
  }
}

/* ── 5 · moneyLiteral ──────────────────────────────────────────────────
 *
 * Валюта, написанная числом прямо в вёрстке. Сайт стоит на евро, и пока
 * магазин один, это незаметно; но «прикрутить к другому бекенду» значит и
 * другой рынок, другую валюту, другой порог бесплатной доставки. Литерал не
 * переедет: он не знает ни о курсе, ни о языке, ни о том, что порог сменился.
 *
 * Хуже того, это ещё и вторая копия факта. `FREE_SHIPPING` лежит в `lib/`, а
 * «€50» в шапке написано рукой: правка в данных шапку не догонит. Ровно то,
 * что запрещено правилом «один факт — одно место».
 *
 * Формат денег живёт в `lib/format.ts` (`eur`), пороги и ставки — в `lib/`.
 * Поэтому `lib/` из обхода исключён: там литералу и место.
 *
 * Доллара в признаке нет намеренно: в JavaScript `$1` — это подстановка в
 * замене по образцу, и `src.replace(/\.(\w+)$/, `-${w}.$1`)` из `Shot.tsx`
 * находился как цена. Ложная находка в храповике хуже отсутствующей: её
 * начинают обходить. Рынок сайта — евро; доллар вернётся в признак в тот
 * день, когда появится витрина, которая им торгует.
 */
for (const dir of BLOCK_DIRS) {
  for (const rel of walk(dir, (n) => /\.tsx?$/.test(n))) {
    if (rel.includes('studio')) continue
    const code = strip(read(rel))
    for (const m of code.matchAll(/[€£]\s?\d+(?:[.,]\d+)?|(?<![\w-])\d+(?:[.,]\d+)?\s*(?:лв|EUR|USD)\b/g)) {
      found.moneyLiteral.push(`${rel}:${lineOf(code, m.index)}  ${m[0].trim()} — валюта в вёрстке`)
    }
  }
}

/* ── 6 · engineInShared ────────────────────────────────────────────────
 *
 * Сторож направления. Общий слой обязан работать без всякого движка: это
 * простой CSS на именах классов и сноп значков. Стоит в нём появиться
 * `composes:` (это CSS-модули, то есть сборщик), `next/`, `react`, `{{ }}`
 * или `<?php` — и слой перестаёт быть общим, оставаясь по имени общим.
 *
 * Переходники (`themes/`) сюда не попадают намеренно: они движком и
 * являются. Им можно всё — в этом их работа.
 */
for (const dir of SHARED) {
  for (const rel of walk(dir, (n) => /\.(css|svg|js|mjs|html)$/.test(n))) {
    const text = read(rel)
    for (const m of text.matchAll(/composes\s*:|from\s*['"](?:next\/|react['"])|require\(\s*['"](?:next\/|react['"])|\{\{|<\?php/g)) {
      found.engineInShared.push(`${rel}:${lineOf(text, m.index)}  ${m[0]} — движок в общем слое`)
    }
  }
}

/* ── 7 · backendInView ─────────────────────────────────────────────────
 *
 * Компонент, который сам ходит в Vendure или Payload, прибит к ним так же,
 * как компонент, берущий список из `lib/` (dataInView), — только крепче:
 * на другом бекенде его переписывают целиком. Страница (`pages` в конфиге)
 * за данными ходит, компонент получает готовое (И248). Ввоз ТИПА
 * (`import type`) — не находка: тип переезжает вместе с формой данных.
 */
/* Меряются только файлы ОТРИСОВКИ (.jsx/.tsx): модуль данных рядом с ними
   (`data.ts`, `api.ts`) и есть серверный слой, ходить в бекенд — его работа.
   Пакет узнаётся только по голому имени: `./graphql` — файл документов
   самого сайта, а не пакет `graphql` (ложная находка прогона по стартеру
   Vendure). Адаптер сайта — по пути `lib/…` или `sources`. */
const BACKEND_PKG = /^(?:@vendure\/|@payloadcms\/|payload(?:\/|$)|@apollo\/client|graphql-request|urql$|@urql\/|graphql$|@medusajs\/|@shopify\/)/
const ADAPTER = /(?:^|\/)(?:lib|sources)\/(?:vendure|payload|cms|commerce|shopify|medusa)(?:[/.]|$)|(?:^|\/)sources(?:\/|$)/
for (const rel of COMPONENT_DIRS.flatMap((d) => walk(d, (n) => /\.[cm]?[jt]sx$/.test(n)))) {
  if (rel.split(/[\\/]/).includes('studio')) continue
  const code = strip(read(rel))
  for (const m of code.matchAll(/import\s+(type\s+)?[^'"]*?from\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (m[1]) continue
    const raw = m[2] ?? m[3]
    const local = /^(?:\.|\/|@\/|~\/)/.test(raw)
    const hit = local ? ADAPTER.test(raw.replace(/^(?:\.\.?\/)+/, '').replace(/^[@~]\//, '')) : BACKEND_PKG.test(raw) || ADAPTER.test(raw)
    if (hit) found.backendInView.push(`${rel}:${lineOf(code, m.index)}  ${raw} — компонент ходит в бекенд сам; данные передаёт страница`)
  }
}

/* ── 8 · moneyMath ─────────────────────────────────────────────────────
 *
 * Цена — целое в минорных единицах с точностью бекенда; делит и округляет её
 * ОДНА функция адаптера (`formatMoney`), а не компонент. `price / 100` и
 * `total.toFixed(2)` в компоненте ломаются на валюте без копеек, на иной
 * точности сервера и на нуле (И248). Признак — деление на 100 или
 * `toFixed` в строке, где названы деньги.
 */
const MONEY = /price|amount|total|subtotal|cost|money|цен|сумм|итог/i
for (const rel of BLOCK_DIRS.flatMap((d) => walk(d, (n) => /\.[cm]?[jt]sx?$/.test(n)))) {
  if (rel.split(/[\\/]/).includes('studio')) continue
  const code = strip(read(rel))
  code.split('\n').forEach((line, i) => {
    if (!MONEY.test(line)) return
    const hit = line.match(/\/\s*100\b|\.toFixed\(\s*\d\s*\)/)
    if (hit) found.moneyMath.push(`${rel}:${i + 1}  ${hit[0]} — денежная арифметика в компоненте; делит и форматирует адаптер`)
  })
}

/* ── счёт ─────────────────────────────────────────────────────────────── */

const parity = found.parity
delete found.parity
const counts = Object.fromEntries(PORT_FAMILIES.map((k) => [k, found[k].length]))

const NAMES = {
  varGone: 'переносимый слой просит переменную, которой у него нет — объявление выбросит браузер',
  twoValues: 'один токен в двух местах с разными значениями — сайт и движок покажут разное',
  markupDrift: 'класс есть у одного движка и отсутствует у другого — блок сломан только там',
  dataInView: 'компонент сам берёт список из данных — на другом источнике его переписывать',
  moneyLiteral: 'валюта числом в вёрстке — другой рынок её не подхватит',
  engineInShared: 'движок протёк в общий слой — он перестал быть переносимым',
  backendInView: 'компонент сам ходит в бекенд (Vendure, Payload, GraphQL) — на другом источнике его переписывать целиком',
  moneyMath: 'компонент считает деньги сам — делить и форматировать цену должен адаптер',
}

if (process.argv.includes('--list')) {
  const pick = process.argv[process.argv.indexOf('--list') + 1]
  for (const k of found[pick] ? [pick] : PORT_FAMILIES) {
    console.log(`\n${NAMES[k]} — ${found[k].length}`)
    for (const line of found[k]) console.log(`    ${line}`)
  }
  console.log(`\n· ${parity}`)
  process.exit(0)
}

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n')
  console.log('База обновлена:', JSON.stringify(counts))
  process.exit(0)
}

let base
try {
  base = JSON.parse(readFileSync(BASELINE, 'utf8'))
} catch {
  base = emptyPortBaseline()
  console.error(`Нет ${relative(ROOT, BASELINE)} — считаю базой ноль по всем семьям.`)
}

let failed = false
for (const key of PORT_FAMILIES) {
  const now = counts[key], was = base[key] ?? 0
  if (now > was) {
    failed = true
    console.error(`\n✗ ${NAMES[key]}: было ${was}, стало ${now}`)
    for (const line of found[key].slice(-(now - was))) console.error(`    ${line}`)
  } else if (now < was) {
    console.log(`✓ ${NAMES[key]}: ${was} → ${now}`)
  } else {
    console.log(`· ${NAMES[key]}: ${now}`)
  }
}

console.log(`\n· ${parity} — остальное переносится в день переноса (этап 5)`)

if (failed) {
  console.error('\nПереносимость ухудшилась: на другом движке этого станет больше.')
  console.error('Либо чините, либо — если это осознанное решение — обновляйте базу:')
  console.error('  npm run check:port -- --update')
  console.error('Что именно: npm run check:port -- --list')
  process.exit(1)
}

const total = Object.values(counts).reduce((a, b) => a + b, 0)
const wasTotal = PORT_FAMILIES.reduce((a, k) => a + (base[k] ?? 0), 0)
if (total < wasTotal) console.log(`\nДолг сократился: ${wasTotal} → ${total}. Обновите базу.`)
