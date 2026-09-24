/**
 * Что сейчас нужно — по этапу производства сайта.
 *
 * Заведён по слову заказчика: «скилл про поиск сейчас не нужен, а к финалу
 * понадобится — и я его забуду». Забудет не он, а сессия: у неё нет вчера.
 * Единственное, что переживает конец сессии, — файл, который читается
 * раньше кода, и проверка, которая валит сборку. Этот файл — оба сразу.
 *
 *   node tools/stage.mjs           брифинг: что строится, кто работает,
 *                                  что прогнать перед сдачей, что ждёт
 *   node tools/stage.mjs --gate    ворота: всё, что уже пройдено,
 *                                  держится (в CI как check:stage)
 *   node tools/stage.mjs --all     вся карта этапов
 *
 * Текущий этап — одна строка в CLAUDE.md: `Этап производства: **2 · Вёрстка**`.
 * Перевести стрелку — это правка строки, и она делается после разговора с
 * заказчиком: переход этапа меняет, что включено на витрине.
 *
 * Ворота — храповик по этапам. Проверка не требует, чтобы ТЕКУЩИЙ этап был
 * закончен, — он потому и текущий. Она требует, чтобы ПРОЙДЕННЫЕ не
 * разъехались: шкала, заведённая на нулевом, не может исчезнуть на третьем,
 * а флаг настоящести, включённый на четвёртом, — выключиться на шестом.
 */

import { relative } from 'node:path'
import { STAGES, ALWAYS, PLATFORM, currentStage, gateProblems, stepProblems, transitionProblems, ROOT, confirmed } from './stages.mjs'
import { DESIGN } from './checks.mjs'

const arg = (f) => process.argv.includes(f)

const title = (s) => `${s.n} · ${s.name}`
const line = (ch, text) => console.log(`  ${ch} ${text}`)

function brief(stage, { full = false } = {}) {
  console.log(`\n${title(stage)}${full ? '' : `   (строка «Этап производства:» в CLAUDE.md)`}`)
  console.log(`  Что строится: ${stage.builds}`)
  console.log(`  Кто работает: ${stage.skills.join(', ')}`)
  /* Вид правится на любом этапе, а брифинг не знает, про вид ли сегодняшняя
     работа. Поэтому дизайнерские скиллы названы здесь всегда — оговоркой,
     где их нет в списке этапа (CLAUDE.md, «Дизайн делается дизайнерскими
     скиллами»; И271). */
  const design = DESIGN.skills.filter((s) => !stage.skills.includes(s))
  if (design.length) console.log(`    + при правке вида: ${design.join(', ')} — по порядку из строки «Всегда»`)
  console.log(`  Перед сдачей, в этом порядке: ${stage.checks.map((c) => `npm run ${c}`).join(' · ')}`)

  /* Шаги этапа — что за чем: ✓ по файлам, ✗ с причиной, · без предиката
     (по чтению), □ решает заказчик (отмечается в docs/gate.md). У слоёв
     порядок из первоисточников (docs/layers.md, §2); каркас приложения
     проверяется по архитектуре проекта и живым адресам. */
  if (stage.steps?.length) {
    console.log('\n  Шаги этапа — что за чем:')
    const tally = { reviewed: 0, unreviewed: 0, missing: 0, owner: 0 }
    for (const st of stage.steps) {
      const msg = st.done ? st.done() : undefined
      const ok = msg === null
      const basis = st.basis ?? 'исследования'
      /* Три состояния шага, и «есть» — не «сделано»: сделан шаг,
         пересмотренный против своего основания, с датой и правилом (И223). */
      const ch = msg === undefined ? '·' : ok ? (st.reviewed ? '✓' : '○') : '✗'
      const state = ok
        ? (st.reviewed ? `пересмотрено ${st.reviewed} — ${st.rule}` : `есть, против ${basis} не пересмотрено`)
        : msg === undefined ? 'предиката нет — читается глазами' : msg
      line(ch, `${st.layer}. ${st.name} — ${st.what} [${st.skill}]`)
      line(' ', `   ${state}`)
      if (st.show) line(' ', `   показано: ${st.show}`)
      if (st.owner) line(confirmed(st.owner) ? '✓' : '□', `   ${st.owner}   ${confirmed(st.owner) ? '(подтверждено — docs/gate.md)' : '(РЕШАЕТ ЗАКАЗЧИК)'}`)
      if (ok && st.reviewed) tally.reviewed++
      else if (ok) tally.unreviewed++
      else if (msg !== undefined) tally.missing++
      if (st.owner && !confirmed(st.owner)) tally.owner++
    }
    const next = stage.steps.find((st) => { const m = st.done ? st.done() : undefined; return m === null && !st.reviewed })
    console.log(`\n  Итог по слоям: пересмотрено ${tally.reviewed} · есть, не пересмотрено ${tally.unreviewed} · не начато ${tally.missing} · ждёт заказчика ${tally.owner}`)
    if (next) console.log(`  Следующий подэтап: ${next.layer}. ${next.name} — пересмотреть против ${next.basis ?? 'исследования (docs/layers.md, §2; пороги — tools/thresholds.mjs)'}`)
  }

  const problems = gateProblems(stage)
  const unfinished = stepProblems(stage)
  const next = STAGES.find((s) => s.n === stage.n + 1)
  console.log('\n  Машинный храповик (держится после каждой правки):')
  for (const p of problems) line('✗', p)
  if (!problems.length && stage.gate.machine.length) line('✓', 'всё, что меряется, держится')

  console.log(`\n  Условия перехода${next ? ` к ${title(next)}` : ''}:`)
  for (const p of unfinished) line('✗', p)
  if (!unfinished.length) line('✓', 'все измеримые шаги этапа на месте')
  for (const h of stage.gate.human.mine) line(confirmed(h) ? '✓' : '□', `${h}   ${confirmed(h) ? '(посмотрел — docs/gate.md)' : '(смотрю я)'}`)
  for (const h of stage.gate.human.owner) line(confirmed(h) ? '✓' : '□', `${h}   ${confirmed(h) ? '(подтверждено — docs/gate.md)' : '(РЕШАЕТ ЗАКАЗЧИК)'}`)

  if (stage.parked.length) {
    console.log('\n  Просыпается на этом этапе:')
    for (const p of stage.parked) {
      line('·', `${p.name} — ${p.url}`)
      console.log(`      ${p.take}`)
    }
  }
}

