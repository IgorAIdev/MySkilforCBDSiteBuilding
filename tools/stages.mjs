/**
 * Этапы производства сайта — реестр.
 *
 * Заведён по дефекту, и дефект был про память. У проекта набралось три
 * десятка скиллов, и половина из них нужна не сейчас: скилл про поиск
 * (СЕО) на этапе вёрстки отвечает на незаданный вопрос, а на этапе сдачи
 * без него нельзя. Заказчик сказал ровно это: «сейчас не нужно, а к финалу
 * понадобится — и я его забуду».
 *
 * Забудет не заказчик, а сессия: у неё нет вчера. Переживают конец сессии
 * две вещи — файл, который читается раньше кода, и проверка, которая валит
 * сборку. Поэтому этап — это СТРОКА в `CLAUDE.md`, а что на этом этапе
 * работает, что ждёт и что должно держаться — таблица здесь, и её читает
 * `tools/stage.mjs`.
 *
 * Скиллы друг друга не зовут: каждый выбирается моделью по своему описанию.
 * Значит «включить скилл на этапе 5» буквально невозможно — но можно:
 *   · записать в реестр, на каком этапе он просыпается и что из него брать;
 *   · печатать это в начале каждой сессии (`npm run stage`);
 *   · превратить измеримую его половину в проверку, которая живёт в CI и
 *     не нуждается ни в чьей памяти.
 *
 * Ворота этапа — не «сделано ли», а «держится ли». Пройденные ворота
 * обязаны держаться дальше: шкала, заведённая на этапе 0, не может исчезнуть
 * на этапе 3. Это и проверяет `npm run check:stage` — храповик по этапам.
 *
 * Порядок этапов — порядок ВОРОТ, а не работ. Наполнение (4) приходит от
 * заказчика и идёт параллельно вёрстке; но сдать (5) раньше, чем данные
 * стали настоящими, нельзя — вот что значит «4 раньше 5».
 *
 * Реестр переносится в новый проект как есть. Предикаты ниже смотрят на
 * файлы и на соглашения набора (шкалы, примитивы, базы храповиков, флаги
 * `*_IS_REAL`), а не на cbdin.bg: то, чего в новом проекте нет, честно
 * названо «нет», а не «не нужно».
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { LIB, TOKENS, PRIMITIVES, PREFIX, BREAKPOINTS, SEAMS, LADDER, STYLE_DIRS } from './kit-config.mjs'
import { seamsIn, auditSeamsShape, deadSeams } from './seams.mjs'
import { LAYOUT } from './thresholds.mjs'

export const ROOT = new URL('..', import.meta.url).pathname

/* ── что видит предикат ────────────────────────────────────────────────── */

const has = (p) => existsSync(join(ROOT, p))
const src = (p) => (has(p) ? readFileSync(join(ROOT, p), 'utf8') : '')
const json = (p) => { try { return JSON.parse(src(p)) } catch { return null } }
const pkg = () => json('package.json') ?? { scripts: {} }
const script = (name) => Boolean(pkg().scripts?.[name])

/** Есть ли процесс CI, который зовёт хотя бы храповик по вёрстке. Имя файла
 *  не важно: `check.yml`, `ci.yml` — важно, что сборка падает сама.
 *
 *  Ищется от корня проекта вверх до корня репозитория: в монорепозитории
 *  процессы лежат этажом выше приложения, и ворота, смотревшие только в
 *  `ROOT/.github`, говорили «CI нет» у проекта, чей CI гонял все проверки. */
const ci = () => {
  let dir = ROOT.replace(/\/$/, '')
  for (let i = 0; i < 6 && dir; i++) {
    const wf = join(dir, '.github/workflows')
    if (existsSync(wf)) {
      /* Процесс может звать храповик не по имени, а через команду корня —
         `pnpm check:kit`, которая уже зовёт `check:css` на все приложения.
         Смотрим на шаг вглубь: команда из процесса → её определение в
         package.json того же этажа. Ворота, читавшие только текст процесса,
         покраснели ровно в день, когда четыре строки свернули в одну. */
      let scripts = {}
      try { scripts = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts ?? {} } catch { /* этаж без package.json */ }
      const calls = (text) => [...text.matchAll(/(?:pnpm|npm run|yarn)\s+(?:run\s+)?([\w:.-]+)/g)].map((m) => m[1])
      /* Ищется и ИМЯ команды, и сам файл: процесс имеет право звать
         храповик напрямую — `node tools/check-css.mjs`, — и это ровно то
         же самое. Ворота, знавшие только `check:css`, краснели на своём же
         наборе, чей CI зовёт файлом (И200). */
      const RUNS = /check[:-]css/
      const runsCss = (text) => RUNS.test(text) || calls(text).some((name) => RUNS.test(scripts[name] ?? ''))
      if (readdirSync(wf).some((f) => runsCss(readFileSync(join(wf, f), 'utf8')))) return true
    }
    if (existsSync(join(dir, '.git'))) break
    const up = dirname(dir)
    if (up === dir) break
    dir = up
  }
  return false
}

/** Все файлы `lib/` — там живут данные и их флаги. */
function libFiles() {
  const out = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(path)
    }
  }
  walk(join(ROOT, LIB))
  return out
}

/** Флаги настоящести — соглашение набора: факт, который пока образец, стоит
 *  за выключателем `export const ЧТО_IS_REAL = false` (или `_ARE_REAL`).
 *  Его спрашивает всё, что не имеет права врать машине: разметка, карта
 *  сайта, кнопка заказа. Наполнение считается пришедшим, когда все они
 *  стали `true`. */
export function realFlags() {
  const flags = []
  for (const path of libFiles()) {
    const text = readFileSync(path, 'utf8')
    for (const m of text.matchAll(/export const (\w+_(?:IS|ARE)_REAL)\s*=\s*(true|false)/g)) {
      flags.push({ name: m[1], on: m[2] === 'true', file: path.slice(ROOT.length) })
    }
  }
  return flags
}

/** Заглушки в данных: `[PHONE]`, `[COMPANY]`, `[BGXXXXXXXXX]`. Признак
 *  тот же, что у семьи `placeholder` в `check:craft`, только по исходнику,
 *  а не по отрисованной витрине: здесь браузер не нужен. */
export function placeholders() {
  const count = {}
  for (const path of libFiles()) {
    for (const m of readFileSync(path, 'utf8').matchAll(/\[[A-Z][A-Z _]{2,}\]/g)) {
      count[m[0]] = (count[m[0]] ?? 0) + 1
    }
  }
  return count
}

