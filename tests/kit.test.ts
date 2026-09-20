/**
 * Обещания набора живы: шкалы, примитивы, имена слоёв.
 *
 * Это тест-образец, и он едет в каждый новый проект вместе с набором. Две
 * работы сразу.
 *
 * Первая — показать, как тут пишут тесты, на чём-то настоящем, а не на
 * `1 + 1 === 2`.
 *
 * Вторая — важнее. Правила набора ссылаются на файлы: «размер берётся из
 * шкалы», «раскладку не пишут заново — её берут», «номер слоя имеет имя».
 * Файл можно вычистить, переписать или не довезти — и правило останется
 * ссылкой в пустоту, а проверки будут зелёными: они считают нарушения, а не
 * наличие того, чем нарушение лечится.
 *
 * Заведено по счёту: `styles/base.css` не переезжал в новые проекты по
 * недосмотру, и правила переноса строк жили только здесь.
 *
 *   npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const read = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const tokens = read('styles/tokens.css')
const primitives = read('styles/primitives.module.css')

/* Ищется ОБЪЯВЛЕНИЕ, а не подстрока. Первая редакция этого файла спрашивала
   `tokens.includes('--fs-lead')` — и переименование ступени в `--fs-leadX`
   она проходила молча: подстрока-то на месте. Тест, который нельзя
   уронить, ничего и не сторожит; проверено нарочной поломкой. */
const declared = (name: string): boolean =>
  new RegExp(`^\\s*${name}\\s*:`, 'm').test(tokens)

test('шкала размера объявлена и течёт', () => {
  for (const name of ['--fs-xs', '--fs-sm', '--fs-base', '--fs-lead', '--fs-h3', '--fs-h2', '--fs-h1']) {
    assert.ok(declared(name), `в шкале нет ступени ${name}`)
  }
  /* Течёт — значит clamp(): размер меняется вместе с шириной окна, а не
     переключается ступенями на медиазапросах. Без этого шкала есть, а
     запрет «font-size в пикселях» лечить нечем. */
  const scale = tokens.slice(tokens.indexOf('--fs-xs'), tokens.indexOf('--fs-h1'))
  assert.ok(scale.includes('clamp('), 'шкала размера объявлена без clamp() — она не течёт')
})

test('шкала управления объявлена и НЕ течёт', () => {
  /* Вторая шкала — для шапки, чекмедже и нижней панели. Надпись внутри
     контрола не уменьшается вместе с окном: пункт меню — мишень для
     пальца, а не абзац. Полоса «Free delivery over €50» на телефоне
     стекала до 12.5px, и заказчик нашёл это глазом. */
  for (const name of ['--fs-ui-2xs', '--fs-ui-xs', '--fs-ui-sm', '--fs-ui-base', '--fs-ui-xl', '--fs-ui-2xl']) {
    assert.ok(declared(name), `в шкале управления нет ступени ${name}`)
  }
  const ui = tokens.slice(tokens.indexOf('--fs-ui-2xs'), tokens.indexOf('--fs-ui-2xl'))
  assert.ok(!ui.includes('clamp('), 'шкала управления течёт — а она не должна')
})

test('ритм объявлен ступенями, а не числами на месте', () => {
  for (let i = 1; i <= 9; i++) {
    assert.ok(declared(`--sp-${i}`), `в ритме нет ступени --sp-${i}`)
  }
})

test('поле — в rem, зазор между целями — свой токен и под пальцем вдвое больше', () => {
  /* И186: поле лежит вокруг букв и растёт вместе со шрифтом, который
     покупатель поднял в телефоне; px этого не умеет. */
  for (const name of ['--pad-sheet', '--pad-card', '--pad-inner']) {
    const m = tokens.match(new RegExp(`^\\s*${name}\\s*:\\s*([^;]+);`, 'm'))
    assert.ok(m, `в шкале нет поля ${name}`)
    assert.ok(/rem\b/.test(m![1]!) && !/\dpx\b/.test(m![1]!.replace(/var\([^)]*\)/g, '')),
      `${name} объявлено не в rem: ${m![1]!.trim()}`)
  }
  /* И188: цель под палец — ещё не ряд целей; зазор — свой токен. */
  assert.ok(declared('--gap-targets'), 'нет токена --gap-targets')
  const coarse = tokens.match(/@media\s*\(pointer\s*:\s*coarse\)\s*\{\s*:root\s*\{([^}]*)\}/)
  assert.ok(coarse && /--gap-targets\s*:/.test(coarse[1]!), 'под пальцем у --gap-targets нет своего значения')
})

