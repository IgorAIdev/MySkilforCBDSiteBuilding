import type { Product, Variant } from './source/contract.ts'
import { PRICES_ARE_REAL } from './flags.ts'
import { MARKET } from './market.ts'
import { COMPANY } from './company.ts'
import { SITE_URL, absolute } from './seo.ts'

/* JSON-LD — то, что читает машина. Всё — из тех же данных, что нарисованы:
   обещать поисковику больше, чем на странице, нельзя (check:seo, faqPage). */
export const faqLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
})

/** Товар для поиска. Цена идёт в разметку только настоящая: выдуманная
 *  цена в выдаче — отрицательное СЕО (флаг PRICES_ARE_REAL). Строка цены
 *  для машины — точкой и без знака валюты, поэтому деление здесь своё:
 *  это сериализация в lib/, не вёрстка. */
export function productLd(product: Product, variant: Variant | null): Record<string, unknown> {
  const ld: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.summary }
  if (product.brand) ld.brand = { '@type': 'Brand', name: product.brand }
  if (variant) ld.sku = variant.sku
  if (PRICES_ARE_REAL && variant) {
    ld.offers = {
      '@type': 'Offer', priceCurrency: MARKET.currency,
      price: (variant.price.minor / 10 ** MARKET.precision).toFixed(MARKET.precision),
      availability: variant.stock === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    }
  }
  return ld
}

export const breadcrumbLd = (trail: { name: string; href: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(c.href) })),
})

export const organizationLd = () => ({ '@context': 'https://schema.org', '@type': 'Organization', name: COMPANY.name, url: SITE_URL() })
export const websiteLd = () => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: COMPANY.name, url: SITE_URL() })
