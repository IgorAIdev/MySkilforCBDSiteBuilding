/**
 * Где лежит проект и как названы его шкалы — одно место для всех проверок.
 *
 * Заведено по дефекту (`docs/rules.md`, И168). Пути `app`, `components`,
 * `styles`, `lib`, файл `styles/tokens.css` и префиксы `--fs-`, `--sp-`,
 * `--layer-` были набраны рукой в семи инструментах. На проекте с `src/` и
 * своими именами шкал проверки либо падали на несуществующем файле, либо —
 * хуже — молча зеленели: папок «нет», значит и нарушений «нет». Первый же
 * чужой сайт это показал: у cbdshop.bg код в `src/app`, стили в
 * `packages/ui`, шкалы `--text-*` и `--space-*` — и набор не видел ни одного
 * файла.
 *
 * Файл `kit.config.json` в корне проекта необязателен. Нет его — действуют
 * значения ниже, и это ровно то, как набор работал до него. Есть — его поля
 * ложатся поверх; писать нужно только то, что отличается:
 *
 *   {
 *     "code":        ["src/app", "src/components", "src/lib"],
 *     "styles":      ["src", "../../packages/ui/src"],
 *     "lib":         "src/lib",
 *     "tokens":      "../../packages/ui/src/tokens/index.css",
 *     "base":        "src/app/globals.css",
 *     "primitives":  null,
 *     "scale":       { "font": "text", "space": "space", "layer": "layer" },
 *     "breakpoints": [860]
 *   }
 *
 * Пути — от корня проекта (папки, где лежит `tools/`); `..` разрешён: в
 * монорепозитории общие стили живут этажом выше. `null` у файла значит «его
 * нет, и ворота о нём молчат», а не «ищи по умолчанию».
 *
 * Что здесь есть и чего нет — намеренно. Здесь то, что у проектов РАЗНОЕ:
 * где лежит, как названо, сколько швов. Здесь нет порогов правил (8% между
 * ступенями, 500ms движения, 44px под палец): это не свойство проекта, а
 * закон набора, и настраивать его — значит выключать.
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const ROOT = new URL('..', import.meta.url).pathname

const DEFAULTS = {
  /** где TypeScript и React; `lib` среди них — данные, `pages` — страницы */
  code: ['app', 'components', 'lib'],
  /** дерево страниц: им, в отличие от блоков, разрешено ходить за списками */
  pages: 'app',
  /** где CSS (модули страниц, блоков и общие стили) */
  styles: ['app', 'components', 'styles'],
  /** данные и их флаги настоящести */
  lib: 'lib',
  /** три шкалы и роли цвета */
  tokens: 'styles/tokens.css',
  /** сброс, земля, режимы переноса, кольцо фокуса */
  base: 'styles/base.css',
  /** примитивы раскладки */
  primitives: 'styles/primitives.module.css',
  /** канонические дома контролов — где контрол и должен быть описан */
  controls: ['styles/go.module.css', 'styles/btn.module.css', 'styles/form.module.css', 'styles/base.css'],
  /** файлы, которым шкала не предписана: сама шкала, панель настроек, лист набора */
  exempt: ['styles/tokens.css', 'styles/studio.module.css', 'app/[lang]/design/design.module.css'],
  /** предметы над страницей, которым положена фирменная заливка */
  floating: ['components/TabBar.module.css', 'components/Toast.module.css', 'components/Helper.module.css'],
  /** имена шкал: `--fs-*`, `--sp-*`, `--layer-*` */
  scale: { font: 'fs', space: 'sp', layer: 'layer' },
  /** разрешённые швы раскладки */
  breakpoints: [1080, 820, 560],
}

const FILE = join(ROOT, 'kit.config.json')

function load() {
  if (!existsSync(FILE)) return { ...DEFAULTS, scale: { ...DEFAULTS.scale } }
  let own
  try { own = JSON.parse(readFileSync(FILE, 'utf8')) } catch (e) {
    console.error(`kit.config.json не читается: ${e.message}`)
    process.exit(1)
  }
  const cfg = { ...DEFAULTS, ...own, scale: { ...DEFAULTS.scale, ...(own.scale ?? {}) } }
  for (const k of ['code', 'styles', 'controls', 'exempt', 'floating', 'breakpoints']) {
    if (!Array.isArray(cfg[k])) { console.error(`kit.config.json: «${k}» должен быть списком`); process.exit(1) }
  }
  return cfg
}

export const CONFIG = load()

/** Папки кода, с которых спрашивают (без данных); блоки — то же без страниц. */
export const CODE_DIRS = CONFIG.code
export const BLOCK_DIRS = CONFIG.code.filter((d) => d !== CONFIG.lib)
export const COMPONENT_DIRS = BLOCK_DIRS.filter((d) => d !== CONFIG.pages)
export const PAGES = CONFIG.pages
export const STYLE_DIRS = CONFIG.styles
export const LIB = CONFIG.lib
export const TOKENS = CONFIG.tokens
export const BASE = CONFIG.base
export const PRIMITIVES = CONFIG.primitives
export const CONTROLS = CONFIG.controls
export const EXEMPT = CONFIG.exempt
export const FLOATING = CONFIG.floating
export const BREAKPOINTS = CONFIG.breakpoints

/** Полные имена шкал: `--fs-`, `--sp-`, `--layer-`. */
export const PREFIX = {
  font: `--${CONFIG.scale.font}-`,
  space: `--${CONFIG.scale.space}-`,
  layer: `--${CONFIG.scale.layer}-`,
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')

/** Те же имена, готовые к вставке в регулярное выражение. */
export const RX = {
  font: escape(PREFIX.font),
  space: escape(PREFIX.space),
  layer: escape(PREFIX.layer),
}

/** Лежит ли относительный путь в одной из папок списка. */
export const inDirs = (rel, dirs) => dirs.some((d) => rel === d || rel.startsWith(`${d}/`))