test('примитивы раскладки на месте', () => {
  for (const name of ['stack', 'cluster', 'switcher', 'rail', 'prose', 'lede', 'pinned']) {
    assert.ok(new RegExp(`^\\.${name}\\b`, 'm').test(primitives), `нет примитива ${name}`)
  }
})

test('у постоянных слоёв есть имена, а не номера', () => {
  /* Их пять и они не открываются: шапка, нижняя полоса, помощник,
     всплывающее сообщение, ссылка «к содержимому». Всё остальное уходит в
     верхний слой браузера, где порядок решает не число. */
  const named = [...tokens.matchAll(/^\s*(--layer-[a-z-]+)\s*:/gm)].map((m) => m[1])
  assert.ok(named.length >= 5, `имён слоёв всего ${named.length}, а постоянных слоёв пять`)
})

/* Переносимость — обещание того же рода, и ломается оно так же тихо.
 *
 * Правило говорит: всё, что производим, становится на разный движок. Его
 * держит `check:port` — а проверка считает НАРУШЕНИЯ, и на проекте, куда
 * её не довезли или где база забыла половину семей, она честно напечатает
 * ноль. Ноль, означающий «не проверено», неотличим от нуля, означающего
 * «чисто»: ровно тот молчаливо неполный замер, ради которого и написан
 * этот файл. */
test('переносимость меряется, и база знает все семьи', () => {
  /* Список читается ТЕКСТОМ, а не импортом: `tools/*.mjs` живут без типов,
     и `import` отсюда валит `tsc` — а вместе с ним и сборку, потому что
     Next проверяет типы проектом целиком. Замечено большой проверкой в тот
     же час, когда этот тест был написан. */
  const families = [...read('tools/port-families.mjs')
    .matchAll(/'([a-zA-Z]+)',?/g)].map((m) => m[1])
  const base = JSON.parse(read('tools/port-baseline.json')) as Record<string, number>
  assert.ok(families.length >= 6, 'список семей переносимости не прочитался')
  for (const family of families) {
    assert.ok(family in base, `в базе переносимости нет семьи ${family}`)
  }
  assert.equal(Object.keys(base).length, families.length,
    'в базе переносимости есть лишняя семья — значит, список разошёлся с проверкой')
})

test('набор везёт проверку переносимости и большую проверку', () => {
  const kit = read('tools/kit.mjs')
  for (const file of ['tools/check-port.mjs', 'tools/port-families.mjs', 'tools/check-all.mjs']) {
    assert.ok(kit.includes(file), `набор не везёт ${file} — правило уедет без того, чем оно меряется`)
  }
})

/* У проверки есть человеческое имя — иначе она существует только для агента.
 *
 * Заказчик сказал: «я эти проверки не запомню, они должны срабатывать от
 * моего произвольного написания». Механизм для этого — реестр
 * `tools/checks.mjs`: имя словами и слова-приметы, по которым проверка
 * узнаётся в обычной фразе. Но реестр, который забыли пополнить, хуже
 * отсутствующего: хук молчит, и заказчику кажется, что проверки нет.
 *
 * Поэтому: каждая команда, которую этап называет в своих проверках, обязана
 * быть в реестре. Тест падает в тот день, когда заведена новая проверка и
 * забыто имя для неё. */
test('каждая проверка этапа названа словами в реестре', () => {
  const registry = read('tools/checks.mjs')
  const named = new Set([...registry.matchAll(/cmd:\s*'([^']+)'/g)].map((m) => m[1]))
  const staged = new Set(
    [...read('tools/stages.mjs').matchAll(/checks:\s*\[([^\]]*)\]/g)]
      .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])),
  )
  assert.ok(staged.size >= 5, 'списки проверок этапов не прочитались')
  for (const cmd of staged) {
    assert.ok(named.has(cmd), `проверка ${cmd} есть у этапа, но не названа словами в tools/checks.mjs`)
  }
})

/* Инструмент, который никто не запускает, ломается молча.
 *
 * Заведено по счёту, и счёт свежий: в `tools/kit.mjs` README набора лежит
 * шаблонной строкой, и в неё добавили слово в обратных кавычках. Кавычка
 * закрыла строку — файл перестал разбираться вовсе. Ни одна проверка этого
 * не заметила: сборщик набора не стоит ни в цепочке, ни в CI, и узнать о
 * поломке можно было только запустив его руками. То есть набор, который
 * «переживает конец проекта», не собрался бы в день, когда понадобился.
 *
 * Разбор — не запуск: `node --check` читает файл и ничего не выполняет,
 * поэтому сборщик здесь не соберёт ничего лишнего. */
