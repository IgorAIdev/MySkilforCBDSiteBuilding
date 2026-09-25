import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readQuery } from '../lib/listing.ts'

test('the address says which facets, sort and page; junk sort falls back, the page stays raw for the source to judge', () => {
  assert.deepEqual(readQuery({ 'facet.forma': ['ulei', 'capsule'], sort: 'price-asc', page: '2' }), { facets: { forma: ['ulei', 'capsule'] }, sort: 'price-asc', page: '2' })
  assert.deepEqual(readQuery({ 'facet.putere': '10,20' }).facets, { putere: ['10', '20'] })
  assert.deepEqual(readQuery({ sort: 'cheap' }), { facets: {}, sort: 'popular', page: null })
  assert.equal(readQuery({ page: 'abc' }).page, 'abc')
})
