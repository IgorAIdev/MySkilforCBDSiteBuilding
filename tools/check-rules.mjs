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
import { DESIGN_FAMILIES, DESIGN_LABELS, DESIGN_SOURCES } from './design-families.mjs'
import { DETECT_FAMILIES, DETECT_LABELS, DETECT_SOURCES, DETECT_RULES, fateOf } from './detect-families.mjs'
import { CHECKS } from './checks.mjs'
import { roles, STATUS, SIGNAL_NAMES } from './palette.mjs'
import { resolve as resolveScale } from './scale.mjs'
import { CONCEPTS, HOOKS, REQUIRED, parse as parseName } from './names.mjs'
import { AXES, scan as scanAxes } from './axes.mjs'
import * as THR from './thresholds.mjs'
import { SEAMS } from './kit-config.mjs'
import { sweepWidths } from './seams.mjs'
import { SCRIPTS } from '../scripts.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const has = (p) => existsSync(join(ROOT, p))

/* Скиллы набора: у каждого закон в SKILL.md и, где есть, разбор в references/.
   Пять: вёрстка, палитра, код, магазин, этапы. Чужие скиллы (вкус, движение,
   процесс) сюда не входят — их текст не наш и не правится. */
const SKILL_DIRS = ['.claude/skills/craft', '.claude/skills/palette', '.claude/skills/scale', '.claude/skills/code', '.claude/skills/shop', '.claude/skills/stages']
const LEDGER = 'docs/rules.md'
/* Набор или сайт. Стартовый образец красок лежит только у набора: сайту
   ставщик кладёт его уже как `styles/palette.json`, а `templates/` не везёт.
   README набора держит таблицы фактов и «что за чем» (И217, И219); README
   сайта — слово его владельца (create-next-app кладёт свой), и правила
   README набора на него не распространяются (И260). */
const KIT = has('templates/palette-starter.json')
const KIT_README = KIT && has('README.md')
/* Где живут собранные таблицы семей: файл → ключи GEN. Вёрстка и
   отрисованная — в справочнике craft; код — в законе code: справочников у
   него нет, а тринадцать строк в чтение помещаются. */
