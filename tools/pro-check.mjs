/*
 * Каждое число основания проверяется по первоисточнику.
 *
 * Заведено по слову владельца 21.09.2026: «а токенов я нахуя кучу потратил
 * на исследования, если ты делаешь по прошлым некачественным нашим
 * попыткам». Он прав: снимок первоисточников лежал в репозитории, а числа
 * основания были сняты с прошлой витрины — и увидеть это можно было только
 * чтением файлов руками.
 *
 * Теперь это читает машина. В `pro/основание.json` у каждого числа стоит
 * АДРЕС: файл снимка и строка, которая там обязана быть. Проверка открывает
 * файл и ищет строку. Нет файла, нет строки — находка, и число считается
 * необоснованным.
 *
 * Чего эта проверка НЕ делает, и это сказано вслух: она не судит, верно ли
 * число ВЫВЕДЕНО из строки. Она сторожит, что источник существует и говорит
 * то, на что ссылаются, — то есть ловит выдуманную ссылку, а не ошибку
 * рассуждения.
 *
 *   node tools/pro-check.mjs [--json]
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '')
const SNAP = path.join(ROOT, 'research/site-building-2026-09-20/raw/sources')
const FILE = path.join(ROOT, 'pro/основание.json')

if (!existsSync(FILE)) {
  console.error('✗ Нет pro/основание.json — проверять нечего.')
  process.exit(1)
}
if (!existsSync(SNAP)) {
  console.error(`✗ Нет снимка первоисточников (${path.relative(ROOT, SNAP)}) — числа не на что опереть.`)
  process.exit(1)
}

const base = JSON.parse(readFileSync(FILE, 'utf8'))
const findings = []
let checked = 0

const walk = (node, where) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node.источники)) {
    for (const src of node.источники) {
      checked += 1
      const full = path.join(SNAP, src.файл)
      if (!existsSync(full)) {
        findings.push(`${where}: нет файла снимка ${src.файл}`)
        continue
      }
      if (!readFileSync(full, 'utf8').includes(src.строка)) {
        findings.push(`${where}: в ${src.файл} нет строки «${src.строка}»`)
      }
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'источники') continue
    if (value && typeof value === 'object') walk(value, where ? `${where} · ${key}` : key)
  }
}

walk(base, '')

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ checked, findings }, null, 2))
} else if (findings.length) {
  console.error('✗ Числа без первоисточника:')
  for (const f of findings) console.error(`    ${f}`)
  console.error(`\nПроверено ссылок: ${checked}, не подтвердилось: ${findings.length}`)
} else {
  console.log(`Каждое число основания подтверждено первоисточником. Ссылок проверено: ${checked}.`)
}
process.exit(findings.length ? 1 : 0)
