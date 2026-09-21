/*
 * Стенд шрифта: шесть кандидатов на одном и том же тексте витрины, в обеих
 * темах, с числами, спрошенными у Google при сборке.
 *
 * Зачем он: шрифт словами не выбирают. «Гротеск, чуть теплее Inter» не
 * говорит заказчику ничего, а выбор случается ровно в ту секунду, когда
 * «CBD масло 10 %», цена 89,00 лв. и «В количката» набраны этим шрифтом и
 * переключаются одним нажатием (CLAUDE.md, «Выбор показывается глазами, а не
 * списком»: «Всё, что заказчик выбирает видом — цвет, шрифт, раскладка,
 * форма кнопки, снимок, — приходит к нему ОТРИСОВАННЫМ»).
 *
 *   node tools/face-stand.mjs [куда.html]
 *
 * ПОРЯДОК — что за чем делает заказчик, открыв страницу:
 *
 *   1. жмёт кандидата — Inter, Manrope, IBM Plex Sans, Commissioner и две
 *      пары с засечкой на заголовке — и смотрит на ОДИН и тот же текст
 *      витрины: заголовок страницы, заголовок раздела, вводный абзац,
 *      карточка товара с ценой и «В количката». Меняется только шрифт:
 *      кегль, межстрочье, вес и разрядка приходят из ролей и не трогаются;
 *   2. читает строку диакритики — `čaj · žuta · đumbir · Sănătate ·
 *      îngrijire · ș ț`: витрина болгарская, а смотрит на хорватский и
 *      румынский, и разваливается шрифт именно там;
 *   3. смотрит цифры: два ряда друг под другом, `0000000000` и
 *      `1111111111`. Если ряды одной длины — цена не пляшет; если нет —
 *      у этого шрифта нет табличных цифр, и это цена выбора;
 *   4. переключает тему и видит засечку на тёмном: серому тексту засечки
 *      тонки, и решается это здесь, а не после сдачи;
 *   5. ставит «Все шесть подряд» и сравнивает их рядом на одном предмете;
 *   6. и только в самом низу — числа: что ответил Google про каждое
 *      семейство.
 *
 * ЧТО ВНУТРИ. Собран ИЗ ВЫПУЩЕННОГО, как стенды органов, формы и раскладки:
 * `styles/palette.css`, `styles/scale.css`, `styles/tokens.css` и
 * `styles/primitives.module.css` вставлены в страницу как есть (у модуля
 * снимается одна строка — `composes`, которой в простом CSS нет). Роли
 * текста — `--pagehead-*`, `--h2-*`, `--intro-*`, `--body-*`, `--note-*` —
 * стенд только ПРИМЕНЯЕТ: их выпускает строитель шкал, и переписывать их
 * здесь значило бы завести второй ответ на вопрос «каким кеглем набран
 * заголовок».
 *
 * Шрифт — единственное внешнее, что стенду разрешено грузить: одна ссылка на
 * `fonts.googleapis.com` с `display=swap`. Имя семейства ставится ролями
 * `--face` и `--face-head` из `styles/tokens.css`, а не `font-family` по
 * месту, — тем же способом, каким шрифт задан в наборе.
 *
 * Числа рядом с кандидатом не набраны рукой: при сборке инструмент
 * СПРАШИВАЕТ Google — тот же адрес `css2?family=…`, тот же заголовок
 * браузера, — и разбирает ответ: какие подмножества отданы (`cyrillic`,
 * `latin-ext`), переменный шрифт или нет, какой диапазон весов. Сверх того
 * скачивает сами `woff2` и читает в них две вещи, от которых зависит
 * витрина: есть ли `tnum` и одной ли ширины цифры (цена не должна плясать) и
 * объявлен ли болгарский язык в `locl` (у болгарина свои начертания в г д ж
 * з и й к л п т ц ш щ ю). Google не ответил — на стенде стоит прочерк и
 * сказано, что не спрошено; выдумать число стенд не может.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { brotliDecompressSync } from 'node:zlib'
import path from 'node:path'

const read = (p) => (existsSync(path.resolve(p)) ? readFileSync(path.resolve(p), 'utf8') : '')

const scaleCss = read('styles/scale.css')
if (!scaleCss) {
  console.error('✗ Нет styles/scale.css — показывать нечего.')
  console.error('    Сначала выпустите шкалы: npm run scale')
  process.exit(1)
}
const primRaw = read('styles/primitives.module.css')
if (!primRaw) {
  console.error('✗ Нет styles/primitives.module.css — карточки и ряда, на которых виден шрифт, в проекте ещё нет.')
  process.exit(1)
}
const paletteCss = read('styles/palette.css')
const tokensCss = read('styles/tokens.css')

/* `composes` — единственное, чем модуль отличается от простого CSS: он
   ссылается на класс из соседнего файла, и вне сборщика это не объявление,
   а мусор. Снимается только он; всё остальное едет дословно. */
const primCss = primRaw.replace(/composes\s*:[^;}]*;?/g, '')

/* ── чтение выпущенного ───────────────────────────────────────────────────
   Числа на стенде не набираются рукой: набранные рукой, они расходятся с
   файлом в тот же день, когда файл поправят. */

/** Тело блока в фигурных скобках, начиная от места: со счётом вложенности,
 *  потому что у `@media` внутри лежит ещё один блок. */
const blockAt = (text, from) => {
  const open = text.indexOf('{', from)
  if (open < 0) return ''
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i)
  }
  return ''
}

/** Объявления `--имя: значение` из куска текста, первое вхождение имени. */
const decls = (text, re) => {
  const out = new Map()
  for (const m of text.matchAll(re)) if (!out.has(m[1])) out.set(m[1], m[2].trim())
  return out
}

const ANY = /(--[\w-]+)\s*:\s*([^;}]+)/g

/* Роли текста лежат в двух выпущенных файлах: размер заголовка страницы и
   вводного абзаца мерят СВОЮ КОЛОНКУ (`cqi`) и потому стоят в токенах, а
   межстрочье, вес и разрядка — в шкале. Стенд читает оба корня и показывает
   заказчику, что именно применяет, — не переписывая ни одной величины. */
