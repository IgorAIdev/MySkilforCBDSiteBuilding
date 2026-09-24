# Имена и ярусы — слой 1 основания

Разбор к разделу «Имена и ярусы» закона `craft`. Что называется как, кто на
кого ссылается, чем это меряется и какими дефектами куплено. Реестр —
`tools/names.mjs`; семьи `nameGrammar`, `stepDirect`, `deadName`, `tierUp` в
`check:css`. Пересмотрено 20.09.2026 против сырых ответов исследования
(`research/site-building-2026-09-20/raw/findings/site-steps/steps_token-tiers.json`,
`steps_foundations-carbon-spectrum-atlassian.json`, `steps_foundations-material-apple.json`).

Содержание: три яруса · форма имени · что говорят первоисточники · реестр
семей (из кода) · роли, обязанные существовать · что нашёл замер 20.09.2026 ·
чего реестр не делает · развилки.

## Три яруса, ссылки в одну сторону

| Ярус | Что это | Кто выпускает | Кто читает |
|---|---|---|---|
| сырьё | ступени без смысла: `--n-12`, `--a-9`, `--sp-4`, `--fs-base` | строители палитры и шкал | только роли |
| роль | должность значения: `--ink`, `--pop`, `--pad-card`, `--air-page`, `--body-size`, `--r-card`, `--sh-2`, `--layer-header` | `styles/tokens.css`, строитель шкал | узлы и другие роли (цепочки алиасов разрешены — DTCG §7.2.2) |
| узел | ручка примитива: `--stack`, `--grid-gap`, `--pin-top`, `--tray-h` | сам примитив, на себе | тот, кто ставит примитив |

Сырьё напрямую никто не применяет (Figma: «primitive tokens are for
reference only»; M3: «Whenever possible, system tokens should point to
reference tokens»; Style Dictionary: `button.color.primary → {color.primary}
→ {color.base.green}`). Узел, читающий ступень, — семья `stepDirect`.
Единственное исключение — оптика не выше пола ритма (`--sp-1`, `--sp-2`):
геометрия органа не течёт (CLAUDE.md, правило 2), и ступень тут — доводка,
а не ритм.

Ссылка вверх — семья `tierUp`: сырьё, читающее роль; роль, читающая ручку
узла; ручка узла, объявленная на корне. Последнее и было дефектом
`--stack`: под этим именем в `tokens.css` жил стек шрифтов, примитив `stack`
читал его как отступ — и отступ был нулём.

## Форма имени

`--<понятие>[-<уточнение>]*`: понятие из реестра (по назначению — `ink`,
`pop`, `plate`, `pad`, `air`, `r`, `sh`, `layer`, `ctrl` …), уточнения из
списка (`soft`, `hover`, `press`, `fill`, `tint`, `on`, `card`, `size` …),
второе понятие цвета (`--on-pop`, `--hover-ctrl`) или число. От общего к
частному: Curtis — «Namespaces are prepended first; modifiers tend to be
appended last»; Style Dictionary CTI — `color_background_button_error, not
button_color_error`. Имя по виду (`sage`, `cyan`, `live`, `amber`) в реестр
не попадает: Figma — «Name every token for what it does rather than what it
is»; Curtis (Purposeful vs Aesthetic) — перекраска марки переименовала бы
всё. Имя не по форме — семья `nameGrammar`.

## Что говорят первоисточники

- Curtis, Naming Tokens: четыре уровня имени в фиксированном порядке —
  Namespace → Object → Base → Modifier; «Include only levels needed to
  sufficiently describe purposeful intent».
- Curtis, Reimagining a Token Taxonomy: три типа — Generic / Semantic /
  Component; «Start within, then promote across components as reuse becomes
  evident»; правило продвижения — локально → группа (3+ пользователей) →
  глобально; компонентный ярус «might not be necessary for everyone».
- Figma, Update 1: «primitive tokens are for reference only … you wouldn't
  apply them directly»; режимы — столбцы на ярусе ролей, у примитивов
  столбец один.
- Material 3: три класса токенов — reference → system → component;
  «component tokens should point to a system or reference token, and not
  contain hardcoded values»; «каждый заведённый стиль хотя бы раз
  использован — иначе он лишний».
- Atlassian: имя `тип.куда.роль.акцент.состояние` (`color.icon.success`);
  линтер `ensure-design-token-usage` падает на голом значении. Carbon:
  палитра `$blue-60` → core `$text-primary` → component `$button-primary`.
- DTCG: цепочки алиасов разрешены, инструмент обязан дойти до явного
  значения; типы `color`, `dimension`, `fontFamily`, `fontWeight`,
  `duration`, `cubicBezier`, составные `typography`, `shadow`, `border`.
- Curtis, Plan → Audit → Decide → Implement: сначала обход как есть — где
  числа вписаны руками («token gaps»), потом имена.
- Переименование — псевдоним со сроком, не поиск-замена; сторож падает на
  удалённом токене, на который ещё ссылаются (Atlassian, Spectrum; stylelint
  `value-no-unknown-custom-properties`).

## Реестр семей — из кода

