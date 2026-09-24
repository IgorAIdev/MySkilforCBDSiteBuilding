/**
 * Панель вида в шаблоне витрины — храповик и её жизнь в установке
 * (templates/storefront/look-panel/PANEL.md, «Шаблон и магазин»; слово
 * заказчика 24.09.2026: «в шаблоне панель удалять нельзя даже случайно,
 * потому что вложим туда много сил сейчас»).
 *
 *   · шаблон держит панель целиком: её папку, вход, строку подключения, все
 *     варианты шапки и карточки;
 *   · снять её нельзя ни в шаблоне, ни в витрине шаблона — только в
 *     магазине, и только словом `--yes`, с копией рядом;
 *   · вернуть — одной командой ставщика; вид сайта при этом тот же;
 *   · переустановка не трогает данные сайта: опубликованный вид, черновик,
 *     шрифты, окружение;
 *   · строитель палитры панели — копия движка набора, а не своя математика.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { toCss } from '../tools/palette.mjs'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const T = join(KIT, 'templates/storefront')
const install = (...args) => spawnSync(process.execPath, [join(KIT, 'install.mjs'), ...args], { encoding: 'utf8' })
const node = (cwd, ...args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' })
const read = (dir, p) => readFileSync(join(dir, p), 'utf8')
const listOf = (text, name) => [...(text.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\]`))?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

/** Варианты разметки, которые шаблон держит, — храповик: убыть им нельзя. */
const HEADERS = ['classic', 'search', 'boutique']
const CARDS = ['framed', 'bare', 'outlined']
const PANEL = ['PANEL.md', 'ui/look.js', 'ui/look.css', 'ui/choice.mjs', 'routes/index.ts', 'scripts/build-catalog.mjs',
  'scripts/fonts.mjs', 'scripts/check-choice.mjs', 'scripts/remove.mjs', 'scripts/pairs.mjs', 'tests/panel.test.ts']

test('the storefront template keeps the whole look panel: folder, entry, include line, every header and card variant', () => {
  for (const f of PANEL) assert.ok(existsSync(join(T, 'look-panel', f)), `look-panel/${f}`)
  assert.ok(existsSync(join(T, 'app/look-panel/[...path]/route.ts')), 'вход панели app/look-panel/[...path]/route.ts')
  assert.match(read(T, 'components/Shell.tsx'), /<script src="\/look-panel\/look\.js" async \/>.*look-panel/, 'строка подключения в Shell.tsx')
  const headers = listOf(read(T, 'lib/headers.ts'), 'HEADERS')
  for (const h of HEADERS) {
    assert.ok(headers.includes(h), `lib/headers.ts: ${h}`)
    assert.match(read(T, 'components/Header.tsx'), new RegExp(`data-variant="${h}"`), `Header.tsx рисует ${h}`)
  }
  const cards = listOf(read(T, 'lib/cards.ts'), 'CARDS')
  for (const c of CARDS) {
    assert.ok(cards.includes(c), `lib/cards.ts: ${c}`)
    assert.match(read(T, 'components/ProductCard.module.css'), new RegExp(`look-card:${c}:start[\\s\\S]*\\[data-card='${c}'\\]`), `ProductCard.module.css одевает ${c}`)
  }
  assert.match(read(T, 'package.json'), /"look:remove": "node look-panel\/scripts\/remove\.mjs"/)
  assert.match(read(T, '.env.example'), /^LOOK_PICKER=/m)
})

test('the panel does not come off in the kit template: a hard refusal, no key overrides it', async () => {
  const { refusal } = await import(pathToFileURL(join(T, 'look-panel/scripts/remove.mjs')).href)
  assert.match(refusal(T), /шаблон витрины в наборе/)
  const text = read(T, 'look-panel/scripts/remove.mjs')
  assert.doesNotMatch(text, /--force/, 'ключа, который бы перебил отказ, нет')
})