const emitted = new Map([
  ...decls(blockAt(tokensCss, tokensCss.indexOf(':root')), ANY),
  ...decls(blockAt(scaleCss, scaleCss.indexOf(':root')), ANY),
])

/** Роль пятью фактами: размер, межстрочье, вес, разрядка, мера. Прочерк
 *  значит, что роли в выпущенном нет, а не что её можно выдумать. */
const role = (key) => ({
  size: emitted.get(`--${key}-size`) ?? null,
  lead: emitted.get(`--${key}-lead`) ?? null,
  weight: emitted.get(`--${key}-weight`) ?? null,
  track: emitted.get(`--${key}-track`) ?? null,
})

const ROLES = ['pagehead', 'h2', 'intro', 'body', 'note'].map((k) => [k, role(k)])
const missing = ROLES.filter(([, r]) => !r.lead).map(([k]) => `--${k}-lead`)

/* ── шесть кандидатов ─────────────────────────────────────────────────────
   `body` — семейство текста (роль `--face`), `head` — заголовков
   (`--face-head`). У четырёх они совпадают: одно лицо — решение, два —
   система, и предлагаются обе. */
const FACES = [
  { id: 'inter', label: 'Inter', body: 'Inter', head: 'Inter',
    say: 'Нейтральная рабочая лошадь интерфейса. Ничего не говорит о себе — и в этом её работа: читается цена, а не шрифт.' },
  { id: 'manrope', label: 'Manrope', body: 'Manrope', head: 'Manrope',
    say: 'Геометричная, чуть теплее Inter: круглее «о» и «с», мягче концы штрихов. Витрина выходит дружелюбнее, не становясь несерьёзной.' },
  { id: 'plex', label: 'IBM Plex Sans', body: 'IBM Plex Sans', head: 'IBM Plex Sans',
    say: 'Техничная, «аптечная»: узкие овалы, прямые срезы. Её называл прошлый проект, и в наборе она и стоит сегодня — <code>--face: var(--f-plex)</code>.' },
  { id: 'commissioner', label: 'Commissioner', body: 'Commissioner', head: 'Commissioner',
    say: 'Гуманистическая: в основе движение пера, а не циркуль. Длинный текст на ней устаёт меньше, чем на геометрической.' },
  { id: 'literata', label: 'Literata + Inter', body: 'Inter', head: 'Literata',
    say: 'Пара: журнальная засечка на заголовке, гротеск в тексте. Заголовок начинает звучать как статья, а не как кнопка.' },
  { id: 'source', label: 'Source Serif 4 + Manrope', body: 'Manrope', head: 'Source Serif 4',
    say: 'Вторая пара, мягче: засечка тоньше и спокойнее Literata, текст на Manrope её догревает.' },
]

const FAMILIES = [...new Set(FACES.flatMap((f) => [f.head, f.body]))].sort()

/* ── что ответил Google ───────────────────────────────────────────────────
   Google отдаёт РАЗНЫЙ CSS разным браузерам: старому — ttf и по файлу на
   вес, современному — woff2 и переменный шрифт одним файлом. Без заголовка
   браузера инструмент спросил бы не то, что спросит витрина. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const cssUrl = (fam) => `https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, '+')}:wght@400..700&display=swap`

/* Одна ссылка на всю страницу: семейства в алфавитном порядке — так требует
   css2, иначе адрес отвечает отказом. */
const LINK = `https://fonts.googleapis.com/css2?${FAMILIES.map((f) => `family=${f.replace(/ /g, '+')}:wght@400..700`).join('&')}&display=swap`

/* ── woff2 без единой зависимости ─────────────────────────────────────────
   Подмножества видно в самом CSS, а две вещи, от которых зависит витрина, —
   табличные цифры и болгарские начертания — лежат внутри шрифта. Читать их
   надо из того файла, который браузер и скачает, а не из памяти: woff2 — это
   заголовок, таблица тегов и один поток brotli, и brotli в Node свой. */
const WOFF2_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm',
  'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT',
  'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC',
  'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat',
  'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf',
  'Silf', 'Glat', 'Gloc', 'Feat', 'Sill']

/** Целое переменной длины: по семь бит на байт, старший бит — продолжение. */
const base128 = (buf, at) => {
  let v = 0
  for (let i = 0; i < 5; i++) {
    const b = buf[at + i]
    v = ((v << 7) | (b & 0x7f)) >>> 0
    if (!(b & 0x80)) return [v, at + i + 1]
  }
  throw new Error('UIntBase128 длиннее пяти байт')
}

/** Таблицы шрифта из woff2. Преобразованию подлежат только glyf, loca и
 *  hmtx — у них в каталоге стоит вторая длина; всё остальное, включая GSUB,
 *  едет как есть. */
const woff2Tables = (buf) => {
  if (buf.readUInt32BE(0) !== 0x774f4632) throw new Error('не wOF2')
  const count = buf.readUInt16BE(12)
  let at = 48
  const dir = []
  for (let i = 0; i < count; i++) {
    const flags = buf[at++]
    let tag = WOFF2_TAGS[flags & 0x3f]
    if ((flags & 0x3f) === 0x3f) { tag = buf.toString('latin1', at, at + 4); at += 4 }
    let len; [len, at] = base128(buf, at)
    const tv = (flags >> 6) & 3
    const moved = tag === 'glyf' || tag === 'loca' ? tv !== 3 : tag === 'hmtx' ? tv !== 0 : false
    if (moved) { let t; [t, at] = base128(buf, at); len = t }
    dir.push({ tag, len })
  }
  const flat = brotliDecompressSync(buf.subarray(at, at + buf.readUInt32BE(24)))
  const out = new Map()
  let off = 0
  for (const t of dir) { out.set(t.tag, flat.subarray(off, off + t.len)); off += t.len }
  return out
}

