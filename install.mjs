#!/usr/bin/env node
/**
 * Ставит набор в проект. Три режима, и режим — это ответ на вопрос
 * «чей это проект».
 *
 *   node install.mjs .                новый сайт: всё — правила, шкалы, скиллы,
 *                                     проверки, хуки, рабочий процесс CI
 *   node install.mjs --update .       сайт, где набор уже стоит: инструменты и
 *                                     скиллы; базы храповиков, CLAUDE.md,
 *                                     правила и шкалы проекта — не трогает
 *   node install.mjs --audit .        чужой готовый сайт: только проверки, свои
 *                                     шесть скиллов и kit.config.json; ничего
 *                                     проектного не пишет, хуков не вешает
 *
 * Почему это отдельный скрипт, а не «склонируйте репозиторий»: набор — не
 * проект, а слой поверх проекта. Клон, ставший папкой сайта, тянет за собой
 * чужой `origin` и чужую историю: коммиты сайта поедут в набор, а следующее
 * обновление набора встретится с проектом конфликтом. Поэтому файлы
 * раскладываются внутрь проекта, а история набора остаётся в наборе.
 *
 * Почему три режима, а не один (`docs/rules.md`, И169). Ставщик копировал
 * всё, кроме `.git`, — и затирал у проекта его `CLAUDE.md`, `docs/rules.md`,
 * `.oxlintrc.json`, `styles/tokens.css` и рабочий процесс CI. На новом сайте
 * так и задумано: там этих файлов нет. На чужом — потеря: у cbdshop.bg
 * `CLAUDE.md` на 142 килобайта своих правил, и скилл `stages` для «проверить
 * чужой сайт» предписывал ровно этот путь. Обновление набора в своём проекте
 * страдало той же болезнью: переносимый `CLAUDE.md` со строкой «0 · Основание»
 * ложился поверх проектного, а базы храповиков обнулялись, прощая долг.
 * Теперь на чужие файлы ставщик отказывает, а не пишет; затереть их можно
 * только сказав это словом — `--force`.
 */

import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { SCRIPTS } from './scripts.mjs'
import { toCss } from './tools/palette.mjs'
import { toCss as ritmToCss } from './tools/scale.mjs'

const SRC = resolve(fileURLToPath(new URL('.', import.meta.url)))

// Explicit traversal avoids native fs.cpSync failures on Unicode Windows paths
// observed on Node 24.14.1. Every file copy either completes or throws.
function copy(from, to) {
  if (statSync(from).isDirectory()) {
    mkdirSync(to, { recursive: true })
    for (const name of readdirSync(from)) copy(join(from, name), join(to, name))
  } else {
    mkdirSync(join(to, '..'), { recursive: true })
    copyFileSync(from, to)
  }
}
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
/* Папка проекта — первый свободный довод, НЕ считая значения ключа
   `--palette "Имя"`: имя набора выглядит как путь, и ставщик однажды принял
   «Латунь на угле» за папку назначения (И213). */
const target = args.find((a, i) => !a.startsWith('--') && !['--palette', '--scale'].includes(args[i - 1]))
const OUT = resolve(target ?? process.cwd())
const MODE = flags.has('--skill-only') ? 'skill-only' : flags.has('--audit') ? 'audit' : flags.has('--update') ? 'update' : 'new'
const FORCE = flags.has('--force')
/* Набор цвета, выбранный заказчиком, — ключом при постановке:
   `node install.mjs --palette "Латунь на угле" ../мой-сайт`.
   Без ключа новый сайт получает серый стартовый и напоминание спросить
   фирменный цвет (И199). С ключом — названный набор из образцов набора,
   потому что выбор УЖЕ сделан, и заставлять делать его заново значит
   терять то, за что заказчик уже заплатил своим временем (И213). */
const PALETTE = args.find((a, i) => args[i - 1] === '--palette' && !a.startsWith('--'))
/* То же для ритма: `--scale "Просторный"`. Набор ритма — такой же выбор
   заказчика, сделанный глазами на стенде, и теряться при постановке он не
   должен ровно по той же причине (И213). */
const SCALE = args.find((a, i) => args[i - 1] === '--scale' && !a.startsWith('--'))

