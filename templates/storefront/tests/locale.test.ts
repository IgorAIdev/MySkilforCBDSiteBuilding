import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LANG, langOfPath } from '../lib/locale.ts'

/* Язык адреса решает, на каком языке ответит «не найдено» (И257): и
   страница без макета (app/global-not-found.tsx через proxy.ts), и экран
   промаха данных после гидратации. */
test('language of an address is its first segment; anything else is the default', () => {
  assert.equal(langOfPath('/hu/a/b'), 'hu')
  assert.equal(langOfPath('/en'), 'en')
  assert.equal(langOfPath('/ro/product/nu-exista'), 'ro')
  assert.equal(langOfPath('/xx/yy'), DEFAULT_LANG)
  assert.equal(langOfPath('/contact'), DEFAULT_LANG)
  assert.equal(langOfPath('/'), DEFAULT_LANG)
  assert.equal(langOfPath(''), DEFAULT_LANG)
  assert.equal(langOfPath('/HU/a'), DEFAULT_LANG)
})
