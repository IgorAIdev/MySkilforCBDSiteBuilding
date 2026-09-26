/**
 * Семьи вёрстки на образцах, куплённых дефектами: маленький проект в
 * папке на время теста, проверка на нём, обратный ход.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))

const project = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-fam-'))
  cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
  writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true}')
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, rel, '..'), { recursive: true })
    writeFileSync(join(dir, rel), text)
  }
  return dir
}
const css = (dir) => spawnSync(process.execPath, [join(dir, 'tools/check-css.mjs')], { cwd: dir, encoding: 'utf8' })
const noPress = (out) => (out.match(/есть :hover, нет отклика на нажатие/g) ?? []).length - 1 // минус строка семьи в итоге

/* Ответ образцов — черта, а не краска: литерал краски в стилях — находка
   colorOut (И295), а эти тесты — про ответ на нажатие. */
test('noPress: ответ, взятый через composes из файла контролов, засчитан (И175)', () => {
  const dir = project({
    'components/Control.module.css': '.pressable { cursor: pointer }\n.pressable:active { filter: brightness(.9) }\n',
    'components/Buy.module.css': ".buy { composes: pressable from './Control.module.css'; text-decoration-line: none }\n@media (hover:hover){ .buy:hover { text-decoration-line: underline } }\n",
    'components/Mute.module.css': '.mute { text-decoration-line: none }\n@media (hover:hover){ .mute:hover { text-decoration-line: underline } }\n',
  })
  try {
    const r = css(dir)
    const out = r.stdout + r.stderr
    assert.match(out, /Mute\.module\.css.*\.mute — есть :hover, нет отклика/, 'без взятого ответа — находка')
    assert.doesNotMatch(out, /Buy\.module\.css/, 'взятый ответ на нажатие — не находка')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('noPress: отрицание состояния в селекторе не прячет ответ (.pill:not([data-current]):hover ↔ .pill:active)', () => {
  const dir = project({
    'components/Pills.module.css': '.pill { text-decoration-line: none }\n@media (hover:hover){ .pill:not([data-current]):hover { text-decoration-line: underline } }\n.pill:active { filter: brightness(.95) }\n',
  })
  try {
    const out = css(dir).stdout + css(dir).stderr
    assert.doesNotMatch(out, /Pills\.module\.css/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('noPress: класс на компоненте, который отвечает сам, или рядом с отвечающим классом — не находка; голое место — находка', () => {
  const dir = project({
    'components/Control.module.css': '.pressable { cursor: pointer }\n.pressable:active { filter: brightness(.9) }\n',
    'components/Form.module.css': [
      ".button { composes: pressable from './Control.module.css' }",
      '.buttonPrimary { background: red }',
      '@media (hover:hover){ .buttonPrimary:hover { background: blue } }',
      '.submit { margin-top: 4px }',
      '@media (hover:hover){ .submit:hover { opacity: .9 } }',
      '.bareLink { color: red }',
      '@media (hover:hover){ .bareLink:hover { color: blue } }',
    ].join('\n') + '\n',
    'components/Form.tsx': [
      "import styles from './Form.module.css'",
      'export default function Form() {',
      '  return (<form>',
      '    <button className={`${styles.button} ${styles.buttonPrimary}`}>+</button>',
      '    <CtaPill as="button" className={styles.submit}>Send</CtaPill>',
      '    <a className={styles.bareLink} href="/x">x</a>',
      '  </form>)',
      '}',
    ].join('\n') + '\n',
  })
  try {
    const out = css(dir).stdout + css(dir).stderr
    assert.doesNotMatch(out, /\.buttonPrimary —/, 'сосед .button отвечает — не находка')
    assert.doesNotMatch(out, /\.submit —/, 'надет на компонент — отвечает он')
    assert.match(out, /\.bareLink —/, 'голая ссылка без ответа — находка')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('scrollBleed: сдержка прокрутки, взятая через composes у общего узла окна, засчитана (И176)', () => {
  const dir = project({
    'components/Sheet.module.css': ':where(.dialogSurface) { margin: auto; overscroll-behavior: contain }\n',
    'components/Ask.module.css': ".panel { composes: dialogSurface from './Sheet.module.css'; position: fixed; max-height: 80dvh; overflow-y: auto }\n",
    'components/Loose.module.css': '.panel { position: fixed; max-height: 80dvh; overflow-y: auto }\n',
  })
  try {
    const out = css(dir).stdout + css(dir).stderr
    assert.match(out, /Loose\.module\.css.*панель прокручивается сама/, 'без сдержки — находка')
    assert.doesNotMatch(out, /Ask\.module\.css/, 'сдержка взята у общего узла — не находка')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

const code = (dir) => spawnSync(process.execPath, [join(dir, 'tools/check-code.mjs')], { cwd: dir, encoding: 'utf8' })

test('deadStyle: класс, взятый через приставку @/ по aliases, живой (И177)', () => {
  const dir = project({
    'kit.config.json': JSON.stringify({ code: ['src/app', 'src/components'], styles: ['src'], lib: 'src/lib', pages: 'src/app', aliases: { '@/': 'src/' } }),
    'src/app/page.module.css': '.shell { position: relative }\n.gone { color: red }\n',
    'src/components/Home.tsx': "import styles from '@/app/page.module.css'\nexport const Home = () => <div className={styles.shell} />\n",
  })
  try {
    const out = code(dir).stdout + code(dir).stderr
    assert.doesNotMatch(out, /\.shell —/, 'взят через @/ — живой')
    assert.match(out, /\.gone —/, 'никем не взят — мёртвый')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('translated: марка пропом — не находка; марка текстом без translate — находка (И177)', () => {
  const dir = project({
    'components/Page.tsx': 'export const Page = ({ product }) => <Purchase brand={product.brand} />\n',
    'components/Purchase.tsx': 'export const Purchase = ({ brand }) => <span className={s.line}>{brand}</span>\n',
    'components/Good.tsx': 'export const Good = ({ brand }) => <span translate="no">{brand}</span>\n',
    'lib/catalog.ts': 'export const byBrand = (rows) => rows.map(({ brand }) => ({ brand }))\n',
  })
  try {
    const out = code(dir).stdout + code(dir).stderr
    assert.doesNotMatch(out, /Page\.tsx/, 'передача пропом — не печать')
    assert.match(out, /Purchase\.tsx.*без translate/, 'печать текстом без атрибута — находка')
    assert.doesNotMatch(out, /Good\.tsx/, 'с атрибутом — не находка')
    assert.doesNotMatch(out, /catalog\.ts/, 'деструктуризация и объект — не печать')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('deadDress: атрибут, поставленный кодом строкой или через dataset — и кодом дизайн-системы из styles, — надет (И178)', () => {
  const dir = project({
    'kit.config.json': JSON.stringify({ code: ['app'], styles: ['app', 'ui'] }),
    /* База набора несёт долг deadDress собственных стилей (И171); образцу — ноль, иначе находка не печатается. */
    'tools/css-baseline.json': '{}',
    'app/page.module.css': ':global(html[data-search-open]) .panel { display: block }\n:global(html[data-nobody]) .x { color: red }\n',
    'ui/Search.tsx': "const OPEN = 'data-search-open'\nexport const open = () => document.documentElement.setAttribute(OPEN, '')\n",
  })
  try {
    const out = css(dir).stdout + css(dir).stderr
    assert.doesNotMatch(out, /data-search-open —/, 'поставлен строкой в коде дизайн-системы — надет')
    assert.match(out, /data-nobody —/, 'никем не поставлен — находка')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('contactScheme: «tel:» внутри слова после не-латинской буквы — не схема ссылки; настоящая схема — находка', () => {
  const dir = project({
    'lib/i18n/hu.ts': "export const HU = { 'product.batch': 'Tétel: {batch}' }\n",
    'components/Call.tsx': "export const Call = () => <a href=\"tel:+40700000000\">+40</a>\n",
  })
  try {
    const out = code(dir).stdout + code(dir).stderr
    assert.doesNotMatch(out, /hu\.ts.*tel:/, 'венгерское «Tétel:» принято за схему tel:')
    assert.match(out, /Call\.tsx.*tel:/, 'настоящий tel: мимо lib/contacts.ts — находка')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

/* colorOut (И295): цвет рождается у строителя палитры и выпускается в
   styles/palette.css; стили его только читают. Дефект — тона хвоста главной
   кнопки, смешанные прямо в её стилях (`color-mix(… 60% …)`), кромка
   выключенной и вуаль героя: проверки были зелёные, нарушение не мерилось. */
test('colorOut: литерал и доля числом в стилях — находка; роль, доля состояния, маска, файл палитры и панель вида — нет (И295)', () => {
  const dir = project({
    'kit.config.json': JSON.stringify({ styles: ['app', 'components', 'styles', 'look-panel'] }),
    'tools/css-baseline.json': '{}',
    'styles/palette.css': ':root{ --n-1: light-dark(#FCFBF9, #121110); --quiet-paper: color-mix(in srgb, #1F1E1C 8%, transparent) }\n',
    'look-panel/ui/look.css': '.lp{ --lp-ink: light-dark(#1b1b1b, #ececec); box-shadow: 0 2px 4px rgb(0 0 0 / .08) }\n',
    'components/Bad.module.css': [
      '.hex { color: #fff }',
      '.share { --trail: color-mix(in oklab, var(--pop) 60%, var(--page)) }',
      '.named { border-color: white }',
      '.fn { background: rgba(0, 0, 0, .5) }',
      '.knob { --leaf: 14%; background: color-mix(in oklab, var(--ctrl), var(--ink) var(--leaf)) }',
      '.half { background: color-mix(in oklab, var(--ctrl), var(--ink)) }',
      ':root { --x: var(--y); &:lang(bg) { --nested: oklch(0.5 0.1 80) } }',
    ].join('\n') + '\n',
    'components/Good.module.css': [
      '.role { color: var(--ink); background: var(--quiet) }',
      '.state { background: color-mix(in oklab, var(--surface), var(--ink) var(--state-hover)) }',
      '.words { white-space: nowrap; font-family: Georgia, serif; fill: currentColor; border-color: transparent }',
      '.mask { mask-image: linear-gradient(to right, #000 80%, transparent) }',
      '.forced { outline-color: Highlight }',
      '.svg { clip-path: url(#cut) }',
    ].join('\n') + '\n',
  })
  try {
    const out = spawnSync(process.execPath, [join(dir, 'tools/check-css.mjs'), '--list', 'colorOut'], { cwd: dir, encoding: 'utf8' }).stdout
    const bad = [[1, 'литерал #fff'], [2, 'долей числом 60%'], [3, 'имя краски white'], [4, 'литерал rgba()'], [5, 'ручкой узла --leaf'], [6, 'без доли'], [7, 'литерал oklch()']]
    for (const [line, why] of bad) {
      assert.ok(out.split('\n').some((l) => l.includes(`Bad.module.css:${line} `) && l.includes(why)), `строка ${line}: ${why}\n${out}`)
    }
    assert.doesNotMatch(out, /Good\.module\.css/, 'роль, доля состояния, слова, маска, системная краска и ссылка url(#) — не находка')
    assert.doesNotMatch(out, /palette\.css/, 'файл палитры выпускает строитель — там цвет и рождается')
    assert.doesNotMatch(out, /look-panel/, 'панель вида вне сайта')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

/* Движение (семья `motion`), три приёма из внешнего разбора 24.09.2026:
   «переход на всё» (Refero, craft-details.md §9 #50), появление из
   scale(0) (Эмиль Ковальский, STANDARDS.md, «Physicality») и пружина с
   перелётом — кривая с y вне коридора MOTION.overshoot (impeccable,
   bounce-easing). Названные свойства, кривая в коридоре, появление от 0.96
   и полоса из scaleX(0) — не находки. */
test('motion: переход на всё, появление из scale(0), пружина с перелётом — находки; названное и в коридоре — нет', () => {
  const dir = project({
    'components/Pop.module.css': [
      '.a { transition: all var(--hover-t) var(--ease) }',
      '.b { transition: .2s }',
      '.c { transition-property: all }',
      '@keyframes grow { from { transform: scale(0) } to { transform: scale(1) } }',
      '.d { scale: 0 }',
      '.e { transition: transform var(--press-t) cubic-bezier(.34, 1.56, .64, 1) }',
      '.ok { transition: opacity var(--hover-t) var(--ease), transform var(--press-t) cubic-bezier(.23, 1, .32, 1) }',
      '@keyframes in { from { transform: scale(.96); opacity: 0 } }',
      '.bar { transform: scaleX(0) }',
    ].join('\n') + '\n',
  })
  try {
    const r = spawnSync(process.execPath, [join(dir, 'tools/check-css.mjs'), '--list', 'motion'], { cwd: dir, encoding: 'utf8' })
    const lines = r.stdout.split('\n').filter((l) => l.includes('Pop.module.css'))
    const at = (n) => lines.filter((l) => l.includes(`Pop.module.css:${n} `))
    assert.equal(at(1).length, 1, 'transition: all')
    assert.equal(at(2).length, 1, 'сокращение без свойства — тоже all')
    assert.equal(at(3).length, 1, 'transition-property: all')
    assert.match(at(4).join('\n'), /scale\(0\)/)
    assert.match(at(5).join('\n'), /scale: 0/)
    assert.match(at(6).join('\n'), /пружина с перелётом/)
    for (const n of [7, 8, 9]) assert.deepEqual(at(n), [], `строка ${n} — не находка`)
    assert.match(r.stdout, /переход «на всё»/, 'подпись семьи называет новый приём')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

/* И320, И346: галочки шторки фильтров встали одной колонкой — `.ticks`
   переобъявлял `--cell-min` примитива `.grid` на том же узле голым классом,
   и победу отдал порядок кусков сборки. Находка — узел и примитив в одном
   className, ручка у обоих голым классом; сила места (атрибут, предок),
   `:where()` у примитива и узел на другом элементе — не находка. */
test('knobTie: ручка примитива, переобъявленная узлом на том же элементе равным весом, — находка; сила места и :where() — нет', () => {
  const list = (dir) => spawnSync(process.execPath, [join(dir, 'tools/check-css.mjs'), '--list', 'knobTie'], { cwd: dir, encoding: 'utf8' }).stdout
  const tsx = [
    "import p from '@/styles/primitives.module.css'",
    "import s from './Filters.module.css'",
    'export const A = () => <ul className={`${p.grid} ${s.ticks}`}><li className={s.tick} /></ul>',
    'export const B = () => <ul className={[p.grid, s.shelf].join(" ")} data-catalog-grid="" />',
    'export const C = () => <div className={s.values}><ul className={`${p.grid} ${s.inner}`} /></div>',
    'export const D = () => <div className={`${p.frame} ${s.shot}`} />',
  ].join('\n')
  const node = [
    '.ticks{--cell-min:10ch;--cols:2}',
    '.shelf[data-catalog-grid]{--cols:4}',
    '.values .inner{--cell-min:12ch}',
    '.tick{--cols:9}',
    '.shot{--frame:1 / 1}',
  ].join('\n')
  const dir = project({
    'styles/primitives.module.css': '.grid{--cols:3;--cell-min:240px;display:grid}\n.frame{--frame:4 / 3;aspect-ratio:var(--frame)}\n',
    'components/Filters.module.css': node + '\n',
    'components/Filters.tsx': tsx + '\n',
  })
  try {
    const out = list(dir)
    assert.match(out, /— 2\n/, `две находки: .ticks против .grid и .shot против .frame:\n${out}`)
    assert.match(out, /Filters\.module\.css:1 {2}\.ticks и примитив \.grid на одном узле \(components\/Filters\.tsx:3\): оба задают --cell-min, --cols/)
    assert.match(out, /\.shot и примитив \.frame на одном узле/)
    for (const quiet of ['.shelf', '.inner', '.tick ']) assert.ok(!out.includes(`  ${quiet}`), `${quiet} — сила места или другой элемент, не находка`)
    /* Умолчания примитива под :where() — вес ноль: узел побеждает всегда. */
    writeFileSync(join(dir, 'styles/primitives.module.css'), ':where(.grid){--cols:3;--cell-min:240px}\n.grid{display:grid}\n:where(.frame){--frame:4 / 3}\n.frame{aspect-ratio:var(--frame)}\n')
    assert.match(list(dir), /— 0\n/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

/* И454: имя объявляет код проекта — шрифт `next/font`, объект стиля,
   `setProperty` — и лежит этот код там, где его назвал `kit.config.json`,
   а не в раскладке набора. Такое имя объявлено; необъявленное нигде —
   находка по-прежнему. */
test('varMissing: имя, объявленное кодом проекта из его папок, объявлено (И454)', () => {
  const layout = "const inter = Inter({ subsets: ['latin'], variable: '--face-latin' })\n"
  const meter = "export const Meter = ({ p }) => <div className={s.bar} style={{ '--meter-fill': p }} />\n"
  const knob = "export const set = (el, v) => el.style.setProperty('--knob-at', v)\n"
  const dir = project({
    'kit.config.json': JSON.stringify({ code: ['src/app', 'src/components', 'src/lib'], styles: ['src', 'ui/src'], lib: 'src/lib', pages: 'src/app' }),
    'src/app/layout.tsx': layout,
    'ui/src/Meter.tsx': meter,
    'src/lib/knob.ts': knob,
    'src/app/globals.css': 'html { font-family: var(--face-latin), system-ui }\n',
    'ui/src/Meter.module.css': '.bar { inline-size: var(--meter-fill); inset-inline-start: var(--knob-at); block-size: var(--ghost-fill) }\n',
  })
  const list = () => spawnSync(process.execPath, [join(dir, 'tools/check-css.mjs'), '--list', 'varMissing'], { cwd: dir, encoding: 'utf8' }).stdout
  try {
    const out = list()
    for (const name of ['--face-latin', '--meter-fill', '--knob-at']) assert.ok(!out.includes(`${name} — читается`), `${name} объявлен кодом — не находка:\n${out}`)
    assert.match(out, /--ghost-fill — читается, не объявлен/, 'не объявлен нигде — находка')
    /* Обратный ход: код больше не объявляет — находка. */
    writeFileSync(join(dir, 'src/app/layout.tsx'), "const inter = Inter({ subsets: ['latin'] })\n")
    writeFileSync(join(dir, 'ui/src/Meter.tsx'), 'export const Meter = () => <div className={s.bar} />\n')
    writeFileSync(join(dir, 'src/lib/knob.ts'), 'export const set = () => {}\n')
    const back = list()
    for (const name of ['--face-latin', '--meter-fill', '--knob-at']) assert.match(back, new RegExp(`${name} — читается, не объявлен`))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

/* И456: знак стал ролью `--ink` / `--ink-soft`, и пара «знак + поверхность»
   сторожится по роли, а не только по прежнему оттенку `--sage-12`. */
test('halfRole: пара, сломанная ролью --ink, — находка, как и оттенком --sage-12 (И456)', () => {
  const dir = project({
    'components/Deck.module.css': [
      '.deck { --ink: var(--n-1) }',
      '.whole { --ink-soft: var(--n-2); --surface: var(--n-12) }',
      '.arrow { background: #fff; color: var(--ink) }',
      '.old { --sage-12: var(--n-1) }',
    ].join('\n') + '\n',
  })
  try {
    const out = spawnSync(process.execPath, [join(dir, 'tools/check-css.mjs'), '--list', 'halfRole'], { cwd: dir, encoding: 'utf8' }).stdout
    assert.match(out, /Deck\.module\.css:1 {2}\.deck — знак переопределён, поверхность нет/)
    assert.match(out, /Deck\.module\.css:3 {2}\.arrow — фон литералом, краска токеном --ink\b/)
    assert.match(out, /Deck\.module\.css:4 {2}\.old — знак переопределён, поверхность нет/)
    assert.doesNotMatch(out, /\.whole/, 'знак вместе с поверхностью — пара целиком, не находка')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
