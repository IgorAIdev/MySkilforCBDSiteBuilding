// Adapted from Hydrogen getPaginationVariables; see SHOPIFY-LICENSE.md.
// Cursor names remain neutral; the provider maps them to its GraphQL arguments.
export function getPaginationVariables(request, { pageBy = 20, namespace = '', maxPageSize = 100 } = {}) {
  if (!Number.isSafeInteger(maxPageSize) || maxPageSize < 1 || !Number.isSafeInteger(pageBy) || pageBy < 1 || pageBy > maxPageSize) {
    throw new Error('Invalid pagination size')
  }
  if (typeof namespace !== 'string' || !/^[a-zA-Z0-9_-]*$/.test(namespace)) throw new Error('Invalid pagination namespace')
  if (typeof request?.url !== 'string') throw new Error('Request URL is required')
  const params = new URL(request.url).searchParams
  const key = name => namespace ? `${namespace}_${name}` : name
  const cursor = params.get(key('cursor')) || null
  const previous = params.get(key('direction')) === 'previous'
  return previous ? { last: pageBy, startCursor: cursor } : { first: pageBy, endCursor: cursor }
}

export function resetPagination(search, namespaces = ['']) {
  const params = new URLSearchParams(search)
  for (const ns of namespaces) for (const name of ['cursor', 'direction']) params.delete(ns ? `${ns}_${name}` : name)
  return params
}
