/**
 * Пробы «не найдено» из `tools/not-found.mjs` — то, чем `check:open`
 * решает, своя ли страница отвечает на несуществующий адрес и какого рода
 * этот адрес (И257).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { whyNotOwn, whyNotQuiet, docLang, matchesShape, missKind } from '../tools/not-found.mjs'

/* Ответы, которые сайты действительно отдают. Встроенная страница Next —
   дважды: без языка (витрина, у которой корневой макет — `[lang]`) и ВНУТРИ
   корневого макета сайта с `<html lang>` — обычное устройство Next, где язык
   у документа есть, а страница всё равно чужая. */
const BUILTIN = '<!DOCTYPE html><html><head><meta name="robots" content="noindex"/><title>404: This page could not be found.</title></head><body><h1 class="next-error-h1" style="display:inline-block">404</h1></body></html>'
const BUILTIN_IN_LAYOUT = '<!DOCTYPE html><html lang="bg"><head><meta name="robots" content="noindex"/><title>404: This page could not be found.</title></head><body><header>Магазин</header><div><h1 class="next-error-h1">404</h1><h2>This page could not be found.</h2></div></body></html>'
const SHELL = '<!DOCTYPE html><html id="__next_error__"><head><meta name="robots" content="noindex"/></head><body></body></html>'
const OWN = (lang) => `<!DOCTYPE html><html lang="${lang}"><head><meta name="robots" content="noindex"/><title>Pagina nu a fost găsită</title></head><body><main id="main"><h1>Pagina nu a fost găsită</h1></main></body></html>`

test('адрес мимо дерева: своя страница на языке адреса — причины нет', () => {
  assert.equal(whyNotOwn({ status: 404, html: OWN('ro'), lang: 'ro' }), '')
  assert.equal(whyNotOwn({ status: 404, html: OWN('hu-HU'), lang: 'hu' }), '')
  assert.equal(whyNotOwn({ status: 404, html: OWN('ro'), lang: '' }), '')
})

test('адрес мимо дерева: встроенная страница Next — чужая, даже с языком у документа', () => {
  assert.match(whyNotOwn({ status: 404, html: BUILTIN_IN_LAYOUT, lang: 'bg' }), /встроенная страница Next/)
  assert.match(whyNotOwn({ status: 404, html: BUILTIN, lang: 'ro' }), /встроенная страница Next/)
})

test('адрес мимо дерева: пустая страница ошибки, документ без языка, чужой язык, код не 404 — названы', () => {
  assert.match(whyNotOwn({ status: 404, html: SHELL, lang: 'ro' }), /__next_error__/)
  assert.match(whyNotOwn({ status: 404, html: '<html><body><main>Не найдено</main></body></html>', lang: 'ro' }), /нет языка/)
  assert.equal(whyNotOwn({ status: 404, html: OWN('ro'), lang: 'hu' }), 'язык документа «ro», а адрес на «hu»')
  assert.equal(whyNotOwn({ status: 200, html: OWN('ro'), lang: 'ro' }), 'код 200, а не 404')
})

test('промах данных: 404 с noindex — причины нет; без noindex или с 200 — названы', () => {
  assert.equal(whyNotQuiet({ status: 404, html: SHELL }), '')
  assert.equal(whyNotQuiet({ status: 404, html: '<html lang="ro"><head><meta content="noindex, nofollow" name="robots"></head></html>' }), '')
  assert.match(whyNotQuiet({ status: 404, html: '<html lang="ro"><head><title>x</title></head></html>' }), /noindex/)
  assert.match(whyNotQuiet({ status: 404, html: '<meta name="description" content="noindex is a word">' }), /noindex/)
  assert.equal(whyNotQuiet({ status: 200, html: SHELL }), 'код 200, а не 404')
})

test('род промаха решает дерево: язык — закрытый список, остальное — данные', () => {
  const tree = ['/[lang]', '/[lang]/catalog', '/[lang]/catalog/[cat]', '/[lang]/product/[id]', '/[lang]/search']
  const locales = ['ro', 'en', 'hu']
  assert.equal(missKind('/ro/product/__kit-missing__', tree, locales), 'data')
  assert.equal(missKind('/hu/catalog/nu-exista', tree, locales), 'data')
  assert.equal(missKind('/ro/__kit-missing__', tree, locales), 'stray')
  assert.equal(missKind('/__kit-missing__', tree, locales), 'stray')
  assert.equal(missKind('/contact', tree, locales), 'stray')
  assert.equal(missKind('/ro/a/b', tree, locales), 'stray')
  /* Страница-ловушка в дереве — адрес под языком становится промахом данных. */
  assert.equal(missKind('/ro/__kit-missing__', [...tree, '/[lang]/[slug]'], locales), 'data')
})

test('форма маршрута: доменная витрина, ловушки, запрос в адресе', () => {
  assert.equal(matchesShape('/product/x', '/[locale]/product/[id]', ['bg', 'en']), true)
  assert.equal(matchesShape('/en/product/x', '/[locale]/product/[id]', ['bg', 'en']), true)
  assert.equal(matchesShape('/de/product/x', '/[locale]/product/[id]', ['bg', 'en']), false)
  assert.equal(matchesShape('/docs/a/b', '/docs/[...slug]', []), true)
  assert.equal(matchesShape('/docs', '/docs/[...slug]', []), false)
  assert.equal(matchesShape('/docs', '/docs/[[...slug]]', []), true)
  assert.equal(matchesShape('/ro/catalog?page=abc', '/[lang]/catalog', ['ro']), true)
})

test('язык документа читается с <html>, без региона', () => {
  assert.equal(docLang('<html lang="en-GB" class="x">'), 'en')
  assert.equal(docLang(BUILTIN), '')
})
