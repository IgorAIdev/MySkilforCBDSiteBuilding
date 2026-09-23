import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { readSelection, pickState, optionLinks } from '../lib/variant.ts'

test('the variant is chosen by the address and is exact or named as missing', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const product = r.value
  assert.deepEqual(readSelection({ 'option.putere': '10', 'option.volum': '30', 'option.nimic': 'x' }, product), { putere: '10', volum: '30' })
  assert.equal(pickState(product, { putere: '10', volum: '30' }).variant?.sku, 'UF-10-30')
  assert.equal(pickState(product, { putere: '10', volum: '30' }).status, 'ready')
  assert.equal(pickState(product, { putere: '30', volum: '10' }).status, 'unavailable')
  assert.equal(pickState(product, { putere: '5', volum: '30' }).status, 'missing')
  assert.equal(pickState(product, { putere: '10' }).status, 'incomplete')
  assert.equal(pickState(product, { putere: '99', volum: '10' }).status, 'invalid')
})

test('a single-variant product is ready without a choice', async () => {
  const r = await sample.product('ro', 'capsule-cbd-10')
  assert.ok(r.ok)
  assert.equal(pickState(r.value, {}).status, 'ready')
})

test('option links: a combination that does not exist has no address, an out-of-stock one has', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const [putere, volum] = optionLinks('ro', r.value, { putere: '5' })
  assert.equal(volum.options.find((o) => o.code === '30')?.href, null)
  assert.equal(volum.options.find((o) => o.code === '10')?.href, '/ro/product/ulei-cbd-full-spectrum?option.putere=5&option.volum=10')
  assert.equal(putere.options.find((o) => o.code === '5')?.current, true)
  const [strength] = optionLinks('ro', r.value, { volum: '10' })
  assert.ok(strength.options.find((o) => o.code === '30')?.href, 'нет в наличии — адрес есть, страница скажет')
  const [, afterJunk] = optionLinks('ro', r.value, { putere: '99' })
  assert.ok(afterJunk.options.every((o) => o.href), 'мусор в адресе не запирает выбор')
})
