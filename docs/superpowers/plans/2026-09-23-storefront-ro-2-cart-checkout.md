# Образцовая витрина RO — план 2: корзина и оформление заказа

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Покупка гостем на образце целиком — «в корзину» на товаре, корзина с количеством и кодом скидки, оформление в три шага (контакты → доставка → оплата) и «спасибо» с номером заказа — с доставкой и оплатой как общим механизмом, без имени службы в коде; справочник служб доставки по странам в скилле; проверки набора меряют корзину и оформление заполненными.

**Architecture:** Договор данных (`lib/source/contract.ts`) получает покупку: `Commerce` — корзина, оформление, заказ; сессия — непрозрачный ключ в cookie только для сервера. За договором — образец в памяти процесса (`lib/source/sample/commerce.ts`) над данными `lib/shipping.ts`. Страницы собирают готовые строки (`lib/cart-view.ts`, `lib/checkout-view.ts`) и отдают блокам; запись — Server Actions (`lib/actions/*.ts`): корзина — одна полоса записи на вкладку (`mutation-lane.mjs` набора, с таймаутом) и отправка без скрипта с переходом на корзину; шаги оформления — `useActionState` (ошибки у полей и без скрипта). Доставка: вид способа — `address` или `pickup`, служба — строкой данных; точки выдачи ищутся по городу.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19.2 (`useActionState`, `useSyncExternalStore`), TypeScript 6, CSS-модули, Node 24 (`node --test`), без Tailwind и UI-китов.

**Spec:** `docs/superpowers/specs/2026-09-23-storefront-ro-design.md` (раздел «Доставка и оплата — общий механизм» дописан 23.09.2026 по слову заказчика).

## Global Constraints

- Всё из Global Constraints плана 1 (`docs/superpowers/plans/2026-09-23-storefront-ro-1-catalog.md`) действует: языки `ro`/`en`/`hu` первым сегментом адреса; деньги — целые минорные единицы, строку цены делает только `lib/money.ts`; `ș ț`, не `ş ţ`; никаких Tailwind, UI-китов, `next/image`, `z-index` числом, `font-size`/отступов числом, медиазапросов в `components/*.module.css`, своего `position:sticky`; раскладка — примитивы, кнопка — `styles/btn.module.css`, поле — `styles/form.module.css`, знак — лист `styles/icons.svg`.
- **В коде витрины нет ни одного имени службы доставки.** Имя службы (`FAN Courier`, `Sameday`) — только строкой данных в `lib/shipping.ts` (образец). Вид способа — `'address' | 'pickup'`; тип точки — `'office' | 'locker' | 'partner' | 'shop'`. Самовывоз — пункт выдачи с одной точкой типа `shop`.
- Компонент (`components/**/*.tsx`) не ввозит `lib/source/**`, `lib/commerce/**`, `lib/actions/**` рантаймом и не считает деньги (`check:port`: `backendInView`, `moneyMath`). Действия (Server Actions) страница передаёт компоненту пропсом. Полосу записи компонент берёт из `lib/cart-lane.ts`.
- Итоги, скидку, доставку и допустимость оплаты считает источник; витрина не складывает цены.
- Личное (корзина, оформление, заказ, счётчик в шапке) — динамическое и `noindex`; в карту сайта не входит. Страницы каталога остаются статическими: счётчик шапки приходит отдельным запросом `GET /api/cart`.
- Сессия — cookie `shop_session`: `httpOnly`, `sameSite=lax`, `path=/`, `secure` — когда адрес сайта `https:`; ключ — 24 случайных байта (`base64url`).
- Без скрипта работает вся покупка: формы корзины — обычная отправка и переход на корзину с кодом исхода `?r=…`; шаги — `useActionState` с `permalink`.
- Кнопка заказа называет обязанность платить (Директива 2011/83/ЕС, ст. 8(2)): ro «Comandă cu obligație de plată».
- Страница из дерева маршрутов открывается с кодом 200 и без сессии (`check:open`): корзина и шаги без корзины показывают экран «Coșul este gol», «спасибо» без заказа — экран «нет заказа». Динамического сегмента у личных страниц нет (`tools/routes.mjs` подставлять его нечем).
- Номера правил: И260 занят соседней веткой (`claude/fresh-install-rules-green`); этот план заводит **И261** (доставка — общий механизм), **И262** (кнопка заказа), **И263** (личная страница меряется полной).
- Цикл разработки прежний: правка — в наборе (`templates/storefront/`), проверка — в демо: из корня набора `node install.mjs --storefront --force D:\BusinessProject\cbd-storefront-demo`, затем команды в `D:\BusinessProject\cbd-storefront-demo`. В демо руками не правится ничего.
- Коммиты — в ветке `claude/storefront-cart-checkout`, сообщение по-русски, последняя строка `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ничего не пушится (слово заказчика 23.09.2026: «работаем локально»).
- Команды в bash — без `cd` в рабочую папку сессии: `git -C <путь>`, абсолютные пути.

---

## Карта файлов

| Файл | Отвечает за |
| --- | --- |
| **Набор** | |
| `skills/site-building/assets/commerce/carriers.json` | справочник служб доставки по странам (факты с адресом и датой) |
| `skills/site-building/references/delivery.md` | доставка и оплата как общий механизм; как читать справочник; чем пользуются магазины CBD |
| `selftest/carriers.test.mjs` | форма справочника |
| `tools/kit-config.mjs`, `tools/routes.mjs`, `tools/sessions.mjs`, `tools/check-craft.mjs`, `tools/sweep.mjs` | личные страницы в отрисованных проверках (`sessions`) |
| `selftest/sessions.test.mjs` | разбор адреса с сессией |
| `docs/rules.md` | И261, И262, И263 |
| **Шаблон** (`templates/storefront/`) | |
| `lib/source/contract.ts` | + покупка: `Cart`, `DeliveryMethod`, `PickupPoint`, `PaymentMethod`, `Checkout`, `Order`, `Commerce` |
| `lib/shipping.ts` | образец: способы доставки, точки выдачи, способы оплаты, коды скидки |
| `lib/source/sample/commerce.ts` | образец покупки в памяти процесса; заготовленные сессии |
| `lib/source/index.ts` | + `commerce()` |
| `lib/market.ts` | + запись индекса рынка |
| `lib/checkout-steps.ts` | шаги оформления и куда пускать |
| `lib/href.ts` | + корзина и шаги |
| `lib/i18n/*.ts`, `docs/words.md` | слова корзины и оформления |
| `lib/cart-ops.ts` | что просит форма корзины и чем кончилось |
| `lib/cart-view.ts` | корзина и итоги готовыми строками |
| `lib/checkout-form.ts` | разбор и проверка полей контактов и адреса |
| `lib/checkout-view.ts` | шаги, доставка, оплата, «спасибо» готовыми строками |
| `lib/product-view.ts` | + покупка на карте товара |
| `lib/session-cookie.ts`, `lib/session.ts` | имя cookie; чтение и запись сессии |
| `lib/cart-lane.ts` | одна полоса записи на корзину вкладки |
| `lib/actions/cart.ts`, `lib/actions/checkout.ts` | Server Actions |
| `app/api/cart/route.ts` | счётчик шапки |
| `app/[lang]/cart/page.tsx`, `app/[lang]/checkout/{contact,delivery,payment,done}/page.tsx` | страницы |
| `components/CartForm.tsx`, `CartLink.tsx`, `AddToCart.tsx`, `CartView.tsx`, `OrderTotals.tsx`, `Cart.module.css` | корзина |
| `components/Field.tsx`, `CheckoutFrame.tsx`, `CheckoutSteps.tsx`, `ContactForm.tsx`, `MethodForm.tsx`, `AddressForm.tsx`, `PointForm.tsx`, `PaymentForm.tsx`, `OrderDone.tsx`, `Checkout.module.css` | оформление |
| `components/DeliveryTable.tsx`, `lib/docs.json`, `lib/pages.ts` | «Доставка и оплата» из того же списка; образец без имени сети в словах |
| `components/Filters.tsx`, `Filters.module.css`, `Catalog.tsx` | фильтры на телефоне — шторкой |
| `kit.config.json` | личные страницы для отрисованных проверок |
| `tests/*.test.ts` | тесты логики |

---

### Task 1: Справочник служб доставки по странам в скилле

**Files:**
- Create: `skills/site-building/assets/commerce/carriers.json`, `skills/site-building/references/delivery.md`, `selftest/carriers.test.mjs`
- Modify: `skills/site-building/SKILL.md` (строка в таблице справочников), `skills/site-building/references/vendure.md` (ссылка из раздела «Оформление»), `docs/rules.md` (И261)

**Interfaces:**
- Consumes: исследование 23.09.2026 — файлы `.superpowers/sdd/2026-09-23-storefront-ro-2-cart-checkout/research/`: службы по странам — `group-a.json` (BG·RO·HU), `group-b.json` (UA·MD·GR), `group-c.json` (RS·HR·SI), `central-north.json` (PL·CZ·SK·LT·LV·EE·DE·AT), `west.json` (IT·ES·PT·FR·BE·NL·IE); чем пользуются магазины CBD — `cbd-shops.json`. Каждый факт там уже с адресом источника; рядом — `.md` с тем, что не проверено.
- Produces: `carriers.json` в форме ниже; Task 2 берёт из него имена служб Румынии для образца.

Форма `carriers.json` (ключи — буквально):

```json
{
  "checked": "2026-09-23",
  "about": "Основные службы доставки посылок интернет-магазинов по странам. Факт — только с адресом источника; не проверенное — null. Перепроверять перед запуском магазина: службы сливаются и закрываются.",
  "services": {
    "door": "курьер до адреса — вид способа address",
    "office": "отделение или партнёрская точка выдачи — вид pickup, тип точки office или partner",
    "locker": "постамат — вид pickup, тип точки locker"
  },
  "countries": [
    {
      "code": "RO",
      "name": "Romania",
      "expect": "строка или null",
      "expectSource": "https://… или null",
      "carriers": [
        {
          "id": "fan-courier",
          "name": "FAN Courier",
          "website": "https://www.fancourier.ro",
          "services": ["door", "locker"],
          "cod": true,
          "network": "строка или null",
          "api": { "docs": "https://… или null", "points": true, "shipments": true },
          "restrictions": "строка или null",
          "notes": "строка или null",
          "sources": ["https://…"]
        }
      ],
      "cbd": {
        "carriers": [{ "name": "FAN Courier", "shops": 3 }],
        "cod": "common",
        "sources": ["https://…"]
      }
    }
  ],
  "crossBorder": { "carriers": [{ "name": "DHL", "shops": 2 }], "cod": "rare", "sources": ["https://…"] },
  "policies": [
    { "carrier": "InPost", "scope": "PL", "statement": "цитата не длиннее 15 слов или пересказ", "url": "https://…" }
  ]
}
```

Правила сведения:
- страны — в порядке `BG, RO, HU, UA, MD, GR, RS, HR, SI, PL, CZ, SK, LT, LV, EE, DE, AT, IT, ES, PT, FR, BE, NL, IE`;
- `cbd` у страны — из `cbd-shops.json`; данных нет — `null`; `crossBorder` — из группы `EU` того же файла;
- закрытая служба (Fastway Ireland) в список **не входит** — о ней раздел «Что изменилось» в `delivery.md`;
- `restrictions` и `statement` — цитата не длиннее 15 слов в кавычках или пересказ, который начинается словом «Пересказ:»;
- чего нет в файлах исследования, от себя не дописывается: `null`; пустых `sources` не бывает.

- [ ] **Step 1: Write the failing test** — `selftest/carriers.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const REG = JSON.parse(readFileSync(join(ROOT, 'skills/site-building/assets/commerce/carriers.json'), 'utf8'))
const URL_RX = /^https:\/\/\S+$/
const SERVICES = new Set(['door', 'office', 'locker'])
const ORDER = ['BG', 'RO', 'HU', 'UA', 'MD', 'GR', 'RS', 'HR', 'SI', 'PL', 'CZ', 'SK', 'LT', 'LV', 'EE', 'DE', 'AT', 'IT', 'ES', 'PT', 'FR', 'BE', 'NL', 'IE']
const nullable = (v, check) => v === null || check(v)
const shortQuote = (s) => s.startsWith('Пересказ:') || s.split(/\s+/).length <= 20

test('carriers: the registry is dated and lists the agreed countries in order', () => {
  assert.match(REG.checked, /^\d{4}-\d{2}-\d{2}$/)
  assert.deepEqual(REG.countries.map((c) => c.code), ORDER)
})

test('carriers: every carrier fact carries its source', () => {
  for (const c of REG.countries) {
    assert.ok(c.carriers.length >= 2, `${c.code}: fewer than two carriers`)
    assert.ok(nullable(c.expectSource, (u) => URL_RX.test(u)), `${c.code}: expectSource`)
    const ids = new Set()
    for (const k of c.carriers) {
      const at = `${c.code}/${k.id}`
      assert.match(k.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, at)
      assert.ok(!ids.has(k.id), `${at}: duplicate id`)
      ids.add(k.id)
      assert.ok(k.name.trim(), at)
      assert.match(k.website, URL_RX, at)
      assert.ok(k.services.length && k.services.every((s) => SERVICES.has(s)), `${at}: services`)
      assert.ok(k.cod === null || typeof k.cod === 'boolean', `${at}: cod`)
      for (const f of ['points', 'shipments']) assert.ok(k.api[f] === null || typeof k.api[f] === 'boolean', `${at}: api.${f}`)
      assert.ok(nullable(k.api.docs, (u) => URL_RX.test(u)), `${at}: api.docs`)
      assert.ok(nullable(k.restrictions, shortQuote), `${at}: restrictions longer than a short quote`)
      assert.ok(k.sources.length && k.sources.every((u) => URL_RX.test(u)), `${at}: sources`)
    }
    if (c.cbd !== null) {
      assert.ok(['common', 'rare', 'mixed', 'unknown'].includes(c.cbd.cod), `${c.code}: cbd.cod`)
      assert.ok(c.cbd.sources.every((u) => URL_RX.test(u)), `${c.code}: cbd.sources`)
    }
  }
  for (const p of REG.policies) {
    assert.match(p.url, URL_RX, p.carrier)
    assert.ok(shortQuote(p.statement), `${p.carrier}: statement longer than a short quote`)
  }
})

/* И261: имя службы — данные. В коде шаблона витрины его нет нигде, кроме
   образца данных lib/shipping.ts: страница, которая пишет имя службы сама,
   прибита к одному рынку. */
