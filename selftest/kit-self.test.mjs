/**
 * Тесты о самом наборе, а не о поставленном сайте.
 *
 * Четыре проверки ниже смотрят на вещи, которых на поставленном сайте
 * никогда не будет: образцы палитры набора (`templates/palette.json`) и
 * собственные ворота набора (`docs/gate.md`). Раньше они стояли в
 * `tests/kit.test.ts` — а этот файл едет на КАЖДЫЙ новый сайт и гоняется
 * его собственным `npm test`. Первая же установка витрины (`--storefront`)
 * прогнала `npm test` на поставленном сайте и упала: `templates/palette.json`
 * на сайте не существует (ставщик его туда не кладёт — заготовки не
 * содержимое проекта), а `docs/gate.md` сайта — это шаблон, а не ворота
 * самого набора. Перенесены сюда, в `selftest/`, потому что `selftest/` на
 * сайт не едет (И253).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/* Файл-пример проверяется сам, а не на честное слово: сторож смотрит в
   styles/palette.json приложения, которого в наборе нет.
   До 20.09.2026 находка была ровно одна и записана в palette.md: у «Тёплого
   листа» терракотовая марка стояла в 18.9 ΔE от общего красного при норме
   25. Пока красный был записан в каждом наборе, чинить её было некуда —
   правка в одном наборе ничего не говорила об остальных. Как только
   постоянные уехали в строитель (И216), у набора появилось право назвать
   СВОЙ красный, и находка закрылась: образцы чисты. */
test('наборы-образцы: находок нет', () => {
  const tool = fileURLToPath(new URL('../tools/check-palette.mjs', import.meta.url))
  const dir = mkdtempSync(join(tmpdir(), 'palette-template-'))
  mkdirSync(join(dir, 'styles'))
  writeFileSync(
    join(dir, 'styles', 'palette.json'),
    readFileSync(fileURLToPath(new URL('../templates/palette.json', import.meta.url)), 'utf8'),
  )
  const run = spawnSync(process.execPath, [tool, '--json'], { cwd: dir, encoding: 'utf8' })
  const report = JSON.parse(run.stdout).report
  assert.ok(report.length >= 14, 'наборов в файле стало меньше семи — проверять нечего')
  const found = report.flatMap((r) => r.findings.map((f) => `${r.name} · ${r.mode} · ${f.rule}`))
  assert.deepEqual(found, [], 'образец перестал быть образцом: по нему есть находки')
})

/* И209: пункт ворот, который смотрят глазами, живёт ровно до конца сессии.
   Заказчик сказал «подтверждаю» — записать это было некуда, и следующая
   сессия спросила бы снова. */

test('подтверждённый пункт ворот читается из файла, а переписанный — нет', async () => {
  const { confirmed } = await import('../tools/stages.mjs')
  const said = 'набор цвета показан заказчику отрисованным — не кодами, а кнопкой, которую он нажал'
  assert.ok(confirmed(said), 'слово заказчика записано, а ворота его не видят')
  /* Переписали пункт — подтверждение лапается: другой вопрос требует
     другого ответа. */
  assert.ok(!confirmed(said + ' дважды'), 'подтверждение засчитано не тому пункту')
  assert.ok(!confirmed('пункт, которого никто не подтверждал'), 'засчитано неподтверждённое')
})

/* И216: набор — это ТРИ краски на тему. Если в
   образце снова появится записанный рукой оранжевый или зелёный, значит
   постоянная опять расползлась по файлам. */
test('образцы называют рукой три краски, а постоянные берут из строителя', () => {
  const образцы = JSON.parse(
    readFileSync(fileURLToPath(new URL('../templates/palette.json', import.meta.url)), 'utf8'))
  const лишние = []
  for (const [имя, набор] of Object.entries(образцы)) {
    for (const тема of ['light', 'dark']) {
      for (const роль of ['warn', 'ok']) {
        if (набор[тема][роль]) лишние.push(`${имя} · ${тема} · ${роль}`)
      }
    }
  }
  assert.deepEqual(лишние, [], `постоянная краска снова записана в наборе: ${лишние.join(', ')}`)
})

/* Строитель палитры глазами (заказчик 20.09.2026: «покажи мне работу твою,
   как формируется палитра цвета»). Демонстрация честна, только пока в ней
   тот же строитель, что красит сайт: тест ищет в выпущенной странице
   функции `palette.mjs`, слепок пород и каждый набор — и не находит
   ввоза из node, который в браузере не запустится. */
