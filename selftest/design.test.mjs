/**
 * Дизайн делается дизайнерскими скиллами (И271).
 *
 * Дефект 24.09.2026: заказчик посмотрел образцовую витрину — «говно везде» —
 * и спросил, почему дизайнерские скиллы не работали с самого начала. Набор
 * мерил механику вёрстки, а композицию не требовало ничего; `impeccable` и
 * `redesign-skill` лежали рядом и не звались. Правило в CLAUDE.md держится
 * тремя вещами, и каждая проверяется здесь: хук на слова заказчика называет
 * скиллы по порядку, брифинг этапа печатает порядок, `check:design` меряет
 * механическую половину impeccable храповиком — каждая семья на своём
 * образце, и каждая молчит на чистом.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { DESIGN, designWord } from '../tools/checks.mjs'
import { STAGES, ALWAYS } from '../tools/stages.mjs'
import { DESIGN_FAMILIES, DESIGN_LABELS, DESIGN_SOURCES } from '../tools/design-families.mjs'
import { SCRIPTS } from '../scripts.mjs'

const KIT = fileURLToPath(new URL('..', import.meta.url))

const hook = (prompt) => spawnSync(process.execPath, [join(KIT, 'tools/hook-on-prompt.mjs')],
  { input: JSON.stringify({ prompt }), encoding: 'utf8', cwd: KIT })

/** Шаги порядка названы все, и каждый следующий — правее предыдущего. */
const inOrder = (text) => {
  const at = DESIGN.order.map((step) => text.indexOf(step))
  assert.ok(at.every((i) => i >= 0), `не все шаги порядка названы:\n${text}`)
  for (let i = 1; i < at.length; i++) assert.ok(at[i] > at[i - 1], `«${DESIGN.order[i]}» раньше «${DESIGN.order[i - 1]}»`)
}

test('слова заказчика про вид узнаются с начала слова, чужие — нет', () => {
  for (const said of ['дизайн говно везде', 'Некрасиво', 'плохо выглядит карточка', 'ритм у полки рваный',
    'мало воздуха', 'отступы кривые', 'переделай шапку', 'как у всех', 'нужен редизайн']) {
    assert.ok(designWord(said), `не узнано: «${said}»`)
  }
  for (const said of ['поменяй алгоритм сортировки', 'добавь товар в корзину', 'почини сборку', '']) {
    assert.equal(designWord(said), null, `узнано лишнее: «${said}»`)
  }
})

test('хук на слова про дизайн называет скиллы по порядку — раньше проверок', () => {
  const r = hook('дизайн говно везде, переделай')
  assert.equal(r.status, 0, r.stderr)
  inOrder(r.stdout)
  assert.match(r.stdout, /redesign-skill/)
  assert.match(r.stdout, /Дизайн делается дизайнерскими скиллами/)
  assert.ok(r.stdout.indexOf(DESIGN.order[0]) < r.stdout.indexOf('npm run'), 'скиллы зовутся до правки, проверки — после')
  assert.match(r.stdout, /npm run check:design/)
})

/* И300: порядок живёт в двух местах — нумерованным списком в CLAUDE.md и
   строками `DESIGN.order` (его печатают хук и брифинг). Разойтись им нельзя:
   шагов столько же, первый читает PRODUCT.md и DESIGN.md, а не запускатель,
   которого набор не везёт. */
test('порядок дизайна: список в CLAUDE.md и DESIGN.order — одни шаги, шаг 1 читает файлы', () => {
  const law = readFileSync(join(KIT, 'CLAUDE.md'), 'utf8').replace(/\r\n/g, '\n')
  const at = law.indexOf('**Дизайн делается дизайнерскими скиллами.**')
  assert.ok(at >= 0, 'правила нет в CLAUDE.md')
  const section = law.slice(at, law.indexOf('\n**', at + 10))
  const steps = [...section.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]))
  assert.deepEqual(steps, DESIGN.order.map((_, i) => i + 1), 'шагов в CLAUDE.md не столько, сколько в DESIGN.order')
  assert.match(DESIGN.order[0], /PRODUCT\.md и DESIGN\.md/)
  assert.doesNotMatch(DESIGN.order.join(' '), /impeccable context/, 'шаг, зовущий запускатель, которого нет')
  for (const word of ['PRODUCT.md', 'DESIGN.md', 'референсы и замок', 'docs/design/', 'одна вещь, которую запомнят']) {
    assert.ok(section.includes(word) || DESIGN.order.join(' ').includes(word), `«${word}» нет ни в правиле, ни в реестре`)
  }
  assert.ok(existsSync(join(KIT, 'docs/design/_brief.md')), 'бриф поверхности без образца')
  assert.match(readFileSync(join(KIT, '.gitignore'), 'utf8'), /^\/?\.refs\/?$/m, 'снимки чужих магазинов не закрыты от репозитория')
  assert.match(readFileSync(join(KIT, 'templates/storefront/.gitignore'), 'utf8'), /^\/?\.refs\/?$/m, 'у витрины снимки чужих магазинов не закрыты')
})

