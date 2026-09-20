# Откуда родом правила

Источники, у которых взяты идеи и числа, и что именно взято.

Содержание:

- [Откуда родом правила](#откуда-родом-правила)
- [Снимок первоисточников 20.09.2026](#снимок-первоисточников-20092026)

---

## Откуда родом правила

Половина написанного здесь не выдумана — она взята у других и названа своими
словами. Источники ниже; в какой форме взято каждое правило — таблицей в
`docs/skills.md`.

* **[Every Layout](https://every-layout.dev)** — Хейдон Пикеринг и Энди
  Белл. Оттуда идея примитива раскладки и сам словарь: `stack`, `cluster`,
  `switcher`, `rail` (у них `Reel`), `sidebar`, `grid`, мера набора у
  `prose` (у них `Center`). Реализация здесь своя — от наших токенов, — но
  имена и мысль «раскладка это предмет, а не код на месте» их.
* **[Utopia](https://utopia.fyi)** — Джеймс Гилхэд и Трис Мадфорд. Оттуда
  метод текучей шкалы: `clamp(мин, наклон, макс)` с прямой между двумя
  опорными ширинами. Числа наши, выведены из медиазапросов, которые шкала
  заменила; способ — их.
* **[WCAG 2.2](https://www.w3.org/TR/WCAG22/)** — цель нажатия 44×44
  (2.5.5) и 24×24 (2.5.8), останавливаемое движение (2.2.2), пороги
  контраста (1.4.3). Числа как есть, с номерами пунктов.
* **[Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)**
  (Vercel) — предсдаточный чеклист. Он **вычитывается перед сдачей, а не
  копируется**: список живёт у авторов и меняется, копия протухнет.
* **[ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)**
  (119 правил, MIT) — половина проверок ремесла, но только то, что можно
  **померить**. Остальное осталось там: совет, оставшийся советом, не
  работает.

Это же правило объясняет, почему поиск ещё одного готового списка почти
ничего не даёт. Те самые 180 медиазапросов и 25 размеров шрифта написала
модель, у которой все пять источников лежали в обучающих данных целиком.
Влияет не список рядом, а **проверка, которая падает**. Работа, которая
окупается, — довести одно уже найденное правило до `tools/`.

А четыре запрета из десяти не взяты ниоткуда: три брейкпоинта, потолок у
`aspect-ratio`, потолок у приклеенного, геометрия контрола от его высоты.
Они заведены дефектом живого сайта — и ни один публичный список их не
содержит, потому что видны они на странице, а не в правиле.

## Снимок первоисточников 20.09.2026

Всё, что ниже, лежит скачанным в `research/site-building-2026-09-20/raw/sources/`
(в проекты не едет — `install.mjs`, `MINE`), с манифестом «что, откуда, когда,
каким ответом» и скриптом обновления. Разбор — `docs/layers.md`, что взято —
`docs/skills.md`.

* **Файлы токенов** (из npm, версия в имени папки): `@radix-ui/themes` 3.3
  (`space.css`, `scaling.css`), `@radix-ui/colors` 3.0 (`light.ts`, `dark.ts`),
  `tailwindcss` 4.3 (`theme.css`), `@carbon/layout` 11.59 и `@carbon/type`,
  `@carbon/themes`, `@carbon/colors`, `@carbon/motion`, `@primer/primitives`
  11.10, `@adobe/spectrum-tokens` 15.4, `@shopify/polaris-tokens` 9.4,
  `@atlaskit/tokens` 18.2 и `@atlaskit/eslint-plugin-design-system`,
  `open-props` 1.7, `utopia-core` 1.6, `material-color-utilities` (HCT).
* **Спецификации и доступность**: DTCG-формат, CSS Color 4/5, W3C «Text size
  in translation», WCAG 2.2 Understanding (contrast, non-text contrast,
  resize, reflow, text spacing, target size, focus, status messages), APG
  (dialog, menu, disclosure, carousel), APCA (Myndex), Oklab (Ottosson), MDN
  (clamp, round, container queries, `@layer`, `@property`, `light-dark`,
  `color-mix`, oklch, медиазапросы указателя и предпочтений, hyphens,
  text-wrap, логические свойства, anchor positioning, `<dialog>`, popover,
  View Transitions, autocomplete, inputmode, responsive images,
  `Intl.NumberFormat`).
* **Витрина и методология**: Baymard (открытые статьи), NN/g, web.dev (Core
  Web Vitals, шрифты, темы, анимация, бюджеты), Vercel WIG, Atomic Design,
  CUBE, ITCSS, Every Layout, Nathan Curtis, Refactoring UI, Design System
  Checklist, Material 3, Apple HIG, Spectrum, Atlassian, Figma (переменные,
  режимы, Code Connect).
* **Закон ЕС и адреса**: Omnibus 2019/2161, права потребителей 2011/83,
  указание цен 98/6, European Accessibility Act 2019/882; форматы адреса
  RO и IT из libaddressinput (HR и BG не скачались).
