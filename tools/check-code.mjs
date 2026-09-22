/**
 * Храповик по коду.
 *
 * Тот же приём, что у `check-css.mjs`, и та же причина. У вёрстки правило
 * «один факт — одно место» есть с первого дня, и его сторожат одиннадцать
 * семей. У КОДА такого правила не было вовсе — и код честно набрал ровно те
 * же болезни, только их никто не считал.
 *
 * Замер, с которого проверка началась (сентябрь 2026, 86 файлов, 11 509
 * строк):
 *
 *   · полоса с прокруткой написана дважды: `components/useRail.ts` — хук
 *     ровно для этого, и `components/Rail.tsx`, который его не зовёт, а
 *     повторяет построчно: тот же `measure`, тот же слушатель, тот же
 *     `ResizeObserver`, тот же `nudge`;
 *   · склад поверх localStorage написан дважды: `lib/shop.ts` (корзина и
 *     избранное) и `lib/studio/store.ts` (ответы панели). Один приём, два
 *     набора слушателей, два кэша, два `try/catch` — и два места, где
 *     однажды разойдётся поведение в приватном режиме;
 *   · «показать миллиграммы» написано ТРИЖДЫ: `components/IndexTable.tsx`,
 *     `components/ProductCard.tsx` и `lib/oils.ts` под именем `oneDp` —
 *     причём третья копия лежит там, где ей и место.
 *
 * Ни одна из трёх в диффе не видна: каждый файл по отдельности безупречен.
 * Видно их только сложением, и складывать должна проверка.
 *
 *   node tools/check-code.mjs              проверить
 *   node tools/check-code.mjs --list <семья>   показать находки
 *   node tools/check-code.mjs --update     записать текущие числа как базу
 */

import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { basename, join, relative as nativeRelative } from 'node:path'
import { CODE_FAMILIES, CODE_LABELS as NAMES, LONG_FILE, MANY_HOOKS } from './code-families.mjs'
/* Где код, где стили, с каких папок спрашивают — `kit.config.json` проекта
   или соглашения набора (И168). */
import { CODE_DIRS as DIRS, BLOCK_DIRS, STYLE_DIRS, ALIASES, STORES } from './kit-config.mjs'

const relative = (...args) => nativeRelative(...args).split(String.fromCharCode(92)).join('/')
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASELINE = join(ROOT, 'tools/code-baseline.json')

/* Файлы ДАННЫХ, а не кода. Длина у них — не сложность: словарь на 644 строки
   это 644 перевода, и делить его на части значит искать перевод в двух
   местах вместо одного. `lib/shots.ts` вдобавок пишется скриптом. */
const DATA = [
  'lib/dict.ts',        // словарь переводов
  'lib/shots.ts',       // нарезка снимков, пишется tools/shrink.mjs
  'lib/products.ts',    // каталог
  'lib/editorial.ts',   // текст блока под сеткой: по объекту на язык
  'lib/studio/schema.ts', // описание полей панели
  'components/Icons.tsx', // набор значков: по функции на значок
]

/** Длиннее этого файл перестаёт читаться целиком. */
/** Больше этого хуков в одной функции — она держит не одно состояние, а много. */

const files = []
for (const dir of DIRS) walk(join(ROOT, dir))
function walk(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.tsx?$/.test(name)) files.push(path)
  }
}

/* Список семей — общий со сборщиком набора: он пишет новому проекту пустую
   базу, и та обязана знать обо всех семьях, а не о тех, что были при её
   написании. */
/** Общий корень папок кода: `src/app`, `src/components`, `src/lib` → `src`. */
function commonRoot(dirs) {
  const parts = dirs.map((d) => d.split('/'))
  const first = parts[0] ?? []
  const out = []
  for (let i = 0; i < first.length; i++) {
    const piece = first[i]
    if (!parts.every((p) => p[i] === piece)) break
    out.push(piece)
  }
  return out.join('/') || '.'
}

const found = Object.fromEntries(CODE_FAMILIES.map((k) => [k, []]))

/* Комментарий — не код: длину сохраняем, чтобы номера строк не уехали.
   Тот же приём, что в check-css.mjs, и заведён там по той же беде. */
const strip = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
   .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length))

/* ── семья 1: одно и то же написано дважды ─────────────────────────────────
 *
 * Ищутся объявления верхнего уровня — `const name = (...) => …` и
 * `function name(...) { … }`, — и сравниваются ТЕЛА, приведённые к одному
 * виду: пробелы схлопнуты, имена переменных оставлены как есть.
 *
 * Имя не сравнивается намеренно. Третья копия «показать миллиграммы»
 * называется `oneDp`, а две первые — `mg`: по именам они не сходятся вовсе,
 * а по телу совпадают знак в знак. Дублируется работа, а не название.
 *
 * Порог в 40 знаков тела — чтобы `const x = () => null` и прочие однострочные
 * заглушки не считались открытием. */
