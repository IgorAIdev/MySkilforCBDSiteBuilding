/**
 * Режим --storefront (план 1 витрины RO): новый сайт получает шаблон витрины
 * поверх основы набора и копии помощников Vendure и коммерции.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, mkdirSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const install = (...args) => spawnSync(process.execPath, [join(KIT, 'install.mjs'), ...args], { encoding: 'utf8' })

test('--storefront lays the template over the foundation and copies the kit helpers', () => {
  const root = mkdtempSync(join(tmpdir(), 'storefront-'))
  const dir = join(root, 'site')
  try {
    const r = install('--storefront', dir)
    assert.equal(r.status, 0, r.stderr)
    for (const f of ['app/[lang]/layout.tsx', 'app/[lang]/page.tsx', 'lib/locale.ts', 'next.config.ts', 'tsconfig.json',
      'styles/tokens.css', 'styles/btn.module.css', 'styles/icons.svg', 'CLAUDE.md', 'tools/check-css.mjs', 'tests/kit.test.ts',
      'lib/source/vendure/core/money.mjs', 'lib/source/vendure/core/search.mjs', 'lib/source/vendure/core/INTEGRATION.md',
      'lib/commerce/variant-selection.mjs', 'lib/commerce/VERCEL-LICENSE.md']) {
      assert.ok(existsSync(join(dir, f)), f)
    }
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    assert.ok(pkg.dependencies.next && pkg.dependencies.react, 'Next и React')
    assert.equal(pkg.scripts['check:css'], 'node tools/check-css.mjs', 'команды набора дописаны')
    assert.equal(pkg.scripts.test, 'node tools/check-test.mjs', 'тесты гоняет прогон набора')
    assert.equal(pkg.scripts.build, 'node scripts/copy-icons.mjs && node scripts/look-slots.mjs && next build', 'свой build шаблона остался')
    assert.match(readFileSync(join(dir, 'lib/locale.ts'), 'utf8'), /LOCALES = \['ro', 'en', 'hu'\]/)

    /* Этот файл сам гоняется `node --test`, и Node метит СЕБЯ переменной
       окружения `NODE_TEST_CONTEXT` — она наследуется дочерним процессом и
       ломает ЕГО собственный вложенный `node --test` внутри check-test.mjs:
       тот молча получает пустой вывод вместо тестового отчёта. Сайт,
       установленный по-настоящему, и `npm test`, запущенный человеком в его
       терминале, этой переменной не видят — она принадлежит только этой
       проверке проверки. */
    const env = { ...process.env }
    delete env.NODE_TEST_CONTEXT
    const tests = spawnSync(process.execPath, [join(dir, 'tools/check-test.mjs')], { cwd: dir, encoding: 'utf8', env })
    assert.equal(tests.status, 0, `npm test нового сайта красный:\n${tests.stdout.slice(-2000)}\n${tests.stderr.slice(-1000)}`)
    /* Тесты панели вида живут в её папке и уходят вместе с ней (И270). */
    const panel = spawnSync(process.execPath, [join(dir, 'tools/check-test.mjs'), 'look-panel/tests/*.test.ts'], { cwd: dir, encoding: 'utf8', env })
    assert.equal(panel.status, 0, `тесты панели вида красные:\n${panel.stdout.slice(-2000)}\n${panel.stderr.slice(-1000)}`)

    /* И260: демо-витрина, поставленная этим ключом, встретила владельца
       красным `check:rules` — таблица фактов палитры ехала собранной из
       образцов набора, а сайт стоит на стартовой. */
    const rules = spawnSync(process.execPath, [join(dir, 'tools/check-rules.mjs')], { cwd: dir, encoding: 'utf8' })
    assert.equal(rules.status, 0, `check:rules витрины красный:\n${rules.stdout}${rules.stderr}`)
    const list = spawnSync(process.execPath, [join(dir, 'tools/check-rules.mjs'), '--list'], { cwd: dir, encoding: 'utf8' })
    assert.equal(list.stdout.trim(), '', `check:rules витрины — расхождения под планкой:\n${list.stdout}`)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

