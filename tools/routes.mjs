/**
 * Список адресов, которые публикует сайт, — из дерева маршрутов и данных.
 *
 * Заведён по дефекту, и дефект был молчаливый. В отрисованной проверке
 * список страниц стоял рукой:
 *
 *     const PAGES = ['/bg', '/bg/catalog', '/bg/product/zelenika-15',
 *                    '/bg/cart', '/bg/checkout']
 *
 * А в дереве маршрутов их семь форм и два языка. Полка категории
 * (`/bg/catalog/oils`) и страница «не найдено» не мерились НИ РАЗУ — ни на
 * контраст, ни на цель нажатия, ни на меру строки. Английская половина
 * сайта — тоже ни разу, при том что дефект «81 знак в строке» записан в
 * скилле именно из английского текста в болгарской коробке.
 *
 * Список, набранный рукой, хуже неполного: он не растёт вообще. Заведённая
 * завтра страница попадёт под проверку тогда, когда о ней вспомнят, — то
 * есть после того, как заказчик найдёт на ней дефект глазом.
 *
 * Поэтому список задаёт ДЕРЕВО, а значения динамических сегментов — ДАННЫЕ.
 * Новая страница попадает под проверку в день, когда её завели.
 *
 *     import { all, sample } from './routes.mjs'
 *     all()      // каждый адрес: 108 штук, для дешёвых проверок
 *     sample()   // по одному на форму маршрута и язык, для дорогих
 *
 * Данные читаются РАЗБОРОМ ИСХОДНИКА, а не импортом: `lib/products.ts` —
 * это TypeScript, и ради списка категорий поднимать сборщик незачем.
 * Признак поломки разбора — пустой список; поэтому пустой список валит
 * проверку, а не проходит тихо (см. `assertData`).
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sessionUrls } from './sessions.mjs'
import { SESSIONS, QUERIES } from './kit-config.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
/* Файла может не быть вовсе: набор переезжает в новый проект, где `lib/`
   ещё пуст. Пустая строка тут значит «данных нет», и это не поломка — а вот
   данные, которые ЕСТЬ и не разобрались, поломка (см. ниже). */
const src = (p) => existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : ''

const locale = src('lib/locale.ts')
const site = src('lib/site.server.ts')
const catalogue = src('lib/products.ts')
/* Марки лежат своим файлом, и разбираются они отдельно от каталога нарочно:
   регулярка полок ищет `slug:` по всему тексту, и марка, положенная рядом с
   товарами, молча стала бы десятой полкой. */
const brands = src('lib/brands.ts')

/** Языки. Язык — это адрес: `/bg/...` и `/en/...`, по маршруту на язык. */
const staticLocales = [...(locale.match(/LOCALES\s*=\s*\[([^\]]*)\]/)?.[1] ?? '')
  .matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
const envLocales = (process.env.SITE_LOCALES ?? '')
  .split(',').map((one) => one.trim().toLowerCase().split('-')[0]).filter(Boolean)
const siteLocales = (site.match(/SITE_LOCALES\s*\?\?\s*'([^']+)'/)?.[1] ?? '')
  .split(',').map((one) => one.trim().toLowerCase().split('-')[0]).filter(Boolean)
export const LOCALES = [...new Set(
  envLocales.length ? envLocales : staticLocales.length ? staticLocales : siteLocales,
)]

export const DEFAULT_LANG =
  process.env.SITE_DEFAULT_LOCALE?.toLowerCase().split('-')[0]
  ?? locale.match(/DEFAULT_LANG[^=]*=\s*'([a-z-]+)'/)?.[1]
  ?? site.match(/SITE_DEFAULT_LOCALE\s*\?\?\s*'([^']+)'/)?.[1]?.toLowerCase().split('-')[0]
  ?? LOCALES[0]

/* У доменной витрины главный язык живёт в корне, остальные — приставкой. */
const LOCALE_PATHS = LOCALES.map((one) => one === DEFAULT_LANG ? '' : one)

/** Документы — доставка, возврат, анализы, правовое. Читаются данными, а не
 *  разбором кода: они и лежат данными (`lib/docs.json`). Регулярка тут была
 *  бы вторым разбором JSON, и первым же документом с фигурной скобкой в
 *  тексте он бы соврал. */
