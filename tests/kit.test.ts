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
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const read = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const tokens = read('styles/tokens.css')
/* Лестница размера и ритма с 21.09.2026 не набирается рукой, а выпускается
   строителем из `styles/scale.json` (И202). Тесты, оставшиеся на одном
   `tokens.css`, после переезда не покраснели бы — они бы перестали что-либо
   сторожить, а это хуже: ступень можно вынуть, и никто не заметит. */
const ladderCss = read('styles/scale.css')
const primitives = read('styles/primitives.module.css')

/* Ищется ОБЪЯВЛЕНИЕ, а не подстрока. Первая редакция этого файла спрашивала
   `tokens.includes('--fs-lead')` — и переименование ступени в `--fs-leadX`
   она проходила молча: подстрока-то на месте. Тест, который нельзя
   уронить, ничего и не сторожит; проверено нарочной поломкой. */
const declared = (name: string): boolean =>
  new RegExp(`^\\s*${name}\\s*:`, 'm').test(tokens + '\n' + ladderCss)

test('шкала размера объявлена и течёт', () => {
  for (const name of ['--fs-xs', '--fs-sm', '--fs-base', '--intro-size', '--fs-h3', '--fs-h2', '--hero-size']) {
    assert.ok(declared(name), `в шкале нет ступени ${name}`)
  }
  /* Течёт — значит clamp(): размер меняется вместе с шириной окна, а не
     переключается ступенями на медиазапросах. Без этого шкала есть, а
     запрет «font-size в пикселях» лечить нечем. */
  const scale = ladderCss.slice(ladderCss.indexOf('--fs-xs'), ladderCss.indexOf('--sp-1'))
  assert.ok(scale.includes('clamp('), 'шкала размера объявлена без clamp() — она не течёт')
})

test('шкала управления объявлена и НЕ течёт', () => {
  /* Вторая шкала — для шапки, чекмедже и нижней панели. Надпись внутри
     контрола не уменьшается вместе с окном: пункт меню — мишень для
     пальца, а не абзац. Полоса «Free delivery over €50» на телефоне
     стекала до 12.5px, и заказчик нашёл это глазом. */
  /* С 20.09.2026 лестницу управления выпускает строитель: верхний конец
     каждой ступени размера, в px, ролью --ctrl-fs-* (И224). */
  for (const name of ['--ctrl-fs-xs', '--ctrl-fs-sm', '--ctrl-fs-base', '--ctrl-fs-h3', '--ctrl-fs-h2']) {
    assert.ok(declared(name), `в шкале управления нет ступени ${name}`)
  }
  const ui = ladderCss.slice(ladderCss.indexOf('--ctrl-fs-xs'), ladderCss.indexOf('--ctrl-fs-h2'))
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
    const m = ladderCss.match(new RegExp(`^\\s*${name}\\s*:\\s*([^;]+);`, 'm'))
    assert.ok(m, `в шкале нет поля ${name}`)
    assert.ok(/rem\b/.test(m![1]!) && !/\dpx\b/.test(m![1]!.replace(/var\([^)]*\)/g, '')),
      `${name} объявлено не в rem: ${m![1]!.trim()}`)
  }
  /* И188: цель под палец — ещё не ряд целей; зазор — свой токен. */
  assert.ok(declared('--gap-targets'), 'нет токена --gap-targets')
  const coarse = ladderCss.match(/@media\s*\(pointer\s*:\s*coarse\)\s*\{\s*:root\s*\{([^}]*)\}/)
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

/* Файл-пример проверяется сам, а не на честное слово: сторож смотрит в
   styles/palette.json приложения, которого в наборе нет.
   До 20.09.2026 находка была ровно одна и записана в palette.md: у «Тёплого
   листа» терракотовая марка стояла в 18.9 ΔE от общего красного при норме
   25. Пока красный был записан в каждом наборе, чинить её было некуда —
   правка в одном наборе ничего не говорила об остальных. Как только
   постоянные уехали в строитель (И216), у набора появилось право назвать
   СВОЙ красный, и находка закрылась: образцы чисты. */
test('наборы-образцы: находок нет', () => {
  const tool = new URL('../tools/check-palette.mjs', import.meta.url).pathname
  const dir = mkdtempSync(join(tmpdir(), 'palette-template-'))
  mkdirSync(join(dir, 'styles'))
  writeFileSync(
    join(dir, 'styles', 'palette.json'),
    readFileSync(new URL('../templates/palette.json', import.meta.url).pathname, 'utf8'),
  )
  const run = spawnSync(process.execPath, [tool, '--json'], { cwd: dir, encoding: 'utf8' })
  const report = JSON.parse(run.stdout).report as { name: string; mode: string; findings: { rule: string }[] }[]
  assert.ok(report.length >= 14, 'наборов в файле стало меньше семи — проверять нечего')
  const found = report.flatMap((r) => r.findings.map((f) => `${r.name} · ${r.mode} · ${f.rule}`))
  assert.deepEqual(found, [], 'образец перестал быть образцом: по нему есть находки')
})

/* И191: обещание эталона дано в APCA, и WCAG его не заменяет. Набор ниже
   выбран так, что WCAG на основном тексте МОЛЧИТ (запас есть), а APCA
   показывает 71.6 при обещанных 90 — ровно тот класс дефекта, из-за
   которого вторая метрика и заведена. */
