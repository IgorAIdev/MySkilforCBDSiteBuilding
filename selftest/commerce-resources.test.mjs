import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inspectSelection, isOptionAvailable, withOption } from '../skills/site-building/assets/commerce/variant-selection.mjs'
import { getPaginationVariables, resetPagination } from '../skills/site-building/assets/commerce/pagination.mjs'
import { cacheControl } from '../skills/site-building/assets/commerce/cache-policy.mjs'
import { parseOptionValueIds } from '../skills/site-building/assets/commerce/option-filters.mjs'
import { createMutationLane } from '../skills/site-building/assets/commerce/mutation-lane.mjs'

const options = [{ id: 'size', values: ['S', 'L'] }, { id: 'color', values: ['red', 'blue'] }]
const variants = [{ id: '1', available: true, options: { size: 'S', color: 'red' } }, { id: '2', available: false, options: { size: 'L', color: 'red' } }]
test('variant combination requires a complete valid unambiguous selection', () => {
  for (const [selected, status] of [[{}, 'incomplete'], [{ size: 'S', color: 'red' }, 'ready'], [{ size: 'L', color: 'red' }, 'unavailable'], [{ size: 'S', color: 'blue' }, 'missing'], [{ size: 'fake' }, 'invalid']]) {
    assert.equal(inspectSelection(options, variants, selected).status, status)
  }
  assert.equal(inspectSelection(options, [...variants, { ...variants[0], id: '3' }], variants[0].options).status, 'ambiguous')
  assert.throws(() => inspectSelection(options, [...variants, variants[0]], {}), /Duplicate/)
  assert.equal(isOptionAvailable(options, variants, { size: 'S' }, 'color', 'red'), true)
  assert.equal(isOptionAvailable(options, variants, { size: 'L' }, 'color', 'red'), false)
  assert.equal(isOptionAvailable(options, variants, { size: 'fake' }, 'color', 'red'), false)
  assert.equal(withOption('utm_source=mail&sort=price', 'size', 'L').get('utm_source'), 'mail')
})
test('pagination scopes multiple lists and retains filters on reset', () => {
  const request = new Request('https://shop.test/?catalog_cursor=abc&catalog_direction=previous&other_cursor=xyz&sort=price')
  assert.deepEqual(getPaginationVariables(request, { pageBy: 10, namespace: 'catalog' }), { last: 10, startCursor: 'abc' })
  assert.deepEqual(getPaginationVariables(request), { first: 20, endCursor: null })
  const reset = resetPagination(new URL(request.url).search, ['catalog'])
  assert.equal(reset.get('other_cursor'), 'xyz')
  assert.equal(reset.get('sort'), 'price')
  assert.equal(reset.has('catalog_cursor'), false)
  for (const pageBy of [0, -1, 1.5, Infinity, 101]) assert.throws(() => getPaginationVariables(request, { pageBy }), /size/)
})
test('cache is opt-in public; session failure, personalized read and mutations never become public', () => {
  assert.equal(cacheControl(), 'private, no-store')
  for (const audience of ['personal', 'unavailable', 'unknown']) assert.equal(cacheControl({ audience, policy: { mode: 'public', maxAge: 30 } }), 'private, no-store')
  assert.equal(cacheControl({ method: 'POST', audience: 'public' }), 'private, no-store')
  assert.equal(cacheControl({ audience: 'public', policy: { mode: 'public', maxAge: 10, staleWhileRevalidate: 20 } }), 'public, max-age=10, stale-while-revalidate=20')
  for (const policy of [{}, { mode: 'public' }, { mode: 'public', maxAge: -1 }, { mode: 'public', maxAge: 0, injected: '\r\n' }]) assert.throws(() => cacheControl({ audience: 'public', policy }))
})
test('repeated and comma-separated filter values normalize consistently', () => {
  assert.deepEqual(parseOptionValueIds(new URLSearchParams('optionValueIds=a&optionValueIds=b,a&optionValueIds=')), ['a', 'b'])
  assert.deepEqual(parseOptionValueIds({ optionValueIds: [' a,b ', 'b', undefined] }), ['a', 'b'])
  assert.deepEqual(parseOptionValueIds({ optionValueIds: 'a,a,b' }), ['a', 'b'])
  assert.deepEqual(parseOptionValueIds(null), [])
})
test('mutation failure unlocks lane, overlapping writes are rejected, no automatic replay', async () => {
  const lane = createMutationLane()
  let finish
  const work = lane.run(() => new Promise(resolve => { finish = resolve }))
  assert.equal(lane.pending, true)
  await assert.rejects(lane.run(() => 'duplicate'), /pending/)
  finish({ revision: 2, total: '0' })
  assert.deepEqual(await work, { revision: 2, total: '0' })
  assert.equal(lane.pending, false)
  let attempts = 0
  await assert.rejects(lane.run(() => { attempts++; throw new Error('source unavailable') }), /unavailable/)
  assert.equal(attempts, 1)
  assert.equal(lane.pending, false)
  assert.equal(await lane.run(() => 0), 0)
})
test('hanging write frees the lane with outcome unknown and aborts the request; renderers are notified', async () => {
  const lane = createMutationLane({ timeoutMs: 20 })
  const seen = []
  const off = lane.subscribe(() => seen.push(lane.pending))
  let aborted = false
  const hang = lane.run((signal) => new Promise(() => { signal.addEventListener('abort', () => { aborted = true }) }))
  await assert.rejects(hang, (error) => error.name === 'MutationTimeout' && error.outcome === 'unknown')
  assert.equal(aborted, true)
  assert.equal(lane.pending, false)
  assert.deepEqual(seen, [true, false])
  off()
  await lane.run(() => 1)
  assert.deepEqual(seen, [true, false])
  assert.throws(() => createMutationLane({ timeoutMs: 0 }), /timeoutMs/)
})
test('unawaited Next searchParams fail loudly instead of reading as no filters', () => {
  assert.throws(() => parseOptionValueIds(Promise.resolve({ optionValueIds: 'a' })), /Await/)
})