/** Свойства раскладки: какие фичи объявлены (`tnum`, `locl`) и для каких
 *  языков (`cyrl/BGR` — болгарские начертания, `latn/ROM` — румынская
 *  запятая под ș и ț). */
const layoutOf = (tbl) => {
  const feats = new Set(); const langs = new Set()
  for (const nm of ['GSUB', 'GPOS']) {
    const t = tbl.get(nm)
    if (!t || t.length < 10) continue
    const sl = t.readUInt16BE(4); const fl = t.readUInt16BE(6)
    const fc = t.readUInt16BE(fl)
    for (let i = 0; i < fc; i++) feats.add(t.toString('latin1', fl + 2 + i * 6, fl + 6 + i * 6))
    const sc = t.readUInt16BE(sl)
    for (let i = 0; i < sc; i++) {
      const script = t.toString('latin1', sl + 2 + i * 6, sl + 6 + i * 6).trim()
      const so = sl + t.readUInt16BE(sl + 6 + i * 6)
      const lc = t.readUInt16BE(so + 2)
      for (let j = 0; j < lc; j++) langs.add(`${script}/${t.toString('latin1', so + 4 + j * 6, so + 8 + j * 6).trim()}`)
    }
  }
  return { feats, langs }
}

/** Ширины десяти цифр. Одна на всех — цена не пляшет и без `tnum`; разные —
 *  табличные цифры обязаны найтись в шрифте, иначе просить их нечем. */
const digitsOf = (tbl) => {
  const head = tbl.get('head'); const hhea = tbl.get('hhea')
  const hmtx = tbl.get('hmtx'); const cmap = tbl.get('cmap')
  if (!head || !hhea || !hmtx || !cmap) return null
  const nh = hhea.readUInt16BE(34)
  let sub = null
  const nt = cmap.readUInt16BE(2)
  for (let i = 0; i < nt; i++) {
    const o = cmap.readUInt32BE(8 + i * 8)
    if (cmap.readUInt16BE(o) === 4) { sub = cmap.subarray(o); break }
  }
  if (!sub) return null
  const seg = sub.readUInt16BE(6) / 2
  const gid = (cp) => {
    for (let s = 0; s < seg; s++) {
      if (cp > sub.readUInt16BE(14 + s * 2)) continue
      const start = sub.readUInt16BE(16 + seg * 2 + s * 2)
      if (cp < start) return 0
      const delta = sub.readInt16BE(16 + seg * 4 + s * 2)
      const roAt = 16 + seg * 6 + s * 2
      const ro = sub.readUInt16BE(roAt)
      if (!ro) return (cp + delta) & 0xffff
      const g = sub.readUInt16BE(roAt + ro + (cp - start) * 2)
      return g ? (g + delta) & 0xffff : 0
    }
    return 0
  }
  const adv = (g) => (g < nh ? hmtx.readUInt16BE(g * 4) : hmtx.readUInt16BE((nh - 1) * 4))
  const w = []
  for (let cp = 0x30; cp <= 0x39; cp++) { const g = gid(cp); if (!g) return null; w.push(adv(g)) }
  return { em: head.readUInt16BE(18), widths: w, same: new Set(w).size === 1 }
}

/** Спросить Google про одно семейство и разобрать ответ. Не ответил —
 *  честный отказ, а не выдуманные подмножества. */
async function ask(fam) {
  const out = { fam, ok: false, subsets: [], weight: null, blocks: 0, bytes: 0, why: '' }
  let css = ''
  try {
    const r = await fetch(cssUrl(fam), { headers: { 'User-Agent': UA } })
    if (!r.ok) { out.why = `HTTP ${r.status}`; return out }
    css = await r.text()
  } catch (e) { out.why = String(e.message ?? e); return out }
  out.ok = true
  out.bytes = Buffer.byteLength(css)
  out.blocks = (css.match(/@font-face/g) ?? []).length
  out.subsets = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\//g)].map((m) => m[1])
  out.weight = (/font-weight:\s*([^;]+)/.exec(css) ?? [])[1]?.trim() ?? null
  /* Переменный шрифт Google отдаёт диапазоном в одном объявлении — «400 700»
     против «400» у статического, по файлу на вес. */
  out.variable = /^\d+\s+\d+$/.test(out.weight ?? '')
  const grab = async (sub) => {
    const b = new RegExp(`/\\*\\s*${sub}\\s*\\*/\\s*@font-face\\s*\\{([\\s\\S]*?)\\}`).exec(css)
    if (!b) return null
    const u = /url\((\S+?)\)/.exec(b[1])
    if (!u) return null
    const r = await fetch(u[1], { headers: { 'User-Agent': UA } })
    if (!r.ok) return null
    return woff2Tables(Buffer.from(await r.arrayBuffer()))
  }
  try {
    const lat = await grab('latin')
    if (lat) { const L = layoutOf(lat); out.tnum = L.feats.has('tnum'); out.digits = digitsOf(lat); out.latFeats = [...L.feats].sort(); out.latLangs = [...L.langs].sort() }
    const cyr = await grab('cyrillic')
    if (cyr) { const C = layoutOf(cyr); out.bgr = [...C.langs].some((l) => l === 'cyrl/BGR'); out.cyrLangs = [...C.langs].sort() }
    else if (out.subsets.includes('cyrillic')) out.bgr = null
  } catch (e) { out.probeWhy = String(e.message ?? e) }
  return out
}

const GOOGLE = new Map()
for (const fam of FAMILIES) GOOGLE.set(fam, await ask(fam))

const asked = [...GOOGLE.values()].filter((g) => g.ok).length

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const yn = (v) => (v === true ? 'есть' : v === false ? '<b class="t-warn">нет</b>' : '—')

/** Табличные цифры одной строкой: три разных случая, и путать их нельзя.
 *  Ширины равны — просить нечего, цена и так не пляшет; есть `tnum` —
 *  `font-variant-numeric` сработает; ни того ни другого — не сработает. */
