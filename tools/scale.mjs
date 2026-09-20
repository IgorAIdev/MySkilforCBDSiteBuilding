/*
 * Строитель шкал: два числа на ступень → рампа, которая между ними течёт.
 *
 * ЧТО ЭТО ТАКОЕ, одной фразой: станок, который из списка «сколько на
 * телефоне и сколько на мониторе» считает весь CSS размеров и воздуха.
 * Владелец говорит «между разделами — 56 и 80», машина пишет
 * `clamp(56px, 30.15px + 4.62vw, 80px)` и ручается, что на телефоне это
 * ровно 56, на макете ровно 80, а между ними течёт без ступенек.
 *
 * ЗАЧЕМ. До 21.09.2026 двадцать пять таких строк стояли в
 * `styles/tokens.css` набранными рукой, а формула к ним — словами в
 * комментарии рядом: «наклон = (макс − мин) / 5.2, свободный член =
 * мин − (макс − мин) × 1.0769, концы на 560 и 1080». Формула, живущая
 * словами, исполняется головой, а голова ошибается ровно там, где числа
 * похожи: у `--sp-11` свободный член скопирован у `--sp-9` (оба 30.77),
 * и ступень, обещавшая 100 на макете, доходила там до 93. Никто этого не
 * видел: ни один сторож набора не умел читать рампу.
 *
 * Это ровно тот же дефект, которым куплена палитра (И194): правило
 * записано, сторож считает, а сделать этим нечего — числа всё равно
 * набирает рука. Поэтому устройство то же самое, и намеренно:
 *
 *   styles/scale.json   — числа ВЛАДЕЛЬЦА: что на телефоне, что на макете
 *   tools/scale.mjs     — эта математика: одна на выпуск и на замер
 *   styles/scale.css    — выпущенное машиной, руками не правится
 *
 * Считает ОДИН код и для выпуска, и для проверки: иначе зелёный отчёт
 * перестанет говорить что-либо о том, чем сайт размечен.
 *
 * Разбор, числа и источники — `.claude/skills/craft/references/scale.md`.
 */

import { PREFIX, BREAKPOINTS } from './kit-config.mjs'

/** Корень браузера. Поле пишется в rem (правило «поле растёт с буквами»),
 *  а считается в тех же пикселях, что и всё остальное: делить на 16
 *  приходится в одном месте, и это место здесь. */
export const ROOT_FS = 16

/** Число в CSS так, как его пишут в этом наборе: без нуля впереди
 *  (`.19vw`), без хвостовых нулей (`5vw`, а не `5.00vw`). */
export const num = (n, dp = 2) => {
  const r = Number(n.toFixed(dp))
  const s = String(r)
  if (s.startsWith('0.')) return s.slice(1)
  if (s.startsWith('-0.')) return `-${s.slice(2)}`
  return s
}

const write = (px, unit) => (unit === 'rem' ? `${num(px / ROOT_FS, 4)}rem` : `${num(px)}px`)

/**
 * Рампа одной ступени.
 *
 * `clamp(низ, свободный член + наклон·vw, верх)`, где прямая проходит
 * ЧЕРЕЗ ДВЕ НАЗВАННЫЕ ШИРИНЫ: на узкой она даёт низ, на широкой — верх.
 * Слагаемое в px обязательно: голый `vw` не растёт при зуме (WCAG 1.4.4,
 * F94) — за этим же следит семья `bareVw` в `check:css`.
 *
 * Свободный член считается по НЕокруглённому наклону и округляется после:
 * округлив сначала, получаем прямую, промахивающуюся мимо своих же концов
 * на полпикселя.
 */
export const ramp = ([min, max], [wMin, wMax], unit = 'px') => {
  if (min === max) return write(min, unit)
  const slope = (max - min) / ((wMax - wMin) / 100)
  const base = Number((min - slope * (wMin / 100)).toFixed(2))
  return `clamp(${write(min, unit)}, ${write(base, unit)} + ${num(slope)}vw, ${write(max, unit)})`
}

/** Где рампа окажется на данной ширине — тем же счётом, каким её выпустили.
 *  Нужен замеру: обещание «на 560 будет 56» проверяется подстановкой, а не
 *  доверием к формуле. */