/* Файла может не быть — на новом сайте документов ещё нет, и это «нет данных», а не поломка (тот же договор, что у `src`). */
export const DOCS = JSON.parse(src('lib/docs.json') || '[]')

/** Статьи наръчника — тем же способом, что документы: данные, а не разбор
 *  кода (`lib/blog.json`). */
export const POSTS = JSON.parse(src('lib/blog.json') || '[]')

/** Полки. Порядок тот же, что в данных: он по спросу, и первая полка — самая
 *  полная. */
export const CATEGORIES = [...catalogue.matchAll(/\{\s*slug:\s*'([a-z-]+)'/g)]
  .map((m) => m[1])

/** Марки. У каждой своя страница со всеми её товарами. Нужны оба поля:
 *  адрес — чтобы построить его, имя — чтобы сосчитать товары марки. */
export const BRANDS = [...brands.matchAll(/\{ slug: '([a-z0-9-]+)', name: '([^']+)' \}/g)]
  .map((m) => ({ slug: m[1], name: m[2] }))

/** Товары. Нужны три поля: адрес, полка и семья вариантов — по ним
 *  выбираются образцы для дорогих проверок. */
export const PRODUCTS = [...catalogue.matchAll(/^ *\{ id:'([^']+)'(.*)$/gm)]
  .map((m) => ({
    id: m[1],
    cat: m[2].match(/cat:'([a-z-]+)'/)?.[1] ?? '',
    brand: m[2].match(/brand:'([^']+)'/)?.[1] ?? '',
    family: m[2].match(/family:'([^']+)'/)?.[1] ?? '',
  }))

/** Есть файл, а данных из него не вышло — это сломанный разбор, а не пустой
 *  магазин. Молчаливо неполный замер выглядит как результат: ровно так три
 *  страницы из пяти не мерились вовсе и проверка была зелёной.
 *
 *  Отсутствующий файл — другое дело: в новом проекте `lib/` пуст, и требовать
 *  от него сорок товаров значит не дать набору завестись. */
export function assertData() {
  const empty = [
    ['LOCALES', locale, LOCALES], ['CATEGORIES', catalogue, CATEGORIES],
    ['PRODUCTS', catalogue, PRODUCTS], ['BRANDS', brands, BRANDS],
  ].filter(([, file, v]) => file && !v.length).map(([n]) => n)
  if (empty.length) {
    console.error(`\n✗ tools/routes.mjs: разбор данных дал пусто — ${empty.join(', ')}.`)
    console.error('  Изменилась запись в lib/. Список адресов сейчас неполон, и любая')
    console.error('  проверка на нём зелёная по той же причине, по какой пуста.')
    process.exit(1)
  }
}

/** Язык магазина — тот, на котором его читают. Языков нет вовсе (нет
 *  сегмента `[lang]`) — родным считается всё: иначе проходы, идущие «по
 *  родному языку», молча не пошли бы никуда. */
export const isNative = (url) =>
  !LOCALES.length || !LOCALES.includes(url.split('/')[1]) || url.split('/')[1] === DEFAULT_LANG

/** Формы маршрутов из дерева `app/**\/page.tsx`: `/[lang]`, `/[lang]/catalog`,
 *  `/[lang]/catalog/[cat]`, … Группы `(x)`, приватные `_x` и параллельные
 *  `@x` папки адреса не дают и отбрасываются. */
export function shapes() {
  const out = []
  walk(join(ROOT, 'app'), '')
  function walk(dir, url) {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        if (name.startsWith('_') || name.startsWith('@')) continue
        walk(path, /^\(.*\)$/.test(name) ? url : `${url}/${name}`)
      } else if (/^page\.(tsx|ts|jsx|js)$/.test(name)) {
        out.push(url || '/')
      }
    }
  }
  return out.sort()
}

/** Как язык стоит в адресе: `[lang]` — у каждого языка своя приставка,
 *  `[locale]` — основной в корне, остальные приставкой; `null` — языка в
 *  адресе нет. Одно место на `check:open` и `sweep` (И257). */