/* Витрина набора стоит на решённом наборе цвета, а не на сером стартовом:
   решение «Латунь на угле» записано в docs/decisions.md набора, и витрина,
   поставленная без ключа, встречала владельца серой (23.09.2026). Названный
   ключом `--palette` набор по-прежнему сильнее умолчания.
   Витрина носит ОДИН вид (CLAUDE.md, «Панель настройки физически отделена
   от сайта»; И270): в её стилях — решённый набор цвета, первый стиль кнопки,
   первый набор ритма; весь каталог набора — у панели вида
   (look-panel/ui/catalog.json), опубликованный вид — умолчание каталога. */
test('--storefront installs one look in the site and the whole kit catalogue in the panel', async () => {
  const { roles } = await import('../tools/palette.mjs')
  const kitPalette = JSON.parse(readFileSync(join(KIT, 'styles/palette.json'), 'utf8'))
  const samples = JSON.parse(readFileSync(join(KIT, 'templates/palette.json'), 'utf8'))
  const kitButtons = JSON.parse(readFileSync(join(KIT, 'styles/buttons.json'), 'utf8'))
  const kitScales = JSON.parse(readFileSync(join(KIT, 'styles/scale.json'), 'utf8'))
  const root = mkdtempSync(join(tmpdir(), 'storefront-'))
  try {
    const plain = join(root, 'plain')
    const r = install('--storefront', plain)
    assert.equal(r.status, 0, r.stderr)
    const json = (p) => JSON.parse(readFileSync(join(plain, p), 'utf8'))
    const got = json('styles/palette.json')
    assert.deepEqual(got, kitPalette, 'краски — те, что решены в наборе, и только они')
    /* Стили сайта выпущены из опубликованного вида (И272): краски — те же
       ступени, что строитель считает из решённого набора. */
    const [name, seed] = Object.entries(got)[0]
    const light = roles(seed.light, 'light')
    const dark = roles(seed.dark, 'dark')
    const palette = readFileSync(join(plain, 'styles/palette.css'), 'utf8')
    for (const k of Object.keys(light)) assert.ok(palette.includes(`  ${k}: light-dark(${light[k]}, ${dark[k] ?? light[k]});`), `${name}: ${k}`)
    assert.equal(json('lib/source/sample/look.json').vars['--a-9'], `light-dark(${light['--a-9']}, ${dark['--a-9']})`, 'стили и опубликованный вид — одни значения')
    /* Кнопка — оси каталога (И273): сайт несёт первый вариант каждой оси. */
    for (const [axis, a] of Object.entries(json('styles/buttons.json'))) assert.deepEqual(Object.keys(a.варианты), [Object.keys(kitButtons[axis].варианты)[0]], `${axis}: один вариант`)
    assert.deepEqual(Object.keys(json('styles/scale.json')), [Object.keys(kitScales)[0]], 'один набор ритма')
    for (const [file, attr] of [['styles/palette.css', 'data-palette'], ['styles/buttons.css', 'data-button[\\w-]*'], ['styles/scale.css', 'data-scale']]) {
      const css = readFileSync(join(plain, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const names = new Set([...css.matchAll(new RegExp(`\\[${attr}="([^"]+)"\\]`, 'g'))].map((m) => m[1]))
      assert.equal(names.size, 0, `${file}: ${[...names].join(', ')} — набор под именем в стилях сайта`)
    }
    const catalog = json('look-panel/ui/catalog.json')
    const ids = (g) => catalog.groups[g].map((o) => o.id).sort()
    assert.deepEqual(ids('palette'), [...new Set([...Object.keys(kitPalette), ...Object.keys(samples)])].sort(), 'все палитры набора — у панели')
    for (const [axis, a] of Object.entries(kitButtons)) assert.deepEqual(ids(`btn-${axis}`), Object.keys(a.варианты).sort(), `${axis}: все варианты оси кнопки — у панели`)
    assert.deepEqual(ids('scale'), Object.keys(kitScales).sort(), 'все наборы ритма — у панели')
    /* Пары посчитаны — список может быть и пуст: наборы набора доведены
       строителем (И285), и сейчас каждое сочетание каталога носится. */
    assert.ok(Array.isArray(catalog.pairs), 'пары, которые не носятся, посчитаны')
    assert.match(readFileSync(join(plain, 'look-panel/PANEL.md'), 'utf8'), /<!-- pairs:start -->\n\| вариант \| не носится с \| почему \|\n\| --- \| --- \| --- \|\n\|/, 'список пар — в PANEL.md')
    /* Карта товара (И278): три ручки — группы каталога, умолчание — значение сайта. */
    for (const [g, id] of [['pdp-gallery', '50'], ['shot-frame', 'square'], ['shelf-cols', '4'], ['pdp-thumbs', 'below']]) assert.equal(catalog.defaults[g], id, g)
    assert.deepEqual(json('lib/source/sample/look.json').names, catalog.defaults, 'опубликован вид по умолчанию')

    const named = join(root, 'named')
    const n = install('--storefront', '--palette', 'Олива', named)
    assert.equal(n.status, 0, n.stderr)
    assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(named, 'styles/palette.json'), 'utf8'))), ['Олива'])
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('--storefront is only for a new site', () => {
  const r = install('--storefront', '--update', join(tmpdir(), 'storefront-nope'))
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /не смешивается/)
})

