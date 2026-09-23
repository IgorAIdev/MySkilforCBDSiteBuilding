/**
 * Режим --storefront (план 1 витрины RO): новый сайт получает шаблон витрины
 * поверх основы набора и копии помощников Vendure и коммерции.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
    assert.equal(pkg.scripts.build, 'node scripts/copy-icons.mjs && next build', 'свой build шаблона остался')
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

    /* И260: демо-витрина, поставленная этим ключом, встретила владельца
       красным `check:rules` — таблица фактов палитры ехала собранной из
       образцов набора, а сайт стоит на стартовой. */
    const rules = spawnSync(process.execPath, [join(dir, 'tools/check-rules.mjs')], { cwd: dir, encoding: 'utf8' })
    assert.equal(rules.status, 0, `check:rules витрины красный:\n${rules.stdout}${rules.stderr}`)
    const list = spawnSync(process.execPath, [join(dir, 'tools/check-rules.mjs'), '--list'], { cwd: dir, encoding: 'utf8' })
    assert.equal(list.stdout.trim(), '', `check:rules витрины — расхождения под планкой:\n${list.stdout}`)
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
