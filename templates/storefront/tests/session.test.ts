import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PERSONAL, SESSION_COOKIE } from '../lib/session-cookie.ts'
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

test('a write refreshes exactly the personal pages the checks measure full', () => {
  const cfg = JSON.parse(readFileSync(new URL('../kit.config.json', import.meta.url), 'utf8')) as { sessions: { pages: Record<string, string[]> } }
  assert.deepEqual([...PERSONAL].sort(), Object.keys(cfg.sessions.pages).sort())
})

test('every successful checkout write refreshes the personal pages before it moves on', () => {
  const src = readFileSync(new URL('../lib/actions/checkout.ts', import.meta.url), 'utf8')
  const moves = src.split('\n').filter((l) => /^ {2}redirect\(hrefFor\(lang, \{ checkout:/.test(l))
  const refreshed = src.match(/sessionChanged\(\)\n {2}redirect\(hrefFor\(lang, \{ checkout:/g) ?? []
  assert.ok(moves.length >= 5, `переходов после записи ${moves.length}`)
  assert.equal(refreshed.length, moves.length)
})