/* ── вся карта ─────────────────────────────────────────────────────────── */
if (arg('--all')) {
  console.log('Этапы производства сайта — порядок ВОРОТ, а не работ.')
  for (const s of STAGES) brief(s, { full: true })
  console.log('\nВсегда, на любом этапе:')
  for (const a of ALWAYS) line('·', a)
  console.log('\nСпит, ждёт механики (не этапа):')
  for (const p of PLATFORM) {
    line(p.awake() ? '⚠' : '·', `${p.name}${p.awake() ? ' — ПРОСНУЛСЯ' : ''}`)
    console.log(`      ${p.sleeps}`)
    console.log(`      ${p.take}`)
  }
  process.exit(0)
}

/* ── текущий этап ──────────────────────────────────────────────────────── */
const stage = currentStage()
if (!stage) {
  console.error('\n✗ В CLAUDE.md нет строки этапа. Добавьте одну — например:')
  console.error('    Этап производства: **0 · Основание**')
  console.error(`  Этапы: ${STAGES.map(title).join(' · ')}`)
  console.error('  Это одно место, где записано, где проект находится; его читают')
  console.error('  и модель в начале сессии, и эта проверка.')
  process.exit(1)
}

/* ── ворота: пройденное держится ───────────────────────────────────────── */
if (arg('--gate')) {
  let failed = false
  for (const s of STAGES.filter((s) => s.n < stage.n)) {
    const problems = transitionProblems(s)
    if (problems.length) {
      failed = true
      console.error(`\n✗ ${title(s)} — пройденные ворота не держатся:`)
      for (const p of problems) console.error(`    ${p}`)
    } else {
      console.log(`✓ ${title(s)} держится`)
    }
  }
  const now = transitionProblems(stage)
  /* В счёт идёт неподтверждённое: то, что записано в docs/gate.md, уже
     посмотрено — и спрашивать это заново значит спрашивать дважды (И209). */
  const mine = stage.gate.human.mine.filter((h) => !confirmed(h))
  const owner = stage.gate.human.owner.filter((h) => !confirmed(h))
  console.log(`· ${title(stage)} — текущий; до перехода: ${now.length ? now.length + ' пункт(а) машиной' : 'машиной всё'}${mine.length ? ` + ${mine.length} смотрю я` : ''}${owner.length ? ` + ${owner.length} решает заказчик` : ''}${!mine.length && !owner.length && !now.length ? ' — ворота пройдены' : ''}`)
  for (const p of PLATFORM) if (p.awake()) {
    console.log(`⚠ проснулся скилл платформы: ${p.name}\n    ${p.take}`)
  }
  if (failed) {
    console.error('\nЭтап нельзя считать пройденным, если его ворота перестали держаться.')
    console.error(`Либо чините, либо — если это осознанное решение — верните строку этапа в ${relative(ROOT, 'CLAUDE.md') || 'CLAUDE.md'} назад.`)
    process.exit(1)
  }
  process.exit(0)
}

/* ── брифинг ───────────────────────────────────────────────────────────── */
brief(stage)

const passed = STAGES.filter((s) => s.n < stage.n)
if (passed.length) {
  const broken = passed.filter((s) => transitionProblems(s).length)
  console.log(`\n  Пройдено: ${passed.map((s) => `${title(s)} ${transitionProblems(s).length ? '✗' : '✓'}`).join(', ')}`)
  if (broken.length) console.log('  ✗ пройденные ворота не держатся — npm run check:stage покажет, что именно')
}

const later = STAGES.filter((s) => s.n > stage.n && s.parked.length)
if (later.length) {
  console.log('\n  Ждёт своего дня (не ставится, пока не настал):')
  for (const s of later) for (const p of s.parked) line('·', `${title(s)} — ${p.name}`)
}

console.log('\n  Спит, ждёт механики:')
for (const p of PLATFORM) line(p.awake() ? '⚠' : '·', `${p.name}${p.awake() ? ' — ПРОСНУЛСЯ: ' + p.take : ' — ' + p.sleeps}`)

console.log('\n  Всегда: ' + ALWAYS.join('; '))
console.log('\n  Вся карта: npm run stage -- --all')
