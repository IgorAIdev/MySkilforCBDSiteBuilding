/**
 * Проверка ремесла — по отрисованной странице, а не по файлам.
 *
 * `check-css.mjs` читает стили и ловит то, что записано числом: размер в
 * пикселях, лишний брейкпоинт, пропорцию без потолка. Но дефект, который
 * заказчик видит на телефоне, обычно не записан числом — он получается.
 * Заголовок с мерой в 16ch занимает половину колонки. Отрицательное поле,
 * поставленное ради тени, съедает отступ, назначенный выше. Цель нажатия
 * выходит меньше пальца. В диффе всё это выглядит безупречно.
 *
 * Поэтому проверка открывает собранный сайт и меряет то, что получилось:
 *
 *   1. Мера текста     — у заголовка: занимает меньше 70% колонки и при этом
 *                        переносится, то есть ему назначили меру, которой он
 *                        не просил. У бегущего текста: строка короче 45 или
 *                        длиннее 75 знаков.
 *   2. Цель нажатия    — ссылка или кнопка меньше 44×44 на телефоне
 *                        (или меньше 24×24 там, где объявлен data-tap).
 *   3. Контраст        — текст ниже 4.5:1 (крупный ниже 3:1) к своему фону.
 *   4. Слипшиеся блоки — соседи по вертикали ближе 8px друг к другу.
 *   5. Вес снимка      — картинка, отданная вдвое крупнее места, куда её
 *                        положили: 1100px в кадр 358px это втрое больше
 *                        пикселей и вдевятеро больше байтов.
 *   6. Прыжок вёрстки  — картинка без width и height: место под неё не
 *                        занято, и всё под ней прыгает, когда она приедет.
 *   7. Безымянный орган— кнопка или ссылка, у которой нет ни текста, ни
 *                        `aria-label`: скринридер прочитает «кнопка».
 *   8. Лестница глав   — пропущенный уровень заголовка или второй h1.
 *   9. Разрядка (1.4.12)— страница под пользовательскими межбуквенным,
 *                        межсловным и межстрочным: WCAG требует, чтобы текст
 *                        не обрезался и не переполнял. Проверяется только на
 *                        узком окне, где запас меньше всего.
 *  10. Обрезанный текст— строка, срезанная СВОИМ ЖЕ блоком: `scrollWidth`
 *                        больше `clientWidth` там, где блок обрезает. Свип
 *                        ловит вылезшее за экран, а срезанное собственным
 *                        блоком не видит никто, кроме этой проверки.
 *  11. Тёмная тема     — контраст во второй теме. Цвет объявлен через
 *                        `light-dark()`, то есть половина его до сих пор не
 *                        мерилась ничем.
 *  12. Палец на планшете— цель нажатия там, где окно широкое, а указатель
 *                        грубый: ширина решает раскладку, указатель решает
 *                        размер цели.
 *
 * Работает храповиком, как и `check:css`: в `tools/craft-baseline.json`
 * записано, сколько нарушений сегодня; проверка падает, только если их
 * стало больше. Проверка, падающая с первого дня, живёт до первого «давай
 * отключим».
 *
 *   npm run build:site && npm run serve
 *   node tools/check-craft.mjs
 *   node tools/check-craft.mjs -- --update
 *
 * Playwright берётся оттуда же, откуда его берёт свип: из системы или из
 * PLAYWRIGHT.
 */

import { loadPlaywright, loadSharp } from './browser.mjs'
const { chromium } = await loadPlaywright()
const sharp = await loadSharp()
import { readFileSync, writeFileSync } from 'node:fs'
import { CONTRAST, TARGET, LAYOUT } from './thresholds.mjs'
import { CRAFT_LABELS as NAMES, VECTOR } from './craft-families.mjs'
import { SHEET_AR_SLACK, SHEET_SAMPLES, SHEET_SLACK } from './sheet-samples.mjs'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sample, personal, isNative } from './routes.mjs'
import { sessionOf } from './sessions.mjs'
import { SESSIONS } from './kit-config.mjs'

/** Контраст по WCAG — та же формула, что и в странице; здесь она нужна
 *  второй раз, снаружи, для дна, снятого с экрана. */