test('carriers: the storefront template names no carrier outside its sample data', () => {
  const names = REG.countries.flatMap((c) => c.carriers.map((k) => k.name)).filter((n) => n.length > 3)
  const base = join(ROOT, 'templates/storefront')
  const files = []
  const walk = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n)
      if (statSync(p).isDirectory()) { if (!['node_modules', '.next', 'docs', 'tests'].includes(n)) walk(p) }
      else if (/\.(tsx?|mjs|css|json)$/.test(n)) files.push(p)
    }
  }
  walk(base)
  const SAMPLE = new Set(['lib/shipping.ts'])
  const hits = []
  for (const f of files) {
    const rel = relative(base, f).replaceAll('\\', '/')
    if (SAMPLE.has(rel)) continue
    const text = readFileSync(f, 'utf8')
    for (const n of names) if (text.includes(n)) hits.push(`${rel}: ${n}`)
  }
  assert.deepEqual(hits, [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (из корня набора): `node --test selftest/carriers.test.mjs`
Expected: FAIL — `ENOENT … carriers.json`.

- [ ] **Step 3: Build `carriers.json`** из файлов исследования по форме и правилам сведения. Сводит скрипт в папке задания (не в наборе): читает файлы исследования, приводит поля к форме, упорядочивает страны, выбрасывает закрытые службы, пишет JSON с отступом 2 и одним переводом строки в конце.

- [ ] **Step 4: Write `skills/site-building/references/delivery.md`** — по-русски, **порядком, а не складом** (И217). Разделы — буквально в этом порядке:

1. `# Доставка и оплата — общий механизм` и абзац: откуда — слово заказчика 23.09.2026 (цитаты — из раздела «Доставка и оплата — общий механизм» замысла `docs/superpowers/specs/2026-09-23-storefront-ro-design.md`).
2. `## Порядок работы` — нумерованные шаги: (1) найти страну рынка в `assets/commerce/carriers.json`; (2) заказчик выбирает 2–4 службы — одну до двери, сеть пунктов выдачи или постаматов — и решает про наложенный платёж; ему показывается таблица его страны словами, не кодами; (3) завести способы доставки в Vendure: код способа — id способа витрины, вид `address`/`pickup` и имя службы — поля способа; (4) точки выдачи — адаптер к списку точек службы (`api.points`) или её виджет, поиск по городу; (5) способы оплаты — обработчики на сервере Vendure; наложенный платёж — свой обработчик; тестовый в бой не идёт; (6) страница «Доставка и оплата» — таблицей из того же списка, что выбор на оформлении (И95 скилла `shop`); (7) до запуска — письменно спросить службу о пересылке CBD (раздел «Что службы пишут о CBD»).
3. `## Устройство в витрине` — вид способа `address | pickup`, тип точки `office | locker | partner | shop`; как `services` справочника ложатся на них: `door` → `address`; `office` → `pickup` с типом `office` или `partner`; `locker` → `pickup` с типом `locker`. Самовывоз — пункт выдачи с одной точкой `shop`. Оплата — `on-delivery | transfer | online`; недопустимая показывается выключенной с причиной. Итоги считает источник. Ссылка на договор: `templates/storefront/lib/source/contract.ts`.
4. `## Справочник по странам` — таблица «страна | до двери | пункты и постаматы | наложенный платёж» по всем 24 странам, только из `carriers.json`; строкой ниже — дата проверки и «перепроверять перед запуском».
5. `## Чем пользуются магазины CBD` — по странам из `cbd`: какие службы чаще, обычен ли наложенный платёж; отдельно — магазины, шлющие по ЕС из одного склада (`crossBorder`).
6. `## Что службы пишут о CBD` — из `policies`, с адресами; вывод одной строкой: запрет пишут не все, отсутствие строки — не разрешение, спрашивать у службы письменно.
7. `## Что изменилось` — закрытия и слияния из исследования (Fastway Ireland; Sameday в Венгрии; Packeta и Foxpost в Венгрии; D Express и City Express в Сербии) с адресами.
8. `## Как проверить чужую витрину` — таблица «искать | что значит»: имя службы в компоненте или странице; способ оплаты спрятан, а не выключен с причиной; тысячи точек списком без поиска; цена доставки считается в интерфейсе; таблица «Доставка и оплата» набрана отдельно от способов оформления; наложенный платёж обещан словами, а в способах его нет.

- [ ] **Step 5: Links.** В `skills/site-building/SKILL.md` — строка справочника рядом со строкой `vendure.md`, в формате соседних строк: `delivery.md` — доставка и оплата как общий механизм, службы по странам. В `skills/site-building/references/vendure.md`, раздел «Оформление — машина состояний заказа», после абзаца «Шаги адресуемы…» — строка: `Способы доставки и оплаты — общий механизм, службы по странам: [delivery.md](delivery.md).`

- [ ] **Step 6: Rule И261** — в конец `docs/rules.md`, формат И259:

```markdown
## И261 · Доставка — общий механизм, служба — данные

**Дефект.** 23.09.2026. Замысел образцовой витрины записал видом доставки
«постамат (easybox и подобные)», а план 2 начинался словами «доставка в
постамат easybox». easybox — сеть одной службы одного рынка; витрина,
которая знает её по имени, на другом рынке переписывается. Заказчик
остановил: «не почтомат изибокс, а служба доставки универсальная — мы ж
скил делаем универсальный»; «в скиле собери основные варианты доставки по
странам».

**Как писать.** Вид способа доставки — закрытый список из двух: до двери
(`address`) и пункт выдачи (`pickup`; тип точки — отделение, постамат,
партнёр, магазин продавца). Имя службы, цена, срок и точки — данные
источника. Какие службы у страны, что они умеют и чем пользуются магазины
CBD — справочник `skills/site-building/assets/commerce/carriers.json`, у
каждого факта адрес источника, у справочника дата проверки; порядок работы
— `skills/site-building/references/delivery.md`.

**Чем меряется.** `selftest/carriers.test.mjs`: форма справочника, источник
у каждого факта, короткие цитаты; имени службы из справочника нет в коде
шаблона витрины нигде, кроме образца данных `lib/shipping.ts`.
```

- [ ] **Step 7: Run tests**

Run: `node --test selftest/carriers.test.mjs && node tools/check-rules.mjs && node skills/site-building/scripts/check-resources.mjs`
Expected: PASS, `check-rules` без находок. Если третий тест находит имя службы в `lib/pages.ts` или `lib/docs.json` (тексты образца пока называют сеть), эти два файла на этом шаге добавляются в `SAMPLE` строкой с комментарием `/* до Task 8: тексты образца ещё называют сеть */` — Task 8 это исключение снимает.

- [ ] **Step 8: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add skills/site-building/assets/commerce/carriers.json skills/site-building/references/delivery.md skills/site-building/SKILL.md skills/site-building/references/vendure.md selftest/carriers.test.mjs docs/rules.md
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Справочник служб доставки по 24 странам и чем пользуются магазины CBD; доставка — общий механизм; И261" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Договор покупки и образец покупки

**Files:**
- Modify: `templates/storefront/lib/source/contract.ts`, `templates/storefront/lib/source/index.ts`, `templates/storefront/lib/market.ts`
- Create: `templates/storefront/lib/shipping.ts`, `templates/storefront/lib/checkout-steps.ts`, `templates/storefront/lib/source/sample/commerce.ts`
- Test: `templates/storefront/tests/commerce.test.ts`, `templates/storefront/tests/checkout-steps.test.ts`

**Interfaces:**
- Consumes: `PRODUCTS`, `SampleProduct`, `SampleVariant` (`lib/products.ts`); `bottle()` (`lib/source/sample/art.ts`); `MARKET` (`lib/market.ts`); `money()` (`lib/money.ts`); имена служб Румынии — из `skills/site-building/assets/commerce/carriers.json` (Task 1).
- Produces:
  - типы договора (ниже, буквально) и `Commerce`;
  - `commerce(): Commerce` из `lib/source/index.ts`;
  - `sampleCommerce: Commerce`, `resetSample(): void`, `FIXTURES` — из `lib/source/sample/commerce.ts`;
  - `STEPS`, `type Step = 'contact' | 'delivery' | 'payment'`, `deliveryReady(d: Delivery | null): boolean`, `stepFor(c: Checkout | null, asked: Step): Step | 'cart'` — из `lib/checkout-steps.ts`;
  - `MARKET.postal = { pattern: '^\\d{6}$', example: '010011' }`.

- [ ] **Step 1: Contract** — дописать в конец `lib/source/contract.ts`:

```ts
/* ── Покупка ─────────────────────────────────────────────────────────────
   Корзина, оформление, заказ. Итоги, скидку, доставку и допустимость оплаты
   считает источник (Vendure — сервер; образец — sample/commerce.ts), витрина
   не складывает цены. Доставка и оплата — общий механизм (И261): вид способа
   — закрытый список, имя службы — строка данных. */
export type CartLine = {
  id: string; productId: string; variantId: string; name: string
  options: { group: string; code: string; name: string }[]
  image: Image; unit: Money; quantity: number; total: Money
}
export type Cart = {
  lines: CartLine[]; quantity: number; subtotal: Money
  discounts: { code: string; amount: Money }[]; delivery: Money | null; total: Money
}
export type DeliveryKind = 'address' | 'pickup'
export type PointType = 'office' | 'locker' | 'partner' | 'shop'
export type DeliveryMethod = {
  id: string; kind: DeliveryKind; carrier: string | null; name: string; description: string
  price: Money; days: { min: number; max: number } | null
}
export type PickupPoint = { id: string; type: PointType; name: string; address: string; city: string; hours: string | null }
export type Address = { street: string; city: string; region: string; postalCode: string; country: string }
export type Contact = { email: string; firstName: string; lastName: string; phone: string }
export type Delivery = { method: DeliveryMethod; address: Address | null; point: PickupPoint | null }
export type DeliveryChoice = { methodId: string; address: Address | null; pointId: string | null }
export type PaymentKind = 'on-delivery' | 'transfer' | 'online'
export type PaymentMethod = { code: string; kind: PaymentKind; name: string; description: string; eligible: boolean; reason: string | null }
export type Checkout = { cart: Cart; contact: Contact | null; delivery: Delivery | null }
export type Order = { code: string; placedAt: string; contact: Contact; delivery: Delivery; payment: PaymentMethod; cart: Cart }
export type CommerceError =
  | 'unavailable' | 'not-found' | 'out-of-stock' | 'quantity'
  | 'coupon-invalid' | 'coupon-expired'
  | 'empty-cart' | 'no-contact' | 'no-delivery' | 'point-missing'
  | 'payment-ineligible' | 'payment-declined'
/** Запись. `added` — только у частичного успеха: сколько на самом деле в
 *  строке после записи, когда просили больше, чем есть на складе. */
export type Change<T> = { ok: true; value: T; added?: number } | { ok: false; error: CommerceError }

/** Покупка: Vendure в плане 4, образец — сейчас. `session` — непрозрачный
 *  ключ сессии из cookie; `null` — сессии ещё нет. Первое добавление её
 *  заводит и возвращает. */
export type Commerce = {
  checkout(session: string | null, lang: Lang): Promise<Result<Checkout | null>>
  add(session: string | null, lang: Lang, variantId: string, quantity: number): Promise<{ session: string | null; change: Change<Cart> }>
  setQuantity(session: string, lang: Lang, lineId: string, quantity: number): Promise<Change<Cart>>
  remove(session: string, lang: Lang, lineId: string): Promise<Change<Cart>>
  applyCoupon(session: string, lang: Lang, code: string): Promise<Change<Cart>>
  removeCoupon(session: string, lang: Lang, code: string): Promise<Change<Cart>>
  setContact(session: string, lang: Lang, contact: Contact): Promise<Change<Checkout>>
  deliveryMethods(session: string | null, lang: Lang): Promise<Result<DeliveryMethod[]>>
  /** Точки способа `pickup`. Пустой город — все точки, если их у способа
   *  мало (магазин продавца), иначе пусто: тысячи постаматов списком не
   *  отдаются, их ищут по городу. */
  pickupPoints(lang: Lang, methodId: string, city: string): Promise<Result<PickupPoint[]>>
  setDelivery(session: string, lang: Lang, choice: DeliveryChoice): Promise<Change<Checkout>>
  paymentMethods(session: string, lang: Lang): Promise<Result<PaymentMethod[]>>
  placeOrder(session: string, lang: Lang, paymentCode: string): Promise<Change<Order>>
  lastOrder(session: string | null, lang: Lang): Promise<Result<Order | null>>
}
```

- [ ] **Step 2: Market** — в `lib/market.ts` заменить строку `MARKET` на:

```ts
/* Рынок шаблона — Румыния. Валюта, её запись и запись индекса — факты рынка,
   не вёрстки: проверка поля берёт образец отсюда, а не из кода формы. */
export const MARKET = {
  country: 'RO', currency: 'RON', precision: 2, display: 'narrowSymbol',
  postal: { pattern: '^\\d{6}$', example: '010011' },
} as const
```

- [ ] **Step 3: Sample data** — `lib/shipping.ts`:

```ts
import type { Lang } from './locale.ts'

type T = Record<Lang, string>
export type SampleMethod = { id: string; kind: 'address' | 'pickup'; carrier: string | null; name: T; description: T; price: number; days: [number, number] | null }
export type SamplePoint = { id: string; method: string; type: 'office' | 'locker' | 'partner' | 'shop'; name: string; address: string; city: string; hours: T | null }
export type SamplePayment = { code: string; kind: 'on-delivery' | 'transfer'; name: T; description: T; limit: number | null; reason: T | null }

const H = (ro: string, en: string, hu: string): T => ({ ro, en, hu })

/* Образец служб рынка — данные, не код (И261). Имена служб Румынии — из
   справочника набора (skills/site-building/assets/commerce/carriers.json);
   какие службы возьмёт магазин, решает заказчик. Цены, сроки и точки —
   образец: настоящие назначает магазин в Vendure, точки приходят от службы.
   Точки выдуманы и помечены «exemplu». */
export const METHODS: SampleMethod[] = [
  {
    id: 'curier', kind: 'address', carrier: 'FAN Courier', price: 1999, days: [1, 2],
    name: H('Curier la domiciliu', 'Courier to your door', 'Futár házhoz'),
    description: H('Curierul vă sună înainte de livrare.', 'The courier calls you before delivery.', 'A futár kiszállítás előtt felhívja.'),
  },
  {
    id: 'locker', kind: 'pickup', carrier: 'Sameday', price: 1299, days: [1, 2],
    name: H('Locker', 'Parcel locker', 'Csomagautomata'),
    description: H('Ridicați coletul oricând, cu codul primit prin SMS.', 'Collect the parcel any time with the code sent by text message.', 'Az SMS-ben kapott kóddal bármikor átveheti a csomagot.'),
  },
  {
    id: 'magazin', kind: 'pickup', carrier: null, price: 0, days: null,
    name: H('Ridicare din magazin', 'Pick up at our shop', 'Átvétel az üzletben'),
    description: H('Comanda este gata de ridicare în 24 de ore.', 'Your order is ready to collect within 24 hours.', 'A rendelés 24 órán belül átvehető.'),
  },
]

const OPEN = H('Luni–vineri 10:00–18:00', 'Monday–Friday 10:00–18:00', 'Hétfő–péntek 10:00–18:00')

export const POINTS: SamplePoint[] = [
  { id: 'lk-buc-1', method: 'locker', type: 'locker', name: 'Locker Piața Romană (exemplu)', address: 'Bd. Exemplului 1', city: 'București', hours: null },
  { id: 'lk-buc-2', method: 'locker', type: 'locker', name: 'Locker Titan (exemplu)', address: 'Str. Exemplului 12', city: 'București', hours: null },
  { id: 'lk-buc-3', method: 'locker', type: 'locker', name: 'Locker Drumul Taberei (exemplu)', address: 'Str. Exemplului 30', city: 'București', hours: null },
  { id: 'lk-clj-1', method: 'locker', type: 'locker', name: 'Locker Mărăști (exemplu)', address: 'Str. Exemplului 5', city: 'Cluj-Napoca', hours: null },
  { id: 'lk-clj-2', method: 'locker', type: 'locker', name: 'Locker Zorilor (exemplu)', address: 'Str. Exemplului 9', city: 'Cluj-Napoca', hours: null },
  { id: 'lk-is-1', method: 'locker', type: 'locker', name: 'Locker Copou (exemplu)', address: 'Bd. Exemplului 3', city: 'Iași', hours: null },
  { id: 'lk-tm-1', method: 'locker', type: 'locker', name: 'Locker Iosefin (exemplu)', address: 'Str. Exemplului 7', city: 'Timișoara', hours: null },
  { id: 'lk-bv-1', method: 'locker', type: 'locker', name: 'Locker Tractorul (exemplu)', address: 'Str. Exemplului 21', city: 'Brașov', hours: null },
  { id: 'mg-buc', method: 'magazin', type: 'shop', name: 'Magazinul nostru (exemplu)', address: 'Str. Exemplului 10', city: 'București', hours: OPEN },
]

export const PAYMENTS: SamplePayment[] = [
  {
    code: 'ramburs', kind: 'on-delivery', limit: 200000,
    name: H('Plata la livrare (ramburs)', 'Cash on delivery', 'Utánvét'),
    description: H('Plătiți la primirea coletului.', 'Pay when the parcel arrives.', 'A csomag átvételekor fizet.'),
    reason: H('Plata la livrare este disponibilă pentru comenzi de până la {limit}.', 'Cash on delivery is available for orders up to {limit}.', 'Utánvét {limit} értékig választható.'),
  },
  {
    code: 'transfer', kind: 'transfer', limit: null, reason: null,
    name: H('Transfer bancar', 'Bank transfer', 'Banki átutalás'),
    description: H('Trimitem datele de plată după plasarea comenzii; expediem după ce primim plata.', 'We send the payment details after you order and ship once the payment arrives.', 'A rendelés után elküldjük az utalási adatokat; a befizetés után szállítunk.'),
  },
]

/* Коды скидки образца. Map, а не объект: код приходит от покупателя, и
   «constructor» не должен найтись в прототипе. */
export const COUPONS = new Map<string, { percent: number; expired: boolean }>([
  ['CBD10', { percent: 10, expired: false }],
  ['EXPIRAT', { percent: 15, expired: true }],
])
```

- [ ] **Step 4: Write the failing tests** — `tests/checkout-steps.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stepFor, deliveryReady } from '../lib/checkout-steps.ts'
import type { Checkout, Delivery, DeliveryMethod } from '../lib/source/contract.ts'

const RON = (minor: number) => ({ minor, currency: 'RON' })
const cart = (n: number): Checkout['cart'] => ({
  lines: Array.from({ length: n }, (_, i) => ({ id: `l${i}`, productId: 'p', variantId: 'v', name: 'P', options: [], image: { src: '', alt: '', width: 1, height: 1 }, unit: RON(100), quantity: 1, total: RON(100) })),
  quantity: n, subtotal: RON(100 * n), discounts: [], delivery: null, total: RON(100 * n),
})
const door: DeliveryMethod = { id: 'd', kind: 'address', carrier: null, name: 'D', description: '', price: RON(0), days: null }
const pick: DeliveryMethod = { ...door, id: 'p', kind: 'pickup' }
const contact = { email: 'a@example.com', firstName: 'A', lastName: 'B', phone: '0722000000' }
const address = { street: 'S 1', city: 'C', region: 'R', postalCode: '010011', country: 'RO' }
const point = { id: 'x', type: 'locker' as const, name: 'X', address: 'A', city: 'C', hours: null }

test('delivery is ready only with its address or its point', () => {
  const d = (over: Partial<Delivery>): Delivery => ({ method: door, address: null, point: null, ...over })
  assert.equal(deliveryReady(null), false)
  assert.equal(deliveryReady(d({})), false)
  assert.equal(deliveryReady(d({ address })), true)
  assert.equal(deliveryReady(d({ method: pick })), false)
  assert.equal(deliveryReady(d({ method: pick, point })), true)
})

test('the server decides the step: empty cart, then the first unfinished step', () => {
  assert.equal(stepFor(null, 'payment'), 'cart')
  assert.equal(stepFor({ cart: cart(0), contact, delivery: null }, 'contact'), 'cart')
  const base: Checkout = { cart: cart(1), contact: null, delivery: null }
  assert.equal(stepFor(base, 'contact'), 'contact')
  assert.equal(stepFor(base, 'payment'), 'contact')
  const known = { ...base, contact }
  assert.equal(stepFor(known, 'delivery'), 'delivery')
  assert.equal(stepFor(known, 'payment'), 'delivery')
  const ready = { ...known, delivery: { method: door, address, point: null } }
  assert.equal(stepFor(ready, 'payment'), 'payment')
  assert.equal(stepFor(ready, 'contact'), 'contact')
})
```

и `tests/commerce.test.ts`:

```ts
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { sampleCommerce as c, resetSample, FIXTURES } from '../lib/source/sample/commerce.ts'
import { stepFor } from '../lib/checkout-steps.ts'
import type { Address, Contact } from '../lib/source/contract.ts'

const CONTACT: Contact = { email: 'ion@example.com', firstName: 'Ion', lastName: 'Ionescu', phone: '0722 000 000' }
const ADDRESS: Address = { street: 'Str. Test 2', city: 'Cluj-Napoca', region: 'Cluj', postalCode: '400001', country: 'RO' }
const RON = (minor: number) => ({ minor, currency: 'RON' })

beforeEach(() => resetSample())

async function fresh(variant = 'uf-20-10', qty = 1): Promise<string> {
  const r = await c.add(null, 'ro', variant, qty)
  assert.ok(r.session && r.change.ok)
  return r.session
}

test('add: the first item opens a session, a line and totals from the source', async () => {
  const r = await c.add(null, 'ro', 'uf-20-10', 2)
  assert.ok(r.session && r.change.ok)
  const cart = r.change.value
  assert.equal(cart.lines.length, 1)
  assert.equal(cart.quantity, 2)
  assert.deepEqual(cart.subtotal, RON(43980))
  assert.equal(cart.delivery, null)
  assert.deepEqual(cart.total, RON(43980))
  assert.equal(r.change.added, undefined)
  assert.deepEqual(cart.lines[0].options.map((o) => `${o.group}=${o.code}:${o.name}`), ['putere=20:20 %', 'volum=10:10 ml'])
})

test('add: the same variant twice is one line; limits are loud', async () => {
  const s = await fresh('uf-20-10', 1)
  const again = await c.add(s, 'ro', 'uf-20-10', 2)
  assert.equal(again.session, s)
  assert.ok(again.change.ok)
  assert.equal(again.change.value.lines.length, 1)
  assert.equal(again.change.value.lines[0].quantity, 3)
  assert.deepEqual((await c.add(s, 'ro', 'nu-exista', 1)).change, { ok: false, error: 'not-found' })
  assert.deepEqual((await c.add(s, 'ro', 'uf-30-10', 1)).change, { ok: false, error: 'out-of-stock' })
  for (const q of [0, 100, 1.5]) assert.deepEqual((await c.add(s, 'ro', 'uf-20-10', q)).change, { ok: false, error: 'quantity' })
  const none = await c.add(null, 'ro', 'uf-30-10', 1)
  assert.equal(none.session, null)
})

test('add: more than in stock is a partial success with what was added', async () => {
  const r = await c.add(null, 'ro', 'uf-10-30', 5)
  assert.ok(r.change.ok)
  assert.equal(r.change.added, 3)
  assert.equal(r.change.value.lines[0].quantity, 3)
})

test('setQuantity caps at stock, remove drops the line, unknown lines are not found', async () => {
  const s = await fresh('cc-60', 1)
  const line = { id: 'l1' }
  const capped = await c.setQuantity(s, 'ro', line.id, 9)
  assert.ok(capped.ok)
  assert.equal(capped.added, 3)
  assert.equal(capped.value.lines[0].quantity, 3)
  assert.deepEqual(await c.setQuantity(s, 'ro', line.id, 0), { ok: false, error: 'quantity' })
  assert.deepEqual(await c.setQuantity(s, 'ro', 'l999', 1), { ok: false, error: 'not-found' })
  const gone = await c.remove(s, 'ro', line.id)
  assert.ok(gone.ok)
  assert.equal(gone.value.lines.length, 0)
  assert.deepEqual(await c.remove(s, 'ro', line.id), { ok: false, error: 'not-found' })
})

test('coupons: the source takes the discount; wrong and expired codes are told apart', async () => {
  const s = await fresh('uf-20-10', 1)
  const applied = await c.applyCoupon(s, 'ro', ' cbd10 ')
  assert.ok(applied.ok)
  assert.deepEqual(applied.value.discounts, [{ code: 'CBD10', amount: RON(2199) }])
  assert.deepEqual(applied.value.total, RON(19791))
  assert.deepEqual(await c.applyCoupon(s, 'ro', 'EXPIRAT'), { ok: false, error: 'coupon-expired' })
  assert.deepEqual(await c.applyCoupon(s, 'ro', 'constructor'), { ok: false, error: 'coupon-invalid' })
  const removed = await c.removeCoupon(s, 'ro', 'CBD10')
  assert.ok(removed.ok)
  assert.deepEqual(removed.value.discounts, [])
})

test('delivery: methods are data; points are searched by town unless there are few', async () => {
  const m = await c.deliveryMethods(null, 'ro')
  assert.ok(m.ok)
  assert.deepEqual(m.value.map((x) => `${x.id}:${x.kind}`), ['curier:address', 'locker:pickup', 'magazin:pickup'])
  assert.deepEqual(await c.pickupPoints('ro', 'locker', ''), { ok: true, value: [] })
  const buc = await c.pickupPoints('ro', 'locker', 'bucuresti')
  assert.ok(buc.ok)
  assert.equal(buc.value.length, 3)
  assert.ok(buc.value.every((p) => p.city === 'București' && p.type === 'locker'))
  const shop = await c.pickupPoints('ro', 'magazin', '')
  assert.ok(shop.ok)
  assert.deepEqual(shop.value.map((p) => p.type), ['shop'])
  assert.deepEqual(await c.pickupPoints('ro', 'curier', 'x'), { ok: false, reason: 'not-found' })
})

test('setDelivery: a foreign point is refused, a one-point method is chosen whole, the same method keeps details', async () => {
  const s = await fresh()
  assert.deepEqual(await c.setDelivery(s, 'ro', { methodId: 'locker', address: null, pointId: 'mg-buc' }), { ok: false, error: 'point-missing' })
  const shop = await c.setDelivery(s, 'ro', { methodId: 'magazin', address: null, pointId: null })
  assert.ok(shop.ok)
  assert.equal(shop.value.delivery?.point?.id, 'mg-buc')
  assert.deepEqual(shop.value.cart.delivery, RON(0))
  const door = await c.setDelivery(s, 'ro', { methodId: 'curier', address: ADDRESS, pointId: null })
  assert.ok(door.ok)
  const again = await c.setDelivery(s, 'ro', { methodId: 'curier', address: null, pointId: null })
  assert.ok(again.ok)
  assert.deepEqual(again.value.delivery?.address, ADDRESS)
  assert.deepEqual(again.value.cart.delivery, RON(1999))
})

test('payments: a method over its limit is shown with a reason, not hidden', async () => {
  const s = await fresh('ul-20-30', 5)
  const r = await c.paymentMethods(s, 'ro')
  assert.ok(r.ok)
  const cod = r.value.find((p) => p.code === 'ramburs')
  assert.ok(cod)
  assert.equal(cod.eligible, false)
  assert.equal(cod.reason, 'Plata la livrare este disponibilă pentru comenzi de până la 2.000,00\u00a0lei.')
  assert.equal(r.value.find((p) => p.code === 'transfer')?.eligible, true)
})

test('placeOrder: every precondition is checked by the source, then the cart is emptied', async () => {
  const empty = (await c.add(null, 'ro', 'uf-20-10', 1)).session
  assert.ok(empty)
  assert.deepEqual(await c.placeOrder(empty, 'ro', 'ramburs'), { ok: false, error: 'no-contact' })
  await c.setContact(empty, 'ro', CONTACT)
  assert.deepEqual(await c.placeOrder(empty, 'ro', 'ramburs'), { ok: false, error: 'no-delivery' })
  await c.setDelivery(empty, 'ro', { methodId: 'curier', address: ADDRESS, pointId: null })
  assert.deepEqual(await c.placeOrder(empty, 'ro', 'card'), { ok: false, error: 'payment-ineligible' })
  const placed = await c.placeOrder(empty, 'ro', 'ramburs')
  assert.ok(placed.ok)
  assert.match(placed.value.code, /^RO[0-9A-F]{8}$/)
  assert.deepEqual(placed.value.cart.total, RON(21990 + 1999))
  const after = await c.checkout(empty, 'ro')
  assert.ok(after.ok && after.value)
  assert.equal(after.value.cart.lines.length, 0)
  assert.equal(after.value.contact, null)
  const last = await c.lastOrder(empty, 'ro')
  assert.ok(last.ok)
  assert.equal(last.value?.code, placed.value.code)
  assert.deepEqual(await c.lastOrder('someone-else', 'ro'), { ok: true, value: null })
  assert.deepEqual(await c.placeOrder(empty, 'ro', 'ramburs'), { ok: false, error: 'empty-cart' })
  assert.deepEqual(await c.setContact('nobody', 'ro', CONTACT), { ok: false, error: 'empty-cart' })
})

test('fixtures: the prepared sessions stand at their steps', async () => {
  const at = async (s: string) => {
    const r = await c.checkout(s, 'ro')
    assert.ok(r.ok)
    return r.value
  }
  assert.equal(stepFor(await at(FIXTURES.cart), 'payment'), 'contact')
  assert.equal(stepFor(await at(FIXTURES.contact), 'payment'), 'delivery')
  assert.equal(stepFor(await at(FIXTURES.address), 'payment'), 'delivery')
  assert.equal((await at(FIXTURES.pickup))?.delivery?.method.id, 'locker')
  const ready = await at(FIXTURES.ready)
  assert.equal(stepFor(ready, 'payment'), 'payment')
  assert.deepEqual(ready?.cart.total, RON(49970 - 4997 + 1999))
  const last = await c.lastOrder(FIXTURES.placed, 'ro')
  assert.ok(last.ok)
  assert.equal(last.value?.code, 'EXEMPLU1')
})
```

- [ ] **Step 5: Run tests to verify they fail**

Run (в демо после переустановки шаблона): `node tools/check-test.mjs tests/commerce.test.ts` и `node tools/check-test.mjs tests/checkout-steps.test.ts`
Expected: FAIL — модулей `lib/checkout-steps.ts` и `lib/source/sample/commerce.ts` нет.

- [ ] **Step 6: Steps** — `lib/checkout-steps.ts`:

```ts
import type { Checkout, Delivery } from './source/contract.ts'

export const STEPS = ['contact', 'delivery', 'payment'] as const
export type Step = (typeof STEPS)[number]

/** Доставка выбрана до конца: до двери — с адресом, пункт — с точкой. */
export const deliveryReady = (d: Delivery | null): boolean =>
  d !== null && (d.method.kind === 'address' ? d.address !== null : d.point !== null)

/** Куда пускать. Пустая корзина — на корзину; шаг, до которого не дошли, —
 *  на первый незаконченный. Решает сервер: адрес шага — только просьба
 *  (references/commerce-patterns.md, «Checkout и расширения»). */
export function stepFor(c: Checkout | null, asked: Step): Step | 'cart' {
  if (!c || !c.cart.lines.length) return 'cart'
  if (asked === 'contact' || !c.contact) return 'contact'
  if (asked === 'delivery' || !deliveryReady(c.delivery)) return 'delivery'
  return 'payment'
}
```

- [ ] **Step 7: Sample commerce** — `lib/source/sample/commerce.ts`:

```ts
import { randomBytes } from 'node:crypto'
import type { Lang } from '../../locale.ts'
import type {
  Address, Cart, CartLine, Change, Checkout, Commerce, CommerceError, Contact, Delivery,
  DeliveryChoice, DeliveryMethod, Money, Order, PaymentMethod, PickupPoint, Result,
} from '../contract.ts'
import { PRODUCTS, type SampleProduct, type SampleVariant } from '../../products.ts'
import { METHODS, POINTS, PAYMENTS, COUPONS, type SampleMethod, type SamplePoint } from '../../shipping.ts'
import { MARKET } from '../../market.ts'
import { money as moneyText } from '../../money.ts'
import { deliveryReady } from '../../checkout-steps.ts'
import { bottle } from './art.ts'

type Line = { id: string; variantId: string; quantity: number }
type State = { lines: Line[]; coupons: string[]; contact: Contact | null; delivery: DeliveryChoice | null; lastOrder: string | null; seq: number }
type Placed = { code: string; placedAt: string; session: string; lines: Line[]; coupons: string[]; contact: Contact; delivery: DeliveryChoice; payment: string }
type Store = { sessions: Map<string, State>; orders: Map<string, Placed> }

const MAX = 99
/* Способ, у которого точек не больше трёх, отдаёт их без города. */
const FEW = 3
/* Остаток образца: у данных каталога есть только «в наличии / мало / нет». */
const AVAILABLE = { in: 50, low: 3, out: 0 } as const
const money = (minor: number): Money => ({ minor, currency: MARKET.currency })
const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
const fail = <T,>(error: CommerceError): Change<T> => ({ ok: false, error })
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

/** Заготовленные сессии — корзина и шаги оформления уже заполнены: по ним
 *  отрисованные проверки меряют корзину и оформление полными (И263).
 *  Только у образца; у живого источника их нет. */
export const FIXTURES = {
  cart: 'sample-cart', contact: 'sample-contact', address: 'sample-address',
  pickup: 'sample-pickup', ready: 'sample-ready', placed: 'sample-placed',
} as const
const SAMPLE_CONTACT: Contact = { email: 'ana.popescu@example.com', firstName: 'Ana', lastName: 'Popescu', phone: '0722 123 456' }
const SAMPLE_ADDRESS: Address = { street: 'Str. Exemplului 1', city: 'București', region: 'București', postalCode: '010011', country: MARKET.country }

function seed(): Store {
  const lines = (): Line[] => [{ id: 'l1', variantId: 'uf-20-10', quantity: 1 }, { id: 'l2', variantId: 'cc-30', quantity: 2 }]
  const state = (over: Partial<State>): State => ({ lines: lines(), coupons: ['CBD10'], contact: null, delivery: null, lastOrder: null, seq: 2, ...over })
  const door: DeliveryChoice = { methodId: 'curier', address: SAMPLE_ADDRESS, pointId: null }
  return {
    sessions: new Map<string, State>([
      [FIXTURES.cart, state({})],
      [FIXTURES.contact, state({ contact: SAMPLE_CONTACT })],
      [FIXTURES.address, state({ contact: SAMPLE_CONTACT, delivery: { methodId: 'curier', address: null, pointId: null } })],
      [FIXTURES.pickup, state({ contact: SAMPLE_CONTACT, delivery: { methodId: 'locker', address: null, pointId: null } })],
      [FIXTURES.ready, state({ contact: SAMPLE_CONTACT, delivery: door })],
      [FIXTURES.placed, state({ lines: [], coupons: [], lastOrder: 'EXEMPLU1' })],
    ]),
    orders: new Map<string, Placed>([
      ['EXEMPLU1', { code: 'EXEMPLU1', placedAt: '2026-09-23T10:00:00.000Z', session: FIXTURES.placed, lines: lines(), coupons: ['CBD10'], contact: SAMPLE_CONTACT, delivery: door, payment: 'ramburs' }],
    ]),
  }
}

/* Корзины образца живут в памяти процесса и пропадают при перезапуске — как
   сказано в замысле. Хранилище — на globalThis: перезагрузка модуля в
   разработке не теряет корзину посреди оформления. */
const KEY = Symbol.for('storefront.sample.commerce')
const shelf = globalThis as unknown as Record<symbol, Store | undefined>
const store = (): Store => (shelf[KEY] ??= seed())
/** Для тестов: хранилище заново, заготовленные сессии на месте. */
export function resetSample(): void {
  shelf[KEY] = seed()
}
const live = (session: string | null): State | null => (session ? store().sessions.get(session) ?? null : null)
const token = () => randomBytes(24).toString('base64url')
const orderCode = () => `RO${randomBytes(4).toString('hex').toUpperCase()}`

function variantOf(id: string): { p: SampleProduct; v: SampleVariant } | null {
  for (const p of PRODUCTS) {
    const v = p.variants.find((x) => x.id === id)
    if (v) return { p, v }
  }
  return null
}

function lineOf(l: Line, lang: Lang): CartLine | null {
  const found = variantOf(l.variantId)
  if (!found) return null
  const { p, v } = found
  return {
    id: l.id, productId: p.id, variantId: v.id, name: p.name[lang],
    options: p.groups.map((g) => {
      const code = v.options[g.code] ?? ''
      return { group: g.code, code, name: g.options.find((o) => o.code === code)?.name[lang] ?? code }
    }),
    image: { src: bottle(p.hue, p.label), alt: p.name[lang], width: 800, height: 800 },
    unit: money(v.price), quantity: l.quantity, total: money(v.price * l.quantity),
  }
}

function cartOf(s: State, lang: Lang): Cart {
  const lines = s.lines.flatMap((l) => lineOf(l, lang) ?? [])
  const subtotal = lines.reduce((sum, l) => sum + l.total.minor, 0)
  const discounts = s.coupons.map((code) => ({ code, amount: money(Math.round((subtotal * (COUPONS.get(code)?.percent ?? 0)) / 100)) }))
  const method = s.delivery ? METHODS.find((m) => m.id === s.delivery?.methodId) : undefined
  const delivery = method ? money(method.price) : null
  const off = discounts.reduce((sum, d) => sum + d.amount.minor, 0)
  return {
    lines, quantity: lines.reduce((n, l) => n + l.quantity, 0), subtotal: money(subtotal),
    discounts, delivery, total: money(subtotal - off + (delivery?.minor ?? 0)),
  }
}

const methodOf = (m: SampleMethod, lang: Lang): DeliveryMethod => ({
  id: m.id, kind: m.kind, carrier: m.carrier, name: m.name[lang], description: m.description[lang],
  price: money(m.price), days: m.days ? { min: m.days[0], max: m.days[1] } : null,
})
const pointOf = (p: SamplePoint, lang: Lang): PickupPoint => ({
  id: p.id, type: p.type, name: p.name, address: p.address, city: p.city, hours: p.hours ? p.hours[lang] : null,
})
const pointsOf = (methodId: string) => POINTS.filter((p) => p.method === methodId)

function deliveryOf(choice: DeliveryChoice | null, lang: Lang): Delivery | null {
  const m = choice ? METHODS.find((x) => x.id === choice.methodId) : undefined
  if (!choice || !m) return null
  const point = choice.pointId ? pointsOf(m.id).find((p) => p.id === choice.pointId) : undefined
  return { method: methodOf(m, lang), address: m.kind === 'address' ? choice.address : null, point: point ? pointOf(point, lang) : null }
}

const checkoutOf = (s: State, lang: Lang): Checkout => ({ cart: cartOf(s, lang), contact: s.contact, delivery: deliveryOf(s.delivery, lang) })

function paymentsOf(total: number, lang: Lang): PaymentMethod[] {
  return PAYMENTS.map((p) => {
    const eligible = p.limit === null || total <= p.limit
    const limit = p.limit === null ? '' : moneyText(money(p.limit), lang)
    return {
      code: p.code, kind: p.kind, name: p.name[lang], description: p.description[lang], eligible,
      reason: eligible || !p.reason ? null : p.reason[lang].replace('{limit}', limit),
    }
  })
}

function orderOf(o: Placed, lang: Lang): Order {
  const cart = cartOf({ lines: o.lines, coupons: o.coupons, contact: o.contact, delivery: o.delivery, lastOrder: null, seq: 0 }, lang)
  const delivery = deliveryOf(o.delivery, lang)
  const payment = paymentsOf(cart.total.minor, lang).find((p) => p.code === o.payment)
  if (!delivery || !payment) throw new Error(`sample order ${o.code}: broken record`)
  return { code: o.code, placedAt: o.placedAt, contact: o.contact, delivery, payment, cart }
}

const valid = (q: number) => Number.isInteger(q) && q >= 1 && q <= MAX

export const sampleCommerce: Commerce = {
  async checkout(session, lang) {
    const s = live(session)
    return ok(s ? checkoutOf(s, lang) : null)
  },
  async add(session, lang, variantId, quantity) {
    if (!valid(quantity)) return { session, change: fail('quantity') }
    const found = variantOf(variantId)
    if (!found) return { session, change: fail('not-found') }
    const current = live(session)
    const line = current?.lines.find((l) => l.variantId === variantId)
    const room = Math.min(AVAILABLE[found.v.stock], MAX) - (line?.quantity ?? 0)
    if (room <= 0) return { session, change: fail('out-of-stock') }
    const added = Math.min(quantity, room)
    let key = session
    let s = current
    if (!s || !key) {
      key = token()
      s = { lines: [], coupons: [], contact: null, delivery: null, lastOrder: null, seq: 0 }
      store().sessions.set(key, s)
    }
    if (line) line.quantity += added
    else s.lines.push({ id: `l${++s.seq}`, variantId, quantity: added })
    const value = cartOf(s, lang)
    return { session: key, change: added < quantity ? { ok: true, value, added: (line?.quantity ?? added) } : { ok: true, value } }
  },
  async setQuantity(session, lang, lineId, quantity) {
    const s = live(session)
    const line = s?.lines.find((l) => l.id === lineId)
    if (!s || !line) return fail('not-found')
    if (!valid(quantity)) return fail('quantity')
    const found = variantOf(line.variantId)
    const cap = found ? Math.min(AVAILABLE[found.v.stock], MAX) : 0
    if (cap === 0) return fail('out-of-stock')
    line.quantity = Math.min(quantity, cap)
    const value = cartOf(s, lang)
    return line.quantity < quantity ? { ok: true, value, added: line.quantity } : { ok: true, value }
  },
  async remove(session, lang, lineId) {
    const s = live(session)
    if (!s || !s.lines.some((l) => l.id === lineId)) return fail('not-found')
    s.lines = s.lines.filter((l) => l.id !== lineId)
    return { ok: true, value: cartOf(s, lang) }
  },
  async applyCoupon(session, lang, code) {
    const s = live(session)
    if (!s) return fail('not-found')
    const key = code.trim().toUpperCase()
    const coupon = COUPONS.get(key)
    if (!coupon) return fail('coupon-invalid')
    if (coupon.expired) return fail('coupon-expired')
    if (!s.coupons.includes(key)) s.coupons = [...s.coupons, key]
    return { ok: true, value: cartOf(s, lang) }
  },
  async removeCoupon(session, lang, code) {
    const s = live(session)
    if (!s) return fail('not-found')
    s.coupons = s.coupons.filter((x) => x !== code)
    return { ok: true, value: cartOf(s, lang) }
  },
  async setContact(session, lang, contact) {
    const s = live(session)
    if (!s || !s.lines.length) return fail('empty-cart')
    s.contact = contact
    return { ok: true, value: checkoutOf(s, lang) }
  },
  async deliveryMethods(_session, lang) {
    return ok(METHODS.map((m) => methodOf(m, lang)))
  },
  async pickupPoints(lang, methodId, city) {
    const m = METHODS.find((x) => x.id === methodId && x.kind === 'pickup')
    if (!m) return { ok: false, reason: 'not-found' }
    const all = pointsOf(m.id)
    const want = fold(city)
    const found = all.length <= FEW ? all : want ? all.filter((p) => fold(p.city).startsWith(want)) : []
    return ok(found.map((p) => pointOf(p, lang)))
  },
  async setDelivery(session, lang, choice) {
    const s = live(session)
    if (!s || !s.lines.length) return fail('empty-cart')
    const m = METHODS.find((x) => x.id === choice.methodId)
    if (!m) return fail('not-found')
    const points = pointsOf(m.id)
    if (choice.pointId && !points.some((p) => p.id === choice.pointId)) return fail('point-missing')
    const keep = s.delivery?.methodId === m.id && !choice.address && !choice.pointId
    if (!keep) {
      /* Способ с одной точкой (магазин продавца) выбирается целиком: просить
         выбрать единственную точку — лишний шаг. */
      const only = m.kind === 'pickup' && points.length === 1 ? points[0].id : null
      s.delivery = {
        methodId: m.id,
        address: m.kind === 'address' ? choice.address : null,
        pointId: m.kind === 'pickup' ? (choice.pointId ?? only) : null,
      }
    }
    return { ok: true, value: checkoutOf(s, lang) }
  },
  async paymentMethods(session, lang) {
    const s = live(session)
    if (!s) return { ok: false, reason: 'not-found' }
    return ok(paymentsOf(cartOf(s, lang).total.minor, lang))
  },
  async placeOrder(session, lang, paymentCode) {
    const s = live(session)
    if (!s || !s.lines.length) return fail('empty-cart')
    if (!s.contact) return fail('no-contact')
    const checkout = checkoutOf(s, lang)
    if (!s.delivery || !deliveryReady(checkout.delivery)) return fail('no-delivery')
    const pay = paymentsOf(checkout.cart.total.minor, lang).find((p) => p.code === paymentCode)
    if (!pay || !pay.eligible) return fail('payment-ineligible')
    for (const l of s.lines) {
      const found = variantOf(l.variantId)
      if (!found || l.quantity > AVAILABLE[found.v.stock]) return fail('out-of-stock')
    }
    const placed: Placed = {
      code: orderCode(), placedAt: new Date().toISOString(), session,
      lines: s.lines, coupons: s.coupons, contact: s.contact, delivery: s.delivery, payment: pay.code,
    }
    store().orders.set(placed.code, placed)
    Object.assign(s, { lines: [], coupons: [], contact: null, delivery: null, lastOrder: placed.code })
    return { ok: true, value: orderOf(placed, lang) }
  },
  async lastOrder(session, lang) {
    const s = live(session)
    const placed = s?.lastOrder ? store().orders.get(s.lastOrder) : undefined
    return ok(placed && placed.session === session ? orderOf(placed, lang) : null)
  },
}
```

Заметки к коду: в `add` частичный успех возвращает `added` — количество в строке после записи (для новой строки это добавленное, для существующей — её новое количество); тест «more than in stock» проверяет новую строку. `placeOrder` при `session === null` не бывает — тип `string`.

- [ ] **Step 8: Source** — в `lib/source/index.ts`:

```ts
import type { Commerce, Content, Source } from './contract.ts'
import { sample } from './sample/catalog.ts'
import { sampleContent } from './sample/content.ts'
import { sampleCommerce } from './sample/commerce.ts'
```

и в конец файла:

```ts
export function commerce(): Commerce {
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sampleCommerce
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run (в демо после `node install.mjs --storefront --force D:\BusinessProject\cbd-storefront-demo` из корня набора): `npm test`, `npx tsc --noEmit`, `npm run check:code`, `npm run check:lint`, `npm run check:port`
Expected: все тесты PASS (новые — 11), остальное без новых находок.

- [ ] **Step 10: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add templates/storefront/lib/source/contract.ts templates/storefront/lib/source/index.ts templates/storefront/lib/market.ts templates/storefront/lib/shipping.ts templates/storefront/lib/checkout-steps.ts templates/storefront/lib/source/sample/commerce.ts templates/storefront/tests/commerce.test.ts templates/storefront/tests/checkout-steps.test.ts
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Витрина RO: договор покупки и образец — корзина, скидка, доставка как общий механизм, точки выдачи по городу, оплата с причиной недопустимости, заказ; заготовленные сессии" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Слова, адреса и корзина готовыми строками

**Files:**
- Modify: `templates/storefront/lib/i18n/{ro,en,hu}.ts`, `templates/storefront/lib/i18n/index.ts` (`tn` с доп. переменными), `templates/storefront/lib/href.ts`, `templates/storefront/lib/product-view.ts`, `templates/storefront/docs/words.md`, `docs/rules.md` (И262)
- Create: `templates/storefront/lib/cart-ops.ts`, `templates/storefront/lib/cart-view.ts`
- Test: `templates/storefront/tests/cart-ops.test.ts`, `templates/storefront/tests/cart-view.test.ts`; дописать `tests/href.test.ts`, `tests/i18n.test.ts`, `tests/product-view.test.ts`

**Interfaces:**
- Consumes: Task 2 — типы покупки, `sampleCommerce`, `resetSample`, `FIXTURES`, `type Step`.
- Produces:
  - `hrefFor(lang, { cart: true; result?: string })` → `/ro/cart[?r=…]`; `hrefFor(lang, { checkout: Step | 'done'; city?: string })` → `/ro/checkout/<шаг>[?city=…]`;
  - `tn(lang, base, n, vars?)` — доп. переменные рядом с `n`;
  - `lib/cart-ops.ts`: `type CartOp`, `type Outcome = { kind: 'ok' | 'partial' | 'error'; code: string; message: string; count: number | null }`, `readCartOp(form: FormData): CartOp | null`, `runCartOp(c, session, lang, op): Promise<{ session: string | null; code: string; count: number | null }>`, `outcomeOf(lang, code, count?): Outcome | null`;
  - `lib/cart-view.ts`: `type TotalsView`, `type CartLineView`, `type CartPageView`, `totalsView(lang, cart)`, `priceOrFree(lang, money)`, `cartView(lang, cart | null, result | null)`;
  - `ProductPageView.buy: BuyView` — `{ variant: string | null; add: string; quantity: string; view: { label: string; href: string }; timeout: string; failed: string }`.

- [ ] **Step 1: Write the failing tests.**

Дописать в `tests/href.test.ts`:

```ts
test('cart and checkout addresses', () => {
  assert.equal(hrefFor('ro', { cart: true }), '/ro/cart')
  assert.equal(hrefFor('ro', { cart: true, result: 'ok:add' }), '/ro/cart?r=ok%3Aadd')
  assert.equal(hrefFor('hu', { checkout: 'delivery' }), '/hu/checkout/delivery')
  assert.equal(hrefFor('ro', { checkout: 'delivery', city: 'București' }), '/ro/checkout/delivery?city=Bucure%C8%99ti')
  assert.equal(hrefFor('en', { checkout: 'done' }), '/en/checkout/done')
})
```

Дописать в `tests/i18n.test.ts` (ввоз `EN`, `HU` уже есть):

```ts
/* И262: кнопка заказа называет обязанность платить — Директива 2011/83/ЕС,
   ст. 8(2); без этого договор покупателя не обязывает. */
test('the order button names the obligation to pay', () => {
  assert.match(RO['order.place'], /obligație de plată/)
  assert.match(EN['order.place'], /obligation to pay/)
  assert.match(HU['order.place'], /fizetési kötelezettség/)
})

test('a range of days counts by its upper end', () => {
  assert.equal(tn('ro', 'delivery.span', 3, { min: 1 }), '1–3 zile lucrătoare')
  assert.equal(tn('ro', 'delivery.day', 1), '1 zi lucrătoare')
  assert.equal(tn('ro', 'delivery.day', 20), '20 de zile lucrătoare')
  assert.equal(tn('en', 'delivery.day', 1), '1 working day')
  assert.equal(tn('hu', 'delivery.span', 2, { min: 1 }), '1–2 munkanap')
})
```

Дописать в `tests/product-view.test.ts`:

```ts
test('buying: only a chosen variant in stock can go to the cart', async () => {
  const oil = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(oil.ok)
  assert.equal(productView('ro', oil.value, {}, none).buy.variant, null)
  assert.equal(productView('ro', oil.value, { putere: '20', volum: '10' }, none).buy.variant, 'uf-20-10')
  assert.equal(productView('ro', oil.value, { putere: '30', volum: '10' }, none).buy.variant, null)
  const cream = await sample.product('ro', 'crema-cbd')
  assert.ok(cream.ok)
  const buy = productView('ro', cream.value, {}, none).buy
  assert.equal(buy.variant, 'cr-50')
  assert.equal(buy.add, 'Adaugă în coș')
  assert.equal(buy.view.href, '/ro/cart')
})
```

Создать `tests/cart-ops.test.ts`:

```ts
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readCartOp, runCartOp, outcomeOf } from '../lib/cart-ops.ts'
import { sampleCommerce, resetSample, FIXTURES } from '../lib/source/sample/commerce.ts'

beforeEach(() => resetSample())
const form = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

test('the cart form says what it wants; the unknown is refused, not guessed', () => {
  assert.deepEqual(readCartOp(form({ op: 'add', variant: 'uf-20-10' })), { op: 'add', variantId: 'uf-20-10', quantity: 1 })
  assert.deepEqual(readCartOp(form({ op: 'add', variant: 'uf-20-10', quantity: ' 3 ' })), { op: 'add', variantId: 'uf-20-10', quantity: 3 })
  assert.deepEqual(readCartOp(form({ op: 'add', variant: 'uf-20-10', quantity: 'abc' })), { op: 'add', variantId: 'uf-20-10', quantity: -1 })
  assert.deepEqual(readCartOp(form({ op: 'set:l2:3' })), { op: 'set', lineId: 'l2', quantity: 3 })
  assert.deepEqual(readCartOp(form({ op: 'remove:l2' })), { op: 'remove', lineId: 'l2' })
  assert.deepEqual(readCartOp(form({ op: 'coupon', code: ' cbd10 ' })), { op: 'coupon', code: 'cbd10' })
  assert.deepEqual(readCartOp(form({ op: 'coupon' })), { op: 'coupon', code: '' })
  assert.deepEqual(readCartOp(form({ op: 'uncoupon:A:B' })), { op: 'uncoupon', code: 'A:B' })
  assert.equal(readCartOp(form({ op: 'add' })), null)
  assert.equal(readCartOp(form({ op: 'drop:l1' })), null)
  assert.equal(readCartOp(form({})), null)
})

test('running an operation returns the session, a code and the new count', async () => {
  const added = await runCartOp(sampleCommerce, null, 'ro', { op: 'add', variantId: 'uf-20-10', quantity: 2 })
  assert.ok(added.session)
  assert.deepEqual([added.code, added.count], ['ok:add', 2])
  const partial = await runCartOp(sampleCommerce, added.session, 'ro', { op: 'add', variantId: 'uf-10-30', quantity: 9 })
  assert.deepEqual([partial.code, partial.count], ['partial:3', 5])
  assert.equal((await runCartOp(sampleCommerce, null, 'ro', { op: 'remove', lineId: 'l1' })).code, 'e:not-found')
  assert.equal((await runCartOp(sampleCommerce, FIXTURES.cart, 'ro', { op: 'coupon', code: '' })).code, 'e:coupon-empty')
  assert.equal((await runCartOp(sampleCommerce, FIXTURES.cart, 'ro', { op: 'coupon', code: 'NU' })).code, 'e:coupon-invalid')
  assert.equal((await runCartOp(sampleCommerce, FIXTURES.cart, 'ro', null)).code, 'e:request')
  const set = await runCartOp(sampleCommerce, FIXTURES.cart, 'ro', { op: 'set', lineId: 'l2', quantity: 1 })
  assert.deepEqual([set.session, set.code, set.count], [FIXTURES.cart, 'ok:set', 2])
})

test('an outcome is read only from the closed list of codes', () => {
  assert.deepEqual(outcomeOf('ro', 'ok:add', 3), { kind: 'ok', code: 'ok:add', message: 'Produsul a fost adăugat în coș.', count: 3 })
  assert.equal(outcomeOf('ro', 'partial:3')?.message, 'Avem doar 3 buc. în stoc — atât sunt acum în coș.')
  assert.equal(outcomeOf('en', 'e:coupon-expired')?.message, 'This code has expired — use a valid one.')
  assert.equal(outcomeOf('ro', 'e:timeout')?.kind, 'error')
  for (const bad of ['ok:constructor', 'e:__proto__', 'partial:abc', 'x', '']) assert.equal(outcomeOf('ro', bad), null, bad)
})
```

Создать `tests/cart-view.test.ts`:

```ts
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { cartView, priceOrFree } from '../lib/cart-view.ts'
import { sampleCommerce, resetSample, FIXTURES } from '../lib/source/sample/commerce.ts'

beforeEach(() => resetSample())
const NB = '\u00a0'

async function fixtureCart(lang: 'ro' | 'hu' = 'ro') {
  const r = await sampleCommerce.checkout(FIXTURES.cart, lang)
  assert.ok(r.ok && r.value)
  return r.value.cart
}

test('a cart line: link back to its variant, unit price, quantity steps', async () => {
  const v = cartView('ro', await fixtureCart(), null)
  assert.equal(v.count, '3 produse')
  const [oil, caps] = v.lines
  assert.equal(oil.href, '/ro/product/ulei-cbd-full-spectrum?option.putere=20&option.volum=10')
  assert.equal(oil.options, '20 % · 10 ml')
  assert.equal(oil.unit, `219,90${NB}lei / buc.`)
  assert.equal(oil.total, `219,90${NB}lei`)
  assert.deepEqual([oil.less, oil.more, oil.remove], [null, 'set:l1:2', 'remove:l1'])
  assert.deepEqual([caps.less, caps.quantity], ['set:l2:1', 2])
  assert.equal(caps.labels.less, 'Scade cantitatea: Capsule CBD 25 mg')
})

test('totals are the source’s, as ready strings', async () => {
  const v = cartView('ro', await fixtureCart(), null)
  assert.deepEqual(v.totals.rows, [
    { label: 'Subtotal', value: `499,70${NB}lei` },
    { label: 'Reducere CBD10', value: `−49,97${NB}lei` },
    { label: 'Livrare', value: 'Se alege la pasul următor' },
  ])
  assert.deepEqual(v.totals.total, { label: 'Total', value: `449,73${NB}lei` })
  assert.equal(v.totals.note, 'Prețurile includ TVA.')
  assert.deepEqual(v.coupon.applied, [{ code: 'CBD10', op: 'uncoupon:CBD10', label: 'Elimină codul CBD10' }])
  assert.equal(v.checkout.href, '/ro/checkout/contact')
  assert.equal(cartView('hu', await fixtureCart('hu'), null).count, '3 termék')
})

test('the notice comes from a known code only; an empty cart says what next', () => {
  const empty = cartView('ro', null, 'ok:remove')
  assert.deepEqual(empty.lines, [])
  assert.equal(empty.notice?.message, 'Produsul a fost scos din coș.')
  assert.deepEqual(empty.empty, { title: 'Coșul este gol', step: 'Vedeți produsele', href: '/ro/catalog' })
  assert.equal(cartView('ro', null, 'nonsense').notice, null)
  assert.equal(priceOrFree('ro', { minor: 0, currency: 'RON' }), 'Gratuit')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run (в демо после переустановки): `npm test`
Expected: FAIL — нет `lib/cart-ops.ts`, `lib/cart-view.ts`, ключей слов, адресов корзины, поля `buy`.

- [ ] **Step 3: `tn` с переменными** — в `lib/i18n/index.ts` заменить функцию `tn`:

```ts
/** Счёт по правилам языка: по-румынски 1 produs, 12 produse, 20 de produse.
 *  Другие переменные строки — рядом со счётом: «1–3 zile» считается по 3. */
export function tn(lang: Lang, base: PluralBase, n: number, vars: Record<string, string | number> = {}): string {
  const form = new Intl.PluralRules(intlLocale(lang)).select(n)
  const key = (form === 'one' || form === 'few' ? `${base}.${form}` : `${base}.other`) as Key
  return t(lang, key, { ...vars, n })
}
```

- [ ] **Step 4: Words.** Дописать в конец объекта `RO` в `lib/i18n/ro.ts` (перед `} as const`):

```ts
  'nav.cart': 'Coș',
  'cart.title': 'Coșul dumneavoastră',
  'cart.lede': 'Verificați produsele, cantitățile și codul de reducere înainte de comandă.',
  'cart.empty': 'Coșul este gol',
  'cart.emptyStep': 'Vedeți produsele',
  'cart.unit': '{price} / buc.',
  'cart.quantity': 'Cantitate',
  'cart.less': 'Scade cantitatea: {name}',
  'cart.more': 'Crește cantitatea: {name}',
  'cart.removeName': 'Șterge din coș: {name}',
  'cart.summary': 'Sumar',
  'cart.subtotal': 'Subtotal',
  'cart.discount': 'Reducere {code}',
  'cart.minus': '−{amount}',
  'cart.delivery': 'Livrare',
  'cart.deliveryLater': 'Se alege la pasul următor',
  'cart.total': 'Total',
  'cart.vat': 'Prețurile includ TVA.',
  'cart.checkout': 'Finalizează comanda',
  'cart.coupon': 'Cod de reducere',
  'cart.apply': 'Aplică',
  'cart.couponRemove': 'Elimină codul {code}',
  'cart.add': 'Adaugă în coș',
  'cart.view': 'Vezi coșul',
  'cart.added': 'Produsul a fost adăugat în coș.',
  'cart.partial': 'Avem doar {n} buc. în stoc — atât sunt acum în coș.',
  'cart.updated': 'Cantitatea a fost actualizată.',
  'cart.removed': 'Produsul a fost scos din coș.',
  'cart.couponApplied': 'Codul de reducere a fost aplicat.',
  'cart.couponRemoved': 'Codul de reducere a fost eliminat.',
  'cart.error.outOfStock': 'Produsul nu mai este în stoc — alegeți altă variantă.',
  'cart.error.quantity': 'Alegeți o cantitate între 1 și 99.',
  'cart.error.gone': 'Produsul nu mai este în coș — reîncărcați pagina.',
  'cart.error.coupon': 'Codul nu este valabil — verificați-l și introduceți-l fără spații.',
  'cart.error.couponExpired': 'Codul a expirat — folosiți un cod valabil.',
  'cart.error.couponEmpty': 'Introduceți codul de reducere.',
  'cart.error.request': 'Cererea nu a putut fi citită — reîncărcați pagina și încercați din nou.',
  'cart.error.timeout': 'Nu am primit răspuns; am reîncărcat coșul — verificați-l înainte să încercați din nou.',
  'cart.error.unavailable': 'Magazinul nu răspunde momentan — încercați din nou peste un minut.',
  'checkout.title': 'Finalizarea comenzii',
  'checkout.lede': 'Date de contact, livrare și plată — trei pași.',
  'checkout.steps': 'Pașii comenzii',
  'checkout.step.contact': 'Date de contact',
  'checkout.step.delivery': 'Livrare',
  'checkout.step.payment': 'Plată',
  'checkout.continue': 'Continuă',
  'checkout.change': 'Modifică',
  'checkout.changeStep': 'Modifică: {step}',
  'checkout.back': 'Înapoi la coș',
  'checkout.fix': 'Corectați câmpurile marcate.',
  'field.email': 'E-mail',
  'field.firstName': 'Prenume',
  'field.lastName': 'Nume',
  'field.phone': 'Telefon',
  'field.street': 'Stradă și număr',
  'field.city': 'Localitate',
  'field.region': 'Județ',
  'field.postalCode': 'Cod poștal',
  'field.country': 'Țara',
  'field.emailEmpty': 'Introduceți adresa de e-mail pentru a primi confirmarea comenzii.',
  'field.emailShape': 'Adresa de e-mail pare incompletă, de exemplu nume@exemplu.ro.',
  'field.phoneShape': 'Introduceți numărul de telefon, de exemplu 0722 123 456.',
  'field.required': 'Completați câmpul pentru a continua.',
  'field.tooLong': 'Scurtați textul la cel mult {n} caractere.',
  'field.postal': 'Verificați codul poștal, de exemplu {example}.',
  'delivery.title': 'Cum livrăm',
  'delivery.kind.address': 'La adresă',
  'delivery.kind.pickup': 'Punct de ridicare',
  'delivery.free': 'Gratuit',
  'delivery.day.one': '{n} zi lucrătoare',
  'delivery.day.few': '{n} zile lucrătoare',
  'delivery.day.other': '{n} de zile lucrătoare',
  'delivery.span.one': '{min}–{n} zile lucrătoare',
  'delivery.span.few': '{min}–{n} zile lucrătoare',
  'delivery.span.other': '{min}–{n} de zile lucrătoare',
  'delivery.choose': 'Alege livrarea',
  'delivery.address': 'Adresa de livrare',
  'delivery.next': 'Continuă spre plată',
  'delivery.points': 'Punctul de ridicare',
  'delivery.find': 'Caută puncte',
  'delivery.cityPrompt': 'Scrieți localitatea pentru a vedea punctele de ridicare.',
  'delivery.noPoints': 'Niciun punct de ridicare în „{city}”',
  'delivery.noPointsStep': 'Încercați o localitate apropiată',
  'delivery.pointMissing': 'Alegeți un punct de ridicare din listă.',
  'delivery.methodMissing': 'Alegeți un mod de livrare.',
  'point.office': 'Oficiu',
  'point.locker': 'Locker',
  'point.partner': 'Punct partener',
  'point.shop': 'Magazin',
  'payment.title': 'Cum plătiți',
  'payment.missing': 'Alegeți un mod de plată.',
  'payment.declined': 'Plata nu a fost acceptată — alegeți alt mod de plată.',
  'payment.ineligible': 'Modul de plată ales nu este disponibil pentru această comandă — alegeți altul.',
  'order.review': 'Verificați comanda',
  'order.items': 'Produse',
  'order.line': '{name} × {n}',
  'order.name': '{first} {last}',
  'order.cityLine': '{postal} {city}',
  'order.terms': 'Plasând comanda, acceptați condițiile magazinului:',
  'order.place': 'Comandă cu obligație de plată',
  'done.title': 'Mulțumim! Comanda a fost plasată',
  'done.code': 'Numărul comenzii: {code}',
  'done.keep': 'Păstrați numărul comenzii — vă ajută dacă ne contactați.',
  'done.summary': 'Detaliile comenzii',
  'done.none': 'Nu există o comandă recentă de afișat',
  'done.noneStep': 'Mergeți la produse',
  'done.more': 'Continuați cumpărăturile',
```

В `lib/i18n/en.ts`:

```ts
  'nav.cart': 'Cart',
  'cart.title': 'Your cart',
  'cart.lede': 'Check the products, quantities and discount code before you order.',
  'cart.empty': 'Your cart is empty',
  'cart.emptyStep': 'See the products',
  'cart.unit': '{price} each',
  'cart.quantity': 'Quantity',
  'cart.less': 'Decrease quantity: {name}',
  'cart.more': 'Increase quantity: {name}',
  'cart.removeName': 'Remove from cart: {name}',
  'cart.summary': 'Summary',
  'cart.subtotal': 'Subtotal',
  'cart.discount': 'Discount {code}',
  'cart.minus': '−{amount}',
  'cart.delivery': 'Delivery',
  'cart.deliveryLater': 'Chosen at the next step',
  'cart.total': 'Total',
  'cart.vat': 'Prices include VAT.',
  'cart.checkout': 'Continue to checkout',
  'cart.coupon': 'Discount code',
  'cart.apply': 'Apply',
  'cart.couponRemove': 'Remove code {code}',
  'cart.add': 'Add to cart',
  'cart.view': 'View cart',
  'cart.added': 'Added to your cart.',
  'cart.partial': 'We only have {n} in stock — that is how many are in your cart now.',
  'cart.updated': 'Quantity updated.',
  'cart.removed': 'Removed from your cart.',
  'cart.couponApplied': 'Discount code applied.',
  'cart.couponRemoved': 'Discount code removed.',
  'cart.error.outOfStock': 'This item is out of stock — pick another option.',
  'cart.error.quantity': 'Choose a quantity between 1 and 99.',
  'cart.error.gone': 'That item is no longer in your cart — reload the page.',
  'cart.error.coupon': 'The code is not valid — check it and enter it without spaces.',
  'cart.error.couponExpired': 'This code has expired — use a valid one.',
  'cart.error.couponEmpty': 'Enter a discount code.',
  'cart.error.request': 'The request could not be read — reload the page and try again.',
  'cart.error.timeout': 'No answer came; your cart was reloaded — check it before trying again.',
  'cart.error.unavailable': 'The shop is not responding — try again in a minute.',
  'checkout.title': 'Checkout',
  'checkout.lede': 'Contact, delivery and payment — three steps.',
  'checkout.steps': 'Checkout steps',
  'checkout.step.contact': 'Contact details',
  'checkout.step.delivery': 'Delivery',
  'checkout.step.payment': 'Payment',
  'checkout.continue': 'Continue',
  'checkout.change': 'Change',
  'checkout.changeStep': 'Change: {step}',
  'checkout.back': 'Back to cart',
  'checkout.fix': 'Correct the marked fields.',
  'field.email': 'Email',
  'field.firstName': 'First name',
  'field.lastName': 'Last name',
  'field.phone': 'Phone',
  'field.street': 'Street and number',
  'field.city': 'Town or city',
  'field.region': 'County',
  'field.postalCode': 'Postcode',
  'field.country': 'Country',
  'field.emailEmpty': 'Enter your email to receive the order confirmation.',
  'field.emailShape': 'The email looks incomplete, e.g. name@example.com.',
  'field.phoneShape': 'Enter your phone number, e.g. 0722 123 456.',
  'field.required': 'Fill in this field to continue.',
  'field.tooLong': 'Shorten this to at most {n} characters.',
  'field.postal': 'Check the postcode, e.g. {example}.',
  'delivery.title': 'How we deliver',
  'delivery.kind.address': 'To your address',
  'delivery.kind.pickup': 'Pickup point',
  'delivery.free': 'Free',
  'delivery.day.one': '{n} working day',
  'delivery.day.few': '{n} working days',
  'delivery.day.other': '{n} working days',
  'delivery.span.one': '{min}–{n} working days',
  'delivery.span.few': '{min}–{n} working days',
  'delivery.span.other': '{min}–{n} working days',
  'delivery.choose': 'Choose delivery',
  'delivery.address': 'Delivery address',
  'delivery.next': 'Continue to payment',
  'delivery.points': 'Pickup point',
  'delivery.find': 'Find points',
  'delivery.cityPrompt': 'Enter your town to see the pickup points.',
  'delivery.noPoints': 'No pickup points in “{city}”',
  'delivery.noPointsStep': 'Try a nearby town',
  'delivery.pointMissing': 'Choose a pickup point from the list.',
  'delivery.methodMissing': 'Choose a delivery method.',
  'point.office': 'Office',
  'point.locker': 'Parcel locker',
  'point.partner': 'Partner point',
  'point.shop': 'Our shop',
  'payment.title': 'How you pay',
  'payment.missing': 'Choose a payment method.',
  'payment.declined': 'The payment was not accepted — choose another method.',
  'payment.ineligible': 'This payment method is not available for this order — choose another.',
  'order.review': 'Review your order',
  'order.items': 'Items',
  'order.line': '{name} × {n}',
  'order.name': '{first} {last}',
  'order.cityLine': '{postal} {city}',
  'order.terms': 'By placing the order you accept the shop terms:',
  'order.place': 'Order with obligation to pay',
  'done.title': 'Thank you! Your order is placed',
  'done.code': 'Order number: {code}',
  'done.keep': 'Keep this number — it helps if you contact us.',
  'done.summary': 'Order details',
  'done.none': 'There is no recent order to show',
  'done.noneStep': 'Go to the products',
  'done.more': 'Continue shopping',
```

В `lib/i18n/hu.ts`:

```ts
  'nav.cart': 'Kosár',
  'cart.title': 'Az Ön kosara',
  'cart.lede': 'Rendelés előtt ellenőrizze a termékeket, a mennyiséget és a kedvezménykódot.',
  'cart.empty': 'A kosár üres',
  'cart.emptyStep': 'Termékek megtekintése',
  'cart.unit': '{price} / db',
  'cart.quantity': 'Mennyiség',
  'cart.less': 'Mennyiség csökkentése: {name}',
  'cart.more': 'Mennyiség növelése: {name}',
  'cart.removeName': 'Eltávolítás a kosárból: {name}',
  'cart.summary': 'Összesítés',
  'cart.subtotal': 'Részösszeg',
  'cart.discount': 'Kedvezmény ({code})',
  'cart.minus': '−{amount}',
  'cart.delivery': 'Szállítás',
  'cart.deliveryLater': 'A következő lépésben választható',
  'cart.total': 'Végösszeg',
  'cart.vat': 'Az árak tartalmazzák az áfát.',
  'cart.checkout': 'Tovább a pénztárhoz',
  'cart.coupon': 'Kedvezménykód',
  'cart.apply': 'Beváltás',
  'cart.couponRemove': '{code} kód eltávolítása',
  'cart.add': 'Kosárba',
  'cart.view': 'Kosár megtekintése',
  'cart.added': 'A termék a kosárba került.',
  'cart.partial': 'Csak {n} db van raktáron — most ennyi van a kosárban.',
  'cart.updated': 'A mennyiség frissült.',
  'cart.removed': 'A termék kikerült a kosárból.',
  'cart.couponApplied': 'A kedvezménykódot érvényesítettük.',
  'cart.couponRemoved': 'A kedvezménykódot töröltük.',
  'cart.error.outOfStock': 'A termék elfogyott — válasszon másik változatot.',
  'cart.error.quantity': 'Válasszon 1 és 99 közötti mennyiséget.',
  'cart.error.gone': 'A termék már nincs a kosárban — töltse újra az oldalt.',
  'cart.error.coupon': 'A kód nem érvényes — ellenőrizze, és szóközök nélkül írja be.',
  'cart.error.couponExpired': 'A kód lejárt — használjon érvényes kódot.',
  'cart.error.couponEmpty': 'Adja meg a kedvezménykódot.',
  'cart.error.request': 'A kérés nem olvasható — töltse újra az oldalt, és próbálja újra.',
  'cart.error.timeout': 'Nem jött válasz; a kosarat újratöltöttük — ellenőrizze, mielőtt újra próbálja.',
  'cart.error.unavailable': 'A bolt jelenleg nem válaszol — próbálja újra egy perc múlva.',
  'checkout.title': 'Pénztár',
  'checkout.lede': 'Kapcsolat, szállítás és fizetés — három lépés.',
  'checkout.steps': 'A rendelés lépései',
  'checkout.step.contact': 'Kapcsolati adatok',
  'checkout.step.delivery': 'Szállítás',
  'checkout.step.payment': 'Fizetés',
  'checkout.continue': 'Tovább',
  'checkout.change': 'Módosítás',
  'checkout.changeStep': 'Módosítás: {step}',
  'checkout.back': 'Vissza a kosárhoz',
  'checkout.fix': 'Javítsa a megjelölt mezőket.',
  'field.email': 'E-mail-cím',
  'field.firstName': 'Keresztnév',
  'field.lastName': 'Vezetéknév',
  'field.phone': 'Telefonszám',
  'field.street': 'Utca, házszám',
  'field.city': 'Település',
  'field.region': 'Megye',
  'field.postalCode': 'Irányítószám',
  'field.country': 'Ország',
  'field.emailEmpty': 'Adja meg e-mail-címét a rendelés visszaigazolásához.',
  'field.emailShape': 'Az e-mail-cím hiányosnak tűnik, például nev@pelda.hu.',
  'field.phoneShape': 'Adja meg telefonszámát, például 0722 123 456.',
  'field.required': 'A folytatáshoz töltse ki a mezőt.',
  'field.tooLong': 'Legfeljebb {n} karakter lehet.',
  'field.postal': 'Ellenőrizze az irányítószámot, például {example}.',
  'delivery.title': 'Szállítási mód',
  'delivery.kind.address': 'Házhoz',
  'delivery.kind.pickup': 'Átvételi pont',
  'delivery.free': 'Ingyenes',
  'delivery.day.one': '{n} munkanap',
  'delivery.day.few': '{n} munkanap',
  'delivery.day.other': '{n} munkanap',
  'delivery.span.one': '{min}–{n} munkanap',
  'delivery.span.few': '{min}–{n} munkanap',
  'delivery.span.other': '{min}–{n} munkanap',
  'delivery.choose': 'Szállítás kiválasztása',
  'delivery.address': 'Szállítási cím',
  'delivery.next': 'Tovább a fizetéshez',
  'delivery.points': 'Átvételi pont',
  'delivery.find': 'Pontok keresése',
  'delivery.cityPrompt': 'Írja be a települést az átvételi pontokhoz.',
  'delivery.noPoints': 'Nincs átvételi pont itt: „{city}”',
  'delivery.noPointsStep': 'Próbáljon egy közeli települést',
  'delivery.pointMissing': 'Válasszon átvételi pontot a listából.',
  'delivery.methodMissing': 'Válasszon szállítási módot.',
  'point.office': 'Iroda',
  'point.locker': 'Csomagautomata',
  'point.partner': 'Partnerpont',
  'point.shop': 'Üzletünk',
  'payment.title': 'Fizetési mód',
  'payment.missing': 'Válasszon fizetési módot.',
  'payment.declined': 'A fizetést nem fogadták el — válasszon másik módot.',
  'payment.ineligible': 'Ez a fizetési mód ennél a rendelésnél nem érhető el — válasszon másikat.',
  'order.review': 'Rendelés ellenőrzése',
  'order.items': 'Termékek',
  'order.line': '{name} × {n}',
  'order.name': '{last} {first}',
  'order.cityLine': '{postal} {city}',
  'order.terms': 'A rendelés leadásával elfogadja a bolt feltételeit:',
  'order.place': 'Megrendelés fizetési kötelezettséggel',
  'done.title': 'Köszönjük! A rendelését rögzítettük',
  'done.code': 'Rendelésszám: {code}',
  'done.keep': 'Őrizze meg a számot — segít, ha kapcsolatba lép velünk.',
  'done.summary': 'A rendelés adatai',
  'done.none': 'Nincs megjeleníthető friss rendelés',
  'done.noneStep': 'Tovább a termékekhez',
  'done.more': 'Vásárlás folytatása',
```

- [ ] **Step 5: Addresses** — в `lib/href.ts`: ввоз `import type { Step } from './checkout-steps.ts'`; в тип `To` две строки:

```ts
  | { cart: true; result?: string }
  | { checkout: Step | 'done'; city?: string }
```

и в `hrefFor` перед последней строкой (`return \`/${lang}/info/…\``):

```ts
  if ('cart' in to) return withQuery(`/${lang}/cart`, to.result ? [['r', to.result]] : [])
  if ('checkout' in to) return withQuery(`/${lang}/checkout/${to.checkout}`, to.city ? [['city', to.city]] : [])
```

- [ ] **Step 6: `lib/cart-ops.ts`**:

```ts
import type { Lang } from './locale.ts'
import type { Cart, Change, Commerce, CommerceError } from './source/contract.ts'
import { t, type Key } from './i18n/index.ts'

export type CartOp =
  | { op: 'add'; variantId: string; quantity: number }
  | { op: 'set'; lineId: string; quantity: number }
  | { op: 'remove'; lineId: string }
  | { op: 'coupon'; code: string }
  | { op: 'uncoupon'; code: string }
type Op = CartOp['op']
/** Исход записи в корзину. `code` — короткий и ходит в адресе корзины без
 *  скрипта (`?r=`), `message` — те же слова для страницы со скриптом. */
export type Outcome = { kind: 'ok' | 'partial' | 'error'; code: string; message: string; count: number | null }
type Failure = CommerceError | 'request' | 'coupon-empty' | 'timeout'

const DONE: Record<Op, Key> = { add: 'cart.added', set: 'cart.updated', remove: 'cart.removed', coupon: 'cart.couponApplied', uncoupon: 'cart.couponRemoved' }
const FAILED: Record<Failure, Key> = {
  'unavailable': 'cart.error.unavailable',
  'not-found': 'cart.error.gone',
  'empty-cart': 'cart.error.gone',
  'out-of-stock': 'cart.error.outOfStock',
  'quantity': 'cart.error.quantity',
  'coupon-invalid': 'cart.error.coupon',
  'coupon-expired': 'cart.error.couponExpired',
  'coupon-empty': 'cart.error.couponEmpty',
  'timeout': 'cart.error.timeout',
  'request': 'cart.error.request',
  'no-contact': 'cart.error.request',
  'no-delivery': 'cart.error.request',
  'point-missing': 'cart.error.request',
  'payment-ineligible': 'cart.error.request',
  'payment-declined': 'cart.error.request',
}
/* Количество — до трёх цифр; иное — -1: источник ответит «quantity», и
   покупатель прочтёт, какое количество можно, а не «запрос не понят». */
const qty = (s: string | undefined): number => (s !== undefined && /^\d{1,3}$/.test(s) ? Number(s) : -1)

/** Что просит форма корзины. Кнопка несёт действие в `op` («set:l2:3»,
 *  «remove:l2», «uncoupon:CBD10»); добавление и код — полями формы.
 *  Непонятное — null: не выполняется и не угадывается. */
export function readCartOp(form: FormData): CartOp | null {
  const [op = '', ...rest] = String(form.get('op') ?? '').split(':')
  const tail = rest.join(':')
  if (op === 'add') {
    const variantId = String(form.get('variant') ?? '')
    return variantId ? { op, variantId, quantity: qty(String(form.get('quantity') ?? '1').trim()) } : null
  }
  if (op === 'set' && rest.length >= 2) {
    const lineId = rest.slice(0, -1).join(':')
    return lineId ? { op, lineId, quantity: qty(rest.at(-1)) } : null
  }
  if (op === 'remove' && tail) return { op, lineId: tail }
  if (op === 'coupon') return { op, code: String(form.get('code') ?? '').trim() }
  if (op === 'uncoupon' && tail) return { op, code: tail }
  return null
}

function codeOf(op: Op, change: Change<Cart>): { code: string; count: number | null } {
  if (!change.ok) return { code: `e:${change.error}`, count: null }
  const count = change.value.quantity
  return change.added === undefined ? { code: `ok:${op}`, count } : { code: `partial:${change.added}`, count }
}

/** Выполнить запись. Добавление заводит сессию, если её нет; остальное без
 *  сессии — «товара уже нет в корзине». */
export async function runCartOp(c: Commerce, session: string | null, lang: Lang, op: CartOp | null): Promise<{ session: string | null; code: string; count: number | null }> {
  if (!op) return { session, code: 'e:request', count: null }
  if (op.op === 'coupon' && !op.code) return { session, code: 'e:coupon-empty', count: null }
  if (op.op === 'add') {
    const r = await c.add(session, lang, op.variantId, op.quantity)
    return { session: r.session ?? session, ...codeOf(op.op, r.change) }
  }
  if (!session) return { session, code: 'e:not-found', count: null }
  const change =
    op.op === 'set' ? await c.setQuantity(session, lang, op.lineId, op.quantity)
    : op.op === 'remove' ? await c.remove(session, lang, op.lineId)
    : op.op === 'coupon' ? await c.applyCoupon(session, lang, op.code)
    : await c.removeCoupon(session, lang, op.code)
  return { session, ...codeOf(op.op, change) }
}

/** Исход по коду — только из закрытого списка: код приходит адресом, и
 *  чужой код не показывается вовсе. */
export function outcomeOf(lang: Lang, code: string, count: number | null = null): Outcome | null {
  const [kind = '', name = ''] = code.split(':')
  if (kind === 'ok' && Object.hasOwn(DONE, name)) return { kind: 'ok', code, message: t(lang, DONE[name as Op]), count }
  if (kind === 'partial' && /^\d{1,3}$/.test(name)) return { kind: 'partial', code, message: t(lang, 'cart.partial', { n: Number(name) }), count }
  if (kind === 'e' && Object.hasOwn(FAILED, name)) return { kind: 'error', code, message: t(lang, FAILED[name as Failure]), count }
  return null
}
```

- [ ] **Step 7: `lib/cart-view.ts`**:

```ts
import type { Lang } from './locale.ts'
import type { Cart, CartLine, Image, Money } from './source/contract.ts'
import type { Empty } from './catalog-view.ts'
import { outcomeOf, type Outcome } from './cart-ops.ts'
import { t, tn } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { MARKET } from './market.ts'

export type TotalsView = { rows: { label: string; value: string }[]; total: { label: string; value: string }; note: string }
export type CartLineView = {
  id: string; href: string; name: string; options: string; image: Image
  unit: string; quantity: number; total: string
  less: string | null; more: string | null; remove: string
  labels: { quantity: string; less: string; more: string; remove: string }
}
export type CartPageView = {
  title: string; count: string; summary: string; lines: CartLineView[]; totals: TotalsView
  checkout: { label: string; href: string }
  coupon: { label: string; apply: string; applied: { code: string; op: string; label: string }[] }
  notice: Outcome | null; empty: Empty; messages: { timeout: string; failed: string }
}

const MAX = 99
const zero = (): Money => ({ minor: 0, currency: MARKET.currency })
const EMPTY: Cart = { lines: [], quantity: 0, subtotal: zero(), discounts: [], delivery: null, total: zero() }

/** Ноль у доставки — словом «бесплатно», а не «0,00 lei». */
export const priceOrFree = (lang: Lang, m: Money): string => (m.minor === 0 ? t(lang, 'delivery.free') : money(m, lang))

/** Итоги готовыми строками — одни на корзину, оформление и «спасибо».
 *  Складывает их источник; здесь только слова. */
export function totalsView(lang: Lang, cart: Cart): TotalsView {
  return {
    rows: [
      { label: t(lang, 'cart.subtotal'), value: money(cart.subtotal, lang) },
      ...cart.discounts.map((d) => ({ label: t(lang, 'cart.discount', { code: d.code }), value: t(lang, 'cart.minus', { amount: money(d.amount, lang) }) })),
      { label: t(lang, 'cart.delivery'), value: cart.delivery === null ? t(lang, 'cart.deliveryLater') : priceOrFree(lang, cart.delivery) },
    ],
    total: { label: t(lang, 'cart.total'), value: money(cart.total, lang) },
    note: t(lang, 'cart.vat'),
  }
}

/* Строка ведёт на свой вариант: адрес с опциями, как у выбора на карте
   товара (скилл shop, «Строка, повторяющая карточку, ведёт на товар»). */
function lineView(lang: Lang, l: CartLine): CartLineView {
  const options = Object.fromEntries(l.options.map((o) => [o.group, o.code]))
  return {
    id: l.id, href: hrefFor(lang, { product: l.productId, options }), name: l.name,
    options: l.options.map((o) => o.name).join(' · '), image: l.image,
    unit: t(lang, 'cart.unit', { price: money(l.unit, lang) }), quantity: l.quantity, total: money(l.total, lang),
    less: l.quantity > 1 ? `set:${l.id}:${l.quantity - 1}` : null,
    more: l.quantity < MAX ? `set:${l.id}:${l.quantity + 1}` : null,
    remove: `remove:${l.id}`,
    labels: {
      quantity: t(lang, 'cart.quantity'),
      less: t(lang, 'cart.less', { name: l.name }),
      more: t(lang, 'cart.more', { name: l.name }),
      remove: t(lang, 'cart.removeName', { name: l.name }),
    },
  }
}

/** Корзина готовыми строками. `result` — код исхода из адреса (без
 *  скрипта: запись → переход → корзина); чужой код не показывается. */
export function cartView(lang: Lang, cart: Cart | null, result: string | null): CartPageView {
  const c = cart ?? EMPTY
  return {
    title: t(lang, 'cart.title'),
    count: tn(lang, 'catalog.count', c.quantity),
    summary: t(lang, 'cart.summary'),
    lines: c.lines.map((l) => lineView(lang, l)),
    totals: totalsView(lang, c),
    checkout: { label: t(lang, 'cart.checkout'), href: hrefFor(lang, { checkout: 'contact' }) },
    coupon: {
      label: t(lang, 'cart.coupon'), apply: t(lang, 'cart.apply'),
      applied: c.discounts.map((d) => ({ code: d.code, op: `uncoupon:${d.code}`, label: t(lang, 'cart.couponRemove', { code: d.code }) })),
    },
    notice: result ? outcomeOf(lang, result) : null,
    empty: { title: t(lang, 'cart.empty'), step: t(lang, 'cart.emptyStep'), href: hrefFor(lang, { catalog: true }) },
    messages: { timeout: t(lang, 'cart.error.timeout'), failed: t(lang, 'cart.error.unavailable') },
  }
}
```

- [ ] **Step 8: Buying on the product page** — в `lib/product-view.ts`:
  - тип рядом с `LabView`:

```ts
export type BuyView = { variant: string | null; add: string; quantity: string; view: { label: string; href: string }; timeout: string; failed: string }
```

  - в `ProductPageView` — поле `buy: BuyView`;
  - в `productView` после `const report = …`:

```ts
  /* В корзину идёт только выбранный вариант в наличии; у товара с одним
     вариантом он выбран сам. Кнопка без варианта выключена: почему — уже
     сказано строкой выбора или наличия над ней. */
  const buyable = chosen ?? (product.variants.length === 1 ? product.variants[0] : null)
```

  и в возвращаемый объект:

```ts
    buy: {
      variant: buyable && buyable.stock !== 'out' ? buyable.id : null,
      add: t(lang, 'cart.add'), quantity: t(lang, 'cart.quantity'),
      view: { label: t(lang, 'cart.view'), href: hrefFor(lang, { cart: true }) },
      timeout: t(lang, 'cart.error.timeout'), failed: t(lang, 'cart.error.unavailable'),
    },
```

- [ ] **Step 9: `docs/words.md`** — синхронно со словами:
  - «Глоссарий»: строку `| постамат | easybox | parcel locker | csomagautomata | easybox — имя сети |` заменить на `| постамат | locker | parcel locker | csomagautomata | имя сети и службы — данные, не слово интерфейса (И261) |`; добавить после неё `| пункт выдачи | punct de ridicare | pickup point | átvételi pont | |`.
  - «Кнопки»: строку «подтвердить заказ» заменить на `| подтвердить заказ | Comandă cu obligație de plată | Order with obligation to pay | Megrendelés fizetési kötelezettséggel |`; под таблицей абзац: `Кнопка заказа называет обязанность платить — Директива 2011/83/ЕС, ст. 8(2) (И262). Формулировку внутри этой рамки утверждает заказчик.`
  - «Ошибки у поля»: строку «количество больше остатка» заменить на `| количество больше остатка | Avem doar {n} buc. în stoc | atât sunt acum în coș | We only have {n} in stock — that is how many are in your cart now | Csak {n} db van raktáron — most ennyi van a kosárban |`; добавить `| индекс | Verificați codul poștal | de exemplu {example} | Check the postcode, e.g. {example} | Ellenőrizze az irányítószámot, például {example} |` и `| слишком длинно | Scurtați textul | la cel mult {n} caractere | Shorten this to at most {n} characters | Legfeljebb {n} karakter lehet |`.
  - «Пустые экраны»: строку «пустая корзина» заменить на `| пустая корзина | Coșul este gol | Vedeți produsele | Your cart is empty — see the products | A kosár üres — termékek megtekintése |`; добавить `| нет точек выдачи | Niciun punct de ridicare în „{city}” | Încercați o localitate apropiată | No pickup points in “{city}” — try a nearby town | Nincs átvételi pont itt: „{city}” — próbáljon egy közeli települést |` и `| нет свежего заказа | Nu există o comandă recentă de afișat | Mergeți la produse | There is no recent order to show — go to the products | Nincs megjeleníthető friss rendelés — tovább a termékekhez |`.

- [ ] **Step 10: Rule И262** — в конец `docs/rules.md`:

```markdown
## И262 · Кнопка заказа называет обязанность платить

**Дефект.** 23.09.2026. Словарь витрины (`templates/storefront/docs/words.md`,
«Кнопки») записал кнопку подтверждения заказа словами «Trimite comanda» /
«Place order». Директива 2011/83/ЕС (ст. 8(2)) требует, чтобы кнопка
заказа с оплатой однозначно называла обязанность платить — «заказ с
обязательством оплаты» или равное по смыслу; иначе потребителя заказ не
обязывает. Румыния переносит это требование в свой закон о правах
потребителей.

**Как писать.** Кнопка последнего шага оформления — ro «Comandă cu
obligație de plată», en «Order with obligation to pay», hu «Megrendelés
fizetési kötelezettséggel». Другие слова — только равные по смыслу;
формулировку утверждает заказчик, рамку держит тест.

**Чем меряется.** `templates/storefront/tests/i18n.test.ts`, «the order
button names the obligation to pay».
```

- [ ] **Step 11: Run tests to verify they pass**

Run (в демо после переустановки): `npm test`, `npx tsc --noEmit`, `npm run check:code`, `npm run check:lint`, `npm run check:port`
Expected: всё зелёное; тест словаря (`auditWords`) — без находок.

- [ ] **Step 12: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add templates/storefront/lib templates/storefront/tests templates/storefront/docs/words.md docs/rules.md
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Витрина RO: слова корзины и оформления ro · en · hu, адреса корзины и шагов, разбор формы корзины с кодом исхода, корзина готовыми строками, покупка на карте товара; И262" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Поля оформления и шаги готовыми строками

**Files:**
- Create: `templates/storefront/lib/checkout-form.ts`, `templates/storefront/lib/checkout-view.ts`
- Test: `templates/storefront/tests/checkout-form.test.ts`, `templates/storefront/tests/checkout-view.test.ts`

**Interfaces:**
- Consumes: Task 2 — типы покупки, `STEPS`, `Step`, `sampleCommerce`, `FIXTURES`, `MARKET.postal`; Task 3 — ключи слов, `hrefFor` корзины и шагов, `tn(…, vars)`, `totalsView`, `priceOrFree`, `TotalsView`.
- Produces:
  - `lib/checkout-form.ts`: `type Field`, `type Values`, `type FormState`, `LIMITS`, `parseContact(lang, form)`, `parseAddress(lang, form)` → `{ ok: true; value } | { ok: false; errors; values }`;
  - `lib/checkout-view.ts`: `FieldView`, `StepsView`, `ContactView`, `MethodView`, `PointView`, `AddressDetails`, `PickupDetails`, `Pickup`, `DeliveryPageView`, `Recap` (`change` — `null` на «спасибо»), `ItemView` (`id`, `line`, `detail`, `total`), `PaymentPageView`, `DonePageView` (`review`), `FrameText`; `stepsView`, `contactView`, `daysText`, `countryName`, `deliveryView`, `paymentView`, `doneView`, `noOrder`, `emptyCheckout`, `frameText`.

- [ ] **Step 1: Write the failing tests** — `tests/checkout-form.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseContact, parseAddress } from '../lib/checkout-form.ts'

const form = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}
const good = { email: ' ana@example.com ', firstName: 'Ana', lastName: 'Popescu', phone: '+40 (722) 123-456' }

test('contact: a good form gives trimmed values', () => {
  assert.deepEqual(parseContact('ro', form(good)), { ok: true, value: { email: 'ana@example.com', firstName: 'Ana', lastName: 'Popescu', phone: '+40 (722) 123-456' } })
})

test('contact: every error sits at its field and says what to do; what was typed comes back', () => {
  const r = parseContact('ro', form({ email: '', firstName: '', lastName: 'Popescu', phone: '' }))
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.deepEqual(r.errors, {
    email: 'Introduceți adresa de e-mail pentru a primi confirmarea comenzii.',
    firstName: 'Completați câmpul pentru a continua.',
    phone: 'Introduceți numărul de telefon, de exemplu 0722 123 456.',
  })
  assert.equal(r.values.lastName, 'Popescu')
  const shape = parseContact('en', form({ ...good, email: 'ana@', phone: '12' }))
  assert.ok(!shape.ok)
  assert.equal(shape.errors.email, 'The email looks incomplete, e.g. name@example.com.')
  assert.equal(shape.errors.phone, 'Enter your phone number, e.g. 0722 123 456.')
  const long = parseContact('ro', form({ ...good, firstName: 'A'.repeat(61) }))
  assert.ok(!long.ok)
  assert.equal(long.errors.firstName, 'Scurtați textul la cel mult 60 caractere.')
})

test('address: the market’s postcode pattern, spaces forgiven, country from the market', () => {
  const ok = parseAddress('ro', form({ street: 'Str. Exemplului 1', city: 'București', region: 'București', postalCode: '010 011' }))
  assert.deepEqual(ok, { ok: true, value: { street: 'Str. Exemplului 1', city: 'București', region: 'București', postalCode: '010011', country: 'RO' } })
  const bad = parseAddress('ro', form({ street: 'S 1', city: 'C', region: 'R', postalCode: '01001' }))
  assert.ok(!bad.ok)
  assert.deepEqual(bad.errors, { postalCode: 'Verificați codul poștal, de exemplu 010011.' })
})
```

и `tests/checkout-view.test.ts`:

```ts
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { stepsView, contactView, daysText, deliveryView, paymentView, doneView } from '../lib/checkout-view.ts'
import { sampleCommerce as c, resetSample, FIXTURES } from '../lib/source/sample/commerce.ts'
import type { Lang } from '../lib/locale.ts'

beforeEach(() => resetSample())
const NB = '\u00a0'
async function at(session: string, lang: Lang = 'ro') {
  const r = await c.checkout(session, lang)
  assert.ok(r.ok && r.value)
  return r.value
}
async function methods(lang: Lang = 'ro') {
  const r = await c.deliveryMethods(null, lang)
  assert.ok(r.ok)
  return r.value
}

test('steps: passed ones are links back, the current one is marked, later ones have no address', () => {
  const v = stepsView('ro', 'delivery')
  assert.deepEqual(v.items.map((i) => [i.name, i.href, i.current]), [
    ['Date de contact', '/ro/checkout/contact', false],
    ['Livrare', null, true],
    ['Plată', null, false],
  ])
})

test('contact: fields keep what the checkout already knows', async () => {
  const v = contactView('ro', (await at(FIXTURES.contact)).contact)
  assert.deepEqual(v.fields.map((f) => [f.name, f.type, f.autoComplete, f.value]), [
    ['email', 'email', 'email', 'ana.popescu@example.com'],
    ['firstName', 'text', 'given-name', 'Ana'],
    ['lastName', 'text', 'family-name', 'Popescu'],
    ['phone', 'tel', 'tel', '0722 123 456'],
  ])
  assert.equal(v.submit, 'Continuă')
})

test('days count by the upper end, in every language', () => {
  assert.equal(daysText('ro', { min: 1, max: 1 }), '1 zi lucrătoare')
  assert.equal(daysText('ro', { min: 2, max: 2 }), '2 zile lucrătoare')
  assert.equal(daysText('ro', { min: 1, max: 3 }), '1–3 zile lucrătoare')
  assert.equal(daysText('en', { min: 1, max: 1 }), '1 working day')
  assert.equal(daysText('hu', { min: 1, max: 2 }), '1–2 munkanap')
  assert.equal(daysText('ro', null), null)
})

test('delivery: methods speak their kind, carrier and days; nothing chosen — no details', async () => {
  const v = deliveryView('ro', { methods: await methods(), delivery: null, pickup: null })
  assert.deepEqual(v.methods.map((m) => [m.id, m.meta, m.price, m.checked]), [
    ['curier', 'La adresă · FAN Courier · 1–2 zile lucrătoare', `19,99${NB}lei`, false],
    ['locker', 'Punct de ridicare · Sameday · 1–2 zile lucrătoare', `12,99${NB}lei`, false],
    ['magazin', 'Punct de ridicare', 'Gratuit', false],
  ])
  assert.equal(v.details, null)
})

test('delivery to the door asks for the address; the country comes from the market', async () => {
  const s = await at(FIXTURES.address)
  const v = deliveryView('ro', { methods: await methods(), delivery: s.delivery, pickup: null })
  assert.equal(v.methods.find((m) => m.checked)?.id, 'curier')
  assert.ok(v.details?.kind === 'address')
  assert.deepEqual(v.details.fields.map((f) => f.name), ['street', 'city', 'region', 'postalCode'])
  assert.equal(v.details.fields[3].inputMode, 'numeric')
  assert.deepEqual(v.details.country, { label: 'Țara', value: 'România' })
})

test('a pickup point is searched by town: prompt, nothing found, found', async () => {
  const s = await at(FIXTURES.pickup)
  const ms = await methods()
  const prompt = deliveryView('ro', { methods: ms, delivery: s.delivery, pickup: { listed: false, city: '', points: [] } })
  assert.ok(prompt.details?.kind === 'pickup')
  assert.equal(prompt.details.prompt, 'Scrieți localitatea pentru a vedea punctele de ridicare.')
  assert.equal(prompt.details.search?.action, '/ro/checkout/delivery')
  const none = deliveryView('ro', { methods: ms, delivery: s.delivery, pickup: { listed: false, city: 'Vaslui', points: [] } })
  assert.ok(none.details?.kind === 'pickup')
  assert.equal(none.details.empty?.title, 'Niciun punct de ridicare în „Vaslui”')
  const pts = await c.pickupPoints('ro', 'locker', 'București')
  assert.ok(pts.ok)
  const found = deliveryView('ro', { methods: ms, delivery: s.delivery, pickup: { listed: false, city: 'București', points: pts.value } })
  assert.ok(found.details?.kind === 'pickup')
  assert.equal(found.details.points[0].meta, 'Locker · Bd. Exemplului 1 · București')
  assert.equal(found.details.prompt, null)
})

test('payment: eligible first, the rest disabled with the reason; the review and the obligation to pay', async () => {
  const s = await at(FIXTURES.ready)
  const pay = await c.paymentMethods(FIXTURES.ready, 'ro')
  assert.ok(pay.ok)
  const v = paymentView('ro', { methods: pay.value, checkout: s, terms: { title: 'Termeni și condiții', href: '/ro/info/termeni' } })
  assert.deepEqual(v.methods.map((m) => [m.code, m.checked, m.disabled]), [['ramburs', true, false], ['transfer', false, false]])
  assert.deepEqual(v.recaps.map((r) => r.lines), [
    ['Ana Popescu', 'ana.popescu@example.com', '0722 123 456'],
    ['Curier la domiciliu · FAN Courier', 'Str. Exemplului 1', '010011 București', 'București'],
  ])
  assert.equal(v.recaps[1].change.href, '/ro/checkout/delivery')
  assert.equal(v.recaps[1].change.aria, 'Modifică: Livrare')
  assert.equal(v.items[0].line, 'Ulei CBD full spectrum × 1')
  assert.equal(v.items[0].detail, '20 % · 10 ml')
  assert.equal(v.totals.total.value, `469,72${NB}lei`)
  assert.equal(v.submit, 'Comandă cu obligație de plată')
  const hu = paymentView('hu', { methods: pay.value, checkout: await at(FIXTURES.ready, 'hu'), terms: { title: 'ÁSZF', href: '/hu/info/termeni' } })
  assert.equal(hu.recaps[0].lines[0], 'Popescu Ana')
})

test('done: the order number, what, where and how it is paid', async () => {
  const r = await c.lastOrder(FIXTURES.placed, 'ro')
  assert.ok(r.ok && r.value)
  const v = doneView('ro', r.value)
  assert.equal(v.code, 'Numărul comenzii: EXEMPLU1')
  assert.equal(v.review, 'Detaliile comenzii')
  assert.equal(v.recaps[0].change, null)
  assert.deepEqual(v.recaps.map((x) => x.title), ['Date de contact', 'Livrare', 'Plată'])
  assert.deepEqual(v.recaps[2].lines, ['Plata la livrare (ramburs)', 'Plătiți la primirea coletului.'])
  assert.equal(v.totals.rows.at(-1)?.value, `19,99${NB}lei`)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run (в демо после переустановки): `node tools/check-test.mjs tests/checkout-form.test.ts` и `node tools/check-test.mjs tests/checkout-view.test.ts`
Expected: FAIL — модулей нет.

- [ ] **Step 3: `lib/checkout-form.ts`**:

```ts
import type { Lang } from './locale.ts'
import type { Address, Contact } from './source/contract.ts'
import { t, type Key } from './i18n/index.ts'
import { MARKET } from './market.ts'

export type Field = 'email' | 'firstName' | 'lastName' | 'phone' | 'street' | 'city' | 'region' | 'postalCode'
export type Values = Partial<Record<Field, string>>
export type Errors = Partial<Record<Field, string>>
/** Состояние формы шага после отправки: ошибки у полей, введённое (React
 *  после отправки возвращает поля к этим значениям) и общее сообщение.
 *  `null` — отправки ещё не было. */
export type FormState = { errors: Errors; values: Values; message: string | null } | null
export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Errors; values: Values }

export const LIMITS: Record<Field, number> = { email: 120, firstName: 60, lastName: 60, phone: 20, street: 120, city: 60, region: 60, postalCode: 12 }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^\+?\d{7,15}$/
/* Пустое поле говорит своим шагом там, где он есть: у почты — зачем она, у
   телефона — образец; у остальных — общий. */
const EMPTY: Partial<Record<Field, Key>> = { email: 'field.emailEmpty', phone: 'field.phoneShape' }

const read = (form: FormData, fields: readonly Field[]): Values =>
  Object.fromEntries(fields.map((f) => [f, String(form.get(f) ?? '').trim()])) as Values

function check(lang: Lang, v: Values, rules: Partial<Record<Field, (s: string) => string | null>>): Errors {
  const errors: Errors = {}
  for (const [name, rule] of Object.entries(rules) as [Field, (s: string) => string | null][]) {
    const value = v[name] ?? ''
    const message = !value ? t(lang, EMPTY[name] ?? 'field.required')
      : value.length > LIMITS[name] ? t(lang, 'field.tooLong', { n: LIMITS[name] })
      : rule(value)
    if (message) errors[name] = message
  }
  return errors
}
const any = () => null

/** Контакты. Проверяет сервер; поле формы помечено `required` только ради
 *  чтения вслух — сообщение браузера выключено (`noValidate`), говорит
 *  витрина на языке адреса. */
export function parseContact(lang: Lang, form: FormData): Parsed<Contact> {
  const v = read(form, ['email', 'firstName', 'lastName', 'phone'])
  const errors = check(lang, v, {
    email: (s) => (EMAIL.test(s) ? null : t(lang, 'field.emailShape')),
    firstName: any,
    lastName: any,
    phone: (s) => (PHONE.test(s.replace(/[\s().-]/g, '')) ? null : t(lang, 'field.phoneShape')),
  })
  if (Object.keys(errors).length) return { ok: false, errors, values: v }
  return { ok: true, value: { email: v.email ?? '', firstName: v.firstName ?? '', lastName: v.lastName ?? '', phone: v.phone ?? '' } }
}

/** Адрес доставки. Страна и запись индекса — рынка (`MARKET`), не формы. */
export function parseAddress(lang: Lang, form: FormData): Parsed<Address> {
  const v = read(form, ['street', 'city', 'region', 'postalCode'])
  const postal = new RegExp(MARKET.postal.pattern)
  const errors = check(lang, v, {
    street: any,
    city: any,
    region: any,
    postalCode: (s) => (postal.test(s.replace(/\s/g, '')) ? null : t(lang, 'field.postal', { example: MARKET.postal.example })),
  })
  if (Object.keys(errors).length) return { ok: false, errors, values: v }
  return {
    ok: true,
    value: { street: v.street ?? '', city: v.city ?? '', region: v.region ?? '', postalCode: (v.postalCode ?? '').replace(/\s/g, ''), country: MARKET.country },
  }
}
```

- [ ] **Step 4: `lib/checkout-view.ts`**:

```ts
import type { Lang } from './locale.ts'
import type { Address, Cart, Checkout, Contact, Delivery, DeliveryMethod, Order, PaymentMethod, PickupPoint, PointType } from './source/contract.ts'
import type { Empty } from './catalog-view.ts'
import { LIMITS, type Field } from './checkout-form.ts'
import { STEPS, type Step } from './checkout-steps.ts'
import { t, tn, type Key } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { intlLocale, MARKET } from './market.ts'
import { priceOrFree, totalsView, type TotalsView } from './cart-view.ts'

export type FieldView = { name: Field; label: string; type: 'email' | 'tel' | 'text'; autoComplete: string; inputMode: 'numeric' | null; max: number; value: string }
export type StepsView = { label: string; items: { name: string; href: string | null; current: boolean }[] }
export type ContactView = { title: string; fields: FieldView[]; submit: string }
export type MethodView = { id: string; name: string; meta: string; description: string; price: string; checked: boolean }
export type PointView = { id: string; name: string; meta: string; hours: string | null; checked: boolean }
export type AddressDetails = { kind: 'address'; method: string; title: string; fields: FieldView[]; country: { label: string; value: string }; submit: string }
export type PickupDetails = {
  kind: 'pickup'; method: string; title: string
  search: { action: string; label: string; value: string; submit: string } | null
  prompt: string | null; empty: Empty | null; points: PointView[]; submit: string
}
export type DeliveryPageView = { title: string; methods: MethodView[]; choose: string; details: AddressDetails | PickupDetails | null }
export type Recap = { title: string; lines: string[]; change: { label: string; aria: string; href: string } | null }
export type ItemView = { id: string; line: string; detail: string; total: string }
export type PaymentPageView = {
  title: string
  methods: { code: string; name: string; description: string; disabled: boolean; reason: string | null; checked: boolean }[]
  review: string; recaps: Recap[]; itemsTitle: string; items: ItemView[]; totals: TotalsView
  terms: { note: string; link: { label: string; href: string } }; submit: string
}
export type DonePageView = {
  title: string; code: string; keep: string; review: string; recaps: Recap[]
  itemsTitle: string; items: ItemView[]; totals: TotalsView; more: { label: string; href: string }
}

const STEP_NAME: Record<Step, Key> = { contact: 'checkout.step.contact', delivery: 'checkout.step.delivery', payment: 'checkout.step.payment' }
const POINT: Record<PointType, Key> = { office: 'point.office', locker: 'point.locker', partner: 'point.partner', shop: 'point.shop' }
const KIND: Record<DeliveryMethod['kind'], Key> = { address: 'delivery.kind.address', pickup: 'delivery.kind.pickup' }

/** Шаги: пройденные — ссылками назад, текущий отмечен, будущие без адреса —
 *  к ним не пускает сервер (`stepFor`). */
export function stepsView(lang: Lang, current: Step): StepsView {
  const at = STEPS.indexOf(current)
  return {
    label: t(lang, 'checkout.steps'),
    items: STEPS.map((s, i) => ({ name: t(lang, STEP_NAME[s]), href: i < at ? hrefFor(lang, { checkout: s }) : null, current: i === at })),
  }
}

type Spec = { key: Key; type?: FieldView['type']; auto: string; numeric?: boolean }
const field = (lang: Lang, name: Field, value: string, spec: Spec): FieldView => ({
  name, label: t(lang, spec.key), type: spec.type ?? 'text', autoComplete: spec.auto,
  inputMode: spec.numeric ? 'numeric' : null, max: LIMITS[name], value,
})

export function contactView(lang: Lang, contact: Contact | null): ContactView {
  const c = contact ?? { email: '', firstName: '', lastName: '', phone: '' }
  return {
    title: t(lang, 'checkout.step.contact'),
    fields: [
      field(lang, 'email', c.email, { key: 'field.email', type: 'email', auto: 'email' }),
      field(lang, 'firstName', c.firstName, { key: 'field.firstName', auto: 'given-name' }),
      field(lang, 'lastName', c.lastName, { key: 'field.lastName', auto: 'family-name' }),
      field(lang, 'phone', c.phone, { key: 'field.phone', type: 'tel', auto: 'tel' }),
    ],
    submit: t(lang, 'checkout.continue'),
  }
}

/** Срок рабочими днями; диапазон считается по верхнему концу. */
export const daysText = (lang: Lang, days: DeliveryMethod['days']): string | null =>
  days === null ? null
  : days.min === days.max ? tn(lang, 'delivery.day', days.max)
  : tn(lang, 'delivery.span', days.max, { min: days.min })

export const countryName = (lang: Lang, code: string): string =>
  new Intl.DisplayNames([intlLocale(lang)], { type: 'region' }).of(code) ?? code

function addressFields(lang: Lang, a: Address | null): FieldView[] {
  const v = a ?? { street: '', city: '', region: '', postalCode: '' }
  return [
    field(lang, 'street', v.street, { key: 'field.street', auto: 'street-address' }),
    field(lang, 'city', v.city, { key: 'field.city', auto: 'address-level2' }),
    field(lang, 'region', v.region, { key: 'field.region', auto: 'address-level1' }),
    field(lang, 'postalCode', v.postalCode, { key: 'field.postalCode', auto: 'postal-code', numeric: true }),
  ]
}

export type Pickup = { listed: boolean; city: string; points: PickupPoint[] }

function pickupDetails(lang: Lang, method: DeliveryMethod, current: string | null, p: Pickup): PickupDetails {
  const searched = !p.listed && p.city !== ''
  return {
    kind: 'pickup', method: method.id, title: t(lang, 'delivery.points'),
    search: p.listed ? null : { action: hrefFor(lang, { checkout: 'delivery' }), label: t(lang, 'field.city'), value: p.city, submit: t(lang, 'delivery.find') },
    prompt: !p.listed && !p.city ? t(lang, 'delivery.cityPrompt') : null,
    empty: searched && !p.points.length
      ? { title: t(lang, 'delivery.noPoints', { city: p.city }), step: t(lang, 'delivery.noPointsStep'), href: hrefFor(lang, { checkout: 'delivery' }) }
      : null,
    points: p.points.map((pt) => ({ id: pt.id, name: pt.name, meta: [t(lang, POINT[pt.type]), pt.address, pt.city].join(' · '), hours: pt.hours, checked: pt.id === current })),
    submit: t(lang, 'delivery.next'),
  }
}

/** Шаг доставки: способы — всегда; под выбранным — его подробности: адрес
 *  у `address`, точка у `pickup`. Точки собирает страница: `listed` — их
 *  мало и они пришли без города; иначе — найденные по городу. */
export function deliveryView(lang: Lang, a: { methods: DeliveryMethod[]; delivery: Delivery | null; pickup: Pickup | null }): DeliveryPageView {
  const chosen = a.delivery?.method ?? null
  const details = !chosen ? null
    : chosen.kind === 'address'
      ? { kind: 'address' as const, method: chosen.id, title: t(lang, 'delivery.address'), fields: addressFields(lang, a.delivery?.address ?? null), country: { label: t(lang, 'field.country'), value: countryName(lang, MARKET.country) }, submit: t(lang, 'delivery.next') }
      : pickupDetails(lang, chosen, a.delivery?.point?.id ?? null, a.pickup ?? { listed: false, city: '', points: [] })
  return {
    title: t(lang, 'delivery.title'),
    methods: a.methods.map((m) => ({
      id: m.id, name: m.name, description: m.description, price: priceOrFree(lang, m.price), checked: m.id === chosen?.id,
      meta: [t(lang, KIND[m.kind]), m.carrier, daysText(lang, m.days)].filter(Boolean).join(' · '),
    })),
    choose: t(lang, 'delivery.choose'),
    details,
  }
}

const contactLines = (lang: Lang, c: Contact): string[] => [t(lang, 'order.name', { first: c.firstName, last: c.lastName }), c.email, c.phone]
function deliveryLines(lang: Lang, d: Delivery): string[] {
  const head = [d.method.name, d.method.carrier].filter(Boolean).join(' · ')
  if (d.address) return [head, d.address.street, t(lang, 'order.cityLine', { postal: d.address.postalCode, city: d.address.city }), d.address.region]
  if (d.point) return [head, d.point.name, d.point.address, d.point.city]
  return [head]
}
const itemsOf = (lang: Lang, cart: Cart): ItemView[] =>
  cart.lines.map((l) => ({ id: l.id, line: t(lang, 'order.line', { name: l.name, n: l.quantity }), detail: l.options.map((o) => o.name).join(' · '), total: money(l.total, lang) }))
const recap = (lang: Lang, step: Step, lines: string[]): Recap => {
  const title = t(lang, STEP_NAME[step])
  return { title, lines, change: { label: t(lang, 'checkout.change'), aria: t(lang, 'checkout.changeStep', { step: title }), href: hrefFor(lang, { checkout: step }) } }
}

/** Шаг оплаты: способы — допустимые, недопустимый выключен с причиной и не
 *  прячется; сверка того, что заказано, куда и кому; кнопка называет
 *  обязанность платить (И262). */
export function paymentView(lang: Lang, a: { methods: PaymentMethod[]; checkout: Checkout; terms: { title: string; href: string } }): PaymentPageView {
  const c = a.checkout
  const first = a.methods.find((m) => m.eligible)?.code ?? null
  return {
    title: t(lang, 'payment.title'),
    methods: a.methods.map((m) => ({ code: m.code, name: m.name, description: m.description, disabled: !m.eligible, reason: m.eligible ? null : m.reason, checked: m.code === first })),
    review: t(lang, 'order.review'),
    recaps: [
      ...(c.contact ? [recap(lang, 'contact', contactLines(lang, c.contact))] : []),
      ...(c.delivery ? [recap(lang, 'delivery', deliveryLines(lang, c.delivery))] : []),
    ],
    itemsTitle: t(lang, 'order.items'), items: itemsOf(lang, c.cart), totals: totalsView(lang, c.cart),
    terms: { note: t(lang, 'order.terms'), link: { label: a.terms.title, href: a.terms.href } },
    submit: t(lang, 'order.place'),
  }
}

export function doneView(lang: Lang, order: Order): DonePageView {
  return {
    title: t(lang, 'done.title'), code: t(lang, 'done.code', { code: order.code }), keep: t(lang, 'done.keep'),
    review: t(lang, 'done.summary'),
    recaps: [
      { title: t(lang, 'checkout.step.contact'), lines: contactLines(lang, order.contact), change: null },
      { title: t(lang, 'checkout.step.delivery'), lines: deliveryLines(lang, order.delivery), change: null },
      { title: t(lang, 'checkout.step.payment'), lines: [order.payment.name, order.payment.description], change: null },
    ],
    itemsTitle: t(lang, 'order.items'), items: itemsOf(lang, order.cart), totals: totalsView(lang, order.cart),
    more: { label: t(lang, 'done.more'), href: hrefFor(lang, { catalog: true }) },
  }
}

/** Рамка шагов: заголовок, подпись итогов, путь назад в корзину. */
export type FrameText = { title: string; summary: string; back: { label: string; href: string } }
export const frameText = (lang: Lang): FrameText => ({
  title: t(lang, 'checkout.title'), summary: t(lang, 'cart.summary'),
  back: { label: t(lang, 'checkout.back'), href: hrefFor(lang, { cart: true }) },
})

export const noOrder = (lang: Lang): Empty => ({ title: t(lang, 'done.none'), step: t(lang, 'done.noneStep'), href: hrefFor(lang, { catalog: true }) })
export const emptyCheckout = (lang: Lang): Empty => ({ title: t(lang, 'cart.empty'), step: t(lang, 'cart.emptyStep'), href: hrefFor(lang, { catalog: true }) })
```

- [ ] **Step 5: Run tests to verify they pass**

Run (в демо после переустановки): `npm test`, `npx tsc --noEmit`, `npm run check:code`, `npm run check:lint`
Expected: всё зелёное.

- [ ] **Step 6: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add templates/storefront/lib/checkout-form.ts templates/storefront/lib/checkout-view.ts templates/storefront/tests/checkout-form.test.ts templates/storefront/tests/checkout-view.test.ts
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Витрина RO: поля контактов и адреса с ошибкой у поля и шагом, запись индекса рынка; шаги, доставка, оплата и «спасибо» готовыми строками" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Корзина на сайте — сессия, запись, шапка, товар, страница корзины

**Files:**
- Create: `templates/storefront/lib/session-cookie.ts`, `lib/session.ts`, `lib/cart-lane.ts`, `lib/actions/cart.ts`, `app/api/cart/route.ts`, `app/[lang]/cart/page.tsx`, `components/CartForm.tsx`, `components/CartLink.tsx`, `components/AddToCart.tsx`, `components/OrderTotals.tsx`, `components/CartView.tsx`, `components/Cart.module.css`
- Modify: `templates/storefront/components/Header.tsx`, `components/Header.module.css`, `components/ProductView.tsx`, `components/ProductView.module.css`, `app/[lang]/product/[id]/page.tsx`
- Test: `templates/storefront/tests/session.test.ts`

(Все пути — от `templates/storefront/`.)

**Interfaces:**
- Consumes: Task 2 — `commerce()`; Task 3 — `readCartOp`, `runCartOp`, `outcomeOf`, `Outcome`, `cartView`, `CartPageView`, `TotalsView`, `ProductPageView.buy`, `hrefFor({ cart })`, ключи слов; набор — `lib/commerce/mutation-lane.mjs` (кладёт установщик), `styles/*.module.css`.
- Produces: `SESSION_COOKIE = 'shop_session'`; `readSession()`, `writeSession(token)`; `cartLane`, `isTimeout(e)`; Server Actions `cartSubmit(form): Promise<void>` и `cartCall(form): Promise<Outcome>`; `GET /api/cart` → `{ count: number | null }`; компоненты `CartForm`, `CartLink`, `AddToCart`, `OrderTotals`, `CartView`; страница `/[lang]/cart`.

- [ ] **Step 1: Write the failing test** — `tests/session.test.ts`: имя cookie одно на сервер и на проверки набора (Task 7 заводит `kit.config.json`; до него тест проверяет только имя):

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SESSION_COOKIE } from '../lib/session-cookie.ts'

test('the session cookie has one name', () => {
  assert.equal(SESSION_COOKIE, 'shop_session')
})
```

Run: `node tools/check-test.mjs tests/session.test.ts` → FAIL (нет модуля).

- [ ] **Step 2: Session** — `lib/session-cookie.ts`:

```ts
/* Имя cookie сессии покупки — отдельным файлом без ввоза Next: его читают
   сервер (lib/session.ts), проверки набора (kit.config.json → sessions) и
   тест, который держит их согласными. */
export const SESSION_COOKIE = 'shop_session'
```

`lib/session.ts`:

```ts
import { cookies } from 'next/headers'
import { SESSION_COOKIE } from './session-cookie.ts'
import { SITE_URL } from './seo.ts'

const MONTH = 60 * 60 * 24 * 30

/** Ключ сессии покупки из cookie. Cookie — только для сервера: скрипт
 *  страницы его не читает (`httpOnly`), чужой сайт его не шлёт
 *  (`sameSite=lax`). */
export async function readSession(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value || null
}

/** `secure` — когда сайт на https: образец на http://localhost иначе не
 *  сохранил бы корзину, открытый с телефона по адресу в сети. */
export async function writeSession(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: SITE_URL().startsWith('https:'), path: '/', maxAge: MONTH })
}
```

- [ ] **Step 3: One write lane per cart** — `lib/cart-lane.ts`:

```ts
import { createMutationLane } from './commerce/mutation-lane.mjs'