export const at = ([min, max], [wMin, wMax], width) => {
  if (min === max) return min
  const slope = (max - min) / ((wMax - wMin) / 100)
  const base = Number((min - slope * (wMin / 100)).toFixed(2))
  return Math.min(max, Math.max(min, base + Number(num(slope)) * (width / 100)))
}

/* ── чтение набора ───────────────────────────────────────────────────────
 *
 * Ключи по-русски, и это не украшение: файл открывает владелец, а не
 * машина. «воздух → между разделами» он прочтёт, `air.page` — нет.
 */

/** Ступень ритма по её имени в наборе: `"10"` → `var(--sp-10)`. */
const stepVar = (n) => `var(${PREFIX.space}${n})`

/** Развёрнутый набор: каждое имя → пара чисел (низ, верх) в пикселях.
 *  Одна таблица на выпуск, на замер и на стенд — чтобы стенд показывал
 *  ровно то, что выпущено. */
export const resolve = (set) => {
  const out = { ширины: set.ширины, размер: {}, ритм: {}, поле: {}, воздух: {}, зазор: {} }
  for (const [name, pair] of Object.entries(set.размер ?? {})) out.размер[name] = pair
  for (const [name, pair] of Object.entries(set.ритм ?? {})) out.ритм[name] = pair
  for (const [name, pair] of Object.entries(set.поле ?? {})) out.поле[name] = pair
  /* Воздух не заводит своих чисел: он ССЫЛАЕТСЯ на ступень ритма. Вторая
     шкала чисел для воздуха — путь, который Carbon прошёл (`layout-01…07`)
     и отменил обратно в единую: «do not use in new work». */
  for (const [name, step] of Object.entries(set.воздух ?? {})) {
    const pair = out.ритм[String(step)]
    if (!pair) throw new Error(`воздух «${name}» просит ступень ритма ${step}, которой в наборе нет`)
    out.воздух[name] = { step: String(step), pair }
  }
  for (const [name, pair] of Object.entries(set.зазор ?? {})) out.зазор[name] = pair
  return out
}

/* ── выпуск ──────────────────────────────────────────────────────────── */

const block = (set, indent = '  ') => {
  const r = resolve(set)
  const w = set.ширины
  const lines = []
  const put = (name, value, why) =>
    lines.push(`${indent}${name}: ${value};${why ? `${' '.repeat(Math.max(1, 46 - name.length - value.length))}/* ${why} */` : ''}`)

  for (const [name, pair] of Object.entries(r.размер)) {
    put(`${PREFIX.font}${name}`, ramp(pair, w), set.подписи?.размер?.[name])
  }
  for (const [name, pair] of Object.entries(r.ритм)) {
    put(`${PREFIX.space}${name}`, ramp(pair, w), set.подписи?.ритм?.[name])
  }
  /* Поле — в rem: оно лежит вокруг ТЕКСТА, и когда покупатель поднял шрифт
     в телефоне, буквы выросли, а поле в px осталось бы прежним (WCAG 1.4.4,
     Comeau). Воздух и зазор с текстом не связаны и растут только с шириной
     — они в px. Семья `padPx` не пускает поле обратно. */
  for (const [name, pair] of Object.entries(r.поле)) {
    put(`--pad-${name}`, ramp(pair, w, 'rem'), set.подписи?.поле?.[name])
  }
  for (const [name, { step }] of Object.entries(r.воздух)) {
    put(`--air-${name}`, stepVar(step), set.подписи?.воздух?.[name])
  }
  for (const [name, pair] of Object.entries(r.зазор)) {
    put(`--gap-${name}`, `${num(pair[0])}px`, set.подписи?.зазор?.[name])
  }
  return lines.join('\n')
}

/** Зазор под пальцем — второе значение той же переменной, а не вторая
 *  переменная: Primer держит `controlStack.gap` 8 под курсором и 16 под
 *  пальцем одним именем, и всё про палец у набора живёт в этом запросе. */
const coarse = (set, sel) => {
  const pairs = Object.entries(set.зазор ?? {}).filter(([, p]) => p[1] !== p[0])
  if (!pairs.length) return ''
  const body = pairs.map(([name, p]) => `--gap-${name}:${num(p[1])}px`).join('; ')
  return `\n@media (pointer:coarse){ ${sel}{ ${body} } }\n`
}

