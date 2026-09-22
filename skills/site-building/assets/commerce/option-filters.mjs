// Adapted from Medusa DTC product-option-filters.ts; see MEDUSA-LICENSE.md.
// Normalize both repeated URL parameters and comma-separated server records.
export function parseOptionValueIds(searchParams, key = 'optionValueIds') {
  const raw = typeof searchParams?.getAll === 'function' ? searchParams.getAll(key) : searchParams?.[key]
  const values = Array.isArray(raw) ? raw : [raw]
  return [...new Set(values.filter(value => typeof value === 'string')
    .flatMap(value => value.split(',')).map(value => value.trim()).filter(Boolean))]
}