for (const f of flags) {
  if (!['--audit', '--update', '--force', '--palette', '--scale', '--skill-only', '--extras'].includes(f)) {
    console.error(`Неизвестный ключ ${f}. Есть --skill-only, --update, --audit, --extras, --force, --palette "Имя", --scale "Имя".`)
    process.exit(1)
  }
}
if (OUT === SRC) {
  console.error('Целевая папка — сам набор. Укажите проект: node install.mjs ../мой-сайт')
  process.exit(1)
}

// A self-contained instruction bundle for any platform; no project config changes.
if (MODE === 'skill-only') {
  if (flags.size !== 1) {
    console.error('--skill-only не смешивается с установкой инструментов или шкал.')
    process.exit(1)
  }
  for (const agent of ['.agents', '.claude']) {
    copy(join(SRC, 'skills/site-building'), join(OUT, agent, 'skills/site-building'))
  }
  console.log(`Скилл установлен в ${OUT}: .agents/skills/site-building и .claude/skills/site-building. Файлы сайта не изменены.`)
  process.exit(0)
}

/** Принадлежит ПРОЕКТУ, как только в нём появилось: правила, шкалы, тесты,
 *  линтер, рабочий процесс. Набор пишет их один раз — новому сайту. */
const PROJECT_OWNED = ['AGENTS.md', 'CLAUDE.md', 'docs', 'styles', 'tests', '.oxlintrc.json',
  '.github/workflows/check.yml', 'styles/palette.json']

/** Свои шесть скиллов — то, ради чего набор существует. Остальные в
 *  `.claude/skills/` — чужие, о вкусе и процессе; на чужой сайт для аудита
 *  они не едут: там могут стоять свои. */
const OWN_SKILLS = ['craft', 'palette', 'scale', 'code', 'shop', 'stages']

/** Команды, которые нужны аудиту: проверки и этапы. `lint`, `test`,
 *  `typecheck`, `images` у чужого проекта свои — их не трогаем. */
const AUDIT_SCRIPTS = Object.fromEntries(Object.entries(SCRIPTS)
  .filter(([k]) => /^check:|^checks$|^stage$|^sweep$|^serve$|^palette$|^scale$/.test(k)))

const rel = (p) => p.slice(OUT.length + 1)
const has = (p) => existsSync(join(OUT, p))

/* ── что уже есть у проекта ─────────────────────────────────────────────── */

if (MODE === 'new' && !FORCE) {
  const taken = PROJECT_OWNED.filter(has)
  if (taken.length) {
    console.error(`В ${OUT} уже есть своё: ${taken.join(', ')}.`)
    console.error('Затирать чужие правила и шкалы ставщик не будет. Выберите:')
    console.error('  --audit   проверить чужой готовый сайт: только инструменты и свои скиллы')
    console.error('  --update  обновить набор там, где он уже стоит: инструменты и скиллы, базы не трогать')
    console.error('  --force   это новый сайт, файлы затереть (И169 — сказать это надо словом)')
    process.exit(1)
  }
}

/* ── раскладка ─────────────────────────────────────────────────────────── */

// Validate choices before writing anything into the destination.
if (flags.has('--audit') && flags.has('--update')) {
  console.error('Выберите один режим: --audit или --update.')
  process.exit(1)
}
for (const [flag, value, file] of [
  ['--palette', PALETTE, 'templates/palette.json'],
  ['--scale', SCALE, 'styles/scale.json'],
]) {
  if (!flags.has(flag)) continue
  if (!value || MODE !== 'new') {
    console.error(`${flag} требует имя и применяется только при новой установке.`)
    process.exit(1)
  }
  const choices = JSON.parse(readFileSync(join(SRC, file), 'utf8'))
  if (!Object.hasOwn(choices, value)) {
    console.error(`Неизвестный набор «${value}». Есть: ${Object.keys(choices).join(', ')}`)
    process.exit(1)
  }
}