test('install records the role; removal needs a shop and --yes, backs up first; the installer puts the panel back and the look stays', () => {
  const root = mkdtempSync(join(tmpdir(), 'look-panel-'))
  try {
    /* Витрина шаблона: панель не снимается, и без записи роли — тоже. */
    const show = join(root, 'show')
    assert.equal(install('--storefront', show).status, 0)
    assert.equal(JSON.parse(read(show, '.site-kit-install.json')).role, 'showcase')
    const refused = node(show, 'look-panel/scripts/remove.mjs', '--yes')
    assert.notEqual(refused.status, 0)
    assert.match(refused.stderr, /витрина шаблона/)
    assert.ok(existsSync(join(show, 'look-panel/ui/look.js')), 'витрина: панель на месте')
    const record = JSON.parse(read(show, '.site-kit-install.json'))
    delete record.role
    writeFileSync(join(show, '.site-kit-install.json'), JSON.stringify(record))
    assert.match(node(show, 'look-panel/scripts/remove.mjs', '--yes').stderr, /нет записи ставщика о роли/)
    rmSync(join(show, '.site-kit-install.json'))
    assert.notEqual(node(show, 'look-panel/scripts/remove.mjs', '--yes').status, 0, 'нет записи — нет снятия')
    assert.ok(existsSync(join(show, 'look-panel')))
    assert.notEqual(install('--shop', join(root, 'bare')).status, 0, '--shop — только с --storefront')

    /* Магазин: без --yes — только список. */
    const shop = join(root, 'shop')
    assert.equal(install('--storefront', '--shop', shop).status, 0)
    assert.equal(JSON.parse(read(shop, '.site-kit-install.json')).role, 'shop')
    const look = read(shop, 'lib/source/sample/look.json')
    writeFileSync(join(shop, 'lib/source/sample/look.draft.json'), look)
    const dry = node(shop, 'look-panel/scripts/remove.mjs')
    assert.equal(dry.status, 0, dry.stderr)
    assert.match(dry.stdout, /варианты карточки товара, кроме выбранного «framed»: bare, outlined/)
    assert.match(dry.stdout, /Ничего не удалено\. Снять: npm run look:remove -- --yes/)
    assert.ok(existsSync(join(shop, 'look-panel')) && existsSync(join(shop, 'lib/source/sample/look.draft.json')), 'без --yes ничего не удалено')
    assert.deepEqual(readdirSync(root).filter((n) => n.includes('look-backup')), [], 'без --yes и копии нет')

    /* --yes: копия рядом, затем снятие. */
    const yes = node(shop, 'look-panel/scripts/remove.mjs', '--yes')
    assert.equal(yes.status, 0, yes.stderr)
    const backups = readdirSync(root).filter((n) => /^shop\.look-backup-\d{8}-\d{4}$/.test(n))
    assert.equal(backups.length, 1, 'копия — соседняя папка <сайт>.look-backup-<ГГГГММДД-ЧЧмм>')
    const bk = join(root, backups[0])
    for (const f of ['README.md', 'lib/source/sample/look.json', 'lib/source/sample/look.draft.json', 'look-panel/PANEL.md', 'app/look-panel/[...path]/route.ts', 'lib/cards.ts', 'components/ProductCard.module.css']) assert.ok(existsSync(join(bk, f)), `в копии: ${f}`)
    assert.equal(listOf(read(bk, 'lib/cards.ts'), 'CARDS').length, 3, 'в копии — все карточки, как было')
    assert.match(read(bk, 'README.md'), /node install\.mjs --look-panel/)
    assert.match(yes.stdout, /сайт не в git — метки нет/)
    assert.ok(!existsSync(join(shop, 'look-panel')) && !existsSync(join(shop, 'app/look-panel')))
    assert.deepEqual(listOf(read(shop, 'lib/cards.ts'), 'CARDS'), ['framed'])
    assert.equal(read(shop, 'lib/source/sample/look.json'), look, 'вид — тот же')

    /* Вернуть: панель, все варианты, флаг, команды; вид тот же. */
    const back = install('--look-panel', shop)
    assert.equal(back.status, 0, back.stderr)
    for (const f of PANEL) assert.ok(existsSync(join(shop, 'look-panel', f)), `вернулось: look-panel/${f}`)
    for (const f of ['ui/catalog.json', 'ui/engine/palette.mjs']) assert.ok(existsSync(join(shop, 'look-panel', f)), `собрано: look-panel/${f}`)
    assert.ok(existsSync(join(shop, 'app/look-panel/[...path]/route.ts')))
    assert.deepEqual(listOf(read(shop, 'lib/headers.ts'), 'HEADERS'), HEADERS)
    assert.deepEqual(listOf(read(shop, 'lib/cards.ts'), 'CARDS'), CARDS)
    assert.match(read(shop, 'components/Shell.tsx'), /\/look-panel\/look\.js/)
    assert.match(read(shop, '.env.example'), /^LOOK_PICKER=/m)
    assert.equal(JSON.parse(read(shop, 'package.json')).scripts['look:remove'], 'node look-panel/scripts/remove.mjs')
    assert.equal(read(shop, 'lib/source/sample/look.json'), look, 'опубликованный вид не тронут')
    const same = node(shop, 'scripts/look-slots.mjs', '--check')
    assert.equal(same.status, 0, `стили — из того же вида:\n${same.stdout}${same.stderr}`)
    const env = { ...process.env }
    delete env.NODE_TEST_CONTEXT
    const panel = spawnSync(process.execPath, [join(shop, 'tools/check-test.mjs'), 'look-panel/tests/*.test.ts'], { cwd: shop, encoding: 'utf8', env })
    assert.equal(panel.status, 0, `тесты вернувшейся панели:\n${panel.stdout.slice(-1500)}${panel.stderr.slice(-800)}`)

    /* Магазин в git: перед снятием — метка. */
    const git = (...a) => spawnSync('git', ['-C', shop, ...a], { encoding: 'utf8' })
    if (git('--version').status === 0) {
      git('init', '-q'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '-A'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'shop')
      const tagged = node(shop, 'look-panel/scripts/remove.mjs', '--yes')
      assert.equal(tagged.status, 0, tagged.stderr)
      assert.match(git('tag').stdout, /^look-panel-before-remove-\d{8}-\d{4}$/m)
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})

/* Кнопок будет много (слово заказчика 24.09.2026: «по кнопкам будем делать
   много выбора в меню, будем позже добавлять кнопки»): вариант оси — запись
   в каталоге, панель показывает его и считает его пары без правки кода. */
test('a new button option in the catalog shows in the panel and gets its conflicts computed, with no code change', async () => {
  const root = mkdtempSync(join(tmpdir(), 'look-axes-'))
  const dir = join(root, 'site')
  try {
    assert.equal(install('--storefront', dir).status, 0)
    const buttons = JSON.parse(read(dir, 'styles/buttons.json'))
    buttons.loud.варианты.tone = { имя: 'Тон', name: 'Tone', line: 'A tint of the brand, dark label', что: 'тон марки, тёмная надпись', роли: { '--ctrl-btn-fill-pop': 'var(--a-4)', '--ctrl-btn-ink-pop': 'var(--a-11)', '--ctrl-btn-edge-pop': 'transparent' } }
    writeFileSync(join(dir, 'styles/buttons.json'), JSON.stringify(buttons, null, 2) + '\n')
    const built = node(dir, 'look-panel/scripts/build-catalog.mjs', '--from', KIT)
    assert.equal(built.status, 0, built.stderr)
    const catalog = JSON.parse(read(dir, 'look-panel/ui/catalog.json'))
    assert.ok(catalog.groups['btn-loud'].some((o) => o.id === 'tone' && o.name === 'Tone'), 'вариант — в панели')
    const { sectionsOf } = await import(pathToFileURL(join(dir, 'look-panel/ui/choice.mjs')).href)
    assert.ok(sectionsOf(catalog)[0].subs.find((s) => s.id === 'buttons').fields.some((f) => f[0] === 'btn-loud'), 'ось — в подразделе Buttons')
    const pairs = catalog.pairs.filter((p) => (p.x.field === 'btn-loud' && p.x.id === 'tone') || (p.y.field === 'btn-loud' && p.y.id === 'tone'))
    assert.ok(pairs.length > 0 && pairs.every((p) => /loud button/.test(p.why)), `пары варианта посчитаны правилом сайта: ${JSON.stringify(pairs.slice(0, 2))}`)
    assert.ok(!catalog.pairs.some((p) => p.x.id === 'fill' || p.y.id === 'fill'), 'заливка марки носится со всеми наборами — пары тона не ложатся на неё')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('reinstall with --force keeps the site data: the published look, the draft, the fonts, the environment', () => {
  const root = mkdtempSync(join(tmpdir(), 'look-data-'))
  const dir = join(root, 'site')
  try {
    assert.equal(install('--storefront', dir).status, 0)
    const look = JSON.parse(read(dir, 'lib/source/sample/look.json'))
    look.card = 'outlined'
    look.vars['--wrap'] = '1600px'
    look.names.width = '1600'
    look.names.card = 'outlined'
    const data = {
      'lib/source/sample/look.json': JSON.stringify(look, null, 2) + '\n',
      'lib/source/sample/look.draft.json': JSON.stringify({ ...look, card: 'bare' }, null, 2) + '\n',
      'public/fonts/manrope-latin-400.woff2': 'woff2',
      '.env': 'LOOK_PICKER=on\nREVALIDATE_SECRET=s\n',
    }
    mkdirSync(join(dir, 'public/fonts'), { recursive: true })
    for (const [p, text] of Object.entries(data)) writeFileSync(join(dir, p), text)
    const again = install('--storefront', '--force', dir)
    assert.equal(again.status, 0, again.stderr)
    for (const [p, text] of Object.entries(data)) assert.equal(read(dir, p), text, `${p} — как было`)
    assert.match(again.stdout, /данные сайта оставлены как были/)
    assert.match(read(dir, 'styles/scale.css'), /--wrap: 1600px;/, 'стили — из опубликованного вида, не из умолчания')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('the panel palette builder is the kit engine: same files, and the 7 kit sets come out as the kit palette writes them', async () => {
  const root = mkdtempSync(join(tmpdir(), 'look-engine-'))
  const dir = join(root, 'site')
  try {
    assert.equal(install('--storefront', dir).status, 0)
    const from = join(KIT, 'skills/site-building/assets/studio/engine')
    for (const f of ['palette.mjs', 'thresholds.mjs', 'palette-profile.json']) assert.equal(hash(join(dir, 'look-panel/ui/engine', f)), hash(join(from, f)), `ui/engine/${f} = движок набора`)
    const { paletteVars } = await import(pathToFileURL(join(dir, 'look-panel/ui/choice.mjs')).href)
    const sets = { ...JSON.parse(read(KIT, 'styles/palette.json')), ...JSON.parse(read(KIT, 'templates/palette.json')) }
    assert.equal(Object.keys(sets).length, 7)
    for (const [name, seed] of Object.entries(sets)) {
      const kit = Object.fromEntries([...toCss({ [name]: seed }).split('[data-palette=')[0].matchAll(/ {2}(--[\w-]+): ([^;]+);/g)].map((m) => [m[1], m[2]]))
      assert.deepEqual(paletteVars(seed), kit, `${name}: строитель панели = palette.css набора`)
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})
