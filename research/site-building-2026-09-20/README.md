# Сборка сайта профессионально: слои, токены, воздух, цвет — снимок первоисточников

> Дата: 2026-09-20. Заведено по указанию владельца: «изучи профессионалов и пойми,
> что и как строить профессионально», «только высококачественную и
> профессиональную инфу», «если понадобится в будущем — загружай на комп»,
> «пиши всё это в файл, чтоб не потерялось». Повод — третья витрина
> (`apps/storefront3`, стиль «минимализм-лакшери»): сделан слой палитры, дальше —
> пространство (поля, воздух, ритм, примитивы) и остальные слои, которых владелец
> по имени не знает. Существующие витрины проекта образцом не считаются.

Папка состоит из трёх частей, и путать их нельзя:

| Что | Где | Чьё |
|---|---|---|
| **Снимок первоисточников** — файлы токенов систем, статьи спецификаций, исследования, законы | `raw/sources/` | чужое, скопировано как есть |
| **Сырые результаты исследования** — ответы агентов по каждой системе/теме, JSON | `raw/findings/` | наше сырьё, без причёсывания |
| **Наш разбор** — что доказано, что спорно, система шагов, чек-листы | `docs/layers.md` набора | написано для набора, пример — третья витрина `CBD_ecommerce_eu` |

## Правило работы со снимком `raw/sources/`

Это снимок чужих материалов на 20.09.2026, а не живой источник:

1. **Файлы не правятся руками.** Расхождение с нашей действительностью пишется в
   разбор, а не поверх чужого текста.
2. **Файл не становится правилом оттого, что лежит у нас.** Правило живёт в
   `CLAUDE.md` и `DESIGN_SYSTEM.md`, решение — в `DECISIONS.md`. Здесь только
   основание.
3. **Скрипт `raw/sources/fetch.sh` — и список источников, и способ их обновить.**
   `MANIFEST.tsv` рядом говорит, что скачано, откуда, когда, каким ответом
   (`200`, `cached`, `npm`, или код ошибки). Не скачавшееся не выдумывается.

## Что в снимке и зачем

**Файлы токенов систем** (то, что команды реально ставят себе, из npm — версия в
имени папки, и из репозиториев):

| Папка | Система | Что там |
|---|---|---|
| `radix-themes/` | Radix Themes 3 | шкала `--space-1…9`, `--scaling`, радиусы, тени, типографика; документация темы |
| `radix-colors/` | Radix Colors 3 | 12-ступенчатые шкалы светлой и тёмной, alpha; документация «роль каждой ступени» |
| `tailwind/` | Tailwind CSS 4 | `theme.css` — одна `--spacing`, палитра в OKLCH, контейнеры, швы |
| `carbon/` | IBM Carbon 11 | `@carbon/layout` (spacing, fluid spacing, grid), `@carbon/type`, `@carbon/themes`, `@carbon/colors`, `@carbon/motion`; статьи сайта |
| `primer/` | GitHub Primer | базовые размеры, `size-coarse`/`size-fine` (палец и курсор), viewport, типографика, цветовые роли `fgColor/bgColor/borderColor`; документация |
| `spectrum/` | Adobe Spectrum | полный набор токенов (`variables.json`): spacing, platform scale, цвет, компонентные отступы |
| `polaris/` | Shopify Polaris | space, color, font, shadow, border, motion, breakpoints; статьи layout/colors/typography/depth/motion |
| `atlassian/` | Atlassian DS | `@atlaskit/tokens` (space, color, typography, shape) и правила линтера `ensure-design-token-usage`, `use-tokens-space` |
| `open-props/` | Open Props | `--size-*`, `--size-fluid-*`, шрифты, кривые, тени, рамки |
| `utopia/` | Utopia | `utopia-core` (формулы текучих шкал), калькуляторы и статьи |
| `material-color/` | Material Color Utilities | HCT, тональные палитры, схемы, контраст |

**Спецификации, доступность, языки:** `w3c/` (DTCG-формат токенов, CSS Color 4/5,
расширение текста при переводе), `wcag/` (контраст, размер цели, reflow, text
spacing, фокус, live regions, паттерны APG), `mdn/` (clamp/round, контейнерные
запросы, `@layer`, `@property`, `light-dark`, `color-mix`, OKLCH, медиазапросы
указателя и предпочтений, переносы, логические свойства, anchor positioning,
`<dialog>`/popover, View Transitions, формы, `Intl.NumberFormat`), `apca/`,
`oklab/`.

**Витрина и методология:** `baymard/` (страницы магазина, оформление, мобильный
UX, навигация), `nng/`, `webdev/` (Core Web Vitals, LCP, шрифты, темы, анимация,
бюджеты), `vercel/` (Web Interface Guidelines), `method/` (Atomic Design, CUBE,
ITCSS, Every Layout, Nathan Curtis, Refactoring UI, пиксели и доступность,
Design System Checklist), `material/`, `apple/`, `spectrum-docs/`,
`atlassian-docs/`, `figma/`.

**Закон ЕС и адреса:** `eu-law/` (Omnibus 2019/2161, права потребителей 2011/83,
указание цен 98/6, European Accessibility Act 2019/882), `address/` (форматы
адреса и индекса по странам из libaddressinput).

## Что не скачалось

См. строки `MANIFEST.tsv` с кодом, отличным от `200`/`cached`/`npm`. На
20.09.2026 — две страницы, переехавшие у авторов (Material «window size
classes», Atlassian «color roles»); их содержимое читалось агентами по
поиску и в разбор попало с пометкой.

## Переварено в

`docs/layers.md` — сводный разбор с оценкой доказанности; `docs/skills.md` —
что взято, что отложено и почему; `.claude/skills/craft/references/sources.md`
— список первоисточников. Правило рождается в `docs/rules.md` и в скилле
только вместе с проверкой и дефектом (`check:rules`).
