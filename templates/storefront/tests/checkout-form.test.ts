import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseContact, parseAddress } from '../lib/checkout-form.ts'

const form = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}
const good = { email: ' ana@example.com ', firstName: 'Ana', lastName: 'Popescu', phone: '+40 (722) 123-456' }

test('contact: a good form gives trimmed values', () => {
  assert.deepEqual(parseContact('ro', form(good)), { ok: true, value: { email: 'ana@example.com', firstName: 'Ana', lastName: 'Popescu', phone: '+40 (722) 123-456' } })
})

test('contact: every error sits at its field and says what to do; what was typed comes back', () => {
  const r = parseContact('ro', form({ email: '', firstName: '', lastName: 'Popescu', phone: '' }))
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.deepEqual(r.errors, {
    email: 'Introduceți adresa de e-mail pentru a primi confirmarea comenzii.',
    firstName: 'Completați câmpul pentru a continua.',
    phone: 'Introduceți numărul de telefon, de exemplu 0722 123 456.',
  })
  assert.equal(r.values.lastName, 'Popescu')
  const shape = parseContact('en', form({ ...good, email: 'ana@', phone: '12' }))
  assert.ok(!shape.ok)
  assert.equal(shape.errors.email, 'The email looks incomplete, e.g. name@example.com.')
  assert.equal(shape.errors.phone, 'Enter your phone number, e.g. 0722 123 456.')
  const long = parseContact('ro', form({ ...good, firstName: 'A'.repeat(61) }))
  assert.ok(!long.ok)
  assert.equal(long.errors.firstName, 'Scurtați textul la cel mult 60 caractere.')
})

test('address: the market’s postcode pattern, spaces forgiven, country from the market', () => {
  const ok = parseAddress('ro', form({ street: 'Str. Exemplului 1', city: 'București', region: 'București', postalCode: '010 011' }))
  assert.deepEqual(ok, { ok: true, value: { street: 'Str. Exemplului 1', city: 'București', region: 'București', postalCode: '010011', country: 'RO' } })
  const bad = parseAddress('ro', form({ street: 'S 1', city: 'C', region: 'R', postalCode: '01001' }))
  assert.ok(!bad.ok)
  assert.deepEqual(bad.errors, { postalCode: 'Verificați codul poștal, de exemplu 010011.' })
})