/** База храповика на нуле по названным семьям — или по всем. */
const clean = (baseline, families) => {
  const base = json(baseline)
  if (!base) return null
  const keys = families ?? Object.keys(base)
  return keys.filter((k) => (base[k] ?? 0) > 0)
}

/* ── этапы ─────────────────────────────────────────────────────────────── */

/**
 * Каждый этап: что строится, кто работает, чем меряется, ворота, что ждёт
 * своего дня.
 *
 *   machine — предикаты: `() => null | 'что не так'`. Это те ворота,
 *             которые проверка держит сама, без памяти.
 *   human   — то, что меряется глазом заказчика или снаружи. Печатается
 *             списком, чтобы было что отметить; проверка это не считает.
 *   parked  — чужие скиллы и инструменты, которые просыпаются здесь.
 *             Записаны адресом и тем, ЧТО из них брать: не «поставить
 *             скилл», а «взять справочник X как сверочный лист для Y».
 */
/** Где лежит лестница: выпущенное строителем плюс файл шкал, склеенные. */
const ladder = () => [LADDER, TOKENS].filter(Boolean).map((p) => src(p)).join('\n')

/** Все файлы стилей проекта — по папкам из kit.config.json. */
const styleFiles = () => {
  const out = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) { walk(full); continue }
      /* ROOT приходит из URL и кончается косой чертой: срез «длина + 1»
         съедал первую букву пути, и файл потом не читался вовсе — проверка
         молчала нулём на подложенном шве. Поймано обратным ходом. */
      if (entry.endsWith('.css')) out.push(full.slice(ROOT.replace(/\/$/, '').length + 1))
    }
  }
  for (const d of STYLE_DIRS) walk(join(ROOT, d))
  return out
}

/** Ширины, на которых раскладка меняет СМЫСЛ. Контейнерные запросы сюда не
 *  входят: компонент меряет свою коробку, а не окно (запрет 6). */
/** Пункт ворот, отмеченный в `docs/gate.md`: строка «- [x] …», в которой
 *  стоит текст пункта целиком. Переписали пункт — подтверждение лапается,
 *  и это верно: другой вопрос требует другого ответа (И209). */
export const confirmed = (text) =>
  src('docs/gate.md')
    .split('\n')
    .some((l) => l.trim().startsWith('- [x]') && l.includes(text))

/* Ширины из медиазапросов считает реестр швов (tools/seams.mjs); здесь имя
   оставлено, потому что его читают тесты. */
export { seamsIn }

const seams = () => {
  const found = new Set()
  for (const f of styleFiles()) for (const w of seamsIn(src(f))) found.add(w)
  return [...found].sort((a, b) => b - a)
}


/* ── шаги внутри этапа ─────────────────────────────────────────────────
   Этап — ворота; ШАГИ — что за чем внутри него. Порядок слоёв снят с
   первоисточников (docs/layers.md, §2: граф зависимостей пакетов, направление
   ссылок токенов, порядок подключения к живому проекту, порядок слоёв CSS —
   четыре независимых признака, и они сходятся). У шага — предикат по файлам
   (`✓` / `✗ причина`), а где решает заказчик — пункт, отмечаемый в
   docs/gate.md. Заведено 20.09.2026 по слову заказчика: «эти шаги понять,
   прописать, чтоб понять, какие шаги последующие и предыдущие». */
const tokensSrc = () => src(TOKENS ?? 'styles/tokens.css')
const primitivesSrc = () => src(PRIMITIVES ?? 'styles/primitives.module.css')
const scaleJson = () => json(LADDER?.replace(/\.css$/, '.json') ?? 'styles/scale.json') ?? json('styles/scale.json')
/* Слой считается СДЕЛАННЫМ не тогда, когда файлы на месте, а когда он
   пересмотрен против исследования — с датой и правилом, которым куплен
   (И223). Без `reviewed` предикат ✓ значит «есть, против исследования не
   пересмотрено»: так стояли слои 7–10, снятые с cbdin. `show` — где слой
   показан глазами (стенд, артефакт). */
const step = (layer, name, what, skill, done, owner, meta = {}) => ({ layer, name, what, skill, done, owner, ...meta })

