# Панель вида — правила и настройки

Панель физически отделена от сайта: весь каталог вариантов и весь расчёт —
здесь, в `look-panel/`; сайт хранит один опубликованный вид готовыми
значениями и панель не ввозит. Правило — `CLAUDE.md`, раздел «Панель
настройки физически отделена от сайта».

## Шаги

1. **Каталог.** Ставщик набора собирает `ui/catalog.json` из полного каталога
   набора его строителями: `node look-panel/scripts/build-catalog.mjs --from
   <набор>` (`npm run look:catalog -- --from <набор>`). Каждый вариант —
   значения свойств, которые сайт объявляет у себя (`lib/look-slots.json`).
2. **Выбор.** Панель на витрине (`LOOK_PICKER=on`), кнопка «Look». Щелчок по
   варианту сразу красит страницу и пишет черновик вида; черновой режим видит
   только этот браузер. Вариант, который с текущими не носится, погашен, и
   причина — одной строкой под группой.
3. **Проверка.** `npm run check:choice -- '<скопированный выбор>'` (без
   аргумента — опубликованный вид): правило сайта по значениям, затем
   `check:craft` на главной, первой полке и первом товаре основного языка,
   обе темы, все ширины. Вердикт словами: «ГОДИТСЯ» или «НЕ ГОДИТСЯ» с
   причинами.
4. **Публикация.** Кнопка «Publish»: черновик проверяется (шаг 3), шрифт
   скачивается в `public/fonts/` (страница покупателя к Google не ходит),
   вид пишется в опубликованный, кэш вида сбрасывается — без сборки.
5. **Снятие.** `npm run look:remove` удаляет `look-panel/`, вход
   `app/look-panel/` и строку подключения в `components/Shell.tsx`, свои
   команды, флаг `LOOK_PICKER`, черновик, лишние шрифты и варианты шапки,
   кроме выбранного. `npm run check:look` доказывает это на копии: сборка,
   тот же вид, ни чужих вариантов в отгружаемых стилях, ни следов панели.

## Разделы и настройки

| раздел | настройка | что меняет на сайте | значения |
| --- | --- | --- | --- |
| System | Palette | краски обеих тем: ступени нейтрали и марки, сигналы, линии (`--n-*`, `--a-*`, `--sale-*` …) | наборы `styles/palette.json` и образцы набора |
| System | Typeface | `--face`, `--face-head` и шрифты со своего адреса | System, Manrope, IBM Plex Sans, Inter, Source Serif + Plex |
| System | Spacing | кегль, ритм, поле, воздух, радиусы (`--fs-*`, `--sp-*`, `--air-*`, `--r-*` …) | наборы `styles/scale.json` |
| System | Buttons | форма и голос кнопки (`--ctrl-btn-*`) | стили `styles/buttons.json` |
| Admin | Header | разметка шапки (`header`) | Classic, Search first, Boutique |
| Admin | Current item | отметка текущей полки в шапке (`--menu-mark-*`) | Underline, Pill |

Позже в System — ширина холста и радиусы отдельно от ритма.

## Пары, которые не носятся

Считает правило сайта `lib/look-rule.ts` на каждой паре вариантов двух групп;
панель гасит по этому списку, сайт тем же правилом не примет сохранённое.

<!-- pairs:start -->
| вариант | не носится с | почему |
| --- | --- | --- |
| palette · Brass on charcoal | button · Soft tone | the loud button fades into the page: 1.06 : 1 in the light theme, needs 1.15 |
| palette · Apothecary | button · Pill | the quiet button fades into the page: 1.14 : 1 in the light theme, needs 1.15 |
| palette · Apothecary | button · Soft tone | the quiet button fades into the page: 1.14 : 1 in the light theme, needs 1.15 |
| palette · Apothecary | button · Outline | the quiet button fades into the page: 1.14 : 1 in the light theme, needs 1.15 |
| palette · Apothecary | button · Capitals | the quiet button fades into the page: 1.14 : 1 in the light theme, needs 1.15 |
| palette · Apothecary | button · Quiet luxury | the outline is too faint on the page: 2.21 : 1 in the light theme, needs 3 |
| palette · Apothecary | button · Pharmacy | the quiet button fades into the page: 1.14 : 1 in the light theme, needs 1.15 |
| palette · Apothecary | button · Rounded | the quiet button fades into the page: 1.14 : 1 in the light theme, needs 1.15 |
| palette · Apothecary | button · Dense | the quiet button fades into the page: 1.14 : 1 in the light theme, needs 1.15 |
| palette · Olive | button · Soft tone | the loud button fades into the page: 1.07 : 1 in the light theme, needs 1.15 |
| palette · Olive | button · Outline | the outline is too faint on the card: 2.48 : 1 in the dark theme, needs 3 |
| palette · Olive | button · Quiet luxury | the outline is too faint on the card: 2.48 : 1 in the dark theme, needs 3 |
| palette · Soft island | button · Soft tone | the loud button fades into the page: 1.07 : 1 in the light theme, needs 1.15 |
| palette · Soft island | button · Outline | the outline is too faint on the card: 2.98 : 1 in the dark theme, needs 3 |
| palette · Soft island | button · Quiet luxury | the outline is too faint on the card: 2.98 : 1 in the dark theme, needs 3 |
| palette · Warm leaf | button · Soft tone | the loud button fades into the page: 1.07 : 1 in the light theme, needs 1.15 |
| palette · Warm leaf | button · Outline | the outline is too faint on the card: 2.36 : 1 in the dark theme, needs 3 |
| palette · Warm leaf | button · Quiet luxury | the outline is too faint on the card: 2.36 : 1 in the dark theme, needs 3 |
| palette · Icy sage | button · Soft tone | the loud button fades into the page: 1.06 : 1 in the light theme, needs 1.15 |
| palette · Icy sage | button · Outline | the outline is too faint on the page: 2.99 : 1 in the light theme, needs 3 |
| palette · Icy sage | button · Quiet luxury | the outline is too faint on the page: 2.99 : 1 in the light theme, needs 3 |
| palette · Pharmacy blue | button · Soft tone | the loud button fades into the page: 1.06 : 1 in the light theme, needs 1.15 |
| scale · Quiet | button · Rounded | button corners (16 px) are rounder than the cards they sit on (12 px) |
<!-- pairs:end -->

## Где что лежит

| что | где |
| --- | --- |
| каталог и расчёт | `look-panel/ui/catalog.json`, `look-panel/ui/choice.mjs` |
| черновик, пока выбирается | `lib/source/sample/look.draft.json` (у Payload — черновая версия global «look») |
| опубликованный вид | `lib/source/sample/look.json` (у Payload — global «look», план 4) |
| шрифты опубликованного вида | `public/fonts/` |
| вход панели в сайт | `app/look-panel/[...path]/route.ts`, строка в `components/Shell.tsx` |
| проверка значений и сочетаний | сайт: `lib/look-values.ts`, `lib/look-rule.ts`, `lib/look-slots.json` |
