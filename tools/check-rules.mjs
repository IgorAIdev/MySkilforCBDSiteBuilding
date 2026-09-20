/**
 * Скилл сходится с проверками — и это проверяется машиной.
 *
 * Заведено по слову заказчика: «скилл должен быть самосовершенствующимся…
 * правила образовывались в прошлой работе и будут образовываться в будущем,
 * сделай, чтоб ты это постоянно помнил».
 *
 * Ключевое слово тут — «помнил». Помнить сессия не умеет: она кончается, и
 * следующая начинается с чистого листа. Этот файл — единственное, что от
 * обещания остаётся, и потому он не про напоминание, а про ЗАМОК.
 *
 * Замок один и простой: **проверка не может существовать без правила, а
 * правило — без адреса.** Если я завёл новую семью в `check:css` или
 * `check:code` и не написал в скилле, ЧТО она сторожит и каким дефектом
 * заведена, — эта проверка краснеет. Не «стыдно, забыл», а сборка не идёт.
 *
 * Почему именно эта пара сторожится. Проверка без правила — это число,
 * которое никто не может объяснить: через полгода его снимут как
 * вкусовщину, потому что причина не записана. Правило без проверки — совет,
 * а совет не работает (это уже записано в скилле, раздел «Инструмент
 * ставится по замеру»). Держатся они только вместе.
 *
 * Второй замок — устройство самого скилла, и он заведён по счёту. Скилл
 * дорос до 3950 строк одним файлом, и файл целиком попадал в память модели
 * при каждой правке стилей. Числа, набранные в нём рукой, разошлись с кодом
 * четырежды («девять запретов» при десяти, «пять примитивов» при девяти,
 * «четырнадцать семей» при восемнадцати, «двадцать восемь» при тридцати
 * одной), а двадцать пять разборов дефектов лежали под заголовком «что
 * переезжает в новый проект» — новое правило дописывалось в конец, куда
 * придётся. Поэтому теперь: `SKILL.md` — закон, не длиннее 500 строк
 * (рекомендация Anthropic для тела скилла); разбор — в `references/*.md`
 * по темам, и `SKILL.md` обязан их все назвать; таблицы семей собираются из
 * реестров, а не набираются; число запретов одно на три файла.
 *
 * Чего этой проверкой НЕ поймать, и это надо знать честно: она не судит,
 * хорошо ли правило написано, и не заставляет завести правило там, где
 * дефект виден только глазом. Она сторожит СХОДИМОСТЬ, а не полноту. Полноту
 * сторожит хук на конец работы (`tools/hook-on-stop.mjs`): он видит, что
 * файлы сайта тронуты, а скилл и реестр правил — нет, и говорит об этом.
 *
 *   node tools/check-rules.mjs            вердикт
 *   node tools/check-rules.mjs --list     сами находки
 *   node tools/check-rules.mjs --tables   пересобрать таблицы семей в скилле
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CSS_FAMILIES, CSS_LABELS } from './css-families.mjs'
import { CRAFT_FAMILIES, CRAFT_LABELS } from './craft-families.mjs'
import { CODE_FAMILIES, CODE_LABELS } from './code-families.mjs'
import { CHECKS } from './checks.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const has = (p) => existsSync(join(ROOT, p))

/* Скиллы набора: у каждого закон в SKILL.md и, где есть, разбор в references/.
   Пять: вёрстка, палитра, код, магазин, этапы. Чужие скиллы (вкус, движение,
   процесс) сюда не входят — их текст не наш и не правится. */
const SKILL_DIRS = ['.claude/skills/craft', '.claude/skills/palette', '.claude/skills/code', '.claude/skills/shop', '.claude/skills/stages']
const LEDGER = 'docs/rules.md'
/* Где живут собранные таблицы семей: файл → ключи GEN. Вёрстка и
   отрисованная — в справочнике craft; код — в законе code: справочников у
   него нет, а тринадцать строк в чтение помещаются. */