const tabular = (g) => {
  if (!g?.digits) return { say: '—', ok: null }
  if (g.digits.same) return { say: 'по умолчанию', ok: true }
  if (g.tnum) return { say: 'по <code>tnum</code>', ok: true }
  return { say: '<b class="t-warn">нет</b>', ok: false }
}

/* ── текст витрины: один и тот же под каждым кандидатом ───────────────────
   Нарочно НЕ «Съешь ещё этих мягких булок» и не панграмма: панграмма
   показывает алфавит, а выбирают не алфавит, а то, как под этим шрифтом
   читается цена рядом с «В количката» и не спорит ли заголовок с ней. */
const SHOP = (id) => `
        <div class="t-shop" lang="bg">
          <p class="t-eyebrow">Био · Пловдив</p>
          <h3 class="t-ph">Натурални CBD масла</h3>
          <p class="t-intro">Студено пресовано конопено масло с пълен спектър, произведено в България. Всяка партида минава независим лабораторен анализ за съдържание на канабидиол, пестициди и тежки метали. Сертификатът стои в описанието на всеки продукт, а не в бележка под линия.</p>
          <h4 class="t-h2">Най-продавани</h4>
          <article class="t-card">
            <div class="t-shot" aria-hidden="true"></div>
            <p class="t-nm">CBD масло 10 %</p>
            <p class="t-sub">10 ml · 1000 mg</p>
            <p class="t-price"><span class="t-now">89,00 лв.</span><s class="t-was">129,00 лв.</s><span class="t-sale">−20 %</span></p>
            <div class="cluster">
              <span class="chip t-chip">пълен спектър</span>
              <span class="chip t-chip">веган</span>
            </div>
            <button type="button" class="t-go">В количката</button>
          </article>
        </div>
        <div class="t-probe">
          <p class="t-key">Диакритика — хорватский и румынский</p>
          <p class="t-dia"><span lang="hr">Zdravlje · čaj · žuta · đumbir</span> · <span lang="ro">Sănătate · ceai · îngrijire · ș ț</span></p>
          <p class="t-say">Витрина болгарская, а рынок рядом — хорватский и румынский. Разваливается шрифт всегда на них: <code>đ</code> сталкивается с соседом, а под <code>ș</code> и <code>ț</code> вместо запятой встаёт седиль от турецкого.</p>
        </div>
        <div class="t-probe">
          <p class="t-key">Цифры — одной ширины или нет</p>
          <p class="t-nums t-tab" id="tab-${id}"><span class="t-run">0000000000</span><span class="t-run">1111111111</span></p>
          <p class="t-nums t-prop"><span class="t-run">0000000000</span><span class="t-run">1111111111</span></p>
          <p class="t-nums t-tab"><span class="t-run">0123456789</span><span class="t-run">89,00 лв.</span><span class="t-run">129,00 лв.</span></p>
          <p class="t-say">Сверху <code>tabular-nums</code>, под ним — пропорциональные. Если верхние два ряда одной длины, а нижние разной, шрифт умеет табличные цифры и цена в колонке не пляшет. Если обе пары разной длины — не умеет, и просить нечем.</p>
        </div>`

/* Кандидат целиком: шапка с числами и под ней витрина. Числа стоят РЯДОМ с
   картинкой, а не вместо неё (CLAUDE.md: «Числа при этом не исчезают: они
   идут рядом с картинкой и отвечают на свой вопрос»). */
const strip = (f) => {
  const fams = f.head === f.body ? [['', f.body]] : [['заголовки', f.head], ['текст', f.body]]
  return fams.map(([what, fam]) => {
    const g = GOOGLE.get(fam)
    if (!g?.ok) return `<span class="t-fact">${what ? `${what} · ` : ''}<b>${esc(fam)}</b> — Google не спрошен${g?.why ? ` (${esc(g.why)})` : ''}</span>`
    const t = tabular(g)
    return `<span class="t-fact">${what ? `${what} · ` : ''}<b>${esc(fam)}</b> · веса ${esc(g.weight ?? '—')}${g.variable ? ' (переменный)' : ' (статический)'} · кириллица ${yn(g.subsets.includes('cyrillic'))} · latin-ext ${yn(g.subsets.includes('latin-ext'))} · табличные цифры ${t.say} · болгарские начертания ${yn(g.bgr)}</span>`
  }).join('')
}

const sections = FACES.map((f, i) => `
      <section class="t-face" data-id="${f.id}"${i === 0 ? '' : ' hidden'}>
        <header class="t-head">
          <p class="t-name">${esc(f.label)}</p>
          <p class="t-say">${f.say}</p>
          <p class="t-facts">${strip(f)}</p>
        </header>
${SHOP(f.id)}
      </section>`).join('')

/* Роль ставится один раз, на кандидате: ниже всё берёт `var(--face)` и
   `var(--face-head)` — ровно те роли, которыми шрифт задан в наборе
   (`styles/tokens.css`). `font-family` по месту нет ни одного. */
const faceRules = FACES.map((f) =>
  `.t-face[data-id="${f.id}"]{--face:'${f.body}', var(--face-stack);--face-head:'${f.head}', var(--face-stack)}`).join('\n')

const btns = FACES.map((f, i) =>
  `<button class="t-btn t-pick" type="button" data-pick="${f.id}" aria-pressed="${i === 0}">${esc(f.label)}</button>`).join('')

/* ── таблицы чисел ─────────────────────────────────────────────────────── */
const famRows = FAMILIES.map((fam) => {
  const g = GOOGLE.get(fam)
  if (!g?.ok) return `<tr><td>${esc(fam)}</td><td colspan="6">Google не ответил при сборке${g?.why ? `: ${esc(g.why)}` : ''}</td></tr>`
  const t = tabular(g)
  return `<tr><td>${esc(fam)}</td><td>${esc(g.subsets.join(', '))}</td><td>${g.blocks}</td><td>${esc(g.weight ?? '—')}</td><td>${g.variable ? 'да' : '<b class="t-warn">нет</b>'}</td><td>${t.say}</td><td>${yn(g.bgr)}</td></tr>`
}).join('\n')

