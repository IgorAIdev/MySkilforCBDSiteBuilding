import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deliveryTable } from '../lib/checkout-view.ts'
import { sampleCommerce } from '../lib/source/sample/commerce.ts'
import { sampleContent } from '../lib/source/sample/content.ts'
import { PAGES } from '../lib/pages.ts'
import DOCS from '../lib/docs.json' with { type: 'json' }

const NB = ' '

test('the delivery page table is the checkout list itself', async () => {
  const m = await sampleCommerce.deliveryMethods(null, 'ro')
  assert.ok(m.ok)
  const v = deliveryTable('ro', m.value)
  assert.deepEqual(v.head, ['Mod de livrare', 'Unde', 'Termen', 'Cost'])
  assert.deepEqual(v.rows.map((r) => [r.name, r.kind, r.days, r.price]), [
    ['Curier la domiciliu · FAN Courier', 'La adresă', '1–2 zile lucrătoare', `19,99${NB}lei`],
    ['Locker · Sameday', 'Punct de ridicare', '1–2 zile lucrătoare', `12,99${NB}lei`],
    ['Ridicare din magazin', 'Punct de ridicare', '—', 'Gratuit'],
  ])
  const doc = await sampleContent.doc('ro', 'livrare-si-plata')
  assert.ok(doc.ok)
  assert.equal(doc.value.table, 'delivery')
  const other = await sampleContent.doc('ro', 'retur')
  assert.ok(other.ok)
  assert.equal(other.value.table, null)
})

/* И261: сеть одной службы — не слово витрины. Имя службы живёт строкой
   данных способа доставки, а не в текстах главной и документов. */
test('sample texts name no carrier network', () => {
  assert.doesNotMatch(JSON.stringify(PAGES) + JSON.stringify(DOCS), /easybox/i)
})
