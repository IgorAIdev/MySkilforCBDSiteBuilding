// Original SiteBuildingSkill helper. Vendure sends money as integers in minor
// units with the precision of the server's MoneyStrategy (2 by default, the
// same for every currency) — read it from the target server config, do not
// derive it from the currency and do not hard-code "/ 100" in components.
// 0 is a price; a missing value is not.

const check = (minor, precision) => {
  if (!Number.isSafeInteger(minor)) throw new TypeError(`Money must be an integer in minor units, got ${minor}`)
  if (!Number.isInteger(precision) || precision < 0 || precision > 4) throw new RangeError(`Invalid precision ${precision}`)
}

export function toAmount(minor, { precision = 2 } = {}) {
  check(minor, precision)
  return minor / 10 ** precision
}

/** One formatting function for the whole storefront. */
export function formatMoney(minor, currencyCode, locale, { precision = 2 } = {}) {
  check(minor, precision)
  if (typeof currencyCode !== 'string' || !/^[A-Z]{3}$/.test(currencyCode)) throw new TypeError(`Invalid currency ${currencyCode}`)
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(minor / 10 ** precision)
}

/**
 * Normalize SearchResult.priceWithTax (SinglePrice | PriceRange).
 *   { kind: 'single', value } | { kind: 'range', min, max } | { kind: 'missing' }
 * A range is a "from min" price on the shelf, never the price of a chosen variant.
 */
export function searchPrice(price) {
  if (price == null) return { kind: 'missing' }
  if (Number.isSafeInteger(price.value)) return { kind: 'single', value: price.value }
  if (Number.isSafeInteger(price.min) && Number.isSafeInteger(price.max)) {
    if (price.min > price.max) throw new RangeError('PriceRange min is greater than max')
    return price.min === price.max ? { kind: 'single', value: price.min } : { kind: 'range', min: price.min, max: price.max }
  }
  throw new TypeError('Select priceWithTax { ... on SinglePrice { value } ... on PriceRange { min max } }')
}