/**
 * Весь файл: `styles/scale.json` → `styles/scale.css`.
 *
 * Первый набор стоит на корне — он показывается, когда никто ничего не
 * выбирал, — И под своим именем, как все (И198: иначе переключатель наборов
 * работает во все стороны, кроме возврата к первому).
 */
export const toCss = (sets) => {
  const names = Object.keys(sets)
  const head =
    `/* Собран tools/scale-css.mjs из styles/scale.json. Руками не правят:\n` +
    `   первый же выпуск сотрёт правку. Числа владельца — в scale.json, здесь\n` +
    `   они СЧИТАНЫ по одной формуле (шкал: ${names.length}).\n\n` +
    `   Рампа каждой ступени проходит через две названные ширины: на узкой\n` +
    `   даёт свой низ, на широкой — свой верх. Концы — швы раскладки. */\n\n`
  let out = head + `:root{\n${block(sets[names[0]])}\n}\n` + coarse(sets[names[0]], ':root')
  for (const name of names) {
    const sel = `[data-scale="${name}"]`
    out += `\n${sel}{\n${block(sets[name])}\n}\n` + coarse(sets[name], sel)
  }
  return out
}

/* ── замер ───────────────────────────────────────────────────────────────
 *
 * Меряется НАБОР ЧИСЕЛ, а не выпущенный файл: все дефекты, которыми эта
 * работа куплена, рождаются в числах, а файл — их следствие. Отстал ли файл
 * от чисел, спрашивает `scale-css.mjs --check`.
 */

/** Порог различимости соседних ступеней. Тот же, что у семьи `nearStep` в
 *  `check:css`, и по той же причине: ниже 8% разница в 13 и 14 пикселей не
 *  видна никому, включая того, кто её ставил. */
export const NEAR = 1.08
/** Разброс одной ступени. Utopia роняет ступень, когда верх больше низа в
 *  2.5 раза: выше этого рампа при зуме 200% упирается в потолок раньше,
 *  чем текст вырастет вдвое (WCAG 1.4.4). */
export const SPREAD = 2.5
/** Воздух между разделами к полю карточки. Замер семи живых люкс-магазинов
 *  20.09.2026: Muji 2.6…3.5 : 1, Glossier 5 : 1 (docs/layers.md, §3.3).
 *  Ниже трёх предметы и промежутки одного размера — ритма нет. */
export const AIR_TO_PAD = 3
/** Насколько роль растёт от телефона к макету. Тот же замер: ×1.33…1.5 у
 *  всех семи. Спрашивается с воздуха — он и держит «дорогой» вид. */
export const GROWTH = [1.33, 1.5]
/** Поле не бывает нулём: предмет, содержимое которого лежит на его
 *  собственном крае, — не предмет, а обрыв. Ниже 8 — доводка, не ступень. */
export const PAD_FLOOR = 8
/** Зазор между соседними целями под пальцем. WCAG 2.2 «Target Size
 *  (Minimum)» засчитывает цель меньше 24 только при таком же просвете;
 *  Primer держит 16. */
export const TAP_GAP = 16

const ladder = (pairs, kind, findings) => {
  const names = Object.keys(pairs)
  for (let i = 1; i < names.length; i++) {
    const a = pairs[names[i - 1]], b = pairs[names[i]]
    for (const end of [0, 1]) {
      const where = end === 0 ? 'узкий конец' : 'широкий конец'
      if (b[end] <= a[end]) {
        findings.push({
          rule: `лестница ${kind} не убывает`,
          got: `${names[i - 1]} → ${names[i]}: ${a[end]} → ${b[end]}px (${where})`,
          need: 'следующая ступень больше предыдущей на обоих концах',
        })
      } else if (b[end] / a[end] < NEAR) {
        findings.push({
          rule: `ступени ${kind} различимы`,
          got: `${names[i - 1]} → ${names[i]}: ${a[end]} → ${b[end]}px (+${Math.round((b[end] / a[end] - 1) * 100)}%, ${where})`,
          need: `не ближе ${Math.round((NEAR - 1) * 100)}%`,
        })
      }
    }
  }
}