test('палитра: APCA ловит то, о чём WCAG молчит', () => {
  const tool = new URL('../tools/check-palette.mjs', import.meta.url).pathname
  const dir = mkdtempSync(join(tmpdir(), 'palette-apca-'))
  mkdirSync(join(dir, 'styles'))
  writeFileSync(join(dir, 'styles', 'palette.json'), JSON.stringify({
    'чернила без запаса': {
      light: { paper: '#FFFFFF', ink: '#6E6E6E', accent: '#5F6B34', error: '#B3261E' },
      dark: { paper: '#111111', ink: '#EEEEEE', accent: '#5F6B34', error: '#E5484D' },
    },
  }))
  const run = spawnSync(process.execPath, [tool, '--json'], { cwd: dir, encoding: 'utf8' })
  assert.equal(run.status, 1)
  const light = JSON.parse(run.stdout).report
    .find((r: { mode: string }) => r.mode === 'light') as { findings: { rule: string; got: number }[] }
  const named = light.findings.map((f) => f.rule)
  assert.ok(
    !named.includes('основной текст на карточке'),
    'набор подобран так, что WCAG на основном тексте молчит — иначе тест не про APCA',
  )
  assert.ok(
    named.includes('основной текст держит обещание эталона'),
    'APCA ниже обещанных 90, а сторож молчит — вторая метрика не работает',
  )
})

/* И192: правило шкалы было записано, сторож считал двадцать правил — а
   покрасить сайт этим было нечем. Строитель считал двенадцать ступеней
   внутри проверки и выбрасывал, `check-palette.mjs` в проект не ехал
   вовсе, команды `palette` не существовало. Заказчик назвал это «нихуя не
   работает». Ниже — сторожа на каждое из трёх мест. */

