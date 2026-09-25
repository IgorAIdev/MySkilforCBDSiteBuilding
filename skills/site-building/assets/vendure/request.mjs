// Original SiteBuildingSkill adapter core for the Vendure Shop API.
// Header and parameter names follow Vendure's documented contract and were
// checked against vendurehq/nextjs-starter-vendure@7d06ae0
// (src/platform/vendure/api.ts). No framework, SDK or GraphQL client needed:
// pass the printed document string. Server-only: the API URL and the session
// token never go to the browser.

export const CHANNEL_HEADER = 'vendure-token'
export const AUTH_HEADER = 'vendure-auth-token'

const LANGUAGE = /^[a-z]{2,3}(_[A-Za-z]{2,4})?$/
const CURRENCY = /^[A-Z]{3}$/

/** Build the request without sending it — the one place headers are decided. */
export function shopRequest({ apiUrl, query, variables = {}, channelToken, languageCode, currencyCode, authToken } = {}) {
  let url
  try { url = new URL(apiUrl) } catch { throw new Error('apiUrl must be an absolute URL') }
  if (!/^https?:$/.test(url.protocol)) throw new Error('apiUrl must be http(s)')
  if (typeof query !== 'string' || !query.trim()) throw new Error('query must be a printed GraphQL document')
  // An explicit channel: a silent default channel shows another market's prices.
  if (typeof channelToken !== 'string' || !channelToken) throw new Error('channelToken is required')
  if (languageCode !== undefined && !LANGUAGE.test(languageCode)) throw new Error(`Invalid languageCode: ${languageCode}`)
  if (currencyCode !== undefined && !CURRENCY.test(currencyCode)) throw new Error(`Invalid currencyCode: ${currencyCode}`)
  if (languageCode) url.searchParams.set('languageCode', languageCode)
  if (currencyCode) url.searchParams.set('currencyCode', currencyCode)
  const headers = { 'content-type': 'application/json', [CHANNEL_HEADER]: channelToken }
  if (authToken) headers.authorization = `Bearer ${authToken}`
  return { url: url.toString(), init: { method: 'POST', headers, body: JSON.stringify({ query, variables }) } }
}

/**
 * Send one Shop API operation. Never throws for a remote failure: returns
 *   { ok: true, data, authToken? }                       — success; authToken when Vendure issued/renewed a session
 *   { ok: false, kind: 'unavailable', message }           — network, timeout, unreadable body
 *   { ok: false, kind: 'http', status, message }          — non-2xx
 *   { ok: false, kind: 'graphql', message, errors, data } — GraphQL errors (data may be partial)
 * "Source unavailable" and "empty catalog" stay different states for the page.
 * `init` passes framework cache hints through, e.g. { next: { tags } } or { cache: 'no-store' }.
 */
export async function shopFetch(request, { fetch = globalThis.fetch, timeoutMs = 10_000, init = {} } = {}) {
  const { url, init: base } = shopRequest(request)
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  let response
  try {
    response = await fetch(url, { ...init, ...base, headers: { ...init.headers, ...base.headers }, signal })
  } catch (error) {
    return { ok: false, kind: 'unavailable', message: error?.name === 'TimeoutError' ? `No answer in ${timeoutMs} ms` : String(error?.message ?? error) }
  }
  if (!response.ok) return { ok: false, kind: 'http', status: response.status, message: `HTTP ${response.status}` }
  let body
  try { body = await response.json() } catch { return { ok: false, kind: 'unavailable', message: 'Response is not JSON' } }
  const authToken = response.headers.get(AUTH_HEADER) ?? undefined
  if (Array.isArray(body?.errors) && body.errors.length) {
    return { ok: false, kind: 'graphql', message: body.errors.map((e) => e?.message).join('; '), errors: body.errors, data: body.data ?? null }
  }
  if (!body || body.data == null) return { ok: false, kind: 'graphql', message: 'No data returned', errors: [], data: null }
  return authToken ? { ok: true, data: body.data, authToken } : { ok: true, data: body.data }
}
