import { test } from 'node:test'
import assert from 'node:assert/strict'
import { money } from '../lib/money.ts'
import { intlLocale, MARKET } from '../lib/market.ts'

test('prices read the Romanian way in every language', () => {
  assert.equal(MARKET.currency, 'RON')
  assert.equal(intlLocale('hu'), 'hu-RO')
  assert.equal(money({ minor: 2990, currency: 'RON' }, 'ro'), '29,90\u00a0lei')
  assert.equal(money({ minor: 0, currency: 'RON' }, 'en'), '0,00\u00a0lei')
  assert.throws(() => money({ minor: 29.9, currency: 'RON' }, 'ro'), /integer/)
})
