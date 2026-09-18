/**
 * Одна большая проверка.
 *
 * Заведена по слову заказчика: «в финале производства запущу одну большую
 * проверку — чтоб она знала, что проверять». Знать должна она, а не он: до
 * сегодняшнего дня список из четырнадцати команд в нужном порядке жил в
 * `CLAUDE.md` и в моей памяти, а память кончается вместе с сессией.
 *
 * Список берётся из реестра этапов (`tools/stages.mjs`), а не пишется здесь
 * второй раз. Это важнее, чем кажется: этапу 2 нужен свип по ширинам, этапу
 * 5 — ещё и разметка для поиска, а этапу 6 не нужен ни тот, ни другая.
 * Список, набранный рукой в этом файле, разошёлся бы с реестром за месяц —
 * ровно та болезнь, от которой лечит весь набор.
 *
 * Порядок не произволен и тоже взят оттуда: `check:open` идёт ДО сборки
 * (обе пишут в `.next`), `check:urls` и `check:seo` — после (читают `out/`),
 * отрисованные проверки — последними и на поднятом сайте.
 *
 *   npm run check:all             всё, что нужно на СЕГОДНЯШНЕМ этапе
 *   npm run check:all -- --final  всё, что нужно к сдаче (этап 5)
 *   npm run check:all -- --fast   только то, чему не нужен браузер
 *
 * Что нельзя проверить машиной — печатается отдельным списком в конце.
 * Проверка, которая молчит о непроверенном, читается как «всё хорошо».
 */

import { spawn, spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { STAGES, currentStage } from './stages.mjs'
import { nameOf } from './checks.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const args = process.argv.slice(2)
const FINAL = args.includes('--final')
const FAST = args.includes('--fast')

/** Отрисованным проверкам нужен браузер и поднятый сайт. */
const RENDERED = new Set(['check:craft', 'sweep'])
/** Эти читают собранный `out/`. */
const NEEDS_BUILD = new Set(['check:urls', 'check:seo', 'check:craft', 'sweep'])
const PORT = 8099

const stage = FINAL ? STAGES.find((s) => s.n === 5) : currentStage()
if (!stage) {
  console.error('Не прочитать этап из CLAUDE.md (строка «Этап производства: **N · Имя**»).')
  process.exit(1)
}

let list = [...stage.checks]
if (FAST) list = list.filter((c) => !RENDERED.has(c))
/* Сборка обязана быть в списке, если ниже кто-то читает собранное: этап мог
   перечислить проверку по `out/`, не назвав сборку, и тогда мерилась бы
   вчерашняя папка — или ничего. */
if (list.some((c) => NEEDS_BUILD.has(c)) && !list.includes('build:site')) {
  list.splice(list.findIndex((c) => NEEDS_BUILD.has(c)), 0, 'build:site')
}

console.log(`\n━━ Большая проверка · этап ${stage.n} · ${stage.name}${FINAL ? ' (к сдаче)' : ''}`)
console.log(`   ${list.length} шагов: ${list.join(' · ')}\n`)

/* ── свой сервер на время отрисованных проверок ────────────────────────── */

const alive = async () => {
  try {
    const r = await fetch(`http://localhost:${PORT}/`, { signal: AbortSignal.timeout(800) })
    return r.status < 500
  } catch { return false }
}

let server = null
/* Сервер — ребёнок этого процесса, но не умирает вместе с ним: упади
   проверка исключением, он остался бы висеть на порту и следующий прогон
   мерил бы вчерашнюю сборку. Поэтому гасится и на обычном выходе тоже. */
process.on('exit', () => server?.kill())

async function serveIfNeeded(check) {
  if (!RENDERED.has(check) || server || await alive()) return
  console.log(`   (поднимаю свой сервер на ${PORT} — отрисованным проверкам нужен отданный сайт)`)
  server = spawn(process.execPath, [join(ROOT, 'tools/serve.mjs'), String(PORT)], {
    cwd: ROOT, stdio: 'ignore',
  })
  for (let i = 0; i < 40; i++) {
    if (await alive()) return
    await new Promise((r) => setTimeout(r, 250))
  }
  console.error(`\n✗ свой сервер не поднялся на ${PORT} — отрисованные проверки мерить нечем`)
}

/* ── прогон ───────────────────────────────────────────────────────────── */

const results = []
for (const check of list) {
  await serveIfNeeded(check)
  console.log(`\n── ${check}`)
  const started = Date.now()
  const r = spawnSync('npm', ['run', check], { cwd: ROOT, stdio: 'inherit', shell: false })
  const ok = r.status === 0
  results.push({ check, ok, sec: Math.round((Date.now() - started) / 1000) })
  /* Дальше идти можно: проверки независимы, и заказчику нужен ПОЛНЫЙ список
     того, что не так, а не первое попавшееся. Кроме сборки: без неё
     следующие меряли бы вчерашнюю папку и врали бы зелёным. */
  if (!ok && check === 'build:site') {
    console.error('\n✗ сборка упала — то, что читает out/, дальше не меряем')
    break
  }
}

if (server) server.kill()

/* ── вердикт ──────────────────────────────────────────────────────────── */

const bad = results.filter((r) => !r.ok)
console.log('\n━━ Итог\n')
/* Человеческое имя рядом с командой: вердикт читает не только агент.
   «check:craft» ничего не говорит заказчику, «отрисованная страница» —
   говорит. Имена лежат в одном месте (tools/checks.mjs), а не пишутся
   здесь второй копией. */
for (const r of results) {
  console.log(`   ${r.ok ? '✓' : '✗'} ${r.check.padEnd(12)} ${nameOf(r.check)}${r.sec > 3 ? ` · ${r.sec}с` : ''}`)
}
const skipped = list.filter((c) => !results.some((r) => r.check === c))
for (const c of skipped) console.log(`   · ${c.padEnd(12)} ${nameOf(c)} — не запускалась`)

if (FAST) {
  console.log('\n   Браузерные проверки пропущены (--fast): отрисованная страница и свип по ширинам.')
}

console.log('\n━━ Машиной не проверяется — смотреть глазом:\n')
for (const h of stage.gate.human) console.log(`   □ ${h}`)

if (bad.length) {
  console.error(`\n✗ Не проходит: ${bad.map((r) => r.check).join(', ')}`)
  process.exit(1)
}

console.log(`\n✓ Всё, что меряется машиной на этапе ${stage.n}, держится.`)
