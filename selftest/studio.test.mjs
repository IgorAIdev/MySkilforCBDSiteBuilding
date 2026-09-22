import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApproval, verifyApproval, createVersionedParser } from '../skills/site-building/assets/studio/snapshot.mjs'
import { createStudioStore } from '../skills/site-building/assets/studio/store.mjs'
import { createHandoff, safeExportPath } from '../skills/site-building/assets/studio/handoff.mjs'
import { documentHtml } from '../skills/site-building/assets/studio/document.mjs'
import { installStudio } from '../skills/site-building/scripts/install-studio.mjs'
import { selectResources } from '../skills/site-building/assets/studio/selection.mjs'
const defaults = { version: 2, size: 18, layout: 'quiet' }
const tokens = { '--body': '1.125rem' }
const parse = createVersionedParser({ version: 2, supported: [1, 2], normalize: raw => {
  const result = { ...defaults, ...raw, version: 2 }
  if (!Number.isFinite(result.size) || result.size < 16 || result.size > 24) throw new Error('Invalid size')
  return result
} })
const check = design => ({ findings: design.size === 24 ? ['too large for this profile'] : [] })
function fixture(saved, options = {}) {
  const values = new Map(saved ? [['test', JSON.stringify(saved)]] : [])
  const events = new EventTarget()
  let broken = false
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { if (broken) throw new Error('quota'); values.set(key, value) } }
  const store = createStudioStore({ key: 'test', defaults, parse, check, storage: () => storage, events: () => events, ...options })
  const unsubscribe = store.subscribe(() => {})
  return { store, storage, values, events, unsubscribe, breakStorage: () => { broken = true } }
}
const approval = design => createApproval({ design, tokens, projectId: 'north', sourceRevision: 'fixture-v1', actor: 'verification' })
test('versioned parser migrates without mutating input and rejects unsupported or invalid input', () => {
  const old = { version: 1, size: 20 }
  assert.deepEqual(parse(old), { ...defaults, size: 20 })
  assert.equal(old.version, 1)
  assert.throws(() => parse({ version: 99 }))
  assert.throws(() => parse({ version: 2, size: NaN }))
})
test('old browser data migrates and is not implicitly approved', () => {
  const f = fixture({ draft: { version: 1, size: 20 }, applied: { version: 1, size: 18 } })
  assert.equal(f.store.getSnapshot().draft.version, 2)
  assert.equal(f.store.getSnapshot().draft.size, 20)
  assert.equal(f.store.getSnapshot().approved, null)
  f.unsubscribe()
})
test('approval persists exact snapshot; editing invalidates current approval but retains history', async () => {
  const f = fixture()
  const record = await approval(defaults)
  assert.equal(await f.store.approve(record, tokens, 'north'), true)
  assert.equal(JSON.parse(f.values.get('test')).approved.id, record.id)
  f.store.draft({ ...defaults, size: 20 })
  assert.equal(f.store.getSnapshot().approved, null)
  assert.equal(f.store.getSnapshot().lastApproval.id, record.id)
  await assert.rejects(() => f.store.approve(record, tokens, 'north'), /changed/)
  assert.equal(f.store.getSnapshot().applied.size, 18)
  f.unsubscribe()
})
test('storage refusal never commits approval or destroys applied settings', async () => {
  const f = fixture()
  f.store.draft({ ...defaults, size: 20 })
  f.breakStorage()
  assert.equal(await f.store.approve(await approval(f.store.getSnapshot().draft), tokens, 'north'), false)
  assert.equal(f.store.getSnapshot().approved, null)
  assert.equal(f.store.getSnapshot().applied.size, 18)
  f.unsubscribe()
})
test('async approval rejects a draft changed during fingerprint verification', async () => {
  const f = fixture()
  const record = await approval(defaults)
  const pending = f.store.approve(record, tokens, 'north')
  f.store.draft({ ...defaults, size: 20 })
  await assert.rejects(() => pending)
  assert.equal(f.store.getSnapshot().approved, null)
  f.unsubscribe()
})
test('tampering and cross-project approval are rejected', async () => {
  const record = await approval(defaults)
  await assert.rejects(() => verifyApproval({ ...record, design: { ...defaults, size: 20 } }))
  await assert.rejects(() => verifyApproval(record, { projectId: 'other' }))
  await assert.rejects(() => verifyApproval(record, { sourceRevision: 'different-revision' }))
})

