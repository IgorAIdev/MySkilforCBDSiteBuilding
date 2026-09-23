import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RO } from '../lib/i18n/ro.ts'
import { EN } from '../lib/i18n/en.ts'
import { HU } from '../lib/i18n/hu.ts'
import { t, tn } from '../lib/i18n/index.ts'
import { auditWords } from '../tools/words.mjs'

test('every language has every key, and no key is empty', () => {
  const keys = Object.keys(RO).sort()
  for (const [name, dict] of Object.entries({ EN, HU })) {
    assert.deepEqual(Object.keys(dict).sort(), keys, name)
    for (const [k, v] of Object.entries(dict)) assert.ok(String(v).trim(), `${name}.${k}`)
  }
})

test('placeholders are filled and a missing variable is loud', () => {
  assert.equal(t('ro', 'product.from', { price: '9,90 lei' }), 'de la 9,90 lei')
  assert.throws(() => t('ro', 'product.from'), /price/)
})

test('counts follow the plural rules of the language', () => {
  assert.equal(tn('ro', 'catalog.count', 1), '1 produs')
  assert.equal(tn('ro', 'catalog.count', 12), '12 produse')
  assert.equal(tn('ro', 'catalog.count', 20), '20 de produse')
  assert.equal(tn('en', 'catalog.count', 1), '1 product')
  assert.equal(tn('hu', 'catalog.count', 7), '7 termék')
})

test('Romanian uses comma-below ș ț, never cedilla ş ţ', () => {
  assert.doesNotMatch(JSON.stringify(RO), /[\u015E\u015F\u0162\u0163]/)
})

test('the storefront words dictionary is well-formed', () => {
  assert.deepEqual(auditWords(readFileSync(new URL('../docs/words.md', import.meta.url), 'utf8')), [])
})
