/**
 * Семьи детектора impeccable по отрисованной странице (`check:detect`, И310)
 * — один список на проверку, на сборщик набора и на таблицу в скилле.
 *
 * Детектор чужой: его правила названы автором и лежат рядом со сборкой
 * (`tools/vendor/impeccable/antipatterns.json`; откуда, коммит, хеш —
 * VENDOR.json, лицензия и разбор на сеть — SOURCE.md). Каждое его правило
 * здесь получает ОДНУ судьбу, и тест требует, чтобы судьбы покрыли правила
 * сборки ровно, без остатка и без лишнего:
 *
 *   DETECT_MAP      — правило ведёт семья набора: считается храповиком;
 *   DETECT_OFF      — на тот же вопрос уже отвечает семья или команда набора:
 *                     правило выключается, чтобы у вопроса был один ответ;
 *   DETECT_ADVISORY — вкус брифа или тексты заказчика: печатается, не
 *                     считается.
 *
 * Замена сборки — замена данных: новый файл и `antipatterns.json`, хеш,
 * коммит и версия в VENDOR.json, судьбы здесь. Новое правило без судьбы тест
 * не пропустит.
 *
 * Отдельным файлом по той же причине, что `design-families.mjs`: сборщику
 * набора нельзя ввозить саму проверку — она запускается при чтении.
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const VENDOR_DIR = new URL('./vendor/impeccable/', import.meta.url)
export const VENDOR_FILE = fileURLToPath(new URL('VENDOR.json', VENDOR_DIR))
/** Запись о сборке: откуда, какой тег и коммит, версия движка, хеши, вызов. */
export const VENDOR = existsSync(VENDOR_FILE) ? JSON.parse(readFileSync(VENDOR_FILE, 'utf8')) : null
export const DETECTOR = VENDOR ? fileURLToPath(new URL(VENDOR.file, VENDOR_DIR)) : null
export const REGISTRY = VENDOR ? fileURLToPath(new URL(VENDOR.registry, VENDOR_DIR)) : null

/** Правила сборки по порядку автора: `{ id, name, category }`. */
export const DETECT_RULES = REGISTRY && existsSync(REGISTRY)
  ? JSON.parse(readFileSync(REGISTRY, 'utf8')).map((r) => ({ id: r.id, name: r.name, category: r.category }))
  : []

/** Семьи набора, которые ведут правила детектора. */
export const DETECT_FAMILIES = ['cardInCard', 'hiddenAtRest', 'edgeFlush', 'firstScreen', 'headCrowd',
  'occluded', 'trackWide', 'capsBody', 'justify', 'decor', 'scriptError']

/** Пустая база: у нового проекта страниц в ней нет, каждая находка — рост. */
export const emptyDetectBaseline = () => ({})

/** Что ловит семья — строкой дефекта. Печатает проверка, ту же строку
 *  показывает таблица в скилле (`check:rules --tables`). */
export const DETECT_LABELS = {
  cardInCard: 'карточка в карточке: рамка внутри рамки — у полки и у товара один пол',
  hiddenAtRest: 'содержимое невидимо в покое и после прокрутки (прозрачно, пока его не покажет скрипт) — без скрипта и для поиска его нет',
  edgeFlush: 'карточки прилипли к краю прокручиваемой полосы: у первой или последней нет поля',
  firstScreen: 'одна колонка растянула первый экран выше окна — остального не видно',
  headCrowd: 'заголовок прижат к блоку над ним: воздух до заголовка не больше, чем после',
  occluded: 'текст перекрыт другим элементом',
  trackWide: 'разрядка сплошного текста шире порога детектора — слово рассыпается',
  capsBody: 'сплошной текст прописными',
  justify: 'текст по ширине — реки пробелов в узкой колонке',
  decor: 'украшение как костюм: мигающая точка, мигающий курсор, бегущая строка, ореол, прожектор, сетка на фоне, полосы, рисунок из фигур, волосяная рамка с широкой тенью',
  scriptError: 'скрипт падает при загрузке страницы — ломает раскрытие, нажатия и живое содержимое',
}

