/**
 * Вес снимка меряется у растра, не у вектора (И264).
 *
 * Дефект: приёмка плана 2 витрины. Образец рисует товар SVG, и семья
 * `weight` у миниатюры строки корзины записала «150px в 38px, ×3.9» —
 * двадцать шесть находок: `naturalWidth` у SVG без своих размеров — 150 по
 * умолчанию, а не отданные пиксели.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { VECTOR } from '../tools/craft-families.mjs'

const svg = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3C%2Fsvg%3E'

test('weight: vector sources are recognised — file, query, fragment, data URI in either encoding', () => {
  for (const src of [
    svg,
    'data:image/svg+xml;base64,PHN2Zy8+',
    'DATA:IMAGE/SVG+XML;utf8,<svg/>',
    'https://shop.example/media/bottle.svg',
    'https://shop.example/media/bottle.SVG?v=3',
    '/media/bottle.svg#view',
  ]) assert.ok(VECTOR.test(src), src)
})

test('weight: raster sources stay measured, even with «svg» elsewhere in the address', () => {
  for (const src of [
    'https://shop.example/media/bottle.png',
    'https://shop.example/svg/bottle.webp',
    'https://shop.example/media/bottle.svg.jpg',
    'https://shop.example/media/svg-bottle.avif?w=800',
    'data:image/png;base64,iVBORw0KGgo=',
    'data:image/svg-like;base64,AAAA',
  ]) assert.ok(!VECTOR.test(src), src)
})

/* Адрес на .svg, который CDN отдаёт растром по параметру формата (`fm` —
   imgix, Contentful, Sanity; `format` — Shopify, Cloudflare), — не вектор:
   пиксели отданы, и вес меряется. `format=svg`, чужие параметры и `fm=` в
   хвосте после `#` вектор не отменяют. */
test('weight: an .svg address rasterised by a CDN format parameter is measured', () => {
  for (const src of [
    'https://cdn.example/media/bottle.svg?fm=png',
    'https://cdn.example/media/bottle.svg?w=400&fm=webp',
    'https://cdn.example/media/bottle.svg?format=jpg&w=80',
    'https://cdn.example/media/bottle.SVG?auto=compress&FORMAT=avif#top',
  ]) assert.ok(!VECTOR.test(src), src)
  for (const src of [
    'https://cdn.example/media/bottle.svg?format=svg',
    'https://cdn.example/media/bottle.svg?w=400&fmt=1',
    'https://cdn.example/media/bottle.svg?v=3#fm=png',
  ]) assert.ok(VECTOR.test(src), src)
})

test('weight: the page-side measure receives the vector pattern and skips it before comparing sizes', () => {
  const src = readFileSync(fileURLToPath(new URL('../tools/check-craft.mjs', import.meta.url)), 'utf8')
  assert.match(src, /vector: VECTOR\.source/, 'the pattern travels into page.evaluate as a string')
  const loop = src.slice(src.indexOf('for (const img of document.images)'))
  const head = loop.slice(0, loop.indexOf('\n', loop.indexOf('\n') + 1))
  assert.match(head, /isVector\.test\(img\.currentSrc\)/, 'the first guard of the weight loop skips vectors')
})