test('строитель палитры показывает работу тем же кодом, что красит сайт', () => {
  const корень = fileURLToPath(new URL('..', import.meta.url))
  const dir = mkdtempSync(join(tmpdir(), 'builder-'))
  const out = join(dir, 'строитель.html')
  const r = spawnSync(process.execPath, [join(корень, 'tools/palette-builder.mjs'), out],
    { encoding: 'utf8', cwd: корень })
  assert.equal(r.status, 0, r.stderr)

  const html = readFileSync(out, 'utf8')
  assert.match(html, /<title>Строитель палитры<\/title>/, 'у страницы нет имени')
  for (const fn of ['function scale(', 'function roles(', 'function auditPalette(', 'function saleFrom(', 'const apca =', 'const PROFILE_JSON =']) {
    assert.ok(html.includes(fn), `в странице нет строителя: ${fn}`)
  }
  assert.ok(!/\bfrom 'node:/.test(html), 'в страницу уехал ввоз из node — в браузере не запустится')

  const наборы = {
    ...JSON.parse(readFileSync(join(корень, 'styles/palette.json'), 'utf8')),
    ...JSON.parse(readFileSync(join(корень, 'templates/palette.json'), 'utf8')),
  }
  const нет = Object.keys(наборы).filter((имя) => !html.includes(JSON.stringify(имя)))
  assert.deepEqual(нет, [], `на странице нет наборов: ${нет.join(', ')}`)
  rmSync(dir, { recursive: true, force: true })

  /* Выпущенный образец в наборе — чтобы открыть без запуска — обязан
     совпадать со строителем байт в байт: иначе это копия, которая врёт. */
  const образец = join(корень, 'templates/palette-builder.html')
  if (existsSync(образец)) {
    const c = spawnSync(process.execPath, [join(корень, 'tools/palette-builder.mjs'), '--check', образец],
      { encoding: 'utf8', cwd: корень })
    assert.equal(c.status, 0, c.stderr || c.stdout)
  }
})

/* Набор, собранный `tools/kit.mjs`, везёт каждый ввоз своих инструментов.
   Дефект — итоговый разбор плана 2 витрины: список `FILES` не знал
   `sessions.mjs`, `browser.mjs`, `pages.mjs` и `words.mjs`, и в собранном
   наборе `check:craft`, `sweep`, `shade`, `check-urls`, `check-seo`,
   `routes` и `stages` падали на первом же ввозе. Список набирается рукой, и
   ввоз, добавленный в инструмент, в него сам не попадает; поэтому меряется
   собранное: каждый `from './x.mjs'` каждого файла набора ведёт в файл,
   который набор положил, и каждое ввезённое по имени этот файл отдаёт
   (записанный набором `sheet-samples.mjs` отставал от настоящего на одно
   имя). */
test('собранный набор везёт каждый ввоз своих инструментов, по файлу и по имени', () => {
  const корень = fileURLToPath(new URL('..', import.meta.url))
  const dir = mkdtempSync(join(tmpdir(), 'kit-build-'))
  try {
    const out = join(dir, 'kit')
    const r = spawnSync(process.execPath, [join(корень, 'tools/kit.mjs'), out], { encoding: 'utf8', cwd: корень })
    assert.equal(r.status, 0, r.stderr)
    const IMPORT = /^[ \t]*(?:import|export)\b([^'"`;]*?)\bfrom\s*['"](\.\.?\/[^'"]+\.mjs)['"]/gm
    const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === 'node_modules' || e.name.startsWith('.') ? [] : walk(join(d, e.name)))
      : e.name.endsWith('.mjs') ? [join(d, e.name)] : [])
    const exportsOf = (text) => new Set([
      ...[...text.matchAll(/^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([\w$]+)/gm)].map((m) => m[1]),
      ...[...text.matchAll(/^export\s*\{([^}]*)\}/gm)].flatMap((m) => m[1].split(',').map((x) => x.trim().split(/\s+as\s+/).pop()).filter(Boolean)),
    ])
    const нет = []
    let ввозов = 0
    for (const file of walk(out)) {
      for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
        ввозов++
        const target = join(dirname(file), m[2])
        const where = `${relative(out, file).split('\\').join('/')} → ${m[2]}`
        if (!existsSync(target)) { нет.push(`${where}: файла нет в наборе`); continue }
        const names = /\{([^}]*)\}/.exec(m[1])?.[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean) ?? []
        const есть = exportsOf(readFileSync(target, 'utf8'))
        for (const name of names) if (!есть.has(name)) нет.push(`${where}: нет «${name}»`)
      }
    }
    assert.ok(ввозов > 40, `ввозов найдено ${ввозов} — разбор сломан, мерить нечего`)
    assert.deepEqual(нет, [], `собранный набор не везёт то, что ввозят его инструменты:\n  ${нет.join('\n  ')}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
