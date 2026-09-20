# Размер органов — слой 7 основания

Разбор к шагу «Размер органов» закона `scale`. Сколько размеров у кнопки,
поля, фишки и счётчика, откуда высота, что под пальцем, чем меряется.
Пересмотрено 20.09.2026 против сырых ответов исследования
(`raw/findings/site-steps/steps_token-tiers.json`,
`steps_foundations-carbon-spectrum-atlassian.json`,
`steps_foundations-material-apple.json`, `space/pro_carbon.json`,
`pro_radix.json`, `pro_primer.json`, `next-steps/next_behaviour.json`).

Содержание: три размера · высота — из кегля и поля · своя семья, не ступень
ритма · под пальцем · один индекс тянет ряд · что говорят первоисточники ·
что нашёл замер 20.09.2026 · чего не копировать.

## Три размера, и ни одним больше

Curtis: «A component library likely requires two or (at most) three
sizes»; Spectrum: «important to have a limited amount of sizes». Роли
`--ctrl-h-sm`, `--ctrl-h`, `--ctrl-h-lg` — малый, средний, крупный; из них
кнопка, поле, фишка, сегмент, лоток и счётчик считают высоту одинаково.
Признак сломанного каталога — «Small input and small button aren't the
same small» (Curtis). Готов слой, когда «элементы одного размера стоят в
одной строке одной высоты по всему каталогу; шаги размеров описаны
токенами, а не числами внутри компонентов; у каждой цели под пальцем —
размер из слоя».

## Высота — из кегля и поля, геометрия — от высоты

Curtis: высота компонента = font-size + line-height + padding (+ border).
У набора орган берёт высоту ролью, а всё внутри считает от неё (CLAUDE.md,
правило 2): поле внутри — `calc(var(--ctrl-h) * .4)`, зазор до знака —
`calc(var(--ctrl-h) * .25)`, надпись — `--ctrl-fs` (малому — `xs`, среднему
— `sm`, крупному — `base`; не течёт, scales.md «Надпись контрола живёт в
шкале управления»). Radix: «один индекс размера тянет согласованный набор
из всех шкал» — у нас индекс ставится атрибутом `data-size="sm|lg"`, и он
переобъявляет две роли, `--ctrl-h` и `--ctrl-fs`; орган ничего не знает о
трёх числах.

## Своя семья, не ступень ритма

Carbon держит `container-01…05` (24 / 32 / 40 / 48 / 64) отдельной семьёй,
«deliberately NOT derived from the 8px spacing ladder, because 44px-class
touch targets don't land cleanly on 8px multiples»; Radix — `--base-button-height`
из `--space-5…8` = 24 / 32 / 40 / 48; Spectrum — шаг 8 на десктопе,
`component-height-100` = 32 на десктопе / 40 под пальцем; Primer —
`control.{small…xlarge}.size` 24 / 28 / 32 / 40 / 48 с прямым «не копировать
наши числа». Сходятся на ряду 32 / 40 / 48 по клетке 8 — он и взят
(`CONTROL.heights.fine` в `tools/thresholds.mjs`).

## Под пальцем

Одна переменная, значение по `@media (pointer: coarse)` — так у Primer
`control.minTarget` 16 под курсором / 44 под пальцем, и так строитель
выпускает высоты: 44 / 48 / 56. Малый — 44, а не 40 по Spectrum ×1.25:
WCAG 2.5.5 (AAA) 44, HIG 44 по умолчанию, Primer coarse 44 — правило
набора И15. Средний — 48 (M3: «consider making touch targets at least
48 x 48dp»; слой состояния 40, цель 48). Крупный — 56, следующая ступень
клетки 8. Между целями не меньше 8 (M3), у набора `--gap-targets` 16 под
пальцем. Цель у знака мельче органа — `--ctrl-target` (24 под курсором —
WCAG 2.5.8 AA, 44 под пальцем) через `.tap`. `touch-action: manipulation`
— на всём нажимаемом, не точечно (next_behaviour): снимает 300 мс
ожидания второго тапа во встроенных браузерах соцсетей.

## Что говорят первоисточники

- Curtis Size: «two or (at most) three sizes»; «Small input and small
  button aren't the same small»; высота = кегль + межстрочье + поле; при 79 %
  телефонных посетителей ярус размера строится от 44, а не от макета 1440.
- Carbon: `container-01…05` 24 / 32 / 40 / 48 / 64 — «interactive element
  height»; `size-xs…2xl` 24 … 80; «All touch targets for interactive icons
  need to be 44px or larger».
- Spectrum: t-shirt small / medium / large / extra-large, шаг 8 на десктопе;
  `component-height-100` 32 / 40; под пальцем 1 : 1.25; цель 48.
- Radix: `size-1…4` → 24 / 32 / 40 / 48; один `size` тянет высоту, поле,
  зазор, кегль, межстрочье, радиус; множитель до целей не доходит.
- Primer: `control.minTarget.{fine, coarse}` = 16 / 44 — «Use as minimum size
  for interactive elements on touch devices. Ensures WCAG 2.5.5 compliance».
- M3: цель 48 × 48 dp касание, 44 × 44 курсор, ≥ 8 dp между; слой
  состояния 40, цель 48. HIG: 44 × 44 pt по умолчанию, 28 × 28 минимум.
- WCAG 2.5.8 (AA): 24 × 24; 2.5.5 (AAA): 44 × 44.

## Что нашёл замер 20.09.2026

Высоты органов стояли восемью разными числами рукой: фишка 28, подпись
фишки 26, сегмент 30, лоток 42 (под пальцем 44 + поля), «ещё» и поле — 44
под пальцем, орган 40, счётчик 54, канал меню 44 — «маленькая кнопка» и
«маленькое поле» были разного маленького. Под пальцем каждый орган
поднимал себя сам отдельным правилом (`min-height: 44px` пять раз). Роли
размера не было; порог `CONTROL` в файле порогов лежал без читателя.

## Чего не копировать

Сами числа Primer (24 / 28 / 32 / 40 / 48, поля 2 / 4 / 6 / 10 / 14) — «округление
под типографику GitHub»; множитель Radix, доходящий до целей нажатия
(21.6 px при 90 %); высоту 68 нижней полосы — это раскладка (`--tab-h`), не
орган.