const moved = []
const kept = []
const installRecord = '.site-kit-install.json'
const normalizedHash = path => createHash('sha256').update(readFileSync(path, 'utf8').replace(/\r\n/g, '\n')).digest('hex')
const previousFiles = has(installRecord) ? JSON.parse(readFileSync(join(OUT, installRecord), 'utf8')).files : {}
const toolFiles = []
const kitOnlyTools = new Set(['tools/sync-studio-assets.mjs'])
function collectTools(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) collectTools(path)
    else { const name = path.slice(SRC.length + 1).replace(/\\/g, '/'); if (!kitOnlyTools.has(name)) toolFiles.push(name) }
  }
}
collectTools(join(SRC, 'tools'))
if (MODE !== 'new' && !FORCE) {
  const conflicts = toolFiles.filter(path => {
    if (!has(path) || /-baseline\.json$/.test(path)) return false
    const actual = normalizedHash(join(OUT, path))
    return actual !== normalizedHash(join(SRC, path)) && actual !== previousFiles[path]
  })
  if (conflicts.length) {
    console.error('Update refused before any writes: locally modified or unversioned tools:\n' + conflicts.join('\n'))
    console.error('Merge these changes deliberately. --force is only for an explicitly approved replacement with a backup.')
    process.exit(1)
  }
}

/** Копия папки набора в проект. `keep` — файлы, которые в проекте уже есть
 *  и остаются его: базы храповиков при обновлении и аудите. */
function copyDir(name, keep = () => false) {
  const src = join(SRC, name)
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const from = join(dir, entry)
      if (kitOnlyTools.has(from.slice(SRC.length + 1).replace(/\\/g, '/'))) continue
      const to = join(OUT, from.slice(SRC.length + 1))
      if (statSync(from).isDirectory()) { mkdirSync(to, { recursive: true }); walk(from); continue }
      if (existsSync(to) && keep(to.slice(OUT.length + 1))) { kept.push(to.slice(OUT.length + 1)); continue }
      mkdirSync(join(to, '..'), { recursive: true })
      copy(from, to)
    }
  }
  walk(src)
  moved.push(name)
}

const isBaseline = (p) => /^tools\/[\w-]+-baseline\.json$/.test(p.replace(/\\/g, '/'))

/* Инструменты едут всегда. Базы: новому сайту — нули из набора; проекту с
   долгом — его собственные, иначе долг «прощён» и первый же прогон зелёный
   на том, что вчера было красным. */
copyDir('tools', MODE === 'new' ? () => false : isBaseline)
writeFileSync(join(OUT, installRecord), JSON.stringify({ version: 1, files: Object.fromEntries(toolFiles.filter(path => !isBaseline(path)).map(path => [path, normalizedHash(join(SRC, path))])) }, null, 2) + '\n')

/* Обновление не трогает проектные документы, но отсутствующий документ не
   является проектным: без него скилл ссылается в пустоту, а check:rules
   нечего читать. Существующий файл остаётся нетронутым. */
if (MODE === 'update') {
  for (const relPath of ['docs/layers.md', 'docs/rules.md']) {
    if (has(relPath)) continue
    const dest = join(OUT, relPath)
    mkdirSync(join(dest, '..'), { recursive: true })
    copy(join(SRC, relPath), dest)
    moved.push(relPath)
  }
}

/* По умолчанию только собственные предметные инструкции. Сторонний архив
   вкуса и процесса устанавливается явно; существующие навыки не удаляются. */
if (!flags.has('--extras') || MODE === 'audit') {
  for (const s of OWN_SKILLS) {
    copy(join(SRC, '.claude/skills', s), join(OUT, '.claude/skills', s))
  }
  moved.push(`.claude/skills/{${OWN_SKILLS.join(',')}}`)
} else {
  copy(join(SRC, '.claude/skills'), join(OUT, '.claude/skills'))
  moved.push('дополнительные скиллы с лицензиями')
}
if (MODE !== 'audit') {
  /* settings.json у проекта может быть свой — с разрешениями и своими
     хуками. Его не затираем: хуки набора ДОПИСЫВАЮТСЯ к существующим. */
  mergeHooks(join(SRC, '.claude/settings.json'), join(OUT, '.claude/settings.json'))
  moved.push('.claude')
}