const TABLES = {
  /* Дизайн по файлу (И271) — там же, где вёрстка: механическая половина
     impeccable, у каждой семьи строка источника. Правила его детектора по
     отрисованной странице (И310) — рядом, из того же реестра. */
  '.claude/skills/craft/references/checks.md': ['css', 'craft', 'design', 'detect', 'detectFates'],
  '.claude/skills/code/SKILL.md': ['code'],
  /* Факты о палитре — сколько красок называет заказчик, сколько семей,
     сколько выпускается, какие наборы и команды — собираются из кода в
     закон palette и в README набора (И219). У сайта README — свой, там
     таблица только в законе. */
  '.claude/skills/palette/SKILL.md': ['palette'],
  '.claude/skills/scale/SKILL.md': ['scale'],
  '.claude/skills/craft/references/names.md': ['names'],
  '.claude/skills/craft/references/axes.md': ['axes'],
  '.claude/skills/craft/references/layout.md': ['layout'],
  '.claude/skills/craft/references/shape.md': ['shape'],
  '.claude/skills/craft/references/states.md': ['states'],
  ...(KIT_README ? { 'README.md': ['palette', 'scale'] } : {}),
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
                                    ['отрисованной страницы', CRAFT_FAMILIES, true], ['дизайна', DESIGN_FAMILIES, true],
                                    ['детектора impeccable', DETECT_FAMILIES, true]]) {
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
/* Первый набор, который есть под рукой: образец-стартовый у набора, свой
   `styles/palette.json` у проекта. Из него считается, сколько красок
   называется рукой и сколько выпускается. */
const paletteSeed = () => {
  for (const f of ['templates/palette-starter.json', 'styles/palette.json']) {
    if (!has(f)) continue
    const sets = JSON.parse(read(f))
    const first = Object.values(sets)[0]
    if (first?.light) return { file: f, set: first }
  }
  return null
}
/* Рукой обязательны те ключи, которых строитель не выводит сам: всё, что
   не сигнал. Сигналы в файле — право набора, не обязанность (И216). */
const handKeys = (set) => Object.keys(set.light).filter((k) => !STATUS.includes(k))
const HAND_COUNT = paletteSeed() ? handKeys(paletteSeed().set).length : null
const paletteFacts = () => {
  const seed = paletteSeed()
  if (!seed) return '| Факт | Значение |\n| --- | --- |\n| набора нет | ни templates/palette-starter.json, ни styles/palette.json |'
  const hand = handKeys(seed.set)
  const emitted = Object.keys(roles(seed.set.light, 'light')).length
  const samples = has('templates/palette.json') ? Object.keys(JSON.parse(read('templates/palette.json'))) : []
  const own = has('styles/palette.json') ? Object.keys(JSON.parse(read('styles/palette.json'))) : []
  const cmds = Object.keys(SCRIPTS).filter((k) => /palette/.test(k))
  return [
    '| Факт | Значение | Откуда |', '| --- | --- | --- |',
    `| краски, которые называет заказчик, на тему | ${hand.length}: ${hand.join(', ')}; по желанию — ${STATUS.join(', ')} | \`${seed.file}\`, \`tools/palette.mjs\` |`,
    `| семей смысла | ${2 + STATUS.length}: нейтраль, марка, ${STATUS.map((k) => SIGNAL_NAMES[k]).join(', ')} | \`tools/palette.mjs\`, STATUS |`,
    `| переменных выпускается на тему | ${emitted} | \`roles()\` в \`tools/palette.mjs\` |`,
    `| наборов-образцов | ${samples.length ? `${samples.length}: ${samples.join(' · ')}` : 'нет (образцы живут в наборе)'} | \`templates/palette.json\` |`,
    `| на сайте сейчас | ${own.join(' · ') || '—'} | \`styles/palette.json\` |`,
    `| команды | ${cmds.map((c) => `\`${c}\``).join(' · ')} | \`scripts.mjs\` |`,
  ].join('\n')
}
/* Факты о шкалах — из кода, как и о палитре (И219): наборы, тело и
   отношение каждого, ступени, роли, пороги, команды. */
const scaleFacts = () => {
  const f = has('styles/scale.json') ? 'styles/scale.json' : null
  if (!f) return '| Факт | Значение |\n| --- | --- |\n| наборов нет | styles/scale.json |'
  const sets = JSON.parse(read(f))
  const names = Object.keys(sets)
  const first = resolveScale(sets[names[0]])
  const roles = (k) => Object.keys(first[k]).map((n) => `\`--${k === 'поле' ? 'pad' : k === 'воздух' ? 'air' : 'gap'}-${n}\``).join(', ')
  const cmds = Object.keys(SCRIPTS).filter((k) => /scale/.test(k))
  return [
    '| Факт | Значение | Откуда |', '| --- | --- | --- |',
    `| наборов | ${names.length}: ${names.map((n) => `${n} (тело ${(sets[n].тело ?? []).join(' → ')}, отношение ${(sets[n].отношение ?? []).join(' / ')})`).join(' · ')} | \`${f}\` |`,
    `| ступеней размера | ${Object.keys(first.размер).length}: ${Object.keys(first.размер).join(', ')} | \`resolve()\` в \`tools/scale.mjs\` |`,
    `| ступеней ритма | ${Object.keys(first.ритм).length}, множители ${Object.values(sets[names[0]].ритм ?? {}).join(', ')} | там же |`,
    `| роли | поле ${roles('поле')}; воздух ${roles('воздух')}; зазор ${roles('зазор')} | там же |`,
    `| ролей текста | ${Object.keys(sets[names[0]].текст ?? {}).length}: ${Object.keys(sets[names[0]].текст ?? {}).join(', ')} | \`rolesOf()\` |`,
    `| размеры органов | под курсором ${THR.CONTROL.heights.fine.join(' / ')}, под пальцем ${THR.CONTROL.heights.coarse.join(' / ')}; цель у знака ${THR.CONTROL.target.fine} / ${THR.CONTROL.target.coarse} | \`CONTROL\` в \`tools/thresholds.mjs\`, \`--ctrl-h-*\` в \`styles/scale.css\` |`,
    `| пороги | тело от ${THR.TYPE.floor.base}, отношение ${THR.TYPE.ratio.join('…')}, клетка 2 / 4 / 8, пол ${THR.RHYTHM.floor}, воздух к полю ≥ ${THR.AIR.toPad}, рост разделов ×${THR.AIR.growth.page.join('…')}, зазор под пальцем ${THR.TARGET.gap.coarse} | \`tools/thresholds.mjs\` |`,
    `| команды | ${cmds.map((c) => `\`${c}\``).join(' · ')} | \`scripts.mjs\` |`,
  ].join('\n')
}
/* Реестр имён — из кода (И224): понятия по группам, ручки, обязательные
   роли, и сколько объявленных имён в стилях разбирается. */