const pairOf = (a, b) => {
  const lum = (c) => {
    const [r, g, bl] = c.map((v) => {
      const x = v / 255
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

const BASE = process.env.SITE ?? 'http://localhost:8099'

/* Список страниц задаёт ДЕРЕВО МАРШРУТОВ, а не рука.
 *
 * Рукой здесь стояло пять адресов, все болгарские. В дереве их семь форм и
 * два языка: полка категории и страница «не найдено» не мерились ни разу, и
 * английская половина сайта — тоже ни разу. При том что дефект «81 знак в
 * строке» записан в скилле именно из английского текста в болгарской
 * коробке.
 *
 * Список, набранный рукой, хуже неполного: он не растёт вообще. Теперь
 * страница попадает под проверку в день, когда её завели, — см.
 * `tools/routes.mjs`. */
/* ── узкий прогон: одна страница вместо всего дерева ──────────────────────
 * Полный прогон — шестнадцать минут: 126 адресов на четыре среды. Это цена
 * ПРИЁМКИ, а не цена правки. Заказчик спросил прямо: «если меняю мелочь,
 * снова двадцать минут?» — и был прав, что спросил: между «секунды хуком» и
 * «шестнадцать минут» у этой проверки не было ничего, и мелкую правку я
 * перепроверял разовыми замерами руками, которые никуда не ложатся.
 *
 *   node tools/check-craft.mjs --page /bg/catalog     только эти адреса
 *   node tools/check-craft.mjs --pages /bg,/bg/catalog/oils   ровно эти адреса дерева
 *   node tools/check-craft.mjs --only target,markInk  только эти семьи в отчёте
 *   node tools/check-craft.mjs --pages … --json out.json   находки узкого прогона файлом
 *
 * Узкий прогон НИКОГДА не трогает базу и не выносит вердикт: считать долг по
 * половине дерева значит записать неправду. Он печатает найденное, а судит
 * полный — или тот, кто его позвал, по файлу `--json` (проверка выбранного
 * вида витрины, `check:choice`, И270).
 *
 * `CRAFT_COOKIE="имя=значение; имя2=значение2"` — cookie во всех средах
 * проверки, настоящие, а не заголовком: их видит и скрипт страницы. Так
 * меряется черновик вида (черновой режим Next и его cookie). */
const flag = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1] ?? null
}
const ONLY_PAGE = flag('--page')
const ONLY_PAGES = (flag('--pages') ?? '').split(',').map((x) => x.trim()).filter(Boolean)
const ONLY_FAM = (flag('--only') ?? '').split(',').map((x) => x.trim()).filter(Boolean)
const JSON_OUT = flag('--json')
const NARROW = Boolean(ONLY_PAGE || ONLY_PAGES.length)
const ASKED = ONLY_PAGES.length ? ONLY_PAGES.join(', ') : ONLY_PAGE

const PAGES = [...sample(), ...personal()].filter((path) => ONLY_PAGES.length ? ONLY_PAGES.includes(path) : !ONLY_PAGE || path.includes(ONLY_PAGE))
if (!PAGES.length || (ONLY_PAGES.length && PAGES.length !== ONLY_PAGES.length)) {
  console.error(`Под «${ASKED}» не подошли адреса дерева${PAGES.length ? ` (подошли: ${PAGES.join(', ')})` : ''}. Список: node tools/routes.mjs`)
  process.exit(1)
}
/* 1200 и 900 добавлены не для полноты. Ровно в этой полосе двухколоночный
   герой держит колонку шириной с телефон при десктопном окне: заголовок в ней
   вставал четырьмя строками по четырнадцать знаков, а подпись кадра — по
   одному слову. Ни 1024, ни 1440 этого не показывали. Дефект живёт там, где
   не смотрели. */
const WIDTHS = [390, 700, 900, 1024, 1200, 1440, 1600]
/* Второй язык — те же ширины по краям и одна в середине. Раскладка у него
   та же (брейкпоинты общие), меняется только длина слов, а она видна и на
   трёх ширинах. Шесть ширин на каждый язык удвоили бы проверку, ничего к
   ней не добавив. */
const WIDTHS_ALT = [390, 900, 1440]
const PHONE = 700          // ниже этой ширины цель нажатия меряется пальцем
/* Тёмная тема: цвет от языка не зависит, поэтому меряется на одном. Две
   ширины, узкая и широкая: вуаль над снимком режется по-разному, когда
   меняется пропорция кадра. */
const DARK_WIDTHS = [390, 1200]
/* Планшет с пальцем: ширина десктопная, указатель грубый. Ровно та полоса,
   где вёрстка, растящая цель по `max-width`, отдаёт курсорный размер
   пальцу. */
const COARSE_WIDTHS = [768, 1024]
const BASELINE = fileURLToPath(new URL('./craft-baseline.json', import.meta.url))
/* Низкое окно, в котором меряется приклеенное: ноутбук 1366×768 за вычетом
   полосы браузера. Обычный замер идёт в 900 по высоте, и колонка, которая в
   900 помещается, на ноутбуке уходит за край — так и было с галереей товара. */
const SHORT_H = LAYOUT.shortWindow
const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Что меряется в самой странице. Одной функцией, потому что она уезжает
 *  в браузер целиком и ничего оттуда не импортирует. */
const measure = ({ phone, catalogue, target, contrast, vector }) => {
  const out = { placeholder: [], measure: [], target: [], contrast: [], collision: [],
                weight: [], jump: [], name: [], heads: [], dress: [], clip: [],
                swipe: [], stretch: [], broken: [], spill: [], focus: [], wrap: [],
                anchor: [], outline: [], marker: [], dark: [], ladder: [], wideCtrl: [], lopsided: [],
                markInk: [],
                covered: [],
                lane: [], sunk: [], stolen: [], field: [], alone: [], catalogueColumns: [], twoAir: [] }
  const seen = new Set()

  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const x = v / 255
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  /* Цвет ПЕРЕВОДИТ БРАУЗЕР, а не разбирает регулярка.
   *
   * Вычисленный стиль отдаёт не только `rgb()`. Токены, собранные через
   * `oklch(from …)`, так и остаются `oklch(0.8 0.11 219)`, а `color-mix()`
   * остаётся `color-mix()`. Разбор «первые три числа — это красный, зелёный
   * и синий» брал оттуда светлоту, насыщенность и УГОЛ ТОНА и мерил контраст
   * к выдуманному цвету.
   *
   * В светлой теме ошибка молчала: выдуманный цвет выходил тёмным, тёмное на
   * светлом порог проходило, семья показывала ноль. Стоило добавить проход по
   * тёмной теме — и та же семья выдала десять «нарушений» подряд на паре,
   * которая на экране даёт 8:1. Признак был тот же, что всегда: находка не
   * сходится с тем, что видно глазом.
   *
   * Поэтому цвет рисуется пикселем и читается обратно. Что умеет браузер, то
   * проверка и понимает — включая то, что появится в CSS после неё. */
  const painter = document.createElement('canvas')
  painter.width = painter.height = 1
  const brush = painter.getContext('2d', { willReadFrequently: true })
  const known = new Map()
  const parse = (s) => {
    if (known.has(s)) return known.get(s)
    let out = null
    const quick = /^rgba?\(([^)]+)\)$/.exec(s)
    if (quick) {
      const n = quick[1].split(/[\s,/]+/).filter(Boolean).map(Number)
      if (n.length >= 3 && n.every(Number.isFinite)) {
        out = [n[0], n[1], n[2], n.length > 3 ? n[3] : 1]
      }
    }
    if (!out && CSS.supports('color', s)) {
      brush.clearRect(0, 0, 1, 1)
      brush.fillStyle = s
      brush.fillRect(0, 0, 1, 1)
      const d = brush.getImageData(0, 0, 1, 1).data
      out = [d[0], d[1], d[2], d[3] / 255]
    }
    known.set(s, out)
    return out
  }
  const rgb = (s) => { const c = parse(s); return c ? c.slice(0, 3) : null }
  const alpha = (s) => { const c = parse(s); return c ? c[3] : 1 }
  /** Что лежит под текстом.
   *
   *  Раньше здесь искался «первый непрозрачный предок», а всё полупрозрачное
   *  пропускалось. На витрине это давало заведомо неверный ответ: подпись
   *  плитки — белая, лежит на вуали `rgba(8,26,31,.7)`, вуаль на снимке.
   *  Вуаль пропускалась как недостаточно плотная, снимок не виден вовсе, и
   *  проверка сообщала «белое на светло-сером, 1.07:1» — про текст, который
   *  на самом деле читается отлично.
   *
   *  Теперь слои собираются и накладываются друг на друга по-настоящему. А
   *  когда под ними остаётся неизвестное — фотография, градиент, что угодно
   *  с картинкой, — ответом становится не одно число, а два: как если бы
   *  снизу было чёрное и как если бы белое. Берётся худшее. Это гарантия, а
   *  не догадка: настоящий контраст не хуже неё, каким бы ни оказался
   *  снимок.
   */
  const ground = (el) => {
    const layers = []
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n)
      const a = alpha(cs.backgroundColor)
      const c = rgb(cs.backgroundColor)
      if (c && a > 0.004) layers.push([c, a])
      if (a > 0.996) return { layers, known: true }
      /* градиент, снимок, что угодно нарисованное: дальше не заглянуть */
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { layers, known: false }
      /* Вуаль часто рисуют псевдоэлементом — `.slide::after` с градиентом
         поверх снимка. Обход предков её не видит вовсе: у самого слайда фон
         прозрачный, и проверка уходила искать дно до самой страницы, получая
         «белое на белом». Псевдоэлемент, у которого есть чем закрасить, —
         тот же случай «дальше не заглянуть». */
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(n, pseudo)
        if (ps.content === 'none') continue
        if ((ps.backgroundImage && ps.backgroundImage !== 'none') || alpha(ps.backgroundColor) > 0.004) {
          return { layers, known: false }
        }
      }
    }
    return { layers, known: true }
  }
  /** Слои, наложенные на заданное дно, от самого дальнего к ближнему. */
  const over = (layers, base) => {
    let out = base
    for (let i = layers.length - 1; i >= 0; i--) {
      const [c, a] = layers[i]
      out = out.map((v, k) => c[k] * a + v * (1 - a))
    }
    return out
  }
  const pair = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (l1 + 0.05) / (l2 + 0.05)
  }
  /** Контраст текста к тому, что под ним.
   *
   *  Дно известно — считаем точно. Неизвестно (снимок, градиент) — элемент
   *  откладывается: его дно снимут с экрана вторым проходом, по пикселям.
   *  Догадка «худшее из чёрного и белого» тут не годится: у вуали, заданной
   *  градиентом, самый прозрачный упор — полная прозрачность, и по нему
   *  выходит, что белая подпись лежит на белом. Она лежит на снимке. */
  const ratio = (fg, g) => (g.known ? pair(fg, over(g.layers, [255, 255, 255])) : null)
  window.__dark = []
  const name = (el) => {
    const cls = (el.className || '').toString().split(/\s+/)[0] || ''
    const txt = (el.textContent || '').trim().slice(0, 24)
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls.split('__').pop() : ''}${txt ? ` «${txt}»` : ''}`
  }
  const shown = (el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false
    const b = el.getBoundingClientRect()
    if (b.width <= 0 || b.height <= 0) return false
    /* Убранное с экрана обрезкой — заголовок «только для чтения вслух»:
       он в дереве доступности есть, глазу его нет, мерить нечего. */
    if (b.width <= 1 || b.height <= 1) return false
    /* За краем экрана по горизонтали — значит сейчас не видно: закрытое
       чекмедже стоит на -320, уехавшая часть полосы прокрутки — за правым
       полем. Мерить их нельзя вдвойне: их не видит человек, и их не видит
       снимок страницы, который шириной ровно в экран. Раньше такие элементы
       считались, а дно им сэмплилось по чужим пикселям — отсюда «белое на
       белом» у пунктов закрытого меню. */
    const w = document.documentElement.clientWidth
    /* Не «край задет», а «видно по существу». В горизонтальной полосе шесть
       постов, из них на экране один: у остальных левый край ещё внутри, а
       сами они снаружи. Мерить по тридцати видимым пикселям из ста — гадать.
       Порог 60% ширины: меньше — элемента для человека сейчас нет. */
    const seen = Math.min(b.right, w) - Math.max(b.left, 0)
    return seen > 0 && seen / b.width >= 0.6
  }

  /* 1 · мера текста.
     Два разных дефекта, и мерить их надо по-разному.

     ЗАГОЛОВОК коротким не бывает по своей воле: если он переносится и при
     этом занимает половину колонки, значит ему назначили меру, которой он не
     просил. Справа остаётся пустота, а строки рвутся вкривь. Здесь верно
     мерить долю колонки.

     БЕГУЩИЙ ТЕКСТ, наоборот, обязан быть уже колонки — ради этого мера и
     существует. Абзац в 66 знаков внутри колонки в 900px занимает 62%, и это
     не дефект, а работа. Здесь доля колонки не говорит ничего, а говорит
     число ЗНАКОВ НА СТРОКУ: короче 45 строка рубится и глаз спотыкается,
     длиннее 75 — теряется на возврате. Это и есть мера в её исходном смысле,
     а процент был подменой.

     Раньше здесь стоял один порог на обоих, и он ругался на правильно
     ограниченные абзацы подвала — то есть требовал убрать меру там, где она
     нужна. */
  /* Столбиком рассыпается ЛЮБОЙ текст, не только заголовок: подпись кнопки,
     ссылка в списке, мелкая строка под плиткой. Мера набора (45…75 знаков) —
     про бегущий текст, поэтому её спрашивают с абзацев; столбик обрывков —
     про всех. */
  for (const el of document.querySelectorAll('h1, h2, h3, h4, p, blockquote, li, small, button, a, figcaption')) {
    if (!shown(el) || !el.textContent.trim()) continue
    /* Меряется ТОЛЬКО сплошной текст. У кнопки тарифа внутри три отдельных
       строки-элемента — название, пояснение, цена; сложенные в один поток,
       они выглядят как «сирота €39.52», которой нет: это отдельная строка по
       замыслу. Признак композита виден в раскладке потомков. */
    const composite = [...el.children].some((ch) => {
      const d = getComputedStyle(ch).display
      return d !== 'inline' && d !== 'contents' && d !== 'none'
    })
    if (composite) continue
    const cs = getComputedStyle(el)
    const box = el.getBoundingClientRect()
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
    /* Дёшево — потом точно. Высота коробки включает подкладку: у кнопки с
       полем 12px «Drops» выходило четыре строки по пять знаков, и проверка
       ругалась на текст, стоящий одной строкой. Поэтому высота — только
       грубый отсев, а строки считаются обходом по знакам: он даёт и их
       число, и длину каждой В ЗНАКАХ, а не в пикселях. Прикидка «полкегля
       на знак» тоже врала: у жирного наборного знак шире. */
    if (box.height / lh < 1.6) continue
    const CAP = 400
    let capped = false
    const rows = []
    /* Ширина каждой строки в ПИКСЕЛЯХ — ею отличается столбик обрывков от
       текста, которому просто досталась узкая колонка. */
    const wide = []
    {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let node, chars = 0
      const r = document.createRange()
      let last = null, row = ''
      let l = Infinity, rgt = -Infinity
      while ((node = walk.nextNode()) && chars < CAP) {
        for (let i = 0; i < node.length; i++, chars++) {
          r.setStart(node, i); r.setEnd(node, i + 1)
          const rect = r.getBoundingClientRect()
          if (!rect.width && !rect.height) continue
          const top = Math.round(rect.top)
          if (last !== null && top !== last) {
            rows.push(row); wide.push(rgt - l); row = ''; l = Infinity; rgt = -Infinity
          }
          last = top; row += node.data[i]
          if (rect.left < l) l = rect.left
          if (rect.right > rgt) rgt = rect.right
        }
      }
      rows.push(row); wide.push(rgt - l)
      capped = chars >= CAP
    }
    /* Обход остановился на потолке — последняя строка недописана, и в
       среднее она не идёт. Делить ДЛИНУ ВСЕГО текста на число пройденных
       строк нельзя: у абзаца в 520 знаков это давало 88 при настоящих 62 —
       ложное «длинно» на оговорке подвала. */
    if (capped) rows.pop()
    const lines = rows.filter((x) => x.trim()).length
    if (lines < 2) continue                     // одна строка меры не имеет
    const head = /^H[1-4]$/.test(el.tagName)
    const rowLen = rows.map((x) => x.trim().length)
    const widest = Math.max(...rowLen)

    /* Столбик обрывков. Три строки и больше, а самая длинная короче двадцати
       знаков — текст читается не строкой, а списком огрызков: «CBD / oil and /
       cannabis / oil». Долю колонки такой блок проходит (сто процентов!),
       поэтому мерить надо ЗНАКИ. Причина всегда одна: размер взят от окна, а
       стоит текст в узкой коробке. */
    /* Но короткая строка в УЗКОЙ коробке — не вина текста: в плитке шириной
       178px двадцати знаков не бывает физически, и требовать их значит
       требовать другую раскладку, а не другой набор. Дефект — когда место
       ЕСТЬ (коробка от 320px) или когда кегль сам крупный (от 20px, где
       короткая строка неверна всегда). Ровно эти два случая заказчик и
       показывал: заголовок героя в 488px и подпись кадра в 30px. */
    const roomy = box.width >= 320 || parseFloat(cs.fontSize) >= 20
    /* И третий случай, найденный свипом уже после первых двух: строка
       ЗАПОЛНЯЕТ колонку. Тогда перенос сделал всё, что мог, и короткой её
       сделали не размер и не раскладка, а сами слова — болгарское
       «концентрация,» это тринадцать знаков, и в колонку 288px их входит
       ровно столько. Требовать большего значит требовать других слов, а
       слова — не вёрстка. */
    const fill = Math.max(...wide.filter(Number.isFinite)) / box.width
    if (fill >= 0.6) continue
    if (roomy && lines >= 3 && widest < 20) {
      out.measure.push(`${name(el)} — ${lines} строки, самая длинная ${widest} знаков: столбик обрывков`)
      continue
    }

    /* Сирота — последняя строка в одно короткое слово: «…Full and broad /
       spectrum.» Глаз ждёт продолжения, а его нет.

       Лечится не руками, а режимом переноса: `pretty` правит последнюю строку
       бегущего текста, `balance` делит короткий текст поровну и ставит разрыв
       на границе предложения. Проверка нужна, чтобы их не забыли назначить. */
    const tail = rows[rows.length - 1]?.trim() ?? ''
    if (roomy && lines >= 2 && tail && !tail.includes(' ') && tail.length < 12 && tail.length < widest * 0.3) {
      out.measure.push(`${name(el)} — последняя строка «${tail}»: сирота`)
      continue
    }

    if (head) {
      const host = el.parentElement
      if (!host) continue
      const hostW = host.getBoundingClientRect().width
        - parseFloat(getComputedStyle(host).paddingLeft)
        - parseFloat(getComputedStyle(host).paddingRight)
      if (hostW < 80) continue
      const fill = box.width / hostW
      if (fill < 0.7) out.measure.push(`${name(el)} — ${Math.round(fill * 100)}% колонки, строк ${lines}`)
      continue
    }

    /* В узкой коробке текст короткой строкой не по своей вине: в карточке
       шириной 200px сорока пяти знаков не бывает физически. Это решение
       раскладки, а не меры, и ругаться на него здесь не о чем. */
    if (box.width < 320) continue
    const chars = rows.reduce((n, x) => n + x.trim().length, 0) / lines
    /* Потолка меры НЕТ. Он стоял здесь — «длиннее 75 знаков строка теряется
       на возврате» — и был снят заказчиком, сентябрь: «узкая колонка текста
       — это правило проекта? хуйня это, удали это правило». Текст занимает
       свою колонку целиком; сколько в ней знаков — решает колонка.

       Осталась нижняя граница, и она про то же, что заказчик и увидел:
       место ЕСТЬ, а текст его не берёт. Снизу спрашиваем с трёх строк и
       больше: заметка в две строки не рубленая колонка, а просто короткая. */
    if (lines >= 3 && chars < 45) {
      /* Коротко — не всегда дефект. На экране в 390px сорок знаков в строке
         это норма: колонка столько и есть, шире некуда. Дефект — когда место
         ЕСТЬ, а текст его не берёт: мера уже колонки. Поэтому спрашиваем
         только с тех, кто занимает меньше 85% доступного. */
      const host = el.parentElement
      const hostW = host
        ? host.getBoundingClientRect().width
          - parseFloat(getComputedStyle(host).paddingLeft)
          - parseFloat(getComputedStyle(host).paddingRight)
        : 0
      if (hostW > 0 && box.width / hostW < 0.85) {
        out.measure.push(`${name(el)} — ${Math.round(chars)} знаков в строке при ${Math.round(box.width / hostW * 100)}% колонки`)
      }
    }
  }

  /* 1.5 · полоса, отнятая у текста под орган.
   *
   * Круглая стрелка стояла в углу подписи героя, вынутая из потока, и место
   * под себя требовала полосой: `padding-right: 86px` у ВСЕЙ подписи, хотя
   * рядом со стрелкой идёт одна строка. На телефоне это 86 из 326 — треть
   * ширины, отнятая у заголовка ради органа, который стоит под ним. Текст
   * рассыпался в столбик и обрывался далеко от стрелки; заказчик показал
   * это снимком, а в диффе объявление выглядело безупречно — сумма трёх
   * известных чисел с объяснением, откуда взялось «86».
   *
   * Признак измерим и не зависит от того, чем полосу отняли: боковые поля
   * съедают больше четверти собственной ширины блока, в котором лежит
   * текст. Настоящее поле — от --sp-7 в обе стороны — это 17% на телефоне и
   * меньше на широком; четверть блок отдаёт только тогда, когда держит
   * место под что-то другое.
   *
   * Лечится не числом, а устройством: орган ставится В ПОТОК, рядом с той
   * строкой, возле которой он стоит, и ширину считает раскладка. */
  for (const el of document.querySelectorAll('*')) {
    if (!shown(el)) continue
    /* Орган — не текстовый блок, и поле у него своё: у пилюли оно доля
       собственной ВЫСОТЫ (правило 2), и у широкой надписи «Browse the
       index» эта доля законно выходит за четверть ширины. Спрашивается тут
       ритм текста, а не геометрия контрола, и путать их дороже, чем не
       иметь ни одного правила.

       `matches`, а не `closest`, и это не мелочь: подпись героя лежит ВНУТРИ
       ссылки — слайд весь и есть ссылка, — и `closest` вычёркивал вместе с
       органом ровно тот блок, ради которого семья заведена. Проверка молчала
       и на починенной странице, и на дефекте. Исключается сам орган, а не
       всё, что под ним лежит. */
    if (el.matches('a, button, [role="button"], input, select, textarea, label, summary')) continue
    const box = el.getBoundingClientRect()
    if (box.width < 200) continue
    const cs = getComputedStyle(el)
    /* Текст СВОЙ: либо прямо в блоке, либо строкой-ребёнком. Обёртка,
       которая только держит колонки, полем никого не обижает. */
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 12)
      || [...el.children].some((c) => ['H1', 'H2', 'H3', 'H4', 'P', 'SMALL'].includes(c.tagName)
        && c.textContent.trim().length > 12)
    if (!own) continue
    const side = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
    const share = side / box.width
    if (share > 0.25) {
      out.lane.push(`${name(el)} — боковые поля ${Math.round(side)} из ${Math.round(box.width)} = ${Math.round(share * 100)}% ширины`)
    }
  }

  /* 2 · цель нажатия.
     Меряется область попадания, а не рисунок. Орган бывает нарисован мельче
     по делу — сердце «сохранить» в углу снимка в 32px это правильный
     рисунок, — и тогда ему пририсовывают невидимый запас псевдоэлементом
     (`.tap` в примитивах). Коробка элемента про этот запас не знает, поэтому
     к ней добавляются размеры абсолютно позиционированных псевдоэлементов:
     они центрированы на органе, значит больший из размеров и есть область.

     Проверка, меряющая рисунок, требовала бы рисовать палец — то есть
     запрещала бы мелкие органы вовсе. Требование не в этом: попасть пальцем,
     не увеличивая кнопку. */
  if (phone) {
    for (const el of document.querySelectorAll('a, button, [role="button"], input, select')) {
      if (!shown(el)) continue
      /* Заготовка ссылки — не цель нажатия. `<a>` без адреса ничего не
         делает: по нему не переходят, он не берёт фокус, и мерить, попадёт
         ли по нему палец, нечего. Мы сами их и завели — там, где страницы
         ещё нет, — и проверка исправно требовала от них сорока четырёх
         пикселей: пять надписей на каждой странице сайта, то есть треть
         всего долга этой семьи была замером того, по чему не нажимают. */
      if (el.tagName === 'A' && !el.hasAttribute('href')) continue
      /* Квадратик и кружок выбора рисуют в семнадцать пикселей везде, и это
         не дефект: нажимают не по нему, а по МЕТКЕ — она обёрнута вокруг и
         отдаёт нажатие ему. Правило прямо это и требует: у метки с контролом
         одна цель без мёртвых зон. Поэтому меряется метка, а не квадратик;
         метки нет — тогда спрос с самого контрола. */
      let box = el
      if (/^(checkbox|radio)$/.test(el.getAttribute('type') ?? '')) {
        const label = el.closest('label')
          ?? (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`))
        if (label) box = label
      }
      const b = box.getBoundingClientRect()
      /* Ссылка в тексте — это слово, а не кнопка: её размер задаёт набор, и
         требовать от неё ширину пальца значит разорвать строку. WCAG 2.5.8
         делает ровно это исключение — «inline in a sentence».

         Признак не «внутри абзаца», а «рядом со словами»: хлебные крошки
         лежат в `div`, но между ссылками там текстовые узлы с косой чертой,
         и это тот же текстовый поток. */
      if (el.tagName === 'A') {
        const host = el.parentElement
        const inText = host && [...host.childNodes]
          .some((n) => n.nodeType === 3 && n.textContent.trim())
        if (el.closest('p') || inText) continue
      }
      let w = b.width, h = b.height
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(el, pseudo)
        if (ps.content === 'none' || ps.position !== 'absolute') continue
        w = Math.max(w, parseFloat(ps.width) || 0)
        h = Math.max(h, parseFloat(ps.height) || 0)
      }
      /* Второй порог — не поблажка, а вторая норма. WCAG 2.5.5 (44×44) —
         уровень AAA; уровень AA — это 2.5.8, и там 24×24 с прямой
         оговоркой: орган может быть меньше, если ТО ЖЕ действие доступно
         другим органом на том же экране. Метки слайдера — ровно этот
         случай: тот же кадр открывают стрелка, смахивание и сама метка.
         Требовать от них сорока четырёх значило разнести пять точек на
         двести пятьдесят пикселей — ряд переставал читаться группой, и
         заказчик увидел это глазом.

         Оговорка объявляется НА МЕСТЕ, атрибутом `data-tap`, а не списком
         исключений в проверке: рядом с органом видно, чем он заменяется,
         а в списке — нет. Ниже 24 не опускается никто. */
      const claim = el.getAttribute('data-tap')
      const floor = claim ? Math.max(target.floor, Number(claim) || 0) : target.coarse
      if (w < floor || h < floor) {
        out.target.push(`${name(el)} — ${Math.round(w)}×${Math.round(h)} (норма ${floor})`)
      }
    }
  }

  /* 2.5 · панель, уехавшая за край, закрывается движением.
   *
   * Правило И8: у открытого три выхода, и все три обязательны — крестик
   * (единственный видимый), Escape (клавиатуре; на телефоне его нет вовсе) и
   * уход — прокрутка или свайп. Панель, выехавшая сбоку, на телефоне
   * закрывается тем же движением, каким пришла.
   *
   * Признак панели — не имя класса, а поведение: она стоит на `fixed`,
   * занимает высоту экрана и ПРИПАРКОВАНА целиком за краем по горизонтали.
   * Так выглядит закрытая шторка и не выглядит больше ничто.
   *
   * Метку `data-swipe` ставит сам хук `useSwipeClose`, а не рука в разметке:
   * поставленная рукой, она однажды окажется на панели, к которой хук не
   * подключён. Здесь она означает «жест подключён», а не «жест обещан».
   *
   * Спрашивается только при грубом указателе: у мыши этого движения нет. */
  if (phone) {
    for (const el of document.querySelectorAll('div, aside, nav, section, dialog')) {
      const cs = getComputedStyle(el)
      if (cs.position !== 'fixed') continue
      const b = el.getBoundingClientRect()
      const parked = b.right <= 1 || b.left >= innerWidth - 1
      if (!parked) continue
      if (b.width < 200 || b.height < innerHeight * 0.5) continue
      if (el.hasAttribute('data-swipe')) continue
      out.swipe.push(`${name(el)} — панель за краем экрана без закрытия движением`)
    }
  }

  /* 3 · контраст */
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,a,span,b,small,li,button,label,td,th')) {
    if (!shown(el)) continue
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!own) continue
    const cs = getComputedStyle(el)
    const fg = rgb(cs.color)
    if (!fg || alpha(cs.color) < 0.95) continue
    const size = parseFloat(cs.fontSize)
    const big = size >= contrast.largePx || (size >= contrast.largeBoldPx && Number(cs.fontWeight) >= 700)
    const need = big ? contrast.control : contrast.text
    const g = ground(el)
    const got = ratio(fg, g)
    if (got === null) {
      /* дно снимут с экрана: сюда попадает всё, что лежит на фотографии */
      const b = el.getBoundingClientRect()
      window.__dark.push(el)
      out.dark.push({ i: window.__dark.length - 1, fg, need, label: name(el),
                      x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height })
      continue
    }
    if (got < need) {
      /* Стилям верить на слово нельзя. Они не видят ни псевдоэлемента, ни
         наложенного соседа: у поста инстаграма подпись лежит на вуали-соседе,
         а обход предков находит светлый фон карточки под ней и сообщает
         «белое на белом, 1.07». Поэтому расчёт по стилям — только быстрый
         отсев, а провал подтверждается пикселями. Пропуск по стилям при этом
         остаётся пропуском: наложенный слой может сделать хуже, но такой
         случай ловится тем же снимком у соседей по тому же месту. */
      const b = el.getBoundingClientRect()
      window.__dark.push(el)
      out.dark.push({ i: window.__dark.length - 1, fg, need, label: name(el),
                      x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height })
    }
  }

  /* 0 · заглушка на витрине: `[NAME]`, `[COMPANY]`, `[Stand-in clip.]`.
     В ведомости они помечены как «факт, который ещё не известен», но на
     живом сайте это не пометка, а текст, который читает покупатель: отзыв,
     подписанный `[NAME] · [CITY]`, сообщает, что отзывы ненастоящие. */
  const holder = /\[(?:[A-ZА-Я][A-ZА-Я0-9 @._-]{2,}|Stand-in[^\]]*)\]/g
  for (const m of (document.body.innerText || '').matchAll(holder)) {
    const key = `h:${m[0]}`
    if (!seen.has(key)) { seen.add(key); out.placeholder.push(m[0]) }
  }

  /* 4 · слипшиеся блоки: соседи по потоку ближе 8px.
     Считается воздух, а не расстояние между коробками. Раздел, у которого
     воздух назначен собственным верхним полем, стоит к соседу вплотную
     коробкой и на экране при этом отбит как надо — это не дефект, а обычное
     устройство раздела. Дефект — когда воздуха нет ни снаружи, ни внутри:
     ровно так лист «CBD products by category» проходил в двенадцати
     пикселях под плитками и срезал их снизу. */
  /* Рисует ли блок собственную поверхность. Если да — его внутреннее поле
     лежит УЖЕ ВНУТРИ неё и от соседа не отбивает: видно край, а не воздух.
     Ровно так лист «CBD products by category» проходил в двенадцати пикселях
     под плитками: воздуха внутри было пятьдесят, а срезал он их всё равно. */
  const paints = (el) => {
    const cs = getComputedStyle(el)
    return alpha(cs.backgroundColor) > 0.02 ||
           (!!cs.backgroundImage && cs.backgroundImage !== 'none') ||
           (cs.boxShadow && cs.boxShadow !== 'none')
  }
  const inner = (el, side) => {
    if (paints(el)) return 0
    const own = parseFloat(getComputedStyle(el)[side]) || 0
    const kid = side === 'paddingTop' ? el.firstElementChild : el.lastElementChild
    if (!kid || paints(kid)) return own
    return Math.max(own, parseFloat(getComputedStyle(kid)[side]) || 0)
  }
  /* Оговорка к тому же правилу, и она про ГРАНИЦУ, а не про воздух.
     «Своя поверхность отбивает краем» верно, пока край ВИДЕН. Два листа
     одного цвета, лежащие вплотную, края между собой не имеют — это один
     лист, и так главная собрана нарочно: подряд идущие светлые полосы
     смыкаются, их углы гасятся, шва в бумаге не бывает. Внутреннее поле
     каждого из них снова становится воздухом, потому что между содержимым
     одного и содержимым другого нет ничего, кроме этого поля.

     Без оговорки семья закричала на верное в тот день, когда пол переехал с
     полосы во всю ширину окна на коробку страницы: сама картинка на экране
     не изменилась ни на пиксель, изменилось лишь то, КАКОЙ узел красит. */
  const skin = (el, side) => {
    if (paints(el)) return getComputedStyle(el).backgroundColor
    const kid = side === 'paddingTop' ? el.firstElementChild : el.lastElementChild
    return kid && paints(kid) ? getComputedStyle(kid).backgroundColor : null
  }
  const pad = (el, side) => {
    const own = parseFloat(getComputedStyle(el)[side]) || 0
    const kid = side === 'paddingTop' ? el.firstElementChild : el.lastElementChild
    return kid ? Math.max(own, parseFloat(getComputedStyle(kid)[side]) || 0) : own
  }
  const rows = Array.from(document.querySelectorAll('main > * > *, main > *'))
    .filter(shown)
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], next = rows[i]
    const a = prev.getBoundingClientRect(), b = next.getBoundingClientRect()
    if (b.top < a.bottom) continue              // перекрываются — не соседи по потоку
    const above = skin(prev, 'paddingBottom'), below = skin(next, 'paddingTop')
    const merged = !!above && above === below      // один лист, а не два соседа
    const air = merged
      ? (b.top - a.bottom) + pad(next, 'paddingTop') + pad(prev, 'paddingBottom')
      : (b.top - a.bottom) + inner(next, 'paddingTop') + inner(prev, 'paddingBottom')
    if (air >= 0 && air < 8) {
      out.collision.push(`${name(prev)} → ${name(next)} — воздуха ${Math.round(air)}px`)
    }
  }

  /* 4b · ПОЛЕ ЛИСТА. Предмет, у которого есть свой пол, а содержимое лежит
     на его краю.
     
     Дефект, купивший семью, заказчик показал тремя снимками: на телефоне
     заголовок героя, список вопросов и лента Instagram стояли вплотную к
     краю собственной тёмной и светлой подложки. В файлах при этом всё было
     безупречно — ни одного числа, поле взято токеном:

         .wrap{ padding-inline: calc(var(--page-gut) - var(--gut)) }

     Поле было РАЗНОСТЬЮ двух линий страницы, а ниже 820 линия у страницы
     одна (так решил заказчик: карточки обязаны стоять на линии нижней
     панели). Разность обнулилась — и вместе с ней исчезло поле у каждого
     листа разом. Проверка по файлам такого не увидит никогда: там написано
     имя, а не число.

     Поэтому мерится ОТРИСОВАННОЕ: у каждого предмета с полом ищется текст,
     чей ближайший пол — этот предмет, и берётся расстояние до края. Пол не
     меньше `FIELD`: ниже этого буква читается как выпавшая из листа.

     Мелочь листом не считается — плашка, пилюля, значок: у них поле своё и
     мельче по делу. Порог по размеру, а не по имени класса.

     Пол поля — восемь пикселей, и это не круглое число: тот же порог стоит
     в проверке вёрстки как граница оптической доводки. Меньше восьми — уже
     не поле, а зазор, и буква на таком расстоянии читается выпавшей из
     листа. Поле карточки товара (10–11 на узком) правилом не является
     нарушением: у мелкого предмета поле мельче по делу, и мерится не
     ступень, а то, оторвана ли буква от края. */
  const FIELD = 8
  const SHEET_W = 260, SHEET_H = 90
  const under = (el) => {
    let n = el.parentElement
    while (n) { if (alpha(getComputedStyle(n).backgroundColor) > 0.02) return getComputedStyle(n).backgroundColor; n = n.parentElement }
    return 'rgb(255, 255, 255)'
  }
  for (const el of document.querySelectorAll('main *, footer *')) {
    const cs = getComputedStyle(el)
    if (alpha(cs.backgroundColor) <= 0.02) continue
    if (cs.backgroundColor === under(el)) continue      // тот же пол — не лист
    const r = el.getBoundingClientRect()
    if (r.width < SHEET_W || r.height < SHEET_H) continue
    if (!shown(el)) continue
    let near = Infinity, who = ''
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let t
    while ((t = walk.nextNode())) {
      if (!t.nodeValue.trim()) continue
      const host = t.parentElement
      if (!host || !shown(host)) continue
      const hcs = getComputedStyle(host)
      if (hcs.position === 'absolute' || hcs.position === 'fixed') continue
      /* Текст, лежащий на СВОЁМ полу внутри листа (карточка на листе),
         меряется от края своей карточки, а не от края листа. */
      let a = host, own = false
      while (a && a !== el) {
        if (alpha(getComputedStyle(a).backgroundColor) > 0.02) { own = true; break }
        a = a.parentElement
      }
      if (own) continue
      const rg = document.createRange(); rg.selectNodeContents(t)
      for (const b of rg.getClientRects()) {
        if (b.width <= 0) continue
        const gap = Math.min(b.left - r.left, r.right - b.right)
        if (gap < near) { near = gap; who = t.nodeValue.trim().slice(0, 24) }
      }
    }
    if (near < FIELD) {
      out.field.push(`${name(el)} — поле ${Math.round(near)}px, буква на краю пола: «${who}»`)
    }
  }

  /* 4a2 · шов оплачен дважды.
     ВОЗДУХ между двумя блоками страницы ставит ОДИН из них, и на этом сайте
     это тот, кто стоит ниже: `.section` объявляет просвет над собой
     (`padding-block-start`), и других хозяев у шва нет. Когда сверху стоящий
     блок вдобавок платит своё нижнее поле, один и тот же просвет
     складывается из двух чисел — и выходит вдвое больше задуманного, причём
     ни одно из двух чисел не выглядит в файле неверным.

     Заказчик увидел это на странице товара: между коробкой покупки и
     вкладками стояло 124px против 48 у точно такого же шва между вкладками
     и полкой «сравните с» — 80 платил ряд товара своим полем и 48 вкладки
     своим воздухом. Слова заказчика: «тут между блоками — воздух, поле,
     ритм же должен быть, проверь карточку всю».

     Мерятся только СОСЕДИ-БЛОКИ: оба во всю ширину родителя, оба ростом с
     полэкрана ноутбука. Поле внутри предмета и просвет внутри ряда сюда не
     попадают — там второй хозяин и не появляется.

     Просветы (`margin`) двух соседей схлопываются сами, поэтому пара
     «просвет + просвет» дефектом не бывает: браузер берёт больший. Дефект
     — только там, где хотя бы одна сторона платит ПОЛЕМ. */
  const SEAM = 8
  const num = (v) => parseFloat(v) || 0
  for (const box of document.querySelectorAll('main, main > *, main > * > *')) {
    const kids = [...box.children].filter((k) => shown(k))
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1], c = kids[i]
      const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect()
      const wide = box.clientWidth * 0.6
      if (ra.width < wide || rc.width < wide) continue
      if (ra.height < 120 || rc.height < 120) continue
      const ca = getComputedStyle(a), cc = getComputedStyle(c)
      if (ca.position === 'absolute' || ca.position === 'fixed') continue
      if (cc.position === 'absolute' || cc.position === 'fixed') continue
      /* Поле блока, который КРАСИТ свой пол, за шов не платит: оно лежит
         уже внутри его поверхности, и между соседями видно край листа, а не
         воздух. Тот же разбор, что у семьи «слипшиеся блоки» выше, и тот же
         `paints()`. Без этой половины два белых листа в столбик — просвет
         между ними 48 — читались как шов в 96: проверка складывала с ним
         поле внутри карточек. */
      const aPad = paints(a) ? 0 : num(ca.paddingBottom), aGap = num(ca.marginBottom)
      const cPad = paints(c) ? 0 : num(cc.paddingTop), cGap = num(cc.marginTop)
      const twice = (aPad > SEAM && cPad + cGap > SEAM) || (aGap > SEAM && cPad > SEAM)
      if (!twice) continue
      out.twoAir.push(
        `${name(a)} → ${name(c)} — шов ${Math.round(aPad + aGap + Math.max(cPad, cGap))}px: `
        + `сверху платит ${Math.round(aPad + aGap)}, снизу ${Math.round(cPad + cGap)}`,
      )
    }
  }

  /* 4b · одна в ряду.
     Полка, у которой в ряду одна карточка, — уже не полка: сравнивать не с
     чем, соседа не видно, а до пятого товара мотать вчетверо дольше. То же
     и у полосы, в которой видно меньше двух ячеек: початая ячейка у края —
     это сообщение «дальше есть ещё», а ячейка во весь экран — баннер.

     Заказчик нашёл это на опросе и назвал запретом: «квиз показывает
     карточку на всю ширину, да это запрещено, везде две карточки на ширину
     может поместиться, одну не нужно — удаляй такой вариант вообще с
     сайта». В файлах признак не виден: ни одна строка не говорит «одна
     колонка» — её дают пол ячейки и ширина ряда, встретившиеся на узком
     окне. Видно только на отрисованной странице.

     Меряются РЯДЫ, а не полосы, и это граница, проведённая заказчиком:
     запрет он объявил, увидев карточку во всю ширину в опросе, а когда тот
     же счёт применили к полкам с прокруткой — вернул как было («верни
     размеры карточек и плиток»). Разница по существу: в ряду одна ячейка —
     тупик, соседа нет вовсе; в полосе соседняя выглядывает из-за края и
     доезжает одним движением пальца. */
  const byBox = new Map()
  for (const c of document.querySelectorAll('[data-card]')) {
    if (!shown(c) || !c.parentElement) continue
    const kids = byBox.get(c.parentElement) ?? []
    kids.push(c)
    byBox.set(c.parentElement, kids)
  }
  for (const [box, kids] of byBox) {
    if (kids.length < 2) continue
    const a = kids[0].getBoundingClientRect(), b = kids[1].getBoundingClientRect()
    /* Вторая карточка начинается НИЖЕ первой — значит, ряд держит одну. */
    if (b.top < a.bottom - 1) continue
    out.alone.push(`${name(box)} — карточка ${Math.round(a.width)}px в ряду ${Math.round(box.clientWidth)}px: в ряду одна`)
  }

  /* 4c · плотность товарного каталога.
     Это не правило всех сеток: блок объявляет договор атрибутом
     `data-catalog-grid`. Полная полка держит четыре-пять товаров, а полка
     рядом с постоянной боковой панелью — три-четыре и объявляет это через
     `data-catalog-grid="with-rail"` либо предка
     `data-catalog-layout="with-rail"`. Шесть мешают сравнивать название,
     силу и цену; слишком мало на широкой полосе раздувает квадратный кадр
     и всю карточку почти до высоты окна. */
  if (innerWidth >= catalogue.desktop) {
    for (const box of document.querySelectorAll('[data-catalog-grid]')) {
      if (!shown(box)) continue
      const cards = [...box.querySelectorAll('[data-product-card]')].filter(shown)
      const withRail = box.getAttribute('data-catalog-grid') === 'with-rail' ||
        Boolean(box.closest('[data-catalog-layout="with-rail"]'))
      const contract = withRail ? catalogue.withRail : catalogue.full
      if (cards.length < contract.min) continue
      const firstTop = Math.round(cards[0].getBoundingClientRect().top)
      const columns = cards.findIndex((card) => Math.abs(Math.round(card.getBoundingClientRect().top) - firstTop) > 1)
      const count = columns === -1 ? cards.length : columns
      const firstWidth = cards[0].getBoundingClientRect().width
      const wrongCount = count < contract.min || count > contract.max
      const tooWide = firstWidth > contract.maxCard + 1
      if (wrongCount || tooWide) {
        out.catalogueColumns.push(
          `${name(box)} — ${count} в ряд, карточка ${Math.round(firstWidth)}px при ${innerWidth}px; ` +
          `режим ${withRail ? 'с боковой панелью' : 'без боковой панели'}: ` +
          `нужно ${contract.min}–${contract.max} и не шире ${contract.maxCard}px`,
        )
      }
    }
  }

  /* 5 · вес снимка. Меряется в пикселях, а не в байтах: байты зависят от
     сжатия, а пикселей отдано ровно столько, сколько решил тот, кто вставил
     картинку. Порог 2× — это уже вчетверо больше данных, чем нужно даже
     экрану с удвоенной плотностью.

     Вектор пикселей не везёт (И264): у SVG `naturalWidth` — размер по
     умолчанию, а не отданный вес. Образец витрины рисует товар SVG, и
     миниатюра строки корзины в 38px числилась «150px в 38px, ×3.9» —
     двадцать шесть находок того, чего нет. */
  const isVector = new RegExp(vector, 'i')
  for (const img of document.images) {
    if (!shown(img) || !img.naturalWidth || isVector.test(img.currentSrc)) continue
    const w = img.getBoundingClientRect().width
    if (w < 24) continue
    const over = img.naturalWidth / w
    if (over > 2 && !img.srcset) {
      const key = `w:${img.currentSrc}:${Math.round(w)}`
      if (!seen.has(key)) {
        seen.add(key)
        out.weight.push(`${img.currentSrc.split('/').pop()} — ${img.naturalWidth}px в ${Math.round(w)}px, ×${over.toFixed(1)}`)
      }
    }
  }

  /* 6 · прыжок вёрстки: у картинки не занято место заранее. Размеры годятся
     любые — важна пропорция, по которой браузер держит коробку, пока файл
     едет. `aspect-ratio` в стиле считается тем же самым. */
  for (const img of document.images) {
    if (!shown(img)) continue
    const cs = getComputedStyle(img)
    const held = (img.getAttribute('width') && img.getAttribute('height')) ||
                 (cs.aspectRatio && cs.aspectRatio !== 'auto')
    if (held) continue
    const key = `j:${img.getAttribute('src')}`
    if (!seen.has(key)) { seen.add(key); out.jump.push(`${(img.getAttribute('src') || '?').split('/').pop()} — без width/height`) }
  }

  /* 7 · безымянный орган. Имя ищется там же, где его ищет скринридер: свой
     текст, aria-label, aria-labelledby, title, alt вложенной картинки. */
  const named = (el) => {
    if ((el.textContent || '').trim()) return true
    if (el.getAttribute('aria-label') || el.getAttribute('title')) return true
    const by = el.getAttribute('aria-labelledby')
    if (by && by.split(/\s+/).some((id) => document.getElementById(id))) return true
    const img = el.querySelector('img[alt]')
    if (img && img.getAttribute('alt').trim()) return true
    return false
  }
  for (const el of document.querySelectorAll('a[href], button, [role="button"], summary')) {
    if (!shown(el) || named(el)) continue
    const key = `n:${el.tagName}:${(el.className || '').toString().slice(0, 30)}`
    if (!seen.has(key)) { seen.add(key); out.name.push(name(el) || el.tagName.toLowerCase()) }
  }
  /* Картинка без атрибута alt вовсе — это не решение, а пропуск: пустой alt
     говорит «украшение», отсутствующий не говорит ничего, и скринридер
     читает адрес файла. */
  for (const img of document.images) {
    if (!shown(img) || img.hasAttribute('alt')) continue
    const key = `a:${img.getAttribute('src')}`
    if (!seen.has(key)) { seen.add(key); out.name.push(`img ${(img.getAttribute('src') || '?').split('/').pop()} — без alt`) }
  }

  /* 8 · лестница заголовков: ровно один h1 и ни одного пропущенного уровня.
     Скринридер ходит по странице заголовками — пропуск с h2 на h4 читается
     как «здесь что-то потеряно». */
  /* Лестница заголовков живёт в дереве доступности, а не на картинке.
     Заголовок «только для чтения вслух» убран с экрана обрезкой — глазу его
     нет, скринридеру есть, и в лестнице он считается. Поэтому здесь своя
     проверка видимости: не `display:none`, не `visibility:hidden`, не
     `aria-hidden`, не внутри `inert`. */
  const spoken = (el) => {
    if (el.closest('[aria-hidden="true"], [inert]')) return false
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden') return false
    }
    return !!(el.textContent || '').trim()
  }
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(spoken)
  const ones = hs.filter((h) => h.tagName === 'H1')
  if (ones.length !== 1) out.heads.push(`h1 на странице: ${ones.length}`)
  let prev = 0
  for (const h of hs) {
    const lvl = Number(h.tagName[1])
    if (prev && lvl > prev + 1) out.heads.push(`${name(h)} — h${prev} → h${lvl}`)
    prev = lvl
  }

  /* Лестница заголовков — не только уровнями, но и РАЗМЕРОМ.
   *
   * Семья `heads` выше проверяет номера: один h1, уровни без пропусков. Этого
   * оказалось мало. Заказчик открыл страницу товара на десктопе и сказал, что
   * «не гармонично»: имя товара стояло 36.9px, а заголовок раздела ниже по
   * странице — 34px. Разница в восемь процентов, то есть главному слову
   * страницы нечем быть главнее. Разметка при этом была безупречна: h1 один,
   * пропусков нет.
   *
   * Причина — две верхние ступени шкалы меряют РАЗНЫМИ линейками: заголовок
   * страницы считает свою колонку (`cqi`), заголовок раздела — ширину окна
   * (`vw`). Пересекаются такие кривые в точке, которой нет ни в одном
   * медиазапросе, и рассуждением её не найти. Там же нашлась вторая: ступень
   * `--fs-h3` (26 на телефоне) была КРУПНЕЕ ступени `--h2-size` (24) на всех
   * ширинах ниже 770px.
   *
   * Поэтому меряется отрисованный размер: заголовок каждого уровня обязан
   * быть крупнее любого заголовка уровнем ниже. Сравниваются САМЫЕ КРУПНЫЕ
   * представители уровня — на странице законно стоят разные h2 (заголовок
   * полки и подпись блока), и меньший из них ни о чём не говорит.
   *
   * Служебные заголовки, убранные с экрана обрезкой, в счёт не идут: они есть
   * для скринридера, размера у них нет. */
  const painted = (el) => {
    if (!spoken(el)) return false
    const b = el.getBoundingClientRect()
    return b.width > 4 && b.height > 4
  }
  const big = new Map()
  for (const h of hs) {
    if (!painted(h)) continue
    const lvl = Number(h.tagName[1])
    const fs = parseFloat(getComputedStyle(h).fontSize) || 0
    const was = big.get(lvl)
    if (!was || fs > was.fs) big.set(lvl, { fs, el: h })
  }
  const levels = [...big.keys()].sort((a, b) => a - b)
  for (let i = 0; i < levels.length - 1; i++) {
    const up = big.get(levels[i]), down = big.get(levels[i + 1])
    if (down.fs >= up.fs) {
      out.ladder.push(
        `h${levels[i]} «${name(up.el)}» ${Math.round(up.fs)}px — ` +
        `не крупнее h${levels[i + 1]} «${name(down.el)}» ${Math.round(down.fs)}px`)
    }
  }

  /* И второе про размер: у страницы одно главное слово.
   *
   * Цена на карте товара стояла ровно того же размера и того же веса, что имя
   * товара (37px / 700 оба) — потому что обе брали одну ступень `--fs-page`.
   * Два главных на одной странице значат, что главного нет: глазу негде
   * остановиться первым, и заказчик увидел это раньше любой проверки.
   *
   * Признак меряется так: жирный текст (600 и выше) не бывает крупнее
   * заголовка страницы и не совпадает с ним размером. Нежирный не считается —
   * крупная светлая цифра заголовку не соперник. */
  const h1 = big.get(1)
  if (h1) {
    for (const el of document.querySelectorAll('b,strong,span,div,p,i,em,a,button')) {
      if (!painted(el)) continue
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (!own) continue
      const cs = getComputedStyle(el)
      const fs = parseFloat(cs.fontSize) || 0
      if ((parseInt(cs.fontWeight, 10) || 400) < 600) continue
      if (fs < h1.fs) continue
      const key = `shout:${name(el)}:${Math.round(fs)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.ladder.push(`«${name(el)}» ${Math.round(fs)}px жирным — не тише заголовка страницы (${Math.round(h1.fs)}px)`)
    }
  }

  /* Орган во всю ширину — это орган без меры.
   *
   * Заказчик показал снимок и сказал прямо: «ну что это блять за кнопки на
   * более чем половину экрана». Замер: «Add to cart» шла 588px при окне 1280,
   * 748 при 1440 и 828 при 1840 — то есть кнопка росла вместе с окном, потому
   * что колонка, в которой она стоит, не имела потолка.
   *
   * Дефекта не видно ни в одном файле: кнопка объявлена `width:100%`, и это
   * верно — она обязана занимать свою коробку целиком. Неверна коробка, а её
   * ширина приходит из раскладки.
   *
   * Порог — 640px: верхний конец меры набора (55–62ch при 18px даёт 605–680).
   * Орган шире строки текста читается не как кнопка, а как полоса. Вторым
   * условием половина окна: на узком десктопе 600px это уже полоса.
   *
   * Высокое в счёт не идёт: карточка товара — тоже ссылка, и ей во всю
   * колонку стоять положено. Орган от карточки отличает высота. */
  if (!phone && innerWidth >= 1080) {
    const cap = Math.min(640, innerWidth / 2)
    for (const el of document.querySelectorAll('button, a, [role="button"], input[type="submit"]')) {
      if (!shown(el)) continue
      const b = el.getBoundingClientRect()
      if (b.height > 96 || b.height < 28 || b.width <= cap) continue
      const cs = getComputedStyle(el)
      const painted = alpha(cs.backgroundColor) > 0.05 || cs.boxShadow !== 'none'
        || cs.borderTopWidth !== '0px'
      if (!painted) continue
      const key = `wide:${name(el)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.wideCtrl.push(`«${name(el)}» ${Math.round(b.width)}px при пороге ${Math.round(cap)}`)
    }
  }

  /* Рваная правая кромка внутри одной колонки — это «симметрии нет вообще».
   *
   * Слова заказчика о карте товара: «тут блять жмётся всё влево», «симметрии
   * вертикальной нет вообще», «ну что это блять за кнопки на более чем
   * половину экрана». Причина у всех трёх одна: колонка покупки росла без
   * предела (632 → 792 → 872 при окне 1280 → 1440 → 1840), а текст внутри
   * обрывался на своей мере — 605. Панель фактов и коробка покупки тянулись
   * на все 872, абзац — нет, и в одной колонке оказалось ДВЕ правых кромки.
   *
   * Мерится именно это: у соседей по колонке одна правая вертикаль. Не
   * пропорция колонок (рельса фильтров рядом с сеткой и должна быть вдвое
   * уже — это замысел) и не доля текста (проза со своей мерой внутри широкой
   * колонки — тоже замысел). Разъехавшиеся кромки замыслом не бывают.
   *
   * Считаются только настоящие блоки-соседи: от 40% ширины колонки, иначе в
   * счёт пошли бы пилюля и значок, которым полная ширина и не положена.
   * Порог расхождения — 12% ширины колонки: меньше глаз принимает за поле. */
  if (!phone && innerWidth >= 1080) {
    for (const box of document.querySelectorAll('div, section, main, article')) {
      const cs = getComputedStyle(box)
      if (!/flex|grid/.test(cs.display)) continue
      for (const col of box.children) {
        const cb = col.getBoundingClientRect()
        if (!shown(col) || cb.width < 320 || cb.height < 320) continue
        if (/grid/.test(getComputedStyle(col).display)) continue
        const edges = []
        for (const kid of col.children) {
          const k = kid.getBoundingClientRect()
          if (!shown(kid) || k.width < cb.width * 0.4) continue
          if (getComputedStyle(kid).display === 'inline') continue
          /* Знак магазина, значок и короткая подпись колонку и не должны
             заполнять: у них своя ширина, и кромка тут ни при чём. В счёт
             идут только блоки с набором — от шестидесяти знаков. */
          if ((kid.textContent || '').trim().length < 60) continue
          edges.push(k.right)
        }
        if (edges.length < 2) continue
        const spread = Math.max(...edges) - Math.min(...edges)
        if (spread <= cb.width * 0.12) continue
        const key = `ragged:${name(col) || col.className}`
        if (seen.has(key)) continue
        seen.add(key)
        out.lopsided.push(
          `в колонке ${Math.round(cb.width)}px правые кромки соседей ` +
          `разъехались на ${Math.round(spread)}px — одна вертикаль превратилась в две`)
      }
    }
  }

  /* ── мёртвая зона у органа ──────────────────────────────────────────────
   *
   * Кнопка, которая отзывается не везде. Заказчик описал это точно: «в одном
   * месте кнопки она реагирует на мышку, а в каких-то местах не реагирует».
   * В файлах такого не видно ВООБЩЕ: у каждого органа всё на месте, а поверх
   * него лежит чужое.
   *
   * Виновником был невидимый запас нажатия. Он растит область попадания до
   * сорока четырёх пикселей вокруг мелкого органа — ради пальца, — но заодно
   * ПЕРЕХВАТЫВАЕТ указатель у всего, что стоит ближе. Пилюля в 28 пикселей
   * накрывала соседа на восемь в каждую сторону; у сердца на карточке товара
   * выходил 21 промах из 28 замеров.
   *
   * Спрашивается прямо: попадает ли нажатие в сам орган. Сетка точек внутри
   * его коробки, `elementFromPoint` в каждой — и попаданием считается сам
   * орган или его потомок.
   *
   * Шапка, нижняя полоса и помощник из счёта исключены: они висят над
   * страницей по делу, и перехватывать уехавшее под них — их работа, а не
   * дефект. Признак — `position` `fixed` или `sticky` у перехватчика или у
   * любого его предка.
   */
  for (const el of document.querySelectorAll('a[href], button, [role="button"], label, summary')) {
    if (!shown(el)) continue
    const cs = getComputedStyle(el)
    if (cs.pointerEvents === 'none') continue
    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) continue
    /* Орган, уехавший за край окна, меряется на другой прокрутке. */
    if (r.top < 4 || r.bottom > window.innerHeight - 4) continue
    let dead = 0, seenPoints = 0, thief = ''
    for (let ix = 1; ix <= 7; ix++) {
      for (let iy = 1; iy <= 4; iy++) {
        const hit = document.elementFromPoint(
          r.left + (r.width * ix) / 8, r.top + (r.height * iy) / 5)
        if (!hit) continue
        seenPoints++
        if (hit === el || el.contains(hit) || hit.contains(el)) continue
        let over = false
        for (let n = hit; n; n = n.parentElement) {
          const s = getComputedStyle(n)
          if (s.position === 'fixed' || s.position === 'sticky') { over = true; break }
        }
        if (over) continue
        dead++
        if (!thief) thief = name(hit)
      }
    }
    if (!dead) continue
    const key = `stolen:${name(el)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.stolen.push(
      `${name(el)} — не отзывается в ${dead} точках из ${seenPoints}, перехватывает ${thief}`)
  }

  /* ── орган утонул в своём полу ──────────────────────────────────────────
   *
   * Кнопка бывает невидимой не потому, что мелкая, и не потому, что буквы
   * бледные, — а потому, что её ЗАЛИВКА почти совпала с тем, на чём она
   * стоит. Обе прежние проверки цвета при этом молчат: контраст букв к
   * заливке в норме, ступени палитры между собой в норме. Не меряет никто
   * ровно ту пару, которая и делает кнопку кнопкой.
   *
   * Дефект, купивший семью, заказчик увидел на первом же снимке: тихая
   * кнопка красилась ступенью поверхности (`--ctrl`, #ECF0EE), и на белой
   * карточке это читалось, а на листе страницы (#E0E6E3) давало 1.10 — то
   * есть кнопки там не было вовсе, оставалось слово в воздухе.
   *
   * Причина общая и стоит правила: ЗАЛИВКА — это всегда ступень одного
   * конкретного пола, и на другом полу она исчезает. КРОМКА — граница с
   * чернилами, и читается на любом. Поэтому спрашивается не «есть ли
   * заливка», а «отличим ли орган от своего пола хоть чем-нибудь»: ступенью
   * или кромкой.
   *
   * Порог 1.15, и он выведен замером, а не взят из норматива — норматива на
   * это нет вовсе. Две точки, обе с этого сайта: ступень `--ctrl` на листе
   * страницы даёт 1.10, и кнопки там НЕ ВИДНО (нашёл заказчик); та же ступень
   * на белой карточке даёт 1.15, и там она читается — эту заказчик не тронул.
   * Порог стоит на второй точке: ниже неё орган пропадает.
   *
   * Почему для органа порог выше, чем для поверхности: карточка на листе
   * живёт при 1.07 и прекрасно видна, потому что она БОЛЬШАЯ. Пилюля в сорок
   * шесть пикселей той же ступенью не обходится — глаз ловит слабый край на
   * длинной границе и не ловит на короткой.
   */
  for (const el of document.querySelectorAll('a, button, [role="button"], label')) {
    if (!shown(el)) continue
    const cs = getComputedStyle(el)
    const a = alpha(cs.backgroundColor)
    /* Совсем прозрачный орган — это «без фона», отдельный голос: ему заливкой
       отличаться нечем и не надо, он отвечает краской. Порог низкий нарочно:
       тихая кнопка красится ВУАЛЬЮ в восемь процентов чернил, и отбрасывать
       её как «прозрачную» значило бы не мерить ровно тот случай, ради
       которого семья и заведена. */
    if (a < 0.02) continue
    /* Кромка отличает орган от любого пола: обводка, рамка, тень-кольцо. */
    const edged = (cs.boxShadow && cs.boxShadow !== 'none') ||
                  (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
                  parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0
    if (edged) continue
    /* Орган, ЗАПОЛНЕННЫЙ картинкой, узнаётся по ней, а не по заливке: плитка
       галереи товара — это снимок 96×96, её фон виден только по краям, и
       требовать от неё ступени значит требовать рамку вокруг фотографии.

       Отличие от знака внутри кнопки — в доле, а не в теге: рисунок товара
       занимает почти весь орган, а стрелка или корзина — пятую часть его
       площади и как раз СТОЯТ на этой заливке. Поэтому считается доля, и
       считается по любому изображению, включая нарисованное `svg`: у товара
       без снимка в плитке стоит именно оно. */
    const eb = el.getBoundingClientRect()
    let covered = 0
    for (const kid of el.querySelectorAll('img, picture, video, canvas, svg')) {
      const k = kid.getBoundingClientRect()
      covered = Math.max(covered, (k.width * k.height) / (eb.width * eb.height || 1))
    }
    if (covered >= 0.6) continue
    /* Пол — то, на чём орган стоит: слои начиная с родителя. */
    const g = ground(el.parentElement)
    if (!g.known) continue
    const under = over(g.layers, [255, 255, 255])
    const own = over([[rgb(cs.backgroundColor), a]], under)
    const step = pair(own, under)
    if (step >= 1.15) continue
    const key = `sunk:${name(el)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.sunk.push(`${name(el)} — ступень до своего пола ${step.toFixed(2)} (норма 1.15), и кромки нет`)
  }

  /* Одно действие — одна одежда.
   *
   * Выход из блока («весь индекс») рисуется общим компонентом, который берёт
   * одежду из выбранного набора. На странице товара стояла своя, записанная
   * буквой прямо в разметке: та же кнопка выходила другой высоты, без поля и
   * с лишней литерой. Заказчик увидел это глазом, сравнив два экрана.
   *
   * Признак в файле не виден: разметка там законная, а расходятся страницы.
   * Виден он ровно здесь — на отрисованной странице, где одежд оказывается
   * больше одной. */
  const dresses = [...new Set([...document.querySelectorAll('[data-more]')]
    .filter(shown).map((el) => el.dataset.more))]
  if (dresses.length > 1) {
    out.dress.push(`одежд у выхода из блока: ${dresses.length} (${dresses.join(', ')}) — должна быть одна`)
  }

  /* 10 · обрезанный текст.
   *
   * Та же беда, что вылезший за экран, — разница лишь в том, КТО его прячет.
   * Свип ловит переполнение страницы; текст, срезанный собственным блоком, не
   * видит никто: страница выглядит опрятной, слово просто короче, чем должно
   * быть.
   *
   * Дефекты соседнего магазина, оба из этой семьи: `nowrap` на заголовке
   * подвала значит «эта строка не переносится НИКОГДА», а не «на широкой она
   * в одну строку» — на 375 он стоил половины слова. И «20% CBD+CBN» браузер
   * не рвёт: плюс держит то, что за ним, и карточка обрезает последнюю
   * букву. Там, где в названии есть `+` или `/`, ставится `<wbr>`.
   *
   * Считается только НАСТОЯЩАЯ обрезка: блок обрезает (`hidden`/`clip`), а
   * содержимое шире него. Полоса с прокруткой (`auto`, `scroll`) не в счёт —
   * она для того и сделана, чтобы содержимое было шире. */
  for (const el of document.querySelectorAll(
    'h1,h2,h3,h4,h5,h6,p,a,span,b,strong,small,li,td,th,label,button,figcaption')) {
    if (!shown(el)) continue
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!own) continue
    const cs = getComputedStyle(el)
    if (!/^(hidden|clip)$/.test(cs.overflowX)) continue
    const cut = el.scrollWidth - el.clientWidth
    /* Порог в два пикселя — на дробную ширину: строка, кончающаяся на
       половине пикселя, обрезанной не считается. */
    if (cut > 2) out.clip.push(`${name(el)} — срезано ${Math.round(cut)}px (${cs.whiteSpace})`)
  }

  /* 11 · растянутый снимок.
   *
   * Семья `weight` спрашивает, сколько пикселей отдано; эта — какой они
   * ФОРМЫ. `object-fit` по умолчанию `fill`: коробке назначили и ширину, и
   * высоту, и снимок послушно лёг в чужую пропорцию — лица вытягиваются,
   * круглая банка становится овальной, и всё это выглядит дёшево ровно так,
   * как выглядит дешёвый магазин.
   *
   * В файле не видно вовсе: там законные `width`, `height` и законный
   * снимок. Расходятся они только на странице.
   *
   * День, ради которого семья заведена, известен заранее: снимки придут из
   * админки, где их кладёт человек, а не сборка. Пропорция, которую сегодня
   * держит `tools/shrink.mjs`, завтра будет любой — и первый же портрет,
   * положенный в квадратную плитку, растянется молча.
   *
   * Взято из открытого набора Frontend Visual QA (`image-aspect-mismatch`) —
   * из той его части, которой у нас не было. */
  for (const img of document.images) {
    if (!shown(img) || !img.naturalWidth || !img.naturalHeight) continue
    /* `cover`, `contain` и `scale-down` пропорцию берегут — режут или
       вписывают. Искажает только `fill`, и только он тут и меряется. */
    if (getComputedStyle(img).objectFit !== 'fill') continue
    const b = img.getBoundingClientRect()
    if (b.width < 24 || b.height < 24) continue
    const want = img.naturalWidth / img.naturalHeight
    const got = b.width / b.height
    const off = Math.abs(got - want) / want
    /* Три процента — это дробный пиксель и округление ширины колонки.
       Меньше не видит никто; больше видно на лицах и на круглом. */
    if (off <= 0.03) continue
    const key = `s:${img.currentSrc}`
    if (seen.has(key)) continue
    seen.add(key)
    out.stretch.push(
      `${(img.currentSrc || '?').split('/').pop()} — своя пропорция ${want.toFixed(2)}, ` +
      `на странице ${got.toFixed(2)} (на ${Math.round(off * 100)}% мимо)`)
  }

  /* 12 · снимок не доехал.
   *
   * Пустая коробка на месте картинки в диффе выглядит безупречно: разметка
   * законная, файл назван. Ломается ПУТЬ — а путь у нас вычисляется:
   * `components/Shot.tsx` собирает `srcset` перезаписью имени
   * (`/shots/a.jpg` → `/_r/shots/a-800.jpg`), и промах нарезки в
   * `tools/shrink.mjs` даёт ссылку, которой нет ни в одном файле проекта.
   * Искать её глазами негде — она существует только в собранной странице.
   *
   * Своя проверка видимости, а не общая: у битой картинки коробка бывает
   * нулевой, и `shown()` её пропустит — а дефект ровно в том, что её не
   * видно. */
  for (const img of document.images) {
    if (getComputedStyle(img).display === 'none') continue
    const src = img.getAttribute('src') || img.currentSrc
    if (!src && !img.srcset) continue
    if (img.complete && img.naturalWidth > 0) continue
    /* `complete` и нулевая своя ширина — файла нет или он не картинка. Это
       дефект всегда: браузер сходил и не принёс.

       А вот `complete === false` — само по себе НЕ ответ, и первый прогон
       этой семьи выдал 418 «дефектов» ровно на этом. `loading="lazy"` ниже
       экрана значит, что браузер картинку ещё и не просил: она не доехала
       ПО ЗАМЫСЛУ, ради того ленивая загрузка и ставится. Спрашивать с неё
       значит мерить не то — все 418 файлов лежали на месте и отдавались
       двухсотым.

       Поэтому «не доехал» спрашивается только с того, что человек СЕЙЧАС
       видит: сеть уже успокоилась, анимации кончились, и пустое место в
       видимой части — это пустое место. */
    if (!img.complete) {
      const b = img.getBoundingClientRect()
      if (!(b.top < innerHeight && b.bottom > 0 && b.width > 1)) continue
    }
    const key = `b:${img.currentSrc || src}`
    if (seen.has(key)) continue
    seen.add(key)
    out.broken.push(`${(img.currentSrc || src || '?').split('/').pop()} — ${img.complete ? 'не открылся' : 'не доехал'}`)
  }

  /* 13 · кто именно вылез за край.
   *
   * Свип говорит, что страница шире экрана, — и не говорит, ЧЬЯ это ширина.
   * Дальше виновника ищут руками, перебирая блоки; на 33 ширинах это самая
   * дорогая правка из всех дешёвых.
   *
   * Здесь он называется по имени: самый верхний элемент, чей правый край за
   * краем страницы, тогда как родитель ещё внутри. Ниже него всё лежит
   * следствием, выше — причины нет.
   *
   * Полоса с прокруткой не в счёт: `rail` для того и сделана, чтобы
   * содержимое было шире — оно уезжает внутрь неё, а не на страницу. */
  {
    const pageW = document.documentElement.clientWidth
    /* Видимость своя: общая `shown()` требует, чтобы элемент был виден на
       60% ширины, — а виновник переполнения ровно тем и плох, что он вдвое
       шире экрана, и по общей мерке был бы пропущен как «его не видно». */
    const boxed = (el) => {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false
      const b = el.getBoundingClientRect()
      return b.width > 1 && b.height > 1 && b.left < pageW
    }
    const railed = (el) => {
      for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        if (getComputedStyle(n).overflowX !== 'visible') return true
      }
      return false
    }
    for (const el of document.querySelectorAll('body *')) {
      if (!boxed(el)) continue
      const b = el.getBoundingClientRect()
      if (b.right <= pageW + 1) continue
      if (railed(el)) continue
      const host = el.parentElement
      if (host && host !== document.body && host.getBoundingClientRect().right > pageW + 1) continue
      const key = `o:${name(el)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.spill.push(`${name(el)} — за правым краем на ${Math.round(b.right - pageW)}px`)
    }
  }

  /* 14 · фокус, которого не видно.
   *
   * `outline:none` без замены ломает клавиатуру молча: мышью всё работает,
   * дифф безупречен, а человек, идущий по сайту табом, теряет место на
   * странице целиком. В файлах это ловит семья `focusGone` в `check:css`;
   * здесь — с другой стороны, и она ловит то, чего в файлах не видно:
   * кольцо назначено, но срезано обрезкой соседа, закрыто липкой шапкой или
   * перекрашено родителем в цвет фона.
   *
   * Меряется сравнением органа С САМИМ СОБОЙ: слепок обводки, тени, рамки,
   * фона и краски — своих и ближайших потомков, потому что кольцо часто
   * рисуют на дорожке внутри органа, а не на нём самом (`.sw` у
   * переключателя темы, `.search` у поиска). Ничего не изменилось — фокуса
   * не видно.
   *
   * Порог в сорок органов на страницу: дальше начинаются повторы одного и
   * того же — карточки каталога, пункты полки, — а стоит проверка времени. */
  {
    const ring = (el) => {
      const parts = []
      for (const n of [el, ...el.querySelectorAll('*')].slice(0, 10)) {
        const cs = getComputedStyle(n)
        parts.push(cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.outlineOffset,
                   cs.boxShadow, cs.borderColor, cs.borderWidth,
                   cs.backgroundColor, cs.backgroundImage, cs.color, cs.textDecorationLine)
        for (const pseudo of ['::before', '::after']) {
          const ps = getComputedStyle(n, pseudo)
          parts.push(ps.content, ps.boxShadow, ps.backgroundColor, ps.outlineStyle,
                     ps.opacity, ps.transform, ps.width, ps.height)
        }
      }
      return parts.join('|')
    }
    const was = document.activeElement
    let n = 0
    for (const el of document.querySelectorAll(
      'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')) {
      if (n >= 40) break
      if (!shown(el) || el.disabled) continue
      const before = ring(el)
      el.focus({ preventScroll: true })
      /* Не принял фокус — не орган для клавиатуры, и спрашивать с него
         кольцо не о чем: это отдельный дефект и отдельная семья. */
      if (document.activeElement !== el) continue
      n++
      if (ring(el) !== before) continue
      const key = `f:${name(el)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.focus.push(`${name(el)} — фокус не виден ничем`)
    }
    /* Вернуть страницу как была: следом её снимают, и открытая по фокусу
       ссылка «к содержимому» испортила бы снимок. */
    if (document.activeElement && document.activeElement !== was) document.activeElement.blur()
    if (was && was !== document.body && was.focus) was.focus({ preventScroll: true })
  }

  /* 15 · надпись контрола, сложившаяся в две строки.
   *
   * Кнопка, у которой подпись переехала на вторую строку, — не мелочь
   * оформления: она выше соседних, ряд теряет общую линию, а на телефоне
   * такая кнопка съедает высоту, которой и так нет. В файлах этого не видно
   * никогда: в разметке надпись одна, ширины у неё там нет.
   *
   * Про нас это потому, что подписи живут парами: болгарская строка длиннее
   * английской почти всегда, и ломается ровно та половина сайта, на которую
   * смотрят реже.
   *
   * Меряется по ОДНОМУ узлу текста, а не по всему органу. Подпись, разбитая
   * на два узла нарочно (знак сверху, слово снизу в нижней полосе), — это
   * устройство контрола, а не перенос; считать её дефектом значит требовать
   * переписать то, что сделано верно. Перенос — это когда ОДНА надпись не
   * поместилась в свою ширину.
   *
   * Строчная ссылка внутри абзаца пропускается: она обязана переноситься,
   * для того абзац и набран. */
  {
    const oneLabel = (node) => {
      const r = document.createRange()
      r.selectNodeContents(node)
      const tops = new Set()
      for (const b of r.getClientRects()) {
        if (b.width < 1 || b.height < 1) continue
        tops.add(Math.round(b.top / 4))
      }
      return tops.size
    }
    /* Орган, а не всякая ссылка. Ссылка в колонке подвала, заголовок
       карточки и подпись поста переносятся законно — это текст, набранный в
       свою ширину. Речь про КОНТРОЛ: у него своя оболочка — заливка или
       рамка, — и он рассчитан на одну строку, потому что стоит в ряду с
       соседями и держит с ними общую линию.
       Первая редакция спрашивала всё подряд и выдала 132 находки, из них
       настоящих — ни одной: мерилась вёрстка текста, а не подписи органов. */
    const pill = (el, cs) => {
      /* Карточка — не орган, хотя и нажимается: внутри у неё снимок,
         заголовок и абзац, и её подпись переносится законно. Признак —
         содержимое: у контрола внутри надпись и, может быть, знак. */
      if (el.querySelector('img, picture, video, h1, h2, h3, h4, h5, h6, p')) return false
      if (/^(BUTTON|SUMMARY)$/.test(el.tagName)) return true
      if (el.getAttribute('role') === 'button') return true
      const bg = cs.backgroundColor
      const opaque = bg && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(bg)
      const edged = parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0
      return opaque || edged
    }
    for (const el of document.querySelectorAll('button, summary, [role="button"], a')) {
      if (!shown(el)) continue
      const cs = getComputedStyle(el)
      /* Строчный — значит стоит в потоке текста: это ссылка в абзаце. */
      if (cs.display === 'inline') continue
      if (!pill(el, cs)) continue
      /* Нарочный перенос по символу новой строки — тоже устройство, а не
         промах ширины. */
      if (cs.whiteSpace === 'pre-line' || cs.whiteSpace === 'pre-wrap') continue
      /* Орган, у которого подпись МНОГОСТРОЧНА по замыслу, объявляет это
         вслух (`data-lines`): карточка ответа в опросе — коробка ряда, её
         ширину задаёт сетка, а не длина слова, и «Something else» в две
         строки там читается ровно так, как нарисовано. Признака в стилях
         нет: та же запись у пилюли была бы промахом ширины. Тот же приём,
         что `--cols-min:1` у сетки: исключение написано там, где принято
         решение, а не спрятано в проверке. */
      if (el.hasAttribute('data-lines')) continue
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const txt = (n.nodeValue || '').trim()
        /* Одно слово перенестись не может, а длинная строка — это уже не
           подпись органа, а заголовок карточки: ему две строки положены. */
        if (!/\s/.test(txt) || txt.length > 28) continue
        /* ВОПРОС — тоже не подпись. У `<summary>` в списке вопросов стоит
           целое предложение, и две строки ему положены так же, как заголовку
           карточки. Порог в 28 знаков его не отсеивал: болгарское «Колко
           канабидиол има в грам?» — ровно 28, впритык. Считать знаки тут и
           не надо: у подписи органа не бывает вопросительного знака на
           конце, а у вопроса он есть всегда. */
        if (/[?!]$/.test(txt)) continue
        if (oneLabel(n) < 2) continue
        const key = `w:${txt}`
        if (seen.has(key)) break
        seen.add(key)
        out.wrap.push(`«${txt}» — подпись ${name(el)} в две строки`)
        break
      }
    }
  }

  /* 16 · ссылка внутрь страницы: есть ли куда и видно ли, куда приехали.
   *
   * Две беды одной природы, и обе не видны в файлах.
   *
   * ПЕРВАЯ — цели нет. `href="#privacy"` выглядит ссылкой, ведёт в никуда:
   * браузер никуда не прокручивает, поиск считает страницу ссылающейся на
   * себя, скринридер объявляет ссылкой, таб на ней останавливается. Ровно
   * те же одиннадцать ссылок в никуда, которые заказчик нашёл глазом, — но
   * эти четыре пришли ИЗ ДАННЫХ (`lib/contacts.ts`), а не из разметки, и
   * проверка по файлам, ищущая литерал `href="#"`, их не видела. Отсюда и
   * семья: спрашивать надо страницу, а не файл.
   *
   * ВТОРАЯ — цель уезжает под шапку. Браузер ставит цель к верху окна, а
   * верх окна занят прилипшей шапкой: покупатель приезжает на нужный
   * раздел и видит его заголовок срезанным. Лечится `scroll-margin-top`, и
   * он объявлен один раз в `styles/base.css` на все узлы с именем.
   *
   * Занятый верх берётся из геометрии САМОЙ шапки — её отступа от края и
   * высоты в прилипшем виде, — а не из правила, которое мы же и проверяем.
   * Нет таких величин (чужой проект, другая шапка) — меряется высотой
   * шапки как она есть. */
  {
    const head = document.querySelector('header')
    const px = (n) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0
    const stuck = px('--float') + px('--chrome-stuck')
    const occupied = stuck > 0 ? stuck : (head ? head.getBoundingClientRect().height : 0)
    for (const a of document.querySelectorAll('a[href^="#"]')) {
      const raw = (a.getAttribute('href') || '').slice(1)
      if (!raw) continue
      let id = raw
      try { id = decodeURIComponent(raw) } catch { /* кривой хэш — имя как есть */ }
      const key = `k:${id}`
      if (seen.has(key)) continue
      const target = document.getElementById(id)
      if (!target) {
        seen.add(key)
        out.anchor.push(`#${id} — цели с таким именем на странице нет`)
        continue
      }
      if (!occupied) continue
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
      if (margin + 1 >= occupied) continue
      seen.add(key)
      out.anchor.push(`#${id} — отступ ${Math.round(margin)} при занятом верхе ${Math.round(occupied)}`)
    }
  }

  /* Заголовок страницы, наехавший на шапку.
   *
   * Верхний воздух страницы приходит от цепочки крошек — у неё поле сверху и
   * снизу, — и это работает, пока цепочка есть. Страница без неё начинается
   * вплотную, и заголовок уезжает под приклеенную шапку: замерено на
   * странице набора, 116 против 126 у низа шапки. В файлах не видно ничем:
   * у страницы всё на месте, просто у неё нет того, что даёт воздух соседям.
   *
   * Меряется в покое, на нулевой прокрутке: h1 обязан начинаться ниже низа
   * шапки. Это не про «красиво», а про то, что первую строку страницы
   * не видно. */
  {
    const head = document.querySelector('header')
    const h1 = document.querySelector('h1')
    if (head && h1 && scrollY < 2) {
      const hb = head.getBoundingClientRect().bottom
      const tb = h1.getBoundingClientRect().top
      if (shown(h1) && tb < hb - 1) {
        out.covered.push(`${name(h1)} — верх ${Math.round(tb)} при низе шапки ${Math.round(hb)}`)
      }
    }
  }

  /* Маркеры у списка, который не список. `<ol>` крошек, `<ul>` меню, ряд
     плиток — все они списки по разметке (и правильно: скринридер считает
     пункты), но ни один не набирается «1. 2. 3.» и точками. Браузер же
     ставит маркер каждому `display:list-item`, если ему не сказали иначе —
     и цепочка крошек вышла на витрину с «1.» перед домом, а «2.» и «3.»
     легли поверх соседних слов: маркер рисуется СНАРУЖИ своей плитки.
     Заказчик увидел это глазом. Меряется по первому пункту: маркер есть,
     когда пункт остался `list-item` и тип маркера не `none`. Список
     внутри навигации, шапки, подвала или выстроенный в ряд (flex/grid) —
     не набор пунктов, и маркеров у него не бывает. Список в тексте статьи
     остаётся списком: его здесь не трогают. */
  for (const list of document.querySelectorAll('ol, ul')) {
    if (!shown(list)) continue
    const li = list.querySelector(':scope > li')
    if (!li) continue
    const lcs = getComputedStyle(li)
    if (lcs.display !== 'list-item' || lcs.listStyleType === 'none') continue
    const laid = /flex|grid/.test(getComputedStyle(list).display)
    const chrome = list.closest('nav, header, footer')
    if (!laid && !chrome) continue
    const key = `marker:${name(list)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.marker.push(`${name(list)} — маркеры «${lcs.listStyleType}» у ${laid ? 'ряда' : 'навигации'}: список без list-style:none`)
  }

  /* Контур поверх силуэта. Путь, у которого разом и заливка, и обводка, —
     это правило обводки, написанное под прежний, линейный набор знаков и
     пережившее его: силуэт получает свой же контур в полтора пикселя,
     самолётик Telegram становится кляксой, трубка WhatsApp — двойной.
     Дважды за проект, оба раза глазом заказчика: ряд соцсетей, потом
     колонка контактов. Меряется ВЫЧИСЛЕННЫЙ стиль, а не атрибут: `stroke`
     хозяина перебивает `stroke="none"` на самом знаке. Ловится и обратное —
     линейный знак, которому хозяин забыл снять заливку: путь без своей
     заливки чёрный по умолчанию, и обводка ложится на чёрное пятно.

     Обводка, объявленная АТРИБУТОМ на самом пути или на его `svg`, —
     намеренная: так нарисована черта под знаком сайта (`stroke` на пути
     без площади). Дефект — обводка, пришедшая из стиля хозяина. */
  for (const el of document.querySelectorAll('svg :is(path,circle,rect,ellipse,polygon)')) {
    const cs = getComputedStyle(el)
    if (cs.fill === 'none' || cs.stroke === 'none' || !(parseFloat(cs.strokeWidth) > 0)) continue
    const svg = el.closest('svg')
    if (!svg || !shown(svg)) continue
    if (el.hasAttribute('stroke') || svg.hasAttribute('stroke')) continue
    const host = svg.parentElement || svg
    const label = svg.getAttribute('aria-label') || 'знак'
    const key = `outline:${name(host)}:${label}`
    if (seen.has(key)) continue
    seen.add(key)
    out.outline.push(`${name(host)} — ${label}: заливка и обводка на одном пути`)
  }

  /* Знак покрашен не тем, чем слово. Знак, объявленный «по краске»
     (`stroke:currentColor`), обязан прийти В ТОМ ЖЕ цвете, что и слово рядом:
     кнопка со знаком — один предмет, а не строка с картинкой.
     Ломается это НЕ в контроле. Блок страницы красит свои подписи по ТЕГУ
     (`.voice span{color:var(--sage-11)}`), правило достаёт до знака внутри
     взятой кнопки — и у слова остаётся белое, у знака становится
     серо-зелёное. В файлах кнопки при этом написано `currentColor`: чтением
     дефекта не видно вовсе, видно только отрисованным.
     Заказчик нашёл это глазом на листе набора — «иконка корзины не цвета
     текста»: на тёмной пилюле знак читался грязным пятном.
     Не считается тремя видами знаков, у которых свой цвет ЗАКОННЫЙ: чужая
     марка (цвет атрибутом — Visa, Mastercard), знак со своим полом
     (значок-плашка с заливкой) и знак, которому цвет назначен нарочно —
     у такого отрисованный штрих не равен своей же краске. */
  for (const ctrl of document.querySelectorAll('button, summary, a[href], [role="button"]')) {
    if (!shown(ctrl)) continue
    /* Только орган, который рисует СЕБЯ: пилюля с заливкой или с кромкой.
       Там знак и слово — одна надпись на одном полу, и краска у них общая.
       Строка, которая раскрывается (вопрос в списке вопросов), себя не
       рисует — поверхность под ней чужая, а её галочка это МАРКЕР, ей тише
       слова положено. Без этого условия проверка нашла восемьдесят один
       «дефект», из которых восемьдесят были выбранной заказчиком одеждой
       списка вопросов. */
    const ccs = getComputedStyle(ctrl)
    const skin = alpha(ccs.backgroundColor) > 0.05 || (ccs.boxShadow && ccs.boxShadow !== 'none')
    if (!skin) continue
    /* Краска слова — у того, кто слово держит: подпись может красить себя
       сама, и сравнивать надо с ней, а не с контролом. */
    let word = null
    const walk = document.createTreeWalker(ctrl, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim()) continue
      const host = n.parentElement
      if (!host || host.closest('svg') || !shown(host)) continue
      word = host; break
    }
    if (!word) continue
    const ink = rgb(getComputedStyle(word).color)
    if (!ink) continue
    for (const svg of ctrl.querySelectorAll('svg')) {
      if (!shown(svg)) continue
      /* Чужая марка: цвет объявлен атрибутом на самом рисунке. */
      const own = [svg, ...svg.querySelectorAll('*')].some((e) =>
        ['fill', 'stroke'].some((a) => {
          const v = e.getAttribute(a)
          return v && v !== 'none' && v !== 'currentColor'
        }))
      if (own) continue
      const box = svg.parentElement
      /* Знак-плашка: у него свой пол, и краска на нём своя по делу. */
      if (box && alpha(getComputedStyle(box).backgroundColor) > 0.05) continue
      if (alpha(getComputedStyle(svg).backgroundColor) > 0.05) continue
      const scs = getComputedStyle(svg)
      const mine = rgb(scs.color)
      const paint = rgb(scs.stroke === 'none' ? scs.fill : scs.stroke)
      if (!mine || !paint) continue
      /* Цвет назначен нарочно — знак не обещал идти за краской. */
      const off = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
      if (off(paint, mine) > 8) continue
      if (off(mine, ink) <= 8) continue
      const label = svg.getAttribute('aria-label') || 'знак'
      const key = `markInk:${name(ctrl)}:${label}`
      if (seen.has(key)) continue
      seen.add(key)
      out.markInk.push(`${name(ctrl)} — ${label} нарисован rgb(${mine.map(Math.round)}), ` +
        `а слово «${word.textContent.trim().slice(0, 24)}» rgb(${ink.map(Math.round)})`)
    }
  }

  return out
}

const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE
  ? { executablePath: process.env.BROWSER_EXECUTABLE }
  : {})
/* Две среды, а не одна ширина. Узкое окно — это ещё не телефон: у телефона
   нет курсора, и `(pointer: coarse)` — единственный честный признак пальца.
   Вёрстка, которая растит цель нажатия под палец, обязана растить её именно
   по этому признаку, а не по ширине: планшет с мышью шире телефона, а
   ноутбук с сенсорным экраном — шире обоих. Проверка, эмулирующая только
   ширину, такую вёрстку не увидела бы и потребовала бы вернуть брейкпоинт. */
const desk = await browser.newContext()
/* Плотность экрана здесь единица, а не двойка. Палец эмулируется `hasTouch`,
   а удвоенная плотность только раздувает снимок страницы вчетверо: на
   телефоне это 780 на семнадцать тысяч пикселей, и проверка из двадцати
   секунд превращалась в пять минут. Мерить контраст двойная плотность не
   помогает — цвет тот же. */
const hand = await browser.newContext({ hasTouch: true, isMobile: true, deviceScaleFactor: 1 })
/* Тема — тоже свойство контекста, и второй темы у проверки не было вовсе.
   Весь цвет объявлен через `light-dark()`: половина его не мерилась ничем.
   Соседний магазин заплатил за это подписями плиток — фон из палитры, текст
   из роли темы: в светлой всё верно, в тёмной 1.12 при норме 4.5, то есть
   слов не видно совсем. Пара выглядит правильной в той теме, в которой её
   написали, и пропадает в соседней. */
const deskDark = await browser.newContext({ colorScheme: 'dark' })
const handDark = await browser.newContext({ colorScheme: 'dark', hasTouch: true, isMobile: true, deviceScaleFactor: 1 })
/* Cookie из CRAFT_COOKIE — каждой среде проверки, включая «поменьше
   движения» ниже (`jar`). */
const JAR = (process.env.CRAFT_COOKIE ?? '').split(';').map((x) => x.trim()).filter(Boolean)
  .map((pair) => ({ name: pair.slice(0, pair.indexOf('=')), value: pair.slice(pair.indexOf('=') + 1), url: BASE }))
const jar = async (ctx) => { if (JAR.length) await ctx.addCookies(JAR); return ctx }
for (const ctx of [desk, hand, deskDark, handDark]) await jar(ctx)
/* ── ПОЛОСЫ: почему проверка шла двадцать минут ────────────────────────────
 *
 * Заказчик сказал прямо: «пиздец как долго… два часа гонял проверку и стоит
 * работа». Он прав, и причина не в том, что меряется много, а в том, КАК.
 *
 * Проверка открывает около двухсот двадцати страниц и почти всё это время
 * ЖДЁТ: сети, шрифтов, конца анимаций. Ждала она по одной странице за раз,
 * одной вкладкой на весь прогон. Браузер при этом простаивал.
 *
 * Ждать можно вчетвером. Полосы — это число страниц, открытых одновременно;
 * измерения от этого не меняются ни на пиксель, потому что каждая страница
 * меряется сама по себе и ни одна не смотрит на соседнюю. Меняется только то,
 * сколько браузер простаивает.
 *
 * Число полос — ручка, а не догма: на слабой машине его убавляют
 * (`CRAFT_LANES=2`), на сильной прибавляют. Четыре — то, при чём прогон
 * упирается уже не в ожидание, а в саму отрисовку.
 *
 * Порядок находок от этого перестаёт быть порядком обхода, поэтому перед
 * печатью каждая семья сортируется: два прогона одного дерева обязаны давать
 * один отчёт, иначе его нельзя сравнить с прошлым. */
const LANES = Math.max(1, Number(process.env.CRAFT_LANES ?? 4))
/* Сервер умер — кричит об этом одна полоса, а не все четыре. */
let dead = false

/* Страницы не создаются и не закрываются на каждый замер: создание вкладки
   стоит дороже самого замера. Отработавшая возвращается в стопку своей среды
   и достаётся следующему. */
const idle = new Map()
const take = async (ctx) => {
  const rest = idle.get(ctx)
  const kept = rest && rest.pop()
  return kept ?? await ctx.newPage()
}
const give = (ctx, p) => {
  const rest = idle.get(ctx) ?? []
  rest.push(p)
  idle.set(ctx, rest)
}

/** Пройти список в несколько полос, сохранив порядок САМОГО списка. */
async function lanes(items, work, n = LANES) {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      await work(items[i], i)
    }
  }))
}
const found = { lane: [], placeholder: [], measure: [], target: [], contrast: [], collision: [],
                weight: [], jump: [], name: [], heads: [], dress: [], clip: [],
                swipe: [], stretch: [], broken: [], spill: [], focus: [], wrap: [],
                anchor: [], outline: [], marker: [], sticky: [], theme: [], coarse: [], calm: [],
                inkDip: [], markInk: [],
                covered: [],
                ladder: [], wideCtrl: [], lopsided: [], sunk: [], stolen: [], field: [], alone: [], catalogueColumns: [], twoAir: [],
                twiceLift: [], sheetSize: [] }

/** Открыть страницу на ширине и померить.
 *
 *  `finger` — грубый указатель: телефон ИЛИ планшет с сенсором. Ширина
 *  решает раскладку, указатель решает размер цели — это два разных вопроса,
 *  и задавать второй через первый нельзя.
 *  `dark` — вторая тема. */
/** Остановить показ слайдов перед замером.
 *
 *  Заведено находкой, которая НЕ ПОВТОРИЛАСЬ: полный прогон показал контраст
 *  3.35 у подписи героя на 700, а узкий по той же странице и той же семье —
 *  ноль. Причина не в странице: кадры героя сами сменяются по таймеру, и
 *  замер иногда попадал В СЕРЕДИНУ ПЕРЕХОДА, когда на экране два снимка
 *  сразу и подпись лежит на их смеси. Все четыре снимка замерены по
 *  отдельности и держат 5.76:1 — мерилось не то, что видит покупатель.
 *
 *  Правило общее, не про этот слайдер: ЗАМЕР ИДЁТ ПО НЕПОДВИЖНОЙ СТРАНИЦЕ.
 *  Ожидание конца анимаций этого не даёт — таймер заводит следующую, и
 *  страница не бывает неподвижной никогда. Останавливаем тем же органом,
 *  которым останавливает человек: кнопкой паузы. Путь, который проверка
 *  проходит, — тот самый, что у покупателя.
 *
 *  Кнопки нет — ничего и не делаем: страниц без слайдера большинство. */
async function still(page) {
  await page.evaluate(() => {
    const b = document.querySelector('[data-ctl="run"]')
    if (!b) return
    const before = b.getAttribute('aria-label')
    b.click()
    /* Нажатие не сработало (кнопка уже на паузе) — второго не делаем: оно
       снова запустило бы показ. */
    if (b.getAttribute('aria-label') === before) b.click()
  }).catch(() => {})
}

/** Открыть адрес проверки. Сессию личной страницы несёт заголовок
 *  `Cookie` — страницы берутся из общей стопки, поэтому заголовок ставится
 *  каждый раз, и у страницы без сессии он пустой (И263). */
async function openAt(page, path, options) {
  const { path: clean, cookie } = sessionOf(path, SESSIONS.cookie)
  await page.setExtraHTTPHeaders(cookie ? { cookie } : {})
  return page.goto(BASE + clean, options)
}

async function visit(path, w, { finger, dark = false }) {
    const phone = finger
    /* Страница берётся из той среды, которую изображаем: сменить
       `hasTouch` или тему у живой страницы нельзя, это свойства контекста.
       Страница СВОЯ у каждого замера — берётся из стопки своей среды
       (`take`): общей вкладки нет, иначе полосы дёргали бы окно друг у
       друга. */
    const want = dark ? (finger ? handDark : deskDark) : (finger ? hand : desk)
    /* Своя страница на замер, из стопки своей среды. Общей вкладки больше
       нет: она и была тем, что заставляло прогон идти по одной странице. */
    const page = await take(want)
    try {
    await page.setViewportSize({ width: w, height: 900 })
    /* Сервер, УМЕРШИЙ в середине прогона, — не программная ошибка, а
       обстоятельство, и говорить о нём надо словами. Заведено по счёту:
       он падал дважды. В первый раз часть страниц померилась недогруженной
       и проверка показала находку, которой нет, — «контраст: было 0, стало
       1», не повторившуюся ни в одном следующем прогоне. Во второй —
       вывалила стек вызовов node посреди отчёта.
       Сторож «это вообще страница сайта?» у проверки был, а сторожа «сервер
       жив?» не было. */
    try {
      await openAt(page, path, { waitUntil: 'networkidle' })
    } catch (e) {
      /* Говорит об этом ПЕРВАЯ полоса и только она: страниц открыто
         несколько, и упавший сервер уронил бы их все — четыре одинаковых
         крика вместо одного сообщения. */
      if (!dead) {
        dead = true
        console.error(`\n✗ ${BASE}${path} не открылся: ${String(e.message).split('\n')[0]}
    Скорее всего сервер упал посреди прогона. Поднимите заново и повторите:
        npm run build:site && npm run serve`)
      }
      process.exit(1)
    }
    /* Замер делается после того, как ДОЕХАЛО.
       Кадр героя въезжает проявлением (`fadeIn .62s`), и подпись на нём
       в середине перехода лежит на полупрозрачной вуали: замер контраста
       ловил 1.17:1 там, где на остановившейся странице 4.8. Признак был
       тот же, что всегда, — находка гуляла между прогонами по страницам и
       ширинам. Ждём, пока кончатся все анимации, а не выдуманное число
       миллисекунд. */
    await still(page)
    await page.evaluate(() => Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    )).catch(() => {})
    await page.waitForTimeout(150)

    /* Кольцо фокуса рисуется по `:focus-visible`, а он у браузера зависит от
       того, ЧЕМ в последний раз пользовались: после мыши кольца нет и быть
       не должно — иначе оно вспыхивает на каждом нажатии. Одно нажатие Tab
       переводит страницу в «работают с клавиатуры», и дальше программный
       `focus()` кольцо получает ровно так же, как получил бы человек.
       Без этой строки семья `focus` показывала бы нарушением каждый орган
       на сайте — то есть мерила бы не то. */
    await page.keyboard.press('Tab')
    await page.evaluate(() => document.activeElement?.blur())

    /* Убедиться, что открылся САЙТ, а не что-то другое на том же порту.
       Дефект, из-за которого проверка заведена: на 8099 висел
       `python3 -m http.server`, который отдаёт листинг каталога и не знает,
       что `/product` это `product.html`. Три страницы из пяти не мерились
       вовсе — а проверка при этом рапортовала числа и была зелёной.
       Молчаливо неполный замер хуже отсутствующего: он выглядит как
       результат. */
    const real = await page.evaluate(() =>
      !!document.querySelector('header') && !!document.querySelector('main'))
    if (!real) {
      console.error(`\n✗ ${BASE}${path} — это не страница сайта.
    Скорее всего порт занят другим сервером или сайт не собран.
    Нужен статический сервер, умеющий чистые адреса:
        npm run build:site && npm run serve`)
      await browser.close()
      process.exit(1)
    }
    const r = await page.evaluate(measure, {
      phone,
      catalogue: LAYOUT.catalogue,
      target: TARGET,
      contrast: CONTRAST,
      vector: VECTOR.source,
    })

    /* ── приклеенное — в НИЗКОМ окне ───────────────────────────────────────
       Приклеенный блок выше окна нельзя увидеть целиком никогда: его низ
       показывается только когда кончится то, вдоль чего он едет. Галерея
       товара — квадрат с плитками — на ноутбуке уходила за край, и до плиток
       было не докрутиться, пока не кончится описание. Заказчик: «изображение
       и дополнительные не помещаются в экран — это же основная информация».
       Обычный замер идёт в 900 по высоте, где всё помещается; поэтому окно
       здесь на время сжимается до ноутбучного и возвращается назад — второй
       проход по дну снимает страницу по координатам окна и ждёт прежних 900.
       Только в светлой теме: от темы высота не зависит. */
    if (!dark) {
      await page.setViewportSize({ width: w, height: SHORT_H })
      r.sticky = await page.evaluate(() => {
        const out = []
        const name = (el) => {
          const cls = (el.className || '').toString().split(/\s+/)[0] || ''
          const txt = (el.textContent || '').trim().slice(0, 24)
          return `${el.tagName.toLowerCase()}${cls ? '.' + cls.split('__').pop() : ''}${txt ? ` «${txt}»` : ''}`
        }
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el)
          if (cs.position !== 'sticky') continue
          const b = el.getBoundingClientRect()
          if (!b.height || cs.display === 'none') continue
          const top = parseFloat(cs.top) || 0
          /* Потолок коробки (`pinned`) не прячет того, что из неё вылезло:
             галерея выше своего потолка переливалась вниз при коробке ровно
             в окно (И278). Прокручиваемое внутри — не перелив: его досмотрят. */
          const h = Math.max(b.height, cs.overflowY === 'visible' ? el.scrollHeight : 0)
          if (top + h > innerHeight + 1) {
            out.push(`${name(el)} — ${Math.round(h)}px при верхе ${Math.round(top)}: в окне ${innerHeight} приклеенное не помещается`)
          }
        }
        return out
      })
      await page.setViewportSize({ width: w, height: 900 })
    }

    /* ── второй проход: дно, которое не прочитать стилями ──────────────────
       Подпись на фотографии лежит на вуали, вуаль задана градиентом, то есть
       картинкой. Ни один обход предков про её цвет ничего не скажет. Поэтому
       у таких строк дно снимается с экрана: буквы делаются прозрачными,
       страница снимается целиком, и под каждой строкой берётся средний цвет
       того, что осталось. Это ровно то, что видит глаз.

       Прозрачным делается `color`, а не `visibility`: фон, тень и вуаль
       должны остаться на месте — снимаем именно их. */
    if (r.dark.length) {
      /* Дно снимается по координатам ОКНА, а не документа.
       *
       * Полностраничный снимок и `getBoundingClientRect() + scrollY` — не
       * одно и то же: на телефоне Chromium снимает страницу иначе, чем
       * держит её на экране, и координаты расходятся. Проверено выемкой
       * куска: под подписью поста инстаграма оказывался нижний край тёмной
       * полосы страницей ниже, и подпись «получала» 3.85:1 от чужого места.
       * Четыре переделки вуали на этот замер не влияли никак — верный
       * признак, что мерилось не то.
       *
       * Поэтому: подвести элемент к экрану, снять кусок по координатам окна,
       * взять средний цвет. Снимков больше, но каждый — крошечный, и они
       * дешевле одного полностраничного. */
      await page.evaluate(async () => {
        for (const i of document.images) i.loading = 'eager'
        await Promise.all([...document.images].map((i) => i.decode().catch(() => {})))
      })
      /* Контраст — свойство страницы В ПОКОЕ, а не посреди перехода.
       *
       * Кадр героя идёт сам и меняется наплывом: полсекунды входящий снимок
       * лежит на уходящем, и вуаль над ним тоже прозрачна наполовину. Замер,
       * попавший в эти полсекунды, показал 2.26:1 там, где в покое 12.95 —
       * и показывал разное от прогона к прогону, потому что кадр к моменту
       * замера успевал разный. Проверка, гуляющая между прогонами, хуже
       * отсутствующей: её перестают читать.
       *
       * Снять переход — значит доиграть его мгновенно: свойство без
       * `transition` принимает конечное значение сразу. Страница оказывается
       * там, где она и окажется через полсекунды. Движение при этом никуда
       * не девается из проверки — за него отвечает своя семья на своём
       * проходе. */
      /* ПРОКРУТКА ТОЖЕ СНИМАЕТСЯ, и без этого всё остальное напрасно.
       *
       * У сайта `html{scroll-behavior:smooth}`, а замер подводит элемент к
       * середине экрана и тут же читает его прямоугольник. При плавной
       * прокрутке страница в этот миг ещё НЕ ДОЕХАЛА: координаты берутся
       * старые, кадр снимается по ним уже после — и попадает мимо, на
       * соседний кусок страницы. Белая подпись героя оказывалась «на листе
       * страницы»: 1.26:1 там, где в покое 9.8.
       *
       * Признак тот же, что у всякой такой поломки: находка гуляла между
       * прогонами и по ширинам — потому что расстояние прокрутки каждый раз
       * своё. Снятая анимация тут не помогала: плавность прокрутки — не
       * анимация, а отдельное свойство. */
      await page.addStyleTag({ content:
        '*,*::before,*::after{transition:none !important;animation:none !important}'
        + 'html{scroll-behavior:auto !important}' })
      const dedupe = new Set()
      for (const d of r.dark) {
        const box = await page.evaluate(({ i }) => {
          const el = window.__dark[i]
          el.scrollIntoView({ block: 'center', behavior: 'instant' })
          /* буквы прозрачны, плавающие слои сняты: под текстом должно
             остаться ровно то, на чём он лежит */
          window.__was = el.style.color
          el.style.color = 'transparent'
          /* Снимаются ЧУЖИЕ плавающие слои, а не тот, в котором текст лежит
             сам: кнопка «Apply filters» в приклеенной колонке фильтров
             пряталась вместе с колонкой, и под «её» буквами снимался пол
             страницы — белое по бежевому, 1.31 : 1, при кнопке, залитой
             маркой (замер 24.09.2026, глаз с ним не сошёлся). */
          window.__hid = [...document.querySelectorAll('*')]
            .filter((e) => { const p = getComputedStyle(e).position; return (p === 'fixed' || p === 'sticky') && !e.contains(el) })
          window.__hidWas = window.__hid.map((e) => e.style.visibility)
          window.__hid.forEach((e) => { e.style.visibility = 'hidden' })
          const b = el.getBoundingClientRect()
          return { x: b.left, y: b.top, w: b.width, h: b.height,
                   vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio }
        }, { i: d.i })

        let got = null
        let bare = [0, 0, 0]
        const left = Math.max(0, Math.round(box.x))
        const top = Math.max(0, Math.round(box.y))
        const width = Math.min(Math.round(box.w), box.vw - left)
        const height = Math.min(Math.round(box.h), box.vh - top)
        if (width >= 2 && height >= 2) {
          const shot = await page.screenshot({ clip: { x: left, y: top, width, height } })
          const px = await sharp(shot).resize(1, 1, { fit: 'fill' }).removeAlpha().raw().toBuffer()
          bare = [px[0], px[1], px[2]]
          got = pairOf(d.fg, bare)
        }

        await page.evaluate(({ i }) => {
          window.__dark[i].style.color = window.__was
          window.__hid.forEach((e, k) => { e.style.visibility = window.__hidWas[k] })
        }, { i: d.i })

        /* НАХОДКА ПРОВЕРЯЕТСЯ ВТОРЫМ СНИМКОМ, и это не перестраховка.
         *
         * Дно снимается с буквами, покрашенными в прозрачное. Если на том же
         * месте нарисовано что-то ЧУЖОЕ — соседний слайд карусели, вставший
         * поверх, — снимется чужой снимок, и белая подпись на нём выйдет
         * нечитаемой. Заголовок героя так и гулял: 10.15:1 в покое, 2.44:1 в
         * прогоне, где карусель успела переключиться.
         *
         * Способ отличить одно от другого ровно один: посмотреть, ВИДНО ЛИ
         * сами буквы. Второй снимок того же места с буквами на месте — если
         * он не отличается от первого, текст там не нарисован, значит его
         * чем-то накрыли, и мерили мы не его дно.
         *
         * Второй снимок делается ТОЛЬКО под находку: их единицы, а замеров
         * сотни. */
        if (got !== null && got < d.need && width >= 2 && height >= 2) {
          const seen = await page.screenshot({ clip: { x: left, y: top, width, height } })
          const sp = await sharp(seen).resize(1, 1, { fit: 'fill' }).removeAlpha().raw().toBuffer()
          const moved = Math.max(Math.abs(sp[0] - bare[0]), Math.abs(sp[1] - bare[1]),
                                 Math.abs(sp[2] - bare[2]))
          if (moved < 2) got = null
        }

        if (got !== null && got < d.need) {
          const key = `${d.label}|${Math.round(got * 100)}`
          if (!dedupe.has(key)) {
            dedupe.add(key)
            r.contrast.push(`${d.label} — ${got.toFixed(2)}:1 при ${d.need}`)
          }
        }
      }
    }
    delete r.dark
    return r
    } finally { give(want, page) }
}

/** Заглушки: текст → адреса, где он встретился.
 *
 *  Считается ФАКТ, а не его показы. `[COMPANY]` в подвале — это один
 *  незаполненный реквизит, и он не становится хуже оттого, что подвал стоит
 *  на каждой странице: заведи страницу «Контакты» — счётчик вырос, хотя не
 *  изменилось ничего. Это заметил заказчик, и он прав: число, которое
 *  растёт от числа страниц, не измеряет долг.
 *
 *  Поэтому имя заглушки — ключ, а адреса — то, что про неё рассказывают.
 *  Заполнили реквизит — счётчик упал ровно на единицу, на скольких бы
 *  страницах он ни стоял. */
const holders = new Map()

/** Разложить находки по семьям. */
const keep = (path, w, r) => {
  for (const k of Object.keys(r)) {
    for (const line of r[k]) {
      if (k === 'placeholder') {
        const where = holders.get(line) ?? new Set()
        where.add(path)
        holders.set(line, where)
        continue
      }
      /* Остальные семьи от ширины зависят, и там повтор законен: контраст и
         цель нажатия на 390 и на 1440 — два разных факта. */
      found[k].push(`${path} @${w}  ${line}`)
    }
  }
}

const native = PAGES.filter(isNative)

/* ── проход первый: как есть, все страницы и оба языка ─────────────────── */
const shots = PAGES.flatMap((path) =>
  (isNative(path) ? WIDTHS : WIDTHS_ALT).map((w) => ({ path, w })))
await lanes(shots, async ({ path, w }) => {
  keep(path, w, await visit(path, w, { finger: w < PHONE }))
})

/* ── проход второй: тёмная тема ────────────────────────────────────────────
   Только контраст и только на одном языке: цвет от языка не зависит, а
   раскладка уже померена первым проходом. Семья своя, а не общая с дневным
   контрастом: иначе в базе не отличить «в тёмной стало хуже» от «стало хуже
   вообще», а чинятся эти два по-разному. */
await lanes(
  native.flatMap((path) => DARK_WIDTHS.map((w) => ({ path, w }))),
  async ({ path, w }) => {
    const r = await visit(path, w, { finger: w < PHONE, dark: true })
    for (const line of r.contrast) found.theme.push(`${path} @${w} тёмная  ${line}`)
  })

/* ── проход третий: палец на широком окне ──────────────────────────────────
   Планшет в альбоме отдаёт 1024 CSS-пикселя. По ширине это десктоп — и
   вёрстка, растящая цель нажатия по `max-width`, отдаёт ему курсорный
   размер. Но палец у него остался пальцем: на входе палец, в разметке
   курсор. Правило «44 пикселя» пишется в `@media (pointer: coarse)`, ровно
   как `:hover` пишется в `@media (hover: hover)`. */
await lanes(
  native.flatMap((path) => COARSE_WIDTHS.map((w) => ({ path, w }))),
  async ({ path, w }) => {
    const r = await visit(path, w, { finger: true })
    for (const line of r.target) found.coarse.push(`${path} @${w} палец  ${line}`)
  })

/* ── проход четвёртый: «поменьше движения» ─────────────────────────────────
 *
 * В системе есть выключатель: «уменьшить движение». Его ставят не из вкуса —
 * от движения на экране людей укачивает, буквально, до тошноты и
 * головокружения. Сайт обязан его слушать.
 *
 * Сброс в `styles/base.css` гасит анимации и переходы всем подряд, и в
 * файлах это выглядит исчерпывающе. Но сброс — это CSS, и мимо него
 * проходит всё, что заведено иначе: движение, запущенное скриптом
 * (`element.animate()`), переход, вписанный в разметку атрибутом, и плавная
 * прокрутка, назначенная не стилем. Ровно так тут уже и было: плавная
 * прокрутка переживала сброс, потому что прокрутка — не анимация и не
 * переход; чинилось это `lib/motion.ts`.
 *
 * Поэтому спрашивается не файл, а СТРАНИЦА, поднятая с включённой
 * настройкой: что на ней всё ещё движется дольше десятой доли секунды.
 *
 * Одна ширина и родные страницы: движение от языка не зависит, а от ширины
 * зависит редко — и там, где зависит, это тот же самый сброс. */
const calm = await jar(await browser.newContext({ reducedMotion: 'reduce' }))
await lanes(native, async (path) => {
  {
    const page = await take(calm)
    try {
    await page.setViewportSize({ width: 1200, height: 900 })
    await openAt(page, path, { waitUntil: 'networkidle' })
    const lines = await page.evaluate(() => {
      const out = []
      const name = (el) => {
        if (!el || !el.tagName) return '?'
        const cls = (el.className || '').toString().trim().split(/\s+/)[0]
        return el.tagName.toLowerCase() + (cls ? `.${cls}` : '')
      }
      const shown = (el) => {
        if (!el || !el.getBoundingClientRect) return false
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') return false
        const b = el.getBoundingClientRect()
        return b.width > 1 && b.height > 1
      }
      /* Длительность берётся объявленная, а не оставшаяся: спрашиваем, на
         сколько движение заведено, а не сколько ему осталось бежать. */
      for (const a of document.getAnimations()) {
        const d = a.effect?.getTiming?.().duration
        const ms = typeof d === 'number' ? d : 0
        if (ms <= 100) continue
        out.push(`${name(a.effect?.target)} — движение на ${Math.round(ms)}мс`)
      }
      const moves = /transform|opacity|all|left|top|right|bottom|width|height|inset|translate|scale|rotate/
      for (const el of document.querySelectorAll('body *')) {
        if (!shown(el)) continue
        const cs = getComputedStyle(el)
        if (!moves.test(cs.transitionProperty)) continue
        const longest = Math.max(...cs.transitionDuration.split(',').map((v) => parseFloat(v) || 0))
        if (longest <= 0.1) continue
        out.push(`${name(el)} — переход на ${longest}с`)
      }
      if (getComputedStyle(document.documentElement).scrollBehavior === 'smooth') {
        out.push('вся страница прокручивается плавно')
      }
      return out
    })
    for (const line of new Set(lines)) found.calm.push(`${path}  ${line}`)
    } finally { give(calm, page) }
  }
})

/* ── проход пятый: контраст ПО ХОДУ перехода ───────────────────────────────
 *
 * Все прочие замеры цвета берут страницу ОСТАНОВИВШЕЙСЯ: в покое и под рукой.
 * Между этими двумя точками проверки не смотрел никто — а дефект живёт именно
 * там.
 *
 * Заведено дефектом, который заказчик увидел глазом: «при наведении заливка
 * меняется сразу, текст в ней меняет цвет через полсекунды, поэтому текст как
 * бы мигает». Оба конца были безупречны — 16.3:1 в покое, 12.3:1 под рукой, —
 * и обе стоящие проверки молчали. А на 85-й миллисекунде контраст
 * проваливался до 1.08:1: слово на пару кадров становилось неотличимо от
 * фона.
 *
 * Причина общая, не про одну кнопку. Если поверхность едет к тёмному, а
 * краска на ней — к светлому, они ОБЯЗАНЫ пересечься, и в точке пересечения
 * серое лежит на сером. Развести их по времени нельзя: замер показал, что
 * провал только сдвигается, а на обратном ходу появляется второй. Лечится
 * тем, что у переворота нет середины — пара переключается разом.
 *
 * Мерится так: указатель наводится по-настоящему (CSS `:hover` синтетическим
 * событием не включается — на этом я соврал первым замером), и кадры снимаются
 * через `requestAnimationFrame` по обе стороны — на вход и на обратный ход.
 * Цвет разрешает CANVAS, а не разбор строки: браузер отдаёт `color(srgb 0..1)`
 * и `oklab()`, а ручной разбор путает их с `rgb(0..255)` — на этом я соврал
 * вторым замером и получил 1:1 там, где 12:1.
 *
 * Родов контрола, а не всех органов: дефект живёт в правиле, а не в копии.
 * Поэтому органы группируются по подписи (`data-skin` плюс класс), и из каждой
 * группы берётся один. Иначе проход по восьмидесяти кнопкам главной стоил бы
 * минуту и мерил бы одно и то же.
 *
 * Порог 3:1 — не из таблицы доступности, а из замера: глаз ловит именно
 * пропажу слова, и пропажа начинается там, где контраст уходит ниже трёх.
 * Провалом считается только то, что ниже ОБОИХ концов: контрол, который под
 * рукой честно становится тише, — это решение, а не дефект. */
const DIP_W = 1200
const DIP_MIN = 3
await lanes(
  native.flatMap((path) => [false, true].map((dark) => ({ path, dark }))),
  async ({ path, dark }) => {
  {
    const ctx = dark ? deskDark : desk
    const page = await take(ctx)
    try {
    await page.setViewportSize({ width: DIP_W, height: 900 })
    try { await openAt(page, path, { waitUntil: 'networkidle' }) } catch { return }
    await still(page)
    await page.evaluate(() => Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})))).catch(() => {})
    await page.waitForTimeout(120)

    /* Один орган на род: подпись собирается из `data-skin` и первого класса. */
    const kinds = await page.evaluate(() => {
      /* КТО НА ЭТОЙ СТРАНИЦЕ ПОДНИМАЕТСЯ ПОД РУКОЙ — спрошено у самих таблиц
         стилей: правило, у которого в селекторе `:hover`, а в объявлении
         сдвиг на `--rise`. Селектор берётся без псевдокласса — получается
         «кто это вообще такой». */
      const lift = []
      const walk = (rules) => {
        for (const r of rules) {
          if (r.cssRules) { walk(r.cssRules); continue }
          if (!r.selectorText || !/:hover/.test(r.selectorText)) continue
          const d = `${r.style?.transform ?? ''} ${r.style?.translate ?? ''}`
          if (!/rise/.test(d)) continue
          for (const one of r.selectorText.split(',')) {
            const bare = one.replace(/:hover|:active|:focus-visible/g, '').trim()
            if (bare) lift.push(bare)
          }
        }
      }
      for (const sheet of document.styleSheets) {
        try { walk(sheet.cssRules) } catch { /* чужая таблица — не наша забота */ }
      }
      const LIFTERS = [...new Set(lift)].join(',') || ':not(*)'

      const seen = new Map()
      for (const el of document.querySelectorAll('a, button, summary, [role="button"]')) {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        const b = el.getBoundingClientRect()
        if (b.width < 8 || b.height < 8) continue
        if (!/transition|all/.test(cs.transitionProperty) && cs.transitionDuration === '0s') continue
        const cls = (el.className || '').toString().split(/\s+/)[0] || ''
        /* В подпись рода входит и ТО, НА ЧЁМ орган стоит, — но только если оно
           САМО поднимается под рукой. Без этого «кнопка со словом» была одним
           родом на всю страницу, из рода брался один образец, и та же кнопка
           внутри плавающей карточки не проверялась ни разу: её подпись уже
           была занята кнопкой из лотка фильтров.

           Список плавающих собран из таблиц стилей (`LIFTERS` ниже), а не из
           «у предка есть переход на transform»: по второму признаку в род
           попадала обёртка снимка, которая никуда не едет, и родов
           становилось в полтора раза больше — а это полторы цены самого
           дорогого прохода проверки. */
        const host = el.parentElement?.closest(LIFTERS)
        const on = host ? ((host.className || '').toString().split(/\s+/)[0] || host.tagName) : 'none'
        const sig = `${el.tagName.toLowerCase()}|${el.getAttribute('data-skin') ?? ''}|${cls}|${on}`
        if (seen.has(sig)) continue
        el.setAttribute('data-dip-probe', String(seen.size))
        seen.set(sig, `${el.tagName.toLowerCase()}${cls ? '.' + cls.split('__').pop() : ''}${el.getAttribute('data-skin') ? `[${el.getAttribute('data-skin')}]` : ''}`)
      }
      return [...seen.values()]
    })

    for (let i = 0; i < kinds.length; i++) {
      const el = page.locator(`[data-dip-probe="${i}"]`).first()
      let box
      try { box = await el.boundingBox({ timeout: 800 }) } catch { continue }
      if (!box) continue
      const grab = () => el.evaluate((node) => new Promise((done) => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 1
        const cx = cv.getContext('2d', { willReadFrequently: true })
        const rgba = (css) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = css
          cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data
          return [d[0], d[1], d[2], d[3] / 255] }
        const lum = ([r, g, b]) => { const f = (c) => { c /= 255
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
        /* Под фон подкладывается ПОЛ, на котором орган стоит: у полупрозрачной
           заливки контраст считается по тому, что видно, а не по её альфе. */
        const floor = (() => { let n = node.parentElement
          while (n) { const c = getComputedStyle(n).backgroundColor
            const v = rgba(c); if (v[3] > 0.99) return v; n = n.parentElement }
          return [255, 255, 255, 1] })()
        const over = ([r, g, b, a], u) => [r * a + u[0] * (1 - a), g * a + u[1] * (1 - a), b * a + u[2] * (1 - a)]
        const shot = () => { const cs = getComputedStyle(node)
          const w = [...node.querySelectorAll('*')].find((k) => (k.textContent || '').trim())
          const bg = over(rgba(cs.backgroundColor), floor)
          const fg = over(rgba(w ? getComputedStyle(w).color : cs.color), bg)
          const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x)
          return (hi + 0.05) / (lo + 0.05) }
        const out = []; const t0 = performance.now()
        const tick = () => { out.push(shot())
          if (performance.now() - t0 < 520) requestAnimationFrame(tick); else done(out) }
        requestAnimationFrame(tick)
      }))
      /* Сколько СМЕЩЁН по вертикали сам орган и каждый его предок. Числа
         берутся из вычисленного стиля, а не из положения на экране: место на
         экране зависит ещё и от прокрутки, а сдвиг — нет. Читаются обе
         записи, `translate` и `transform`: кнопка двигается первой, карточка
         второй.

         Предки берутся ВСЕ до `main`, а не первый попавшийся с переходом:
         первой попыткой я брал ближайшего, кто умеет двигаться, — и попадал
         в обёртку снимка, которая как раз не двигается. Проверка показала
         ноль там, где глаз видел рывок. */
      const shift = () => el.evaluate((node) => {
        const move = (n) => {
          const cs = getComputedStyle(n)
          let y = 0
          if (cs.translate && cs.translate !== 'none') {
            y += parseFloat(cs.translate.split(/\s+/)[1] ?? '0') || 0
          }
          const m = /matrix\(([^)]+)\)/.exec(cs.transform)
          if (m) y += parseFloat(m[1].split(',')[5]) || 0
          const m3 = /matrix3d\(([^)]+)\)/.exec(cs.transform)
          if (m3) y += parseFloat(m3[1].split(',')[13]) || 0
          return y
        }
        const ups = []
        for (let n = node.parentElement; n && n !== document.body; n = n.parentElement) {
          const cls = (n.className || '').toString().split(/\s+/)[0] || ''
          ups.push({ y: move(n), name: `${n.tagName.toLowerCase()}${cls ? '.' + cls.split('__').pop() : ''}` })
        }
        return { self: move(node), ups }
      })

      await page.mouse.move(2, 2); await page.waitForTimeout(240)
      const rest = await shift().catch(() => null)
      const inP = grab(); await page.waitForTimeout(30)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      let frIn = []; try { frIn = await inP } catch { continue }

      /* ДВОЙНОЙ ПОДЪЁМ. Рука одна — предмет, который она подняла, тоже один:
         самый внешний. Когда поднимаются оба, орган ПОЛЗЁТ по тому, на чём
         стоит, и глаз читает это как рывок, а не как ответ.

         Заказчик нашёл это на сердце «в избранное»: «она поднимается при
         наведении, нахуя она прыгает». Замер показал карточку на 2 пикселя и
         сердце на 4 — сердце уезжало по фотографии под ним.

         В файлах признака нет вовсе: оба подъёма написаны верно и каждый в
         своём месте: один у карточки, другой — общий у кнопки со словом.
         Складываются они только на странице. */
      const on = await shift().catch(() => null)
      if (rest && on && rest.ups.length === on.ups.length) {
        const mine = Math.abs(on.self - rest.self)
        const k = on.ups.findIndex((u, n) => Math.abs(u.y - rest.ups[n].y) >= 1)
        if (mine >= 1 && k >= 0) {
          const under = Math.abs(on.ups[k].y - rest.ups[k].y)
          found.twiceLift.push(
            `${path}${dark ? ' тёмная' : ''}  ${kinds[i]} на ${on.ups[k].name} — `
            + `поднялись оба: ${under.toFixed(1)}px пол и ещё ${mine.toFixed(1)}px орган`)
        }
      }
      const outP = grab(); await page.waitForTimeout(30)
      await page.mouse.move(2, 2)
      let frOut = []; try { frOut = await outP } catch { continue }

      for (const [dir, fr] of [['наведение', frIn], ['уход', frOut]]) {
        if (fr.length < 4) continue
        const ends = Math.min(fr[0], fr.at(-1))
        const low = Math.min(...fr)
        if (low < DIP_MIN && low < ends - 0.4) {
          found.inkDip.push(`${path}${dark ? ' тёмная' : ''}  ${kinds[i]} — на ${dir} контраст проваливается до ${low.toFixed(2)}:1 (концы ${fr[0].toFixed(1)} и ${fr.at(-1).toFixed(1)})`)
        }
      }
    }
    await page.evaluate(() => document.querySelectorAll('[data-dip-probe]')
      .forEach((el) => el.removeAttribute('data-dip-probe')))
    } finally { give(ctx, page) }
  }
})

/* ── ЛИСТ НАБОРА ПРОТИВ ВИТРИНЫ ────────────────────────────────────────────
 *
 * Лист набора существует затем, чтобы по нему принимали решения. Предмет,
 * нарисованный на нём не в том размере, в котором он стоит в магазине, —
 * такая же неправда, как чужой рисунок: решают по одному, покупатель видит
 * другое. Заказчик нашёл три таких расхождения подряд, открыв лист рядом с
 * витриной.
 *
 * Пары — в `tools/sheet-samples.mjs`: там же написано, что именно обязано
 * совпасть у каждой. В файлах признака нет никакого: и лист, и витрина
 * безупречны по отдельности, расходятся они только на странице. */
const sheetSpot = async (ctx, win, at, pick, nth, text, tab) => {
  const page = await take(ctx)
  try {
    await page.setViewportSize({ width: win, height: 1000 })
    try { await openAt(page, at, { waitUntil: 'networkidle' }) } catch { return null }
    await still(page)
    if (tab) {
      /* Образцы лежат по вкладкам, и закрытая вкладка не отрисована вовсе. */
      try { await page.getByRole('tab', { name: tab }).click({ force: true, timeout: 2000 }) } catch { return null }
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(150)
    return await page.evaluate(({ pick, nth, text }) => {
      let list = [...document.querySelectorAll(pick)]
      if (text) list = list.filter((el) => (el.textContent || '').trim() === text)
      const el = list[nth ?? 0]
      if (!el) return null
      const b = el.getBoundingClientRect()
      return {
        w: Math.round(b.width), h: Math.round(b.height),
        /* Складка предмета: рост против ширины. Ею сверяется то, у чего
           колонка на листе и в магазине разная по делу. */
        ar: b.width ? b.height / b.width : 0,
        fs: getComputedStyle(el).fontSize,
      }
    }, { pick, nth, text })
  } finally { give(ctx, page) }
}

/* В узком прогоне сверка идёт, только если спрошен сам лист: она открывает
   ЧУЖИЕ адреса, и считать её по одной странице дерева нечестно. */
const SHEET_AT = '/bg/design'
if (!NARROW || (ONLY_PAGE && SHEET_AT.includes(ONLY_PAGE))) {
  const WORD = { w: 'ширина', h: 'рост', fs: 'кегль', ar: 'складка' }
  await lanes(SHEET_SAMPLES, async (row) => {
    const shop = await sheetSpot(desk, row.win, row.shop.at, row.shop.pick, row.shop.nth, row.shop.text, null)
    const sheet = await sheetSpot(desk, row.win, SHEET_AT, row.sheet.pick, row.sheet.nth, row.sheet.text, row.sheet.tab)
    if (!shop || !sheet) {
      found.sheetSize.push(`${row.what} — не нашлось: ${shop ? 'на листе' : 'на витрине'} (окно ${row.win})`)
      return
    }
    for (const key of row.same) {
      const off = key === 'fs'
        ? (shop.fs !== sheet.fs ? `${sheet.fs} против ${shop.fs}` : '')
        : key === 'ar'
          ? (Math.abs(shop.ar - sheet.ar) > SHEET_AR_SLACK
            ? `${sheet.ar.toFixed(2)} против ${shop.ar.toFixed(2)}` : '')
          : (Math.abs(shop[key] - sheet[key]) > SHEET_SLACK ? `${sheet[key]} против ${shop[key]}` : '')
      if (off) found.sheetSize.push(`${row.what} @${row.win}: ${WORD[key]} на листе ${off} в магазине`)
    }
  }, 2)
}

await browser.close()

/* Одна строка на заглушку, а не на её показ. Адреса — рядом, чтобы было
   видно, где смотреть, но на счёт они не влияют. */
found.placeholder = [...holders].map(([text, where]) => {
  const list = [...where]
  return `${text}  — ${list.length === 1 ? list[0] : `на ${list.length} страницах, например ${list[0]}`}`
})

/* Порядок находок — не порядок обхода: страницы меряются в несколько полос,
   и кто раньше отдал результат, решает сеть. Два прогона одного дерева
   обязаны давать ОДИН отчёт, иначе его нечем сравнить с прошлым — поэтому
   каждая семья сортируется перед печатью. На счёт это не влияет, на чтение
   влияет прямо. */
for (const k of Object.keys(found)) found[k].sort()

const counts = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.length]))

if (process.argv.includes('--update') && NARROW) {
  console.error('Узкий прогон базу не обновляет: долг по части дерева — неправда. Уберите --page.')
  process.exit(1)
}
if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n')
  console.log('База обновлена:', counts)
  process.exit(0)
}

let base
try {
  base = JSON.parse(readFileSync(BASELINE, 'utf8'))
} catch {
  console.error(`Нет ${relative(ROOT, BASELINE)}. Создать: npm run check:craft -- --update`)
  process.exit(1)
}

/* Подписи семей — в реестре `craft-families.mjs`: их же печатает скилл. */

/* `--list <семья>` печатает найденное целиком, не трогая базу: чинить проще,
   когда видно всё, а не первые двенадцать строк при провале. */
const asked = process.argv[process.argv.indexOf('--list') + 1]
if (process.argv.includes('--list')) {
  for (const key of Object.keys(NAMES)) {
    if (asked && asked !== key) continue
    console.log(`\n── ${NAMES[key]} (${found[key].length})`)
    for (const line of found[key]) console.log(`   ${line}`)
  }
  process.exit(0)
}

if (NARROW) {
  const keys = Object.keys(NAMES).filter((k) => !ONLY_FAM.length || ONLY_FAM.includes(k))
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ pages: PAGES, names: Object.fromEntries(keys.map((k) => [k, NAMES[k]])), found: Object.fromEntries(keys.map((k) => [k, found[k]])) }, null, 2) + '\n')
  console.log(`\nУзкий прогон: ${PAGES.length} адрес(ов) под «${ASKED}»` +
    `${ONLY_FAM.length ? `, семьи: ${ONLY_FAM.join(', ')}` : ''}. База не тронута, вердикт за полным прогоном.\n`)
  for (const key of keys) {
    console.log(`${found[key].length ? '·' : '✓'} ${NAMES[key]}: ${found[key].length}`)
    for (const line of found[key]) console.log(`    ${line}`)
  }
  process.exit(0)
}

let failed = false
for (const key of Object.keys(NAMES)) {
  const now = counts[key], was = base[key] ?? 0
  if (now > was) {
    failed = true
    console.error(`\n✗ ${NAMES[key]}: было ${was}, стало ${now}`)
    for (const line of found[key].slice(0, 12)) console.error(`    ${line}`)
  } else if (now < was) {
    console.log(`✓ ${NAMES[key]}: ${was} → ${now}`)
  } else {
    console.log(`· ${NAMES[key]}: ${now}`)
  }
}

if (failed) {
  console.error(`
Стало хуже, чем было. Либо чините, либо — если это осознанное решение —
обновляйте базу: npm run check:craft -- --update`)
  process.exit(1)
}