const BODY_MIN = 40
const bodies = new Map()

for (const path of files) {
  const rel = relative(ROOT, path)
  const raw = readFileSync(path, 'utf8')
  const src = strip(raw)
  const at = (i) => `${rel}:${src.slice(0, i).split('\n').length}`

  /* стрелка в одну строку: const mg = (v: number): string => (…) */
  for (const m of src.matchAll(/^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(\([^)]*\)[^=]*=>[^\n]+)$/gm)) {
    /* Открывающая скобка в конце значит, что поймана ПОДПИСЬ многострочной
       функции, а не тело. Две разные функции с одинаковым списком
       параметров давали при этом один ключ — и семья показывала их копиями
       друг друга. Так и случилось с `strength` и `volLabel`: обе берут
       `(p: Product, t: (s: string) => string)`, а делают разное. Тело
       многострочной стрелки ловит правило ниже. */
    if (m[2].trimEnd().endsWith('{')) continue
    add(m[1], m[2], at(m.index), rel)
  }
  /* стрелка в несколько строк: const strength = (…) => { … } до строки,
     закрывающей её на нулевом отступе. */
  for (const m of src.matchAll(/^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)[^\n]*=>\s*\{\n([\s\S]*?)\n\}/gm)) {
    add(m[1], m[2], at(m.index), rel)
  }
  /* объявленная функция: тело до строки, закрывающей её на нулевом отступе */
  for (const m of src.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(\([\s\S]*?)\n\}/gm)) {
    add(m[1], m[2], at(m.index), rel)
  }
  /* стрелка в несколько строк: const measure = useCallback(() => { … }, []) */
  for (const m of src.matchAll(/^ {2}const\s+([A-Za-z_$][\w$]*)\s*=\s*(useCallback\(\([^)]*\)\s*=>\s*\{[\s\S]*?\n {2}\}[^\n]*)$/gm)) {
    add(m[1], m[2], at(m.index), rel)
  }

  function add(name, body, where, file) {
    const key = body.replace(/\s+/g, ' ').trim()
    if (key.length < BODY_MIN) return
    const seen = bodies.get(key)
    if (seen) { if (seen.file !== file) seen.also.push({ name, where }) }
    else bodies.set(key, { name, where, file, also: [] })
  }

  /* ── семья 2: файл, который не читается целиком ─────────────────────────
   *
   * Не про красоту и не про вкус: файл длиннее четырёхсот строк перестаёт
   * держаться в голове, и каждая правка в нём делается вслепую по грепу.
   * Шапка на 758 строк держит восемь разных дел сразу — чекмедже, мега-меню,
   * поиск, прилипание, очередь на выживание, переключатель языка, чат,
   * значки корзины и учётки, — и ни одно из них не вынуть, не задев прочие.
   *
   * Данные не считаются: длина словаря — это число переводов, а не
   * сложность. */
  if (!DATA.includes(rel)) {
    const lines = src.split('\n').length
    if (lines > LONG_FILE) found.longFile.push(`${rel}  ${lines} строк (порог ${LONG_FILE})`)
  }

  /* ── семья 3: компонент, держащий слишком много состояния ───────────────
   *
   * Считаются вызовы хуков внутри одной функции верхнего уровня. Много
   * хуков — это не «сложный компонент», это НЕСКОЛЬКО компонентов, ещё не
   * разделённых. Признак чисто механический: сколько разных вещей функция
   * помнит одновременно. */
  for (const m of src.matchAll(/^(?:export\s+(?:default\s+)?)?function\s+([A-Z][\w$]*)\s*\([\s\S]*?\n\}/gm)) {
    const hooks = (m[0].match(/\buse[A-Z]\w*\s*\(/g) || []).length
    if (hooks > MANY_HOOKS) {
      found.manyHooks.push(`${at(m.index)}  ${m[1]}() — ${hooks} хуков (порог ${MANY_HOOKS})`)
    }
  }

  /* ── семья 4: память браузера мимо склада ──────────────────────────────
   *
   * `localStorage` — это состояние, которое переживает перезагрузку, то есть
   * данные. Данные живут в складе, а склад умеет две вещи, которых нет у
   * прямого вызова: рассказать всем подписчикам, что значение изменилось, и
   * не упасть в приватном режиме, где `localStorage` бросает исключение.
   *
   * Складов в проекте два — `lib/shop.ts` (магазин) и `lib/studio/store.ts`
   * (панель), — и это само по себе долг: приём один, копии две. Но пока их
   * два, проверка сторожит хотя бы то, чтобы третьего не завелось.
   *
   * Загрузочный скрипт в `app/[lang]/layout.tsx` — исключение по существу:
   * он читает выбор темы ДО первой отрисовки, когда никакого React ещё нет. */
  /* ── семья 6: имя марки, отданное на перевод ──────────────────────────
   *
   * У сайта две языковые версии, и браузер предлагает перевести ту, что не
   * совпала с языком гостя. Автоперевод не разбирает, что `Balkan Hemp` —
   * имя фирмы, а не словосочетание: он его переведёт, и покупатель будет
   * искать в магазине товар, которого под таким именем нет.
   *
   * `translate="no"` — то, чем это говорится браузеру, и стоит оно на том
   * узле, который имя печатает.
   *
   * Спрашивается по строке: если в ней печатается `.brand`, на ней же должен
   * стоять `translate`. Мерка грубая и своих границ не скрывает — имя,
   * разложенное на три строки, она пропустит, — но ровно этот вид (`<span
   * className={s.brand}>{product.brand}</span>`) в проекте и встречается.
   *
   * Строка, где марка уходит в строковый шаблон (`aria-label`, текст
   * сообщения, заголовок страницы), не считается: атрибут вешать не на что,
   * и перевод туда не доберётся. */
  for (const m of src.matchAll(/^.*\{[^}\n]*(?:\.brand|\bbrand)\}.*$/gm)) {
    const line = m[0]
    if (/translate\s*=/.test(line)) continue
    if (/`|aria-label|title=|alt=/.test(line)) continue
    /* `brand={product.brand}` — марка уходит ПРОПОМ, печатать её будет тот,
       кому отдали; атрибут вешается там. Считается только текст в разметке:
       `>{brand}<`, `>{product.brand}<`. */
    if (/[\w-]+=\{[^}]*\bbrand\}/.test(line) && !/>\s*\{[^}]*\bbrand\}/.test(line)) continue
    /* `className={s.brand}` — это ИМЯ КЛАССА, а не имя марки: так называется
       блок со знаком магазина в подвале. Мерка на нём сработала с первого
       прогона, и это её собственный дефект, а не находка. Считается только
       то, что печатается в текст. */
    const printed = line.replace(/className=\{[^}]*\}/g, '')
    /* Голое `{brand}` — только как текст разметки, после `>`: в TypeScript та же
       запись — деструктуризация (`({ brand }) =>`) и объект (`{ brand }`), и
       три строки `lib/catalog.ts` встали находками на первом же прогоне. */
    if (!/\{\s*(?!s\.|p\.)[A-Za-z_$][\w$]*\.brand\s*\}/.test(printed) && !/>\s*\{\s*brand\s*\}/.test(printed)) continue
    found.translated.push(`${at(m.index)}  имя марки печатается без translate="no"`)
  }

  /* ── семья 5: переводу отдали склеенную строку ────────────────────────
   *
   * Перевод ищет строку в словаре целиком, ключом. Склеенное имя ключом не
   * бывает никогда: `translate(l, `${p.brand} ${p.name} ${p.spectrum}`)`
   * возвращает то, что в него вошло, — английский, — и делает это молча.
   *
   * Дефект, с которого семья заведена: на болгарской странице товара
   * разметка `BreadcrumbList` и `Product` уезжали в выдачу английскими
   * («Rila Botanics CBD oil 20% Full spectrum»), пока крошка и заголовок над
   * ними стояли по-болгарски. Ни в диффе, ни глазом этого не видно: видно
   * только в собранном файле, и только если специально смотреть разметку.
   * По правилам проекта разметка, обещающая не то, что на странице, — это
   * отрицательное СЕО, и цена ошибки выше, чем у любой рамки не на месте.
   *
   * Порядок действий обратный: склеивать уже переведённое, а не переводить
   * склеенное. Марка при этом не переводится вообще — она имя. */
  for (const re of [
    /\btranslate\s*\(\s*[^,()]+,\s*`[^`]*\$\{/g,
    /(?<![\w$.])t\s*\(\s*`[^`]*\$\{/g,
  ]) {
    for (const m of src.matchAll(re)) {
      found.glued.push(`${at(m.index)}  переводу отдали склеенную строку — ключа такого нет`)
    }
  }

  /* ── семья: переключатель вариантов, уносящий в начало страницы ───────
   *
   * Ссылка, помечающая себя `aria-current="page"` среди соседей, — это не
   * уход со страницы, а ПЕРЕКЛЮЧАТЕЛЬ: выбор варианта того же товара,
   * другого языка, другой вкладки. Раскладка после перехода та же, органы
   * стоят на тех же местах, меняется содержимое.
   *
   * Браузер про это не знает и открывает новый адрес сверху. Человек читал
   * середину карточки, нажал «30%» — и оказался в начале чужой страницы, а
   * до пилюль надо мотать обратно. Заказчик увидел это первым же нажатием:
   * «не должно перекидывать в начало страницы, должно оставаться в том же
   * месте, без перескоков».
   *
   * Признак в файле однозначен: `aria-current` рядом с `href` без
   * `scroll={false}`. То же и у перехода через `router.push` — там второй
   * аргумент `{ scroll: false }`.
   *
   * Не считается навигация: нижняя панель и шапка тоже помечают себя
   * `aria-current`, но ведут в ДРУГОЙ раздел, и приехать в его середину —
   * как раз то, чего никто не ждёт. Отличает их адрес: у навигации он
   * записан строкой («/cart»), у переключателя собран из элемента списка
   * (`/product/${x.id}`) — то есть адресов столько же, сколько вариантов,
   * и страницы за ними однотипные. */
  for (const m of src.matchAll(/<Link\b[^>]*>/g)) {
    const tag = m[0]
    if (!/aria-current/.test(tag)) continue
    if (!/href=\{`[^`]*\$\{/.test(tag)) continue
    if (/scroll\s*=\s*\{\s*false\s*\}/.test(tag)) continue
    found.jumpBack.push(`${at(m.index)}  переключатель варианта без scroll={false} — унесёт в начало страницы`)
  }

  /* ── семья 6: ссылка, обещающая адрес, которого нет ───────────────────
   *
   * `href="#"` — это не «ссылки нет». Это ссылка НА ВЕРХ ЭТОЙ ЖЕ СТРАНИЦЫ:
   * нажал — уехал наверх, вернулся ни с чем. Поиск идёт по ней и считает
   * страницу ссылающейся на себя, скринридер объявляет её ссылкой, таб
   * останавливается на ней — и все трое обмануты одинаково.
   *
   * Замер, с которого семья заведена: ОДИННАДЦАТЬ таких по проекту, в шести
   * файлах — нижняя панель, знаки шапки, оба списка информационных ссылок,
   * подвал, условия в заказе и две кнопки протокола на карточке товара. Из
   * них я сперва починил две, а девять не искал: заказчик показал одно место,
   * а правило гласит — дефект чинится везде.
   *
   * Чем заменяется: `<a>` БЕЗ адреса. По стандарту это законная
   * ссылка-заготовка — «здесь будет ссылка, но пока её нет»: такую не
   * открыть, не поймать табом и не проиндексировать, а вся одежда, написанная
   * на `a`, к ней по-прежнему применяется. Ноль обещаний и ноль изменений на
   * вид. Появится страница — на её место встанет настоящий `<Link href=…>`.
   *
   * Якорь на этой же странице (`href="#lab"`, `href="#contact"`) — не дефект:
   * он ведёт туда, где что-то есть. Спрашивается только пустой. */
  /* Цвет числом в разметке: знак не следует теме.
   *
   * `fill="#CBD3CE"` у рисунка-заглушки выглядит безобидно и в светлой теме
   * верен. В тёмной он остаётся светлым: пузырёк светит белым там, где всё
   * вокруг приглушено. Проверка вёрстки этого не видит — литерал стоит не в
   * стилях, а в атрибуте разметки, и туда она не смотрит.
   *
   * Чужая марка — исключение, и оно названо словом: логотип Google обязан
   * быть цветов Google, и токеном его красить нельзя. Помечается комментарием
   * «чужая марка» над блоком — пометка действует на восемь строк вниз, то
   * есть на весь знак, а не на одну заливку из пяти. */
  /* Читается ИСХОДНИК, а не очищенный текст: пометка живёт в комментарии, а
     очистка их снимает — на очищенном исключение не сработало бы никогда. */
  const lines = raw.split('\n')
  for (const m of raw.matchAll(/(fill|stroke|stopColor)\s*=\s*["']#[0-9A-Fa-f]{3,8}["']/g)) {
    const ln = raw.slice(0, m.index).split('\n').length - 1
    if (lines.slice(Math.max(0, ln - 8), ln + 1).some((l) => /чужая марка/.test(l))) continue
    found.inkLiteral.push(`${at(m.index)}  ${m[0]} — цвет числом: знак не пойдёт за темой`)
  }

  for (const m of src.matchAll(/href\s*=\s*(?:"#"|'#'|\{\s*['"]#['"]\s*\})/g)) {
    found.deadLink.push(`${at(m.index)}  href="#" — ссылка на верх страницы вместо адреса`)
  }

  /* ── семья: адрес канала связи набран заново, а не спрошен у lib/contacts.ts
   *
   * `tel:`, `mailto:`, `t.me/`, `wa.me/`, `viber://` считает ровно одна
   * функция на весь сайт — `hrefOf` в `lib/contacts.ts`. Тот же номер,
   * написанный ещё где-то схемой самой ссылки, — это магазин, который на
   * один и тот же вопрос («как до вас дозвониться») отвечает в двух местах:
   * поправят номер в данных, а копия схемы останется со старым.
   *
   * Заказчик спросил прямо: «данные всех контактов — один источник
   * правды?» Ответ был «да» по чтению кода, но чтением это не измерить на
   * следующей правке — здесь та же гарантия, посчитанная. */
  if (!rel.endsWith('lib/contacts.ts')) {
    /* `(?!\|)` — не хватать сами схемы там, где их ПЕРЕЧИСЛЯЮТ для проверки
       (`components/Btn.tsx`: `/^(tel:|mailto:|https?:)/.test(...)`
       отличает внешний адрес от маршрута сайта, а не набирает контакт
       заново): после схемы там сразу стоит `|` — знак того же списка, а не
       продолжение настоящего адреса. */
    for (const m of src.matchAll(/\b(?:tel:|mailto:)(?!\|)|(?:https?:)?\/\/(?:t\.me|wa\.me)\/|viber:\/\//g)) {
      found.contactScheme.push(`${at(m.index)}  ${m[0]} — адрес канала связи вне lib/contacts.ts`)
    }
  }

  /* Сортировка, переставляющая ЧУЖОЙ массив.
   *
   * `sort` не возвращает новый список — он переставляет тот, у которого его
   * позвали. Список из `lib/` один на весь сайт: отсортировав его в одном
   * месте, получаешь другой порядок во всех остальных, и виноватым выглядит
   * место, где порядок «вдруг» не тот.
   *
   * Спрашивается не всякая сортировка, а только та, у которой перед точкой
   * ИМЯ, а не свежий список. `[...PRODUCTS].sort(…)`, `xs.filter(…).sort(…)`
   * и `[...map.entries()].sort(…)` переставляют копию, сделанную строкой
   * выше, — там переставлять нечего.
   *
   * Заведено взамен чужого правила `unicorn/no-array-sort`, которое требует
   * `toSorted()` от ВСЯКОЙ сортировки. Разбор — в `tools/lint-rules.md`:
   * пятнадцать наших случаев сортировали свежий список, а `toSorted` — ES2023,
   * и ради чистоты правила каталог падал бы целиком на Safari 16.0. */
  for (const m of src.matchAll(/\.sort\s*\(/g)) {
    /* Что стоит ПЕРЕД точкой — читается назад, через переносы строк: цепочка
       `xs .filter(…) .sort(…)`, разложенная на три строки, это одна строка
       кода. Закрывающая скобка значит «список только что сделан здесь». */
    let i = m.index - 1
    while (i >= 0 && /\s/.test(src[i])) i--
    if (i < 0 || src[i] === ']' || src[i] === ')') continue
    let j = i
    while (j >= 0 && /[\w$.]/.test(src[j])) j--
    const head = src.slice(j + 1, i + 1)
    if (!head) continue
    /* Чужой список — это либо имя из модуля (`PRODUCTS`, `CATEGORIES`: их
       пишут прописными и они одни на весь сайт), либо список, до которого
       добрались через точку (`state.items`, `props.rows`). Свой, собранный
       строкой выше в этой же функции, — обычное имя в нижнем регистре, и
       переставлять его безобидно: кроме этой функции его никто не видел. */
    const theirs = /^[A-Z][A-Z0-9_$]*$/.test(head) || head.includes('.')
    if (!theirs) continue
    found.mutSort.push(`${at(m.index)}  sort переставляет ${head} — список не свой`)
  }

  /* Склады — места, которым память браузера разрешена: они и есть тот самый
     «склад», через который её положено трогать. Список вариантов оформления
     тоже склад: он держит свой список под своим ключом, с теми же защитами
     от приватного режима и тем же уведомлением подписчиков. Загрузочный
     скрипт — тот же склад, только записанный строкой: он выполняется до
     первой отрисовки, в `<script>`, где ничего не импортировано, и читает
     те же ключи сам.

     Список — `stores` в `kit.config.json`: склад у каждого проекта свой, и
     зашитый список объявлял чужой витрине складом файлы, которых у неё нет,
     а её собственный — долгом. */
  if (!STORES.includes(rel)) {
    for (const m of src.matchAll(/\b(?:local|session)Storage\s*\.\s*(?:get|set|remove)Item/g)) {
      found.keep.push(`${at(m.index)}  память браузера мимо склада`)
    }
  }
}

/* ── семья: класс описан и никем не взят ───────────────────────────────────
 *
 * У модульного стиля имя класса перемешивается на сборке, и попасть в
 * разметку оно может ровно тремя путями: через импорт модуля в разметке
 * (`s.cat`), через `composes` из другого файла и через `composes` внутри
 * своего. Ни один из трёх не нашёлся — значит класса на странице нет вовсе,
 * а правило есть, читается и врёт: следующий, кто откроет файл, будет чинить
 * то, чего не видно.
 *
 * Заведено по счёту. В `app/[lang]/home.module.css` лежали три класса
 * витрины категорий — `.cats`, `.cat` и всё их устройство вместе со
 * стрелкой, нарисованной прямо в стиле, — и ни один не был взят никем:
 * блок давно переехал на общую плитку, а стили остались. Сорок строк,
 * которые выглядят как работающая витрина. Хуже того, внутри лежала стрелка
 * со ЗАПЕЧЁННЫМ цветом `#0C3A46`: в тёмной теме она была бы невидима — но
 * узнать это нельзя, потому что показать её нечем.
 *
 * Динамический доступ (`s[name]`, `s[`tone-${x}`]`) проверку выключает для
 * всего модуля: какое имя соберётся в строку, отсюда не видно, и лучше
 * промолчать, чем назвать живое мёртвым. */
{
  /* Читаются ВСЕ модули — и блоки, и общий словарь: словарь раздаёт классы
     через `composes`, и без него половина блоков выглядела бы мёртвой.
     А вот СПРАШИВАЕТСЯ только с блоков (`BLOCKS`): `styles/` — это набор,
     который вывозится в другие проекты, и примитив без сегодняшнего
     пользователя там не мёртвый код, а незанятая полка. */
  const BLOCKS = BLOCK_DIRS.map((d) => `${d}/`)
  const cssFiles = []
  for (const dir of STYLE_DIRS) walkCss(join(ROOT, dir))
  function walkCss(dir) {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walkCss(path)
      else if (name.endsWith('.module.css')) cssFiles.push(path)
    }
  }

  /* Кто как назван у зовущего: `import s from './x.module.css'` — и дальше
     в файле стоит `s.cat`. Алиас у каждого свой, поэтому имя берётся из
     самого импорта, а не угадывается. */
  const used = new Set()          // 'путь/файл.css|имя'
  const dynamic = new Set()       // модули, у которых имя собирается строкой
  const key = (file, cls) => `${file}|${cls}`

  /* Имя пакета или приставка (`@/` → `src/`) — по `aliases` из kit.config.json:
     ключ с косой чертой на конце — приставка, без неё — целое имя. Без записи
     `@/` считается корнем проекта — так лежат проекты набора; у первой витрины
     `@/` ведёт в `src/`, и три живых класса числились мёртвыми (И177). */
  const unalias = (spec) => {
    for (const [from, to] of Object.entries(ALIASES)) {
      if (from.endsWith('/') ? spec.startsWith(from) : spec === from) return to + spec.slice(from.length)
    }
    return spec.startsWith('@/') ? spec.slice(2) : null
  }
  const resolve = (fromRel, spec) => {
    const aliased = unalias(spec)
    const base = aliased !== null ? aliased
      : join(fromRel.split('/').slice(0, -1).join('/'), spec)
    return base.replace(/\\/g, '/')
  }

  for (const path of files) {
    const rel = relative(ROOT, path)
    const src = strip(readFileSync(path, 'utf8'))
    for (const m of src.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)) {
      const [, alias, spec] = m
      const mod = resolve(rel, spec)
      if (new RegExp(`\\b${alias}\\s*\\[`).test(src)) { dynamic.add(mod); continue }
      for (const u of src.matchAll(new RegExp(`\\b${alias}\\.([A-Za-z_][\\w-]*)`, 'g'))) {
        used.add(key(mod, u[1]))
      }
    }
  }

  /* `composes` — второй путь. Из чужого файла (`composes:grid from
     './primitives.module.css'`) и из своего (`composes:btn`). */
  for (const path of cssFiles) {
    const rel = relative(ROOT, path)
    const src = readFileSync(path, 'utf8')
    for (const m of src.matchAll(/composes\s*:\s*([^;{}]+?)\s+from\s+'([^']+)'/g)) {
      const mod = resolve(rel, m[2])
      for (const cls of m[1].trim().split(/\s+/)) used.add(key(mod, cls))
    }
    for (const m of src.matchAll(/composes\s*:\s*([^;{}]+?)\s*;/g)) {
      if (/\sfrom\s/.test(m[1])) continue
      for (const cls of m[1].trim().split(/\s+/)) used.add(key(rel, cls))
    }
  }

  for (const path of cssFiles) {
    const rel = relative(ROOT, path)
    if (dynamic.has(rel)) continue
    if (!BLOCKS.some((d) => rel.startsWith(d))) continue
    const src = readFileSync(path, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      /* Строки и адреса — не селекторы. Без этого `composes … from
         './x.module.css'` считался классами `.module` и `.css`, а ссылка на
         w3.org — классами `.w3` и `.org`. */
      .replace(/'[^'\n]*'|"[^"\n]*"/g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/url\([^)]*\)/g, (m) => m.replace(/[^\n]/g, ' '))
      /* `:global(.x)` — имя, которое НЕ перемешивается: его ставит не этот
         файл, и спрашивать с него некому. */
      .replace(/:global\([^)]*\)/g, (m) => m.replace(/[^\n]/g, ' '))

    /* Имя класса ищется ТОЛЬКО в селекторе — куске перед `{`, считая от
       конца предыдущего правила. Иначе классом становится всё, что похоже на
       точку с буквой: доли в `calc(.643)`, `.3em`, имя файла в значении. */
    const seen = new Set()
    let from = 0
    for (const m of src.matchAll(/\{/g)) {
      const prelude = src.slice(from, m.index)
      const cut = Math.max(prelude.lastIndexOf('}'), prelude.lastIndexOf(';'))
      const head = prelude.slice(cut + 1)
      from = m.index + 1
      if (head.trim().startsWith('@')) continue
      for (const c of head.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
        const cls = c[1]
        if (seen.has(cls)) continue
        seen.add(cls)
        if (used.has(key(rel, cls))) continue
        const line = src.slice(0, from - 1 + (cut + 1) + c.index - (from - 1)).split('\n').length
        found.deadStyle.push(`${rel}:${src.slice(0, m.index).split('\n').length}  .${cls} — класс описан, но его никто не берёт`)
      }
    }
  }
}

/* ── настройка, которая ничего не меняет ───────────────────────────────────
   У поля панели есть ПРОВОД: `wire: { to:'attr', name:'x' }` ставит
   `data-x` на корень документа, `to:'var'` — переменную `--x`. Провод,
   у которого на другом конце ничего нет, — это ручка, которую можно крутить
   без всякого следствия. Она не «про запас»: её никто не открывает, а
   значит никто и не замечает, что она мертва.

   Дефект, купивший семью: «Per-drop figure» в разделе меню — выбор из двух
   положений, не привязанный ни к одной строке CSS. Прожил месяцы; нашёлся
   только когда раздел снимали целиком и я спросил, к чему были привязаны
   его ручки. Заказчик к тому времени успел по нему «выбрать».

   Ключ без провода тоже считается: его читает компонент через `useValue`,
   и если имени ключа нет нигде, кроме самого описания, — поле висит в
   воздухе. Имена, собранные в коде из кусков (`chan${Code}`), проверка
   видит по общей части, поэтому ищется ещё и она. */
{
  const schemaPath = join(ROOT, 'lib/studio/schema.ts')
  if (existsSync(schemaPath)) {
    const schema = readFileSync(schemaPath, 'utf8')
    /* Весь остальной код одной строкой: ищем в нём следы провода. */
    const css = []
    const grab = (dir) => {
      if (!existsSync(dir)) return
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) grab(path)
        else if (name.endsWith('.css')) css.push(path)
      }
    }
    for (const dir of STYLE_DIRS) grab(join(ROOT, dir))
    const rest = [...files, ...css]
      .filter((p) => !p.endsWith('lib/studio/schema.ts'))
      .map((p) => readFileSync(p, 'utf8')).join('\n')
    const re = /kind:\s*'(\w+)',\s*key:\s*'(\w+)',\s*label:\s*'([^']*)'([\s\S]{0,400}?)(?=\n\s{6}[{/]|\n\s{4}\])/g
    let m
    while ((m = re.exec(schema))) {
      const [, , key, label, rest2] = m
      const attr = /wire:\s*\{\s*to:\s*'attr',\s*name:\s*'([\w-]+)'/.exec(rest2)
      const vr = /wire:\s*\{\s*to:\s*'var',\s*name:\s*'([\w-]+)'/.exec(rest2)
      let what = null
      if (attr) what = `data-${attr[1]}`
      else if (vr) what = `--${vr[1]}`
      else if (/wire:\s*\{\s*to:\s*'(ink|face)'/.test(rest2)) continue
      if (what) {
        if (!rest.includes(what)) {
          found.deadSetting.push(`${key} «${label}» — провод ведёт в ${what}, а такого в коде нет`)
        }
        continue
      }
      /* Без провода: ключ обязан читаться кем-то по имени — целиком или
         общей частью составного имени. */
      const stem = key.replace(/[A-Z]\w*$/, '')
      if (rest.includes(`'${key}'`) || rest.includes(`\`${key}\``)) continue
      if (stem.length >= 4 && rest.includes(stem)) continue
      found.deadSetting.push(`${key} «${label}» — провода нет, и по имени его никто не читает`)
    }
  }
}

/* ── семья: сторож, оставленный на входном файле ───────────────────────────
 *
 * Длинный файл разнимают на части, а на его месте оставляют ВХОД — файл из
 * одних перевывозов (`export … from './часть'`). Ввозящие ничего не замечают:
 * путь тот же. Замечать нечего и сторожу — но только до тех пор, пока он
 * ВВОЗИТ. Сторож, который читает файл ИСХОДНИКОМ (`readFileSync`) и ищет в
 * тексте образец, после разъёма находит пустоту: он не падает, он молчит.
 * Проверка, которая больше ничего не проверяет и при этом зелёная, хуже
 * отсутствующей — на неё ссылаются как на доказательство.
 *
 * Дефект: 19.09.2026 на cbdshop.bg разняли семь длинных файлов, и восемь
 * сторожей читали их исходником — подпись мастерской в подвале, ключ марки,
 * отбор по ключу, сборщики блоков главной, подзаголовок плитки эффекта.
 * Три из восьми стали бы вечнозелёными молча; поймано перечитыванием
 * каждого, а не прогоном.
 *
 * Признак дешёвый и точный: файл — вход (в нём, кроме комментариев, одни
 * `export … from`), и его имя стоит строкой в файле, где есть `readFileSync`.
 */
{
  const barrels = new Map()
  for (const path of files) {
    const rel = relative(ROOT, path)
    if (/\.test\.tsx?$/.test(rel)) continue
    const body = strip(readFileSync(path, 'utf8'))
      .split('\n').map((l) => l.trim()).filter(Boolean)
    if (body.length === 0) continue
    /* Вход — это перевывозы и ничего больше. Одна своя строка кода, и файл
       уже не вход: сторожу есть что в нём читать. */
    const onlyReExports = body.every((line) =>
      /^export\s/.test(line) && /\sfrom\s/.test(line) ||
      /^(export\s*\{|\}\s*from\s|[A-Za-z_$][\w$]*,?$|\}\s*$|type\s)/.test(line))
    const hasFrom = body.some((line) => /^export[\s\S]*\sfrom\s/.test(line) || /^\}\s*from\s/.test(line))
    if (onlyReExports && hasFrom) barrels.set(rel, basename(rel))
  }

  /* Сторожа лежат не только в папках кода: у первой витрины половина их —
     в корне `src`, рядом с деревом страниц, а не внутри него. Обход идёт по
     общему корню папок кода, иначе ровно те сторожа, что читают исходники,
     в счёт и не попадают. */
  const root = commonRoot(DIRS)
  const tests = []
  walkTests(join(ROOT, root))
  function walkTests(dir) {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walkTests(path)
      else if (/\.test\.tsx?$/.test(name)) tests.push(path)
    }
  }

  for (const path of tests) {
    const rel = relative(ROOT, path)
    const code = readFileSync(path, 'utf8')
    if (!/readFileSync/.test(code)) continue
    /* Ввоз — не чтение. `import { x } from './catalog.ts'` переживает разъём
       без единой правки: вход на то и вход. Считается только имя, набранное
       как ПУТЬ К ФАЙЛУ, — поэтому спецификаторы ввоза снимаются до счёта. */
    const text = code
      .replace(/\bfrom\s*['"][^'"\n]+['"]/g, ' ')
      .replace(/\bimport\s*\(\s*['"][^'"\n]+['"]\s*\)/g, ' ')
    const literals = [...text.matchAll(/'([^'\n]+)'|"([^"\n]+)"/g)].map((m) => (m[1] ?? m[2]).split('\\').join('/'))
    for (const [barrel, name] of barrels) {
      /* Назван ИМЕНЕМ, а не подстрокой: сторож, обходящий все файлы подряд,
         ничего не называет — он и не перестаёт работать от разъёма. */
      const named = literals.some((lit) => lit === name || lit.endsWith('/' + name))
      if (!named) continue
      found.deadGuard.push(`${rel} читает исходником ${barrel} — там одни перевывозы`)
    }
  }
}