/** Правило детектора → семья набора. */
export const DETECT_MAP = {
  'nested-cards': 'cardInCard',
  'content-hidden-at-rest': 'hiddenAtRest',
  'edge-flush-cards': 'edgeFlush',
  'first-viewport-column-overflow': 'firstScreen',
  /* Детектор меряет только вертикаль: воздух над заголовком против воздуха
     под ним. Раздел документа — примитив `sidebar` (пакет A, И291): имя
     слева, текст справа, — и под таким заголовком ничего нет; детектор брал
     «воздух под» до чужого низа и на 1440 насчитал 9 «прижатых» заголовков
     там, где они стоят сбоку. Находка снимается, когда заголовок и его
     следующий блок не стоят друг над другом — горизонтали не пересекаются
     (отбор в tools/check-detect.mjs, образец `/beside` в
     selftest/detect.test.mjs; И302). Сложенный в столбик на телефоне раздел
     меряется как обычно. */
  'heading-rhythm': 'headCrowd',
  'text-occlusion': 'occluded',
  'wide-tracking': 'trackWide',
  'all-caps-body': 'capsBody',
  'justified-text': 'justify',
  'pulsing-dot': 'decor',
  'blinking-cursor': 'decor',
  'marquee': 'decor',
  'radial-halo': 'decor',
  'radial-spotlight-glow': 'decor',
  'codex-grid-background': 'decor',
  'repeating-stripes-gradient': 'decor',
  'shape-assembled-illustration': 'decor',
  'gpt-thin-border-wide-shadow': 'decor',
  'script-error': 'scriptError',
}

/** На этот вопрос уже отвечает набор — правило выключено. Значение — семьи
 *  проверок набора или команды, которые отвечают; тест требует, чтобы каждая
 *  существовала. */
export const DETECT_OFF = {
  'side-tab': ['sideStripe'],
  'border-accent-on-rounded': ['sideStripe'],
  'flat-type-hierarchy': ['ladder', 'headRole'],
  'gradient-text': ['gradientText'],
  'dark-glow': ['glowHalo'],
  'icon-tile-stack': ['iconCards'],
  'hero-eyebrow-chip': ['eyebrow'],
  'kicker-above-heading': ['eyebrow'],
  'extreme-negative-tracking': ['trackTight'],
  'monotonous-spacing': ['flatRhythm', 'airRatio'],
  'low-contrast': ['contrast', 'theme'],
  'gray-on-color': ['contrast', 'theme'],
  'layout-transition': ['motion'],
  'bounce-easing': ['motion', 'motionOut'],
  'skipped-heading': ['heads'],
  'broken-image': ['broken'],
  'text-overflow': ['spill'],
  'clipped-overflow-container': ['clip'],
  'tiny-text': ['fontPx', 'check:scale'],
  'undersized-ui-text': ['fontPx', 'check:scale'],
  'line-length': ['measure'],
  'cramped-padding': ['field'],
  'body-text-viewport-edge': ['lane', 'field'],
  'tight-leading': ['typeGuess'],
  'design-system-font': ['check:css'],
  'design-system-color': ['hueDirect'],
  'design-system-radius': ['radiusPx'],
  'design-system-font-size': ['fontPx'],
  'ai-color-palette': ['check:palette'],
  'cream-palette': ['check:palette'],
  'overused-font': ['face:stand'],
  'organic-clip-path': ['check:buttons'],
}