/* Одна полоса записи на корзину вкладки (references/commerce-patterns.md,
   «Цена и корзина»): пока запись идёт, вторая ОТКЛОНЯЕТСЯ — поля формы
   выключены; нет ответа 15 секунд — исход неизвестен, корзина
   перечитывается, сама запись не повторяется. Помощник набора — JavaScript;
   тип его ответа записан здесь один раз. */
export type Lane = {
  readonly pending: boolean
  subscribe(listener: () => void): () => void
  run<T>(action: (signal: AbortSignal) => Promise<T>): Promise<T>
}
export const cartLane = createMutationLane({ timeoutMs: 15_000 }) as Lane
export const isTimeout = (error: unknown): boolean => error instanceof Error && error.name === 'MutationTimeout'
```

- [ ] **Step 4: Server Actions** — `lib/actions/cart.ts`:

```ts
'use server'
import { redirect } from 'next/navigation'
import { commerce } from '../source/index.ts'
import { readSession, writeSession } from '../session.ts'
import { readCartOp, runCartOp, outcomeOf, type Outcome } from '../cart-ops.ts'
import { DEFAULT_LANG, isLang, type Lang } from '../locale.ts'
import { hrefFor } from '../href.ts'

async function apply(form: FormData): Promise<{ lang: Lang; code: string; count: number | null }> {
  const raw = String(form.get('lang') ?? '')
  const lang = isLang(raw) ? raw : DEFAULT_LANG
  const before = await readSession()
  const done = await runCartOp(commerce(), before, lang, readCartOp(form))
  if (done.session && done.session !== before) await writeSession(done.session)
  return { lang, code: done.code, count: done.count }
}

