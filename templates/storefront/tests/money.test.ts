import { test } from 'node:test'
import assert from 'node:assert/strict'
import { money } from '../lib/money.ts'
import { intlLocale, MARKET } from '../lib/market.ts'

/* Валюта образца — евро (24.09.2026); запись числа — язык страницы через
   `Intl`, одной функцией: по-английски «€29.90», по-румынски и
   по-венгерски «29,90 €». Магазин, вернувший леи ключом `--currency RON`,
   читает их по-румынски той же функцией. */
test('prices read the way each language writes them', () => {
  assert.equal(MARKET.currency, 'EUR')
  assert.equal(intlLocale('hu'), 'hu-RO')
  assert.equal(money({ minor: 2990, currency: 'EUR' }, 'en'), '€29.90')
  assert.equal(money({ minor: 2990, currency: 'EUR' }, 'ro'), '29,90 €')
  assert.equal(money({ minor: 2990, currency: 'EUR' }, 'hu'), '29,90 €')
  assert.equal(money({ minor: 0, currency: 'EUR' }, 'en'), '€0.00')
  assert.equal(money({ minor: 2990, currency: 'RON' }, 'ro'), '29,90 lei')
  assert.throws(() => money({ minor: 29.9, currency: 'EUR' }, 'ro'), /integer/)
})