export function langSegment() {
  const tree = shapes()
  return tree.some((s) => s.startsWith('/[lang]')) ? '[lang]'
    : tree.some((s) => s.startsWith('/[locale]')) ? '[locale]' : null
}

/** Главная основного языка — страница, а не перенаправление: у `[lang]` это
 *  `/<основной>`, у `[locale]` и у сайта без языка в адресе — корень. */
export const homePath = () => (langSegment() === '[lang]' && DEFAULT_LANG ? `/${DEFAULT_LANG}` : '/')

/** Чем заполняются динамические сегменты. Ключ — сегмент, как он записан в
 *  дереве; значение — все существующие величины. */
const FILL = {
  '[lang]': () => LOCALES,
  '[locale]': () => LOCALE_PATHS,
  '[cat]': () => CATEGORIES,
  '[id]': () => PRODUCTS.map((p) => p.id),
  '[doc]': () => DOCS.map((d) => d.slug),
  '[brand]': () => BRANDS.map((b) => b.slug),
  '[slug]': () => POSTS.map((p) => p.slug),
}

/** Образцы для дорогих проверок: не «первое попавшееся», а два конца.
 *
 *  Полка: самая полная и самая пустая. Тринадцать товаров и два — это две
 *  разные раскладки одной сетки, и ломается всегда вторая: `auto-fit` при
 *  двух карточках растягивает их во всю строку.
 *
 *  Товар: с самой большой семьёй вариантов (там есть селектор крепости,
 *  отчёт лаборатории и полка «сравните с») и без семьи вовсе — на одиночном
 *  товаре половины страницы нет, и её отсутствие тоже вёрстка. */
const SAMPLE = {
  '[lang]': () => LOCALES,
  '[locale]': () => LOCALE_PATHS,
  /* Марка: самая полная и самая пустая. У первой шесть полок и пятнадцать
     карточек, у второй одна полка и три — и ломается всегда вторая: блок из
     двух карточек в сетке на пять это другая раскладка, а не та же. */
  '[brand]': () => {
    const size = (b) => PRODUCTS.filter((p) => p.brand === b.name).length
    const sorted = [...BRANDS].sort((a, b) => size(b) - size(a))
    return [...new Set([sorted[0]?.slug, sorted[sorted.length - 1]?.slug])].filter(Boolean)
  },
  /* Документ: самый длинный и самый короткий. Длинный — это оглавление в
     десять пунктов, таблица и выноски; короткий — три абзаца. Ломается
     всегда первый, но проверять надо оба: у короткого оглавление рискует
     оказаться длиннее самого текста. */
  '[doc]': () => {
    const size = (d) => JSON.stringify(d).length
    const sorted = [...DOCS].sort((a, b) => size(b) - size(a))
    return [...new Set([sorted[0]?.slug, sorted[sorted.length - 1]?.slug])].filter(Boolean)
  },
  '[cat]': () => {
    const size = (c) => PRODUCTS.filter((p) => p.cat === c).length
    const sorted = [...CATEGORIES].sort((a, b) => size(b) - size(a))
    return [...new Set([sorted[0], sorted[sorted.length - 1]])].filter(Boolean)
  },
  /* Статья: самая длинная и самая короткая — та же логика, что у документа.
     Длинная несёт таблицу, цитату и оглавление в шесть пунктов; короткая —
     три раздела и ни одной таблицы. */
  '[slug]': () => {
    const size = (post) => JSON.stringify(post).length
    const sorted = [...POSTS].sort((a, b) => size(b) - size(a))
    return [...new Set([sorted[0]?.slug, sorted[sorted.length - 1]?.slug])].filter(Boolean)
  },
  '[id]': () => {
    const count = {}
    for (const p of PRODUCTS) if (p.family) count[p.family] = (count[p.family] ?? 0) + 1
    const biggest = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0]
    const pick = [
      PRODUCTS.find((p) => p.family === biggest)?.id,
      PRODUCTS.find((p) => !p.family)?.id,
    ]
    return [...new Set(pick.filter(Boolean))]
  },
}