test('палитра выпускается в CSS, и выпущенное сходится с красками', () => {
  const dir = mkdtempSync(join(tmpdir(), 'palette-css-'))
  mkdirSync(join(dir, 'styles'))
  writeFileSync(join(dir, 'styles', 'palette.json'), JSON.stringify({
    'проба': {
      light: { paper: '#FFFFFF', ink: '#231F18', accent: '#0C3A46', error: '#B3261E',
        sale: '#6A4CA8', warn: '#F76B15', ok: '#30A46C' },
      dark: { paper: '#141310', ink: '#EFECE7', accent: '#2E7C8F', error: '#E5484D',
        sale: '#6A4CA8', warn: '#F76B15', ok: '#30A46C' },
    },
  }))
  const tool = new URL('../tools/palette-css.mjs', import.meta.url).pathname
  const made = spawnSync(process.execPath, [tool], { cwd: dir, encoding: 'utf8' })
  assert.equal(made.status, 0, made.stderr)

  const css = readFileSync(join(dir, 'styles', 'palette.css'), 'utf8')
  /* Краски заказчика стоят там, где обещаны, а не рядом: до 21.09.2026
     первая ступень считалась из профиля, и белая бумага выходила #FDFDFD. */
  assert.match(css, /--n-1: light-dark\(#FFFFFF, #141310\);/, 'первая ступень — бумага как есть')
  assert.match(css, /--n-12: light-dark\(#231F18, #EFECE7\);/, 'двенадцатая — чернила как есть')
  assert.match(css, /--a-9: light-dark\(#0C3A46, #2E7C8F\);/, 'девятая — фирменный как есть')
  /* Считаемое — считается, а не хранится. */
  for (const name of ['--on-a-9', '--a-press', '--border', '--ring', '--line',
    '--sale-9', '--on-sale-9', '--warn-9', '--ok-9', '--e-9']) {
    assert.ok(css.includes(`${name}: light-dark(`), `в выпущенной палитре нет ${name}`)
  }

  /* Каждый набор стоит под своим именем — первый в том числе. Без этого
     переключатель не может к первому вернуться, а кружок с его краской в
     ленте выбора показывает тот набор, который сейчас включён (И198). */
  assert.match(css, /\[data-palette="проба"\]\{/, 'первый набор стоит только на корне')

  /* Отставший файл — находка. Иначе краски правят, а сайт красится старым. */
  assert.equal(spawnSync(process.execPath, [tool, '--check'], { cwd: dir }).status, 0)
  writeFileSync(join(dir, 'styles', 'palette.css'), '/* правка руками */\n')
  assert.equal(spawnSync(process.execPath, [tool, '--check'], { cwd: dir }).status, 1,
    'выпущенный файл разошёлся с красками, а проверка молчит')
})

test('шкалы набора без красок — находка, а не зелёная самопроверка', () => {
  const tool = new URL('../tools/check-palette.mjs', import.meta.url).pathname
  const dir = mkdtempSync(join(tmpdir(), 'palette-none-'))
  mkdirSync(join(dir, 'styles'))
  /* Чужой сайт со своими стилями: наших шкал нет — и спрашивать с него наш
     файл красок нечестно, проверка остаётся самопроверкой. */
  assert.equal(spawnSync(process.execPath, [tool], { cwd: dir }).status, 0)
  /* Шкалы набора стоят, красок нет — красить нечем, и это надо сказать. */
  writeFileSync(join(dir, 'styles', 'tokens.css'), ':root{--fs-1:1rem}\n')
  const bare = spawnSync(process.execPath, [tool], { cwd: dir, encoding: 'utf8' })
  assert.equal(bare.status, 1, 'набор стоит, красок нет, а проверка зелёная')
  assert.match(bare.stderr, /palette\.json/, 'проверка не назвала, чего не хватает')
})

/* И192: середина лестницы обесцвечивалась. Ступени 1–8 клались прямой от
   бумаги к краске, а прямая в sRGB между почти-серыми концами проходит
   через серое: у сине-зелёной марки шестая ступень держала 20% насыщенности
   заливки там, где эталон той же породы держит 52–58%. Середина лестницы —
   это ВСЕ поверхности магазина разом (карточка, плитка, контрол,
   разделитель), и тёплая марка давала серый сайт.

   Норма читается из слепка эталона, а не назначена: шестая ступень обязана
   держать хотя бы четыре пятых той доли, которую держит ближайшая по тону
   порода. Прямая даёт треть от неё и краснеет — проверено обратным ходом. */
test('палитра: середина лестницы держит тон марки', async () => {
  const { nearestFamily, oklch } = await import('../tools/palette.mjs')
  const profile = JSON.parse(read('tools/palette-profile.json'))
  const chroma = (hex: string): number => {
    const n = Number.parseInt(hex.slice(1), 16)
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
    const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
    const x = f((0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2]) / 0.95047)
    const y = f(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])
    const z = f((0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2]) / 1.08883)
    return Math.hypot(500 * (x - y), 200 * (y - z))
  }
  const accent = '#0C3A46'
  const dir = mkdtempSync(join(tmpdir(), 'palette-hue-'))
  mkdirSync(join(dir, 'styles'))
  writeFileSync(join(dir, 'styles', 'palette.json'), JSON.stringify({
    'холодная марка': {
      light: { paper: '#FFFFFF', ink: '#231F18', accent, error: '#B3261E' },
      dark: { paper: '#141310', ink: '#EFECE7', accent: '#2E7C8F', error: '#E5484D' },
    },
  }))
  spawnSync(process.execPath, [new URL('../tools/palette-css.mjs', import.meta.url).pathname],
    { cwd: dir })
  const css = readFileSync(join(dir, 'styles', 'palette.css'), 'utf8')
  const step = (name: string): string =>
    new RegExp(`${name}: light-dark\\((#[0-9A-F]{6})`).exec(css)![1]

  const family = nearestFamily(oklch(accent)[2], false, 'light')
  const arc = profile.scales[family].light.chroma
  const want = (arc[5] / arc[8]) * 0.8
  const got = chroma(step('--a-6')) / chroma(step('--a-9'))
  assert.ok(got >= want,
    `шестая ступень фирменного ряда обесцветилась: ${(got * 100).toFixed(0)}% ` +
    `от насыщенности заливки при ${(want * 100).toFixed(0)}% по породе «${family}»`)
})

/* Скидка, «мало осталось» и «в наличии» появились 21.09.2026 по вопросу
   заказчика: «есть же плашка скидки — она какого цвета?». Краска была у
   двух состояний из пяти, и обе только текстом. */
test('палитра: пять красок сигналов меряются попарно', () => {
  const tool = new URL('../tools/check-palette.mjs', import.meta.url).pathname
  const dir = mkdtempSync(join(tmpdir(), 'palette-signals-'))
  mkdirSync(join(dir, 'styles'))
  writeFileSync(join(dir, 'styles', 'palette.json'), JSON.stringify({
    'скидка цвета марки': {
      light: { paper: '#FFFFFF', ink: '#231F18', accent: '#0C3A46', error: '#B3261E',
        sale: '#0E3E4A', warn: '#F76B15', ok: '#30A46C' },
      dark: { paper: '#141310', ink: '#EFECE7', accent: '#2E7C8F', error: '#E5484D',
        sale: '#6A4CA8', warn: '#F76B15', ok: '#30A46C' },
    },
  }))
  const run = spawnSync(process.execPath, [tool, '--json'], { cwd: dir, encoding: 'utf8' })
  assert.equal(run.status, 1, 'плашка скидки цвета кнопки покупки, а сторож молчит')
  const light = JSON.parse(run.stdout).report
    .find((r: { mode: string }) => r.mode === 'light') as { findings: { rule: string }[] }
  assert.ok(
    light.findings.some((f) => f.rule.includes('фирменный и плашка скидки')),
    `сторож не назвал совпадение марки и скидки: ${light.findings.map((f) => f.rule).join(', ')}`,
  )
})

/* Шкалы набора читают палитру переменной, а не числом. Переменная, которой
   в выпущенной палитре нет, — это цвет, которого на странице не будет:
   var() без значения не красит ничем, и увидит это только глаз.

   Имена палитры узнаются по форме, а не по списку: ступень — это ряд и
   номер (`--a-10`), знак на заливке — `--on-<ряд>-9`, и три роли замера
   стоят своими словами. Список пришлось бы держать в двух местах. */
const PALETTE_NAME =
  /^--(?:(?:n|a|e|sale|warn|ok)-(?:\d{1,2}|press)|on-(?:a|e|sale|warn|ok)-9|line|border|ring)$/

test('шкалы читают палитру, и палитра даёт всё, о чём они просят', () => {
  const palette = new Set(
    Array.from(read('styles/palette.css').matchAll(/^\s*(--[\w-]+)\s*:/gm), (m) => m[1]),
  )
  assert.ok(palette.size > 30, 'выпущенная палитра почти пуста — красить нечем')

  const asked = new Set<string>()
  for (const file of ['styles/tokens.css', 'styles/base.css', 'styles/primitives.module.css']) {
    for (const m of read(file).matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (PALETTE_NAME.test(m[1])) asked.add(m[1])
    }
  }
  /* Их было ноль: закон о шкале жил отдельно от красок сайта, и это и есть
     «правила записаны, а работать нечем» (И192). */
  assert.ok(asked.size >= 8, `шкалы читают у палитры только ${asked.size} красок — цвет вернулся числами`)

  const lost = [...asked].filter((name) => !palette.has(name)).sort()
  assert.deepEqual(lost, [], 'шкалы просят у палитры краску, которой она не выпускает')
})

/* И202: шкалы размера и ритма стояли в `styles/tokens.css` набранными
   рукой, а формула к ним — словами в комментарии рядом. Формула, живущая
   словами, исполняется головой: у `--sp-11` свободный член оказался списан
   у `--sp-9`, и ступень, обещавшая 100 пикселей на макете, доходила там до
   93. Ниже — сторожа на каждое место, где это может повториться. */

test('строитель считает ту же рампу, что стояла руками', async () => {
  const { ramp } = await import('../tools/scale.mjs')
  /* Двадцать семь рамп из двадцати восьми строитель повторил знак в знак —
     это и есть доказательство, что он не завёл вторую шкалу чисел, а взял
     ту же формулу. Четыре характерных здесь: константа, обе единицы и
     целый наклон. */
  assert.equal(ramp([4, 4], [560, 1080]), '4px')
  assert.equal(ramp([10, 12], [560, 1080]), 'clamp(10px, 7.85px + .38vw, 12px)')
  assert.equal(ramp([16.5, 18], [560, 1080]), 'clamp(16.5px, 14.88px + .29vw, 18px)')
  assert.equal(ramp([22, 48], [560, 1080], 'rem'), 'clamp(1.375rem, -.375rem + 5vw, 3rem)')
})

test('рампа, не доходящая до своих концов, — находка', async () => {
  const { missesEnds } = await import('../tools/scale.mjs')
  /* Ровно то, что стояло в файле до строителя. Глазом не видно: числа
     правдоподобные, — подстановкой видно сразу. */
  assert.match(String(missesEnds('clamp(64px, 30.77px + 5.77vw, 100px)', [560, 1080])),
    /1080px даёт 93/, 'списанный свободный член прошёл незамеченным')
  assert.equal(missesEnds('clamp(64px, 25.23px + 6.92vw, 100px)', [560, 1080]), null,
    'посчитанная рампа объявлена дефектной')
})

test('лестница, сошедшаяся в одну точку, — находка', async () => {
  const { auditScale } = await import('../tools/scale.mjs')
  const set = {
    ширины: [560, 1080],
    размер: { sm: [15.5, 16], base: [16.5, 18] },
    ритм: { 1: [4, 4], 10: [56, 80] },
    поле: { card: [18, 22] },
    воздух: { page: 10 },
    зазор: { targets: [8, 16] },
  }
  const names = auditScale(set).map((f: { rule: string }) => f.rule)
  assert.ok(names.includes('ступени размера различимы'), `ступени в 6% приняты за две роли: ${names.join(', ')}`)
  /* Обратным ходом: развели — молчит. */
  set.размер.sm = [15, 16]
  assert.deepEqual(auditScale(set), [], 'разведённая лестница объявлена дефектной')
})

/* И221: набор пишется формулой — тело, отношение, множители, клетка, пары
   воздуха, — а не таблицей чисел, списанных у прошлого проекта. Прошлый
   набор держал ступени 10, 14, 18, 22, «кратные двум, но не четырём», и
   строитель клетку не сторожил, потому что «пришлось бы нарушить в день
   написания». Теперь ступень считается от тела и ложится на клетку сама. */
test('набор по формуле: ступени от тела, на клетке, воздух парой ступеней', async () => {
  const { resolve, auditScale } = await import('../tools/scale.mjs')
  const set = {
    ширины: [560, 1080], тело: [16, 18], отношение: [1.125, 1.2],
    размер: { xs: -2, sm: -1, base: 0, h3: 3, h2: 4 },
    ритм: { 1: 0.25, 2: 0.5, 3: 0.75, 4: 1, 5: 1.5, 6: 2, 7: 2.5, 8: 3, 9: 4, 10: 5 },
    поле: { card: '4' }, воздух: { page: ['9', '10'], row: '4' }, зазор: { targets: [8, 16] },
  }
  const r = resolve(set)
  assert.deepEqual(r.размер.base, [16, 18])
  assert.deepEqual(r.размер.h2, [25.5, 37.5], 'заголовок раздела не по отношению 1.125⁴ / 1.2⁴')
  assert.deepEqual(r.размер.xs, [12.5, 14], 'мелкий текст считается телефонным отношением на обоих концах')
  /* Клетка: 18 × 0.75 = 13.5 → 14 (клетка 2 до 16); 18 × 2.5 = 45 → 44 (клетка 4);
     18 × 5 = 90 → 88 (клетка 8 выше 64). Ступени не выше пола не текут. */
  assert.deepEqual(r.ритм['3'], [12, 14]); assert.deepEqual(r.ритм['7'], [40, 44]); assert.deepEqual(r.ритм['10'], [80, 88])
  assert.deepEqual(r.ритм['2'], [8, 8], 'ступень внутри органа потекла')
  assert.deepEqual(r.воздух.page.pair, [64, 88], 'пара ступеней: низ первой, верх второй')
  assert.deepEqual(r.поле.card.slice(), [16, 20])
  assert.deepEqual(auditScale(set), [], 'набор по формуле объявлен дефектным')

  /* Обратным ходом: число мимо клетки — находка; рост воздуха мимо коридора — находка. */
  const off = { ...set, ритм: { ...set.ритм, 5: [18, 22] } }
  assert.ok(auditScale(off).some((f: { rule: string }) => f.rule === 'клетка ритма'), 'ступень 18/22 мимо клетки принята')
  const flat = { ...set, воздух: { page: ['9', '9'] } }
  assert.equal(auditScale(flat).filter((f: { rule: string }) => f.rule === 'воздух растёт в коридоре').length, 0, 'воздух одной ступени спрошен за рост')
  const wide = { ...set, воздух: { page: ['7', '10'] } }
  assert.ok(auditScale(wide).some((f: { rule: string }) => f.rule === 'воздух растёт в коридоре'), 'воздух ×2.2 принят за замеренный коридор')
  /* Нормы нижнего конца: тело ниже 16 на телефоне — находка. */
  const small = { ...set, тело: [15, 18] }
  assert.ok(auditScale(small).some((f: { rule: string }) => f.rule === 'нижний конец по нормам'), 'тело 15 на телефоне принято')
})

/* И224: имя живёт по форме, по ярусу и по просителю. Ручка примитива `stack`
   и стек шрифтов на корне носили одно имя, и отступ примитива был нулём;
   узлы читали оттенок `--live-11` мимо роли, потому что семья hueDirect
   знала не все оттенки. Реестр разбирает имя и называет ярус; на нём стоят
   четыре семьи check:css. */
test('реестр имён: ярус по форме, слово по виду — не имя, ручка не на корне', async () => {
  const { parse, REQUIRED } = await import('../tools/names.mjs')
  const tier = (n: string) => parse(n)?.tier ?? null
  assert.equal(tier('--n-12'), 'value'); assert.equal(tier('--sp-4'), 'value'); assert.equal(tier('--fs-base'), 'value')
  assert.equal(tier('--ink-soft'), 'role'); assert.equal(tier('--pad-card'), 'role'); assert.equal(tier('--body-lead'), 'role')
  assert.equal(tier('--on-pop'), 'role'); assert.equal(tier('--hover-ctrl'), 'role'); assert.equal(tier('--ctrl-fs-sm'), 'role')
  assert.equal(tier('--stack'), 'node'); assert.equal(tier('--grid-gap'), 'node'); assert.equal(tier('--cols-min'), 'node')
  for (const bad of ['--sage-12', '--live-11', '--cyan-3', '--btnBgHov', '--hero-frame-h', '--cap-shadow', '--n']) {
    assert.equal(parse(bad), null, `имя по виду или не по форме принято: ${bad}`)
  }
  assert.ok(REQUIRED['--sale-fill'] && REQUIRED['--scrim'], 'роли по элементам не в списке обязательных')
  /* Ручка примитива на корне — тот самый --stack: в tokens.css её быть не должно. */
  const root = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of root.matchAll(/(?:^|[;{])\s*(--[a-z][a-z0-9-]*)\s*:/g)) {
    assert.notEqual(tier(m[1]), 'node', `ручка примитива объявлена на корне: ${m[1]}`)
  }
  /* Примитив stack берёт роль, а не число и не ступень. */
  const prim = readFileSync(new URL('../styles/primitives.module.css', import.meta.url), 'utf8')
  assert.match(prim, /\.stack > \* \+ \*\{margin-block-start:var\(--stack, var\(--air-block\)\)\}/, 'stack не берёт роль воздуха по умолчанию')
})

/* И225: оси названы до значений. Язык и контраст в наборе отсутствовали,
   скроллбар красился рукой вопреки color-scheme. */
test('реестр осей: признак → ось; язык и контраст заведены; скроллбар не красится рукой', async () => {
  const { axisOf, AXES } = await import('../tools/axes.mjs')
  assert.deepEqual(Object.keys(AXES), ['theme', 'pointer', 'width', 'language', 'motion', 'contrast'])
  assert.equal(axisOf('(pointer:coarse)'), 'pointer'); assert.equal(axisOf('(hover: hover)'), 'pointer')
  assert.equal(axisOf('(prefers-contrast: more)'), 'contrast'); assert.equal(axisOf('(forced-colors:active)'), 'contrast')
  assert.equal(axisOf('(max-width:820px)'), 'width'); assert.equal(axisOf('(orientation: landscape)'), null)
  const base = readFileSync(new URL('../styles/base.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const need of ['overflow-wrap:anywhere', 'hyphens:auto', 'quotes:auto', 'text-size-adjust:100%', '@media (prefers-contrast:more)', '@media (forced-colors:active)', '@media (prefers-reduced-motion:reduce)']) {
    assert.ok(base.includes(need), `в основании нет оси: ${need}`)
  }
  assert.ok(!/scrollbar-color/.test(base), 'скроллбар красится рукой — его красит color-scheme')
  const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of tokens.matchAll(/\[data-theme[^\]]*\]\s*\{([^}]*)\}/g)) {
    assert.ok(!/--[a-z]/.test(m[1]), 'тема ставит переменную, а не только color-scheme')
  }
})

test('ступень без просителя — находка', async () => {
  const { auditReaders } = await import('../tools/scale.mjs')
  const sets = { проба: {
    ширины: [560, 1080], тело: [16, 18], отношение: [1.125, 1.2],
    размер: { base: 0, h2: 4 }, ритм: { 4: 1, 9: 4, 10: 5, 11: 6 },
    поле: { card: '4' }, воздух: { page: ['9', '10'] }, зазор: {},
  } }
  const sheets = [{ rel: 'styles/x.css', css: 'h2{font-size:var(--fs-h2)}' }]
  const dead = auditReaders(sheets, sets).map((f: { got: string }) => f.got)
  assert.deepEqual(dead, ['--fs-base', '--sp-11'], `мёртвые ступени: ${dead.join(', ')}`)
})

test('шкалы выпускаются в CSS, и выпущенное сходится с числами', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scale-css-'))
  mkdirSync(join(dir, 'styles'))
  writeFileSync(join(dir, 'styles', 'scale.json'), JSON.stringify({
    'проба': {
      'ширины': [560, 1080],
      'размер': { base: [16, 18] },
      'ритм': { 1: [4, 4], 10: [56, 80] },
      'поле': { card: [18, 22] },
      'воздух': { page: 10 },
      'зазор': { targets: [8, 16] },
    },
  }))
  const tool = new URL('../tools/scale-css.mjs', import.meta.url).pathname
  const made = spawnSync(process.execPath, [tool], { cwd: dir, encoding: 'utf8' })
  assert.equal(made.status, 0, made.stderr)

  const css = readFileSync(join(dir, 'styles', 'scale.css'), 'utf8')
  assert.match(css, /--sp-10: clamp\(56px, 30\.15px \+ 4\.62vw, 80px\);/, 'ступень ритма посчитана не по формуле')
  assert.match(css, /--pad-card: clamp\(1\.125rem, /, 'поле выпущено не в rem')
  assert.match(css, /--air-page: var\(--sp-10\);/, 'воздух завёл своё число вместо ссылки на ступень')
  assert.match(css, /@media \(pointer:coarse\)\{ :root\{ --gap-targets:16px \} \}/, 'под пальцем у зазора нет своего значения')
  /* Каждый набор стоит под своим именем — первый в том числе (И198). */
  assert.match(css, /\[data-scale="проба"\]\{/, 'первый набор стоит только на корне')

  /* Отставший файл — находка: иначе числа правят, а сайт размечен старым. */
  assert.equal(spawnSync(process.execPath, [tool, '--check'], { cwd: dir }).status, 0)
  writeFileSync(join(dir, 'styles', 'scale.css'), '/* правка руками */\n')
  assert.equal(spawnSync(process.execPath, [tool, '--check'], { cwd: dir }).status, 1,
    'выпущенный файл разошёлся с числами, а проверка молчит')
})

test('число на имени строителя — находка, а роль вместо роли — нет', async () => {
  const { auditSheets } = await import('../tools/scale.mjs')
  const sets = { 'проба': { 'ширины': [560, 1080], 'размер': { base: [16, 18] },
    'ритм': { 1: [4, 4] }, 'поле': { card: [18, 22] }, 'воздух': {}, 'зазор': {} } }
  const found = (css: string): string[] =>
    auditSheets([{ rel: 'проба.css', css }], sets).map((f: { rule: string }) => f.rule)
  assert.deepEqual(found('.a{--pad-card:var(--pad-inner)}'), [],
    'подмена роли ролью объявлена дефектом — витрине нечем переобъявлять роли')
  assert.deepEqual(found('.a{--pad-card:18px}'), ['число на имени строителя'],
    'второй источник числа прошёл молча')
})

test('шкалы набора без чисел — находка, а не зелёная самопроверка', () => {
  const tool = new URL('../tools/check-scale.mjs', import.meta.url).pathname
  const dir = mkdtempSync(join(tmpdir(), 'scale-none-'))
  mkdirSync(join(dir, 'styles'))
  /* Чужой сайт со своими стилями: наших шкал нет — спрашивать с него наш
     файл чисел нечестно, проверка остаётся самопроверкой. */
  assert.equal(spawnSync(process.execPath, [tool], { cwd: dir }).status, 0)
  /* Шкалы набора стоят, чисел нет — менять ритм нечем, и это надо сказать. */
  writeFileSync(join(dir, 'styles', 'tokens.css'), ':root{--fs-1:1rem}\n')
  const bare = spawnSync(process.execPath, [tool], { cwd: dir, encoding: 'utf8' })
  assert.equal(bare.status, 1, 'набор стоит, чисел нет, а проверка зелёная')
  assert.match(bare.stderr, /scale\.json/, 'проверка не назвала, чего не хватает')
})

/* И207: роль текста — пять фактов, а не один. Пока названа одна пятая,
   остальные набирает каждое место само: два крупных заголовка в одном файле
   примитивов разошлись разрядкой, а у второго межстрочья не было вовсе — он
   наследовал 1.45 от тела, то есть 61 пиксель между строками на 42-м кегле
   при каноне 46. */

test('роль текста объявлена целиком, и неполная — находка', async () => {
  const { auditRoles } = await import('../tools/scale.mjs')
  const set = (роль: Record<string, unknown>) => ({
    проба: { ширины: [560, 1080], размер: { base: [16, 18] }, ритм: { 1: [4, 4] },
      поле: {}, воздух: {}, зазор: {}, текст: { note: роль } },
  })
  const rules = (s: object): string[] =>
    auditRoles(s as never, 'проба').map((f: { rule: string }) => f.rule)

  const целая = { род: 'текст', размер: '--fs-base', межстрочье: 1.45, вес: 400, разрядка: '0', мера: 'нет' }
  assert.deepEqual(rules(set(целая)), [], 'полная роль объявлена дефектной')

  const { межстрочье, ...без } = целая
  assert.ok(rules(set(без)).includes('роль текста неполна'), 'роль без межстрочья прошла молча')

  /* Каждый порог — обратным ходом. */
  assert.ok(rules(set({ ...целая, межстрочье: 1.1 })).includes('межстрочье текста'),
    'текст с межстрочьем заголовка принят')
  assert.ok(rules(set({ ...целая, род: 'заголовок', межстрочье: 1.45 })).includes('межстрочье заголовка'),
    'заголовок с межстрочьем тела принят')
  assert.ok(rules(set({ ...целая, вес: 350 })).includes('вес роли'), 'вес вне набора принят')
  assert.ok(rules(set({ ...целая, разрядка: '-.02em' })).includes('разрядка сжимает текст'),
    'сжатый текст принят')
  assert.ok(rules(set({ ...целая, разрядка: '-.2em' })).includes('разрядка'), 'разрядка в пятую кегля принята')
})

test('роли выпускаются целиком и берут размер, а не заводят своё число', () => {
  const css = read('styles/scale.css')
  for (const role of ['hero', 'pagehead', 'h2', 'h3', 'intro', 'lede', 'body', 'note', 'eyebrow']) {
    for (const part of ['lead', 'weight', 'track']) {
      assert.ok(new RegExp(`^\\s*--${role}-${part}\\s*:`, 'm').test(css), `у роли ${role} нет части ${part}`)
    }
  }
  /* Размер роль БЕРЁТ: своя рампа у роли означала бы вторую шкалу. */
  assert.match(css, /--body-size: var\(--fs-base\);/, 'тело завело свой размер вместо ступени')
  assert.ok(!/--pagehead-size:/.test(css), 'заголовок страницы потерял свою кривую')
  /* Роль, чьё имя совпадает с именем кривой, себя не переобъявляет: это
     ссылка на саму себя, и браузер погасит её вместе со всей ролью. */
  assert.ok(!/--hero-size:\s*var\(--hero-size\)/.test(css), 'роль сослалась сама на себя')
  /* Мера — только там, где она названа; заголовку её назначают вёрсткой. */
  assert.match(css, /--body-measure: var\(--measure\);/, 'у тела нет меры строки')
  assert.ok(!/--h2-measure/.test(css), 'заголовку назначена мера, которой у него нет')
})

/* И208: пункт ворот, который можно посчитать, не стоит в списке «глазом».
   Два таких было: «швов ровно три» и «роли цвета названы по работе». Замер
   руками умирает вместе с сессией — следующая начнёт с того же вопроса. */

test('ворота считают швы сами: окно — шов, коробка — нет', async () => {
  const { seamsIn } = await import('../tools/stages.mjs')
  assert.deepEqual(seamsIn('@media (max-width:820px){ .x{color:red} }'), [820])
  /* Контейнерный запрос швом не считается: компонент меряет свою коробку,
     а не окно (запрет 6). До этого правила его считали бы четвёртым швом. */
  assert.deepEqual(seamsIn('@container (max-width:788px){ .y{color:red} }'), [])
  /* Запросы не про ширину — не швы вовсе. */
  assert.deepEqual(seamsIn('@media (hover:hover){ .z{color:red} }'), [])
  assert.deepEqual(seamsIn('@media (max-width:900px){}@media (min-width:560px){}'), [900, 560])
})

test('узел, зовущий краску по оттенку, — находка', async () => {
  const { hueRx } = await import('../tools/css-families.mjs')
  const hits = (css: string): string[] => [...css.matchAll(hueRx(['sage', 'cyan', 'amber']))].map((m) => m[0])
  assert.deepEqual(hits('.a{color:var(--ink)}'), [], 'узел, взявший роль, объявлен дефектом')
  assert.deepEqual(hits('.a{color:var(--sage-12);background:var(--amber-3)}').length, 2,
    'узел взял краску по оттенку, а сторож молчит')
  /* Ярус значений объявляет себя сам — в файле шкал, и это законно; файл
     стоит в EXEMPT, сюда он не попадает. */
  assert.deepEqual(hits('.b{color:var(--sale-9)}'), [], 'роль палитры принята за оттенок')
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

/* И211: плашка скидки стояла одним цветом во всех семи наборах — фиалка,
   выбранная для одного, скопирована во все как постоянная. */

test('скидка выводится из марки, а названную заказчиком не трогает', async () => {
  const { saleFrom, withSale, difference, NEED } = await import('../tools/palette.mjs')
  const марка = '#3A6EA5'
  const статусы = ['#B3261E', '#F76B15', '#30A46C']
  const выведена = saleFrom(марка, [...статусы, марка])
  /* Тон марки + 60°, как третья краска схемы у Material (TONAL_SPOT). */
  for (const другая of [марка, ...статусы]) {
    assert.ok(difference(выведена, другая) >= NEED.brandApart,
      `выведенная скидка ${выведена} ближе ${NEED.brandApart} ΔE к ${другая}`)
  }
  /* Названная заказчиком остаётся: его выбор старше правила. */
  const свой = { paper: '#FFF', ink: '#111', accent: марка, sale: '#6A4CA8' }
  assert.equal(withSale(свой).sale, '#6A4CA8', 'выбор заказчика перебит правилом')
  const без = { paper: '#FFF', ink: '#111', accent: марка }
  assert.equal(withSale(без).sale, выведена, 'набор без скидки не получил выведенную')
})

/* И212: кнопки «Светлая» и «Тёмная» на стенде не делали ничего —
   light-dark() слушает color-scheme, а не признак на документе. */

test('стенд цвета переключает тему свойством, а не признаком', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stand-'))
  mkdirSync(join(dir, 'styles'))
  writeFileSync(join(dir, 'styles', 'palette.json'), JSON.stringify({
    проба: {
      light: { paper: '#FFFFFF', ink: '#231F18', accent: '#0C3A46', error: '#B3261E', warn: '#F76B15', ok: '#30A46C' },
      dark: { paper: '#141310', ink: '#EFECE7', accent: '#2E7C8F', error: '#E5484D', warn: '#F76B15', ok: '#30A46C' },
    },
  }))
  const tool = new URL('../tools/palette-stand.mjs', import.meta.url).pathname
  const made = spawnSync(process.execPath, [tool, join(dir, 'стенд.html')], { cwd: dir, encoding: 'utf8' })
  assert.equal(made.status, 0, made.stderr)
  const html = readFileSync(join(dir, 'стенд.html'), 'utf8')
  assert.match(html, /\[data-theme="light"\]\{\s*color-scheme:\s*light\s*\}/, 'светлая тема не переключается')
  assert.match(html, /\[data-theme="dark"\]\{\s*color-scheme:\s*dark\s*\}/, 'тёмная тема не переключается')
  rmSync(dir, { recursive: true, force: true })
})

/* И214: заказчик спросил, сколько цветов ему вообще показывали, — и ответ
   оказался «четырнадцать из сорока пяти». Стенд выбора показывает карточку
   товара, то есть ту часть палитры, которая на карточке видна; остальное
   выводилось и уезжало в сайт непоказанным. Лист палитры показывает ВСЁ
   выпущенное, и это сторожится счётом, а не обещанием: добавится краска —
   тест упадёт, пока она не встанет на лист. */
test('лист палитры показывает каждую выпущенную краску, а не часть', () => {
  const корень = new URL('..', import.meta.url).pathname
  const dir = mkdtempSync(join(tmpdir(), 'sheet-'))
  const out = join(dir, 'лист.html')
  const r = spawnSync(process.execPath, [join(корень, 'tools/palette-sheet.mjs'), out],
    { encoding: 'utf8', cwd: корень })
  assert.equal(r.status, 0, r.stderr)

  const html = readFileSync(out, 'utf8')
  const выпущено = [...new Set(
    readFileSync(join(корень, 'styles/palette.css'), 'utf8').match(/--[a-z0-9-]+(?=\s*:)/g) || [])]
  assert.ok(выпущено.length >= 40, `выпущено подозрительно мало красок: ${выпущено.length}`)

  const нет = выпущено.filter((имя) => !html.includes(имя))
  assert.deepEqual(нет, [], `на листе нет красок: ${нет.join(', ')}`)
  rmSync(dir, { recursive: true, force: true })
})

/* И216: набор — это ТРИ краски на тему. Если в
   образце снова появится записанный рукой оранжевый или зелёный, значит
   постоянная опять расползлась по файлам. */
test('образцы называют рукой три краски, а постоянные берут из строителя', () => {
  const образцы = JSON.parse(
    readFileSync(new URL('../templates/palette.json', import.meta.url).pathname, 'utf8'))
  const лишние: string[] = []
  for (const [имя, набор] of Object.entries<Record<string, Record<string, string>>>(образцы)) {
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
  const корень = new URL('..', import.meta.url).pathname
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
