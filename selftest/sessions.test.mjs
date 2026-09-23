import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sessionUrls, sessionOf } from '../tools/sessions.mjs'

const langs = (shape) => ['ro', 'hu'].map((l) => shape.replace('[lang]', l))

test('sessions: every personal shape opens full, per language, with its own query', () => {
  const pages = { '/[lang]/cart': ['sample-cart'], '/[lang]/checkout/delivery': ['sample-contact', 'sample-pickup?city=Bucure%C8%99ti'] }
  assert.deepEqual(sessionUrls(pages, langs), [
    '/ro/cart#as=sample-cart',
    '/hu/cart#as=sample-cart',
    '/ro/checkout/delivery#as=sample-contact',
    '/ro/checkout/delivery?city=Bucure%C8%99ti#as=sample-pickup',
    '/hu/checkout/delivery#as=sample-contact',
    '/hu/checkout/delivery?city=Bucure%C8%99ti#as=sample-pickup',
  ])
})

test('sessions: the tail becomes a cookie header and never reaches the server', () => {
  assert.deepEqual(sessionOf('/ro/checkout/delivery?city=X#as=sample-pickup', 'shop_session'), { path: '/ro/checkout/delivery?city=X', cookie: 'shop_session=sample-pickup' })
  assert.deepEqual(sessionOf('/ro/cart', 'shop_session'), { path: '/ro/cart', cookie: null })
  assert.deepEqual(sessionOf('/ro/cart#as=sample-cart', null), { path: '/ro/cart', cookie: null })
})