const namesFacts = () => {
  const rows = ['| Группа | Понятия | Ярус |', '| --- | --- | --- |']
  for (const [g, words] of Object.entries(CONCEPTS)) rows.push(`| ${g} | ${words.map((w) => `\`--${w}\``).join(', ')} | роль |`)
  rows.push(`| ручки примитивов | ${HOOKS.map((w) => `\`--${w}-*\``).join(', ')} | узел |`)
  rows.push(`| сырьё | \`--n-N\`, \`--a-N\`, \`--e-N\`, \`--sale-N\`, \`--warn-N\`, \`--ok-N\`, \`--info-N\`, \`--on-*-N\`, \`--sp-N\`, \`--fs-*\` | сырьё |`)
  rows.push(`| обязательные роли | ${Object.keys(REQUIRED).map((k) => `\`${k}\``).join(', ')} | роль |`)
  const files = ['styles/tokens.css', 'styles/base.css', 'styles/primitives.module.css', 'styles/palette.css', 'styles/scale.css'].filter(has)
  let total = 0, ok = 0
  for (const f of files) {
    const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '')
    for (const m of css.matchAll(/(?:^|[;{])\s*(--[a-z][a-z0-9-]*)\s*:/g)) { total++; if (parseName(m[1])) ok++ }
  }
  rows.push(`| объявлений в стилях набора | ${total}, по форме ${ok} | \`tools/names.mjs\`, \`parse()\` |`)
  return rows.join('\n')
}
/* Реестр осей — из кода (И225): ось, чем включается, что по ней меняется в
   стилях набора на самом деле (разбор @media, :lang, [data-theme]). */