/** Без скрипта: запись, затем переход на корзину с кодом исхода в адресе
 *  (POST → переход → GET): обновление страницы не повторяет запись. */
export async function cartSubmit(form: FormData): Promise<void> {
  const { lang, code } = await apply(form)
  redirect(hrefFor(lang, { cart: true, result: code }))
}

/** Со скриптом: запись и исход словами; страница покажет его и перечитает
 *  корзину сама. */
export async function cartCall(form: FormData): Promise<Outcome> {
  const { lang, code, count } = await apply(form)
  return outcomeOf(lang, code, count) ?? { kind: 'error', code, message: '', count }
}
```

- [ ] **Step 5: Header counter** — `app/api/cart/route.ts`:

```ts
import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { DEFAULT_LANG } from '@/lib/locale.ts'

/* Счётчик шапки. Личное не кэшируется нигде, а страницы каталога остаются
   общими и статическими: счётчик приходит отдельным запросом, а не делает
   динамическим каждый адрес магазина. Источник молчит — `count: null`, и
   шапка показывает корзину без числа, а не «0». */
export async function GET() {
  const r = await commerce().checkout(await readSession(), DEFAULT_LANG)
  const count = r.ok ? (r.value?.cart.quantity ?? 0) : null
  return Response.json({ count }, { headers: { 'Cache-Control': 'private, no-store' } })
}
```

`components/CartLink.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import s from './Header.module.css'
import { Icon } from './Icon.tsx'