/** Находки одного набора. Пустой список — набор в норме. */
export const auditScale = (set) => {
  const findings = []
  const w = set.ширины

  if (!Array.isArray(w) || w.length !== 2 || !(w[0] < w[1])) {
    findings.push({ rule: 'две ширины', got: JSON.stringify(w ?? null), need: 'узкая и широкая, узкая меньше' })
    return findings
  }
  /* Концы рампы — НАЗВАННЫЕ швы, а не произвольные числа. Иначе шкала
     течёт мимо тех ширин, на которых раскладка меняет смысл, и «ступенька
     размера на шве» (запрет 3) появляется там, где её никто не искал. */
  for (const width of w) {
    if (!BREAKPOINTS.includes(width)) {
      findings.push({
        rule: 'концы рампы — швы раскладки',
        got: `${width}px`,
        need: `один из швов ${BREAKPOINTS.join(', ')}`,
      })
    }
  }

  const r = resolve(set)
  ladder(r.размер, 'размера', findings)
  ladder(r.ритм, 'ритма', findings)

  for (const [kind, table] of [['размера', r.размер], ['ритма', r.ритм], ['поля', r.поле]]) {
    for (const [name, [min, max]] of Object.entries(table)) {
      if (max / min > SPREAD) {
        findings.push({
          rule: `разброс ступени ${kind}`,
          got: `${name}: ${min} → ${max}px (×${(max / min).toFixed(2)})`,
          need: `верх не больше ${SPREAD} низов`,
        })
      }
      /* Обещание подстановкой: на узкой ширине рампа обязана дать свой низ,
         на широкой — свой верх. Так ловится свободный член, списанный у
         соседней ступени: `--sp-11` обещал 100 и давал 93. */
      for (const [width, want] of [[w[0], min], [w[1], max]]) {
        const got = at([min, max], w, width)
        if (Math.abs(got - want) > 0.1) {
          findings.push({
            rule: `рампа держит свой конец (${kind})`,
            got: `${name}: на ${width}px даёт ${got.toFixed(2)}px`,
            need: `${want}px`,
          })
        }
      }
    }
  }

  for (const [name, [min]] of Object.entries(r.поле)) {
    if (min < PAD_FLOOR) {
      findings.push({ rule: 'поле не ноль', got: `${name}: ${min}px на узком конце`, need: `не меньше ${PAD_FLOOR}px` })
    }
  }

  /* Воздух страницы к полю карточки — то, чем держится дорогой вид. Роли
     названы в наборе; если владелец назвал их иначе, правило молчит, а не
     придумывает себе предмет. */
  const air = r.воздух['page'] ?? r.воздух['страница']
  const pad = r.поле['card'] ?? r.поле['карточка']
  if (air && pad) {
    for (const end of [0, 1]) {
      const ratio = air.pair[end] / pad[end]
      if (ratio < AIR_TO_PAD) {
        findings.push({
          rule: 'воздух к полю',
          got: `${air.pair[end]} : ${pad[end]} = ${ratio.toFixed(1)} : 1 (${end === 0 ? 'узкий' : 'широкий'} конец)`,
          need: `не меньше ${AIR_TO_PAD} : 1`,
        })
      }
    }
    const growth = air.pair[1] / air.pair[0]
    if (growth < GROWTH[0] || growth > GROWTH[1]) {
      findings.push({
        rule: 'воздух растёт в коридоре',
        got: `${air.pair[0]} → ${air.pair[1]}px (×${growth.toFixed(2)})`,
        need: `×${GROWTH[0]}…${GROWTH[1]} — замер живых магазинов`,
      })
    }
  }

  for (const [name, [fine, tap]] of Object.entries(r.зазор)) {
    if (tap < TAP_GAP) {
      findings.push({ rule: 'зазор под пальцем', got: `${name}: ${tap}px`, need: `не меньше ${TAP_GAP}px` })
    }
    if (tap < fine) {
      findings.push({ rule: 'палец не теснее курсора', got: `${name}: ${tap} против ${fine}px`, need: 'под пальцем не меньше' })
    }
  }

  return findings
}

/* ── вторая половина замера: шкала объявлена в одном месте ────────────────
 *
 * Строитель отвечает за свои числа, но не мешает написать рядом ещё одну
 * ступень рукой — а это тот самый признак заплатки из правил проекта: на
 * вопрос «где это решается?» ответов стало два. Ровно так и жил `--sp-11`:
 * рампа, набранная рукой рядом с формулой, описанной словами.
 */