test('хук на чужие слова о дизайне молчит, о проверках — говорит как раньше', () => {
  const fonts = hook('шрифты поехали на телефоне')
  assert.equal(fonts.status, 0)
  assert.doesNotMatch(fonts.stdout, /impeccable/)
  assert.match(fonts.stdout, /npm run check:css/)
  const none = hook('спасибо')
  assert.equal(none.status, 0)
  assert.equal(none.stdout, '')
  const garbage = spawnSync(process.execPath, [join(KIT, 'tools/hook-on-prompt.mjs')], { input: '', encoding: 'utf8', cwd: KIT })
  assert.equal(garbage.status, 0, 'хук на пути заказчика не падает')
})

test('брифинг: порядок в «Всегда», скиллы под «Кто работает», check:design в большой проверке с этапа 2', () => {
  inOrder(ALWAYS.join('; '))
  assert.match(ALWAYS.join('; '), /redesign-skill/)
  assert.deepEqual(STAGES.find((s) => s.n === 2).skills.slice(0, 2), ['impeccable', 'redesign-skill'])
  for (const s of STAGES) {
    assert.equal(s.checks.includes('check:design'), s.n >= 2, `этап ${s.n}: check:design ${s.n >= 2 ? 'не стоит' : 'стоит раньше вёрстки'}`)
  }
  const r = spawnSync(process.execPath, [join(KIT, 'tools/stage.mjs')], { encoding: 'utf8', cwd: KIT })
  assert.equal(r.status, 0, r.stderr)
  const lines = r.stdout.split('\n')
  inOrder(lines.find((l) => l.includes('Всегда:')) ?? '')
  /* Набор стоит на этапе 0, где дизайнерских скиллов в списке этапа нет:
     брифинг всё равно называет их под «Кто работает» — оговоркой. */
  const who = lines.findIndex((l) => l.includes('Кто работает:'))
  assert.match(lines.slice(who, who + 2).join('\n'), /impeccable[\s\S]*redesign-skill/, 'под «Кто работает» нет дизайнерских скиллов')
})

/* ── check:design: каждая семья на своём образце ──────────────────────── */

/** Чистый сайт: роли размера, примитивы, одетые поверхности браузера. */
const CLEAN = {
  'styles/scale.css': `:root{
  --fs-xs:.875rem; --fs-base:1rem; --h2-size:2rem; --h3-size:1.5rem; --pagehead-size:2.5rem; --eyebrow-size:var(--fs-xs);
  --ctrl-fs-xs:.875rem; --ctrl-fs-sm:1rem;
  --sp-4:clamp(16px, 11px + 1vw, 20px); --air-row:var(--sp-4); --air-block:32px;
  --gap-grid:clamp(16px, 11px + 1vw, 20px); --air-group:clamp(24px, 11px + 2vw, 36px);
}\n`,
  'styles/tokens.css': ':root{--sh-raised:0 0 0 1px #0001, 0 1px 2px #0002, 0 8px 20px -10px #0003}\n',
  'styles/primitives.module.css': `.stack{display:flow-root}
.stack > * + *{margin-block-start:var(--stack, var(--air-block))}
.grid{--grid-gap:var(--gap-grid);display:grid;gap:var(--grid-gap)}
.pagehead h1{font-size:var(--pagehead-size)}
.sectionHead h2{font-size:var(--h2-size)}
.prose{max-inline-size:65ch}
.eyebrow{font-size:var(--eyebrow-size)}
.said{position:absolute;clip-path:inset(50%)}\n`,
  'styles/base.css': `a{color:inherit;text-decoration:none;text-underline-offset:3px}
:where(p, li, dd) a{text-decoration-line:underline}
::selection{background:#ff0}
input{caret-color:red}
:focus-visible{outline:2px solid red}
html{scrollbar-width:thin}
table{font-variant-numeric:tabular-nums}\n`,
  'components/Page.tsx': `import p from '@/styles/primitives.module.css'
export function Page({ title }: { title: string }) {
  return (
    <main className={p.stack}>
      <div className={p.pagehead}><h1>{title}</h1></div>
      <div className={p.sectionHead}><h2>{title}</h2></div>
      <h2 className={p.said}>{title}</h2>
    </main>
  )
}\n`,
}

