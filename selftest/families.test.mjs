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

const KIT = new URL('..', import.meta.url).pathname

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

test('noPress: ответ, взятый через composes из файла контролов, засчитан (И175)', () => {
  const dir = project({
    'components/Control.module.css': '.pressable { cursor: pointer }\n.pressable:active { filter: brightness(.9) }\n',
    'components/Buy.module.css': ".buy { composes: pressable from './Control.module.css'; background: red }\n@media (hover:hover){ .buy:hover { background: blue } }\n",
    'components/Mute.module.css': '.mute { background: red }\n@media (hover:hover){ .mute:hover { background: blue } }\n',
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
    'components/Pills.module.css': '.pill { color: red }\n@media (hover:hover){ .pill:not([data-current]):hover { color: blue } }\n.pill:active { filter: brightness(.95) }\n',
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
