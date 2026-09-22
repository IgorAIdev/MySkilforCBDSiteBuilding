/**
 * Режим --storefront (план 1 витрины RO): новый сайт получает шаблон витрины
 * поверх основы набора и копии помощников Vendure и коммерции.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
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
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('--storefront is only for a new site', () => {
  const r = install('--storefront', '--update', join(tmpdir(), 'storefront-nope'))
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /--storefront/)
})
