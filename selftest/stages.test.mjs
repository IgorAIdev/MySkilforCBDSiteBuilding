import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, styleFiles, gateProblems, stepProblems, transitionProblems } from '../tools/stages.mjs'

test('stage: найденные CSS-пути действительно читаются на Windows и POSIX', () => {
  const files = styleFiles()
  assert.ok(files.length > 0, 'пустой обход не является успешной проверкой')
  for (const file of files) {
    assert.ok(existsSync(join(ROOT, file)), `нечитаемый путь: ${file}`)
    assert.ok(readFileSync(join(ROOT, file), 'utf8').length > 0)
  }
  assert.ok(files.includes('styles/primitives.module.css'), 'примитивы должны попасть в проверку')
})

test('stage: переход не выдаёт храповик за завершённые шаги', () => {
  const stage = {
    gate: { machine: [() => null] },
    steps: [
      { layer: 1, name: 'есть', done: () => null },
      { layer: 2, name: 'нет', done: () => 'не найдено' },
    ],
  }
  assert.deepEqual(gateProblems(stage), [])
  assert.deepEqual(stepProblems(stage), ['слой 2 «нет»: не найдено'])
  assert.deepEqual(transitionProblems(stage), ['слой 2 «нет»: не найдено'])
})
