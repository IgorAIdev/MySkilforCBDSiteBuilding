import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PAGES } from '../lib/pages.ts'

test('every block type in the data has a renderer and every renderer has a block type', () => {
  const src = readFileSync(new URL('../components/blocks/registry.tsx', import.meta.url), 'utf8')
  const body = src.slice(src.indexOf('export const RENDERERS = {'), src.indexOf('} satisfies Renderers'))
  const rendered = [...body.matchAll(/^\s+([a-z]+): [A-Z]\w+,$/gm)].map((m) => m[1]).sort()
  const used = [...new Set(Object.values(PAGES).flatMap((p) => Object.values(p.blocks).flat().map((b) => b.type)))].sort()
  assert.deepEqual(rendered, used)
})
