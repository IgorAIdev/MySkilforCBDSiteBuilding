import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { checkResources, digest, skillRoot, within } from '../skills/site-building/scripts/check-resources.mjs'
import { copyComponent } from '../skills/site-building/scripts/copy-component.mjs'

test('self-contained skill: references resolve, copied sources and licenses match provenance', () => {
  assert.deepEqual(checkResources().errors, [])
  assert.equal(digest('a\r\nb\r\n'), digest('a\nb\n'))
  assert.throws(() => within(skillRoot, '../outside'), /outside/)
})

test('selected component export includes dependencies/license, no other component and no overwrite', () => {
  const temp = mkdtempSync(join(tmpdir(), 'skill-resources-'))
  try {
    const out = join(temp, 'button')
    copyComponent('button', out)
    assert.ok(existsSync(join(out, 'button.tsx')))
    assert.ok(existsSync(join(out, 'cn.ts')))
    assert.match(readFileSync(join(out, 'LICENSE.md'), 'utf8'), /Copyright.*shadcn/)
    assert.ok(!existsSync(join(out, 'dropdown-menu.tsx')))
    const before = readFileSync(join(out, 'button.tsx'), 'utf8')
    assert.throws(() => copyComponent('button', out), /already exists/)
    assert.equal(readFileSync(join(out, 'button.tsx'), 'utf8'), before)
    assert.throws(() => copyComponent('../button', join(temp, 'bad')), /Choose/)
    assert.ok(!existsSync(join(temp, 'bad')))
    const icons = join(temp, 'icons')
    copyComponent('icons', icons)
    assert.ok(existsSync(join(icons, 'menu.svg')))
    assert.match(readFileSync(join(icons, 'LICENSE'), 'utf8'), /Feather/)
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

test('tampered copied asset fails before exporting any files', () => {
  const temp = mkdtempSync(join(tmpdir(), 'skill-tamper-'))
  try {
    const isolated = join(temp, 'skill')
    cpSync(skillRoot, isolated, { recursive: true })
    writeFileSync(join(isolated, 'assets/icons/lucide/menu.svg'), '<svg></svg>')
    assert.ok(checkResources(isolated).errors.some(e => e.includes('menu.svg')))
    const out = join(temp, 'result')
    assert.throws(() => copyComponent('icons', out, isolated), /changed/)
    assert.ok(!existsSync(out))
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

test('exported commerce functions work without repo dependencies and quality config remains private', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'skill-commerce-'))
  try {
    const out = join(temp, 'commerce')
    copyComponent('commerce', out)
    for (const name of ['VERCEL', 'SHOPIFY', 'MEDUSA']) assert.ok(existsSync(join(out, `${name}-LICENSE.md`)))
    const { inspectSelection } = await import(pathToFileURL(join(out, 'variant-selection.mjs')))
    assert.equal(inspectSelection([], [{ id: 'single', available: true, options: {} }]).status, 'ready')
    const { cacheControl } = await import(pathToFileURL(join(out, 'cache-policy.mjs')))
    assert.equal(cacheControl(), 'private, no-store')
    const vendure = join(temp, 'vendure')
    copyComponent('vendure', vendure)
    assert.match(readFileSync(join(vendure, 'VENDURE-STARTER-LICENSE.md'), 'utf8'), /Vendure GmbH/)
    const { toSelection } = await import(pathToFileURL(join(vendure, 'product.mjs')))
    assert.deepEqual(toSelection({ optionGroups: [], variants: [{ id: 1, options: [] }] }).variants[0].id, '1')
    const { shopRequest } = await import(pathToFileURL(join(vendure, 'request.mjs')))
    assert.throws(() => shopRequest({ apiUrl: 'https://x.test', query: '{a}' }), /channelToken/)
    assert.ok(!existsSync(join(vendure, 'variant-selection.mjs')))
    const quality = join(temp, 'quality')
    copyComponent('quality', quality)
    const config = (await import(pathToFileURL(join(quality, 'lighthouserc.cjs')))).default
    assert.equal(config.ci.collect.numberOfRuns, 3)
    assert.equal(config.ci.upload.target, 'filesystem')
    assert.equal(config.ci.assert.assertions['categories:accessibility'][1].minScore, 1)
    const deps = JSON.parse(readFileSync(join(quality, 'package-fragment.json'), 'utf8'))
    const fixture = JSON.parse(readFileSync(new URL('./component-preview/package.json', import.meta.url), 'utf8'))
    assert.equal(deps.devDependencies['@lhci/cli'], fixture.devDependencies['@lhci/cli'])
    assert.deepEqual(deps.overrides, fixture.overrides)
    assert.ok(!existsSync(join(quality, 'variant-selection.mjs')))
  } finally { rmSync(temp, { recursive: true, force: true }) }
})
