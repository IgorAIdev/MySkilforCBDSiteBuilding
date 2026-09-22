/**
 * Сохранение настроек и утверждение не теряют выбор владельца (И244).
 *
 * Дефекты, найденные проверкой ядра 22.09.2026: одно нечитаемое поле
 * затирало всю запись значениями по умолчанию при следующем движении
 * ползунка; правка в момент загрузки стирала утверждение; вкладка старой
 * версии понижала запись новой; утверждение без полного набора данных
 * принималось, а подпись не охватывала, кто и когда утвердил.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { createApproval, verifyApproval, createVersionedParser } from '../skills/site-building/assets/studio/snapshot.mjs'
import { createStudioStore } from '../skills/site-building/assets/studio/store.mjs'
import { createHandoff, safeExportPath } from '../skills/site-building/assets/studio/handoff.mjs'

const defaults = { version: 2, size: 18, palette: 'sand' }
const tokens = { '--body': '1.125rem' }
const PALETTES = ['sand', 'olive']
const parse = createVersionedParser({ version: 2, supported: [1, 2], normalize: (raw) => {
  const result = { ...defaults, ...raw, version: 2 }
  if (!Number.isFinite(result.size) || result.size < 16 || result.size > 24) throw new Error('Invalid size')
  if (!PALETTES.includes(result.palette)) throw new Error('Unknown palette')
  return result
} })
const check = () => ({ findings: [] })
const context = { projectId: 'north', sourceRevision: 'fixture-v1', resolveTokens: () => tokens }
const approval = (design, extra = {}) => createApproval({ design, tokens, projectId: 'north', sourceRevision: 'fixture-v1', actor: 'owner-ui', ...extra })

function fixture(raw, options = {}) {
  const values = new Map(raw === undefined ? [] : [['s', typeof raw === 'string' ? raw : JSON.stringify(raw)]])
  const events = new EventTarget()
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }
  const store = createStudioStore({ key: 's', defaults, parse, check, storage: () => storage, events: () => events, ...context, ...options })
  const off = store.subscribe(() => {})
  const saved = () => JSON.parse(values.get('s'))
  return { store, values, events, off, saved }
}
const tick = () => new Promise((r) => setTimeout(r, 30))

test('store refuses to start without the context an approval is checked against', () => {
  const storage = { getItem: () => null, setItem: () => {} }
  const base = { key: 's', defaults, parse, check, storage: () => storage, events: () => null }
  assert.throws(() => createStudioStore({ ...base, sourceRevision: 'r', resolveTokens: () => tokens }), /projectId/)
  assert.throws(() => createStudioStore({ ...base, projectId: 'p', resolveTokens: () => tokens }), /sourceRevision/)
  assert.throws(() => createStudioStore({ ...base, projectId: 'p', sourceRevision: 'r' }), /resolveTokens/)
})

test('an edit made while a restored approval is still being checked keeps the approval in storage', async () => {
  const record = await approval(defaults)
  const f = fixture({ draft: defaults, applied: defaults, approved: record, lastApproval: record })
  f.store.draft({ ...defaults, size: 20 })
  assert.equal(f.saved().lastApproval?.id, record.id)
  await tick()
  assert.equal(f.store.getSnapshot().lastApproval?.id, record.id)
  assert.equal(f.store.getSnapshot().approved, null)
  f.off()
})

test('a restored approval becomes current again when the draft matches it, even after edits during the check', async () => {
  const record = await approval(defaults)
  const f = fixture({ draft: defaults, applied: defaults, lastApproval: record })
  f.store.draft({ ...defaults, size: 20 })
  f.store.draft(defaults)
  await tick()
  assert.equal(f.store.getSnapshot().approved?.id, record.id)
  f.off()
})

test('an unreadable draft falls back to the applied design, never to defaults, and the raw record is kept', () => {
  const applied = { ...defaults, size: 22, palette: 'olive' }
  const raw = { draft: { ...defaults, palette: 'removed-ocean' }, applied }
  const f = fixture(raw)
  assert.deepEqual(f.store.getSnapshot().draft, applied)
  assert.match(f.store.getSnapshot().error, /черновик/i)
  f.store.draft({ ...applied, size: 21 })
  assert.deepEqual(f.saved().applied, applied)
  assert.deepEqual(JSON.parse(f.values.get('s:backup')), raw)
  f.off()
})

test('a record this version cannot read (future version or broken applied) is never overwritten', () => {
  for (const raw of [
    { draft: { version: 3, size: 18, palette: 'sand' }, applied: { version: 3, size: 18, palette: 'sand' } },
    { draft: defaults, applied: { ...defaults, size: '1040' } },
    '{"draft":',
  ]) {
    const f = fixture(raw)
    const before = f.values.get('s')
    assert.ok(f.store.getSnapshot().error, JSON.stringify(raw))
    assert.equal(f.store.draft({ ...defaults, size: 20 }), false)
    assert.equal(f.store.apply(), false)
    assert.equal(f.values.get('s'), before, 'stored record must stay byte-identical')
    f.off()
  }
})

test('a broken write from another tab does not make this tab save defaults over it', () => {
  const f = fixture({ draft: { ...defaults, size: 20 }, applied: defaults })
  f.values.set('s', '{"draft":')
  const event = new Event('storage'); event.key = 's'; f.events.dispatchEvent(event)
  assert.equal(f.store.getSnapshot().draft.size, 20, 'in-memory state survives')
  assert.equal(f.store.draft({ ...defaults, size: 21 }), false)
  assert.equal(f.values.get('s'), '{"draft":')
  f.off()
})

test('discardSaved is the only way past an unreadable record, and it backs the record up first', () => {
  const f = fixture('{"draft":')
  assert.equal(f.store.discardSaved(), true)
  assert.equal(f.values.get('s:backup'), '{"draft":')
  assert.equal(f.store.draft({ ...defaults, size: 20 }), true)
  assert.equal(f.saved().draft.size, 20)
  f.off()
})

test('approve checks the draft against the store’s own project, revision and engine tokens', async () => {
  const f = fixture(undefined)
  const foreign = await createApproval({ design: defaults, tokens, projectId: 'other', sourceRevision: 'fixture-v1', actor: 'owner-ui' })
  await assert.rejects(() => f.store.approve(foreign), /project/)
  const oldRevision = await approval(defaults, { sourceRevision: 'fixture-v0' })
  await assert.rejects(() => f.store.approve(oldRevision), /revision/)
  const madeUp = await createApproval({ design: defaults, tokens: { '--body': '9rem' }, projectId: 'north', sourceRevision: 'fixture-v1', actor: 'owner-ui' })
  await assert.rejects(() => f.store.approve(madeUp), /tokens/)
  assert.equal(await f.store.approve(await approval(defaults)), true)
  f.off()
})

test('restore rejects an approval from another project or source revision', async () => {
  for (const extra of [{ projectId: 'other' }, { sourceRevision: 'fixture-v0' }]) {
    const record = await approval(defaults, extra)
    const f = fixture({ draft: defaults, applied: defaults, lastApproval: record })
    await tick()
    assert.equal(f.store.getSnapshot().approved, null, JSON.stringify(extra))
    f.off()
  }
})

test('approval check fails closed: every argument is required, and who and when are signed', async () => {
  const record = await approval(defaults)
  const full = { design: defaults, tokens, projectId: 'north', sourceRevision: 'fixture-v1' }
  await verifyApproval(record, full)
  for (const drop of Object.keys(full)) {
    const partial = { ...full }; delete partial[drop]
    await assert.rejects(() => verifyApproval(record, partial), new RegExp(drop))
  }
  const test = await approval(defaults, { actor: 'verification' })
  await assert.rejects(() => verifyApproval({ ...test, actor: 'owner-ui' }, full), /fingerprint/)
  await assert.rejects(() => verifyApproval({ ...record, approvedAt: '2020-01-01T00:00:00.000Z' }, full), /fingerprint/)
})

test('handoff refuses a project without identity and revision', async () => {
  const record = await approval(defaults)
  const base = { design: defaults, tokens, approval: record, files: {}, markdown: '', renderPdf: async () => new TextEncoder().encode('%PDF-x') }
  await assert.rejects(() => createHandoff({ ...base, project: { name: 'Чужой сайт' } }), /project/)
  await assert.rejects(() => createHandoff({ ...base, project: { id: 'north', name: 'N' } }), /sourceRevision/)
})

test('export paths are checked without regard to letter case, and secrets and device names are refused', async () => {
  for (const path of ['.GIT/config', 'Node_Modules/x.js', '.ENV', '.Env.local', 'secrets/.npmrc', 'id_rsa', 'keys/site.pem', 'CON.css', 'NUL', 'x/aux.txt', 'a./b', 'a /b']) {
    assert.throws(() => safeExportPath(path), /Unsafe/, path)
  }
  for (const path of ['index.html', 'assets/hero.webp', '.env.example', '.well-known/security.txt']) assert.equal(safeExportPath(path), path)
  const base = { design: defaults, tokens, project: { id: 'north', name: 'N', sourceRevision: 'fixture-v1' }, markdown: '', renderPdf: async () => new TextEncoder().encode('%PDF-x') }
  await assert.rejects(() => createHandoff({ ...base, files: { 'Approval.json': '{}' } }), /Reserved/)
  await assert.rejects(() => createHandoff({ ...base, files: { 'a.css': '', 'A.css': '' } }), /case/)
})
