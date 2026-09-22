// Original project config using the documented Lighthouse CI API, not its own
// repository's lint exemptions. Local reports only; no public upload service.
const path = require('node:path')
const dist = process.env.SITE_AUDIT_DIST || 'dist'
const urls = (process.env.SITE_AUDIT_URLS || 'http://localhost/').split(',').map(url => url.trim())
for (const url of urls) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' || parsed.hostname !== 'localhost' || parsed.username || parsed.password) {
    throw new Error('Static audit URLs must use http://localhost without credentials')
  }
}
module.exports = {
  ci: {
    collect: { staticDistDir: path.resolve(dist), url: urls, numberOfRuns: 3 },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 1, aggregationMethod: 'pessimistic' }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'pessimistic' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median' }],
        'resource-summary:script:size': ['error', { maxNumericValue: 200000, aggregationMethod: 'pessimistic' }],
        'resource-summary:total:size': ['error', { maxNumericValue: 1000000, aggregationMethod: 'pessimistic' }],
        'errors-in-console': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'viewport': 'error',
      },
    },
    upload: { target: 'filesystem', outputDir: './dist/lighthouse-reports' },
  },
}