// One authored entrypoint, discoverable by both supported agent layouts.
for (const agent of ['.agents', '.claude']) {
  copy(join(SRC, 'skills/site-building'), join(OUT, agent, 'skills/site-building'))
}
moved.push('site-building (Codex и Claude)')

/* Пара ставщик + список команд неразделима: половина пары — сломанный ввоз. */
for (const f of ['install.mjs', 'scripts.mjs']) { copy(join(SRC, f), join(OUT, f)); moved.push(f) }

/* Проектное — только новому сайту (или по слову --force). */
if (MODE === 'new') {
  for (const name of PROJECT_OWNED) {
    if (name === 'AGENTS.md') {
      copy(join(SRC, 'templates/AGENTS.md'), join(OUT, name))
    } else if (name === '.github/workflows/check.yml') {
      mkdirSync(join(OUT, '.github/workflows'), { recursive: true })
      copy(join(SRC, 'templates/check.yml'), join(OUT, name))
    } else if (name === 'styles/palette.json') {
      /* Новый сайт с первой минуты стоит на шкале — но НЕ на красках чужого
         магазина. Палитра набора едет вместе со `styles/`, и без этой строки
         новый сайт получал бы «Мек остров» целиком: чужую марку под чужим
         именем, и никто бы не спросил. Стартовый набор нарочно серый и
         назван «Стартовый — заменить»: ворота этапа 0 ищут это слово и
         напоминают спросить у заказчика фирменный цвет, пока он не назван
         (И199). До 21.09.2026 шага «спроси цвет» не было нигде, кроме памяти
         сессии, то есть нигде. */
      mkdirSync(join(OUT, 'styles'), { recursive: true })
      const образцы = JSON.parse(readFileSync(join(SRC, 'templates/palette.json'), 'utf8'))
      if (PALETTE && !образцы[PALETTE]) {
        console.error(`Набора «${PALETTE}» нет среди образцов. Есть: ${Object.keys(образцы).join(', ')}`)
        process.exit(1)
      }
      const краски = PALETTE
        ? { [PALETTE]: образцы[PALETTE] }
        : JSON.parse(readFileSync(join(SRC, 'templates/palette-starter.json'), 'utf8'))
      writeFileSync(join(OUT, name), JSON.stringify(краски, null, 2) + '\n')
      /* И выпустить из них CSS тем же кодом, что считает проверка: иначе
         `styles/palette.css` приезжает выпущенным из красок ЧУЖОГО магазина
         и отстаёт от того, что лежит рядом в json. Сторож это ловит сразу —
         «выпущенный styles/palette.css отстал от красок», — и правильно
         делает: краски и выпуск обязаны сходиться с первой минуты. */
      writeFileSync(join(OUT, 'styles/palette.css'), toCss(краски))
    } else if (existsSync(join(SRC, name))) {
      copy(join(SRC, name), join(OUT, name))
    }
    moved.push(name)
  }
  // Acceptance and business decisions belong to the new site, not the kit.
  for (const name of ['decisions', 'gate', 'open', 'words']) {
    copy(join(SRC, `templates/project-${name}.md`), join(OUT, `docs/${name}.md`))
  }
  /* Выбранный набор ритма — первым в файле: на корне стоит первый, им сайт
     и размечен (И198). Остальные остаются рядом, чтобы было чем сравнить. */
  if (SCALE) {
    const путь = join(OUT, 'styles/scale.json')
    const наборы = JSON.parse(readFileSync(путь, 'utf8'))
    if (!наборы[SCALE]) {
      console.error(`Набора ритма «${SCALE}» нет. Есть: ${Object.keys(наборы).join(', ')}`)
      process.exit(1)
    }
    const переставленные = {
      [SCALE]: наборы[SCALE],
      ...Object.fromEntries(Object.entries(наборы).filter(([n]) => n !== SCALE)),
    }
    writeFileSync(путь, JSON.stringify(переставленные, null, 2) + '\n')
    /* И тут же выпустить: json переставлен — значит на корне другой набор,
       а `styles/scale.css` остался выпущенным из прежнего порядка и отстал
       от того, что лежит рядом. Ровно тот же шов, что у красок выше, и
       ловится он тем же сторожем `scale-css.mjs --check`. Поймано своим
       тестом до первой постановки. */
    writeFileSync(join(OUT, 'styles/scale.css'), ritmToCss(переставленные))
  }

  // Only the explicit runtime/project files above travel to a site.
  // Research, evidence indexes and generated local stands stay in the kit.
}