const expand = (fill) => (url) => {
  let rows = ['']
  for (const seg of url.split('/').filter(Boolean)) {
    const dynamic = /^\[.*\]$/.test(seg)
    const values = fill[seg] ? fill[seg]() : dynamic ? [] : [seg]
    /* Сегмент, который нечем подставить, — это НЕ пустой список адресов.
       Промолчав, проверка выбросила бы из обхода целую ветку дерева и
       осталась бы зелёной: ровно тот молчаливо неполный замер, ради
       которого весь этот файл и написан. */
    if (!values.length) {
      console.error(`\n✗ tools/routes.mjs: сегмент ${seg} в маршруте ${url} нечем подставить.`)
      console.error('  Научите FILL/SAMPLE, откуда брать его значения, — иначе эта ветка')
      console.error('  дерева не проверяется вовсе, а проверка выглядит зелёной.')
      process.exit(1)
    }
    rows = rows.flatMap((prefix) => values.map((v) => `${prefix}/${v}`.replace(/\/{2,}/g, '/')))
  }
  return rows.length ? rows : ['/']
}

/** Полка с гранью фильтра в адресе (И22) — форма без своего `page.tsx`: та
 *  же страница `[cat]`, только со строкой запроса. Дерево строится по
 *  файлам `app/**\/page.tsx`, и параметр к файлу не привязан — без явной
 *  строки здесь эта форма не открылась бы ни разу ни в одной проверке.
 *
 *  Один адрес хватает: он не про то, какая грань выбрана, а про то, что
 *  адрес с параметром вообще открывается и рисует ту же полку, что и без
 *  него. */
function queried() {
  const cat = CATEGORIES[0]
  const brand = BRANDS[0]?.name
  if (!cat || !brand) return []
  const suffix = `/catalog/${cat}?brand=${encodeURIComponent(brand)}`
  return LOCALES.length ? LOCALES.map((l) => `/${l}${suffix}`) : [suffix]
}

/** Страницы с запросом из `kit.config.json` (`queries`, И345): форма
 *  маршрута → строки запроса. Поиск с запросом — та же страница
 *  `/[lang]/search`, но другая раскладка: полка результатов или «ничего не
 *  нашлось»; без записи здесь `check:craft`, `check:detect` и свип мерили
 *  только поиск без запроса. Форма не из дерева (переименовали, опечатка) не
 *  меряется — она названа предупреждением. */
function asked(fill) {
  const tree = new Set(shapes())
  const out = []
  for (const [shape, list] of Object.entries(QUERIES)) {
    if (!tree.has(shape)) { console.warn(`kit.config.json: форма «${shape}» из «queries» — не из дерева маршрутов app/, не меряется`); continue }
    for (const url of expand(fill)(shape)) for (const q of list) out.push(`${url}?${q}`)
  }
  return out
}

/** Каждый адрес, который публикует сайт. Для дешёвых проверок: открывается
 *  ли страница, обещана ли она картой сайта. */
export function all() {
  assertData()
  return [...new Set([...shapes().flatMap(expand(FILL)), ...queried(), ...asked(FILL)])].sort()
}

/** По одному адресу на форму маршрута и язык. Для дорогих проверок —
 *  отрисованных, где каждая страница стоит шести открытий. */
export function sample() {
  assertData()
  return [...new Set([...shapes().flatMap(expand(SAMPLE)), ...queried(), ...asked(SAMPLE)])].sort()
}

/** Личные страницы полными — для дорогих проверок (И263): формы из
 *  `sessions.pages` в kit.config.json, по адресу на язык и сессию, хвостом
 *  `#as=…`. Нет cookie в конфиге — нет и личных страниц. Форма, которой нет
 *  в дереве маршрутов (страницу переименовали, опечатка), не меряется —
 *  она названа предупреждением, остальные отдаются. */
export function personal() {
  if (!SESSIONS.cookie) return []
  assertData()
  const tree = new Set(shapes())
  const pages = {}
  for (const [shape, list] of Object.entries(SESSIONS.pages)) {
    if (tree.has(shape)) pages[shape] = list
    else console.warn(`kit.config.json: форма «${shape}» из «sessions.pages» — не из дерева маршрутов app/, не меряется`)
  }
  return sessionUrls(pages, expand(SAMPLE))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const list = process.argv.includes('--sample') ? sample() : all()
  for (const url of list) console.log(url)
  console.error(`\n${list.length} адресов, форм маршрута ${shapes().length}`)
}