test('restored approval is invalidated when the calculation engine produces different tokens', async () => {
  const record = await approval(defaults)
  const f = fixture({ draft: defaults, applied: defaults, approved: record }, { projectId: 'north', resolveTokens: () => ({ '--body': '2rem' }) })
  await new Promise(resolve => setTimeout(resolve, 25))
  assert.equal(f.store.getSnapshot().approved, null)
  assert.equal(f.store.getSnapshot().lastApproval.id, record.id)
  f.unsubscribe()
})

test('selection includes transitive assets and rejects unknown or cyclic requirements', () => {
  const graph = { base: { files: ['base.css'] }, image: { files: ['hero.webp'] }, selected: { files: ['selected.css'], requires: ['base', 'image'] }, unused: { files: ['unused.css'] } }
  assert.deepEqual(selectResources(graph, ['selected']).files, ['base.css', 'hero.webp', 'selected.css'])
  assert.throws(() => selectResources(graph, ['missing']))
  assert.throws(() => selectResources({ a: { files: [], requires: ['b'] }, b: { files: [], requires: ['a'] } }, ['a']))
})
test('cross-tab changes reload; invalid state does not overwrite persistent data', () => {
  const f = fixture()
  f.storage.setItem('test', JSON.stringify({ draft: { ...defaults, size: 20 }, applied: defaults }))
  const event = new Event('storage'); event.key = 'test'; f.events.dispatchEvent(event)
  assert.equal(f.store.getSnapshot().draft.size, 20)
  f.storage.setItem('test', '{broken')
  f.events.dispatchEvent(event)
  assert.ok(f.store.getSnapshot().error)
  assert.equal(f.values.get('test'), '{broken')
  f.unsubscribe()
})
test('shared handoff derives both documents from the same text, includes identity and checksums', async () => {
  const record = await approval(defaults)
  let rendered = ''
  const files = await createHandoff({ design: defaults, tokens, project: { id: 'north', name: 'North Studio', sourceRevision: 'fixture-v1' }, approval: record, files: { 'index.html': '<main>North</main>' }, markdown: '## Typography\n\n| Role | Value |\n| --- | --- |\n| Body | 18 |', renderPdf: async text => { rendered = text; return new TextEncoder().encode('%PDF-test-double') } })
  const md = new TextDecoder().decode(files['DESIGN-SYSTEM.md'])
  assert.equal(md, rendered)
  assert.match(md, /настроек: `2`/)
  assert.doesNotMatch(md, /CBD|утверждённая/)
  const manifest = JSON.parse(new TextDecoder().decode(files['export-manifest.json']))
  assert.equal(manifest.snapshotId, record.id)
  assert.equal(manifest.status, 'verification')
  assert.deepEqual(manifest.files, Object.keys(files).sort())
  assert.match(manifest.hashes['index.html'], /^[a-f0-9]{64}$/)
})
test('export excludes unsafe paths and renderer escapes injected markup', () => {
  for (const path of ['../x', '/x', 'a\\b', '.env.local', 'a/.git/config', 'node_modules/x']) assert.throws(() => safeExportPath(path))
  assert.equal(safeExportPath('.env.example'), '.env.example')
  const html = documentHtml('# <script>alert(1)</script>\n\n| Name | Value |\n| --- | --- |\n| A | <img onerror=x> |')
  assert.doesNotMatch(html, /<script>|<img/)
  assert.match(html, /&lt;img/)
})
test('portable resource installer detects drift and refuses overwrite before any writes', () => {
  const target = join(mkdtempSync(join(tmpdir(), 'studio-install-')), 'core')
  installStudio(target)
  installStudio(target, true)
  const path = join(target, 'store.mjs')
  writeFileSync(path, '// owner customization\n')
  assert.throws(() => installStudio(target), /Local changes/)
  assert.equal(readFileSync(path, 'utf8'), '// owner customization\n')
  assert.throws(() => installStudio(target, true), /Stale/)
})
