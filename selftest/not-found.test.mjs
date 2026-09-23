/**
 * Пробы «не найдено» из `tools/not-found.mjs` — то, чем `check:open`
 * решает, своя ли страница отвечает на несуществующий адрес (И257).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownNotFound, quietMiss, docLang } from '../tools/not-found.mjs'

/* Три ответа, которые витрина действительно отдавала или отдаёт. */
const BUILTIN = '<!DOCTYPE html><html><head><meta name="robots" content="noindex"/><title>404: This page could not be found.</title></head><body><h1 class="next-error-h1">404</h1></body></html>'
const SHELL = '<!DOCTYPE html><html id="__next_error__"><head><meta name="robots" content="noindex"/></head><body></body></html>'
const OWN = (lang) => `<!DOCTYPE html><html lang="${lang}"><head><meta name="robots" content="noindex"/><title>Pagina nu a fost găsită</title></head><body><main id="main"><h1>Pagina nu a fost găsită</h1></main></body></html>`

test('адрес мимо дерева: своя страница на языке адреса — да', () => {
  assert.equal(ownNotFound({ status: 404, html: OWN('ro'), lang: 'ro' }), true)
  assert.equal(ownNotFound({ status: 404, html: OWN('hu-HU'), lang: 'hu' }), true)
  assert.equal(ownNotFound({ status: 404, html: OWN('ro'), lang: '' }), true)
})

test('адрес мимо дерева: встроенная страница Next, пустая страница ошибки, чужой язык, 200 — нет', () => {
  assert.equal(ownNotFound({ status: 404, html: BUILTIN, lang: 'ro' }), false)
  assert.equal(ownNotFound({ status: 404, html: SHELL, lang: 'ro' }), false)
  assert.equal(ownNotFound({ status: 404, html: OWN('ro'), lang: 'hu' }), false)
  assert.equal(ownNotFound({ status: 200, html: OWN('ro'), lang: 'ro' }), false)
})

test('промах данных: 404 с noindex — да; без noindex или с 200 — нет', () => {
  assert.equal(quietMiss({ status: 404, html: SHELL }), true)
  assert.equal(quietMiss({ status: 404, html: '<html lang="ro"><head><meta content="noindex, nofollow" name="robots"></head></html>' }), true)
  assert.equal(quietMiss({ status: 404, html: '<html lang="ro"><head><title>x</title></head></html>' }), false)
  assert.equal(quietMiss({ status: 200, html: SHELL }), false)
  assert.equal(quietMiss({ status: 404, html: '<meta name="description" content="noindex is a word">' }), false)
})

test('язык документа читается с <html>, без региона', () => {
  assert.equal(docLang('<html lang="en-GB" class="x">'), 'en')
  assert.equal(docLang(BUILTIN), '')
})
