/**
 * Словарь слов (слой 12, И250): устройство меряется, формулировки — нет.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditWords } from '../tools/words.mjs'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const template = readFileSync(join(KIT, 'templates/project-words.md'), 'utf8')

test('the shipped template and the kit dictionary pass', () => {
  assert.deepEqual(auditWords(template), [])
  assert.deepEqual(auditWords(readFileSync(join(KIT, 'docs/words.md'), 'utf8')), [])
})

test('every required section is asked for by name', () => {
  const found = auditWords(template.replace('## Пустые экраны', '## Разное'))
  assert.ok(found.some((f) => /Пустые экраны/.test(f)), found.join('\n'))
})

test('an error or an empty screen without a next step is a finding', () => {
  const noStep = template.replace('| имейл пуст | Въведете имейл | за да получите потвърждение на поръчката |', '| имейл пуст | Въведете имейл | — |')
  assert.ok(auditWords(noStep).some((f) => /имейл пуст/.test(f)))
  const noNext = template.replace('| пустая корзина | Количката е празна | Разгледайте маслата |', '| пустая корзина | Количката е празна |  |')
  assert.ok(auditWords(noNext).some((f) => /пустая корзина/.test(f)))
})

test('Romanian with cedilla letters instead of comma-below is a finding', () => {
  const ro = template.replace('| корзина | количка | cart | — |', '| корзина | количка | cart | coş |')
  assert.ok(auditWords(ro).some((f) => /ş/.test(f) && /ș/.test(f)))
  const ok = template.replace('| корзина | количка | cart | — |', '| корзина | количка | cart | coș |')
  assert.deepEqual(auditWords(ok), [])
})
