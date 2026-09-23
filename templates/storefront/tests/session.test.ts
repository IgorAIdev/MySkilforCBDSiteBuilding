import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SESSION_COOKIE } from '../lib/session-cookie.ts'

test('the session cookie has one name', () => {
  assert.equal(SESSION_COOKIE, 'shop_session')
})
