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
 *                                     четыре скилла и kit.config.json; ничего
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

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { SCRIPTS } from './scripts.mjs'

const SRC = resolve(new URL('.', import.meta.url).pathname)
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const target = args.find((a) => !a.startsWith('--'))
const OUT = resolve(target ?? process.cwd())
const MODE = flags.has('--audit') ? 'audit' : flags.has('--update') ? 'update' : 'new'
const FORCE = flags.has('--force')

for (const f of flags) {
  if (!['--audit', '--update', '--force'].includes(f)) {
    console.error(`Неизвестный ключ ${f}. Есть --update, --audit, --force.`)
    process.exit(1)
  }
}
if (OUT === SRC) {
  console.error('Целевая папка — сам набор. Укажите проект: node install.mjs ../мой-сайт')
  process.exit(1)
}

/** Своё, не переезжающее никуда: история, описание самого набора, его CI,
 *  его самопроверка, заготовки (они кладутся своим именем ниже) и
 *  исследования — снимки чужих первоисточников и ответы агентов, из которых
 *  выведены правила; проекту нужны правила, а не 25 МБ их оснований. */
const MINE = new Set(['.git', '.gitignore', 'node_modules', 'README.md', 'package.json',
  'package-lock.json', '.github', 'templates', 'selftest', 'research'])

/** Принадлежит ПРОЕКТУ, как только в нём появилось: правила, шкалы, тесты,
 *  линтер, рабочий процесс. Набор пишет их один раз — новому сайту. */
const PROJECT_OWNED = ['CLAUDE.md', 'docs', 'styles', 'tests', '.oxlintrc.json',
  '.github/workflows/check.yml', 'styles/palette.json']

/** Свои четыре скилла — то, ради чего набор существует. Остальные в
 *  `.claude/skills/` — чужие, о вкусе и процессе; на чужой сайт для аудита
 *  они не едут: там могут стоять свои. */
const OWN_SKILLS = ['craft', 'code', 'shop', 'stages']

/** Команды, которые нужны аудиту: проверки и этапы. `lint`, `test`,
 *  `typecheck`, `images` у чужого проекта свои — их не трогаем. */
const AUDIT_SCRIPTS = Object.fromEntries(Object.entries(SCRIPTS)
  .filter(([k]) => /^check:|^checks$|^stage$|^sweep$|^serve$/.test(k)))

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

const moved = []
const kept = []

/** Копия папки набора в проект. `keep` — файлы, которые в проекте уже есть
 *  и остаются его: базы храповиков при обновлении и аудите. */
function copyDir(name, keep = () => false) {
  const src = join(SRC, name)
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const from = join(dir, entry)
      const to = join(OUT, from.slice(SRC.length + 1))
      if (statSync(from).isDirectory()) { mkdirSync(to, { recursive: true }); walk(from); continue }
      if (existsSync(to) && keep(to.slice(OUT.length + 1))) { kept.push(to.slice(OUT.length + 1)); continue }
      mkdirSync(join(to, '..'), { recursive: true })
      cpSync(from, to)
    }
  }
  walk(src)
  moved.push(name)
}

const isBaseline = (p) => /^tools\/[\w-]+-baseline\.json$/.test(p)

/* Инструменты едут всегда. Базы: новому сайту — нули из набора; проекту с
   долгом — его собственные, иначе долг «прощён» и первый же прогон зелёный
   на том, что вчера было красным. */
copyDir('tools', MODE === 'new' ? () => false : isBaseline)

/* Скиллы: новому сайту и обновлению — все, с лицензиями; аудиту — четыре. */
if (MODE === 'audit') {
  for (const s of OWN_SKILLS) {
    cpSync(join(SRC, '.claude/skills', s), join(OUT, '.claude/skills', s), { recursive: true })
  }
  moved.push(`.claude/skills/{${OWN_SKILLS.join(',')}}`)
} else {
  cpSync(join(SRC, '.claude/skills'), join(OUT, '.claude/skills'), { recursive: true })
  /* settings.json у проекта может быть свой — с разрешениями и своими
     хуками. Его не затираем: хуки набора ДОПИСЫВАЮТСЯ к существующим. */
  mergeHooks(join(SRC, '.claude/settings.json'), join(OUT, '.claude/settings.json'))
  moved.push('.claude')
}

/* Пара ставщик + список команд неразделима: половина пары — сломанный ввоз. */
for (const f of ['install.mjs', 'scripts.mjs']) { cpSync(join(SRC, f), join(OUT, f)); moved.push(f) }

/* Проектное — только новому сайту (или по слову --force). */
if (MODE === 'new') {
  for (const name of PROJECT_OWNED) {
    if (name === '.github/workflows/check.yml') {
      mkdirSync(join(OUT, '.github/workflows'), { recursive: true })
      cpSync(join(SRC, 'templates/check.yml'), join(OUT, name))
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
      cpSync(join(SRC, 'templates/palette-starter.json'), join(OUT, name))
    } else if (existsSync(join(SRC, name))) {
      cpSync(join(SRC, name), join(OUT, name), { recursive: true })
    }
    moved.push(name)
  }
  /* Всё остальное содержимое набора, о чём выше не сказано, — тоже его. */
  for (const name of readdirSync(SRC)) {
    if (MINE.has(name) || name === '.claude' || name === 'tools' || name === 'install.mjs' ||
        name === 'scripts.mjs' || PROJECT_OWNED.includes(name)) continue
    cpSync(join(SRC, name), join(OUT, name), { recursive: true })
    moved.push(name)
  }
}

/* Аудиту — конфиг путей: чужой проект лежит не там и зовёт шкалы не так,
   как набор. Пишется с соглашениями набора, чтобы было что править;
   существующий не трогается. */
if (MODE === 'audit' && !has('kit.config.json')) {
  const { CONFIG } = await import(join(SRC, 'tools/kit-config.mjs'))
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
  console.log('  · .claude/skills — свои craft, code, shop, stages плюс вкус, движение, стиль, процесс')
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
  console.log('  npm i -D sharp wait-on && npx playwright install chromium')
  if (MODE === 'new') console.log('  и прочитать docs/start.md — он про порядок, в котором начинать')
}