test('инструменты в tools/ разбираются', () => {
  const dir = new URL('../tools/', import.meta.url)
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs'))
  assert.ok(files.length > 10, 'инструменты не нашлись')
  for (const file of files) {
    const r = spawnSync(process.execPath, ['--check', new URL(file, dir).pathname], { encoding: 'utf8' })
    assert.equal(r.status, 0, `tools/${file} не разбирается:\n${r.stderr}`)
  }
})

/* Список семей у проверки и у набора — один.
 *
 * Заведено по счёту, и счёт третий. Сборщик набора пишет новому проекту
 * пустую базу, и список семей в ней был вторым экземпляром: у проверки кода
 * он разошёлся первым, у проверки вёрстки вторым, у отрисованной — третьим,
 * и там разница была девять семей против тридцати одной. Новый проект
 * получал файл, молчащий о двух третях того, что меряется, — и проверка на
 * нём была зелёной именно поэтому.
 *
 * Тест сверяет не «файлы существуют», а РАВЕНСТВО списков: имена семей в
 * самой проверке (её таблица человеческих имён) и в файле, который отдаётся
 * набору. */
test('семьи проверок названы в одном месте', () => {
  /* Список читается ТЕКСТОМ, а не ввозом: файлы набора — обычные `.mjs` без
     объявлений типов, и ввоз ради трёх имён потребовал бы их сочинить. */
  const listOf = (file: string): string[] => {
    const src = read(`tools/${file}`)
    const m = src.match(/export const [A-Z_]+ = \[([\s\S]*?)\]/)
    assert.ok(m, `в tools/${file} не нашёлся список семей`)
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
  }
  const pairs: Array<[string, string]> = [
    ['check-css.mjs', 'css-families.mjs'],
    ['check-code.mjs', 'code-families.mjs'],
    ['check-craft.mjs', 'craft-families.mjs'],
  ]
  for (const [check, list] of pairs) {
    const families = listOf(list)
    /* Подписи семей живут В РЕЕСТРЕ (`*_LABELS`), проверка их ввозит: так
       подпись одна и на отчёт проверки, и на таблицу в скилле, которую
       `check:rules --tables` собирает из того же реестра. Своя таблица в
       проверке — вторая копия, и тест её не разрешает. */
    const reg = read(`tools/${list}`)
    const at = reg.indexOf('_LABELS = {')
    assert.ok(at > 0, `в tools/${list} не нашлась таблица подписей семей (*_LABELS)`)
    const block = reg.slice(at, reg.indexOf('\n}\n', at))
    const named = [...block.matchAll(/^ {2}([A-Za-z][\w]*):/gm)].map((m) => m[1])
    assert.deepEqual(
      [...named].sort(), [...families].sort(),
      `списки семей разошлись: подписи против имён в tools/${list}`,
    )
    const src = read(`tools/${check}`)
    assert.ok(!/const NAMES = \{/.test(src), `tools/${check} держит свою таблицу подписей — вторая копия реестра`)
    assert.ok(/_LABELS as NAMES/.test(src), `tools/${check} не ввозит подписи из tools/${list}`)
  }
})

/* И189, И190: сторож палитры меряет ход лестницы и красную шкалу. Набор,
   у которого краска светлее контролов, должен покраснеть в обеих темах;
   образцы самопроверки — пройти. */
test('палитра: схлопнувшаяся лестница — находка, образцы проходят', () => {
  const tool = new URL('../tools/check-palette.mjs', import.meta.url).pathname
  const clean = spawnSync(process.execPath, [tool, '--json'], { encoding: 'utf8' })
  const ok = JSON.parse(clean.stdout)
  assert.equal(clean.status, 0, 'образцы самопроверки должны проходить')
  assert.ok(ok.report.every((r: { findings: unknown[] }) => r.findings.length === 0))

  const dir = mkdtempSync(join(tmpdir(), 'palette-'))
  mkdirSync(join(dir, 'styles'))
  writeFileSync(join(dir, 'styles', 'palette.json'), JSON.stringify({
    'краска светлее контролов': {
      light: { paper: '#FFFFFF', ink: '#222222', accent: '#F3EEDC', error: '#B3261E' },
      dark: { paper: '#111111', ink: '#EEEEEE', accent: '#F7F7F2', error: '#E5484D' },
    },
  }))
  const bad = spawnSync(process.execPath, [tool, '--json'], { cwd: dir, encoding: 'utf8' })
  assert.equal(bad.status, 1)
  const rules = JSON.parse(bad.stdout).report.map((r: { mode: string; findings: { rule: string }[] }) =>
    [r.mode, r.findings.map((f) => f.rule)])
  for (const [mode, found] of rules) {
    assert.ok(found.includes('фирменная лестница не схлопывается'), `${mode}: лестница схлопнулась, а сторож молчит`)
  }
})