const project = (extra = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-design-'))
  cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
  rmSync(join(dir, 'tools/design-baseline.json'), { force: true })
  writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true}')
  for (const [rel, text] of Object.entries({ ...CLEAN, ...extra })) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true })
    writeFileSync(join(dir, rel), text)
  }
  return dir
}
const measure = (extra) => {
  const dir = project(extra)
  try {
    const r = spawnSync(process.execPath, [join(dir, 'tools/check-design.mjs'), '--json'], { cwd: dir, encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    return JSON.parse(r.stdout)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
/** Семья нашла ровно `n`, остальные молчат. */
const only = (report, family, n = 1) => {
  for (const k of DESIGN_FAMILIES) assert.equal(report.counts[k], k === family ? n : 0, `${k}: ${report.found[k].join(' | ')}`)
}
const component = (body, css = '') => ({
  'components/X.tsx': `import p from '@/styles/primitives.module.css'\nimport s from './X.module.css'\nimport { Icon } from './Icon.tsx'\n${body}\n`,
  'components/X.module.css': css,
})

test('check:design: у каждой семьи подпись и строка источника в impeccable', () => {
  for (const k of DESIGN_FAMILIES) {
    assert.ok(DESIGN_LABELS[k], `${k} без подписи`)
    assert.match(DESIGN_SOURCES[k] ?? '', /^(craft-floor|typeset|layout|document|doctor)\.md:\d+/, `${k} без строки источника`)
    const [file, line] = DESIGN_SOURCES[k].match(/^([\w-]+\.md):(\d+)/).slice(1)
    const text = readFileSync(join(KIT, '.claude/skills/impeccable/reference', file), 'utf8').split('\n')
    assert.ok(text.length >= Number(line), `${k}: в ${file} нет строки ${line}`)
  }
})

test('check:design: чистый сайт — ноль по всем семьям', () => {
  only(measure(), null, 0)
})

test('check:design · разметка: надпись над заголовком, голый заголовок, чужая роль', () => {
  only(measure(component(`export const A = () => <div><p className={p.eyebrow}>CBD</p><h1 className={s.t}>Name</h1><p className={p.eyebrow}>Help</p><ul><li>x</li></ul></div>`,
    '.t{font-size:var(--pagehead-size)}')), 'eyebrow')
  only(measure(component(`export const A = () => <section className={p.prose}><h2>Doc</h2></section>`)), 'bareHeading')
  only(measure(component(`export function A({ level }: { level: 1 | 2 }) {\n  const H = level === 1 ? 'h1' : 'h2'\n  return <H className={s.title}>Not found</H>\n}`,
    '.title{font-size:var(--h2-size)}')), 'headRole')
  only(measure(component(`export const A = () => <h2 className={s.step}>Contact</h2>`, '.step{font-size:var(--h3-size)}')), 'headRole')
})

test('check:design · меню мельче тела; крошки — не меню', () => {
  const nav = (size) => component(`export const A = () => <nav className={s.nav}><ul className={s.links}><li><a href="/">Shop</a></li></ul></nav>`,
    `.links a{font-size:var(${size})}`)
  only(measure(nav('--ctrl-fs-xs')), 'navSmall')
  only(measure(nav('--ctrl-fs-sm')), null, 0)
  const crumbs = nav('--ctrl-fs-xs')
  only(measure({ 'components/Breadcrumbs.tsx': crumbs['components/X.tsx'].replace(/\.\/X\.module\.css/, './Breadcrumbs.module.css'),
    'components/Breadcrumbs.module.css': crumbs['components/X.module.css'] }), null, 0)
  /* Правило с отметкой метит только ссылку с отметкой: голая стрелка
     страниц в `nav` — не плашка «куда ведёт». */
  const marked = (around) => component(`export const A = () => <nav className={s.pages}><a className={s.go}${around} href="/2">Next</a></nav>`,
    `.go{font:inherit}\n.go:is([data-around='quiet'], [data-around='edge']){font-size:var(--ctrl-fs-xs)}`)
  only(measure(marked('')), null, 0)
  only(measure(marked(' data-around="quiet"')), 'navSmall')
  /* Орган в меню: голое правило органа мельче тела, но каждая ссылка меню
     несёт одежду того же органа с ролью тела — одежда (0,2,0) бьёт голое
     правило (0,1,0), и меню набрано телом (И445). Ссылка без одежды, одежда
     мельче тела и одежда без размера — находка. */
  const organ = (dress, links) => component(`export const A = () => <nav className={s.menu}>${links}</nav>`,
    `.pill{font-size:var(--ctrl-fs-xs)}\n.pill[data-pill='nav']{${dress}}`)
  const dressed = '<a className={s.pill} data-pill="nav" href="/a">A</a>'
  only(measure(organ('font-size:var(--body-size)', dressed + dressed)), null, 0)
  only(measure(organ('font-size:var(--body-size)', dressed + '<a className={s.pill} href="/b">B</a>')), 'navSmall')
  only(measure(organ('font-size:var(--ctrl-fs-xs)', dressed)), 'navSmall')
  only(measure(organ('font-weight:600', dressed)), 'navSmall')
})

test('check:design · ритм группы и карточки «значок + заголовок + текст»', () => {
  const list = (inner) => component(`export const A = ({ items }: { items: string[] }) => (
  <ul className={\`\${p.grid} \${s.points}\`}>
    {items.map((t) => (
      <li key={t} className={\`\${p.stack} \${s.point}\`}>
        <span>{t}</span>
        <p>{t}</p>
      </li>
    ))}
  </ul>
)`, `.point{--stack:${inner}}`)
  only(measure(list('var(--air-row)')), 'flatRhythm')
  only(measure(list('8px')), null, 0)
  only(measure(component(`export const A = ({ items }: { items: string[] }) => (
  <ul className={s.points}>
    {items.map((t) => (
      <li key={t}>
        <Icon id="truck" />
        <h3 className={s.name}>{t}</h3>
        <p>{t}</p>
      </li>
    ))}
  </ul>
)`, '.name{font-size:var(--h3-size)}')), 'iconCards')
})

test('check:design · поверхности браузера и ссылка в тексте', () => {
  only(measure({ 'styles/base.css': CLEAN['styles/base.css'].replace('::selection{background:#ff0}\n', '') }), 'browserSurface')
  only(measure({ 'styles/base.css': CLEAN['styles/base.css'].replace(':where(p, li, dd) a{text-decoration-line:underline}\n', '') }), 'proseLink')
})

test('check:design · запреты пола ремесла в стилях и знак-символ в разметке', () => {
  const css = (rule) => ({ 'styles/extra.css': rule })
  only(measure(css('.t{background:linear-gradient(red,blue);-webkit-background-clip:text;background-clip:text}')), 'gradientText')
  only(measure(css('.bar{backdrop-filter:blur(12px)}')), 'glassBlur')
  only(measure(css('.note{border-inline-start:4px solid red}')), 'sideStripe')
  only(measure(css('.note{border-left:1px solid red}')), null, 0)
  only(measure(css('.card{box-shadow:4px 4px 0 #000}')), 'hardShadow')
  only(measure(css('.card{box-shadow:0 0 16px #f0f}')), 'glowHalo')
  only(measure(css('.card{box-shadow:inset 0 -1px 0 #0002, 0 0 0 2px #00f}')), null, 0)
  only(measure(css('.h{letter-spacing:-.06em}')), 'trackTight')
  only(measure(css('.h{letter-spacing:-.04em}')), null, 0)
  only(measure(css('.price{font-family:ui-monospace, monospace}')), 'monoCostume')
  only(measure(css('code, pre{font-family:ui-monospace, monospace}')), null, 0)
  only(measure(component('export const A = () => <button type="button">×</button>')), 'glyphIcon')
  only(measure(component('export const A = () => <button type="button" aria-label="Close"><Icon id="x" /></button>')), null, 0)
})

/* И300: DESIGN.md описывает вид ролями — число в нём вторая правда рядом со
   строителями, роль без объявления — описание, разошедшееся с системой. */
test('check:design · DESIGN.md: число вида и мёртвая роль; роли и приставки — чисто', () => {
  only(measure({ 'DESIGN.md': '# Design System\n\n## Colors\n\n- **Марка** (#b8422e): главная кнопка.\n' }), 'docValue')
  only(measure({ 'DESIGN.md': '## Layout\n\nПоле карточки 12px, раскрытие 200ms.\n' }), 'docValue', 2)
  only(measure({ 'DESIGN.md': '## Colors\n\nЗаливка oklch(0.6 0.1 40).\n' }), 'docValue')
  only(measure({ 'DESIGN.md': '## Typography\n\nРоль раздела — `--no-such`.\n' }), 'docDead')
  only(measure({ 'DESIGN.md': '## Layout\n\nВоздух `--gone-*`.\n' }), 'docDead')
  only(measure({ 'DESIGN.md': '# Design System\n\n## Typography\n\nРазделы — `--h2-size`, ритм — `--air-*`, тень — `--sh-raised`; шов «телефон», пропорция 4 : 3.\n' }), null, 0)
})

test('check:design храповиком: база словом, рост валит, сокращение просит опустить планку', () => {
  const dir = project(component(`export const A = () => <section className={p.prose}><h2>Doc</h2></section>`))
  const run = (...args) => spawnSync(process.execPath, [join(dir, 'tools/check-design.mjs'), ...args], { cwd: dir, encoding: 'utf8' })
  try {
    assert.equal(run().status, 1, 'без базы проверка зелёная — долг принят молча')
    assert.equal(run('--update').status, 0)
    assert.equal(JSON.parse(readFileSync(join(dir, 'tools/design-baseline.json'), 'utf8')).bareHeading, 1)
    assert.equal(run().status, 0)
    writeFileSync(join(dir, 'components/Y.tsx'), 'export const B = () => <section><h3>Also bare</h3></section>\n')
    const grown = run()
    assert.equal(grown.status, 1)
    assert.match(grown.stderr, /bareHeading[\s\S]*было 1, стало 2[\s\S]*craft-floor\.md:15/)
    rmSync(join(dir, 'components/Y.tsx'))
    rmSync(join(dir, 'components/X.tsx'))
    const less = run()
    assert.equal(less.status, 0)
    assert.match(less.stdout, /Долг сократился/)
    assert.match(run('--list', 'bareHeading').stdout, /источник: impeccable, craft-floor\.md:15/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('набор держит свою базу, поставленная витрина проходит на ней же; ставщик и сборщик везут проверку', () => {
  const kit = spawnSync(process.execPath, [join(KIT, 'tools/check-design.mjs')], { cwd: KIT, encoding: 'utf8' })
  assert.equal(kit.status, 0, kit.stderr)
  assert.match(kit.stdout, /templates\/storefront/, 'набор мерит образцовую витрину')
  const root = mkdtempSync(join(tmpdir(), 'design-sf-'))
  try {
    const site = join(root, 'site')
    const put = spawnSync(process.execPath, [join(KIT, 'install.mjs'), '--storefront', site], { encoding: 'utf8' })
    assert.equal(put.status, 0, put.stderr)
    const r = spawnSync(process.execPath, [join(site, 'tools/check-design.mjs')], { cwd: site, encoding: 'utf8' })
    assert.equal(r.status, 0, `поставленная витрина красная на базе набора:\n${r.stdout}${r.stderr}`)
    /* И300: контекст дизайна едет витрине в корень — шаг 1 порядка читает его там. */
    assert.match(readFileSync(join(site, 'PRODUCT.md'), 'utf8'), /<!-- impeccable:product-schema 1 -->/)
    assert.match(r.stdout, /DESIGN\.md/, 'check:design витрины не читал её DESIGN.md')
    const json = JSON.parse(spawnSync(process.execPath, [join(site, 'tools/check-design.mjs'), '--json'], { cwd: site, encoding: 'utf8' }).stdout)
    assert.equal(json.counts.docValue + json.counts.docDead, 0, `DESIGN.md витрины: ${[...json.found.docValue, ...json.found.docDead].join(' | ')}`)
  } finally { rmSync(root, { recursive: true, force: true }) }
  assert.equal(SCRIPTS['check:design'], 'node tools/check-design.mjs')
  const builder = readFileSync(join(KIT, 'tools/kit.mjs'), 'utf8')
  for (const f of ['tools/check-design.mjs', 'tools/design-families.mjs']) assert.match(builder, new RegExp(`'${f.replace(/[./]/g, '\\$&')}'`))
})
