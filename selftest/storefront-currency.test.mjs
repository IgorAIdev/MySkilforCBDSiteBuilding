/**
 * Валюта витрины (24.09.2026): образец торгует в евро, магазин рынка ставит
 * свою ключом `--currency` — так же, как язык ключом `--lang`. Место валюты
 * одно — строка `currency` в lib/market.ts; её и переписывает ставщик.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const install = (...args) => spawnSync(process.execPath, [join(KIT, 'install.mjs'), ...args], { encoding: 'utf8' })
const currencyOf = (dir) => readFileSync(join(dir, 'lib/market.ts'), 'utf8').match(/currency: '([A-Z]{3})'/)?.[1]

test('--storefront sells in euros; --currency RON puts lei back, and only as an ISO code with the storefront', () => {
  const root = mkdtempSync(join(tmpdir(), 'storefront-'))
  try {
    const plain = join(root, 'plain')
    assert.equal(install('--storefront', plain).status, 0)
    assert.equal(currencyOf(plain), 'EUR')
    const ro = join(root, 'ro')
    const r = install('--storefront', '--lang', 'ro', '--currency', 'RON', ro)
    assert.equal(r.status, 0, r.stderr)
    assert.equal(currencyOf(ro), 'RON')
    assert.match(readFileSync(join(ro, 'lib/locale.ts'), 'utf8'), /DEFAULT_LANG: Lang = 'ro'/, 'ключи не мешают друг другу')
    assert.notEqual(install('--storefront', '--currency', 'lei', join(root, 'bad')).status, 0, 'не код ISO 4217')
    assert.notEqual(install('--currency', 'RON', join(root, 'bare')).status, 0, 'без --storefront')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