for (const [, v] of bodies) {
  if (!v.also.length) continue
  const where = [v.where, ...v.also.map((a) => a.where)].join('  =  ')
  const names = [...new Set([v.name, ...v.also.map((a) => a.name)])].join(' / ')
  found.twice.push(`${names}: ${where}`)
}

const counts = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.length]))

/* Подписи семей — в реестре `code-families.mjs`: их же печатает скилл. */

if (process.argv.includes('--list')) {
  const pick = process.argv[process.argv.indexOf('--list') + 1]
  for (const k of found[pick] ? [pick] : Object.keys(NAMES)) {
    console.log(`\n${NAMES[k]} — ${found[k].length}`)
    for (const line of found[k]) console.log(`    ${line}`)
  }
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
  console.error(`Нет ${relative(ROOT, BASELINE)}. Создать: npm run check:code -- --update`)
  process.exit(1)
}

let failed = false
for (const key of Object.keys(NAMES)) {
  const now = counts[key], was = base[key] ?? 0
  if (now > was) {
    failed = true
    console.error(`\n✗ ${NAMES[key]}: было ${was}, стало ${now}`)
    for (const line of found[key].slice(-(now - was) * 3)) console.error(`    ${line}`)
  } else if (now < was) {
    console.log(`✓ ${NAMES[key]}: ${was} → ${now}`)
  } else {
    console.log(`· ${NAMES[key]}: ${now}`)
  }
}

if (failed) {
  console.error('\nДолга по коду стало больше. Либо чините, либо — если это')
  console.error('осознанное решение — обновляйте базу: npm run check:code -- --update')
  process.exit(1)
}

const total = Object.values(counts).reduce((a, b) => a + b, 0)
const wasTotal = Object.values(base).reduce((a, b) => a + b, 0)
if (total < wasTotal) console.log(`\nДолг сократился: ${wasTotal} → ${total}. Обновите базу.`)