test('--storefront refuses a non-empty folder: a create-next-app project keeps its package.json', () => {
  /* Проектных файлов набора у такого проекта нет ни одного — прежняя
     проверка его пропускала, и шаблон затирал package.json (зависимости),
     tsconfig.json, next.config.ts, а app/[lang] ложился рядом с его
     app/layout.tsx. */
  const root = mkdtempSync(join(tmpdir(), 'storefront-'))
  const dir = join(root, 'my-next-app')
  try {
    const pkg = JSON.stringify({ name: 'my-next-app', dependencies: { next: '15.0.0', zod: '^3.23.0' } }, null, 2) + '\n'
    mkdirSync(join(dir, 'app'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), pkg)
    writeFileSync(join(dir, 'app/layout.tsx'), 'export default function RootLayout({ children }) { return children }\n')
    writeFileSync(join(dir, 'next.config.ts'), 'export default {}\n')
    const r = install('--storefront', dir)
    assert.notEqual(r.status, 0, 'непустая папка без --force принята')
    assert.ok(r.stderr.includes(dir), `в отказе нет папки:\n${r.stderr}`)
    assert.match(r.stderr, /не пуста/)
    assert.match(r.stderr, /package\.json/)
    assert.match(r.stderr, /--force/)
    assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), pkg, 'package.json проекта изменён')
    assert.ok(!existsSync(join(dir, 'app/[lang]')), 'шаблон лёг в чужое приложение')
    assert.ok(!existsSync(join(dir, 'CLAUDE.md')), 'отказ после записи, а не до неё')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('--storefront writes the server-build CI, not the static one', () => {
  const root = mkdtempSync(join(tmpdir(), 'storefront-'))
  const dir = join(root, 'site')
  try {
    const r = install('--storefront', dir)
    assert.equal(r.status, 0, r.stderr)
    const ci = readFileSync(join(dir, '.github/workflows/check.yml'), 'utf8')
    assert.equal(ci, readFileSync(join(KIT, 'templates/check-storefront.yml'), 'utf8'))
    assert.match(ci, /node-version: '24'/)
    assert.match(ci, /npm run start &/)
    assert.match(ci, /SITE=http:\/\/localhost:3020 npm run check:urls/)
    assert.match(ci, /SITE=http:\/\/localhost:3020 npm run check:seo/)
    assert.match(ci, /SITE=http:\/\/localhost:3020 npm run check:craft/)
    assert.match(ci, /if \[ -f package-lock\.json \]; then npm ci; else npm install --no-audit --no-fund; fi/)
    assert.match(ci, /^on:\n {2}pull_request:\n/m, 'только на PR')
    assert.match(ci, /cancel-in-progress: true/)
    /* Ни шага по выгрузке: у серверной сборки её нет. Комментарии,
       объясняющие почему, — не шаги. */
    const steps = ci.split('\n').filter((l) => /^\s*- (run|uses):/.test(l))
    assert.ok(steps.every((l) => !/\bout\//.test(l)), steps.join('\n'))
    assert.ok(steps.every((l) => !/npm run serve/.test(l)), 'раздача out/ вместо next start')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

/* Образец открывается по-английски (24.09.2026); настоящий магазин рынка
   ставит свой язык основным ключом `--lang`: он же адрес корня и x-default. */
test('--storefront opens in English; --lang ro makes Romanian the main language', () => {
  const root = mkdtempSync(join(tmpdir(), 'storefront-'))
  try {
    const plain = join(root, 'plain')
    assert.equal(install('--storefront', plain).status, 0)
    assert.match(readFileSync(join(plain, 'lib/locale.ts'), 'utf8'), /DEFAULT_LANG: Lang = 'en'/)
    assert.match(readFileSync(join(plain, 'next.config.ts'), 'utf8'), /destination: '\/en'/)
    const ro = join(root, 'ro')
    const r = install('--storefront', '--lang', 'ro', ro)
    assert.equal(r.status, 0, r.stderr)
    assert.match(readFileSync(join(ro, 'lib/locale.ts'), 'utf8'), /DEFAULT_LANG: Lang = 'ro'/)
    assert.match(readFileSync(join(ro, 'next.config.ts'), 'utf8'), /destination: '\/ro'/)
    assert.notEqual(install('--storefront', '--lang', 'bg', join(root, 'bg')).status, 0, 'языка нет в LOCALES')
    assert.notEqual(install('--lang', 'ro', join(root, 'bare')).status, 0, 'без --storefront')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

/* Переустановка витрины (`--storefront --force`) снимает то, что шаблон
   перестал везти (И340), и не трогает ничего сайтового: данные, свои
   файлы, файлы шаблона, которые сайт поправил, и базы храповиков (И341).
   «Шаблон, который уронил файл», — копия набора: между двумя постановками
   из её шаблона убраны три файла. */
const copyTree = (from, to) => {
  if (statSync(from).isDirectory()) {
    mkdirSync(to, { recursive: true })
    for (const name of readdirSync(from)) copyTree(join(from, name), join(to, name))
  } else copyFileSync(from, to)
}
const HEAVY = new Set(['research', 'elements', 'selftest', 'node_modules', ['.', 'git'].join('')])
test('--storefront --force removes what the template dropped, and keeps site data, site files, site edits and site baselines', () => {
  const root = mkdtempSync(join(tmpdir(), 'storefront-drop-'))
  const kit = join(root, 'kit')
  const dir = join(root, 'site')
  try {
    for (const name of readdirSync(KIT)) if (!HEAVY.has(name)) copyTree(join(KIT, name), join(kit, name))
    const T = join(kit, 'templates/storefront')
    const fromKit = (...args) => spawnSync(process.execPath, [join(kit, 'install.mjs'), ...args], { encoding: 'utf8' })
    const read = (p) => readFileSync(join(dir, p), 'utf8')
    mkdirSync(join(T, 'app/[lang]/gone'), { recursive: true })
    writeFileSync(join(T, 'app/[lang]/gone/page.tsx'), 'export default function Gone() { return null }\n')
    writeFileSync(join(T, 'components/Dropped.tsx'), 'export const Dropped = () => null\n')
    writeFileSync(join(T, 'lib/edited.ts'), 'export const edited = 1\n')

    const first = fromKit('--storefront', dir)
    assert.equal(first.status, 0, first.stderr)
    const record = JSON.parse(read('.site-kit-install.json'))
    for (const f of ['app/[lang]/gone/page.tsx', 'components/Dropped.tsx', 'lib/edited.ts', 'app/[lang]/layout.tsx', 'lib/source/vendure/core/money.mjs']) {
      assert.match(record.template[f] ?? '', /^[0-9a-f]{64}$/, `в записи ставщика нет ${f}`)
    }
    assert.ok(!Object.keys(record.template).some((f) => /^(lib\/source\/sample\/look|public\/fonts|\.env$)/.test(f)), 'данные сайта попали в список файлов шаблона')
    assert.match(first.stdout, /записаны в \.site-kit-install\.json впервые/)

    /* Сайт живёт: свой файл, свои данные, правка файла шаблона, свой долг,
       типы прошлого next dev; одной базы нет вовсе. */
    const own = {
      'components/Mine.tsx': 'export const Mine = () => null\n',
      'lib/edited.ts': 'export const edited = 2 // сайт поправил\n',
      '.env': 'LOOK_PICKER=on\nREVALIDATE_SECRET=s\n',
      'public/fonts/manrope-latin-400.woff2': 'woff2',
      'lib/source/sample/look.draft.json': read('lib/source/sample/look.json').replace('"header"', '"header" '),
      'tools/css-baseline.json': JSON.stringify({ ...JSON.parse(read('tools/css-baseline.json')), fontPx: 3 }, null, 2) + '\n',
      'tools/craft-baseline.json': JSON.stringify({ ...JSON.parse(read('tools/craft-baseline.json')), contrast: 2 }, null, 2) + '\n',
      'tools/detect-baseline.json': JSON.stringify({ '/en': { firstScreen: 1 } }, null, 2) + '\n',
    }
    mkdirSync(join(dir, 'public/fonts'), { recursive: true })
    for (const [p, text] of Object.entries(own)) writeFileSync(join(dir, p), text)
    const look = read('lib/source/sample/look.json')
    rmSync(join(dir, 'tools/design-baseline.json'))
    mkdirSync(join(dir, '.next/dev/types'), { recursive: true })
    writeFileSync(join(dir, '.next/dev/types/routes.d.ts'), '// про /[lang]/gone\n')

    /* Шаблон роняет три файла. */
    rmSync(join(T, 'app/[lang]/gone'), { recursive: true })
    rmSync(join(T, 'components/Dropped.tsx'))
    rmSync(join(T, 'lib/edited.ts'))
    const again = fromKit('--storefront', '--force', dir)
    assert.equal(again.status, 0, again.stderr)

    assert.ok(!existsSync(join(dir, 'components/Dropped.tsx')), 'файл, который шаблон перестал везти, остался')
    assert.ok(!existsSync(join(dir, 'app/[lang]/gone')), 'опустевшая папка маршрута осталась')
    assert.ok(!existsSync(join(dir, '.next/dev/types')), 'типы прошлого next dev о снятой странице остались')
    assert.match(again.stdout, /снято — шаблон этого больше не везёт/)
    for (const f of ['components/Dropped.tsx', 'app/[lang]/gone/page.tsx']) assert.ok(again.stdout.includes(f), `в отчёте не названо снятое: ${f}`)
    assert.match(again.stdout, /сайт это поправил — оставлено[\s\S]*lib\/edited\.ts/, 'поправленный сайтом файл не назван')
    for (const [p, text] of Object.entries(own)) assert.equal(read(p), text, `${p} — не как было`)
    assert.equal(read('lib/source/sample/look.json'), look, 'опубликованный вид тронут')
    assert.equal(read('tools/design-baseline.json'), readFileSync(join(kit, 'tools/design-baseline.json'), 'utf8'), 'недостающая база — не из набора')
    assert.match(again.stdout, /оставлены свои: [^\n]*tools[\\/]css-baseline\.json/, 'базы сайта не названы оставленными')

    const after = JSON.parse(read('.site-kit-install.json'))
    assert.ok(!('components/Dropped.tsx' in after.template) && !('lib/edited.ts' in after.template), 'снятое осталось в списке шаблона')
    assert.ok('app/[lang]/layout.tsx' in after.template)

    const third = fromKit('--storefront', '--force', dir)
    assert.equal(third.status, 0, third.stderr)
    assert.match(third.stdout, /снимать нечего/)
    assert.equal(read('lib/edited.ts'), own['lib/edited.ts'])
  } finally { rmSync(root, { recursive: true, force: true }) }
})

/* Любой из четырёх наборов ритма, поставленный витрине одним (`--scale`),
   проходит check:scale сайта: общие ступени ряда, которые просят только
   ушедшие в каталог наборы, оставшийся называет сам (И343). */
test('--storefront with any of the four scale sets passes the site check:scale', () => {
  const sets = JSON.parse(readFileSync(join(KIT, 'styles/scale.json'), 'utf8'))
  const root = mkdtempSync(join(tmpdir(), 'storefront-scale-'))
  try {
    for (const [i, name] of Object.keys(sets).entries()) {
      const dir = join(root, String(i))
      const r = install('--storefront', '--scale', name, dir)
      assert.equal(r.status, 0, r.stderr)
      const one = JSON.parse(readFileSync(join(dir, 'styles/scale.json'), 'utf8'))
      assert.deepEqual(Object.keys(one), [name])
      assert.deepEqual(Object.keys(one[name].ритм), Object.keys(sets[name].ритм), `${name}: ряд ступеней общий, у витрины тот же`)
      for (const [step, who] of Object.entries(one[name].каталог ?? {})) {
        for (const w of who) assert.ok(Object.keys(sets).includes(w.split(':')[0]) && w.split(':')[0] !== name, `${name}: ${step} — проситель «${w}» не из каталога`)
      }
      const scale = spawnSync(process.execPath, [join(dir, 'tools/check-scale.mjs')], { cwd: dir, encoding: 'utf8' })
      assert.equal(scale.status, 0, `${name}: check:scale сайта красный:\n${scale.stdout}${scale.stderr}`)
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})
