// Original SiteBuildingSkill helper for Vendure `search` (take/skip paging,
// facetValueFilters). The URL carries stable facet and value CODES; the adapter
// maps them to Vendure IDs, which differ between environments.
//
// Semantics: values of ONE facet are alternatives (OR), different facets narrow
// (AND). One {and: id} per selected value returns only products carrying every
// value — "oil" + "capsules" then shows nothing.

const PREFIX = 'facet.'

/** Read `facet.<code>=a&facet.<code>=b,c` into { code: [values] }. */
export function parseFacetParams(searchParams) {
  if (typeof searchParams?.then === 'function') throw new TypeError('Await searchParams before parsing (Next 15+ passes a Promise)')
  const entries = typeof searchParams?.entries === 'function'
    ? [...searchParams.entries()]
    : Object.entries(searchParams ?? {}).flatMap(([k, v]) => [v].flat().map((one) => [k, one]))
  const out = {}
  for (const [key, raw] of entries) {
    if (!key.startsWith(PREFIX) || typeof raw !== 'string') continue
    const code = key.slice(PREFIX.length)
    if (!code) continue
    const values = raw.split(',').map((v) => v.trim()).filter(Boolean)
    out[code] = [...new Set([...(out[code] ?? []), ...values])]
  }
  return out
}

/**
 * @param selected   { facetCode: [valueCode] } from parseFacetParams
 * @param dictionary { facetCode: { valueCode: vendureFacetValueId } } from the adapter
 * @returns { filters: FacetValueFilterInput[], invalid: string[] } — unknown codes are
 *          reported, never guessed; the page shows them as "filter no longer exists".
 */
export function facetValueFilters(selected, dictionary) {
  const filters = []
  const invalid = []
  for (const [facet, values] of Object.entries(selected ?? {})) {
    const known = dictionary?.[facet]
    const ids = []
    for (const value of values) {
      const id = known && Object.hasOwn(known, value) ? known[value] : undefined
      if (id === undefined) invalid.push(`${facet}:${value}`)
      else ids.push(String(id))
    }
    const unique = [...new Set(ids)]
    if (unique.length === 1) filters.push({ and: unique[0] })
    else if (unique.length > 1) filters.push({ or: unique })
  }
  return { filters, invalid }
}

/** `?page=N` → { page, take, skip }. Absent → page 1; zero, negative, fractional or huge → invalid (404, not page 1). */
export function pageVariables(searchParams, { pageSize = 24, maxPage = 1000, key = 'page' } = {}) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new RangeError('pageSize must be 1..100')
  if (typeof searchParams?.then === 'function') throw new TypeError('Await searchParams before parsing (Next 15+ passes a Promise)')
  const raw = typeof searchParams?.get === 'function' ? searchParams.get(key) : [searchParams?.[key]].flat()[0]
  if (raw == null || raw === '') return { ok: true, page: 1, take: pageSize, skip: 0 }
  if (typeof raw !== 'string' || !/^[1-9]\d{0,6}$/.test(raw) || Number(raw) > maxPage) return { ok: false }
  const page = Number(raw)
  return { ok: true, page, take: pageSize, skip: (page - 1) * pageSize }
}

/** Page count from SearchResponse.totalItems; a page past the end is a 404, not an empty list. */
export function pageCount(totalItems, pageSize) {
  if (!Number.isSafeInteger(totalItems) || totalItems < 0) throw new RangeError('totalItems must be a non-negative integer')
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new RangeError('pageSize must be positive')
  return Math.max(1, Math.ceil(totalItems / pageSize))
}