const roleRows = ROLES.map(([k, r]) =>
  `<tr><td><code>--${k}-*</code></td><td>${esc(r.size ?? 'из роли выше')}</td><td>${esc(r.lead ?? '—')}</td><td>${esc(r.weight ?? '—')}</td><td>${esc(r.track ?? '—')}</td></tr>`).join('\n')

const gone = []
if (!paletteCss) gone.push('styles/palette.css')
if (!tokensCss) gone.push('styles/tokens.css')
const goneLine = gone.length
  ? `<p class="t-say t-warn">Нет ${gone.map((f) => `<code>${f}</code>`).join(', ')} — часть красок и ролей на стенде не разрешится. Это не поломка стенда: он показывает ровно то, что выпущено.</p>`
  : ''
const missingLine = missing.length
  ? `<p class="t-say t-warn">В выпущенном ещё нет ${missing.map((n) => `<code>${n}</code>`).join(', ')} — эта роль на стенде встанет по умолчанию браузера. Выдумать её стенд не может.</p>`
  : ''
const offlineLine = asked === FAMILIES.length
  ? ''
  : `<p class="t-say t-warn">При сборке Google ответил про ${asked} семейств${asked === 1 ? 'о' : ''} из ${FAMILIES.length}. Там, где не ответил, на стенде стоит прочерк: подмножества не выдумываются. Пересоберите с сетью — <code>node tools/face-stand.mjs</code>.</p>`

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Стенд шрифта</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${LINK}">
<style>
${paletteCss}
${tokensCss}
${scaleCss}
${primCss}
</style>
<style>
/* Своя одежда стенда. Ни одного кегля, поля, отступа и зазора числом: всё —
   роли из вставленного выше (запреты 1 и 2). Углы — только роли
   <code>--r-*</code>, тени — только <code>--sh-*</code>, толщина линии и
   кольца — <code>--line-w</code> и <code>--ring-w</code>. Краска — роль.
   Внешнего — ровно одно: шрифты Google. */
*{box-sizing:border-box;margin:0}
body{background:var(--page);color:var(--ink);
  font-family:var(--face-stack);
  font-size:var(--body-size);line-height:var(--body-lead);
  padding:var(--air-group) var(--gut) var(--air-page)}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
:focus-visible{outline:var(--ring-w) solid var(--ring);outline-offset:var(--ring-off)}
.t-col{max-inline-size:min(var(--wrap), 100%);margin-inline:auto;
  display:flex;flex-direction:column;gap:var(--air-band);min-inline-size:0}
.t-sec{display:flex;flex-direction:column;gap:var(--air-group);min-inline-size:0}
h1{font-size:var(--h2-size);line-height:var(--h2-lead);letter-spacing:var(--h2-track);font-weight:var(--h2-weight)}
h2{font-size:var(--h3-size);line-height:var(--h3-lead);letter-spacing:var(--h3-track);font-weight:var(--h3-weight)}
/* overflow-wrap:anywhere — не косметика: в прозе стоят адреса и имена
   ролей одним куском — fonts.googleapis.com/css2?family=… — и на 360 такой
   кусок шире колонки. Без разрешения рвать он вылезает за край и тянет за
   собой горизонтальную прокрутку всей страницы. */
.t-say{max-inline-size:var(--body-measure);color:var(--ink-soft);
  font-size:var(--note-size);line-height:var(--note-lead);overflow-wrap:anywhere}
.t-say b{color:var(--ink);font-weight:600}
.t-warn{color:var(--bad)}
.t-key{font-size:var(--note-size);color:var(--ink-soft);font-weight:600}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:var(--fs-xs);
  background:var(--pop-tint);color:var(--pop-ink);border-radius:var(--r-xs);padding:0 var(--sp-1);
  overflow-wrap:anywhere}

/* ── пульт ────────────────────────────────────────────────────────────── */
.t-panel{background:var(--plate);border:var(--line-w) solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-card);display:flex;flex-direction:column;gap:var(--gap-row);min-inline-size:0}
.t-line{display:flex;flex-wrap:wrap;align-items:center;gap:var(--gap-row);min-inline-size:0}
.t-lab{font-size:var(--fs-xs);color:var(--ink-soft);min-inline-size:9ch}
.t-btn{block-size:var(--ctrl-h-sm);padding-inline:calc(var(--ctrl-h-sm) * .4);
  border:var(--line-w) solid var(--rule);border-radius:var(--r-ctrl);
  font-size:var(--ctrl-fs-xs);white-space:nowrap}
.t-btn[aria-pressed="true"]{background:var(--pop);border-color:var(--pop);color:var(--on-pop);font-weight:600}
.t-read{font-size:var(--fs-xs);color:var(--ink-soft);font-variant-numeric:tabular-nums}
.t-read b{color:var(--ink);font-weight:600}

/* ── пол стенда ───────────────────────────────────────────────────────────
   Тема переключается ЗДЕСЬ, а не на странице: токены написаны через
   light-dark(), и один color-scheme на этой коробке переворачивает всё, что
   внутри, — второй копии палитры для тёмной темы не существует.

   container-type: inline-size — не украшение: роли --pagehead-size и
   --intro-size меряют СВОЮ КОЛОНКУ (cqi), и без контейнера им нечего
   мерить (правило 6). */
.t-demo{background:var(--page);color:var(--ink);
  border:var(--line-w) solid var(--rule);border-radius:var(--r-card);
  padding:var(--pad-sheet);display:flex;flex-direction:column;gap:var(--air-band);
  container-type:inline-size;min-inline-size:0}
/* Контейнер — на КАНДИДАТЕ, а не только на поле стенда: роли
   --pagehead-size и --intro-size мерят cqi, и в раскладке «все шесть
   подряд» кандидат стоит в узкой колонке. Мерил бы он поле стенда —
   получил бы «широкий» заголовок в узкой колонке (правило 6). */
.t-face{display:flex;flex-direction:column;gap:var(--air-block);
  min-inline-size:0;container-type:inline-size}
.t-face[hidden]{display:none}
${faceRules}

