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