/* Корзина в шапке. Число приходит своим запросом после загрузки (страница
   каталога общая и не знает, чья она) и после каждой записи в корзину —
   событием `cart:count` от формы корзины. Без скрипта — ссылка без числа. */
export function CartLink({ href, label, countUrl }: { href: string; label: string; countUrl: string }) {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    const stop = new AbortController()
    fetch(countUrl, { cache: 'no-store', signal: stop.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ count: number | null }>) : null))
      .then((d) => { if (d && typeof d.count === 'number') setCount(d.count) })
      .catch(() => {})
    const on = (e: Event) => setCount((e as CustomEvent<number>).detail)
    window.addEventListener('cart:count', on)
    return () => { stop.abort(); window.removeEventListener('cart:count', on) }
  }, [countUrl])
  return (
    <a className={s.cart} href={href} aria-label={count ? `${label} (${count})` : label}>
      <Icon id="shopping-cart" />
      {count ? <span className={s.badge} aria-hidden="true">{count}</span> : null}
    </a>
  )
}
```

В `components/Header.tsx`: ввоз `import { CartLink } from './CartLink.tsx'`; перед кнопкой поиска:

```tsx
        <CartLink href={hrefFor(lang, { cart: true })} label={t(lang, 'nav.cart')} countUrl="/api/cart" />