const TABLES = {
  '.claude/skills/craft/references/checks.md': ['css', 'craft'],
  '.claude/skills/code/SKILL.md': ['code'],
}
/* Три файла, в которых записаны запреты вёрстки словами: проект, набор,
   скилл. Число обязано быть одним — иначе новый проект получает восемь
   запретов из десяти, как уже было. */
const LAWS = ['CLAUDE.md', 'tools/kit/CLAUDE.md', '.claude/skills/craft/SKILL.md']
/* Тело скилла читается целиком при каждом срабатывании. Порог —
   рекомендация Anthropic для SKILL.md; всё сверх него — в references/. */
const CEILING = 500

const bad = []

/* все .md скилла: закон и разбор */
const mdFiles = (dir) => {
  if (!has(dir)) return []
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) return mdFiles(p)
    return e.name.endsWith('.md') ? [p] : []
  })
}
const skillFiles = SKILL_DIRS.flatMap(mdFiles)
const skillText = skillFiles.map((f) => read(f)).join('\n')

/* ── 1 · у каждой семьи есть место в скилле ────────────────────────────
   Имя семьи (`stickyCap`, `halfRole`) ищется в тексте скиллов как есть —
   в законе или в разборе, всё равно: требуется ОДНО, чтобы по имени семьи
   можно было найти, что она сторожит. Семьи отрисованной проверки ищутся
   в обратных кавычках: половина их имён — обычные английские слова
   (`name`, `focus`), и голое вхождение ничего не доказывает. */
for (const [kind, fams, quoted] of [['вёрстки', CSS_FAMILIES, false], ['кода', CODE_FAMILIES, false],
                                    ['отрисованной страницы', CRAFT_FAMILIES, true]]) {
  for (const fam of fams) {
    const hit = quoted ? skillText.includes('`' + fam + '`') : skillText.includes(fam)
    if (!hit) bad.push(`семья ${kind} «${fam}» не описана ни в одном скилле — проверка есть, правила нет`)
  }
}

/* ── 2 · у каждой проверки есть человеческие слова ─────────────────────────
   Проверка, которую нельзя вызвать фразой заказчика, существует только для
   меня — а он сказал прямо, что команд не запомнит. */
for (const c of CHECKS) {
  if (!c.name) bad.push(`проверка «${c.cmd}» без человеческого имени`)
  if (!c.watches) bad.push(`проверка «${c.cmd}» не говорит, что сторожит`)
  if (!c.words?.length) bad.push(`проверка «${c.cmd}» без слов-примет — фразой её не позвать`)
}

/* ── 3 · реестр правил жив и растёт ────────────────────────────────────────
   Правило в скилле объясняет, КАК класть. Реестр (`docs/rules.md`) — что
   решено и каким дефектом куплено, нумерованно и переносимо. Пустеющий
   реестр значит, что правила перестали записывать. */