const axesFacts = () => {
  const files = ['styles/palette.css', 'styles/scale.css', 'styles/tokens.css', 'styles/base.css', 'styles/primitives.module.css'].filter(has)
  const css = files.map((f) => read(f).replace(/\/\*[\s\S]*?\*\//g, '')).join('\n')
  const { axes, unknown } = scanAxes(css)
  const rows = ['| Ось | Чем включается | Что меняется по ней в стилях набора | Что не меняется |', '| --- | --- | --- | --- |']
  for (const [k, ax] of Object.entries(AXES)) {
    const a = axes[k]
    const names = [...a.names].slice(0, 8).map((n) => `\`${n}\``).join(', ')
    const what = k === 'theme' ? `${css.split('light-dark(').length - 1} объявлений через light-dark(); блоков ${a.blocks}${names ? `: ${names}` : ''}` : `блоков ${a.blocks}${names ? `; имена: ${names}` : ''}${a.props.size ? `; свойства: ${[...a.props].slice(0, 6).join(', ')}` : ''}`
    rows.push(`| ${ax.name} | ${ax.how} | ${what || '—'} | ${ax.static} |`)
  }
  rows.push(`| признаки вне реестра | — | ${unknown.length ? unknown.map((u) => `\`@media${u.query}\``).join(', ') : 'нет'} | — |`)
  return rows.join('\n')
}
/* Раскладка — из кода (И227): реестр швов с причинами, примитивы и их
   ручки из самого файла примитивов, ширины свипа, пороги слоя, холст и край
   первого набора. */
const PRIMITIVES = ['stack', 'cluster', 'switcher', 'rail', 'prose', 'lede', 'pinned', 'sidebar', 'grid', 'sheet', 'menu', 'frame']
const layoutFacts = () => {
  const rows = ['| Факт | Значение | Откуда |', '| --- | --- | --- |']
  rows.push(`| швы | ${SEAMS.length} из ${THR.LAYOUT.seams} разрешённых: ${SEAMS.map((s) => `**${s.at}** «${s.name}» — ${s.turns}`).join(' · ')} | \`tools/seams.mjs\`; у проекта — \`kit.config.json\`, ключ \`seams\` |`)
  const prim = has('styles/primitives.module.css') ? read('styles/primitives.module.css').replace(/\/\*[\s\S]*?\*\//g, '') : ''
  const handles = PRIMITIVES.map((n) => {
    const set = new Set()
    const own = new RegExp(`(^|[\\s(,>~+])\\.${n}(?![\\w-])`)
    for (const rule of prim.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      if (!rule[1].split(',').some((s) => own.test(s.trim()))) continue
      for (const d of rule[2].matchAll(/(?:^|[;{])\s*(--[a-z][a-z0-9-]*)\s*:/g)) set.add(d[1])
      for (const d of rule[2].matchAll(/var\((--[a-z][a-z0-9-]*)\s*,/g)) set.add(d[1])
    }
    return [n, [...set].filter((h) => parseName(h)?.tier === 'node').sort()]
  })
  rows.push(`| примитивы и ручки | ${handles.length}: ${handles.map(([n, hs]) => `\`${n}\`${hs.length ? ` (${hs.map((h) => `\`${h}\``).join(', ')})` : ''}`).join(' · ')} | \`styles/primitives.module.css\` |`)
  if (has('styles/scale.json')) {
    const first = Object.values(JSON.parse(read('styles/scale.json')))[0]
    const r = resolveScale(first)
    if (r.край) rows.push(`| холст и край (первый набор) | холст ${r.холст}px → \`--wrap\`; край ступени ${r.край.steps.join(' → ')}: ${r.край.pair.join(' → ')}px (×${(r.край.pair[1] / r.край.pair[0]).toFixed(2)}, коридор ×${THR.LAYOUT.edgeGrowth.join('…')}) → \`--gut\` | \`styles/scale.json\`, выпуск в \`styles/scale.css\` |`)
  }
  const widths = sweepWidths(THR.LAYOUT, SEAMS)
  rows.push(`| ширины свипа | ${widths.length}: сетка ${THR.LAYOUT.sweep.join('…')} шагом ${THR.LAYOUT.step}, каждый шов и пиксель над ним, сложенные экраны ${THR.LAYOUT.extra.join(', ')} | \`sweepWidths()\` в \`tools/seams.mjs\` |`)
  rows.push(`| пороги слоя | переток ${THR.LAYOUT.reflow}, низкое окно ${THR.LAYOUT.shortWindow}, ступенька размера от ${THR.LAYOUT.jump}px, кадр держит ≥ ${Math.round(THR.LAYOUT.crop * 100)} % снимка, потолок кадра ${THR.LAYOUT.frameCap}svh | \`LAYOUT\` в \`tools/thresholds.mjs\` |`)
  return rows.join('\n')
}
/* Форма — из кода (И228): радиусы каждого набора, лестница, линия и кольцо,
   роли тени из tokens.css, кто читает полный круг. */
const shapeFacts = () => {
  const rows = ['| Факт | Значение | Откуда |', '| --- | --- | --- |']
  if (has('styles/scale.json')) {
    const sets = JSON.parse(read('styles/scale.json'))
    const per = Object.entries(sets).map(([n, s]) => `${n}: ${Object.entries(s.радиус ?? {}).map(([k, v]) => `${k} ${v}`).join(' / ') || '—'}`)
    rows.push(`| радиусы по наборам (px) | ${per.join(' · ')}; полный круг \`--r-pop\` — везде | \`styles/scale.json\`, ключ \`радиус\` |`)
  }
  rows.push(`| лестница радиусов | ${THR.SHAPE.radii.join(', ')} (M3 ∪ Carbon) | \`SHAPE.radii\` в \`tools/thresholds.mjs\` |`)
  rows.push(`| линия и кольцо | линия ${THR.SHAPE.line.hair}px, сильная ${THR.SHAPE.line.strong}px; кольцо ${THR.SHAPE.ring.width}px с отступом ${THR.SHAPE.ring.offset}px — не текут | \`SHAPE.line\`, \`SHAPE.ring\`; \`--line-w\`, \`--ring-w\`, \`--ring-off\` в \`styles/scale.css\` |`)
  const tokens = has('styles/tokens.css') ? read('styles/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '') : ''
  const shadows = [...new Set([...tokens.matchAll(/(?:^|[;{])\s*(--sh-[a-z]+)\s*:/g)].map((m) => m[1]))].filter((n) => !/^--sh-(ring|near|far)$/.test(n))
  rows.push(`| роли тени | ${shadows.map((n) => `\`${n}\``).join(', ')} — по работе; ингредиенты \`--sh-ring\`, \`--sh-near\`, \`--sh-far-N\` несут light-dark() | \`styles/tokens.css\` |`)
  const files = ['styles/base.css', 'styles/primitives.module.css'].filter(has)
  const readers = (name) => files.flatMap((f) => (read(f).match(new RegExp(`var\\(${name}[,)]`, 'g')) ?? []).map(() => f))
  const pop = readers('--r-pop'), ctrl = readers('--r-ctrl')
  rows.push(`| кто читает радиусы | \`--r-ctrl\` — ${ctrl.length} мест; \`--r-pop\` — ${pop.length ? pop.length + ' мест' : 'никто в наборе: главное действие придёт с магазином (REQUIRED)'} | \`styles/base.css\`, \`styles/primitives.module.css\` |`)
  return rows.join('\n')
}
/* Состояния и движение — из кода (И229): длительности и кривые с коридорами,
   вуали состояния, выключенное, что нажимаемое получает в основании. */
const statesFacts = () => {
  const rows = ['| Факт | Значение | Откуда |', '| --- | --- | --- |']
  const tokens = has('styles/tokens.css') ? read('styles/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '') : ''
  const val = (name) => tokens.match(new RegExp(`(?:^|[;{])\\s*${name}\\s*:\\s*([^;}]+)`))?.[1].trim() ?? '—'
  rows.push(`| длительности | \`--press-t\` ${val('--press-t')} (коридор ${THR.MOTION.press.join('…')}), \`--hover-t\` ${val('--hover-t')} (${THR.MOTION.hover.join('…')}), \`--open-t\` ${val('--open-t')} (${THR.MOTION.open.join('…')}); не больше ${THR.MOTION.tokens}, дольше ${THR.MOTION.max} — ожидание | \`styles/tokens.css\`, \`MOTION\` в \`tools/thresholds.mjs\` |`)
  rows.push(`| кривые | вход \`--ease\` ${val('--ease')}; уход \`--ease-exit\` ${val('--ease-exit')} | \`styles/tokens.css\` |`)
  rows.push(`| вуали состояния | наведение \`--state-hover\` ${val('--state-hover')} (коридор ${THR.STATE.hover.map((x) => x * 100).join('…')} %), нажатие \`--state-press\` ${val('--state-press')} (${THR.STATE.press.map((x) => x * 100).join('…')} %); роли \`--hover-row\`, \`--hover-ctrl\`, \`--press-row\`, \`--press-ctrl\` на корне, палубе, листе | \`STATE\` в \`tools/thresholds.mjs\` |`)
  rows.push(`| выключенное | \`--state-off\` ${val('--state-off')} (коридор ${THR.STATE.off.join('…')}) и второй признак словом | \`styles/tokens.css\` |`)
  rows.push(`| фокус | кольцо \`--ring-w\` ${THR.SHAPE.ring.width}px, отступ ${THR.SHAPE.ring.offset}px, краска \`--ring\` замером ≥ 3 : 1 | \`styles/base.css\`, \`palette\` |`)
  const base = has('styles/base.css') ? read('styles/base.css').replace(/\/\*[\s\S]*?\*\//g, '') : ''
  rows.push(`| нажимаемое в основании | ${/touch-action\s*:\s*manipulation/.test(base) ? 'touch-action: manipulation' : 'нет touch-action'}; ${/prefers-reduced-motion\s*:\s*reduce/.test(base) ? 'prefers-reduced-motion гасит переходы' : 'нет reduced-motion'}; ${/interpolate-size/.test(base) ? 'interpolate-size под no-preference' : 'нет interpolate-size'} | \`styles/base.css\` |`)
  return rows.join('\n')
}
const GEN = {
  css: table(CSS_FAMILIES, CSS_LABELS, 'Что сторожит'),
  design: ['| Семья | Что ловит | Откуда в impeccable |', '| --- | --- | --- |',
    ...DESIGN_FAMILIES.map((k) => `| \`${k}\` | ${DESIGN_LABELS[k] ?? '—'} | ${DESIGN_SOURCES[k] ?? '—'} |`)].join('\n'),
  /* Детектор impeccable по странице (И310): семьи набора — и судьба каждого
     правила сборки, чтобы по имени правила из отчёта найти, куда оно ушло. */
  detect: ['| Семья | Что ловит | Правила детектора и порог |', '| --- | --- | --- |',
    ...DETECT_FAMILIES.map((k) => `| \`${k}\` | ${DETECT_LABELS[k] ?? '—'} | ${DETECT_SOURCES[k] ?? '—'} |`)].join('\n'),
  detectFates: ['| Правило impeccable | Имя у автора | Судьба |', '| --- | --- | --- |',
    ...DETECT_RULES.map((r) => `| \`${r.id}\` | ${r.name} | ${fateOf(r.id)} |`)].join('\n'),
  craft: table(CRAFT_FAMILIES, CRAFT_LABELS, 'Что ловит'),
  code: table(CODE_FAMILIES, CODE_LABELS, 'Что ловит'),
  palette: paletteFacts(),
  scale: scaleFacts(),
  names: namesFacts(),
  axes: axesFacts(),
  layout: layoutFacts(),
  shape: shapeFacts(),
  states: statesFacts(),
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
const counts = LAWS.filter(has).map((f) => [f, lawCount(read(f))]).filter(([, n]) => n !== null)
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
  const head = read(f).match(/^---\r?\n([\s\S]*?)\r?\n---/)
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
if (KIT_README && !/^## .*что за чем/im.test(read('README.md'))) {
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
  '.claude/skills/scale': ['tools/scale.mjs', 'styles/scale.css', 'tools/thresholds.mjs'],
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

/* ── 11 · число о наборе в тексте не расходится с кодом ──────────────────
   Заказчик (И219) открыл README и прочёл «задаёшь семь красок» через день
   после того, как строитель стал просить три: текст жил памятью, а не
   кодом. Таблица фактов выше собирается из кода; здесь ловится число,
   которое кто-то всё-таки набрал словом. Реестр правил — история, его не
   трогаем. */
const NUMBER_WORDS = { две: 2, два: 2, три: 3, трёх: 3, трех: 3, четыре: 4, четырёх: 4, пять: 5, пяти: 5, шесть: 6, шести: 6, семь: 7, семи: 7, восемь: 8, восьми: 8 }
if (HAND_COUNT !== null) {
  const prose = [...skillFiles, ...(KIT_README ? ['README.md'] : [])]
  for (const f of prose) {
    for (const m of read(f).matchAll(/(две|два|три|трёх|трех|четыре|четырёх|пять|пяти|шесть|шести|семь|семи|восемь|восьми)\s+крас(?:ки|ок|ками)\s+на\s+тему/gi)) {
      const n = NUMBER_WORDS[m[1].toLowerCase()]
      if (n !== HAND_COUNT) bad.push(`${f}: «${m[0]}» — а строитель просит ${HAND_COUNT}; число набрано словом и отстало от кода`)
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
console.log(`· семей вёрстки: ${CSS_FAMILIES.length}, кода: ${CODE_FAMILIES.length}, отрисованной: ${CRAFT_FAMILIES.length}, дизайна: ${DESIGN_FAMILIES.length}, детектора impeccable: ${DETECT_FAMILIES.length} (правил сборки ${DETECT_RULES.length}), проверок: ${CHECKS.length}, правил в реестре: ${numbered.length}, законы (строк из ${CEILING}): ${laws}, справочных файлов: ${skillFiles.length - SKILL_DIRS.filter((d) => has(`${d}/SKILL.md`)).length}`)

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