<!-- families:names -->
| Группа | Понятия | Ярус |
| --- | --- | --- |
| colour | `--ink`, `--plate`, `--page`, `--surface`, `--pop`, `--select`, `--ctrl`, `--field`, `--rule`, `--border`, `--line`, `--ring`, `--scrim`, `--quiet`, `--thumb`, `--tile`, `--tick`, `--menu`, `--accent`, `--hover`, `--press`, `--chrome`, `--on`, `--bad`, `--ok`, `--warn`, `--sale`, `--info` | роль |
| rhythm | `--pad`, `--air`, `--gap` | роль |
| text | `--hero`, `--pagehead`, `--h2`, `--h3`, `--intro`, `--lede`, `--body`, `--note`, `--eyebrow`, `--measure`, `--face`, `--fs`, `--page` | роль |
| shape | `--r` | роль |
| depth | `--sh` | роль |
| motion | `--ease`, `--rise`, `--nudge`, `--creep`, `--open` | роль |
| state | `--state` | роль |
| layer | `--layer` | роль |
| control | `--ctrl`, `--chan`, `--chip`, `--tab`, `--dock`, `--edge` | роль |
| layout | `--wrap`, `--gut`, `--head`, `--anchor`, `--float`, `--chrome`, `--tile` | роль |
| ручки примитивов | `--stack-*`, `--cluster-*`, `--switch-*`, `--rail-*`, `--section-*`, `--sheet-*`, `--lede-*`, `--hero-*`, `--grid-*`, `--cols-*`, `--cell-*`, `--pin-*`, `--tray-*`, `--leaf-*`, `--chip-*`, `--qty-*`, `--more-*`, `--chan-*`, `--side-*`, `--prose-*`, `--pinned-*`, `--sidebar-*`, `--frame-*`, `--btn-*`, `--seg-*`, `--gallery-*` | узел |
| сырьё | `--n-N`, `--a-N`, `--e-N`, `--sale-N`, `--warn-N`, `--ok-N`, `--info-N`, `--on-*-N`, `--sp-N`, `--fs-*` | сырьё |
| обязательные роли | `--bad`, `--bad-fill`, `--on-bad`, `--bad-tint`, `--bad-line`, `--ok`, `--ok-fill`, `--on-ok`, `--ok-tint`, `--warn`, `--warn-fill`, `--on-warn`, `--warn-tint`, `--sale`, `--sale-fill`, `--on-sale`, `--sale-tint`, `--pop-press`, `--r-pop`, `--ease-exit`, `--plate-2`, `--rule`, `--field`, `--scrim`, `--scrim-deck`, `--creep`, `--layer-helper`, `--layer-toast` | роль |
| объявлений в стилях набора | 891, по форме 891 | `tools/names.mjs`, `parse()` |
<!-- /families:names -->

## Роли, обязанные существовать

Роль живёт, если её читает узел набора, код, инструмент или тест — либо
она из списка по элементам, для узла, который придёт с магазином
(`REQUIRED` в `tools/names.mjs`: плашки и текст сигналов, кнопка под
пальцем, слои помощника и сообщения, разделитель, поле ввода, затемнение,
утопленное). Остальное без читателя — семья `deadName`: число про запас.
Сырьё за читателя не спрашивается: лестница целиком — по устройству (Radix:
двенадцать ступеней); ступень ритма без просителя ловит `check:scale`.

## Что нашёл замер 20.09.2026

- **`--stack`** — ручка примитива `stack` и стек шрифтов на корне под одним
  именем: отступ примитива был нулём. Стек переименован в `--face-stack`.
- **`--n` и `--n-min`** у сетки — ручки под именем семьи нейтрали `--n-N`;
  переименованы в `--cols`, `--cols-min`.
- **Узлы читали оттенок**: `.chipLab`, `.more`, `::selection`, каретка —
  `--live-3`, `--live-11`, `--live-12`, `--live-4`; семья `hueDirect` их не
  видела, потому что `live` не значился в `kit.config.json`. Заведены роли
  по назначению: `--pop-ink`, `--pop-ink-hover`, `--pop-tint`, `--select`,
  `--on-select`. Псевдонимы по оттенку (`--sage-*`, `--cyan-*`, `--live-*`)
  сняты: роли читают ступени.
- **Узлы читали ступени ритма** в двадцати пяти местах (`--sp-3` … `--sp-9`);
  теперь роли: `--air-block`, `--air-band`, `--gap-row`, `--gap-grid`,
  `--air-head`, `--pad-inner`; зазоры `row` и `grid` заведены в
  `styles/scale.json` ступенями.
- **Лестница управления** `--fs-ui-*` стояла шестью числами рукой; теперь
  `--ctrl-fs-*` выпускает строитель — верх ступени размера, в px.
- **Кривые** `--fs-page`, `--fs-lead` носили имя сырья и читали роли —
  стали ролями `--pagehead-size`, `--intro-size`.
- **Пятьдесят имён без единого читателя** в `tokens.css`: кадр героя, кадр
  шапки, плитка, тень подписи, палуба-поиск и прочий дизайн одного магазина
  — сняты; роли по элементам оставлены в `REQUIRED`.
- **Роли текста применялись наполовину**: тело и подводки брали размер и
  межстрочье, а вес и разрядку — нет. Применены целиком.

## Чего реестр не делает

Не переименовывает словарь в строгую грамматику вида
`--color-action-background-primary-hover`: это решение заказчика, с
псевдонимами со сроком на каждое старое имя (`docs/open.md`). Не ловит
ссылку на несуществующее имя без запасного значения (`unknownVar`) — ждёт
своего дефекта.
