/**
 * Семьи проверки дизайна (`check:design`) — один список на проверку, на
 * сборщик набора и на таблицу в скилле.
 *
 * Заведено 24.09.2026 (И271). Это измеримая половина скилла `impeccable`,
 * как `check:seo` — измеримая половина СЕО-скиллов (`docs/skills.md`), по
 * файлу; его собственный детектор по отрисованной странице — отдельная
 * проверка `check:detect` со своими семьями (`tools/detect-families.mjs`,
 * И310). Запреты и рефлексы из его справочников,
 * которые видны по файлу, переписаны сюда семьями; у каждой — подпись
 * (что ловит) и источник: файл и строка справочника impeccable, откуда
 * запрет взят. Вкус этим не меряется: зелёный `check:design` значит «новых
 * механических приёмов не завелось», а не «красиво» — композицию делают
 * скиллы по порядку (CLAUDE.md, «Дизайн делается дизайнерскими скиллами»).
 *
 * Отдельным файлом по той же причине, что `css-families.mjs`: сборщику
 * набора нельзя ввозить саму проверку — она запускается при чтении.
 */

export const DESIGN_FAMILIES = [
  'eyebrow', 'bareHeading', 'headRole', 'navSmall', 'flatRhythm', 'iconCards',
  'browserSurface', 'proseLink', 'gradientText', 'glassBlur', 'sideStripe',
  'hardShadow', 'glowHalo', 'trackTight', 'glyphIcon', 'monoCostume',
  'docValue', 'docDead',
]

/** Пустая база: ноль по каждой семье — новый проект долга не несёт. */
export const emptyDesignBaseline = () =>
  Object.fromEntries(DESIGN_FAMILIES.map((k) => [k, 0]))

/** Что ловит каждая семья — одной строкой дефекта. Печатает проверка, ту же
 *  строку показывает таблица в скилле (`check:rules --tables`). */
export const DESIGN_LABELS = {
  eyebrow: 'надпись над заголовком (eyebrow, kicker): заголовок несёт свой вес сам',
  bareHeading: 'заголовок без роли размера: ни своего класса, ни правила предка, ни основания — браузер ставит свой 1.5em',
  headRole: 'уровень заголовка набран чужой ролью: h1 размером --h2-size, h2 размером --h3-size — у одного уровня разные виды',
  navSmall: 'ссылки навигации мельче тела (меньше 1rem): главное меню читается как сноска',
  flatRhythm: 'группа и разделение одним шагом: между пунктами не больше воздуха, чем внутри пункта, — пункты слипаются',
  iconCards: 'карточки «значок + заголовок + текст» по списку как устройство страницы',
  browserSurface: 'поверхность браузера не одета: выделение, каретка, фокус, подчёркивание, ползунок или цифры таблиц — по умолчанию',
  proseLink: 'ссылка в тексте без подчёркивания: подчёркивание снято со всех a и не возвращено в абзаце — ссылку выдаёт один цвет',
  gradientText: 'текст градиентом (background-clip: text): выделяют весом и размером',
  glassBlur: 'стекло и размытие фона (backdrop-filter: blur) как украшение',
  sideStripe: 'цветная полоса сбоку толще 1px (border-left/right, inline-start/end) у карточки, пункта, плашки',
  hardShadow: 'жёсткая тень со сдвигом и без размытия (4px 4px 0) — костюм, а не глубина',
  glowHalo: 'ореол без сдвига (0 0 Npx) — свечение как украшение, а не тень',
  trackTight: 'разрядка туже −0.04em',
  glyphIcon: 'символ или эмодзи вместо знака из листа (→ ✓ ★ ×)',
  monoCostume: 'моноширинный шрифт как костюм «технологичности» вне кода, данных и замеров',
  docValue: 'DESIGN.md несёт число (#код, rgb/oklch, px, ms): вид описывается ролями, числа выпускают строители',
  docDead: 'DESIGN.md называет роль (--имя), которой нет ни в одном файле стилей — описание разошлось с системой',
}

/** Откуда запрет: файл и строка справочника impeccable
 *  (`.claude/skills/impeccable/reference/`), несколько слов оригинала. */
export const DESIGN_SOURCES = {
  eyebrow: 'craft-floor.md:27 — «A kicker or eyebrow above a heading. This one is a ban»',
  bareHeading: 'craft-floor.md:15 — «ship with browser defaults that belong to no design system»; typeset.md:20',
  headRole: 'typeset.md:50 — «Keep repeated roles consistent across screens and states»',
  navSmall: 'typeset.md:46 — «Use 1rem / 16px as the ordinary web body floor»',
  flatRhythm: 'layout.md:20 — «one spacing value repeated until everything has equal weight»; layout.md:48',
  iconCards: 'craft-floor.md:25 — «Same-size cards of icon plus heading plus text as the page structure»',
  browserSurface: 'craft-floor.md:15 — «Text selection, the caret, custom scrollbars, focus rings, underline offset…»',
  proseLink: 'craft-floor.md:15 — «underline offset» среди поверхностей браузера; WCAG 1.4.1',
  gradientText: 'craft-floor.md:33 — «Gradient text. Emphasis comes from weight or size»',
  glassBlur: 'craft-floor.md:34 — «Glass and blur as decoration»',
  sideStripe: 'craft-floor.md:35 — «A colored border-left or border-right above 1px»',
  hardShadow: 'craft-floor.md:36 — «Hard offset shadows (box-shadow: 4px 4px 0)»',
  glowHalo: 'craft-floor.md:10 — «A zero-offset colored halo is decoration»',
  trackTight: 'craft-floor.md:12 — «tracking floor -0.04em»',
  glyphIcon: 'craft-floor.md:40 — «Unicode glyphs or emoji standing in for an icon system»',
  monoCostume: 'craft-floor.md:38 — «Monospace as a costume for "technical"»',
  docValue: 'document.md:46 — «Never split the source of truth without explicit reason»; спецификация google-labs-code/design.md: «The frontmatter is optional»; CLAUDE.md, «Делается только правильно» — краска → строитель палитры → роль',
  docDead: 'doctor.md:11 — «Truth drift. The code moved on and the document no longer describes it»',
}