```

В `components/Header.module.css` дописать:

```css
/* Корзина в шапке — ссылка с цифрой. Цель нажатия — роль, число — пилюлей
   краски «выбранного» (--pop), как выбранный сегмент: это одно значение
   «здесь что-то есть». */
.cart{position:relative;display:inline-flex;align-items:center;justify-content:center;min-block-size:var(--ctrl-target);min-inline-size:var(--ctrl-target);color:var(--ink)}
.badge{
  position:absolute;inset-block-start:0;inset-inline-end:0;
  min-inline-size:1.6em;padding-inline:.35em;border-radius:var(--r-pop);
  background:var(--pop);color:var(--on-pop);
  font-size:var(--fs-xs);line-height:1.6;text-align:center;font-variant-numeric:tabular-nums
}
```

- [ ] **Step 6: The cart form** — `components/CartForm.tsx`:

```tsx
'use client'
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import f from '@/styles/form.module.css'
import s from './Cart.module.css'
import { cartLane, isTimeout } from '@/lib/cart-lane.ts'
import type { Outcome } from '@/lib/cart-ops.ts'

type Said = Pick<Outcome, 'kind' | 'message'>
type Props = {
  lang: string; className?: string; refresh?: boolean
  submit: (form: FormData) => Promise<void>
  call: (form: FormData) => Promise<Outcome>
  initial: Said | null; timeout: string; failed: string
  after?: ReactNode; children: ReactNode
}
const idle = () => false

/** Форма записи в корзину. Без скрипта — обычная отправка: сервер пишет и
 *  переводит на корзину с исходом в адресе. Со скриптом — одна полоса на
 *  корзину вкладки: пока запись идёт, вторая отклоняется (поля выключены);
 *  нет ответа 15 секунд — исход неизвестен, корзина перечитывается, запись
 *  сама не повторяется (references/commerce-patterns.md). */
export function CartForm({ lang, className, refresh = true, submit, call, initial, timeout, failed, after, children }: Props) {
  const router = useRouter()
  const pending = useSyncExternalStore(cartLane.subscribe, () => cartLane.pending, idle)
  const [said, setSaid] = useState<Said | null>(initial)
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (cartLane.pending) return
    const form = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter)
    try {
      const out = await cartLane.run(() => call(form))
      setSaid(out)
      if (out.count !== null) window.dispatchEvent(new CustomEvent('cart:count', { detail: out.count }))
    } catch (error) {
      setSaid({ kind: 'error', message: isTimeout(error) ? timeout : failed })
    }
    if (refresh) router.refresh()
  }
  return (
    <form className={className} action={submit} onSubmit={onSubmit} aria-busy={pending}>
      <input type="hidden" name="lang" value={lang} />
      <fieldset className={s.bare} disabled={pending}>{children}</fieldset>
      <p className={f.say} data-state={said?.kind === 'error' ? 'error' : undefined} role="status">{said?.message}</p>
      {said && said.kind !== 'error' ? after : null}
    </form>
  )
}
```

- [ ] **Step 7: Add to cart** — `components/AddToCart.tsx`:

```tsx
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import go from '@/styles/go.module.css'
import s from './ProductView.module.css'
import type { BuyView } from '@/lib/product-view.ts'
import type { Outcome } from '@/lib/cart-ops.ts'
import { CartForm } from './CartForm.tsx'
import { Icon } from './Icon.tsx'

/* Покупка на карте товара. Вариант выбран адресом; нет варианта в наличии
   — кнопка выключена, почему — сказано строкой выбора или наличия выше. */
export function AddToCart({ lang, buy, submit, call }: { lang: string; buy: BuyView; submit: (form: FormData) => Promise<void>; call: (form: FormData) => Promise<Outcome> }) {
  return (
    <CartForm
      lang={lang} className={s.buy} refresh={false} submit={submit} call={call}
      initial={null} timeout={buy.timeout} failed={buy.failed}
      after={<a className={go.go} href={buy.view.href}>{buy.view.label}<Icon id="arrow-right" /></a>}
    >
      <input type="hidden" name="op" value="add" />
      <input type="hidden" name="variant" value={buy.variant ?? ''} />
      <label className={`${f.field} ${s.qty}`}>
        <span className={f.label}>{buy.quantity}</span>
        <input className={f.box} type="number" name="quantity" min={1} max={99} defaultValue={1} inputMode="numeric" />
      </label>
      <button className={b.btn} data-voice="loud" type="submit" disabled={!buy.variant}>{buy.add}</button>
    </CartForm>
  )
}
```

В `components/ProductView.module.css` дописать:

```css
/* Строка покупки: количество и кнопка в ряд, под пальцем — столбиком сами
   (перенос, не шов). Ширина поля количества — от высоты органа. */
.buy{display:flex;flex-wrap:wrap;align-items:end;gap:var(--gap-row)}
.qty{inline-size:calc(var(--ctrl-h) * 2.2)}
```

`components/ProductView.tsx`: сигнатура `ProductView({ view, lang, submit, call }: { view: ProductPageView; lang: string; submit: (form: FormData) => Promise<void>; call: (form: FormData) => Promise<Outcome> })` (ввоз `import type { Outcome } from '@/lib/cart-ops.ts'` и `import { AddToCart } from './AddToCart.tsx'`); `<AddToCart lang={lang} buy={view.buy} submit={submit} call={call} />` — сразу после строки `{view.message ? … : null}`.

`app/[lang]/product/[id]/page.tsx`: ввоз `import { cartSubmit, cartCall } from '@/lib/actions/cart.ts'`; `<ProductView view={view} lang={lang} submit={cartSubmit} call={cartCall} />`.

- [ ] **Step 8: Totals and cart view** — `components/OrderTotals.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import s from './Cart.module.css'
import type { TotalsView } from '@/lib/cart-view.ts'

/* Итоги — одни на корзину, оформление и «спасибо». Итог — самое крупное
   число, но не заголовок (скилл shop, И69). */
export function OrderTotals({ totals }: { totals: TotalsView }) {
  return (
    <div className={p.stack}>
      <dl className={s.totals}>
        {totals.rows.map((r) => <div key={r.label} className={s.row}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}
        <div className={`${s.row} ${s.grand}`}><dt>{totals.total.label}</dt><dd>{totals.total.value}</dd></div>
      </dl>
      <p className={p.muted}>{totals.note}</p>
    </div>
  )
}
```

`components/CartView.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Cart.module.css'
import type { CartPageView } from '@/lib/cart-view.ts'
import type { Outcome } from '@/lib/cart-ops.ts'
import { CartForm } from './CartForm.tsx'
import { OrderTotals } from './OrderTotals.tsx'
import { StateScreen } from './StateScreen.tsx'
import { Icon } from './Icon.tsx'

type Actions = { submit: (form: FormData) => Promise<void>; call: (form: FormData) => Promise<Outcome> }

/* Корзина: строки товара слева, итог и переход к оформлению — в колонке,
   что едет рядом (pinned). Строка показывает товар, а не сводку: снимок,
   имя со ссылкой на вариант, цену за штуку, количество, сумму (И49, И63). */
export function CartView({ lang, view, submit, call }: { lang: string; view: CartPageView } & Actions) {
  const msgs = { timeout: view.messages.timeout, failed: view.messages.failed }
  if (!view.lines.length) {
    return (
      <main id="main" className={`${p.wrap} ${p.section}`}>
        {view.notice ? <p className={p.muted} role="status">{view.notice.message}</p> : null}
        <StateScreen level={1} kind="empty" title={view.empty.title} step={view.empty.step} href={view.empty.href} />
      </main>
    )
  }
  return (
    <main id="main" className={`${p.wrap} ${p.section}`}>
      <div className={p.pagehead}><h1>{view.title}</h1><p className={p.muted}>{view.count}</p></div>
      <div className={p.sidebar}>
        <CartForm lang={lang} submit={submit} call={call} initial={view.notice} {...msgs}>
          <ul className={s.list}>
            {view.lines.map((l) => (
              <li key={l.id} className={s.line}>
                <div className={`${p.frame} ${s.thumb}`}><img src={l.image.src} alt="" width={l.image.width} height={l.image.height} loading="lazy" /></div>
                <div className={s.what}>
                  <a className={s.name} href={l.href}>{l.name}</a>
                  {l.options ? <p className={p.muted}>{l.options}</p> : null}
                  <p className={p.muted}>{l.unit}</p>
                </div>
                <div className={s.qty} role="group" aria-label={l.labels.quantity}>
                  <button className={b.btn} data-size="sm" type="submit" name="op" value={l.less ?? ''} disabled={!l.less} aria-label={l.labels.less}><Icon id="minus" /></button>
                  <output className={s.count}>{l.quantity}</output>
                  <button className={b.btn} data-size="sm" type="submit" name="op" value={l.more ?? ''} disabled={!l.more} aria-label={l.labels.more}><Icon id="plus" /></button>
                </div>
                <p className={s.sum}>{l.total}</p>
                <button className={b.btn} data-size="sm" type="submit" name="op" value={l.remove} aria-label={l.labels.remove}><Icon id="trash" /></button>
              </li>
            ))}
          </ul>
        </CartForm>
        <aside className={p.aside}>
          <div className={`${p.stack} ${p.pinned} ${s.summary}`}>
            <h2 className={s.summaryTitle}>{view.summary}</h2>
            <OrderTotals totals={view.totals} />
            <a className={b.btn} data-voice="loud" data-wide href={view.checkout.href}>{view.checkout.label}</a>
            <CartForm lang={lang} className={p.stack} submit={submit} call={call} initial={null} {...msgs}>
              <label className={f.field}>
                <span className={f.label}>{view.coupon.label}</span>
                <input className={f.box} name="code" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
              </label>
              <button className={b.btn} type="submit" name="op" value="coupon">{view.coupon.apply}</button>
              {view.coupon.applied.map((c) => (
                <button key={c.code} className={b.btn} data-size="sm" type="submit" name="op" value={c.op} aria-label={c.label}><Icon id="x" />{c.code}</button>
              ))}
            </CartForm>
          </div>
        </aside>
      </div>
    </main>
  )
}
```

`components/Cart.module.css`:

```css
/* Корзина и итоги. Раскладку дают примитивы (sidebar, stack, frame, pinned);
   здесь — строка товара, её количество и столбик итогов. */

/* Поля формы выключаются одной рамкой, а раскладку она не трогает: рамка
   `fieldset` исчезает из раскладки, ребёнок встаёт в ритм родителя. */
.bare{display:contents}

.list{list-style:none;padding:0;margin:0}
/* Строка переносится сама: на узком снимок и имя — строкой, количество и
   сумма — под ними. Шва здесь нет — есть перенос (правило 5). */
.line{display:flex;flex-wrap:wrap;align-items:center;gap:var(--gap-row);padding-block:var(--air-row);border-block-end:var(--line-w) solid var(--edge)}
.thumb{--frame:1 / 1;flex:0 0 calc(var(--ctrl-target) * 1.6)}
.what{flex:1 1 12em;min-inline-size:0}
.name{font-weight:600;color:var(--ink);overflow-wrap:anywhere}
.qty{display:inline-flex;align-items:center;gap:var(--gap-targets)}
.count{min-inline-size:2ch;text-align:center;font-variant-numeric:tabular-nums}
.sum{margin:0;min-inline-size:6em;text-align:end;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}

.summary{--stack:var(--air-row);background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card)}
.summaryTitle{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:var(--h3-weight)}
.totals{display:grid;gap:var(--gap-row);margin:0}
.row{display:flex;justify-content:space-between;gap:var(--gap-row)}
.row dd{margin:0;text-align:end;font-variant-numeric:tabular-nums}
.grand{padding-block-start:var(--gap-row);border-block-start:var(--line-w) solid var(--edge);font-weight:600}
.grand dd{font-size:var(--h3-size);font-weight:var(--h3-weight);white-space:nowrap}
```

- [ ] **Step 9: The cart page** — `app/[lang]/cart/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { langOf } from '@/lib/route.ts'
import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { first, type Params } from '@/lib/listing.ts'
import { cartView } from '@/lib/cart-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { cartSubmit, cartCall } from '@/lib/actions/cart.ts'
import { CartView } from '@/components/CartView.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

/* Личное: `noindex`, в карте сайта нет. Без сессии — экран «корзина пуста»
   с кодом 200: адрес из дерева открывается всегда (check:open). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'cart.title'), description: t(lang, 'cart.lede'), path: (l) => hrefFor(l, { cart: true }), index: false })
}

export default async function CartPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const r = await commerce().checkout(await readSession(), lang)
  if (!r.ok) return <Unavailable lang={lang} />
  const view = cartView(lang, r.value?.cart ?? null, first((await searchParams).r))
  return <CartView lang={lang} view={view} submit={cartSubmit} call={cartCall} />
}
```

- [ ] **Step 10: Run and look.** В демо после переустановки: `npm test`, `npx tsc --noEmit`, `npm run check:css`, `npm run check:code`, `npm run check:lint`, `npm run check:port`, `npm run build`, `npm run check:open`. Затем `npm run start` и сценарий рукой через браузер Playwright набора (скрипт в папке задания, не в наборе), **дважды — со скриптом и без** (`javaScriptEnabled: false`):
  1. `/ro/product/ulei-cbd-full-spectrum?option.putere=20&option.volum=10` → «Adaugă în coș» → со скриптом: «Produsul a fost adăugat în coș.», ссылка «Vezi coșul», в шапке `1`; без скрипта: переход на `/ro/cart?r=ok%3Aadd`, строка сообщения, товар в корзине;
  2. `/ro/product/ulei-cbd-full-spectrum?option.putere=10&option.volum=30`, количество 9 → «Avem doar 3 buc. în stoc — atât sunt acum în coș.»;
  3. на корзине `+`, `−`, «Șterge», код `cbd10` → скидка строкой итогов; `EXPIRAT` → «Codul a expirat…»; пустой код → «Introduceți codul de reducere.»;
  4. двойное нажатие `+` подряд со скриптом — одна запись (количество выросло на 1);
  5. последняя строка удалена → экран «Coșul este gol» с «Vedeți produsele».
  Снимки корзины на 360 и 1280 — в папку задания.
Expected: всё как написано; проверки без новых находок.

- [ ] **Step 11: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add templates/storefront
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Витрина RO: корзина — сессия в cookie только для сервера, запись одной полосой с таймаутом и без скрипта, счётчик в шапке отдельным запросом, покупка на карте товара, страница корзины" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Оформление на сайте — три шага и «спасибо»

**Files:**
- Create: `templates/storefront/lib/actions/checkout.ts`, `app/[lang]/checkout/contact/page.tsx`, `app/[lang]/checkout/delivery/page.tsx`, `app/[lang]/checkout/payment/page.tsx`, `app/[lang]/checkout/done/page.tsx`, `components/Field.tsx`, `components/CheckoutFrame.tsx`, `components/CheckoutSteps.tsx`, `components/ContactForm.tsx`, `components/MethodForm.tsx`, `components/AddressForm.tsx`, `components/PointPicker.tsx`, `components/PointForm.tsx`, `components/PaymentForm.tsx`, `components/OrderReview.tsx`, `components/OrderDone.tsx`, `components/Checkout.module.css`
- Modify: `templates/storefront/lib/company.ts` (`TERMS_DOC`), `components/Footer.tsx` (берёт `TERMS_DOC`)

(Все пути — от `templates/storefront/`.)

**Interfaces:**
- Consumes: Task 2 — `commerce()`, `stepFor`, `deliveryReady`, `Step`; Task 3 — `hrefFor` шагов, `totalsView`, ключи слов; Task 4 — `parseContact`, `parseAddress`, `FormState`, `Values`, все виды и `frameText`, `noOrder`, `emptyCheckout`, `Pickup`; Task 5 — `readSession`, `OrderTotals`, `Cart.module.css` (`.summary`, `.summaryTitle`).
- Produces: Server Actions `saveContact`, `chooseMethod`, `saveAddress`, `choosePoint`, `placeOrder` — все `(lang: string, prev: FormState, form: FormData) => Promise<FormState>`; страницы `/[lang]/checkout/{contact,delivery,payment,done}`; `TERMS_DOC = 'termeni'`.

Порядок шага (для каждой страницы шага): язык → сессия → `checkout` → источник молчит — `Unavailable`; корзины нет — экран «Coșul este gol» (200); шаг не тот — переход на `stepFor(…)`. Решает сервер, адрес шага — только просьба.

- [ ] **Step 1: Actions** — `lib/actions/checkout.ts`:

```ts
'use server'
import { redirect } from 'next/navigation'
import { commerce } from '../source/index.ts'
import { readSession } from '../session.ts'
import { isLang, type Lang } from '../locale.ts'
import { hrefFor } from '../href.ts'
import { t, type Key } from '../i18n/index.ts'
import { deliveryReady } from '../checkout-steps.ts'
import { parseAddress, parseContact, type FormState, type Values } from '../checkout-form.ts'
import type { CommerceError } from '../source/contract.ts'

const MESSAGE: Partial<Record<CommerceError, Key>> = {
  'unavailable': 'cart.error.unavailable',
  'not-found': 'delivery.methodMissing',
  'point-missing': 'delivery.pointMissing',
  'out-of-stock': 'cart.error.outOfStock',
  'payment-ineligible': 'payment.ineligible',
  'payment-declined': 'payment.declined',
}

function langFrom(raw: string): Lang {
  if (!isLang(raw)) throw new Error(`checkout: язык «${raw}» не из списка`)
  return raw
}

/** Сессии нет — оформлять нечего: на корзину. */
async function sessionOr(lang: Lang): Promise<string> {
  const session = await readSession()
  if (!session) redirect(hrefFor(lang, { cart: true }))
  return session
}

/** Отказ источника. Пустая корзина и недостающий шаг — переходом туда, где
 *  его закончить; остальное — словами у формы, введённое остаётся. */
function refused(lang: Lang, error: CommerceError, values: Values = {}): FormState {
  if (error === 'empty-cart') redirect(hrefFor(lang, { cart: true }))
  if (error === 'no-contact') redirect(hrefFor(lang, { checkout: 'contact' }))
  if (error === 'no-delivery') redirect(hrefFor(lang, { checkout: 'delivery' }))
  return { errors: {}, values, message: t(lang, MESSAGE[error] ?? 'cart.error.request') }
}

export async function saveContact(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const parsed = parseContact(lang, form)
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values, message: t(lang, 'checkout.fix') }
  const r = await commerce().setContact(await sessionOr(lang), lang, parsed.value)
  if (!r.ok) return refused(lang, r.error, parsed.value)
  redirect(hrefFor(lang, { checkout: 'delivery' }))
}

/** Выбор способа. Способ с готовыми подробностями (одна точка магазина или
 *  прежний адрес) — сразу на оплату; иначе — назад на шаг за подробностями. */
export async function chooseMethod(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const methodId = String(form.get('method') ?? '')
  if (!methodId) return { errors: {}, values: {}, message: t(lang, 'delivery.methodMissing') }
  const r = await commerce().setDelivery(await sessionOr(lang), lang, { methodId, address: null, pointId: null })
  if (!r.ok) return refused(lang, r.error)
  redirect(hrefFor(lang, { checkout: deliveryReady(r.value.delivery) ? 'payment' : 'delivery' }))
}

export async function saveAddress(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const parsed = parseAddress(lang, form)
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values, message: t(lang, 'checkout.fix') }
  const r = await commerce().setDelivery(await sessionOr(lang), lang, { methodId: String(form.get('method') ?? ''), address: parsed.value, pointId: null })
  if (!r.ok) return refused(lang, r.error, parsed.value)
  redirect(hrefFor(lang, { checkout: 'payment' }))
}

export async function choosePoint(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const pointId = String(form.get('point') ?? '')
  if (!pointId) return { errors: {}, values: {}, message: t(lang, 'delivery.pointMissing') }
  const r = await commerce().setDelivery(await sessionOr(lang), lang, { methodId: String(form.get('method') ?? ''), address: null, pointId })
  if (!r.ok) return refused(lang, r.error)
  redirect(hrefFor(lang, { checkout: 'payment' }))
}

/** Заказ. Второе нажатие того же заказа (двойной щелчок без скрипта)
 *  находит корзину уже пустой — и ведёт на «спасибо», где этот заказ и
 *  показан, а не на пустую корзину. */
export async function placeOrder(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const code = String(form.get('payment') ?? '')
  if (!code) return { errors: {}, values: {}, message: t(lang, 'payment.missing') }
  const r = await commerce().placeOrder(await sessionOr(lang), lang, code)
  if (!r.ok && r.error === 'empty-cart') redirect(hrefFor(lang, { checkout: 'done' }))
  if (!r.ok) return refused(lang, r.error)
  redirect(hrefFor(lang, { checkout: 'done' }))
}
```

- [ ] **Step 2: Terms document** — в `lib/company.ts` дописать:

```ts
/* Условия магазина — документ с этим адресом: на него ссылаются подвал и
   последний шаг оформления (заказ принимается по этим условиям). */
export const TERMS_DOC = 'termeni'
```

и в `components/Footer.tsx`: ввоз `TERMS_DOC` из `@/lib/company.ts`; `const LEGAL = [TERMS_DOC, 'confidentialitate']`.

- [ ] **Step 3: Frame, steps, field** — `components/CheckoutFrame.tsx`:

```tsx
import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './Checkout.module.css'
import c from './Cart.module.css'
import type { FrameText, StepsView } from '@/lib/checkout-view.ts'
import type { TotalsView } from '@/lib/cart-view.ts'
import type { Empty } from '@/lib/catalog-view.ts'
import { OrderTotals } from './OrderTotals.tsx'
import { CheckoutSteps } from './CheckoutSteps.tsx'
import { StateScreen } from './StateScreen.tsx'
import { Icon } from './Icon.tsx'

/* Оформление: шаги сверху, шаг слева, итог — рядом, тем же столбиком, что
   в корзине. На шаге оплаты итог стоит в самой форме, над кнопкой заказа
   (`totals={null}`): на телефоне колонка рядом уезжает под форму, и сумма
   оказалась бы ниже кнопки, которой её подтверждают. */
export function CheckoutFrame({ text, steps, totals, children }: { text: FrameText; steps: StepsView; totals: TotalsView | null; children: ReactNode }) {
  const step = <div className={`${p.stack} ${s.step}`}>{children}</div>
  return (
    <main id="main" className={`${p.wrap} ${p.section}`}>
      <div className={p.pagehead}><h1>{text.title}</h1></div>
      <CheckoutSteps steps={steps} />
      {totals ? (
        <div className={p.sidebar}>
          {step}
          <aside className={p.aside}>
            <div className={`${p.stack} ${p.pinned} ${c.summary}`}>
              <h2 className={c.summaryTitle}>{text.summary}</h2>
              <OrderTotals totals={totals} />
              <a className={go.go} href={text.back.href}><Icon id="arrow-left" />{text.back.label}</a>
            </div>
          </aside>
        </div>
      ) : step}
    </main>
  )
}

/** Шаг без корзины или «спасибо» без заказа — экран «почему и куда дальше»
 *  с кодом 200: адрес из дерева открывается всегда (check:open). */
export function CheckoutEmpty({ empty }: { empty: Empty }) {
  return (
    <main id="main" className={p.wrap}>
      <StateScreen level={1} kind="empty" title={empty.title} step={empty.step} href={empty.href} />
    </main>
  )
}
```

`components/CheckoutSteps.tsx`:

```tsx
import s from './Checkout.module.css'
import type { StepsView } from '@/lib/checkout-view.ts'

/* Шаги: пройденные — ссылками назад, текущий — `aria-current="step"`,
   будущие — текстом: к ним не пускает сервер. */
