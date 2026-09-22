// Header mapping adapted from Hydrogen cache/strategies.ts; see SHOPIFY-LICENSE.md.
const mapping = { maxAge: 'max-age', staleWhileRevalidate: 'stale-while-revalidate', sMaxAge: 's-maxage', staleIfError: 'stale-if-error' }

export function cacheControl({ method = 'GET', audience = 'personal', policy = {} } = {}) {
  // Public is opt-in, never inferred from the absence of an authentication error.
  if (!['GET', 'HEAD'].includes(method.toUpperCase()) || audience !== 'public') return 'private, no-store'
  if (policy.mode === 'no-store') return 'no-store'
  if (policy.mode !== 'public') throw new Error('Explicit public cache policy required')
  const parts = ['public']
  for (const [key, value] of Object.entries(policy)) {
    if (key === 'mode') continue
    if (!Object.hasOwn(mapping, key) || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid cache directive')
    parts.push(`${mapping[key]}=${value}`)
  }
  if (!Object.hasOwn(policy, 'maxAge')) throw new Error('Explicit maxAge required')
  return parts.join(', ')
}