/** Почему выключено — там, где «отвечает набор» не объясняет само. */
export const DETECT_OFF_WHY = {
  'overused-font': 'шрифт выбирает заказчик глазами на стенде шрифта',
  'ai-color-palette': 'краски строит строитель палитры из трёх красок заказчика',
  'cream-palette': 'краски строит строитель палитры из трёх красок заказчика',
  'line-length': 'потолка меры у набора нет — снят заказчиком; нижнюю границу меряет measure',
  'cramped-padding': 'поле контрола считается от его высоты (запрет 2)',
  'low-contrast': 'контраст меряется по пикселям в обеих темах',
  /* Замер витрины 24.09.2026: правило сработало на 51 странице из 63 — на
     шевронах хвоста главной кнопки (`btn.module.css`, `::after`, 14 вершин),
     скрытых, пока форма «хвост» не выбрана. Детектор считает вершины и
     читает геометрию как «органику»; форма кнопки — решение набора (И276),
     ось каталога, которую меряет check:buttons. Решение набора сильнее
     умолчания детектора (разбор, шаг E4). */
  'organic-clip-path': 'форма главной кнопки — многоугольник от её высоты (И276); детектор считает вершины и читает шевроны «органикой», даже скрытые',
}

/** Печатается, не считается: вкус брифа и тексты заказчика. */
export const DETECT_ADVISORY = ['italic-serif-display', 'image-hover-transform', 'buried-raster',
  'repeated-container-text', 'numbered-section-labels', 'oversized-h1',
  'em-dash-overuse', 'marketing-buzzword', 'aphoristic-cadence', 'theater-slop-phrase']

/** Два правила сборка в странице не решает — их решает движок по адресу,
 *  снаружи страницы, и так же их решает проход: ошибка скрипта случилась до
 *  вставки детектора (её видит `pageerror` браузера), а «невидимо в покое»
 *  требует дать сработать всем раскрытиям — прокрутки до низа. Детектор даёт
 *  для второго только замер (`impeccableMeasureHiddenText`), порог — здесь:
 *  у автора он в движке по адресу, который не вендорен. */
export const HIDDEN_AT_REST = { share: 0.25, minChars: 200 }

/** Откуда семья: правила детектора и порог, по которому они срабатывают. */
export const DETECT_SOURCES = {
  cardInCard: 'nested-cards — предмет с тенью или рамкой и со скруглением или подложкой внутри такого же',
  hiddenAtRest: `content-hidden-at-rest — после прокрутки до низа невидимо не меньше ${HIDDEN_AT_REST.share * 100}% текста страницы (от ${HIDDEN_AT_REST.minChars} знаков); замер детектора, порог набора`,
  edgeFlush: 'edge-flush-cards — карточка в горизонтальной полосе в покое стоит вплотную к её краю, у другого края поле есть',
  firstScreen: 'first-viewport-column-overflow — колонка первого раздела уходит далеко за низ окна, соседняя помещается',
  headCrowd: 'heading-rhythm — воздух над заголовком не больше воздуха под ним; заголовок сбоку от своего блока (горизонтали не пересекаются) не считается — детектор меряет только вертикаль',
  occluded: 'text-occlusion — текст под непрозрачным элементом или под другой строкой',
  trackWide: 'wide-tracking — letter-spacing больше 0.05em у сплошного текста',
  capsBody: 'all-caps-body — длинный текст в text-transform: uppercase',
  justify: 'justified-text — text-align: justify без hyphens: auto',
  decor: 'pulsing-dot, blinking-cursor, marquee, radial-halo, radial-spotlight-glow, codex-grid-background, repeating-stripes-gradient, shape-assembled-illustration, gpt-thin-border-wide-shadow',
  scriptError: 'script-error — непойманная ошибка скрипта при загрузке (событие pageerror браузера)',
}

/** Судьба правила одной строкой: для отчёта и таблицы в скилле. */
export const fateOf = (id) => DETECT_MAP[id] ? `семья \`${DETECT_MAP[id]}\``
  : DETECT_OFF[id] ? `выключено: отвечает ${DETECT_OFF[id].map((x) => `\`${x}\``).join(', ')}${DETECT_OFF_WHY[id] ? ` — ${DETECT_OFF_WHY[id]}` : ''}`
    : DETECT_ADVISORY.includes(id) ? 'только печатается' : 'судьбы нет'