/** Имена, которые выпускает строитель: их объявляет он и только он. */
export const builtNames = (sets) => {
  const names = new Set()
  for (const set of Object.values(sets)) {
    const r = resolve(set)
    for (const name of Object.keys(r.размер)) names.add(`${PREFIX.font}${name}`)
    for (const name of Object.keys(r.ритм)) names.add(`${PREFIX.space}${name}`)
    for (const name of Object.keys(r.поле)) names.add(`--pad-${name}`)
    for (const name of Object.keys(r.воздух)) names.add(`--air-${name}`)
    for (const name of Object.keys(r.зазор)) names.add(`--gap-${name}`)
  }
  return names
}

/** Разбор рампы обратно в числа: `clamp(48px, 30.77px + 3.08vw, 64px)` →
 *  низ, верх, свободный член, наклон. Не рампа — `null`. */
export const readRamp = (value) => {
  const m = String(value).match(
    /clamp\(\s*(-?[\d.]+)(px|rem)\s*,\s*(-?[\d.]+)(px|rem)\s*\+\s*(-?[\d.]+)vw\s*,\s*(-?[\d.]+)(px|rem)\s*\)/)
  if (!m) return null
  const k = (n, unit) => Number(n) * (unit === 'rem' ? ROOT_FS : 1)
  return { min: k(m[1], m[2]), base: k(m[3], m[4]), slope: Number(m[5]), max: k(m[6], m[7]) }
}

/**
 * Держит ли рукописная рампа свои концы на названных ширинах.
 *
 * Тот самый замер, которого не было: `--sp-11` обещал 100 пикселей на
 * макете и давал там 93, потому что свободный член был списан у `--sp-9`.
 * Глазом это не видно — числа правдоподобные, — а подстановкой видно сразу.
 */
export const missesEnds = (value, [wMin, wMax]) => {
  const r = readRamp(value)
  if (!r) return null
  const on = (width) => r.base + r.slope * (width / 100)
  const lo = on(wMin), hi = on(wMax)
  const off = []
  if (Math.abs(lo - r.min) > 0.5) off.push(`на ${wMin}px даёт ${lo.toFixed(1)} вместо ${r.min}`)
  if (Math.abs(hi - r.max) > 0.5) off.push(`на ${wMax}px даёт ${hi.toFixed(1)} вместо ${r.max}`)
  return off.length ? off.join('; ') : null
}

/**
 * Находки по файлам стилей: имя строителя, объявленное мимо него, и
 * рукописная рампа, промахивающаяся мимо своих концов.
 *
 * `sheets` — список `{ rel, css }` (выпущенный файл в него не входит: его
 * пишет машина). `widths` — две названные ширины первого набора.
 */
export const auditSheets = (sheets, sets) => {
  const built = builtNames(sets)
  const widths = Object.values(sets)[0]?.ширины ?? [560, 1080]
  const findings = []
  for (const { rel, css } of sheets) {
    for (const m of css.matchAll(/(?:^|[;{])\s*(--[\w-]+)\s*:\s*([^;}]+)/g)) {
      const [, name, value] = m
      const line = css.slice(0, m.index).split('\n').length
      if (built.has(name)) {
        /* Переобъявить роль РОЛЬЮ — законно и нужно: лист на тёмной палубе
           берёт поле карточки (`--pad-sheet:var(--pad-card)`), витрина
           переобъявляет роли, а не шкалу (docs/layers.md, §3.4). Находка —
           только ЧИСЛО на имени строителя: это и есть второй источник.
           Чего правило не ловит, сказано вслух: подмену роли ролью на корне
           — она тоже второй источник выбора, но отличить её от законной
           местной подмены чтением файла нельзя. */
        if (/-?[\d.]+(px|rem|em|vw|vh|cqi|cqw|%)/.test(value.replace(/var\([^()]*(?:\([^()]*\)[^()]*)*\)/g, ' '))) {
          findings.push({
            rule: 'число на имени строителя',
            got: `${rel}:${line}  ${name}: ${value.trim().slice(0, 40)}`,
            need: 'ступени и роли выпускает строитель — правьте styles/scale.json',
          })
        }
        continue
      }
      if (!new RegExp(`^(?:${PREFIX.font}|${PREFIX.space}|--pad-)`).test(name)) continue
      const off = missesEnds(value, widths)
      if (off) {
        findings.push({ rule: 'рампа мимо своих концов', got: `${rel}:${line}  ${name}: ${off}`, need: 'считать по формуле — npm run scale' })
      }
    }
  }
  return findings
}