/* Роль, а не font-family по месту: ниже всё едет на --face и --face-head. */
.t-face{font-family:var(--face)}
.t-ph,.t-h2,.t-name{font-family:var(--face-head)}

.t-head{display:flex;flex-direction:column;gap:var(--sp-2);
  padding-block-end:var(--sp-3);border-block-end:var(--line-w) solid var(--rule)}
.t-name{font-size:var(--h3-size);line-height:var(--h3-lead);letter-spacing:var(--h3-track);font-weight:var(--h3-weight)}
.t-facts{display:flex;flex-direction:column;gap:var(--sp-1)}
.t-fact{font-size:var(--fs-xs);color:var(--ink-soft);font-family:var(--face-stack)}
.t-fact b{color:var(--ink);font-weight:600}

/* ── текст витрины: роли применяются, а не переписываются ───────────────── */
.t-shop{display:flex;flex-direction:column;gap:var(--air-group);min-inline-size:0}
.t-eyebrow{font-size:var(--eyebrow-size);line-height:var(--eyebrow-lead);
  letter-spacing:var(--eyebrow-track);font-weight:var(--eyebrow-weight);
  color:var(--ink-soft);text-transform:uppercase}
.t-ph{font-size:var(--pagehead-size);line-height:var(--pagehead-lead);
  letter-spacing:var(--pagehead-track);font-weight:var(--pagehead-weight);
  max-inline-size:var(--measure-lede);text-wrap:balance}
.t-intro{font-size:var(--intro-size);line-height:var(--intro-lead);
  letter-spacing:var(--intro-track);font-weight:var(--intro-weight);
  max-inline-size:var(--measure-lede);color:var(--ink-soft)}
.t-h2{font-size:var(--h2-size);line-height:var(--h2-lead);
  letter-spacing:var(--h2-track);font-weight:var(--h2-weight)}

/* ── карточка товара ──────────────────────────────────────────────────── */
.t-card{background:var(--plate);border-radius:var(--r-card);padding:var(--pad-card);
  box-shadow:var(--sh-raised);display:flex;flex-direction:column;gap:var(--air-row);
  inline-size:100%;max-inline-size:min(40ch, 100%);min-inline-size:0}
/* Пропорция с потолком — запрет 4: без потолка снимок съел бы экран. */
.t-shot{aspect-ratio:4 / 3;max-block-size:30svh;border-radius:calc(var(--r-card) - var(--pad-inner));
  background:linear-gradient(135deg, var(--pop-tint), var(--plate-3))}
.t-nm{font-size:var(--body-size);line-height:var(--body-lead);font-weight:600}
.t-sub{font-size:var(--note-size);line-height:var(--note-lead);color:var(--ink-soft)}
/* Цена — единственное место, где цифры обязаны быть одной ширины: в колонке
   полки пропорциональная единица уводит запятую влево, и цены перестают
   читаться столбиком. */
.t-price{display:flex;align-items:baseline;flex-wrap:wrap;gap:var(--gap-row);
  font-variant-numeric:tabular-nums}
.t-now{font-size:var(--h3-size);line-height:var(--h3-lead);letter-spacing:var(--h3-track);font-weight:600}
.t-was{font-size:var(--note-size);color:var(--ink-soft)}
.t-sale{display:inline-flex;align-items:center;block-size:var(--ctrl-h-sm);
  padding-inline:calc(var(--ctrl-h-sm) * .3);border-radius:var(--r-ctrl);
  background:var(--sale-fill);color:var(--on-sale);font-size:var(--ctrl-fs-xs);font-weight:600;
  font-variant-numeric:tabular-nums}
.t-chip{border:var(--line-w) solid var(--rule)}
/* Единственный полный круг на странице — у того, что зовут нажать. */
.t-go{display:inline-flex;align-items:center;justify-content:center;
  block-size:var(--ctrl-h-lg);padding-inline:calc(var(--ctrl-h-lg) * .4);
  border-radius:var(--r-pop);background:var(--pop);color:var(--on-pop);
  font-size:var(--ctrl-fs-sm);font-weight:600;white-space:nowrap;align-self:flex-start}

/* ── две пробы: диакритика и цифры ────────────────────────────────────── */
.t-probe{display:flex;flex-direction:column;gap:var(--sp-2);min-inline-size:0}
.t-dia{font-size:var(--h3-size);line-height:var(--h3-lead);overflow-wrap:anywhere}
.t-nums{display:flex;flex-wrap:wrap;gap:var(--gap-row);
  font-size:var(--h3-size);line-height:var(--h3-lead);overflow-wrap:anywhere}
.t-tab{font-variant-numeric:tabular-nums}
.t-prop{font-variant-numeric:proportional-nums;color:var(--ink-soft)}
.t-run{display:inline-block}

/* ── все шесть подряд ─────────────────────────────────────────────────── */
/* Вариант — атрибутом на коробке, а не вторым классом на каждом кандидате:
   это та же вещь в другой раскладке, а не новый предмет. */
.t-demo[data-all] .t-face[hidden]{display:flex}
.t-demo[data-all]{display:grid;grid-template-columns:repeat(auto-fit, minmax(min(34ch, 100%), 1fr));
  gap:var(--gap-grid);align-items:start}

/* ── таблицы ──────────────────────────────────────────────────────────── */
/* Таблица данных — лента по замыслу: она не переносится (WCAG 1.4.10
   исключает её из перетока), и на 360 едет вбок внутри своей коробки. */
.t-scroll{overflow-x:auto;overflow-y:hidden}
table{border-collapse:collapse;inline-size:100%;font-size:var(--fs-sm)}
th,td{text-align:start;padding:var(--sp-2) var(--sp-3);
  border-block-end:var(--line-w) solid var(--rule);vertical-align:top}
