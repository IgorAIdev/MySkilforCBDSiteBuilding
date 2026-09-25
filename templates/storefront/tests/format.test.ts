import { test } from 'node:test'
import assert from 'node:assert/strict'
import { num, percent, numberLocale } from '../lib/format.ts'
import { money } from '../lib/money.ts'
import { factsLine } from '../lib/facts.ts'
import { labView } from '../lib/product-view.ts'
import { intlLocale } from '../lib/market.ts'
import { sample } from '../lib/source/sample/catalog.ts'
import type { Lang } from '../lib/locale.ts'

const NB = ' '

/* Запись числа — по языку страницы, одной функцией (И347). Английская
   страница печатала «2,5 %» и «10,2 %» по-румынски: число писалось тегом
   рынка `en-RO`, у которого `Intl` пишет дробь по-румынски, а цену
   по-английски. */
test('a number is written the way the page language writes it', () => {
  assert.equal(numberLocale('en'), 'en', 'язык страницы, без региона рынка')
  assert.equal(intlLocale('en'), 'en-RO', 'регион рынка остаётся датам, названиям и правилам числа слов')
  assert.equal(percent('en', 2.5), `2.5${NB}%`)
  assert.equal(percent('ro', 2.5), `2,5${NB}%`)
  assert.equal(percent('hu', 2.5), `2,5${NB}%`)
  assert.equal(percent('en', 10.2), `10.2${NB}%`)
  assert.equal(percent('en', 14.96, 0), `15${NB}%`)
  assert.equal(num('en', 12500), '12,500')
  assert.equal(num('ro', 12500), '12.500')
  assert.equal(num('hu', 12500), `12${NB}500`, 'венгерская разрядка — неразрывным пробелом')
  for (const lang of ['en', 'ro', 'hu'] as Lang[]) assert.equal(num(lang, 1000), '1000', `${lang}: четыре знака без разрядки, как на этикетке`)
})

/* Цена, строка фактов, грань «Сила» и протокол партии пишут число одной
   записью: на одной странице — одна десятичная запятая или одна точка. */
const WRITING: [Lang, string, string][] = [
  ['en', '.', '€1,234.50'],
  ['ro', ',', `1.234,50${NB}€`],
  ['hu', ',', `1234,50${NB}€`],
]
for (const [lang, dot, price] of WRITING) {
  test(`${lang}: money, the facts line, the strength facet and the lab figures share one writing`, async () => {
    const d = (x: string) => x.replace('.', dot)
    assert.equal(money({ minor: 123450, currency: 'EUR' }, lang), price)
    assert.equal(factsLine(lang, { strength: 'percent', packs: [{ mg: 250, size: 10, unit: 'ml' }] }), `${d('2.5')}${NB}%${NB}· 10${NB}ml${NB}· 250${NB}mg`)
    const listing = await sample.listing(lang, { facets: {}, sort: 'popular', page: null })
    assert.ok(listing.ok)
    const strength = listing.value.facets.find((f) => f.code === 'putere')
    assert.equal(strength?.values.find((v) => v.code === '2.5')?.name, `${d('2.5')}${NB}%`, 'значение грани — записью языка')
    const lab = labView(lang, { batch: 'RO-2409-10', lab: 'Lab', date: '2026-09-02', cbdPercent: 10.2, thcPercent: 0.15, url: '#' })
    assert.deepEqual(lab.rows.slice(2), [['CBD', `${d('10.2')}${NB}%`], ['THC', `${d('0.15')}${NB}%`]])
  })
}
