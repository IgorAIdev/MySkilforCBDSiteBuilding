import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toMetadata, siteUrlFrom } from '../lib/seo.ts'
import { DEFAULT_LANG } from '../lib/locale.ts'
import { productLd, breadcrumbLd } from '../lib/ld.ts'
import { sample } from '../lib/source/sample/catalog.ts'

test('every page names itself canonical and lists all three languages plus x-default', () => {
  const m = toMetadata('hu', { title: 'T', description: 'D', path: (l) => `/${l}/catalog` })
  assert.equal(m.alternates?.canonical, 'http://localhost:3020/hu/catalog')
  const langs = m.alternates?.languages as Record<string, string>
  assert.deepEqual(Object.keys(langs).sort(), ['en', 'hu', 'ro', 'x-default'])
  assert.equal(langs['x-default'], `http://localhost:3020/${DEFAULT_LANG}/catalog`)
  assert.equal((m.openGraph as { locale?: string }).locale, 'hu_RO')
})

test('a real catalogue without SITE_URL fails loudly instead of publishing localhost', () => {
  assert.throws(() => siteUrlFrom(true, {}), /SITE_URL/)
  assert.throws(() => siteUrlFrom(true, { SITE_URL: ' ' }), /SITE_URL/)
  assert.equal(siteUrlFrom(true, { SITE_URL: 'https://magazin.ro' }), 'https://magazin.ro')
  /* Образец живёт на машине разработчика: там localhost и есть адрес. */
  assert.equal(siteUrlFrom(false, {}), 'http://localhost:3020')
  assert.equal(siteUrlFrom(false, { SITE_URL: 'https://proba.ro' }), 'https://proba.ro')
})

test('while the catalogue is a sample, nothing is open to indexing', () => {
  const m = toMetadata('ro', { title: 'T', description: 'D', path: (l) => `/${l}` })
  assert.deepEqual(m.robots, { index: false, follow: false })
})

test('while prices are samples, the product markup carries no offer', async () => {
  const r = await sample.product('ro', 'capsule-cbd-10')
  assert.ok(r.ok)
  const ld = productLd(r.value, r.value.variants[0])
  assert.equal(ld['@type'], 'Product')
  assert.equal(ld.sku, 'CM-30')
  assert.equal('offers' in ld, false)
})

test('breadcrumbs are absolute and numbered from one', () => {
  const ld = breadcrumbLd([{ name: 'Acasă', href: '/ro' }, { name: 'Uleiuri', href: '/ro/catalog/uleiuri' }])
  assert.deepEqual(ld.itemListElement[1], { '@type': 'ListItem', position: 2, name: 'Uleiuri', item: 'http://localhost:3020/ro/catalog/uleiuri' })
})