th{font-size:var(--fs-xs);color:var(--ink-soft);font-weight:500}
td:nth-child(3),td:nth-child(4){font-variant-numeric:tabular-nums}
</style></head>
<body>
<div class="t-col">
  <header class="t-sec">
    <h1>Шрифт витрины — шесть кандидатов на одном тексте</h1>
    <p class="t-say">Здесь выбирают <b>шрифт</b>, и выбирают его глазами. Сверху пульт: кандидат и тема. Ниже — один и тот же текст настоящей витрины: заголовок страницы, вводный абзац, заголовок полки, карточка «CBD масло 10 %» с ценой <b>89,00 лв.</b>, зачёркнутой старой ценой, плашкой скидки и «В количката». Меняется только шрифт: кегль, межстрочье, вес и разрядка приходят из выпущенных ролей и на стенде не трогаются.</p>
    <p class="t-say">Смотреть надо на три вещи, а не на алфавит: <b>читается ли цена</b> рядом с кнопкой, <b>не разваливается ли диакритика</b> на хорватском и румынском, и <b>одной ли ширины цифры</b>. Первое решает, купят ли; второе — сможет ли тот же сайт уехать на соседний рынок; третье — не пляшет ли цена в колонке полки.</p>
    <p class="t-say">Числа на этой странице <b>не набраны рукой</b>. Стенд вставляет в себя выпущенные <code>styles/palette.css</code>, <code>styles/scale.css</code>, <code>styles/tokens.css</code> и <code>styles/primitives.module.css</code> как есть, а про каждое семейство при сборке <b>спрашивает Google</b> тем же адресом и тем же заголовком браузера, каким спросит витрина, — и разбирает ответ. Сами <code>woff2</code> он тоже скачивает: <code>tnum</code> и болгарский язык в <code>locl</code> лежат внутри шрифта, а не в CSS.</p>
${goneLine}
${missingLine}
${offlineLine}
  </header>

  <div class="t-panel">
    <div class="t-line"><span class="t-lab">Кандидат</span>${btns}</div>
    <div class="t-line"><span class="t-lab">Рядом</span>
      <button class="t-btn t-all" type="button" aria-pressed="false">Все шесть подряд</button>
    </div>
    <div class="t-line"><span class="t-lab">Тема</span>
      <button class="t-btn t-theme" type="button" data-theme="light" aria-pressed="false">светлая</button>
      <button class="t-btn t-theme" type="button" data-theme="dark" aria-pressed="false">тёмная</button>
      <button class="t-btn t-theme" type="button" data-theme="" aria-pressed="true">системная</button>
    </div>
    <p class="t-read" id="live">—</p>
  </div>

  <div class="t-demo" id="demo">
${sections}
  </div>

  <section class="t-sec">
    <h2>Что ответил Google</h2>
    <div class="t-panel t-scroll">
      <table><thead><tr><th>семейство</th><th>подмножества в ответе</th><th>@font-face</th><th>веса</th><th>переменный</th><th>табличные цифры</th><th>болгарские начертания</th></tr></thead>
      <tbody>
${famRows}
      </tbody></table>
    </div>
    <p class="t-say">Строки спрошены при сборке по адресу <code>fonts.googleapis.com/css2?family=…&amp;display=swap</code> с заголовком современного Chrome: без него Google отдаёт старый формат — <code>ttf</code> и по файлу на каждый вес, — и стенд показывал бы не то, что получит витрина.</p>
    <p class="t-say"><b>Подмножества.</b> <code>cyrillic</code> — болгарский текст витрины; <code>latin-ext</code> — хорватские <code>č ć ž š đ</code> и румынские <code>ă â î ș ț</code>. Нет подмножества — буквы подставит системный шрифт, и слово поедет другим лицом посреди строки.</p>
    <p class="t-say"><b>Табличные цифры.</b> «по умолчанию» значит, что все десять цифр в шрифте одной ширины и просить нечего; «по <code>tnum</code>» — что ширины разные, но в шрифте есть фича, и <code>font-variant-numeric: tabular-nums</code> её включит; «нет» — что ширины разные и фичи нет, то есть цена в колонке полки будет гулять, и сделать с этим на стороне вёрстки нечего.</p>
    <p class="t-say"><b>Болгарские начертания.</b> У болгарина свои формы кириллицы — <code>в г д ж з и й к л п т ц ш щ ю</code> ближе к рукописным, чем русские. Шрифт отдаёт их через <code>locl</code> с языком <code>cyrl/BGR</code>, и браузер включает это сам, когда у текста стоит <code>lang="bg"</code>, — как на этом стенде. Нет языка в шрифте — болгарин прочтёт русские формы: не ошибка, но чужой акцент.</p>
  </section>

  <section class="t-sec">
    <h2>Роли, которые стенд применяет</h2>
    <div class="t-panel t-scroll">
      <table><thead><tr><th>роль</th><th>размер</th><th>межстрочье</th><th>вес</th><th>разрядка</th></tr></thead>
      <tbody>
${roleRows}
      </tbody></table>
    </div>
    <p class="t-say">Эта таблица — не настройка стенда, а <b>читка выпущенного</b>: <code>styles/scale.css</code> и <code>styles/tokens.css</code>. Стенд роли только применяет. Переписать здесь кегль значило бы завести второй ответ на вопрос «каким кеглем набран заголовок», а выбираем мы сейчас не кегль, а лицо.</p>
    <p class="t-say">Поэтому и переключается ровно одно: <code>--face</code> и <code>--face-head</code> на коробке кандидата. <code>font-family</code> по месту на этой странице нет ни одного — ровно так шрифт задан и в наборе (<code>styles/tokens.css</code>: <code>--face: var(--f-plex), var(--face-stack)</code>).</p>
  </section>

  <section class="t-sec">
    <h2>Как записывается выбор</h2>
    <p class="t-say">Названный кандидат уезжает в <code>styles/tokens.css</code> двумя строками — <code>--face</code> и <code>--face-head</code>, — и больше нигде не повторяется. Пара «засечка на заголовке» отличается от одиночного лица только тем, что вторая строка называет другое семейство; всё остальное на витрине уже написано ролями и меняться не будет.</p>
    <p class="t-say">Один вопрос решается не здесь: <b>откуда шрифт грузится в боевом магазине</b>. На этом стенде он приходит с <code>fonts.googleapis.com</code>, потому что стенд открывают один раз и из любого места. Витрина так не делает: файл кладётся рядом с сайтом, иначе первое, что видит покупатель, — чужой домен и лишний круг до первой буквы.</p>
  </section>