/* Аудиту — конфиг путей: чужой проект лежит не там и зовёт шкалы не так,
   как набор. Пишется с соглашениями набора, чтобы было что править;
   существующий не трогается. */
if (MODE === 'audit' && !has('kit.config.json')) {
  const { CONFIG } = await import(new URL('./tools/kit-config.mjs', import.meta.url))
  writeFileSync(join(OUT, 'kit.config.json'), JSON.stringify(CONFIG, null, 2) + '\n')
  moved.push('kit.config.json')
}

function mergeHooks(from, to) {
  if (!existsSync(from)) return
  const ours = JSON.parse(readFileSync(from, 'utf8'))
  let theirs = {}
  try { theirs = JSON.parse(readFileSync(to, 'utf8')) } catch { /* файла нет — будет наш */ }
  theirs.hooks ??= {}
  for (const [event, list] of Object.entries(ours.hooks ?? {})) {
    theirs.hooks[event] ??= []
    const seen = new Set(theirs.hooks[event].flatMap((g) => g.hooks.map((h) => h.command)))
    for (const group of list) {
      if (group.hooks.every((h) => seen.has(h.command))) continue
      theirs.hooks[event].push(group)
    }
  }
  mkdirSync(join(OUT, '.claude'), { recursive: true })
  writeFileSync(to, JSON.stringify(theirs, null, 2) + '\n')
}

/* Скрипты дописываются, а не заменяются: проектные `dev`, `build`, `start`
   у сайта уже свои, и набор о них ничего не знает. Список — один на сборщик
   и ставщик (`scripts.mjs`): две копии тут уже расходились. */
const pkgPath = join(OUT, 'package.json')
let wired = false
const scripts = MODE === 'audit' ? AUDIT_SCRIPTS : SCRIPTS
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  pkg.scripts = { ...scripts, ...pkg.scripts }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  wired = true
}

/* ── отчёт ─────────────────────────────────────────────────────────────── */

const title = { new: 'Новый сайт', update: 'Обновление набора', audit: 'Аудит чужого сайта' }[MODE]
console.log(`${title}: набор разложен в ${OUT} — ${moved.join(', ')}`)
if (kept.length) console.log(`  · оставлены свои: ${kept.join(', ')} (долг проекта не прощается)`)
if (MODE === 'new') {
  console.log('  · CLAUDE.md — правила, читаются раньше кода каждой сессией')
  console.log('  · .claude/skills — шесть предметных скиллов; сторонние только с --extras')
  console.log('  · .claude/settings.json — хуки: брифинг этапа сам в начале сессии, проверка сама после правки')
  console.log('  · .github/workflows/check.yml — проверки падают сами, без чьей-либо памяти')
  console.log('  · базы храповиков на нулях — на новом проекте долга нет')
}
if (MODE === 'audit') {
  console.log('  · kit.config.json — где лежит код и стили, как названы шкалы, сколько швов: поправьте под проект')
  console.log('  · базы храповиков на нулях — каждая находка считается; это отчёт, а не долг')
  console.log('  · CLAUDE.md, правила, шкалы, хуки и CI проекта не тронуты')
}
if (wired) {
  console.log('  · скрипты дописаны в package.json')
} else {
  console.log('\nВ папке нет package.json — допишите скрипты сами:')
  console.log(JSON.stringify({ scripts }, null, 2))
}
console.log('\nДальше:')
if (MODE === 'audit') {
  console.log('  поправить kit.config.json → npm run check:css · check:code · check:port — числа и есть отчёт')
  console.log('  строка «Этап производства: **5 · Сдача**» в CLAUDE.md проекта → npm run check:stage — какие ворота не держатся')
} else {
  console.log('  npm run stage — что кладётся первым и что прогнать')
  console.log('  npm i -D playwright sharp wait-on && npx playwright install chromium')
  if (MODE === 'new') console.log('  и прочитать docs/start.md — он про порядок, в котором начинать')
}