export const STAGES = [
  {
    n: 0, name: 'Основание',
    builds: 'три шкалы (цвет, размер, ритм), двенадцать примитивов раскладки (ворота спрашивают пять), три брейкпоинта, правила в CLAUDE.md и проверки-храповики — с первого коммита, до первого блока.',
    skills: ['palette', 'scale', 'craft', 'code', 'stages'],
    steps: [
      step(0, 'Пороги и характер', 'что нельзя нарушать ни одним слоем (контраст 4.5 / 3, цель 44, три шва, телефон первым) и характер витрины словами', 'stages',
        () => {
          if (!has('tools/thresholds.mjs')) return 'порогов в одном месте нет (tools/thresholds.mjs)'
          return has('docs/decisions.md') ? null : 'нет docs/decisions.md — характер витрины и решения заказчика негде записать'
        },
        'характер витрины назван заказчиком словами и записан в docs/decisions.md',
        { reviewed: '20.09.2026', rule: 'И221: пороги в одном файле с источником у каждого' }),
      step(1, 'Имена и ярусы', 'сырьё → роль → узел по реестру tools/names.mjs; имя по форме и по назначению; ручка примитива не на корне', 'craft',
        () => {
          const l = ladder()
          const miss = []
          if (!l.includes(PREFIX.font)) miss.push('размер')
          if (!l.includes(PREFIX.space)) miss.push('ритм')
          if (!/--(air|pad|gap)-/.test(l)) miss.push('роли ритма --air/--pad/--gap')
          if (!/--n-1\b/.test(src('styles/palette.css'))) miss.push('ступени цвета (styles/palette.css)')
          if (!has('tools/names.mjs')) miss.push('реестра имён (tools/names.mjs)')
          return miss.length ? `имён нет: ${miss.join(', ')}` : null
        }, undefined,
        { reviewed: '20.09.2026', rule: 'И224: три яруса по реестру, узел читает роль, имя по форме, имя по просителю' }),
      step(2, 'Оси', 'тема, указатель, ширина, язык, движение, контраст — реестр tools/axes.mjs: чем включается, что меняется, что нет', 'craft',
        () => {
          const all = styleFiles().map(src).join('\n')
          const miss = []
          if (!all.includes('light-dark(')) miss.push('тема (light-dark)')
          if (!/pointer\s*:\s*coarse/.test(all)) miss.push('указатель (pointer: coarse)')
          if (!/:lang\(/.test(all) || !/quotes\s*:\s*auto/.test(all)) miss.push('язык (:lang, quotes: auto)')
          if (!/prefers-contrast/.test(all) || !/forced-colors/.test(all)) miss.push('контраст (prefers-contrast, forced-colors)')
          if (!/prefers-reduced-motion/.test(all)) miss.push('движение (prefers-reduced-motion)')
          if (!has('tools/axes.mjs')) miss.push('реестра осей (tools/axes.mjs)')
          return miss.length ? `осей нет: ${miss.join(', ')}` : null
        }, undefined,
        { reviewed: '20.09.2026', rule: 'И225: шесть осей в реестре; язык и контраст заведены, скроллбар — color-scheme' }),
      step(3, 'Цвет', 'три краски заказчика → семь семей по двенадцать ступеней → роли → замер; показано глазами', 'palette',
        () => {
          if (!has('styles/palette.json')) return 'палитры нет (styles/palette.json)'
          return src('styles/palette.json').includes('Стартовый') ? 'палитра стартовая — спросить у заказчика фирменный цвет' : null
        },
        'набор цвета показан заказчику отрисованным — не кодами, а кнопкой, которую он нажал',
        { reviewed: '20.09.2026', rule: 'И216, И219: три краски, остальное считает строитель; факты из кода', show: 'https://claude.ai/artifact/YFkJRbiGNH8gvm3KxvgoNH — строитель палитры глазами' }),
      step(4, 'База: кегль тела и клетка', 'два кегля тела (телефон / макет) и отношение лестницы — от них считаются и текст, и воздух', 'scale',
        () => {
          const f = Object.values(scaleJson() ?? {})[0]
          if (!f) return 'нет styles/scale.json — кегль тела и отношение не записаны'
          if (!(Array.isArray(f.тело) && f.тело.length === 2)) return 'в наборе нет двух кеглей тела (телефон / макет) — ключ «тело»'
          if (!(Array.isArray(f.отношение) && f.отношение.length === 2)) return 'в наборе нет двух отношений лестницы — ключ «отношение»'
          return has('tools/thresholds.mjs') ? null : 'порогов в одном месте нет (tools/thresholds.mjs)'
        }, undefined,
        { reviewed: '20.09.2026', rule: 'И222: тело и отношение, не таблица чисел прошлого проекта' }),
      step(5, 'Пространство', 'одна линейка ритма на клетке; роли по работе: поле внутри (rem), воздух между (px, парой ступеней), зазор в ряду (под палец); выпуск и замер', 'scale',
        () => {
          const l = ladder()
          const miss = ['--pad-', '--air-', '--gap-'].filter((x) => !l.includes(x))
          if (miss.length) return `ролей ритма нет: ${miss.join(' ')}`
          return script('check:scale') ? null : 'проверки шкал нет (check:scale)'
        },
        'набор ритма (тесный / нынешний / просторный / тихий) показан заказчику на стенде и назван словом',
        { reviewed: '20.09.2026', rule: 'И222: ритм множителями тела на клетке, воздух парой ступеней, проситель у каждой ступени', show: 'https://claude.ai/artifact/YZS2JiNiEXKdz2FA3wUtMC — стенд шкал, четыре набора' }),
      step(6, 'Типографика', 'роли текста пятью фактами (размер, межстрочье, вес, разрядка, мера); текучие заголовки; шрифт витрины', 'scale',
        () => {
          const t = Object.values(scaleJson() ?? {})[0]?.текст
          if (!t) return 'ролей текста нет (styles/scale.json → текст)'
          const bad = Object.entries(t).filter(([, r]) => !(r.размер && r.межстрочье && r.вес))
          return bad.length ? `роли текста без пяти фактов: ${bad.map(([k]) => k).join(', ')}` : null
        },
        'шрифт витрины показан заказчику отрисованным на её же тексте и назван',
        { reviewed: '20.09.2026', rule: 'И222: лестница по отношению 1.125 / 1.2; межстрочье по Butterick и Spectrum', show: 'https://claude.ai/artifact/YZS2JiNiEXKdz2FA3wUtMC — кадр «Роли текста»' }),
      step(7, 'Размер узлов', 'три размера — малый, средний, крупный — ролями из порогов; под пальцем ступень выше; орган считает всё от высоты', 'scale',
        () => {
          const l = ladder()
          if (!/--ctrl-h-sm\s*:/.test(l) || !/--ctrl-h-lg\s*:/.test(l)) return 'трёх размеров органа нет (--ctrl-h-sm / --ctrl-h / --ctrl-h-lg в styles/scale.css)'
          if (!/pointer\s*:\s*coarse[^{]*\{[^}]*--ctrl-h/.test(l)) return 'под пальцем высоты не растут (@media (pointer: coarse) в styles/scale.css)'
          if (!/\.tap\b/.test(primitivesSrc())) return 'запаса под палец нет (.tap)'
          return null
        }, undefined,
        { reviewed: '20.09.2026', rule: 'И226: три размера из порогов, под пальцем ступень выше, орган считает от высоты', show: 'https://claude.ai/artifact/Cs5sbn6y5H6jdbSTfmsLYm — стенд размеров органов, три размера на одной карточке' }),
      step(8, 'Раскладка', 'двенадцать примитивов, швы в реестре с именем и причиной и читателем у каждого, край и холст из строителя, кадр с потолком, узел меряет контейнер, число колонок вычисляется', 'craft',
        () => {
          const pr = primitivesSrc()
          const missing = ['stack', 'cluster', 'switcher', 'rail', 'prose', 'lede', 'pinned', 'sidebar', 'grid', 'sheet', 'menu', 'frame'].filter((c) => !new RegExp(`\\.${c}\\b`).test(pr))
          if (missing.length) return `примитивов нет: ${missing.join(', ')}`
          const shape = auditSeamsShape(SEAMS, LAYOUT.seams)
          if (shape.length) return shape[0]
          const ends = has('styles/scale.json') ? Object.values(JSON.parse(src('styles/scale.json'))).flatMap((s) => s.ширины ?? []) : []
          const dead = deadSeams(SEAMS, styleFiles().map((f) => ({ rel: f, css: src(f) })), ends)
          if (dead.length) return dead[0]
          if (!/--wrap\s*:/.test(ladder()) || !/--gut\s*:/.test(ladder())) return 'холст и край страницы (--wrap, --gut) не выпускает строитель шкал (styles/scale.css)'
          if (!/\.frame\b[^{]*\{[^}]*max-block-size/.test(pr)) return 'у кадра (.frame) нет потолка — пропорция без потолка займёт экран'
          return null
        }, undefined,
        { reviewed: '20.09.2026', rule: 'И227: шов — решение с именем и причиной, читаемое в обе стороны; край и холст из строителя; кадр с потолком; узел меряет контейнер' }),
      step(9, 'Форма', 'радиусы одной ручкой, лестница теней по высоте, толщина линии — у ступени смысл', 'craft',
        () => /--r-pill/.test(tokensSrc()) && /--sh-1/.test(tokensSrc()) ? null : 'радиусов (--r-*) или лестницы теней (--sh-*) нет'),
      step(10, 'Состояния и движение', 'один ответ на наведение, нажатие, фокус, недоступное; движение токеном; reduced-motion', 'craft',
        () => /--hover-t/.test(tokensSrc()) && /--a-press/.test(src('styles/palette.css')) ? null : 'ответа на указатель (--hover-t) или ступени нажатия (--a-press) нет'),
      step(11, 'Знаки и картинки', 'один лист знаков, одна толщина штриха в пикселях экрана, имя у безмолвного; снимки — механизм нарезки, сами снимки от заказчика', 'craft',
        () => has('components/Icons.tsx') || has('components/icons') || has('styles/icons.css') ? null : 'листа знаков нет (components/Icons.tsx) — заводится в проекте, знаки не рисуются по месту'),
      step(12, 'Слова', 'голос, словарь терминов на языках рынка, глагол на кнопке, ошибка у поля с шагом, пустой экран с шагом', 'shop',
        () => has('docs/words.md') ? null : 'словаря слов нет (docs/words.md) — заводится в проекте вместе с первым текстом'),
      step(13, 'Утилиты и исключения', 'ярлыки на одну задачу из шкалы; исключение — состояние атрибутом, не новый класс', 'craft',
        () => /\.(muted|eyebrow)\b/.test(primitivesSrc()) ? null : 'утилит из шкалы нет (.muted, .eyebrow в примитивах)'),
    ],
    checks: ['typecheck', 'check:css', 'check:scale', 'check:code', 'check:lint', 'check:tokens', 'check:port', 'test', 'check:rules', 'check:stage'],
    gate: {
      machine: [
        () => has('CLAUDE.md') ? null : 'нет CLAUDE.md — правила не читаются раньше кода',
        /* Лестница может лежать в двух местах: выпущенной строителем
           (`styles/scale.css`) или набранной в файле шкал. Ворота
           спрашивают ОБА — иначе переезд, который сам набор и сделал,
           закрывает пройденные ворота (И202). */
        () => ladder().includes(PREFIX.font) ? null : `шкалы размера ${PREFIX.font}* нет ни в ${LADDER}, ни в ${TOKENS ?? 'файле шкал (не назван в kit.config.json)'} — правило 1 ссылается в пустоту`,
        () => ladder().includes(PREFIX.space) ? null : `шкалы ритма ${PREFIX.space}* нет ни в ${LADDER}, ни в ${TOKENS ?? 'файле шкал (не назван в kit.config.json)'} — правило 2 ссылается в пустоту`,
        () => {
          if (!PRIMITIVES) return 'примитивов раскладки нет: файл не назван в kit.config.json (primitives) — раскладку пишут заново каждый раз'
          const p = src(PRIMITIVES)
          const missing = ['stack', 'cluster', 'switcher', 'rail', 'prose'].filter((c) => !new RegExp(`\\.${c}\\b`).test(p))
          return missing.length ? `примитивов раскладки нет: ${missing.join(', ')} (${PRIMITIVES})` : null
        },
        () => script('check:css') && has('tools/css-baseline.json') ? null : 'храповика по вёрстке нет (check:css + tools/css-baseline.json)',
        () => script('check:code') && has('tools/code-baseline.json') ? null : 'храповика по коду нет (check:code + tools/code-baseline.json)',
        /* Переносимость — ворота ОСНОВАНИЯ, а не сдачи. Правило заказчика:
           всё, что мы производим, должно становиться на разный движок и
           бекенд. Заведённое на этапе 5 оно означало бы «перенести готовый
           сайт», то есть переписать его; заведённое в день первый — что
           непереносимого просто не накапливается. */
        () => script('check:port') && has('tools/port-baseline.json') ? null : 'храповика по переносимости нет (check:port + tools/port-baseline.json)',
        () => ci() ? null : 'проверки не валят сборку сами — в .github/workflows/ нет процесса, который зовёт check:css',
        /* Два пункта ниже до 21.09.2026 стояли в списке «глазом» — и
           смотреть их было нечем, кроме как открыть файл и посчитать. Их
           обещали заказчику как «смотрю я», а он ответил: «я не знаю,
           принимать это или нет… только на тебя полагаться могу» (И206).
           Глаз, который можно заменить счётом, заменяется счётом (И208). */
        () => {
          const stray = seams().filter((w) => !BREAKPOINTS.some((b) => Math.abs(b - w) <= 1))
          if (stray.length) return `швы вне реестра: ${stray.join(', ')} — записаны ${BREAKPOINTS.join(', ')} (tools/seams.mjs)`
          const law = src('CLAUDE.md')
          const unnamed = BREAKPOINTS.filter((w) => !law.includes(String(w)))
          return unnamed.length ? `шов ${unnamed.join(', ')} не назван в CLAUDE.md — число без причины` : null
        },
        () => {
          if (!has('tools/css-baseline.json')) return null
          let n = 0
          try { n = JSON.parse(src('tools/css-baseline.json')).hueDirect ?? 0 } catch { return null }
          return n ? `узлы зовут краску по оттенку в ${n} местах — узел берёт роль (храповик hueDirect)` : null
        },
        /* Палитра — первое, что спрашивают у заказчика, и первое, что сессия
           забывает: до 21.09.2026 шага «спроси фирменный цвет» не было нигде,
           кроме моей памяти (И199). Теперь он всплывает в брифинге каждой
           сессии, пока цвет не назван. */
        () => {
          if (!has('styles/palette.json')) return 'палитры нет (styles/palette.json) — спросить у заказчика фирменный цвет и завести набор'
          return src('styles/palette.json').includes('Стартовый')
            ? 'палитра осталась стартовой — спросить у заказчика фирменный цвет и заменить «Стартовый — заменить»'
            : null
        },
      ],
      human: {
        /* смотрю я: токены, структура, поведение — по CLAUDE.md это
           решения исполнителя, и спрашивать о них заказчика значит
           перекладывать свою работу (И206). */
        mine: [
          /* Швы и имена ролей цвета отсюда ушли: их теперь считает машина
             (выше, И208). В списке остаётся то, чего счётом не заменить. */
          'палитра и шкалы отрисованы и просмотрены на обеих темах',
        ],
        /* решает заказчик: как выглядит витрина, что на ней написано,
           чьи снимки и реквизиты. Только это и печатается ему. */
        owner: [
          'набор цвета показан заказчику отрисованным — не кодами, а кнопкой, которую он нажал',
        ],
      },
    },
    parked: [
      { name: 'ui-ux-pro-max --design-system', url: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
        take: 'только на НОВОМ сайте, где системы ещё нет: режим выбора стиля и палитры в день первый. В проекте с tokens.css не ставится — второй набор чисел.' },
      { name: 'minimalist · brutalist · soft (taste-skill)', url: '.claude/skills/',
        take: 'за идеей стиля, не за числами: идея переводится в свои токены.' },
      /* Разбор — docs/skills.md, «cbdshop.bg». Обе записи — про то, как
         устроено ОСНОВАНИЕ; берутся при закладке нового сайта или при
         следующей правке шкал набора, не раньше. */
      { name: 'cbdshop.bg — реестр швов раскладки (packages/ui/src/tokens/seams.ts + seams.test.ts)',
        url: 'https://github.com/IgorAIdev/CBD_ecommerce_eu',
        take: 'идею, не числа: каждый шов — запись с причиной, тест падает и на незарегистрированной ширине в CSS, и на записи без ширины в CSS. У набора швы — список в kit.config.json, а причина каждого живёт только в CLAUDE.md словами.' },
      { name: 'cbdshop.bg — слой семантических токенов (packages/ui/src/tokens: primitives → semantic → base, один вход index.css)',
        url: 'https://github.com/IgorAIdev/CBD_ecommerce_eu',
        take: 'разделение шкал (primitives) и ролей (semantic) на два файла с одним входом. У набора всё в одном tokens.css на 177 переменных; делить — при следующей правке шкал, и тогда же переучить семью nearStep читать файл шкал, а не «tokens».' },
    ],
  },
  {
    n: 1, name: 'Каркас',
    builds: 'адреса и дерево маршрутов, язык адресом (/bg, /en), данные одной таблицей в lib/, карта сайта и robots как МЕХАНИЗМ, один факт о товаре — одно место.',
    skills: ['code', 'craft', 'shop', 'stages'],
    steps: [
      step(14, 'Адреса', 'дерево маршрутов — единственный список страниц; динамические сегменты из данных', 'code',
        () => has('tools/routes.mjs') ? null : 'дерева маршрутов нет (tools/routes.mjs)'),
      step(14, 'Язык адресом', 'язык — часть адреса (/bg, /en), не состояние браузера; все языки в дереве', 'shop',
        () => has('tools/routes.mjs') && /lang|locale|язык/i.test(src('tools/routes.mjs')) ? null : 'языки не в дереве маршрутов'),
      step(14, 'Данные одной таблицей', 'каждый факт о товаре живёт в одном месте (lib/), витрина спрашивает', 'shop',
        () => has(LIB) ? null : `нет ${LIB}/ — фактам негде жить в одном месте`),
      step(14, 'Карта сайта и robots как механизм', 'из дерева маршрутов, а не рукой', 'code',
        () => (has('app/sitemap.ts') || has('public/sitemap.xml')) && (has('app/robots.ts') || has('public/robots.txt')) ? null : 'карты сайта или robots нет как механизма'),
    ],
    checks: ['typecheck', 'check:tokens', 'check:port', 'check:open', 'build:site', 'check:urls', 'check:rules', 'check:stage'],
    gate: {
      machine: [
        () => has('tools/routes.mjs') ? null : 'дерева маршрутов нет (tools/routes.mjs) — список страниц будет набираться рукой',
        () => has('app') ? null : 'нет app/ — маршрутов ещё нет',
        () => has('app/sitemap.ts') || has('app/sitemap.xml') || has('public/sitemap.xml') ? null : 'карты сайта нет как механизма (app/sitemap.ts)',
        () => has('app/robots.ts') || has('public/robots.txt') ? null : 'robots нет как механизма (app/robots.ts)',
        () => script('check:open') && script('check:urls') ? null : 'проверок адресов нет (check:open, check:urls)',
      ],
      human: {
        /* смотрю я: токены, структура, поведение — по CLAUDE.md это
           решения исполнителя, и спрашивать о них заказчика значит
           перекладывать свою работу (И206). */
        mine: [
          'каждый факт о товаре живёт в одном месте (lib/), витрина его спрашивает, а не набирает второй раз',
          'служебные страницы (корзина, оформление, 404) названы одним списком и сами говорят о себе noindex',
          'если сайт не одноязычный — язык это адрес, а не состояние браузера',
        ],
        /* решает заказчик: как выглядит витрина, что на ней написано,
           чьи снимки и реквизиты. Только это и печатается ему. */
        owner: [
        ],
      },
    },
    parked: [],
  },
  {
    n: 2, name: 'Вёрстка',
    builds: 'блоки и страницы, отзывчивость по ширинам, обе темы, вкус и движение. Компонент меряет контейнер, а не окно; число колонок вычисляется.',
    skills: ['craft', 'scale', 'shop', 'code', 'taste-skill', 'emil-design-eng', 'impeccable', 'improve-animations', 'redesign-skill', 'stages'],
    steps: [
      step(14, 'Узлы', 'атомы → молекулы → организмы: кнопка, поле → карточка, счётчик, поиск → шапка, сетка, полоса покупки; без сырых значений, все состояния, оба указателя, обе темы', 'craft',
        () => has('components') ? null : 'нет components/ — узлов ещё нет'),
      step(15, 'Шаблоны', 'скелет каждой страницы с заглушками; пропорция снимка и предел длины — в проверках', 'craft'),
      step(16, 'Страницы по воронке', 'главная и раздел → список товаров с фильтром → страница товара → корзина → оформление (Baymard); «плохие» данные: корзина 1/10, полка 0/6/40, без фото, длинное название', 'shop'),
      step(16, 'Обе темы и все ширины', 'свип 320…1600 без переполнения; всё, что открывается, снято открытым в обеих темах', 'craft',
        () => script('sweep') || has('tools/sweep.mjs') ? null : 'свипа нет (tools/sweep.mjs)'),
    ],
    checks: ['typecheck', 'check:css', 'check:code', 'check:lint', 'check:tokens', 'check:port', 'test', 'check:open', 'build:site', 'check:urls', 'check:seo', 'check:craft', 'sweep', 'check:rules', 'check:stage'],
    gate: {
      machine: [
        () => script('check:craft') && has('tools/craft-baseline.json') ? null : 'храповика по отрисованной странице нет (check:craft + tools/craft-baseline.json)',
        () => script('sweep') ? null : 'свипа по ширинам нет (sweep)',
        () => {
          const bad = clean('tools/css-baseline.json', ['fontPx', 'spacingPx', 'breakpoint', 'ratioNoCap'])
          return bad === null ? 'базы check:css не прочитать' : bad.length ? `четыре запрета вёрстки не на нуле: ${bad.join(', ')}` : null
        },
      ],
      human: {
        /* смотрю я: токены, структура, поведение — по CLAUDE.md это
           решения исполнителя, и спрашивать о них заказчика значит
           перекладывать свою работу (И206). */
        mine: [
          'вычитан живой список Vercel по изменённым файлам (шаг 4 порядка работы craft)',
        ],
        /* решает заказчик: как выглядит витрина, что на ней написано,
           чьи снимки и реквизиты. Только это и печатается ему. */
        owner: [
          'свип 320…1600 показан заказчику: без горизонтального переполнения и без скачков высоты',
          'заказчик посмотрел витрину глазом и не нашёл дефекта — а найденное стало правилом в скилле',
        ],
      },
    },
    parked: [
      { name: 'Живой список Vercel — вычитывать перед сдачей вёрстки', url: 'https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md',
        take: 'список меняется у авторов; копировать его к себе нельзя — устареет. Читается целиком по изменённым файлам. Последняя вычитка: сентябрь, нашла три дефекта (фокус под шапкой при ходьбе табом, задержка нажатия на телефоне, цифры не равной ширины в столбцах) — все починены слоем, а не местом.' },
    ],
  },
  {
    n: 3, name: 'Поведение',
    builds: 'корзина, фильтры, формы, состояния (пусто, ошибка, ожидание), склады памяти браузера, панель настроек. Функция обновления состояния чиста; компонент помнит одно.',
    skills: ['code', 'shop', 'craft', 'systematic-debugging', 'test-driven-development', 'stages'],
    steps: [
      step(17, 'Поведение с падающего теста', 'корзина, фильтры в адресе, формы с ошибкой у поля, состояния пусто / ошибка / ожидание — каждое начинается с красного теста', 'code',
        () => script('test') ? null : 'тестов нет (test) — красный тест писать нечем'),
      step(17, 'Склады памяти браузера', 'localStorage и cookie — через один склад, компонент помнит одно', 'code'),
    ],
    checks: ['typecheck', 'check:code', 'check:lint', 'check:tokens', 'check:port', 'test', 'check:open', 'build:site', 'check:urls', 'check:craft', 'check:rules', 'check:stage'],
    gate: {
      machine: [
        () => {
          const bad = clean('tools/code-baseline.json', ['keep'])
          return bad === null ? 'базы check:code не прочитать' : bad.length ? 'память браузера идёт мимо склада (семья keep не на нуле)' : null
        },
        /* Линтер и прогон тестов — не набор, а проект: набор их не везёт,
           потому что они зависят от движка. Но без них поведение не
           сдаётся: мёртвый импорт и функция без проверки живут до первого
           покупателя. */
        () => script('lint') ? null : 'линтера нет (npm run lint) — мёртвые импорты никто не считает',
        () => script('test') ? null : 'прогона тестов нет (npm test) — test-driven-development ссылается в пустоту',
      ],
      human: {
        /* смотрю я: токены, структура, поведение — по CLAUDE.md это
           решения исполнителя, и спрашивать о них заказчика значит
           перекладывать свою работу (И206). */
        mine: [
          'каждое действие покупателя отвечает: нажатие видно, ошибка названа, пустое состояние нарисовано',
          'сканер React Doctor прогнан по изменённому, находки уровня «ошибка» разобраны',
          'долг check:code (повторы, длинные файлы, перегруженные компоненты) не вырос, а лучше — сократился',
        ],
        /* решает заказчик: как выглядит витрина, что на ней написано,
           чьи снимки и реквизиты. Только это и печатается ему. */
        owner: [
        ],
      },
    },
    parked: [
      { name: 'React Doctor в сборку', url: 'https://ui-skills.com',
        take: 'ставить в CI с порогом «не хуже, чем сегодня», когда находок уровня «ошибка» ноль.' },
    ],
  },
  {
    n: 4, name: 'Наполнение',
    builds: 'настоящие тексты, снимки с подписями, реквизиты фирмы, каналы связи, отзывы — от заказчика. Флаги настоящести переключаются в true; заглушки уходят с витрины.',
    skills: ['stages', 'shop', 'craft'],
    steps: [
      step(16, 'Настоящее от заказчика', 'тексты, снимки с подписями, реквизиты, каналы связи, отзывы; флаги настоящести в true, заглушек ноль', 'shop',
        () => {
          const flags = realFlags()
          if (!flags.length) return `флагов настоящести нет (${LIB}/*: export const ЧТО_IS_REAL) — образцы не отмечены, наполнение не заведено`
          const off = flags.filter((f) => !f.on)
          return off.length ? `флаги не в true: ${off.map((f) => f.name).join(', ')}` : null
        }),
    ],
    checks: ['test', 'check:tokens', 'check:port', 'build:site', 'check:craft', 'check:seo', 'check:rules', 'check:stage'],
    gate: {
      machine: [
        () => {
          const off = realFlags().filter((f) => !f.on)
          return off.length ? `данные ещё образцы: ${off.map((f) => `${f.name} (${f.file})`).join(', ')}` : null
        },
        () => {
          const ph = placeholders()
          const list = Object.entries(ph).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ×${n}`)
          return list.length ? `заглушки в данных: ${list.join(', ')}` : null
        },
        () => {
          const bad = clean('tools/craft-baseline.json', ['placeholder'])
          return bad === null ? 'базы check:craft не прочитать' : bad.length ? 'семья placeholder в check:craft не на нуле — заглушки на витрине' : null
        },
      ],
      human: {
        /* смотрю я: токены, структура, поведение — по CLAUDE.md это
           решения исполнителя, и спрашивать о них заказчика значит
           перекладывать свою работу (И206). */
        mine: [
        ],
        /* решает заказчик: как выглядит витрина, что на ней написано,
           чьи снимки и реквизиты. Только это и печатается ему. */
        owner: [
          'у каждого снимка подпись alt от заказчика, а не от исполнителя',
          'ни одного здравного утверждения на витрине — намеренно',
          'открытые вопросы наполнения в docs/open.md закрыты словом заказчика',
        ],
      },
    },
    parked: [
      { name: 'seo-content (claude-seo) — E-E-A-T и чистка ИИ-фраз', url: 'https://github.com/AgriciDaniel/claude-seo',
        take: 'тексты — работа заказчика; но перед тем как принять текст на витрину, его можно прогнать: «читается ли как написанное человеком, есть ли кто за ним стоит». Совет, не проверка.' },
    ],
  },
  {
    n: 5, name: 'Сдача',
    builds: 'то, что включают только на настоящем: карта сайта и robots открыты поиску, разметка товара с ценой и наличием, бюджет веса, скорость, доступность, внешний аудит по проду.',
    skills: ['stages', 'shop', 'craft', 'palette', 'scale', 'code', 'verification-before-completion'],
    steps: [
      step(18, 'Открыто поиску', 'карта сайта и robots открыты, разметка товара с ценой и наличием; check:seo на нуле', 'shop'),
      step(18, 'Вес, скорость, доступность', 'бюджет веса, Core Web Vitals, доступность в check:craft на нуле, PageSpeed и Rich Results глазом', 'craft'),
      step(18, 'Перенос', 'переносимый слой встаёт на другой движок: Shopify, WordPress, Medusa; поломки переносимости на нуле', 'craft'),
    ],
    checks: ['typecheck', 'check:css', 'check:code', 'check:lint', 'check:tokens', 'check:port', 'test', 'check:open', 'build:site', 'check:urls', 'check:seo', 'check:craft', 'sweep', 'check:rules', 'check:stage'],
    gate: {
      machine: [
        () => has('out') ? null : 'сайт не собран — npm run build:site',
        () => /Sitemap:/i.test(src('out/robots.txt')) ? null : 'out/robots.txt не называет карту сайта',
        () => /<loc>/.test(src('out/sitemap.xml')) ? null : 'out/sitemap.xml пуст',
        () => {
          const bad = clean('tools/seo-baseline.json')
          return bad === null ? 'базы check:seo не прочитать' : bad.length ? `check:seo не на нуле: ${bad.join(', ')} — перед сдачей долга по разметке быть не должно` : null
        },
        () => {
          const bad = clean('tools/craft-baseline.json', ['contrast', 'target', 'name', 'focus', 'theme'])
          return bad === null ? 'базы check:craft не прочитать' : bad.length ? `доступность не на нуле в check:craft: ${bad.join(', ')}` : null
        },
        /* Три семьи из шести — не долг, а поломка на чужом движке: переменная
           без объявления выбрасывает объявление целиком, разошедшийся класс
           ломает блок только там, протёкший движок делает общий слой
           необщим. К сдаче они обязаны быть на нуле.

           Остальные три (две правды у токена, компонент, сам сходивший за
           списком, валюта литералом) — настоящий долг: он мешает переезду,
           но витрину не ломает. Их держит храповик, а не эти ворота. */
        () => {
          const bad = clean('tools/port-baseline.json', ['varGone', 'markupDrift', 'engineInShared'])
          return bad === null ? 'базы check:port не прочитать' : bad.length ? `переносимость сломана: ${bad.join(', ')} — на другом движке это не работает (npm run check:port -- --list)` : null
        },
      ],
      human: {
        /* смотрю я: токены, структура, поведение — по CLAUDE.md это
           решения исполнителя, и спрашивать о них заказчика значит
           перекладывать свою работу (И206). */
        mine: [
          'PageSpeed Insights / Lighthouse по проду: LCP, CLS, INP зелёные на телефоне',
          'Rich Results Test на странице товара: Product с Offer читается без ошибок',
          'внешний аудит по проду: claude-seo (/seo audit, /seo schema, /seo hreflang, /seo technical) — находки разобраны',
          'бюджет веса страницы: скрипты, стили, снимки первого экрана — замерены по отданному и сжатому, а не по out/ целиком',
        ],
        /* решает заказчик: как выглядит витрина, что на ней написано,
           чьи снимки и реквизиты. Только это и печатается ему. */
        owner: [
        ],
      },
    },
    parked: [
      { name: 'Наборы цвета: включить выбор', url: 'lib/palettes.json',
        take: 'решено заказчиком: сперва доводится до конца сегодняшняя палитра, к остальным возвращаемся здесь. Наборы уже лежат данными и показаны на /design — «Тёплый лист», «Аптека» и «Олива», обе половины выведены по правилам тёмной темы, и check:theme меряет каждый набор. Осталось одно: решить, нужен ли выбор вообще, и если да — писать набор в те же девять полей цвета панели (cPage, cSurface, cTile, cCtrl, cField, cMenu, cInk, cAccent, cChrome). Покупателю выбор не показывается: магазин должен выглядеть одинаково у всех. И десятое поле: краска ошибки — роль --bad завелась ради формы заказа и измерена, но её несёт только сегодняшняя палитра; набор без своей — покраснеет не тем красным.' },
      { name: 'Перенос на другие движки: Shopify, WordPress, Medusa', url: 'packages/ui/README.md',
        take: 'решено заказчиком: сам перенос делается здесь, а не по ходу вёрстки — иначе каждый блок пишется дважды. К этому дню долг по переносимости уже посчитан (npm run check:port -- --list): дописать пакету недостающие токены, довести паритет блоков, вынести списки из компонентов в страницы. Источник данных берётся скиллом своего движка (см. «скиллы источника данных» ниже по списку платформ).' },
      { name: 'web-quality-skills/seo (Addy Osmani)', url: 'https://github.com/addyosmani/web-quality-skills',
        take: 'references/STRUCTURED-DATA.md — сверочный лист для lib/ld.ts в день включения offers; чеклист аудита — прочитать один раз. Измеримая половина уже в check:seo.' },
      { name: 'claude-seo (AgriciDaniel)', url: 'https://github.com/AgriciDaniel/claude-seo',
        take: 'ставится у заказчика, не в проект (8 МБ, Python, Playwright): по проду прогнать /seo audit, /seo schema, /seo hreflang, /seo technical. Правила hreflang и разметки уже в check:seo.' },
      { name: 'web-quality-skills/core-web-vitals + performance', url: 'https://github.com/addyosmani/web-quality-skills',
        take: 'отправные числа бюджета веса (страница 1.5 МБ, скрипты 300 КБ, стили 100 КБ) — для check:weight, который ещё не заведён. Серверная половина не про статический экспорт.' },
      { name: 'web-quality-skills/accessibility (WCAG.md)', url: 'https://github.com/addyosmani/web-quality-skills',
        take: 'прочитать один раз перед сдачей как список; меряется уже семьями check:craft.' },
      { name: 'web-quality-skills/best-practices (SECURITY.md)', url: 'https://github.com/addyosmani/web-quality-skills',
        take: 'заголовки безопасности (CSP, HSTS, X-Content-Type-Options) — это конфиг нгинкса в deploy/, не разметка; сверить один раз перед сдачей. Остальное (doctype, кодировка, viewport, aspect-ratio снимков) уже в check:seo и check:craft.' },
    ],
  },
  {
    n: 6, name: 'Жизнь',
    builds: 'сайт показан людям: Search Console, замер после каждого выката, слежение за тем, что разметка и адреса не уехали, новые тексты по спросу.',
    skills: ['stages', 'shop', 'craft', 'code'],
    steps: [
      step(19, 'Жизнь', 'Search Console, замер после каждого выката, слежение за адресами и разметкой, новые тексты по спросу; версия у слепка, переименование псевдонимом со сроком', 'stages'),
    ],
    checks: ['typecheck', 'check:css', 'check:code', 'check:lint', 'check:tokens', 'check:port', 'test', 'check:open', 'build:site', 'check:urls', 'check:seo', 'check:rules', 'check:stage'],
    gate: {
      machine: [],
      human: {
        /* смотрю я: токены, структура, поведение — по CLAUDE.md это
           решения исполнителя, и спрашивать о них заказчика значит
           перекладывать свою работу (И206). */
        mine: [
          'после каждого выката: адреса и разметка не уехали — это CI (check:urls, check:seo), а не память',
          'у сайта одна витрина и один домен: образцов на нём не осталось нигде',
        ],
        /* решает заказчик: как выглядит витрина, что на ней написано,
           чьи снимки и реквизиты. Только это и печатается ему. */
        owner: [
          'Search Console подключена, карта сайта отправлена, ошибок обхода нет',
        ],
      },
    },
    parked: [
      { name: 'seo-google (claude-seo) — Search Console, PageSpeed, CrUX', url: 'https://github.com/AgriciDaniel/claude-seo',
        take: 'нужны учётки заказчика; отчёт по настоящим данным раз в месяц.' },
      { name: 'seo-drift (claude-seo)', url: 'https://github.com/AgriciDaniel/claude-seo',
        take: 'идея «слепок до/после выката» — у нас это делают check:urls и check:seo в CI. Не ставить, а помнить, что уже есть.' },
    ],
  },
]

/**
 * Спит, пока в проекте нет механики. Это не этап, а предикат по конфигу:
 * скилл платформы ставится в день, когда описанное в нём заработало, и ни
 * днём раньше (правило craft: «скилл платформы ставится в день, когда
 * механика появилась»). `npm run stage` печатает такие отдельно и громко
 * говорит, когда предикат стал истинным.
 */
export const PLATFORM = [
  {
    name: 'next-cache-components · next-cache-components-optimizer (vercel/next.js)',
    url: 'https://github.com/vercel/next.js',
    sleeps: 'пока в next.config.ts стоит output: "export" — сервера нет, кэшировать и навигацию ускорять нечего',
    awake: () => has('next.config.ts') && !/output:\s*['"]export['"]/.test(src('next.config.ts')),
    take: 'в день, когда экспорт уйдёт (данные в момент запроса: остатки, корзина, заказы) — включить cacheComponents их первым скиллом и пройти вторым по маршрутам, которые он назовёт заблокированными.',
  },
  {
    name: 'test-driven-development (Superpowers)',
    url: '.claude/skills/test-driven-development/',
    sleeps: 'пока в package.json нет `test` — красный тест перед кодом писать нечем',
    awake: () => script('test'),
    take: 'с этого дня правка поведения начинается с падающего теста; скилл лежит рядом и применяется как написан.',
  },
  {
    name: 'скиллы источника данных (Payload, Vendure) и платёжного шлюза',
    url: 'README.md — раздел «Стекът»',
    sleeps: 'пока каталог — массив в lib/products.ts',
    awake: () => /payload|vendure|@medusajs|shopify/i.test(src('package.json')),
    take: 'lib/products.ts сохраняет форму: меняется тело, с литерала на запрос. Эта форма и есть договор с бекендом — Medusa, Payload, Vendure, Shopify Storefront: витрина знает `Product`, а не то, откуда он приехал. Держит договор семья dataInView в check:port: компонент получает список, а не ходит за ним. Скилл берётся за тем, как ходить за данными, а не за тем, как их показывать.',
  },
  {
    name: 'приёмник статей от своего сервиса Hemp scale',
    url: 'docs/decisions.md — «Статьи от своего сервиса — после Payload»',
    sleeps: 'пока статьи — массив в lib/blog.json: писать снаружи некуда, и заказчик решил подключать после Payload',
    awake: () => /payload/i.test(src('package.json')),
    take: 'сервис — свой, и пишет он в НАШЕЙ форме, а не мы в его: переходников с WordPress и Shopify не нужно. В день Payload: (1) заказчик правит форму статьи (`Post` в lib/blog.ts — он сказал, что хочет; до этого форму не записывать как договор); (2) форма становится коллекцией статей в Payload — те же поля, обе языковые половины, — и её API есть описание для сервиса; (3) на входе стоит проверка, которая не пускает статью без второго языка, с обещанием действия (lib/claims.ts), со ссылкой на несуществующую статью или товар, без источников, — сервис это программа, а отвечает по закону витрина; (4) тексты статьи — наполнение, не моя работа: проверяется устройство, не слова.',
  },
]

/** Скиллы, которые работают на любом этапе: процесс, а не предмет. */
export const ALWAYS = [
  'stages', 'craft (при любой правке CSS)', 'palette (при любой правке красок, ролей цвета и строителя палитры)', 'scale (при любой правке кеглей, ритма, полей, воздуха и строителя шкал)', 'code (при любой правке TypeScript)', 'shop (при любой правке товара, полки, корзины, страниц магазина)',
  'Superpowers: brainstorming · writing-plans · systematic-debugging · verification-before-completion · finishing-a-development-branch',
]

/* ── текущий этап ──────────────────────────────────────────────────────── */

/** Строка в CLAUDE.md: `Этап производства: **2 · Вёрстка**`. Одно место,
 *  и его читают двое — модель в начале сессии и этот файл. */
export const STAGE_LINE = /Этап производства:\s*\**\s*(\d)/

export function currentStage() {
  const m = src('CLAUDE.md').match(STAGE_LINE)
  if (!m) return null
  return STAGES.find((s) => s.n === Number(m[1])) ?? null
}

/** Ворота этапа: список того, что не держится. Пустой список — ворота
 *  держатся. */
export function gateProblems(stage) {
  const out = []
  for (const test of stage.gate.machine) {
    let r
    try { r = test() } catch (e) { r = `предикат упал: ${e.message}` }
    if (r) out.push(r)
  }
  return out
}