</div>

<script>
var demo = document.getElementById('demo');
var live = document.getElementById('live');
var faces = demo.querySelectorAll('.t-face');
var picked = faces.length ? faces[0].getAttribute('data-id') : '';

function press(list, on){
  for(var i = 0; i < list.length; i++) list[i].setAttribute('aria-pressed', String(list[i] === on));
}

function show(id){
  picked = id;
  for(var i = 0; i < faces.length; i++) faces[i].hidden = faces[i].getAttribute('data-id') !== id;
  readout();
}

/* Числа читаются с ЖИВОЙ страницы, а не из ответа Google: на экране работает
   то, что посчитал браузер и что он смог загрузить. Если шрифт не доехал,
   об этом надо сказать, а не показывать прочерк как «всё хорошо». */
function readout(){
  var box = demo.querySelector('.t-face[data-id="' + picked + '"]');
  if(!box) return;
  var cs = getComputedStyle(box);
  var body = (cs.getPropertyValue('--face') || '').trim().split(',')[0].replace(/['"]/g, '');
  var head = (cs.getPropertyValue('--face-head') || '').trim().split(',')[0].replace(/['"]/g, '');
  var here = function(n){
    try { return document.fonts && document.fonts.check('1em "' + n + '"'); } catch(e){ return null; }
  };
  /* Табличность меряется НА ЭКРАНЕ: два ряда по десять знаков, нули и
     единицы. Совпала ширина — цифры одной ширины на самом деле, а не по
     обещанию таблицы. */
  var runs = box.querySelectorAll('.t-tab .t-run');
  var same = '—';
  if(runs.length > 1){
    var a = runs[0].getBoundingClientRect().width;
    var b = runs[1].getBoundingClientRect().width;
    same = Math.abs(a - b) < 0.5 ? 'одной ширины' : 'разной ширины (' + Math.round(a) + ' и ' + Math.round(b) + ' px)';
  }
  var scheme = demo.style.colorScheme || 'системная';
  live.innerHTML = 'кандидат: <b>' + picked + '</b> · текст <b>' + body + '</b>' +
    (here(body) === false ? ' <b>(не загружен)</b>' : '') +
    ' · заголовки <b>' + head + '</b>' +
    (here(head) === false ? ' <b>(не загружен)</b>' : '') +
    ' · цифры <b>' + same + '</b>' +
    ' · тема: ' + (scheme === 'light' ? 'светлая' : scheme === 'dark' ? 'тёмная' : scheme);
}

var picks = document.querySelectorAll('.t-pick');
for(var p = 0; p < picks.length; p++){
  picks[p].addEventListener('click', function(e){
    var b = e.currentTarget;
    press(picks, b);
    show(b.getAttribute('data-pick'));
  });
}

var all = document.querySelector('.t-all');
all.addEventListener('click', function(){
  var on = all.getAttribute('aria-pressed') !== 'true';
  all.setAttribute('aria-pressed', String(on));
  if(on) demo.setAttribute('data-all', '');
  else { demo.removeAttribute('data-all'); show(picked); }
  requestAnimationFrame(readout);
});

/* Тема ставится атрибутом style на сам пол стенда: токены написаны через
   light-dark(), и переключать нечего, кроме color-scheme. */
var themes = document.querySelectorAll('.t-theme');
for(var t = 0; t < themes.length; t++){
  themes[t].addEventListener('click', function(e){
    var b = e.currentTarget;
    var v = b.getAttribute('data-theme');
    if(v) demo.style.colorScheme = v;
    else demo.style.removeProperty('color-scheme');
    press(themes, b);
    requestAnimationFrame(readout);
  });
}

readout();
/* Шрифт приезжает после первой отрисовки: замер до него врёт про запасной
   стек, а не про кандидата. */
if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ requestAnimationFrame(readout); });
</script>
</body></html>`

const out = path.resolve(process.argv[2] ?? 'face-stand.html')
writeFileSync(out, html)

console.log(`Стенд шрифта собран: ${out}`)
console.log(`  кандидатов: ${FACES.length} (${FACES.map((f) => f.label).join(' · ')})`)
console.log(`  семейств спрошено у Google: ${asked} из ${FAMILIES.length} · одна ссылка на страницу, display=swap`)
for (const fam of FAMILIES) {
  const g = GOOGLE.get(fam)
  if (!g?.ok) { console.log(`  ✗ ${fam}: Google не ответил${g?.why ? ` — ${g.why}` : ''}`); continue }
  const t = tabular(g)
  const say = t.ok === false ? 'НЕТ' : t.say.replace(/<[^>]+>/g, '')
  console.log(`  · ${fam}: ${g.subsets.join(', ')}`)
  console.log(`      веса ${g.weight}${g.variable ? ' (переменный)' : ' (статический)'} · @font-face ${g.blocks} · ${g.bytes} Б`)
  console.log(`      кириллица ${g.subsets.includes('cyrillic') ? 'есть' : 'НЕТ'} · latin-ext ${g.subsets.includes('latin-ext') ? 'есть' : 'НЕТ'}` +
    ` · цифры ${g.digits ? (g.digits.same ? 'одной ширины' : 'разной ширины') : '—'} · табличные ${say}` +
    ` · болгарские начертания ${g.bgr === true ? 'есть' : g.bgr === false ? 'НЕТ' : '—'}`)
  if (g.probeWhy) console.log(`      woff2 не прочитан: ${g.probeWhy}`)
}
console.log(`  ролей текста применено: ${ROLES.length} (${ROLES.map(([k]) => k).join(', ')})${missing.length ? ` · не выпущено: ${missing.join(', ')}` : ''}`)
console.log(`  вес страницы: ${(Buffer.byteLength(html) / 1024).toFixed(0)} КБ`)