let ledger = ''
try { ledger = read(LEDGER) } catch { bad.push(`нет ${LEDGER} — правила негде записывать`) }
const numbered = [...ledger.matchAll(/^## \s*([А-ЯA-Z]+\d+)\s*·/gm)].map((m) => m[1])
if (ledger && numbered.length === 0) {
  bad.push(`${LEDGER}: ни одного нумерованного правила — реестр перестал быть реестром`)
}
const dupes = numbered.filter((n, i) => numbered.indexOf(n) !== i)
for (const d of new Set(dupes)) bad.push(`${LEDGER}: номер правила «${d}» занят дважды`)

/* Каждое правило называет дефект. Формулировка вольная, но слово «дефект»,
   «стоило», «нашёл» или «заведено» должно быть: правило без причины через
   полгода читается вкусовщиной и его снимают — это записано в самом реестре
   в его шапке. */
const sections = ledger.split(/^## /gm).slice(1)
for (const sec of sections) {
  const title = sec.split('\n')[0].trim()
  if (!/дефект|стоил|нашёл|нашел|заведен|заведён|по счёт|по счет|купил/i.test(sec)) {
    bad.push(`${LEDGER}: «${title}» не называет, каким дефектом заведено`)
  }
}

/* ── 4 · закон не перерос чтение ───────────────────────────────────────────
   SKILL.md попадает в память модели целиком при каждом срабатывании скилла;
   всё, что не закон, лежит в references/ и читается по надобности. */
for (const dir of SKILL_DIRS) {
  const f = `${dir}/SKILL.md`
  if (!has(f)) continue
  const lines = read(f).split('\n').length
  if (lines > CEILING) {
    bad.push(`${f}: ${lines} строк — больше ${CEILING}. Закон остаётся в SKILL.md, разбор уезжает в ${dir}/references/`)
  }
}

/* ── 5 · карта справочных файлов сходится в обе стороны ────────────────────
   Файл в references/, которого SKILL.md не называет, никто не откроет: скилл
   не знает, что он есть. Ссылка на файл, которого нет, — указатель в пустоту.
   Длинный справочный файл без оглавления читают с начала и бросают. */
for (const dir of SKILL_DIRS) {
  const skill = `${dir}/SKILL.md`
  const refs = `${dir}/references`
  if (!has(skill) || !has(refs)) continue
  const law = read(skill)
  const files = readdirSync(join(ROOT, refs)).filter((n) => n.endsWith('.md'))
  for (const n of files) {
    if (!law.includes(`references/${n}`)) bad.push(`${refs}/${n}: SKILL.md его не называет — файл, о котором скилл не знает`)
    const text = read(`${refs}/${n}`)
    const lines = text.split('\n')
    if (lines.length > 100 && !lines.slice(0, 40).some((l) => /^Содержание/.test(l))) {
      bad.push(`${refs}/${n}: ${lines.length} строк без оглавления в первых сорока`)
    }
  }
  for (const m of law.matchAll(/references\/([\w-]+\.md)/g)) {
    if (!files.includes(m[1])) bad.push(`${skill} ссылается на ${refs}/${m[1]}, которого нет`)
  }
}

/* ── 6 · таблицы семей собраны из реестра, а не набраны рукой ─────────────
   Подпись семьи — один текст: его печатает проверка и его же показывает
   скилл. Пока таблица вёрстки набиралась рукой, в ней было двадцать четыре
   строки при тридцати одной семье; таблица кода, набранная рукой, стояла на
   восьми при тринадцати — и заголовок над ней так и говорил «восемь».
   `--tables` пересобирает, обычный прогон сверяет; какой файл какие таблицы
   держит — TABLES. */
const table = (fams, labels, head) => [
  `| Семья | ${head} |`, '| --- | --- |',
  ...fams.map((k) => `| \`${k}\` | ${labels[k] ?? '—'} |`),
].join('\n')
const GEN = {
  css: table(CSS_FAMILIES, CSS_LABELS, 'Что сторожит'),
  craft: table(CRAFT_FAMILIES, CRAFT_LABELS, 'Что ловит'),
  code: table(CODE_FAMILIES, CODE_LABELS, 'Что ловит'),
}
const withTables = (file, text, keys) => keys.reduce((t, key) => {
  const re = new RegExp(`<!-- families:${key} -->[\\s\\S]*?<!-- /families:${key} -->`)
  if (!re.test(t)) { bad.push(`${file}: нет места под таблицу семей «${key}» (маркер families:${key})`); return t }
  return t.replace(re, `<!-- families:${key} -->\n${GEN[key]}\n<!-- /families:${key} -->`)
}, text)
const rebuild = process.argv.includes('--tables')
for (const [file, keys] of Object.entries(TABLES)) {
  if (!has(file)) { bad.push(`нет ${file} — семьям «${keys.join(', ')}» негде быть описанными таблицей`); continue }
  const now = read(file)
  const fresh = withTables(file, now, keys)
  if (rebuild) {
    if (fresh !== now) writeFileSync(join(ROOT, file), fresh)
    console.log(`· таблицы семей пересобраны: ${file}`)
  } else if (fresh !== now) {
    bad.push(`${file}: таблицы семей разошлись с реестром — npm run check:rules -- --tables`)
  }
}
if (rebuild) process.exit(0)

/* ── 7 · запретов столько же во всех трёх файлах ───────────────────────────
   Раздел «запретов» считается по пунктам вида «**N.» в начале строки. Набор
   отставал от проекта на два запрета, и никто этого не видел. */
const lawCount = (text) => {
  const m = /^## [^\n]*запрет[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text)
  if (!m) return null
  return [...m[1].matchAll(/^\*\*(\d+)\./gm)].length
}
const counts = LAWS.filter(has).map((f) => [f, lawCount(read(f))])
for (const [f, n] of counts) if (n === null) bad.push(`${f}: раздела «запретов» не найдено`)
const distinct = new Set(counts.map(([, n]) => n).filter((n) => n !== null))
if (distinct.size > 1) {
  bad.push(`запретов разное число: ${counts.map(([f, n]) => `${f} — ${n}`).join(', ')}`)
}

/* ── 8 · шапка скилла по спецификации ─────────────────────────────────────
   Описание — единственное, что модель видит о скилле ДО того, как его
   открыть: по нему она и выбирает. Спецификация Anthropic даёт ему 1024
   знака, и всё сверх обрезается молча — то есть хвост описания, где
   обычно и стоит «когда применять», не читается никем. Заведено по счёту:
   три описания из трёх были длиннее (1118, 1299, 1898), а описание
   `stages` кончалось словами про СЕО, которых модель не видела. Имя
   обязано совпадать с папкой: по имени скилл зовут `/имя`. */
const DESC_MAX = 1024
for (const dir of SKILL_DIRS) {
  const f = `${dir}/SKILL.md`
  if (!has(f)) { bad.push(`${f}: скилла нет, а он в списке набора`); continue }
  const head = read(f).match(/^---\n([\s\S]*?)\n---/)
  if (!head) { bad.push(`${f}: нет шапки --- name / description ---`); continue }
  const name = /^name:\s*(.+)$/m.exec(head[1])?.[1]?.trim()
  const desc = /^description:\s*(.+)$/m.exec(head[1])?.[1]?.trim() ?? ''
  const folder = dir.split('/').pop()
  if (name !== folder) bad.push(`${f}: name «${name}» не совпадает с папкой «${folder}»`)
  if (!desc) bad.push(`${f}: описания нет — модели не по чему выбрать скилл`)
  else if (desc.length > DESC_MAX) bad.push(`${f}: описание ${desc.length} знаков при пределе ${DESC_MAX} — хвост не читается`)
  else if (!/примен|use when|когда/i.test(desc)) bad.push(`${f}: описание не говорит, КОГДА применять — по нему не выбрать`)
}

/* ── 9 · порядок работы — разделом, у каждого закона и у README ──────────
   Заказчик (И217): «в описании всегда делай последовательность, шаги, по
   которым делаем сайт, что за чем идёт». Закон без раздела о порядке
   читается как список запретов; README без «что за чем» — как склад. */
for (const dir of SKILL_DIRS) {
  const f = `${dir}/SKILL.md`
  if (!has(f)) continue
  const heads = [...read(f).matchAll(/^## (.+)$/gm)].map((m) => m[1])
  if (!heads.some((h) => /порядок|шаг/i.test(h))) bad.push(`${f}: нет раздела о порядке работы — что за чем идёт`)
}
if (has('README.md') && !/^## .*что за чем/im.test(read('README.md'))) {
  bad.push('README.md: нет раздела «что за чем» — набор читается как склад, а не как порядок')
}

/* ── 10 · файл формул привязан к строке кода своей темы ────────────────────
   Заказчик (И218): «будет ещё куча информации помимо палитры, и будут ещё
   писаться формулы в этот же файл или другой — не возникнет ли путаницы?»
   Возникнет, если файл с именем «формулы» примет любую формулу. Поэтому у
   каждого файла формул есть свой код, и каждый раздел обязан назвать
   функцию или переменную, которая там существует: формула ритма сюда не
   впишется — у строителя палитры нет для неё строки. Разделы обозначений и
   чужих формул для сверки — исключение, названное в заголовке. */
const FORMULA_CODE = {
  '.claude/skills/palette': ['tools/palette.mjs', 'styles/tokens.css'],
}
for (const dir of SKILL_DIRS) {
  const f = `${dir}/references/formulas.md`
  if (!has(f)) continue
  const code = FORMULA_CODE[dir]
  if (!code) { bad.push(`${f}: файл формул без своего кода — формула без строки в коде совет`); continue }
  const names = new Set()
  for (const src of code) {
    if (!has(src)) continue
    const text = read(src)
    for (const m of text.matchAll(/^\s*(?:export\s+)?(?:const|function|let)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1])
    for (const m of text.matchAll(/^\s*(--[a-z][\w-]*)\s*:/gm)) names.add(m[1])
  }
  const parts = read(f).split(/^## /gm).slice(1)
  for (const part of parts) {
    const title = part.split('\n')[0].trim()
    if (/обознач|чуж/i.test(title)) continue
    const cited = [...part.matchAll(/`([A-Za-z_$][\w$]*|--[a-z][\w-]*)`/g)].map((m) => m[1])
    if (!cited.some((n) => names.has(n))) {
      bad.push(`${f}, раздел «${title}»: не называет ни функции ${code[0]}, ни переменной ${code[1] ?? ''} — формула не этой темы или без строки в коде`)
    }
  }
}

/* ── вердикт, храповиком ───────────────────────────────────────────────────
   Проверка заведена на живом проекте, у которого правила писались до неё, —
   значит она рождается красной. Валить сборку задним числом нельзя: тогда её
   снимут в первый же день, и замка не станет вовсе.
   Поэтому храповик, как у вёрстки: сегодняшний долг записан числом, и
   проверка падает, только если он ВЫРОС. Уменьшать можно и нужно:
   `--update` опускает планку. Поднять её нечем — это и есть замок. */
const BASE = join(ROOT, 'tools/rules-baseline.json')
let base = { drift: Infinity }
try { base = JSON.parse(readFileSync(BASE, 'utf8')) } catch { /* нет базы — планка сверху */ }

if (process.argv.includes('--list')) {
  for (const b of bad) console.log('    ' + b)
  process.exit(0)
}
const laws = SKILL_DIRS.filter((d) => has(`${d}/SKILL.md`)).map((d) => `${d.split('/').pop()} ${read(`${d}/SKILL.md`).split('\n').length}`).join(' · ')
console.log(`· семей вёрстки: ${CSS_FAMILIES.length}, кода: ${CODE_FAMILIES.length}, отрисованной: ${CRAFT_FAMILIES.length}, проверок: ${CHECKS.length}, правил в реестре: ${numbered.length}, законы (строк из ${CEILING}): ${laws}, справочных файлов: ${skillFiles.length - SKILL_DIRS.filter((d) => has(`${d}/SKILL.md`)).length}`)

if (process.argv.includes('--update')) {
  writeFileSync(BASE, JSON.stringify({ drift: bad.length }, null, 2) + '\n')
  console.log(`· база обновлена: ${bad.length}`)
  process.exit(0)
}

if (bad.length > base.drift) {
  console.log(`\n✗ скилл разошёлся с проверками: ${base.drift} → ${bad.length}`)
  for (const b of bad) console.log('    ' + b)
  console.log('\nПравило без проверки — совет, проверка без правила — необъяснимое число.')
  console.log('Починить и/или: node tools/check-rules.mjs --update')
  process.exit(1)
}
if (bad.length < base.drift) {
  console.log(`✓ сходимость улучшилась: ${base.drift} → ${bad.length}. Обновите базу: npm run check:rules -- --update`)
} else if (bad.length) {
  console.log(`✓ расхождений ${bad.length}, не выросло. Что именно: node tools/check-rules.mjs --list`)
} else {
  console.log('✓ каждая проверка описана правилом, каждое правило называет свой дефект, закон помещается в чтение')
}
