import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SESSION_COOKIE } from '../lib/session-cookie.ts'
import { FIXTURES } from '../lib/source/sample/commerce.ts'

test('the session cookie has one name', () => {
  assert.equal(SESSION_COOKIE, 'shop_session')
})

test('the rendered checks open personal pages with the sample’s own sessions', () => {
  const cfg = JSON.parse(readFileSync(new URL('../kit.config.json', import.meta.url), 'utf8')) as { sessions: { cookie: string; pages: Record<string, string[]> } }
  assert.equal(cfg.sessions.cookie, SESSION_COOKIE)
  const known = new Set<string>(Object.values(FIXTURES))
  for (const list of Object.values(cfg.sessions.pages)) for (const entry of list) assert.ok(known.has(entry.split('?')[0]), entry)
})