export function CheckoutSteps({ steps }: { steps: StepsView }) {
  return (
    <nav aria-label={steps.label}>
      <ol className={s.steps}>
        {steps.items.map((i, n) => (
          <li key={i.name} className={s.stepItem} aria-current={i.current ? 'step' : undefined}>
            <span className={s.stepNo} aria-hidden="true">{n + 1}</span>
            {i.href ? <a href={i.href}>{i.name}</a> : <span>{i.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

`components/Field.tsx`:

```tsx
import f from '@/styles/form.module.css'
import type { FieldView } from '@/lib/checkout-view.ts'

/* Поле — тройка «подпись, ввод, строка под ним» (styles/form.module.css):
   ошибка стоит у своего поля и связана с вводом `aria-describedby`. */
export function Field({ field, value, error }: { field: FieldView; value: string; error: string | null }) {
  const id = `f-${field.name}`
  const say = `${id}-say`
  return (
    <div className={f.field}>
      <label className={f.label} htmlFor={id}>{field.label}</label>
      <input
        className={f.box} id={id} name={field.name} type={field.type} autoComplete={field.autoComplete}
        inputMode={field.inputMode ?? undefined} maxLength={field.max} defaultValue={value} required
        aria-invalid={error ? 'true' : undefined} aria-describedby={error ? say : undefined}
      />
      {error ? <p className={f.say} id={say} data-state="error">{error}</p> : null}
    </div>
  )
}
```

- [ ] **Step 4: Step forms** — все клиентские, на `useActionState(action, null, permalink)`: без скрипта форма уходит на сервер и возвращается с ошибками у полей, введённое остаётся; со скриптом — то же без перезагрузки. `type Action = (prev: FormState, form: FormData) => Promise<FormState>`.

`components/ContactForm.tsx`:

```tsx
'use client'
import { useActionState } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { ContactView } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'
import { Field } from './Field.tsx'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

export function ContactForm({ view, action, permalink }: { view: ContactView; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.stack} action={formAction} noValidate aria-labelledby="contact-title">
      <h2 id="contact-title" className={s.title}>{view.title}</h2>
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${f.rows} ${s.plain}`} disabled={pending}>
        {view.fields.map((fd) => <Field key={fd.name} field={fd} value={state?.values[fd.name] ?? fd.value} error={state?.errors[fd.name] ?? null} />)}
      </fieldset>
      <button className={b.btn} data-voice="loud" type="submit" disabled={pending}>{view.submit}</button>
    </form>
  )
}
```

`components/MethodForm.tsx` — со скриптом выбор уходит сам при смене (`requestSubmit`), без скрипта — кнопкой:

```tsx
'use client'
import { useActionState } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { DeliveryPageView } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

export function MethodForm({ view, action, permalink }: { view: DeliveryPageView; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.stack} action={formAction} onChange={(e) => e.currentTarget.requestSubmit()}>
      <h2 id="delivery-title" className={s.title}>{view.title}</h2>
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${s.options} ${s.plain}`} disabled={pending} aria-labelledby="delivery-title">
        {view.methods.map((m) => (
          <label key={m.id} className={s.option}>
            <input type="radio" name="method" value={m.id} defaultChecked={m.checked} required />
            <span className={s.optionBody}>
              <span className={s.optionHead}><span className={s.optionName}>{m.name}</span><span className={s.price}>{m.price}</span></span>
              <span className={p.muted}>{m.meta}</span>
              <span className={p.muted}>{m.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button className={b.btn} type="submit" disabled={pending}>{view.choose}</button>
    </form>
  )
}
```

`components/AddressForm.tsx`:

```tsx
'use client'
import { useActionState } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { AddressDetails } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'
import { Field } from './Field.tsx'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

export function AddressForm({ details, action, permalink }: { details: AddressDetails; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.stack} action={formAction} noValidate aria-labelledby="address-title">
      <h2 id="address-title" className={s.title}>{details.title}</h2>
      <input type="hidden" name="method" value={details.method} />
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${f.rows} ${s.plain}`} disabled={pending}>
        {details.fields.map((fd) => <Field key={fd.name} field={fd} value={state?.values[fd.name] ?? fd.value} error={state?.errors[fd.name] ?? null} />)}
        <p className={s.country}><span className={f.label}>{details.country.label}</span> {details.country.value}</p>
      </fieldset>
      <button className={b.btn} data-voice="loud" type="submit" disabled={pending}>{details.submit}</button>
    </form>
  )
}
```

`components/PointPicker.tsx` (серверный: поиск — обычная форма GET, адрес несёт город):

```tsx
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { PickupDetails } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'
import { StateScreen } from './StateScreen.tsx'
import { PointForm } from './PointForm.tsx'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

/* Пункт выдачи ищется по городу: тысячи постаматов списком не отдаются.
   Точек мало (магазин продавца) — поиска нет, точки сразу. */
export function PointPicker({ details, action, permalink }: { details: PickupDetails; action: Action; permalink: string }) {
  return (
    <section className={p.stack} aria-labelledby="points-title">
      <h2 id="points-title" className={s.title}>{details.title}</h2>
      {details.search ? (
        <form className={s.search} action={details.search.action} method="get" role="search">
          <label className={f.field}>
            <span className={f.label}>{details.search.label}</span>
            <input className={f.box} name="city" defaultValue={details.search.value} autoComplete="address-level2" />
          </label>
          <button className={b.btn} type="submit">{details.search.submit}</button>
        </form>
      ) : null}
      {details.prompt ? <p className={p.muted}>{details.prompt}</p> : null}
      {details.empty ? <StateScreen level={2} kind="none" title={details.empty.title} step={details.empty.step} href={details.empty.href} /> : null}
      {details.points.length ? <PointForm details={details} action={action} permalink={permalink} /> : null}
    </section>
  )
}
```

`components/PointForm.tsx`:

```tsx
'use client'
import { useActionState } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { PickupDetails } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

export function PointForm({ details, action, permalink }: { details: PickupDetails; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.stack} action={formAction}>
      <input type="hidden" name="method" value={details.method} />
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${s.options} ${s.plain}`} disabled={pending} aria-labelledby="points-title">
        {details.points.map((pt) => (
          <label key={pt.id} className={s.option}>
            <input type="radio" name="point" value={pt.id} defaultChecked={pt.checked} required />
            <span className={s.optionBody}>
              <span className={s.optionName}>{pt.name}</span>
              <span className={p.muted}>{pt.meta}</span>
              {pt.hours ? <span className={p.muted}>{pt.hours}</span> : null}
            </span>
          </label>
        ))}
      </fieldset>
      <button className={b.btn} data-voice="loud" type="submit" disabled={pending}>{details.submit}</button>
    </form>
  )
}
```

`components/PaymentForm.tsx` — сверка заказа и итог приходят `children` и стоят между способами и кнопкой:

```tsx
'use client'
import { useActionState, type ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { PaymentPageView } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

/* Последний шаг. Недопустимый способ — выключен с причиной, а не спрятан;
   сумма стоит над кнопкой; кнопка называет обязанность платить (И262). */
export function PaymentForm({ view, action, permalink, children }: { view: PaymentPageView; action: Action; permalink: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.stack} action={formAction}>
      <h2 id="payment-title" className={s.title}>{view.title}</h2>
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${s.options} ${s.plain}`} disabled={pending} aria-labelledby="payment-title">
        {view.methods.map((m) => (
          <label key={m.code} className={s.option}>
            <input type="radio" name="payment" value={m.code} defaultChecked={m.checked} disabled={m.disabled} required />
            <span className={s.optionBody}>
              <span className={s.optionName}>{m.name}</span>
              <span className={p.muted}>{m.description}</span>
              {m.reason ? <span className={s.reason}>{m.reason}</span> : null}
            </span>
          </label>
        ))}
      </fieldset>
      {children}
      <p className={s.terms}>{view.terms.note} <a href={view.terms.link.href}>{view.terms.link.label}</a></p>
      <button className={b.btn} data-voice="loud" data-wide type="submit" disabled={pending}>{view.submit}</button>
    </form>
  )
}
```

- [ ] **Step 5: Review and done** — `components/OrderReview.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import s from './Checkout.module.css'
import type { ItemView, Recap } from '@/lib/checkout-view.ts'

/* Сверка заказа: кому, куда, что. «Изменить» ведёт на свой шаг и
   называет его вслух (`aria-label`): три одинаковые ссылки «Modifică»
   для чтения вслух неразличимы. */
