/**
 * Оформление отдельно от данных бекенда (И248): компонент не ходит в Vendure
 * и Payload сам и не считает деньги.
 *
 * Дефект, найденный проверкой ядра 22.09.2026: `check:port` знал только
 * импорт готового массива из `lib/` в компонент. Компонент, который сам
 * звал `getProducts()` из `lib/vendure` или ввозил `@payloadcms/*`, и цена,
 * которую компонент делил на 100, проходили нулём; ввоз `"react"` в двойных
 * кавычках в общем слое — тоже.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))

const project = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-port-'))
  cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
  writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true}')
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, rel, '..'), { recursive: true })
    writeFileSync(join(dir, rel), text)
  }
  return dir
}
const port = (files) => {
  const dir = project(files)
  try {
    const r = spawnSync(process.execPath, [join(dir, 'tools/check-port.mjs'), '--list'], { cwd: dir, encoding: 'utf8' })
    return r.stdout + r.stderr
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

test('a component that fetches from Vendure or Payload itself is a finding; the page doing it is not', () => {
  const out = port({
    'lib/vendure.ts': 'export async function getProducts() { return [] }\n',
    'components/Shelf.tsx': "import { getProducts } from '../lib/vendure'\nexport async function Shelf() { const p = await getProducts(); return p.length }\n",
    'components/Page.tsx': "import { getPayload } from 'payload'\nexport const x = getPayload\n",
    'components/Cart.tsx': 'import { gql } from "@apollo/client"\nexport const q = gql``\n',
    'components/Typed.tsx': "import type { ResultOf } from 'gql.tada'\nexport type R = ResultOf<any>\n",
    'app/page.tsx': "import { getProducts } from '../lib/vendure'\nexport default async function Home() { return (await getProducts()).length }\n",
  })
  assert.match(out, /components[\\/]Shelf\.tsx:1.*lib\/vendure/)
  assert.match(out, /components[\\/]Page\.tsx:1.*payload/)
  assert.match(out, /components[\\/]Cart\.tsx:1.*@apollo\/client/)
  assert.doesNotMatch(out, /Typed\.tsx/)
  assert.doesNotMatch(out, /app[\\/]page\.tsx/)
})

test('money arithmetic in a component is a finding; formatting through lib is not', () => {
  const out = port({
    'components/Price.tsx': "export const Price = ({ price }) => <b>{(price / 100).toFixed(2)} €</b>\n",
    'components/Total.tsx': 'export const Total = ({ total }) => <b>{total.toFixed(2)}</b>\n',
    'components/Bar.tsx': 'export const Bar = ({ pct }) => <i style={{ width: `${pct / 100}` }} />\n',
    'components/Ok.tsx': "import { formatMoney } from '../lib/money'\nexport const Ok = ({ price }) => <b>{formatMoney(price, 'EUR', 'bg')}</b>\n",
  })
  assert.match(out, /Price\.tsx:1.*денеж/)
  assert.match(out, /Total\.tsx:1.*денеж/)
  assert.doesNotMatch(out, /Bar\.tsx/)
  assert.doesNotMatch(out, /Ok\.tsx/)
})

test('engine leaking into the shared layer is found in double quotes and require too', () => {
  const out = port({
    'packages/ui/card.js': 'import React from "react"\nconst next = require("next/link")\nexport default React\n',
  })
  assert.match(out, /card\.js:1.*react/)
  assert.match(out, /card\.js:2.*next/)
})

test('a data module next to components and a local ./graphql documents file are not findings (starter false positive)', () => {
  const out = port({
    'components/cart/graphql.ts': "import { gql } from 'graphql-tag'\nexport const Q = gql``\n",
    'components/cart/data.ts': "import { print } from 'graphql'\nimport { Q } from './graphql'\nexport const q = print(Q)\n",
    'components/cart/View.tsx': "import { Q } from './graphql'\nexport const View = () => <i>{String(Q)}</i>\n",
  })
  assert.doesNotMatch(out, /data\.ts|View\.tsx|graphql\.ts/)
})