export function OrderReview({ title, recaps, itemsTitle, items }: { title: string; recaps: Recap[]; itemsTitle: string; items: ItemView[] }) {
  return (
    <section className={`${p.stack} ${s.review}`} aria-labelledby="review-title">
      <h2 id="review-title" className={s.title}>{title}</h2>
      {recaps.map((r) => (
        <div key={r.title} className={s.recap}>
          <div className={s.recapHead}>
            <h3 className={s.recapTitle}>{r.title}</h3>
            {r.change ? <a href={r.change.href} aria-label={r.change.aria}>{r.change.label}</a> : null}
          </div>
          {r.lines.map((l) => <p key={l}>{l}</p>)}
        </div>
      ))}
      <div className={s.recap}>
        <h3 className={s.recapTitle}>{itemsTitle}</h3>
        <ul className={s.items}>
          {items.map((i) => (
            <li key={i.id} className={s.item}>
              <span>{i.line}{i.detail ? <span className={p.muted}> · {i.detail}</span> : null}</span>
              <span className={s.price}>{i.total}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

`components/OrderDone.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './Checkout.module.css'
import c from './Cart.module.css'
import type { DonePageView } from '@/lib/checkout-view.ts'
import { OrderReview } from './OrderReview.tsx'
import { OrderTotals } from './OrderTotals.tsx'
import { Icon } from './Icon.tsx'

/* «Спасибо»: номер заказа крупно, что заказано, куда и как платится.
   Письма образец не шлёт — и не обещает его (план 4, сервер Vendure). */
export function OrderDone({ view }: { view: DonePageView }) {
  return (
    <main id="main" className={`${p.wrap} ${p.section}`}>
      <div className={p.pagehead}>
        <h1>{view.title}</h1>
        <p className={s.code}>{view.code}</p>
        <p>{view.keep}</p>
      </div>
      <div className={p.sidebar}>
        <OrderReview title={view.review} recaps={view.recaps} itemsTitle={view.itemsTitle} items={view.items} />
        <aside className={p.aside}><div className={`${p.stack} ${c.summary}`}><OrderTotals totals={view.totals} /></div></aside>
      </div>
      <a className={go.go} href={view.more.href}>{view.more.label}<Icon id="arrow-right" /></a>
    </main>
  )
}
```

- [ ] **Step 6: Styles** — `components/Checkout.module.css`:

```css
/* Оформление. Раскладку дают примитивы (sidebar, stack, pinned); здесь —
   шаги, выбор карточками и сверка заказа. */

/* Рамка поля сброшена по бокам, а не целиком: `margin:0` стоял бы позже
   `stack` той же силы и гасил его ритм (снимок приёмки плана 1). */
.plain{border:0;padding:0;margin-inline:0;min-inline-size:0}
.title{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:var(--h3-weight)}
.step{--stack:var(--air-group)}

/* Шаги — одна строка с переносом. Текущий — краской выбранного (--pop),
   как выбранный сегмент: одно значение «вы здесь». */
.steps{display:flex;flex-wrap:wrap;gap:var(--gap-row) var(--air-row);list-style:none;padding:0;margin:0 0 var(--air-group)}
.stepItem{display:inline-flex;align-items:center;gap:var(--gap-targets);color:var(--ink-soft)}
.stepItem[aria-current='step']{color:var(--ink);font-weight:600}
.stepItem a{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target);color:inherit}
.stepNo{display:inline-grid;place-items:center;inline-size:1.9em;block-size:1.9em;border-radius:var(--r-pop);box-shadow:inset 0 0 0 var(--line-w) var(--edge);font-variant-numeric:tabular-nums}
.stepItem[aria-current='step'] .stepNo{background:var(--pop);color:var(--on-pop);box-shadow:none}

/* Выбор карточками: карточка — подпись радио, нажимается целиком. Кромка —
   роль `--edge` (И258); прозрачный контур проявляется в высоком контрасте,
   где тени нет. Выбранная — кольцом краски выбранного. */
.options{display:grid;gap:var(--gap-row)}
.option{
  display:flex;gap:var(--gap-row);align-items:flex-start;padding:var(--pad-inner);cursor:pointer;
  border-radius:var(--r-card);box-shadow:inset 0 0 0 var(--line-w) var(--edge);
  outline:var(--line-w) solid transparent;outline-offset:calc(var(--line-w) * -1)
}
.option:has(input:checked){box-shadow:inset 0 0 0 var(--ring-w) var(--pop)}
.option:has(input:disabled){cursor:not-allowed}
.option:has(input:disabled) .optionName{opacity:var(--state-off)}
.option input{margin-block-start:.2em;accent-color:var(--pop)}
.optionBody{display:grid;gap:var(--gap-targets);min-inline-size:0;flex:1}
.optionHead{display:flex;flex-wrap:wrap;justify-content:space-between;gap:var(--gap-row)}
.optionName{font-weight:600;color:var(--ink)}
.price{font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
/* Причина недопустимости читается полностью: выключено — имя, а не довод. */
.reason{color:var(--ink)}

.search{display:flex;flex-wrap:wrap;align-items:end;gap:var(--gap-row)}
.country{margin:0;display:flex;flex-direction:column;gap:calc(var(--ctrl-h) * .15)}

.review{--stack:var(--air-row)}
.recap{display:grid;gap:var(--gap-targets)}
.recap p{margin:0}
.recapHead{display:flex;justify-content:space-between;align-items:center;gap:var(--gap-row)}
.recapHead a{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target)}
.recapTitle{font-size:var(--fs-base);font-weight:600}
.items{list-style:none;padding:0;margin:0;display:grid;gap:var(--gap-row)}
.item{display:flex;justify-content:space-between;gap:var(--gap-row)}
.terms{color:var(--ink-soft)}
.code{font-size:var(--h3-size);font-weight:var(--h3-weight);color:var(--ink)}
```

- [ ] **Step 7: Pages.** Общий вид страницы шага (контакты):

`app/[lang]/checkout/contact/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { langOf } from '@/lib/route.ts'
import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { stepFor } from '@/lib/checkout-steps.ts'
import { contactView, emptyCheckout, frameText, stepsView } from '@/lib/checkout-view.ts'
import { totalsView } from '@/lib/cart-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { saveContact } from '@/lib/actions/checkout.ts'
import { CheckoutFrame, CheckoutEmpty } from '@/components/CheckoutFrame.tsx'
import { ContactForm } from '@/components/ContactForm.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'checkout.step.contact'), description: t(lang, 'checkout.lede'), path: (l) => hrefFor(l, { checkout: 'contact' }), index: false })
}

export default async function ContactStep({ params }: Props) {
  const lang = await langOf(params)
  const r = await commerce().checkout(await readSession(), lang)
  if (!r.ok) return <Unavailable lang={lang} />
  if (!r.value || stepFor(r.value, 'contact') === 'cart') return <CheckoutEmpty empty={emptyCheckout(lang)} />
  return (
    <CheckoutFrame text={frameText(lang)} steps={stepsView(lang, 'contact')} totals={totalsView(lang, r.value.cart)}>
      <ContactForm view={contactView(lang, r.value.contact)} action={saveContact.bind(null, lang)} permalink={hrefFor(lang, { checkout: 'contact' })} />
    </CheckoutFrame>
  )
}
```

`app/[lang]/checkout/delivery/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { langOf } from '@/lib/route.ts'
import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { first, type Params } from '@/lib/listing.ts'
import { stepFor } from '@/lib/checkout-steps.ts'
import { deliveryView, emptyCheckout, frameText, stepsView, type Pickup } from '@/lib/checkout-view.ts'
import { totalsView } from '@/lib/cart-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { chooseMethod, saveAddress, choosePoint } from '@/lib/actions/checkout.ts'
import { CheckoutFrame, CheckoutEmpty } from '@/components/CheckoutFrame.tsx'
import { MethodForm } from '@/components/MethodForm.tsx'
import { AddressForm } from '@/components/AddressForm.tsx'
import { PointPicker } from '@/components/PointPicker.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'checkout.step.delivery'), description: t(lang, 'checkout.lede'), path: (l) => hrefFor(l, { checkout: 'delivery' }), index: false })
}

export default async function DeliveryStep({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const session = await readSession()
  const r = await commerce().checkout(session, lang)
  if (!r.ok) return <Unavailable lang={lang} />
  const go = stepFor(r.value, 'delivery')
  if (!r.value || go === 'cart') return <CheckoutEmpty empty={emptyCheckout(lang)} />
  if (go !== 'delivery') redirect(hrefFor(lang, { checkout: go }))
  const c = r.value
  const methods = await commerce().deliveryMethods(session, lang)
  if (!methods.ok) return <Unavailable lang={lang} />
  const method = c.delivery?.method
  let pickup: Pickup | null = null
  if (method?.kind === 'pickup') {
    /* Точек мало — источник отдаёт их без города. Иначе город: из адреса
       поиска, а если его нет — город уже выбранной точки, чтобы она была
       видна при возврате на шаг. */
    const listed = await commerce().pickupPoints(lang, method.id, '')
    if (!listed.ok) return <Unavailable lang={lang} />
    const city = (first((await searchParams).city) ?? '').trim() || c.delivery?.point?.city || ''
    const found = listed.value.length || !city ? listed : await commerce().pickupPoints(lang, method.id, city)
    if (!found.ok) return <Unavailable lang={lang} />
    pickup = { listed: listed.value.length > 0, city, points: found.value }
  }
  const view = deliveryView(lang, { methods: methods.value, delivery: c.delivery, pickup })
  const here = hrefFor(lang, { checkout: 'delivery' })
  return (
    <CheckoutFrame text={frameText(lang)} steps={stepsView(lang, 'delivery')} totals={totalsView(lang, c.cart)}>
      <MethodForm view={view} action={chooseMethod.bind(null, lang)} permalink={here} />
      {view.details?.kind === 'address' ? <AddressForm details={view.details} action={saveAddress.bind(null, lang)} permalink={here} /> : null}
      {view.details?.kind === 'pickup' ? <PointPicker details={view.details} action={choosePoint.bind(null, lang)} permalink={here} /> : null}
    </CheckoutFrame>
  )
}
```

`app/[lang]/checkout/payment/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { langOf } from '@/lib/route.ts'
import { commerce, content } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { stepFor } from '@/lib/checkout-steps.ts'
import { emptyCheckout, frameText, paymentView, stepsView } from '@/lib/checkout-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { TERMS_DOC } from '@/lib/company.ts'
import { placeOrder } from '@/lib/actions/checkout.ts'
import { CheckoutFrame, CheckoutEmpty } from '@/components/CheckoutFrame.tsx'
import { PaymentForm } from '@/components/PaymentForm.tsx'
import { OrderReview } from '@/components/OrderReview.tsx'
import { OrderTotals } from '@/components/OrderTotals.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'checkout.step.payment'), description: t(lang, 'checkout.lede'), path: (l) => hrefFor(l, { checkout: 'payment' }), index: false })
}

export default async function PaymentStep({ params }: Props) {
  const lang = await langOf(params)
  const session = await readSession()
  const r = await commerce().checkout(session, lang)
  if (!r.ok) return <Unavailable lang={lang} />
  const go = stepFor(r.value, 'payment')
  if (!r.value || !session || go === 'cart') return <CheckoutEmpty empty={emptyCheckout(lang)} />
  if (go !== 'payment') redirect(hrefFor(lang, { checkout: go }))
  const [pay, terms] = await Promise.all([commerce().paymentMethods(session, lang), content().doc(lang, TERMS_DOC)])
  if (!pay.ok) return <Unavailable lang={lang} />
  const view = paymentView(lang, {
    methods: pay.value, checkout: r.value,
    terms: { title: terms.ok ? terms.value.title : t(lang, 'footer.legal'), href: hrefFor(lang, { doc: TERMS_DOC }) },
  })
  return (
    <CheckoutFrame text={frameText(lang)} steps={stepsView(lang, 'payment')} totals={null}>
      <PaymentForm view={view} action={placeOrder.bind(null, lang)} permalink={hrefFor(lang, { checkout: 'payment' })}>
        <OrderReview title={view.review} recaps={view.recaps} itemsTitle={view.itemsTitle} items={view.items} />
        <OrderTotals totals={view.totals} />
      </PaymentForm>
    </CheckoutFrame>
  )
}
```

`app/[lang]/checkout/done/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { langOf } from '@/lib/route.ts'
import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { doneView, noOrder } from '@/lib/checkout-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { CheckoutEmpty } from '@/components/CheckoutFrame.tsx'
import { OrderDone } from '@/components/OrderDone.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'done.title'), description: t(lang, 'done.keep'), path: (l) => hrefFor(l, { checkout: 'done' }), index: false })
}

/* Заказ — последний заказ этой сессии, а не номер из адреса: чужой заказ по
   угаданному номеру не открывается (references/commerce-patterns.md). */
export default async function DonePage({ params }: Props) {
  const lang = await langOf(params)
  const r = await commerce().lastOrder(await readSession(), lang)
  if (!r.ok) return <Unavailable lang={lang} />
  if (!r.value) return <CheckoutEmpty empty={noOrder(lang)} />
  return <OrderDone view={doneView(lang, r.value)} />
}
```

- [ ] **Step 8: Run and look.** В демо после переустановки: `npm test`, `npx tsc --noEmit`, `npm run check:css`, `npm run check:code`, `npm run check:lint`, `npm run check:port`, `npm run build`, `npm run check:open` (новые адреса без сессии — 200: экраны «Coșul este gol» и «Nu există o comandă recentă»). Затем `npm run start` и сценарий гостя браузером Playwright набора (скрипт — в папке задания), **со скриптом и без**:
  1. товар → корзина → «Finalizează comanda» → `/ro/checkout/contact`;
  2. пустая отправка — ошибки у каждого поля, фокусом доступны, `aria-invalid`; правильные данные → `/ro/checkout/delivery`;
  3. прямой заход на `/ro/checkout/payment` до доставки → переход на `/ro/checkout/delivery`;
  4. «Locker» → поиск «bucuresti» → три точки → выбор → `/ro/checkout/payment`; Back на доставку — выбранная точка на месте, отмечена;
  5. «Curier la domiciliu» → индекс «01001» → ошибка у поля «Verificați codul poștal, de exemplu 010011.»; верный адрес → оплата;
  6. на оплате: способ по умолчанию — первый допустимый; сверка — контакты, доставка, строки, итог над кнопкой; кнопка «Comandă cu obligație de plată» → `/ro/checkout/done` с номером `RO…`; корзина в шапке — без числа;
  7. обновление «спасибо» — тот же заказ; `/ro/checkout/done` из другого браузера — «Nu există o comandă recentă de afișat».
  Снимки шагов на 360 и 1280 — в папку задания.
Expected: всё как написано; проверки без новых находок.

- [ ] **Step 9: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add templates/storefront
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Витрина RO: оформление в три шага — контакты, доставка (адрес или пункт выдачи по городу), оплата со сверкой и итогом над кнопкой; «спасибо» по заказу своей сессии; всё и без скрипта" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Личные страницы в отрисованных проверках набора — полными

**Files:**
- Create: `tools/sessions.mjs`, `selftest/sessions.test.mjs`, `templates/storefront/kit.config.json`
- Modify: `tools/kit-config.mjs` (ключ `sessions`), `tools/routes.mjs` (`personal()`), `tools/check-craft.mjs` (открытие страницы с сессией), `tools/sweep.mjs` (то же), `templates/storefront/tests/session.test.ts`, `docs/rules.md` (И263), `.claude/skills/craft/references/checks.md` или место, где описан обход страниц `check:craft` (строка о личных страницах)

**Interfaces:**
- Consumes: Task 2 — `FIXTURES` образца; Task 5 — `SESSION_COOKIE`.
- Produces:
  - `kit.config.json` → `"sessions": { "cookie": "<имя cookie>" | null, "pages": { "<форма маршрута>": ["<сессия>[?<запрос>]", …] } }`; по умолчанию `{ "cookie": null, "pages": {} }`;
  - `tools/sessions.mjs`: `sessionUrls(pages, expandShape)` → адреса вида `/ro/checkout/delivery?city=…#as=sample-pickup`; `sessionOf(url, cookie)` → `{ path, cookie: 'shop_session=sample-pickup' | null }`;
  - `tools/routes.mjs`: `personal()` — адреса личных страниц с сессией для дорогих проверок; `sample()` и `all()` не меняются.

Зачем: корзина и шаги оформления без сессии открываются экраном «корзина пуста». Отрисованная проверка и свип, идущие по дереву маршрутов, мерили бы только его — а ломается полная корзина: длинное имя товара, три строки итогов, выбор карточками. Сессию несёт заголовок `Cookie` страницы проверки; хвост `#as=…` на сервер не уходит.

- [ ] **Step 1: Write the failing test** — `selftest/sessions.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sessionUrls, sessionOf } from '../tools/sessions.mjs'

const langs = (shape) => ['ro', 'hu'].map((l) => shape.replace('[lang]', l))

test('sessions: every personal shape opens full, per language, with its own query', () => {
  const pages = { '/[lang]/cart': ['sample-cart'], '/[lang]/checkout/delivery': ['sample-contact', 'sample-pickup?city=Bucure%C8%99ti'] }
  assert.deepEqual(sessionUrls(pages, langs), [
    '/ro/cart#as=sample-cart',
    '/hu/cart#as=sample-cart',
    '/ro/checkout/delivery#as=sample-contact',
    '/ro/checkout/delivery?city=Bucure%C8%99ti#as=sample-pickup',
    '/hu/checkout/delivery#as=sample-contact',
    '/hu/checkout/delivery?city=Bucure%C8%99ti#as=sample-pickup',
  ])
})

test('sessions: the tail becomes a cookie header and never reaches the server', () => {
  assert.deepEqual(sessionOf('/ro/checkout/delivery?city=X#as=sample-pickup', 'shop_session'), { path: '/ro/checkout/delivery?city=X', cookie: 'shop_session=sample-pickup' })
  assert.deepEqual(sessionOf('/ro/cart', 'shop_session'), { path: '/ro/cart', cookie: null })
  assert.deepEqual(sessionOf('/ro/cart#as=sample-cart', null), { path: '/ro/cart', cookie: null })
})
```

Run: `node --test selftest/sessions.test.mjs` → FAIL (нет модуля).

- [ ] **Step 2: `tools/sessions.mjs`**:

```js
/* Личные страницы — корзина, оформление, кабинет — без сессии открываются
 * экраном «пусто». Отрисованные проверки (`check:craft`, `sweep`) идут по
 * дереву маршрутов и мерили бы только его, а ломается полная корзина (И263).
 *
 * Проект называет в kit.config.json cookie своей сессии и заготовленные
 * сессии для форм маршрутов:
 *
 *     "sessions": { "cookie": "shop_session",
 *                   "pages": { "/[lang]/cart": ["sample-cart"],
 *                              "/[lang]/checkout/delivery": ["sample-pickup?city=Cluj"] } }
 *
 * Адрес проверки несёт сессию хвостом `#as=…`: хвост после `#` на сервер не
 * уходит, сессию несёт заголовок `Cookie` страницы проверки. */

/** Адреса личных страниц: форма → её адреса (языки) → по адресу на сессию. */
export function sessionUrls(pages, expandShape) {
  return Object.entries(pages).flatMap(([shape, list]) => expandShape(shape).flatMap((url) => list.map((entry) => {
    const q = entry.indexOf('?')
    const as = q < 0 ? entry : entry.slice(0, q)
    const query = q < 0 ? '' : entry.slice(q)
    return `${url}${query}#as=${as}`
  })))
}

/** Адрес проверки → путь для сервера и заголовок `Cookie` (или null). */
export function sessionOf(url, cookie) {
  const at = url.indexOf('#as=')
  if (at < 0 || !cookie) return { path: url.split('#')[0], cookie: null }
  return { path: url.slice(0, at), cookie: `${cookie}=${encodeURIComponent(url.slice(at + 4))}` }
}
```

- [ ] **Step 3: Config key** — в `tools/kit-config.mjs`:
  - в шапку-описание ключей — строка `"sessions": { "cookie": "shop_session", "pages": { "/[lang]/cart": ["sample-cart"] } }` с пояснением (личные страницы для отрисованных проверок, И263);
  - в `DEFAULTS` — `sessions: { cookie: null, pages: {} },` с комментарием;
  - в `load()` — ветка без файла: `sessions: { ...DEFAULTS.sessions }`; слияние: `sessions: { ...DEFAULTS.sessions, ...(own.sessions ?? {}) },`; проверка формы после `probes`:

```js
  /* Личные страницы (И263): имя cookie — слово или null; формы маршрутов —
     с «/»; сессия — имя без пробелов и, если нужно, «?запрос». Кривая запись
     падает здесь, а не молча выключает замер полных страниц. */
  const ses = cfg.sessions
  if (ses.cookie !== null && !/^[A-Za-z0-9_-]+$/.test(String(ses.cookie))) { console.error('kit.config.json: «sessions.cookie» — имя cookie или null'); process.exit(1) }
  for (const [shape, list] of Object.entries(ses.pages ?? {})) {
    if (!shape.startsWith('/') || !Array.isArray(list) || !list.every((e) => /^[A-Za-z0-9_-]+(\?\S*)?$/.test(String(e)))) {
      console.error(`kit.config.json: «sessions.pages["${shape}"]» — список имён сессий, например ["sample-cart"]`)
      process.exit(1)
    }
  }
```

  - экспорт: `export const SESSIONS = CONFIG.sessions`.

- [ ] **Step 4: `personal()`** — в `tools/routes.mjs`: ввоз `import { sessionUrls } from './sessions.mjs'` и `import { SESSIONS } from './kit-config.mjs'`; после `sample()`:

```js
/** Личные страницы полными — для дорогих проверок (И263): формы из
 *  `sessions.pages` в kit.config.json, по адресу на язык и сессию, хвостом
 *  `#as=…`. Нет cookie в конфиге — нет и личных страниц. */
export function personal() {
  if (!SESSIONS.cookie) return []
  assertData()
  return sessionUrls(SESSIONS.pages, expand(SAMPLE))
}
```

Если ввоз `kit-config.mjs` в `routes.mjs` замыкает круг (`kit-config.mjs` сам ввозит `routes.mjs`), `personal` принимает сессии доводом — `personal(sessions)`, — а `check-craft.mjs` и `sweep.mjs` передают `SESSIONS` сами.

- [ ] **Step 5: Craft and sweep open with the session.** В `tools/check-craft.mjs`:
  - ввоз `import { sessionOf } from './sessions.mjs'`, `personal` из `./routes.mjs`, `SESSIONS` из `./kit-config.mjs`;
  - список страниц: `const PAGES = [...sample(), ...personal()].filter((path) => !ONLY_PAGE || path.includes(ONLY_PAGE))`;
  - рядом с `still()` — одна функция открытия, и каждый `page.goto(BASE + …)` в файле идёт через неё:

```js
/** Открыть адрес проверки. Сессию личной страницы несёт заголовок
 *  `Cookie` — страницы берутся из общей стопки, поэтому заголовок ставится
 *  каждый раз, и у страницы без сессии он пустой (И263). */
async function openAt(page, path, options) {
  const { path: clean, cookie } = sessionOf(path, SESSIONS.cookie)
  await page.setExtraHTTPHeaders(cookie ? { cookie } : {})
  return page.goto(BASE + clean, options)
}
```

  В `tools/sweep.mjs`: ввоз `sessionOf` и `SESSIONS`; перед циклом `const { path: clean, cookie } = sessionOf(path, SESSIONS.cookie)`; `if (cookie) await page.setExtraHTTPHeaders({ cookie })`; в цикле `page.goto(base + clean, …)`; в шапке-примерах — строка `node tools/sweep.mjs '/ro/cart#as=sample-cart'   личную страницу — полной (сессия из kit.config.json)`.

- [ ] **Step 6: Template config** — `templates/storefront/kit.config.json`:

```json
{
  "sessions": {
    "cookie": "shop_session",
    "pages": {
      "/[lang]/cart": ["sample-cart"],
      "/[lang]/checkout/contact": ["sample-cart"],
      "/[lang]/checkout/delivery": ["sample-contact", "sample-address", "sample-pickup?city=Bucure%C8%99ti"],
      "/[lang]/checkout/payment": ["sample-ready"],
      "/[lang]/checkout/done": ["sample-placed"]
    }
  }
}
```

и в `templates/storefront/tests/session.test.ts` дописать:

```ts
import { readFileSync } from 'node:fs'
import { FIXTURES } from '../lib/source/sample/commerce.ts'

test('the rendered checks open personal pages with the sample’s own sessions', () => {
  const cfg = JSON.parse(readFileSync(new URL('../kit.config.json', import.meta.url), 'utf8')) as { sessions: { cookie: string; pages: Record<string, string[]> } }
  assert.equal(cfg.sessions.cookie, SESSION_COOKIE)
  const known = new Set<string>(Object.values(FIXTURES))
  for (const list of Object.values(cfg.sessions.pages)) for (const entry of list) assert.ok(known.has(entry.split('?')[0]), entry)
})
```

- [ ] **Step 7: Rule И263** — в конец `docs/rules.md`:

```markdown
## И263 · Личная страница меряется полной

**Дефект.** 23.09.2026. План 2 витрины завёл корзину и оформление. Без
сессии эти адреса открываются экраном «Coșul este gol» — так и должно быть
(`check:open` требует 200). Но отрисованная проверка и свип идут по дереву
маршрутов без сессии и мерили бы только этот экран: строки товара, три
строки итогов, выбор доставки карточками и форма адреса не попадали бы ни в
один замер — а ломается именно полная корзина на узкой ширине.

**Как писать.** Проект называет в `kit.config.json` cookie своей сессии и
заготовленные сессии для форм личных маршрутов (`"sessions"`); источник-
образец держит эти сессии заполненными. `check:craft` мерит личные
страницы и пустыми (дерево), и полными (`personal()` в `tools/routes.mjs`);
`sweep` снимает полную страницу адресом с хвостом `#as=<сессия>`. Сессию
несёт заголовок `Cookie` страницы проверки, хвост на сервер не уходит.

**Чем меряется.** `selftest/sessions.test.mjs` — адреса и заголовок;
`templates/storefront/tests/session.test.ts` — cookie в конфиге и имя в
коде одно, каждая сессия конфига есть у образца.
```

и строка в описании обхода страниц `check:craft` (скилл `craft`, справочник проверок) — одно предложение со ссылкой на И263.

- [ ] **Step 8: Run tests**

Run (корень набора): `node --test selftest/sessions.test.mjs`, `npm test`, `node tools/check-rules.mjs`. В демо после переустановки: `npm test`; `npm run build && npm run start` и `node tools/sweep.mjs '/ro/checkout/delivery?city=Bucure%C8%99ti#as=sample-pickup'` — снимки показывают три точки выдачи, не экран «пусто»; `node tools/check-craft.mjs --list` печатает личные адреса с `#as=`.
Expected: PASS; свип полной страницы проходит; в списке craft 21 личный адрес (7 × 3 языка).

- [ ] **Step 9: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add tools/sessions.mjs tools/kit-config.mjs tools/routes.mjs tools/check-craft.mjs tools/sweep.mjs selftest/sessions.test.mjs templates/storefront/kit.config.json templates/storefront/tests/session.test.ts docs/rules.md .claude/skills/craft
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Проверки набора: личные страницы меряются и пустыми, и полными — заготовленные сессии из kit.config.json, заголовок Cookie у страницы проверки; И263" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: «Доставка и оплата» из того же списка; тексты образца без имени сети

**Files:**
- Modify: `templates/storefront/lib/source/contract.ts` (`Doc.table`), `lib/source/sample/content.ts`, `lib/docs.json`, `lib/pages.ts`, `lib/checkout-view.ts` (`deliveryTable`), `lib/i18n/{ro,en,hu}.ts`, `components/DocView.tsx`, `app/[lang]/info/[doc]/page.tsx`, `selftest/carriers.test.mjs` (снять временное исключение, если Task 1 его ставил)
- Create: `templates/storefront/components/DeliveryTable.tsx`, `components/DeliveryTable.module.css`
- Test: `templates/storefront/tests/delivery-table.test.ts`

**Interfaces:**
- Consumes: Task 2 — `commerce().deliveryMethods`; Task 4 — `daysText`, `priceOrFree` (из `cart-view.ts`), ключи `delivery.kind.*`.
- Produces: `Doc.table: 'delivery' | null`; `deliveryTable(lang, methods): DeliveryTableView`; `DeliveryTable`; `DocView` принимает `table?: ReactNode`.

Зачем: скилл `shop`, «Обязательные страницы» — «Таблица способов — из того же списка, что кнопки кассы (И95)». Цена и срок, набранные в тексте страницы отдельно, разойдутся с оформлением на первой же правке цены.

- [ ] **Step 1: Write the failing test** — `tests/delivery-table.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deliveryTable } from '../lib/checkout-view.ts'
import { sampleCommerce } from '../lib/source/sample/commerce.ts'
import { sampleContent } from '../lib/source/sample/content.ts'
import { PAGES } from '../lib/pages.ts'
import DOCS from '../lib/docs.json' with { type: 'json' }

const NB = '\u00a0'

test('the delivery page table is the checkout list itself', async () => {
  const m = await sampleCommerce.deliveryMethods(null, 'ro')
  assert.ok(m.ok)
  const v = deliveryTable('ro', m.value)
  assert.deepEqual(v.head, ['Mod de livrare', 'Unde', 'Termen', 'Cost'])
  assert.deepEqual(v.rows.map((r) => [r.name, r.kind, r.days, r.price]), [
    ['Curier la domiciliu · FAN Courier', 'La adresă', '1–2 zile lucrătoare', `19,99${NB}lei`],
    ['Locker · Sameday', 'Punct de ridicare', '1–2 zile lucrătoare', `12,99${NB}lei`],
    ['Ridicare din magazin', 'Punct de ridicare', '—', 'Gratuit'],
  ])
  const doc = await sampleContent.doc('ro', 'livrare-si-plata')
  assert.ok(doc.ok)
  assert.equal(doc.value.table, 'delivery')
  const other = await sampleContent.doc('ro', 'retur')
  assert.ok(other.ok)
  assert.equal(other.value.table, null)
})

/* И261: сеть одной службы — не слово витрины. Имя службы живёт строкой
   данных способа доставки, а не в текстах главной и документов. */
test('sample texts name no carrier network', () => {
  assert.doesNotMatch(JSON.stringify(PAGES) + JSON.stringify(DOCS), /easybox/i)
})
```

Run (в демо после переустановки): `node tools/check-test.mjs tests/delivery-table.test.ts` → FAIL.

- [ ] **Step 2: Contract and content.** В `lib/source/contract.ts` тип `Doc` получает поле:

```ts
export type Doc = { slug: string; title: string; summary: string; sections: { heading: string; body: string }[]; table: 'delivery' | null }
```

В `lib/source/sample/content.ts`: `RawDoc` — `table?: 'delivery'`; `docOf` — `table: d.table ?? null`.

- [ ] **Step 3: Sample texts** — в `lib/docs.json`, документ `livrare-si-plata`:
  - поле `"table": "delivery"` после `"slug"`;
  - `summary`: ro `Curier, puncte de ridicare și plata la livrare.`, en `Courier, pickup points and cash on delivery.`, hu `Futár, átvételi pontok és utánvét.`;
  - второй раздел: heading ro `Puncte de ridicare`, en `Pickup points`, hu `Átvételi pontok`; body ro `Alegeți un locker sau un punct de ridicare la finalizarea comenzii.`, en `Choose a parcel locker or a pickup point at checkout.`, hu `A rendelés véglegesítésekor válasszon csomagautomatát vagy átvételi pontot.`
  - первый раздел, body: ro `Tarifele și termenele sunt în tabelul de mai sus; le stabilește magazinul.`, en `Rates and delivery times are in the table above; the shop sets them.`, hu `A díjak és a határidők a fenti táblázatban vannak; ezeket a bolt határozza meg.`

В `lib/pages.ts` (ro): `description` — `Livrare prin curier sau la punct de ridicare, plata ramburs.` вместо `… sau easybox, plata ramburs.`; пункт блока доставки `{ title: 'Easybox', body: 'Ridicați coletul când vă convine.' }` → `{ title: 'Locker sau punct de ridicare', body: 'Ridicați coletul când vă convine.' }`; ответ FAQ `… pentru livrarea prin curier și easybox.` → `… pentru livrarea prin curier și la punct de ridicare.`

- [ ] **Step 4: Words** — в `ro.ts`, `en.ts`, `hu.ts`:

```ts
  // ro
  'delivery.table': 'Moduri de livrare',
  'delivery.col.method': 'Mod de livrare',
  'delivery.col.where': 'Unde',
  'delivery.col.days': 'Termen',
  'delivery.col.price': 'Cost',
  // en
  'delivery.table': 'Delivery methods',
  'delivery.col.method': 'Method',
  'delivery.col.where': 'Where',
  'delivery.col.days': 'Time',
  'delivery.col.price': 'Cost',
  // hu
  'delivery.table': 'Szállítási módok',
  'delivery.col.method': 'Szállítási mód',
  'delivery.col.where': 'Hová',
  'delivery.col.days': 'Idő',
  'delivery.col.price': 'Díj',
```

(каждой тройке — свой файл; комментарии `// ro` в файлы не переносятся).

- [ ] **Step 5: Table view** — в `lib/checkout-view.ts` дописать:

```ts
export type DeliveryTableView = { caption: string; head: [string, string, string, string]; rows: { id: string; name: string; kind: string; days: string; price: string }[] }

/** Таблица способов для страницы «Доставка и оплата» — из того же списка,
 *  что выбор на оформлении (скилл shop, И95). */
export function deliveryTable(lang: Lang, methods: DeliveryMethod[]): DeliveryTableView {
  return {
    caption: t(lang, 'delivery.table'),
    head: [t(lang, 'delivery.col.method'), t(lang, 'delivery.col.where'), t(lang, 'delivery.col.days'), t(lang, 'delivery.col.price')],
    rows: methods.map((m) => ({
      id: m.id, name: [m.name, m.carrier].filter(Boolean).join(' · '), kind: t(lang, KIND[m.kind]),
      days: daysText(lang, m.days) ?? '—', price: priceOrFree(lang, m.price),
    })),
  }
}
```

- [ ] **Step 6: Component and page** — `components/DeliveryTable.tsx`:

```tsx
import s from './DeliveryTable.module.css'
import type { DeliveryTableView } from '@/lib/checkout-view.ts'

/* Таблица шире узкого экрана прокручивается в своей коробке — страница
   вбок не едет (CLAUDE.md, «Следствие»). */
export function DeliveryTable({ view }: { view: DeliveryTableView }) {
  return (
    <div className={s.scroll}>
      <table className={s.table}>
        <caption className={s.caption}>{view.caption}</caption>
        <thead><tr>{view.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {view.rows.map((r) => (
            <tr key={r.id}><th scope="row">{r.name}</th><td>{r.kind}</td><td>{r.days}</td><td className={s.price}>{r.price}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

`components/DeliveryTable.module.css`:

```css
.scroll{overflow-x:auto;max-inline-size:100%}
.table{border-collapse:collapse;min-inline-size:100%}
.caption{text-align:start;font-weight:600;padding-block-end:var(--gap-row)}
.table :is(th, td){padding:var(--gap-row);text-align:start;border-block-end:var(--line-w) solid var(--edge)}
.table thead th{color:var(--ink-soft);font-weight:600}
.price{white-space:nowrap;text-align:end;font-variant-numeric:tabular-nums}
```

`components/DocView.tsx`: сигнатура `DocView({ doc, table }: { doc: Doc; table?: ReactNode })` (ввоз `import type { ReactNode } from 'react'`); `{table ?? null}` — сразу после `pagehead`.

`app/[lang]/info/[doc]/page.tsx`: ввоз `commerce` из `@/lib/source/index.ts`, `deliveryTable` из `@/lib/checkout-view.ts`, `DeliveryTable`; перед `return`:

```tsx
  /* Документ просит таблицу способов — она из списка оформления; источник
     покупки молчит — документ стоит без таблицы, а не падает. */
  const methods = r.value.table === 'delivery' ? await commerce().deliveryMethods(null, lang) : null
  const table = methods?.ok ? <DeliveryTable view={deliveryTable(lang, methods.value)} /> : null
```

и `<DocView doc={r.value} table={table} />`.

- [ ] **Step 7: Carriers test exception.** Если Task 1 добавил в `SAMPLE` набора (`selftest/carriers.test.mjs`) `lib/pages.ts` или `lib/docs.json`, убрать их и комментарий «до Task 8»: остаётся `new Set(['lib/shipping.ts'])`.

- [ ] **Step 8: Run tests**

Run (корень набора): `node --test selftest/carriers.test.mjs`. В демо после переустановки: `npm test`, `npx tsc --noEmit`, `npm run check:css`, `npm run check:code`, `npm run check:lint`, `npm run build`, `npm run check:open`, `npm run check:seo` (страница `/ro/info/livrare-si-plata` — с таблицей).
Expected: всё зелёное.

- [ ] **Step 9: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add templates/storefront selftest/carriers.test.mjs
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Витрина RO: таблица способов на странице «Доставка и оплата» — из списка оформления (И95); тексты образца без имени сети доставки" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Фильтры каталога на телефоне — шторкой

**Files:**
- Modify: `templates/storefront/components/Filters.tsx`, `components/Filters.module.css`, `components/Catalog.tsx` (коробка, которую меряет шов), `components/Catalog.module.css`, `lib/catalog-view.ts` (`FiltersView.close`, `FiltersView.chosen`), `lib/i18n/{ro,en,hu}.ts`, `tests/catalog-view.test.ts`, `docs/open.md` набора (снять строку «Каталог на телефоне»)

**Interfaces:**
- Consumes: план 1 — `Filters`, `Catalog`, `catalogView`, примитивы `sidebar`/`aside`/`stack`; основа — `btn.module.css`, лист знаков (`sliders-horizontal`, `x`).
- Produces: `FiltersView` + `close: string` (подпись кнопки закрытия), `chosen: number` (сколько значений граней выбрано); ключи `catalog.close`, `catalog.open`.

Что должно получиться (это задача вёрстки — числа и раскладку решает исполнитель по правилам `CLAUDE.md` набора и доказывает свипом):
- на широком контейнере каталога панель фильтров — колонка рядом с полкой, как сейчас; кнопки открытия нет;
- на узком — панели в потоке нет, есть кнопка «Filtre (2)» (`catalog.open` с числом выбранных; без выбранных — без числа) над полкой; она открывает панель **шторкой** через `popover` (`popovertarget`, без скрипта): верхний слой браузера, Escape и щелчок мимо закрывают сами (правило 8), высота шторки — от окна (`dvh`), содержимое внутри прокручивается (правило 9), в шторке — кнопка закрытия (`popovertargetaction="hide"`, `aria-label` — `catalog.close`);
- шов — один из трёх набора (`820`, «панель становится выдвижной» — пример из правила 3 `CLAUDE.md`), мерит **контейнер** каталога (`@container`, правило 6), а не окно; в полосе у шва колонка не стоит пустой рядом с полкой;
- форма та же (GET, адресом): применение фильтров из шторки ведёт на адрес с гранями, как сейчас.

- [ ] **Step 1: Write the failing test** — дописать в `tests/catalog-view.test.ts`:

```ts
test('filters on a phone: the open button counts what is chosen', async () => {
  const r = await sample.listing('ro', { category: 'uleiuri', facets: { putere: ['10', '20'] }, sort: 'popular', page: null })
  assert.ok(r.ok)
  const at = (q: Query) => hrefFor('ro', { category: 'uleiuri', ...q })
  const v = catalogView('ro', { title: 'T', lede: null, listing: r.value, asked: { facets: { putere: ['10', '20'] }, sort: 'popular', page: null }, at, filters: true, empty: { title: '', step: '', href: '' } })
  assert.equal(v.filters?.chosen, 2)
  assert.equal(v.filters?.close, 'Închide filtrele')
})
```

(ввозы `sample`, `catalogView`, `hrefFor`, `Query` в этом файле уже есть — если какого-то нет, добавить.)

Run: `node tools/check-test.mjs tests/catalog-view.test.ts` → FAIL.

- [ ] **Step 2: Words** — ro `'catalog.open': 'Filtre'`, `'catalog.close': 'Închide filtrele'`; en `'catalog.open': 'Filters'`, `'catalog.close': 'Close filters'`; hu `'catalog.open': 'Szűrők'`, `'catalog.close': 'Szűrők bezárása'`.

- [ ] **Step 3: View** — в `lib/catalog-view.ts`: `FiltersView` + `open: string; close: string; chosen: number`; в `catalogView` → `open: t(lang, 'catalog.open'), close: t(lang, 'catalog.close'), chosen: listing.facets.reduce((n, f) => n + f.values.filter((v) => v.selected).length, 0)`.

- [ ] **Step 4: Component** — `components/Filters.tsx`: снаружи формы — кнопка открытия:

```tsx
      <button className={`${b.btn} ${s.open}`} type="button" popoverTarget="filters">
        <Icon id="sliders-horizontal" />{view.chosen ? `${view.open} (${view.chosen})` : view.open}
      </button>
```

форма получает `id="filters"` и `popover="auto"`; первой строкой внутри формы — заголовок шторки и кнопка закрытия:

```tsx
        <div className={s.head}>
          <h2 className={s.title}>{view.title}</h2>
          <button className={b.btn} data-size="sm" type="button" popoverTarget="filters" popoverTargetAction="hide" aria-label={view.close}><Icon id="x" /></button>
        </div>
```

Вид — в `Filters.module.css` (и `Catalog.module.css` для контейнера): на широком `.filters` стоит в потоке как сейчас (правило автора сильнее правила браузера `[popover]:not(:popover-open){display:none}` — поэтому на широком явное `display` у формы и сброс оформления `popover` из браузера: `position`, `inset`, `margin`, `border`, `padding`, `inline-size`, `block-size`, `overflow`, `color`, `background`), `.open` и `.head` скрыты; на узком — `.open` видна, `.filters:not(:popover-open)` скрыта, `.filters:popover-open` — шторка у края окна с полем `--pad-sheet`, радиусом `--r-sheet`, тенью `--sh-overlay`, `max-block-size: 100dvh`, `overflow:auto`; `::backdrop` — вуаль из ролей палитры. Ни `z-index`, ни медиазапроса по окну, ни чисел отступа.

- [ ] **Step 5: Prove.** В демо после переустановки: `npm test`, `npx tsc --noEmit`, `npm run check:css`, `npm run check:code`, `npm run check:lint`, `npm run build`, `npm run start`; `node tools/sweep.mjs /ro/catalog/uleiuri` — 41 ширина без прокрутки вбок и без пустой колонки у шва; браузером Playwright на 360: кнопка «Filtre» → шторка открыта, Escape → закрыта, щелчок мимо → закрыта, отметка грани и «Aplică filtrele» → адрес с `facet.putere=…`; без скрипта (`javaScriptEnabled: false`) — то же открытие кнопкой (`popovertarget` работает без скрипта). Снимки 360 (закрыто и открыто) и 1280 — в папку задания.

- [ ] **Step 6: Docs** — в `docs/open.md` набора, раздел «Витрина RO — отложено после плана 1», строку «**Каталог на телефоне** …» удалить (сделано в плане 2).

- [ ] **Step 7: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add templates/storefront docs/open.md
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Витрина RO: фильтры каталога на узком контейнере — шторкой в верхнем слое браузера (popover), без скрипта; шов 820 по контейнеру" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Приёмка — проверки набора, сценарий гостя, свип, снимки, отложенное

**Files:**
- Modify: всё, что найдут проверки, — в `templates/storefront/` (в демо руками ничего); `docs/open.md` набора (раздел «Витрина RO — отложено после плана 2 (23.09.2026)»); `README.md` и `skills/site-building/SKILL.md` (строка о витрине: корзина и оформление); `docs/rules.md` — если приёмка родит правило (правило — вместе с дефектом, номер после И263)
- Create: сценарий гостя — скрипт в папке задания (не в наборе)

**Interfaces:**
- Consumes: всё из задач 1–9.
- Produces: демо `D:\BusinessProject\cbd-storefront-demo`, на котором зелёное всё ниже; снимки для заказчика; запись отложенного.

- [ ] **Step 1: Reinstall.** Из корня набора: `node install.mjs --storefront --force D:\BusinessProject\cbd-storefront-demo`; в демо `npm install`.

- [ ] **Step 2: File checks** (в демо, по порядку): `npx tsc --noEmit`, `npm test`, `npm run check:css`, `npm run check:scale`, `npm run check:code`, `npm run check:lint`, `npm run check:port`, `npm run check:icons`, `npm run check:buttons`, `npm run check:palette`, `npm run check:stage`. Из корня набора: `npm test`, `node tools/check-rules.mjs`.
Expected: ноль новых находок; храповики не выросли.

- [ ] **Step 3: Built checks**: `npm run check:open` (до сборки), `npm run build`, `npm run start` (порт 3020), затем `SITE=http://localhost:3020 npm run check:urls`, `SITE=http://localhost:3020 npm run check:seo`, `SITE=http://localhost:3020 npm run check:craft` (обе темы; в списке — личные страницы с `#as=`).
Expected: `check:open` — каждый адрес 200, пробы «не найдено» — 404; `check:urls` — корзина и шаги с `noindex`, в карте сайта их нет; `check:craft` — 0 в обеих темах, на личных страницах тоже.

- [ ] **Step 4: Sweep**: `node tools/sweep.mjs` для `/ro/cart#as=sample-cart`, `/hu/cart#as=sample-cart` (длинные слова), `/ro/checkout/delivery?city=Bucure%C8%99ti#as=sample-pickup`, `/ro/checkout/delivery#as=sample-address`, `/ro/checkout/payment#as=sample-ready`, `/ro/checkout/done#as=sample-placed`, `/ro/catalog/uleiuri`, `/ro/product/ulei-cbd-full-spectrum`.
Expected: 41 ширина без прокрутки вбок, вылетов, обрезки, наездов, мелких целей и ступенек.

- [ ] **Step 5: Guest scenario.** Скрипт браузера Playwright набора (в папке задания) проходит сценарий замысла, **со скриптом и без** (`javaScriptEnabled: false`), и печатает шаги и итог:
  категория → фильтр → товар → вариант адресом → «Adaugă în coș» → корзина → `+` и `−` → код `EXPIRAT` (ошибка) и `CBD10` (скидка) → «Finalizează comanda» → пустая отправка контактов (ошибки у полей) → контакты → Back → контакты на месте → доставка «Locker» → поиск «bucuresti» → точка → оплата → сверка → «Comandă cu obligație de plată» → «спасибо» с номером `RO…`; края: пустая корзина; `/ro/checkout/payment` без корзины — экран «Coșul este gol»; `/ro/checkout/done` из чистого браузера — «Nu există o comandă recentă de afișat»; товар `low` количеством 9 — «Avem doar 3 buc. în stoc…».
Expected: оба прохода зелёные.

- [ ] **Step 6: Screens for the owner.** Снимки в папку задания `screens/`: корзина, доставка с точками, оплата, «спасибо», фильтры шторкой — на 360 и 1280, светлая и тёмная тема (контроллер отправит заказчику). Именование `<страница>-<ширина>-<тема>.png`.

- [ ] **Step 7: Deferred** — в `docs/open.md` набора новый раздел `## Витрина RO — отложено после плана 2 (23.09.2026)`, строка «что и куда»:
  - **Письмо с подтверждением заказа** — шлёт сервер (Vendure, план 4); «спасибо» его не обещает.
  - **Точки выдачи от настоящих служб** — адаптер к списку точек службы (`api.points` в справочнике) или её виджет; кэш списка. План 4.
  - **Оплата онлайн** (`kind: 'online'`) — в договоре есть, в оформлении нет перехода к провайдеру и возврата с него. Провайдер — на сервере Vendure; план 4 и позже.
  - **Счёт на фирму** (румынский рынок: CUI и название фирмы в заказе) — поля и договор. План 3 или 4.
  - **Порог бесплатной доставки** — число в данных магазина, строка в корзине «до бесплатной доставки осталось…». Скилл `shop`, план 4.
  - **Службы образца** (FAN Courier, Sameday, магазин) — выбраны исполнителем из справочника; настоящие выбирает заказчик (замысел, «Решения, которые ждут заказчика»).
  - **Справочник служб** — перепроверять перед запуском каждого магазина: службы сливаются и закрываются (раздел «Что изменилось» в `references/delivery.md`).
  - **Пересылка CBD** — письменно спросить выбранные службы до запуска (`references/delivery.md`, «Что службы пишут о CBD»). Заказчик.
  - **Формулировка кнопки заказа и сообщений** — утверждает заказчик в рамке И262.
  - всё, что приёмка нашла и не починила, — с причиной.

- [ ] **Step 8: Docs.** В `README.md` набора строку о витрине (`--storefront`) и в `skills/site-building/SKILL.md` строку витрины дополнить: «… каталог, товар, корзина и оформление заказа на образце данных».

- [ ] **Step 9: Commit**

```bash
git -C D:/BusinessProject/SkillSiteBuilding add -A templates/storefront docs README.md skills
git -C D:/BusinessProject/SkillSiteBuilding commit -m "Витрина RO, план 2: приёмка — проверки набора, сценарий гостя со скриптом и без, свип полных страниц; отложенное — в docs/open.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
