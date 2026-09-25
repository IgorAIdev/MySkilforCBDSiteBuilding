# Образцовая витрина RO — план 1: каркас и каталог на образце

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Шаблон витрины Next.js в наборе (`templates/storefront/`) ставится `node install.mjs --storefront <папка>` и открывает на образце данных главную, каталог с фильтрами и страницами, поиск, товар с вариантами, обязательные страницы, «не найдено» и ошибку — на румынском, английском и венгерском, с разметкой для поиска, — и проходит проверки набора.

**Architecture:** Страницы `app/[lang]/…` берут данные через один договор (`lib/source/contract.ts`), превращают их в готовые строки (`lib/*-view.ts`) и отдают блокам (`components/…`). За договором в этом плане — источник-образец (`lib/source/sample/…`) над `lib/products.ts` и `lib/docs.json` в формате, который читает дерево адресов набора (`tools/routes.mjs`). Вид — основа набора без исключений: глобальные `styles/*.css`, модули `styles/*.module.css` и разметка, доказанная страницей-доказательством (`tools/proof-stand.mjs`) на 41 ширине.

**Tech Stack:** Next.js 16 (App Router), React 19.2, TypeScript 6, CSS-модули, Node 24 (`node --test` с отбрасыванием типов), без Tailwind и UI-китов.

**Spec:** `docs/superpowers/specs/2026-09-23-storefront-ro-design.md`

## Global Constraints

- Языки: `ro` (основной), `en`, `hu`; язык — первый сегмент адреса у всех трёх: `/ro/…`, `/en/…`, `/hu/…`; `/` → `/ro` переадресацией в `next.config.ts`.
- Валюта RON, точность 2, запись `29,90 lei` (`currencyDisplay: 'narrowSymbol'`); деньги в договоре — целые минорные единицы + код валюты; строку цены делает только `lib/money.ts`.
- Румынский пишется `ș ț` (U+0219, U+021B), никогда `ş ţ`; венгерский — `ő ű`.
- В шаблоне нет Tailwind, UI-китов, `next/image`, `z-index` числом, `font-size` и отступов числом, медиазапросов в `components/*.module.css`, своего `position:sticky` (правила `CLAUDE.md` набора). Раскладка — примитивы `styles/primitives.module.css`; кнопка — `styles/btn.module.css`; поле — `styles/form.module.css`; «куда ведёт» — `styles/go.module.css`; знак — лист `styles/icons.svg`.
- Компонент (`components/**/*.tsx`) не ввозит `lib/source/**` рантаймом и не считает деньги (`check:port`: `backendInView`, `moneyMath`); ввоз типов — можно. Строки для компонентов готовят `lib/view.ts`, `lib/catalog-view.ts`, `lib/product-view.ts`.
- Формат `lib/products.ts` читает `tools/routes.mjs` регулярками — держать буквально:
  - полка: `{ slug: 'uleiuri', …`;
  - товар: строка начинается `  { id:'ulei-cbd-full-spectrum', cat:'uleiuri',` — **`id:'` без пробела**, `cat:'…'` на той же строке;
  - вариант: `{ id: 'uf-5-10', …` — **`id: '` с пробелом**, иначе дерево адресов примет вариант за товар;
  - `family:'…'` на первой строке — только у товара с выбором варианта; у одиночного товара его нет (дерево берёт в дорогие проверки самый большой выбор и одиночный товар).
- `lib/locale.ts`: `export const LOCALES = ['ro', 'en', 'hu'] as const` и `export const DEFAULT_LANG: Lang = 'ro'` — одной строкой каждый.
- Сегменты адресов: `[lang]`, `[cat]`, `[id]`, `[doc]` — их заполняет `tools/routes.mjs`.
- Тесты шаблона — `tests/*.test.ts`; прогон — `npm test` (в проекте это `node tools/check-test.mjs`: все `tests/**/*.test.ts`), один файл — `node tools/check-test.mjs tests/<файл>.test.ts`. Ввоз локальных модулей — с расширением `.ts`/`.mjs`; синтаксис TS только стираемый (без `enum`, `namespace`, свойств-параметров); JSX в тестах не ввозится.
- Помощники набора (`lib/source/vendure/core/*.mjs`, `lib/commerce/*.mjs`) — JavaScript: тип их ответа записывается приведением один раз, в том файле `lib/`, который их зовёт.
- Флаги настоящести в `lib/flags.ts`: `CATALOG_IS_REAL = false`, `PRICES_ARE_REAL = false`, `COMPANY_IS_REAL = false`.
- Цикл разработки: правка — в наборе, в `templates/storefront/`. Проверка — в демо: из корня набора `node install.mjs --storefront --force D:\BusinessProject\cbd-storefront-demo`, затем в `D:\BusinessProject\cbd-storefront-demo` нужные команды. В демо ничего не правится руками: находка чинится в шаблоне и переустанавливается.
- Коммиты — в ветке набора `claude/nextjs-cbd-storefront-skill`, сообщение по-русски, последняя строка `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ничего не пушится.

---

## Карта файлов

| Файл (от `templates/storefront/`) | Отвечает за |
| --- | --- |
| `package.json`, `next.config.ts`, `tsconfig.json`, `next-env.d.ts`, `.gitignore`, `.env.example` | приложение Next и его настройки |
| `scripts/copy-icons.mjs` | `styles/icons.svg` → `public/icons.svg` перед `dev` и `build` |
| `lib/locale.ts` | языки |
| `lib/market.ts` | рынок: валюта, запись валюты, теги `Intl` |
| `lib/money.ts` | одна функция цены |
| `lib/flags.ts` | флаги настоящести |
| `lib/i18n/{index,ro,en,hu}.ts` | слова интерфейса, `t()` и `tn()` (множественное число) |
| `lib/href.ts` | одна функция адреса |
| `lib/route.ts` | язык из адреса страницы (`notFound` на чужом) |
| `lib/listing.ts` | что спрошено адресом каталога |
| `lib/variant.ts` | выбор варианта адресом |
| `lib/view.ts`, `lib/catalog-view.ts`, `lib/product-view.ts` | данные договора → готовые строки для блоков |
| `lib/seo.ts`, `lib/ld.ts` | метаданные страницы; JSON-LD |
| `lib/company.ts`, `lib/contacts.ts` | реквизиты и каналы связи (образец) |
| `lib/products.ts`, `lib/docs.json`, `lib/pages.ts` | образец: каталог, документы, блоки главной |
| `lib/source/contract.ts` | договор данных — только типы |
| `lib/source/sample/{art,catalog,content}.ts` | источник-образец |
| `lib/source/index.ts` | выбор источника (`SOURCE=sample`; `live` — план 4) |
| `lib/source/vendure/core/*`, `lib/commerce/*` | копии помощников набора — кладёт установщик, в шаблоне их нет |
| `components/…` | блоки: получают готовые строки пропсами |
| `app/[lang]/…`, `app/sitemap.ts`, `app/robots.ts` | страницы, карта сайта, robots |
| `docs/words.md` | слова витрины ro · en · hu |
| `tests/*.test.ts` | тесты логики |

Изменения в наборе: `install.mjs`, `skills/site-building/assets/vendure/money.mjs`, `skills/site-building/upstream.json`, `styles/primitives.module.css` (`.seg` принимает ссылку), `tests/kit.test.ts`, `selftest/vendure-resources.test.mjs`, `selftest/storefront-install.test.mjs`, `README.md`, `skills/site-building/SKILL.md`, `docs/rules.md`.

---

### Task 1: Запись валюты в помощнике денег набора

**Files:**
- Modify: `skills/site-building/assets/vendure/money.mjs`, `skills/site-building/upstream.json` (хеш файла)
- Test: `selftest/vendure-resources.test.mjs`

**Interfaces:**
- Produces: `formatMoney(minor, currencyCode, locale, { precision = 2, display = 'symbol' })`; `display` ∈ `symbol | narrowSymbol | code | name`, иное — `TypeError`.

- [ ] **Step 1: Write the failing test** — дописать в конец `selftest/vendure-resources.test.mjs` (`formatMoney` там уже ввезён; если нет — добавить в строку ввоза из `../skills/site-building/assets/vendure/money.mjs`):

```js
test('money: the market chooses how the currency is written — lei, not RON', () => {
  assert.equal(formatMoney(2990, 'RON', 'ro-RO', { display: 'narrowSymbol' }), '29,90\u00a0lei')
  assert.equal(formatMoney(2990, 'RON', 'hu-RO', { display: 'narrowSymbol' }), '29,90\u00a0lei')
  assert.match(formatMoney(2990, 'RON', 'ro-RO'), /RON/)
  assert.throws(() => formatMoney(1, 'RON', 'ro-RO', { display: 'emoji' }), /display/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test selftest/vendure-resources.test.mjs`
Expected: FAIL — получено `29,90 RON`, ожидалось `29,90 lei`.

- [ ] **Step 3: Implement** — в `money.mjs` заменить функцию `formatMoney` целиком:

```js
const DISPLAY = new Set(['symbol', 'narrowSymbol', 'code', 'name'])

/** One formatting function for the whole storefront. `display` is how the
 *  market writes the currency: Romania reads "29,90 lei" (`narrowSymbol`),
 *  not "29,90 RON". */
export function formatMoney(minor, currencyCode, locale, { precision = 2, display = 'symbol' } = {}) {
  check(minor, precision)
  if (typeof currencyCode !== 'string' || !/^[A-Z]{3}$/.test(currencyCode)) throw new TypeError(`Invalid currency ${currencyCode}`)
  if (!DISPLAY.has(display)) throw new TypeError(`Invalid display ${display}: symbol, narrowSymbol, code or name`)
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, currencyDisplay: display }).format(minor / 10 ** precision)
}
```

- [ ] **Step 4: Refresh the resource hash** — посчитать хеш:

```bash
node -e "const c=require('crypto'),f=require('fs');console.log(c.createHash('sha256').update(f.readFileSync('skills/site-building/assets/vendure/money.mjs','utf8').replace(/\r\n/g,'\n')).digest('hex'))"
```

и вписать его в `skills/site-building/upstream.json` в поле `sha256` записи с `"local": "assets/vendure/money.mjs"`.

- [ ] **Step 5: Run tests and the resource check**

Run: `node --test selftest/vendure-resources.test.mjs && node skills/site-building/scripts/check-resources.mjs`
Expected: все тесты PASS; проверка ресурсов без ошибок.

- [ ] **Step 6: Commit**

```bash
git add skills/site-building/assets/vendure/money.mjs skills/site-building/upstream.json selftest/vendure-resources.test.mjs
git commit -m "money.mjs: рынок выбирает запись валюты — 29,90 lei, а не 29,90 RON"
```

---

### Task 2: Режим установщика `--storefront` и пустое приложение

**Files:**
- Create: `templates/storefront/package.json`, `next.config.ts`, `tsconfig.json`, `next-env.d.ts`, `.gitignore`, `.env.example`, `scripts/copy-icons.mjs`, `lib/locale.ts`, `app/[lang]/layout.tsx`, `app/[lang]/page.tsx`
- Modify: `install.mjs`
- Test: `selftest/storefront-install.test.mjs`

**Interfaces:**
- Produces: ключ `--storefront`; в целевой папке — основа набора, шаблон, `lib/source/vendure/core/{request,result,money,search,asset,product}.mjs` + `INTEGRATION.md` + `VENDURE-STARTER-LICENSE.md`, `lib/commerce/{variant-selection,mutation-lane}.mjs` + `VERCEL-LICENSE.md`.
- Produces: `lib/locale.ts` → `LOCALES`, `type Lang`, `DEFAULT_LANG`, `isLang(value: string): value is Lang`.

- [ ] **Step 1: Write the failing test** — `selftest/storefront-install.test.mjs`:

```js
/**
 * Режим --storefront (план 1 витрины RO): новый сайт получает шаблон витрины
 * поверх основы набора и копии помощников Vendure и коммерции.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const install = (...args) => spawnSync(process.execPath, [join(KIT, 'install.mjs'), ...args], { encoding: 'utf8' })

test('--storefront lays the template over the foundation and copies the kit helpers', () => {
  const root = mkdtempSync(join(tmpdir(), 'storefront-'))
  const dir = join(root, 'site')
  try {
    const r = install('--storefront', dir)
    assert.equal(r.status, 0, r.stderr)
    for (const f of ['app/[lang]/layout.tsx', 'app/[lang]/page.tsx', 'lib/locale.ts', 'next.config.ts', 'tsconfig.json',
      'styles/tokens.css', 'styles/btn.module.css', 'styles/icons.svg', 'CLAUDE.md', 'tools/check-css.mjs', 'tests/kit.test.ts',
      'lib/source/vendure/core/money.mjs', 'lib/source/vendure/core/search.mjs', 'lib/source/vendure/core/INTEGRATION.md',
      'lib/commerce/variant-selection.mjs', 'lib/commerce/VERCEL-LICENSE.md']) {
      assert.ok(existsSync(join(dir, f)), f)
    }
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    assert.ok(pkg.dependencies.next && pkg.dependencies.react, 'Next и React')
    assert.equal(pkg.scripts['check:css'], 'node tools/check-css.mjs', 'команды набора дописаны')
    assert.equal(pkg.scripts.test, 'node tools/check-test.mjs', 'тесты гоняет прогон набора')
    assert.equal(pkg.scripts.build, 'node scripts/copy-icons.mjs && next build', 'свой build шаблона остался')
    assert.match(readFileSync(join(dir, 'lib/locale.ts'), 'utf8'), /LOCALES = \['ro', 'en', 'hu'\]/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('--storefront is only for a new site', () => {
  const r = install('--storefront', '--update', join(tmpdir(), 'storefront-nope'))
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /--storefront/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test selftest/storefront-install.test.mjs`
Expected: FAIL — «Неизвестный ключ --storefront».

- [ ] **Step 3: Create the template files**

`templates/storefront/package.json` (без `test`: его даёт набор — `node tools/check-test.mjs`):

```json
{
  "name": "cbd-storefront-ro",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "node scripts/copy-icons.mjs && next dev --port 3020",
    "build": "node scripts/copy-icons.mjs && next build",
    "start": "next start --port 3020"
  },
  "dependencies": {
    "next": "^16.3.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "typescript": "^6.0.3"
  }
}
```

`templates/storefront/next.config.ts`:

```ts
import type { NextConfig } from 'next'

/* Язык — первый сегмент адреса; корень ведёт на основной язык рынка. */
const config: NextConfig = {
  async redirects() {
    return [{ source: '/', destination: '/ro', permanent: false }]
  },
}

export default config
```

`templates/storefront/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["dom", "dom.iterable", "es2023"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".claude", ".agents"]
}
```

`templates/storefront/next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

`templates/storefront/.gitignore`:

```
node_modules/
.next/
out/
public/icons.svg
.env
```

`templates/storefront/.env.example`:

```
# Источник данных: sample — образец в lib/; live — Vendure + Payload (план 4)
SOURCE=sample
SITE_URL=http://localhost:3020
VENDURE_SHOP_API_URL=
VENDURE_CHANNEL_TOKEN=
PAYLOAD_URL=
REVALIDATE_SECRET=
PREVIEW_SECRET=
```

`templates/storefront/scripts/copy-icons.mjs`:

```js
/* Лист знаков основы (styles/icons.svg) отдаётся сайтом как /icons.svg:
   знак зовут <use href="/icons.svg#id">. Копия, а не второй лист: источник
   один — выпуск `npm run icons` набора. */
import { copyFileSync, mkdirSync } from 'node:fs'
mkdirSync('public', { recursive: true })
copyFileSync('styles/icons.svg', 'public/icons.svg')
```

`templates/storefront/lib/locale.ts`:

```ts
/* Языки витрины румынского рынка. Строки LOCALES и DEFAULT_LANG читает
   tools/routes.mjs набора регуляркой — запись не менять. */
export const LOCALES = ['ro', 'en', 'hu'] as const
export type Lang = (typeof LOCALES)[number]
export const DEFAULT_LANG: Lang = 'ro'
export const isLang = (value: string): value is Lang => (LOCALES as readonly string[]).includes(value)
```

`templates/storefront/app/[lang]/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { LOCALES, isLang } from '@/lib/locale.ts'
import '@/styles/palette.css'
import '@/styles/scale.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/buttons.css'

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  )
}
```

`templates/storefront/app/[lang]/page.tsx`:

```tsx
import p from '@/styles/primitives.module.css'

export default function Home() {
  return (
    <main id="main" className={p.wrap}>
      <h1>CBD</h1>
    </main>
  )
}
```

- [ ] **Step 4: Implement `--storefront` in `install.mjs`**

В проверке ключей (строка с массивом `['--audit', '--update', '--force', '--palette', '--scale', '--skill-only', '--extras']`) добавить `'--storefront'`, а в текст ошибки под ней — `--storefront`. Сразу после этого цикла:

```js
/* Витрина — только новому сайту: шаблон ложится на пустую папку поверх
   основы, в чужой проект он не ставится ни обновлением, ни аудитом. */
const STOREFRONT = flags.has('--storefront')
if (STOREFRONT && MODE !== 'new') {
  console.error('--storefront ставит новый сайт: не смешивается с --audit, --update и --skill-only.')
  process.exit(1)
}
```

Сразу после закрывающей скобки блока `if (MODE === 'new') { … }` (до блока `if (MODE === 'audit' && !has('kit.config.json'))`):

```js
/* Шаблон витрины — поверх основы: новый сайт получает приложение Next,
   собранное из тех же шкал, примитивов и органов, и копии помощников
   набора — Vendure и коммерции — туда, откуда их ввозит шаблон. Шаблон
   кладётся после основы: его docs/words.md и tests/ дополняют её, а
   слияние команд ниже дописывает команды набора в его package.json. */
if (STOREFRONT) {
  copy(join(SRC, 'templates/storefront'), OUT)
  const vendure = join(SRC, 'skills/site-building/assets/vendure')
  for (const f of ['request.mjs', 'result.mjs', 'money.mjs', 'search.mjs', 'asset.mjs', 'product.mjs', 'INTEGRATION.md', 'VENDURE-STARTER-LICENSE.md']) {
    copy(join(vendure, f), join(OUT, 'lib/source/vendure/core', f))
  }
  const commerce = join(SRC, 'skills/site-building/assets/commerce')
  for (const f of ['variant-selection.mjs', 'mutation-lane.mjs', 'VERCEL-LICENSE.md']) {
    copy(join(commerce, f), join(OUT, 'lib/commerce', f))
  }
  moved.push('шаблон витрины и помощники Vendure и коммерции')
}
```

- [ ] **Step 5: Run the test**

Run: `node --test selftest/storefront-install.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 6: Install into the demo and build**

Run (корень набора): `node install.mjs --storefront D:\BusinessProject\cbd-storefront-demo`
Then (в `D:\BusinessProject\cbd-storefront-demo`): `npm install`, `npm run typecheck`, `npm test`, `npm run build`
Expected: всё проходит; в выводе сборки — `/[lang]` для `ro`, `en`, `hu`.

- [ ] **Step 7: Commit**

```bash
git add install.mjs templates/storefront selftest/storefront-install.test.mjs
git commit -m "Витрина RO: режим установщика --storefront и пустое приложение на основе набора"
```

---

### Task 3: Рынок, цена, флаги, слова интерфейса и словарь витрины

**Files:**
- Create: `templates/storefront/lib/market.ts`, `lib/money.ts`, `lib/flags.ts`, `lib/i18n/index.ts`, `lib/i18n/ro.ts`, `lib/i18n/en.ts`, `lib/i18n/hu.ts`, `docs/words.md`
- Test: `templates/storefront/tests/money.test.ts`, `tests/i18n.test.ts`

**Interfaces:**
- Consumes: `Lang` (Task 2), `formatMoney` (Task 1) из `lib/source/vendure/core/money.mjs`.
- Produces:
  - `MARKET = { country: 'RO', currency: 'RON', precision: 2, display: 'narrowSymbol' } as const`; `intlLocale(lang: Lang): string` (`ro-RO`, `en-RO`, `hu-RO`)
  - `money(value: { minor: number; currency: string }, lang: Lang): string`
  - `CATALOG_IS_REAL`, `PRICES_ARE_REAL`, `COMPANY_IS_REAL` — `false`
  - `type Key = keyof typeof RO`; `t(lang: Lang, key: Key, vars?: Record<string, string | number>): string`; `tn(lang: Lang, base: 'catalog.count', n: number): string` — множественное число по `Intl.PluralRules`, `{n}` подставляется.

- [ ] **Step 1: Write the failing tests**

`tests/money.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { money } from '../lib/money.ts'
import { intlLocale, MARKET } from '../lib/market.ts'

test('prices read the Romanian way in every language', () => {
  assert.equal(MARKET.currency, 'RON')
  assert.equal(intlLocale('hu'), 'hu-RO')
  assert.equal(money({ minor: 2990, currency: 'RON' }, 'ro'), '29,90\u00a0lei')
  assert.equal(money({ minor: 0, currency: 'RON' }, 'en'), '0,00\u00a0lei')
  assert.throws(() => money({ minor: 29.9, currency: 'RON' }, 'ro'), /integer/)
})
```

`tests/i18n.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RO } from '../lib/i18n/ro.ts'
import { EN } from '../lib/i18n/en.ts'
import { HU } from '../lib/i18n/hu.ts'
import { t, tn } from '../lib/i18n/index.ts'
import { auditWords } from '../tools/words.mjs'

test('every language has every key, and no key is empty', () => {
  const keys = Object.keys(RO).sort()
  for (const [name, dict] of Object.entries({ EN, HU })) {
    assert.deepEqual(Object.keys(dict).sort(), keys, name)
    for (const [k, v] of Object.entries(dict)) assert.ok(String(v).trim(), `${name}.${k}`)
  }
})

test('placeholders are filled and a missing variable is loud', () => {
  assert.equal(t('ro', 'product.from', { price: '9,90 lei' }), 'de la 9,90 lei')
  assert.throws(() => t('ro', 'product.from'), /price/)
})

test('counts follow the plural rules of the language', () => {
  assert.equal(tn('ro', 'catalog.count', 1), '1 produs')
  assert.equal(tn('ro', 'catalog.count', 12), '12 produse')
  assert.equal(tn('ro', 'catalog.count', 20), '20 de produse')
  assert.equal(tn('en', 'catalog.count', 1), '1 product')
  assert.equal(tn('hu', 'catalog.count', 7), '7 termék')
})

test('Romanian uses comma-below ș ț, never cedilla ş ţ', () => {
  assert.doesNotMatch(JSON.stringify(RO), /[\u015E\u015F\u0162\u0163]/)
})

test('the storefront words dictionary is well-formed', () => {
  assert.deepEqual(auditWords(readFileSync(new URL('../docs/words.md', import.meta.url), 'utf8')), [])
})
```

- [ ] **Step 2: Run to verify they fail**

Run (корень набора): `node install.mjs --storefront --force D:\BusinessProject\cbd-storefront-demo`; в демо: `node tools/check-test.mjs tests/money.test.ts tests/i18n.test.ts`
Expected: FAIL — модулей `lib/money.ts`, `lib/i18n/*` нет.

- [ ] **Step 3: Implement the market, money and flags**

`lib/market.ts`:

```ts
import type { Lang } from './locale.ts'

/* Рынок шаблона — Румыния. Валюта и её запись — факт рынка, не вёрстки. */
export const MARKET = { country: 'RO', currency: 'RON', precision: 2, display: 'narrowSymbol' } as const
const TAGS: Record<Lang, string> = { ro: 'ro-RO', en: 'en-RO', hu: 'hu-RO' }
export const intlLocale = (lang: Lang): string => TAGS[lang]
```

`lib/money.ts`:

```ts
import { formatMoney } from './source/vendure/core/money.mjs'
import { MARKET, intlLocale } from './market.ts'
import type { Lang } from './locale.ts'

/* Одна функция цены на всю витрину (check:port, семья moneyMath): блок
   получает готовую строку; делит и форматирует только она. */
export const money = (value: { minor: number; currency: string }, lang: Lang): string =>
  formatMoney(value.minor, value.currency, intlLocale(lang), { precision: MARKET.precision, display: MARKET.display })
```

`lib/flags.ts`:

```ts
/* Флаги настоящести (соглашение набора, tools/stages.mjs): пока false, цена
   не идёт в разметку для поиска, а страницы закрыты от обхода. */
export const CATALOG_IS_REAL = false
export const PRICES_ARE_REAL = false
export const COMPANY_IS_REAL = false
```

- [ ] **Step 4: Implement the dictionaries**

`lib/i18n/ro.ts`:

```ts
export const RO = {
  'skip': 'Sari la conținut',
  'nav.catalog': 'Toate produsele',
  'nav.search': 'Căutare',
  'nav.lang': 'Limba',
  'crumb.label': 'Navigare',
  'crumb.home': 'Acasă',
  'catalog.title': 'Toate produsele',
  'catalog.lede': 'Uleiuri, capsule, cosmetice și produse pentru animale.',
  'catalog.count.one': '{n} produs',
  'catalog.count.few': '{n} produse',
  'catalog.count.other': '{n} de produse',
  'catalog.filters': 'Filtre',
  'catalog.apply': 'Aplică filtrele',
  'catalog.clear': 'Șterge filtrele',
  'catalog.sort': 'Sortează după',
  'sort.popular': 'Cele mai vândute',
  'sort.priceAsc': 'Preț crescător',
  'sort.priceDesc': 'Preț descrescător',
  'catalog.empty': 'Nu sunt produse în această categorie',
  'catalog.emptyStep': 'Vedeți toate produsele',
  'catalog.none': 'Niciun produs nu corespunde filtrelor',
  'catalog.noneStep': 'Ștergeți unul dintre filtre',
  'catalog.invalid': 'Unele filtre nu mai există și nu au fost aplicate',
  'catalog.prev': 'Pagina anterioară',
  'catalog.next': 'Pagina următoare',
  'catalog.page': 'Pagina {n} din {total}',
  'product.from': 'de la {price}',
  'product.inStock': 'În stoc',
  'product.lowStock': 'Stoc limitat',
  'product.outOfStock': 'Stoc epuizat',
  'product.choose': 'Alegeți o variantă',
  'product.missing': 'Această combinație nu există',
  'product.lab': 'Buletin de analiză',
  'product.batch': 'Lot {batch}',
  'product.related': 'Produse similare',
  'lab.lab': 'Laborator',
  'lab.date': 'Data analizei',
  'search.label': 'Caută produse',
  'search.submit': 'Caută',
  'search.prompt': 'Scrieți ce căutați',
  'search.results': 'Rezultate pentru „{q}”',
  'search.none': 'Niciun rezultat pentru „{q}”',
  'search.noneStep': 'Verificați ortografia sau vedeți toate produsele',
  'unavailable.title': 'Magazinul nu răspunde momentan',
  'unavailable.step': 'Încercați din nou peste un minut',
  'notFound.title': 'Pagina nu a fost găsită',
  'notFound.step': 'Mergeți la toate produsele',
  'error.title': 'Ceva nu a funcționat',
  'error.retry': 'Încercați din nou',
  'footer.company': 'Companie',
  'footer.help': 'Ajutor',
  'footer.legal': 'Informații legale',
  'footer.anpc': 'ANPC — soluționarea alternativă a litigiilor',
  'footer.sol': 'Platforma europeană SOL',
  'sample': 'Date de exemplu',
} as const
```

`lib/i18n/en.ts`:

```ts
import type { RO } from './ro.ts'

export const EN: Record<keyof typeof RO, string> = {
  'skip': 'Skip to content',
  'nav.catalog': 'All products',
  'nav.search': 'Search',
  'nav.lang': 'Language',
  'crumb.label': 'Breadcrumb',
  'crumb.home': 'Home',
  'catalog.title': 'All products',
  'catalog.lede': 'Oils, capsules, cosmetics and products for pets.',
  'catalog.count.one': '{n} product',
  'catalog.count.few': '{n} products',
  'catalog.count.other': '{n} products',
  'catalog.filters': 'Filters',
  'catalog.apply': 'Apply filters',
  'catalog.clear': 'Clear filters',
  'catalog.sort': 'Sort by',
  'sort.popular': 'Best sellers',
  'sort.priceAsc': 'Price: low to high',
  'sort.priceDesc': 'Price: high to low',
  'catalog.empty': 'There are no products in this category',
  'catalog.emptyStep': 'See all products',
  'catalog.none': 'No products match these filters',
  'catalog.noneStep': 'Clear one of the filters',
  'catalog.invalid': 'Some filters no longer exist and were not applied',
  'catalog.prev': 'Previous page',
  'catalog.next': 'Next page',
  'catalog.page': 'Page {n} of {total}',
  'product.from': 'from {price}',
  'product.inStock': 'In stock',
  'product.lowStock': 'Low stock',
  'product.outOfStock': 'Out of stock',
  'product.choose': 'Choose an option',
  'product.missing': 'This combination does not exist',
  'product.lab': 'Lab report',
  'product.batch': 'Batch {batch}',
  'product.related': 'Similar products',
  'lab.lab': 'Laboratory',
  'lab.date': 'Test date',
  'search.label': 'Search products',
  'search.submit': 'Search',
  'search.prompt': 'Type what you are looking for',
  'search.results': 'Results for “{q}”',
  'search.none': 'No results for “{q}”',
  'search.noneStep': 'Check the spelling or see all products',
  'unavailable.title': 'The shop is not responding right now',
  'unavailable.step': 'Try again in a minute',
  'notFound.title': 'Page not found',
  'notFound.step': 'Go to all products',
  'error.title': 'Something went wrong',
  'error.retry': 'Try again',
  'footer.company': 'Company',
  'footer.help': 'Help',
  'footer.legal': 'Legal',
  'footer.anpc': 'ANPC — alternative dispute resolution',
  'footer.sol': 'EU online dispute resolution',
  'sample': 'Sample data',
}
```

`lib/i18n/hu.ts`:

```ts
import type { RO } from './ro.ts'

export const HU: Record<keyof typeof RO, string> = {
  'skip': 'Ugrás a tartalomra',
  'nav.catalog': 'Összes termék',
  'nav.search': 'Keresés',
  'nav.lang': 'Nyelv',
  'crumb.label': 'Morzsamenü',
  'crumb.home': 'Főoldal',
  'catalog.title': 'Összes termék',
  'catalog.lede': 'Olajok, kapszulák, kozmetikumok és termékek háziállatoknak.',
  'catalog.count.one': '{n} termék',
  'catalog.count.few': '{n} termék',
  'catalog.count.other': '{n} termék',
  'catalog.filters': 'Szűrők',
  'catalog.apply': 'Szűrők alkalmazása',
  'catalog.clear': 'Szűrők törlése',
  'catalog.sort': 'Rendezés',
  'sort.popular': 'Legnépszerűbb',
  'sort.priceAsc': 'Ár szerint növekvő',
  'sort.priceDesc': 'Ár szerint csökkenő',
  'catalog.empty': 'Ebben a kategóriában nincs termék',
  'catalog.emptyStep': 'Összes termék megtekintése',
  'catalog.none': 'Nincs a szűrőknek megfelelő termék',
  'catalog.noneStep': 'Töröljön egy szűrőt',
  'catalog.invalid': 'Néhány szűrő már nem létezik, ezért nem alkalmaztuk',
  'catalog.prev': 'Előző oldal',
  'catalog.next': 'Következő oldal',
  'catalog.page': '{n}. oldal / {total}',
  'product.from': 'már {price}',
  'product.inStock': 'Raktáron',
  'product.lowStock': 'Korlátozott készlet',
  'product.outOfStock': 'Elfogyott',
  'product.choose': 'Válasszon változatot',
  'product.missing': 'Ez a kombináció nem létezik',
  'product.lab': 'Laborvizsgálati jegyzőkönyv',
  'product.batch': 'Tétel: {batch}',
  'product.related': 'Hasonló termékek',
  'lab.lab': 'Laboratórium',
  'lab.date': 'Vizsgálat dátuma',
  'search.label': 'Termékek keresése',
  'search.submit': 'Keresés',
  'search.prompt': 'Írja be, mit keres',
  'search.results': 'Találatok: „{q}”',
  'search.none': 'Nincs találat: „{q}”',
  'search.noneStep': 'Ellenőrizze a helyesírást, vagy nézze meg az összes terméket',
  'unavailable.title': 'A bolt jelenleg nem válaszol',
  'unavailable.step': 'Próbálja újra egy perc múlva',
  'notFound.title': 'Az oldal nem található',
  'notFound.step': 'Összes termék megtekintése',
  'error.title': 'Valami nem sikerült',
  'error.retry': 'Próbálja újra',
  'footer.company': 'Cég',
  'footer.help': 'Segítség',
  'footer.legal': 'Jogi információk',
  'footer.anpc': 'ANPC — alternatív vitarendezés',
  'footer.sol': 'Uniós online vitarendezési platform',
  'sample': 'Mintaadatok',
}
```

`lib/i18n/index.ts`:

```ts
import type { Lang } from '../locale.ts'
import { intlLocale } from '../market.ts'
import { RO } from './ro.ts'
import { EN } from './en.ts'
import { HU } from './hu.ts'

export type Key = keyof typeof RO
type PluralBase = { [K in Key]: K extends `${infer B}.one` ? B : never }[Key]
const DICT: Record<Lang, Record<Key, string>> = { ro: RO, en: EN, hu: HU }

/** Слово интерфейса. Подстановка `{имя}` обязательна: пропущенная
 *  переменная — ошибка, а не «{n} produse» на витрине. */
export function t(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  return DICT[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(name in vars)) throw new Error(`t(${lang}, ${key}): нет переменной ${name}`)
    return String(vars[name])
  })
}

/** Счёт по правилам языка: по-румынски 1 produs, 12 produse, 20 de produse. */
export function tn(lang: Lang, base: PluralBase, n: number): string {
  const form = new Intl.PluralRules(intlLocale(lang)).select(n)
  const key = (form === 'one' || form === 'few' ? `${base}.${form}` : `${base}.other`) as Key
  return t(lang, key, { n })
}
```

- [ ] **Step 5: Write the storefront words dictionary** — `templates/storefront/docs/words.md` (заменяет образец набора при установке `--storefront`):

```markdown
# Слова витрины

Слой 12 основания: голос, словарь терминов на языках рынка, глагол на
кнопке, ошибка у поля с шагом, пустой экран с шагом. **Слова утверждает
заказчик** — это образец для румынского рынка (ro · en · hu), пока он не
сказал иначе (`CLAUDE.md`, «Граница ответственности»).

Устройство файла меряют ворота слоя 12 (`tools/stages.mjs`) и тест
`tests/i18n.test.ts`: разделы на месте, у каждой ошибки и каждого пустого
экрана есть шаг, в румынском нет седильных `ş ţ` вместо `ș ț`. Слова
интерфейса живут в `lib/i18n/{ro,en,hu}.ts`; этот файл — их словарь для
заказчика.

## Порядок работы

1. Заказчик называет голос (раздел «Голос»).
2. Термины магазина — один перевод на язык, без синонимов («Глоссарий»).
3. Кнопки — глаголом действия, которое случится («Кнопки»).
4. Ошибка у поля — что не так и что сделать, у того поля, где ошибка.
5. Пустой экран — почему пусто и куда дальше.

## Голос

| Решение | Образец | Почему |
| --- | --- | --- |
| Обращение | ro — вежливое «dumneavoastră» в письмах, «Vedeți», «Alegeți» в интерфейсе; hu — «Ön» | товар рядом со здоровьем: доверие раньше дружбы |
| Тон | спокойный, фактами; без восклицательных знаков | крик на витрине читается как реклама, а не как магазин |
| Числа | как в данных: 10 %, 1000 mg, 29,90 lei | цифра — факт, её не округляют словами |
| Буквы | ro — `ș ț` с запятой (U+0219, U+021B); hu — `ő ű` | седильные `ş ţ` румын видит сразу |

## Глоссарий

| Понятие | ro | en | hu | Заметка |
| --- | --- | --- | --- | --- |
| корзина | coș | cart | kosár | одно слово везде: шапка, страница, письмо |
| оформление заказа | finalizarea comenzii | checkout | pénztár | |
| в наличии | în stoc | in stock | raktáron | |
| нет в наличии | stoc epuizat | out of stock | elfogyott | |
| мало осталось | stoc limitat | low stock | korlátozott készlet | |
| партия | lot | batch | gyártási tétel | номер на этикетке = номер в протоколе |
| протокол лаборатории | buletin de analiză | lab report | laborvizsgálati jegyzőkönyv | не «certificat»: это протокол измерения |
| концентрация | concentrație | strength | erősség | проценты и мг — два факта, не один |
| курьер до двери | curier la domiciliu | courier to your door | futár házhoz | |
| постамат | easybox | parcel locker | csomagautomata | easybox — имя сети |
| наложенный платёж | ramburs | cash on delivery | utánvét | |
| код скидки | cod de reducere | discount code | kedvezménykód | |

## Кнопки

| Действие | ro | en | hu |
| --- | --- | --- | --- |
| положить в корзину | Adaugă în coș | Add to cart | Kosárba |
| перейти к оформлению | Finalizează comanda | Continue to checkout | Tovább a pénztárhoz |
| подтвердить заказ | Trimite comanda | Place order | Megrendelés elküldése |
| применить код | Aplică | Apply | Beváltás |
| убрать из корзины | Șterge | Remove | Eltávolítás |
| применить фильтры | Aplică filtrele | Apply filters | Szűrők alkalmazása |
| сбросить фильтры | Șterge filtrele | Clear filters | Szűrők törlése |
| искать | Caută | Search | Keresés |

## Ошибки у поля

| Поле и случай | ro | Шаг | en | hu |
| --- | --- | --- | --- | --- |
| e-mail пуст | Introduceți adresa de e-mail | pentru a primi confirmarea comenzii | Enter your email to receive the order confirmation | Adja meg e-mail-címét a rendelés visszaigazolásához |
| e-mail неполон | Adresa de e-mail pare incompletă | de exemplu nume@exemplu.ro | The email looks incomplete, e.g. name@example.com | Az e-mail-cím hiányosnak tűnik, például nev@pelda.hu |
| телефон | Introduceți numărul de telefon | de exemplu 0722 123 456 | Enter your phone number, e.g. 0722 123 456 | Adja meg telefonszámát, például 0722 123 456 |
| код скидки | Codul nu este valabil | verificați-l și introduceți-l fără spații | The code is not valid; check it and enter it without spaces | A kód nem érvényes; ellenőrizze, és szóközök nélkül írja be |
| количество больше остатка | Mai sunt doar {n} buc. | micșorați cantitatea sau alegeți altă variantă | Only {n} left; lower the quantity or pick another option | Csak {n} db van; csökkentse a mennyiséget, vagy válasszon másik változatot |
| обязательное поле | Completați câmpul | pentru a continua | Fill in this field to continue | A folytatáshoz töltse ki a mezőt |

## Пустые экраны

| Экран | ro | Шаг | en | hu |
| --- | --- | --- | --- | --- |
| пустая корзина | Coșul este gol | Vedeți uleiurile | Your cart is empty — browse the oils | A kosár üres — nézze meg az olajokat |
| поиск без результатов | Niciun rezultat pentru „{q}” | Verificați ortografia sau vedeți toate produsele | No results for “{q}” — check the spelling or see all products | Nincs találat: „{q}” — ellenőrizze a helyesírást, vagy nézze meg az összes terméket |
| фильтры без результатов | Niciun produs nu corespunde filtrelor | Ștergeți unul dintre filtre | No products match these filters — clear one | Nincs a szűrőknek megfelelő termék — töröljön egy szűrőt |
| пустая категория | Nu sunt produse în această categorie | Vedeți toate produsele | There are no products in this category — see all products | Ebben a kategóriában nincs termék — összes termék |
| нет заказов | Nu aveți încă nicio comandă | Mergeți la magazin | No orders yet — go to the shop | Még nincs rendelése — irány a bolt |
| магазин не отвечает | Magazinul nu răspunde momentan | Încercați din nou peste un minut | The shop is not responding — try again in a minute | A bolt jelenleg nem válaszol — próbálja újra egy perc múlva |

«Магазин не отвечает» — не «пусто»: источник недоступен и пустой каталог —
разные состояния.
```

- [ ] **Step 6: Run the tests**

Run (корень набора): `node install.mjs --storefront --force D:\BusinessProject\cbd-storefront-demo`; в демо: `npm test`
Expected: PASS — оба новых файла и `tests/kit.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add templates/storefront
git commit -m "Витрина RO: рынок, цена в леях, флаги настоящести, слова ro · en · hu с множественным числом"
```

---

### Task 4: Договор данных и образец каталога

**Files:**
- Create: `templates/storefront/lib/source/contract.ts`, `lib/products.ts`, `lib/source/sample/art.ts`, `lib/source/sample/catalog.ts`, `lib/source/index.ts`
- Test: `templates/storefront/tests/catalog.test.ts`

**Interfaces:**
- Consumes: `Lang`; `MARKET`; `facetValueFilters`, `pageVariables`, `pageCount` из `lib/source/vendure/core/search.mjs`.
- Produces — `lib/source/contract.ts` целиком (Task 5 его не меняет):

```ts
import type { Lang } from '../locale.ts'

export type Money = { minor: number; currency: string }
export type Stock = 'in' | 'low' | 'out'
export type Image = { src: string; alt: string; width: number; height: number }
export type OptionGroup = { code: string; name: string; options: { code: string; name: string }[] }
export type Variant = { id: string; sku: string; name: string; price: Money; stock: Stock; options: Record<string, string>; batch: string | null }
export type LabReport = { batch: string; lab: string; date: string; cbdPercent: number; thcPercent: number; url: string }
export type Product = { id: string; category: string; name: string; summary: string; description: string; images: Image[]; optionGroups: OptionGroup[]; variants: Variant[]; labReports: LabReport[] }
export type Price = { kind: 'single'; value: Money } | { kind: 'range'; min: Money; max: Money }
export type Card = { id: string; category: string; name: string; image: Image; price: Price; stock: Stock }
export type Facet = { code: string; name: string; values: { code: string; name: string; count: number; selected: boolean }[] }
export type Collection = { slug: string; name: string; description: string }
export type SortKey = 'popular' | 'price-asc' | 'price-desc'
export type ListingQuery = { category?: string; q?: string; facets: Record<string, string[]>; sort: SortKey; page: string | null }
export type Listing = { items: Card[]; total: number; page: number; pages: number; facets: Facet[]; invalid: string[] }
export type Doc = { slug: string; title: string; summary: string; sections: { heading: string; body: string }[] }
export type Block =
  | { type: 'hero'; title: string; lede: string; cta: string }
  | { type: 'categories'; title: string }
  | { type: 'featured'; title: string; ids: string[] }
  | { type: 'lab'; title: string; body: string }
  | { type: 'delivery'; title: string; items: { title: string; body: string }[] }
  | { type: 'faq'; title: string; items: { q: string; a: string }[] }
export type Page = { slug: string; title: string; description: string; blocks: Block[] }
export type Result<T> = { ok: true; value: T } | { ok: false; reason: 'unavailable' | 'not-found' | 'bad-request' }

/** Торговля: Vendure в плане 4, образец — сейчас. */
export type Source = {
  collections(lang: Lang): Promise<Result<Collection[]>>
  collection(lang: Lang, slug: string): Promise<Result<Collection>>
  listing(lang: Lang, query: ListingQuery): Promise<Result<Listing>>
  cards(lang: Lang, ids: string[]): Promise<Result<Card[]>>
  product(lang: Lang, id: string): Promise<Result<Product>>
  related(lang: Lang, id: string, limit: number): Promise<Result<Card[]>>
  productIds(): Promise<Result<string[]>>
}

/** Содержание: Payload в плане 4, образец — сейчас. */
export type Content = {
  page(lang: Lang, slug: string): Promise<Result<Page>>
  docs(lang: Lang): Promise<Result<Doc[]>>
  doc(lang: Lang, slug: string): Promise<Result<Doc>>
}
```

- Produces: `sample: Source` (`lib/source/sample/catalog.ts`); `source(): Source` (`lib/source/index.ts`).

- [ ] **Step 1: Write the failing test** — `tests/catalog.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import type { ListingQuery } from '../lib/source/contract.ts'

const q = (over: Partial<ListingQuery> = {}): ListingQuery => ({ facets: {}, sort: 'popular', page: null, ...over })

test('categories and a shelf come from the sample in the asked language', async () => {
  const cols = await sample.collections('hu')
  assert.ok(cols.ok && cols.value.length === 4)
  const oils = await sample.listing('ro', q({ category: 'uleiuri' }))
  assert.ok(oils.ok)
  assert.equal(oils.value.total, 5)
  assert.ok(oils.value.items.every((c) => c.category === 'uleiuri'))
})

test('two values of one facet are alternatives, two facets narrow, unknown values are reported', async () => {
  const one = await sample.listing('ro', q({ facets: { forma: ['ulei'] } }))
  const two = await sample.listing('ro', q({ facets: { forma: ['ulei', 'capsule'] } }))
  const narrow = await sample.listing('ro', q({ facets: { forma: ['ulei'], putere: ['10'] } }))
  assert.ok(one.ok && two.ok && narrow.ok)
  assert.equal(one.value.total, 5)
  assert.equal(two.value.total, 7, 'ИЛИ внутри грани расширяет')
  assert.equal(narrow.value.total, 2, 'И между гранями сужает')
  const unknown = await sample.listing('ro', q({ facets: { forma: ['nu-exista'] } }))
  assert.ok(unknown.ok)
  assert.deepEqual(unknown.value.invalid, ['forma:nu-exista'])
})

test('page numbers: junk is a bad request, past the end is not found', async () => {
  assert.deepEqual(await sample.listing('ro', q({ page: 'abc' })), { ok: false, reason: 'bad-request' })
  assert.deepEqual(await sample.listing('ro', q({ page: '999' })), { ok: false, reason: 'not-found' })
  const second = await sample.listing('ro', q({ page: '2' }))
  assert.ok(second.ok)
  assert.deepEqual([second.value.page, second.value.pages, second.value.items.length], [2, 2, 4])
})

test('sorting by price is by the lowest variant price', async () => {
  const r = await sample.listing('ro', q({ sort: 'price-asc' }))
  assert.ok(r.ok)
  const low = r.value.items.map((c) => (c.price.kind === 'single' ? c.price.value.minor : c.price.min.minor))
  assert.deepEqual(low, [...low].sort((a, b) => a - b))
})

test('cards come in the asked order and unknown ids are skipped', async () => {
  const r = await sample.cards('en', ['capsule-cbd-25', 'nu-exista', 'ulei-cbd-full-spectrum'])
  assert.ok(r.ok)
  assert.deepEqual(r.value.map((c) => c.id), ['capsule-cbd-25', 'ulei-cbd-full-spectrum'])
  assert.equal(r.value[1].price.kind, 'range')
})

test('a product carries option groups, variants and lab reports; unknown id is not found', async () => {
  const p = await sample.product('en', 'ulei-cbd-full-spectrum')
  assert.ok(p.ok)
  assert.equal(p.value.optionGroups.length, 2)
  assert.ok(p.value.variants.some((v) => v.stock === 'out'), 'образец держит и «нет в наличии»')
  assert.equal(p.value.labReports.length, 4)
  assert.deepEqual(await sample.product('en', 'nu-exista'), { ok: false, reason: 'not-found' })
})

test('search finds by name in the asked language', async () => {
  const r = await sample.listing('hu', q({ q: 'olaj' }))
  assert.ok(r.ok && r.value.total >= 5)
  const none = await sample.listing('ro', q({ q: 'zzzz' }))
  assert.ok(none.ok && none.value.total === 0)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: переустановить в демо (`--force`), в демо `node tools/check-test.mjs tests/catalog.test.ts`
Expected: FAIL — модулей нет.

- [ ] **Step 3: Write the contract** — `lib/source/contract.ts` ровно как в блоке Interfaces выше.

- [ ] **Step 4: Write the sample art** — `lib/source/sample/art.ts`:

```ts
/* Снимок-образец: нарисованный флакон цвета товара с пометкой «sample».
   Настоящие снимки — от заказчика; этот не выдаёт себя за фотографию. */
export function bottle(hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="hsl(${hue} 28% 90%)"/><rect x="340" y="170" width="120" height="60" rx="10" fill="hsl(${hue} 22% 28%)"/><rect x="290" y="230" width="220" height="400" rx="36" fill="hsl(${hue} 30% 40%)"/><text x="400" y="450" font-family="sans-serif" font-size="44" fill="#fff" text-anchor="middle">${label}</text><text x="400" y="740" font-family="sans-serif" font-size="28" fill="hsl(${hue} 20% 35%)" text-anchor="middle">sample</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
```

- [ ] **Step 5: Write the sample catalogue** — `lib/products.ts` (формат строк — см. Global Constraints; цены — в банях, минорных единицах RON):

```ts
import type { Lang } from './locale.ts'

type T = Record<Lang, string>
export type SampleCategory = { slug: string; name: T; description: T }
export type SampleVariant = { id: string; sku: string; options: Record<string, string>; price: number; stock: 'in' | 'low' | 'out'; batch: string }
export type SampleProduct = {
  id: string; cat: string; family?: string; label: string; hue: number; popular: number
  name: T; summary: T; description: T
  facets: Record<string, string[]>
  groups: { code: string; name: T; options: { code: string; name: T }[] }[]
  variants: SampleVariant[]
}

export const CATEGORIES: SampleCategory[] = [
  { slug: 'uleiuri', name: { ro: 'Uleiuri CBD', en: 'CBD oils', hu: 'CBD olajok' }, description: { ro: 'Uleiuri cu CBD în mai multe concentrații.', en: 'CBD oils in several strengths.', hu: 'CBD olajok több erősségben.' } },
  { slug: 'capsule', name: { ro: 'Capsule', en: 'Capsules', hu: 'Kapszulák' }, description: { ro: 'Doză fixă în fiecare capsulă.', en: 'A fixed dose in every capsule.', hu: 'Minden kapszulában azonos adag.' } },
  { slug: 'cosmetice', name: { ro: 'Cosmetice', en: 'Cosmetics', hu: 'Kozmetikumok' }, description: { ro: 'Creme și balsamuri cu CBD.', en: 'Creams and balms with CBD.', hu: 'CBD-s krémek és balzsamok.' } },
  { slug: 'animale', name: { ro: 'Pentru animale', en: 'For pets', hu: 'Háziállatoknak' }, description: { ro: 'Uleiuri pentru câini și pisici.', en: 'Oils for dogs and cats.', hu: 'Olajok kutyáknak és macskáknak.' } },
]

export const FACETS: { code: string; name: T; values: { code: string; name: T }[] }[] = [
  { code: 'forma', name: { ro: 'Formă', en: 'Form', hu: 'Forma' }, values: [
    { code: 'ulei', name: { ro: 'Ulei', en: 'Oil', hu: 'Olaj' } },
    { code: 'capsule', name: { ro: 'Capsule', en: 'Capsules', hu: 'Kapszula' } },
    { code: 'crema', name: { ro: 'Cremă', en: 'Cream', hu: 'Krém' } },
    { code: 'pentru-animale', name: { ro: 'Pentru animale', en: 'For pets', hu: 'Háziállatoknak' } },
  ] },
  { code: 'putere', name: { ro: 'Concentrație', en: 'Strength', hu: 'Erősség' }, values: [
    { code: '5', name: { ro: '5 %', en: '5 %', hu: '5 %' } },
    { code: '10', name: { ro: '10 %', en: '10 %', hu: '10 %' } },
    { code: '20', name: { ro: '20 %', en: '20 %', hu: '20 %' } },
    { code: '30', name: { ro: '30 %', en: '30 %', hu: '30 %' } },
  ] },
]

const strength = (codes: string[]) => ({ code: 'putere', name: { ro: 'Concentrație', en: 'Strength', hu: 'Erősség' }, options: codes.map((c) => ({ code: c, name: { ro: `${c} %`, en: `${c} %`, hu: `${c} %` } })) })
const volume = (codes: string[]) => ({ code: 'volum', name: { ro: 'Volum', en: 'Volume', hu: 'Térfogat' }, options: codes.map((c) => ({ code: c, name: { ro: `${c} ml`, en: `${c} ml`, hu: `${c} ml` } })) })
const count = (codes: string[]) => ({ code: 'bucati', name: { ro: 'Bucăți', en: 'Count', hu: 'Darab' }, options: codes.map((c) => ({ code: c, name: { ro: `${c} buc.`, en: `${c} pcs`, hu: `${c} db` } })) })

/* Первым стоит товар с самым большим выбором вариантов: дерево адресов
   (tools/routes.mjs) берёт в дорогие проверки первую семью и первый товар
   без семьи. */
export const PRODUCTS: SampleProduct[] = [
  { id:'ulei-cbd-full-spectrum', cat:'uleiuri', family:'ulei-full', label: 'CBD', hue: 145, popular: 1,
    name: { ro: 'Ulei CBD full spectrum', en: 'Full-spectrum CBD oil', hu: 'Teljes spektrumú CBD olaj' },
    summary: { ro: 'Extract de cânepă în ulei MCT, cu picurător.', en: 'Hemp extract in MCT oil, with dropper.', hu: 'Kenderkivonat MCT olajban, cseppentővel.' },
    description: { ro: 'Extract din flori de cânepă din soiuri înscrise în catalogul comun al UE, în ulei MCT. Fiecare lot are buletin de analiză.', en: 'Extract of hemp flowers from varieties in the EU common catalogue, in MCT oil. Every batch has a lab report.', hu: 'Az EU közös fajtajegyzékében szereplő kenderfajták virágkivonata MCT olajban. Minden tételhez laborjegyzőkönyv tartozik.' },
    facets: { forma: ['ulei'], putere: ['5', '10', '20', '30'] },
    groups: [strength(['5', '10', '20', '30']), volume(['10', '30'])],
    variants: [
      { id: 'uf-5-10', sku: 'UF-5-10', options: { putere: '5', volum: '10' }, price: 8990, stock: 'in', batch: 'RO-2409-05' },
      { id: 'uf-10-10', sku: 'UF-10-10', options: { putere: '10', volum: '10' }, price: 12990, stock: 'in', batch: 'RO-2409-10' },
      { id: 'uf-10-30', sku: 'UF-10-30', options: { putere: '10', volum: '30' }, price: 29990, stock: 'low', batch: 'RO-2409-10' },
      { id: 'uf-20-10', sku: 'UF-20-10', options: { putere: '20', volum: '10' }, price: 21990, stock: 'in', batch: 'RO-2409-20' },
      { id: 'uf-30-10', sku: 'UF-30-10', options: { putere: '30', volum: '10' }, price: 29990, stock: 'out', batch: 'RO-2409-30' },
    ] },
  { id:'ulei-cbd-izolat-10', cat:'uleiuri', label: '10 %', hue: 190, popular: 4,
    name: { ro: 'Ulei CBD izolat 10 %', en: 'CBD isolate oil 10 %', hu: 'CBD izolátum olaj 10 %' },
    summary: { ro: 'CBD izolat în ulei de semințe de cânepă.', en: 'CBD isolate in hemp seed oil.', hu: 'CBD izolátum kendermagolajban.' },
    description: { ro: 'CBD izolat, dizolvat în ulei de semințe de cânepă presat la rece.', en: 'CBD isolate dissolved in cold-pressed hemp seed oil.', hu: 'Hidegen sajtolt kendermagolajban oldott CBD izolátum.' },
    facets: { forma: ['ulei'], putere: ['10'] },
    groups: [],
    variants: [{ id: 'ui-10-10', sku: 'UI-10-10', options: {}, price: 11990, stock: 'in', batch: 'RO-2408-I10' }] },
  { id:'ulei-cbd-5-incepatori', cat:'uleiuri', label: '5 %', hue: 120, popular: 3,
    name: { ro: 'Ulei CBD 5 % pentru început', en: 'CBD oil 5 % starter', hu: 'CBD olaj 5 % kezdőknek' },
    summary: { ro: 'Concentrație blândă, 10 ml.', en: 'A gentle strength, 10 ml.', hu: 'Enyhe erősség, 10 ml.' },
    description: { ro: 'Pentru cine încearcă un ulei CBD pentru prima dată.', en: 'For those trying a CBD oil for the first time.', hu: 'Azoknak, akik először próbálnak CBD olajat.' },
    facets: { forma: ['ulei'], putere: ['5'] },
    groups: [],
    variants: [{ id: 'us-5-10', sku: 'US-5-10', options: {}, price: 6990, stock: 'in', batch: 'RO-2409-S05' }] },
  { id:'ulei-cbd-20-seara', cat:'uleiuri', family:'ulei-seara', label: '20 %', hue: 250, popular: 6,
    name: { ro: 'Ulei CBD 20 % cu lavandă', en: 'CBD oil 20 % with lavender', hu: 'CBD olaj 20 % levendulával' },
    summary: { ro: 'Cu ulei esențial de lavandă.', en: 'With lavender essential oil.', hu: 'Levendula illóolajjal.' },
    description: { ro: 'Ulei CBD 20 % cu ulei esențial de lavandă.', en: 'CBD oil 20 % with lavender essential oil.', hu: '20 %-os CBD olaj levendula illóolajjal.' },
    facets: { forma: ['ulei'], putere: ['20'] },
    groups: [volume(['10', '30'])],
    variants: [
      { id: 'ul-20-10', sku: 'UL-20-10', options: { volum: '10' }, price: 22990, stock: 'in', batch: 'RO-2409-L20' },
      { id: 'ul-20-30', sku: 'UL-20-30', options: { volum: '30' }, price: 49990, stock: 'in', batch: 'RO-2409-L20' },
    ] },
  { id:'ulei-cbd-30-forte', cat:'uleiuri', label: '30 %', hue: 10, popular: 8,
    name: { ro: 'Ulei CBD 30 % forte', en: 'CBD oil 30 % forte', hu: 'CBD olaj 30 % forte' },
    summary: { ro: 'Concentrație mare, 10 ml.', en: 'High strength, 10 ml.', hu: 'Magas erősség, 10 ml.' },
    description: { ro: 'Pentru cine folosește deja uleiuri CBD.', en: 'For those who already use CBD oils.', hu: 'Azoknak, akik már használnak CBD olajat.' },
    facets: { forma: ['ulei'], putere: ['30'] },
    groups: [],
    variants: [{ id: 'uf30-10', sku: 'UF30-10', options: {}, price: 31990, stock: 'in', batch: 'RO-2409-F30' }] },
  { id:'capsule-cbd-25', cat:'capsule', family:'capsule', label: '25 mg', hue: 30, popular: 2,
    name: { ro: 'Capsule CBD 25 mg', en: 'CBD capsules 25 mg', hu: 'CBD kapszula 25 mg' },
    summary: { ro: 'Capsule vegane, 25 mg CBD fiecare.', en: 'Vegan capsules, 25 mg CBD each.', hu: 'Vegán kapszulák, egyenként 25 mg CBD.' },
    description: { ro: 'Fiecare capsulă conține 25 mg CBD.', en: 'Each capsule contains 25 mg CBD.', hu: 'Minden kapszula 25 mg CBD-t tartalmaz.' },
    facets: { forma: ['capsule'], putere: ['10'] },
    groups: [count(['30', '60'])],
    variants: [
      { id: 'cc-30', sku: 'CC-30', options: { bucati: '30' }, price: 13990, stock: 'in', batch: 'RO-2409-C25' },
      { id: 'cc-60', sku: 'CC-60', options: { bucati: '60' }, price: 24990, stock: 'low', batch: 'RO-2409-C25' },
    ] },
  { id:'capsule-cbd-10', cat:'capsule', label: '10 mg', hue: 45, popular: 9,
    name: { ro: 'Capsule CBD 10 mg', en: 'CBD capsules 10 mg', hu: 'CBD kapszula 10 mg' },
    summary: { ro: 'Doză mică, 30 de capsule.', en: 'A small dose, 30 capsules.', hu: 'Kis adag, 30 kapszula.' },
    description: { ro: 'Fiecare capsulă conține 10 mg CBD.', en: 'Each capsule contains 10 mg CBD.', hu: 'Minden kapszula 10 mg CBD-t tartalmaz.' },
    facets: { forma: ['capsule'], putere: ['5'] },
    groups: [],
    variants: [{ id: 'cm-30', sku: 'CM-30', options: {}, price: 7990, stock: 'in', batch: 'RO-2408-C10' }] },
  { id:'crema-cbd', cat:'cosmetice', label: 'crema', hue: 20, popular: 5,
    name: { ro: 'Cremă cu CBD', en: 'CBD cream', hu: 'CBD krém' },
    summary: { ro: '50 ml, 500 mg CBD.', en: '50 ml, 500 mg CBD.', hu: '50 ml, 500 mg CBD.' },
    description: { ro: 'Cremă cu CBD și mentol.', en: 'Cream with CBD and menthol.', hu: 'Krém CBD-vel és mentollal.' },
    facets: { forma: ['crema'] },
    groups: [],
    variants: [{ id: 'cr-50', sku: 'CR-50', options: {}, price: 9990, stock: 'in', batch: 'RO-2409-CR' }] },
  { id:'balsam-buze-cbd', cat:'cosmetice', label: 'balsam', hue: 340, popular: 10,
    name: { ro: 'Balsam de buze cu CBD', en: 'CBD lip balm', hu: 'CBD ajakbalzsam' },
    summary: { ro: '5 g, 50 mg CBD.', en: '5 g, 50 mg CBD.', hu: '5 g, 50 mg CBD.' },
    description: { ro: 'Balsam cu ceară de albine și CBD.', en: 'Beeswax balm with CBD.', hu: 'Méhviaszos balzsam CBD-vel.' },
    facets: { forma: ['crema'] },
    groups: [],
    variants: [{ id: 'bb-5', sku: 'BB-5', options: {}, price: 2990, stock: 'in', batch: 'RO-2408-BB' }] },
  { id:'ser-fata-cbd', cat:'cosmetice', label: 'ser', hue: 300, popular: 11,
    name: { ro: 'Ser de față cu CBD', en: 'CBD face serum', hu: 'CBD arcszérum' },
    summary: { ro: 'Ser ușor, 30 ml.', en: 'A light serum, 30 ml.', hu: 'Könnyű szérum, 30 ml.' },
    description: { ro: 'Ser cu CBD și acid hialuronic.', en: 'Serum with CBD and hyaluronic acid.', hu: 'Szérum CBD-vel és hialuronsavval.' },
    facets: { forma: ['crema'] },
    groups: [],
    variants: [{ id: 'sf-30', sku: 'SF-30', options: {}, price: 15990, stock: 'out', batch: 'RO-2407-SF' }] },
  { id:'ulei-caini-cbd', cat:'animale', family:'animale-caini', label: 'dog', hue: 90, popular: 7,
    name: { ro: 'Ulei CBD pentru câini', en: 'CBD oil for dogs', hu: 'CBD olaj kutyáknak' },
    summary: { ro: 'Cu ulei de somon.', en: 'With salmon oil.', hu: 'Lazacolajjal.' },
    description: { ro: 'Ulei CBD 5 % cu ulei de somon, pentru câini.', en: 'CBD oil 5 % with salmon oil, for dogs.', hu: '5 %-os CBD olaj lazacolajjal, kutyáknak.' },
    facets: { forma: ['pentru-animale'], putere: ['5'] },
    groups: [volume(['10', '30'])],
    variants: [
      { id: 'ac-10', sku: 'AC-10', options: { volum: '10' }, price: 7990, stock: 'in', batch: 'RO-2409-AC' },
      { id: 'ac-30', sku: 'AC-30', options: { volum: '30' }, price: 17990, stock: 'in', batch: 'RO-2409-AC' },
    ] },
  { id:'ulei-pisici-cbd', cat:'animale', label: 'cat', hue: 60, popular: 12,
    name: { ro: 'Ulei CBD pentru pisici', en: 'CBD oil for cats', hu: 'CBD olaj macskáknak' },
    summary: { ro: '10 ml, 2,5 %.', en: '10 ml, 2.5 %.', hu: '10 ml, 2,5 %.' },
    description: { ro: 'Concentrație redusă, pentru pisici.', en: 'A low strength, for cats.', hu: 'Alacsony erősség, macskáknak.' },
    facets: { forma: ['pentru-animale'], putere: ['5'] },
    groups: [],
    variants: [{ id: 'ap-10', sku: 'AP-10', options: {}, price: 6990, stock: 'low', batch: 'RO-2409-AP' }] },
]

export const LAB_REPORTS: Record<string, { lab: string; date: string; cbdPercent: number; thcPercent: number }> = {
  'RO-2409-05': { lab: 'Laborator de exemplu', date: '2026-09-02', cbdPercent: 5.1, thcPercent: 0.12 },
  'RO-2409-10': { lab: 'Laborator de exemplu', date: '2026-09-02', cbdPercent: 10.2, thcPercent: 0.15 },
  'RO-2409-20': { lab: 'Laborator de exemplu', date: '2026-09-03', cbdPercent: 20.4, thcPercent: 0.18 },
  'RO-2409-30': { lab: 'Laborator de exemplu', date: '2026-09-03', cbdPercent: 30.1, thcPercent: 0.19 },
  'RO-2409-C25': { lab: 'Laborator de exemplu', date: '2026-09-04', cbdPercent: 10.0, thcPercent: 0.05 },
}
```

- [ ] **Step 6: Write the sample source** — `lib/source/sample/catalog.ts`:

```ts
import type { Lang } from '../../locale.ts'
import type { Card, Collection, Facet, Listing, Product, Result, SortKey, Source, Stock } from '../contract.ts'
import { CATEGORIES, FACETS, LAB_REPORTS, PRODUCTS, type SampleProduct } from '../../products.ts'
import { facetValueFilters, pageVariables, pageCount } from '../vendure/core/search.mjs'
import { MARKET } from '../../market.ts'
import { bottle } from './art.ts'

/* Помощники набора — JavaScript; тип их ответа записан здесь один раз. */
type Filter = { and: string } | { or: string[] }
type Paging = { ok: true; page: number; take: number; skip: number } | { ok: false }

const PAGE = 8
const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
const money = (minor: number) => ({ minor, currency: MARKET.currency })
const overall = (stocks: Stock[]): Stock => (stocks.every((s) => s === 'out') ? 'out' : stocks.some((s) => s === 'in') ? 'in' : 'low')
const image = (p: SampleProduct, lang: Lang) => ({ src: bottle(p.hue, p.label), alt: p.name[lang], width: 800, height: 800 })
const low = (p: SampleProduct) => Math.min(...p.variants.map((v) => v.price))

function card(p: SampleProduct, lang: Lang): Card {
  const prices = p.variants.map((v) => v.price)
  const [min, max] = [Math.min(...prices), Math.max(...prices)]
  return {
    id: p.id, category: p.cat, name: p.name[lang], image: image(p, lang),
    price: min === max ? { kind: 'single', value: money(min) } : { kind: 'range', min: money(min), max: money(max) },
    stock: overall(p.variants.map((v) => v.stock)),
  }
}

/* Словарь «код → id» — как у адаптера Vendure; в образце id — это «грань:значение». */
const DICTIONARY = Object.fromEntries(FACETS.map((f) => [f.code, Object.fromEntries(f.values.map((v) => [v.code, `${f.code}:${v.code}`]))]))
const carries = (p: SampleProduct, id: string) => {
  const [facet, value] = id.split(':')
  return (p.facets[facet] ?? []).includes(value)
}
const matches = (p: SampleProduct, filters: Filter[]) =>
  filters.every((f) => ('and' in f ? carries(p, f.and) : f.or.some((id) => carries(p, id))))

const ORDER: Record<SortKey, (a: SampleProduct, b: SampleProduct) => number> = {
  'popular': (a, b) => a.popular - b.popular,
  'price-asc': (a, b) => low(a) - low(b) || a.popular - b.popular,
  'price-desc': (a, b) => low(b) - low(a) || a.popular - b.popular,
}

const collection = (c: (typeof CATEGORIES)[number], lang: Lang): Collection => ({ slug: c.slug, name: c.name[lang], description: c.description[lang] })

export const sample: Source = {
  async collections(lang) {
    return ok(CATEGORIES.map((c) => collection(c, lang)))
  },
  async collection(lang, slug) {
    const c = CATEGORIES.find((x) => x.slug === slug)
    return c ? ok(collection(c, lang)) : { ok: false, reason: 'not-found' }
  },
  async listing(lang, query) {
    const paging = pageVariables({ page: query.page ?? undefined }, { pageSize: PAGE }) as Paging
    if (!paging.ok) return { ok: false, reason: 'bad-request' }
    const { filters, invalid } = facetValueFilters(query.facets, DICTIONARY) as { filters: Filter[]; invalid: string[] }
    const words = (query.q ?? '').trim().toLocaleLowerCase(lang)
    const found = PRODUCTS
      .filter((p) => (!query.category || p.cat === query.category) && (!words || p.name[lang].toLocaleLowerCase(lang).includes(words)))
      .filter((p) => matches(p, filters))
      .sort(ORDER[query.sort])
    const pages = pageCount(found.length, PAGE) as number
    if (paging.page > pages) return { ok: false, reason: 'not-found' }
    const facets: Facet[] = FACETS.map((f) => ({
      code: f.code, name: f.name[lang],
      values: f.values.map((v) => ({
        code: v.code, name: v.name[lang],
        count: found.filter((p) => (p.facets[f.code] ?? []).includes(v.code)).length,
        selected: (query.facets[f.code] ?? []).includes(v.code),
      })),
    }))
    const listing: Listing = { items: found.slice(paging.skip, paging.skip + paging.take).map((p) => card(p, lang)), total: found.length, page: paging.page, pages, facets, invalid }
    return ok(listing)
  },
  async cards(lang, ids) {
    return ok(ids.flatMap((id) => {
      const p = PRODUCTS.find((x) => x.id === id)
      return p ? [card(p, lang)] : []
    }))
  },
  async product(lang, id) {
    const p = PRODUCTS.find((x) => x.id === id)
    if (!p) return { ok: false, reason: 'not-found' }
    const batches = [...new Set(p.variants.map((v) => v.batch))].filter((b) => LAB_REPORTS[b])
    const product: Product = {
      id: p.id, category: p.cat, name: p.name[lang], summary: p.summary[lang], description: p.description[lang],
      images: [image(p, lang)],
      optionGroups: p.groups.map((g) => ({ code: g.code, name: g.name[lang], options: g.options.map((o) => ({ code: o.code, name: o.name[lang] })) })),
      variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, name: p.name[lang], price: money(v.price), stock: v.stock, options: v.options, batch: v.batch })),
      labReports: batches.map((b) => ({ batch: b, ...LAB_REPORTS[b], url: `#lab-${b}` })),
    }
    return ok(product)
  },
  async related(lang, id, limit) {
    const p = PRODUCTS.find((x) => x.id === id)
    if (!p) return { ok: false, reason: 'not-found' }
    return ok(PRODUCTS.filter((x) => x.cat === p.cat && x.id !== id).slice(0, limit).map((x) => card(x, lang)))
  },
  async productIds() {
    return ok(PRODUCTS.map((p) => p.id))
  },
}
```

- [ ] **Step 7: Write the source switch** — `lib/source/index.ts`:

```ts
import type { Source } from './contract.ts'
import { sample } from './sample/catalog.ts'

/* Один выбор источника на всю витрину. `live` (Vendure + Payload) — план 4. */
const which = () => process.env.SOURCE ?? 'sample'

export function source(): Source {
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sample
}
```

- [ ] **Step 8: Run tests and the route tree**

Run: переустановить в демо (`--force`); в демо `node tools/check-test.mjs tests/catalog.test.ts`, затем
`node --input-type=module -e "const r = await import('./tools/routes.mjs'); r.assertData(); console.log(r.LOCALES.join(','), r.CATEGORIES.length, r.PRODUCTS.length, r.PRODUCTS.filter((p) => p.family).length)"`
Expected: 7 tests PASS; строка `ro,en,hu 4 12 4`.

- [ ] **Step 9: Commit**

```bash
git add templates/storefront
git commit -m "Витрина RO: договор данных и образец каталога — полки, грани ИЛИ/И, листание, товар, протоколы партий"
```

---

### Task 5: Адрес, реквизиты, обязательные страницы, блоки главной

**Files:**
- Create: `templates/storefront/lib/href.ts`, `lib/company.ts`, `lib/contacts.ts`, `lib/docs.json`, `lib/pages.ts`, `lib/source/sample/content.ts`
- Modify: `lib/source/index.ts` (добавить `content()`)
- Test: `templates/storefront/tests/href.test.ts`, `tests/content.test.ts`

**Interfaces:**
- Consumes: `Lang`, `SortKey`, `Content`, `Doc`, `Page`, `Block`, `Result` (Task 4).
- Produces:
  - `type Query = { page?: number; facets?: Record<string, string[]>; sort?: SortKey }`
  - `hrefFor(lang: Lang, to: { home: true } | ({ catalog: true } & Query) | ({ category: string } & Query) | { product: string; options?: Record<string, string> } | { search: string; page?: number } | { doc: string }): string`
  - `COMPANY: { name, cui, regCom, address }`, `ANPC_SAL_URL`, `SOL_URL`; `CONTACTS: { phone, email }`, `telHref()`, `mailHref()`
  - `sampleContent: Content`; `content(): Content`

- [ ] **Step 1: Write the failing tests**

`tests/href.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hrefFor } from '../lib/href.ts'

test('one function builds every address, language first', () => {
  assert.equal(hrefFor('ro', { home: true }), '/ro')
  assert.equal(hrefFor('hu', { catalog: true }), '/hu/catalog')
  assert.equal(hrefFor('hu', { catalog: true, page: 1 }), '/hu/catalog')
  assert.equal(hrefFor('en', { category: 'uleiuri', page: 2 }), '/en/catalog/uleiuri?page=2')
  assert.equal(hrefFor('ro', { product: 'ulei-cbd-full-spectrum', options: { volum: '10', putere: '20' } }), '/ro/product/ulei-cbd-full-spectrum?option.putere=20&option.volum=10')
  assert.equal(hrefFor('ro', { search: 'ulei 10 %' }), '/ro/search?q=ulei+10+%25')
  assert.equal(hrefFor('ro', { search: '' }), '/ro/search')
  assert.equal(hrefFor('en', { doc: 'livrare-si-plata' }), '/en/info/livrare-si-plata')
})

test('a shelf address keeps facets, sort and page in one stable order', () => {
  assert.equal(
    hrefFor('ro', { category: 'uleiuri', facets: { putere: ['10', '20'], forma: ['ulei'] }, sort: 'price-asc', page: 2 }),
    '/ro/catalog/uleiuri?facet.forma=ulei&facet.putere=10%2C20&sort=price-asc&page=2',
  )
  assert.equal(hrefFor('ro', { catalog: true, facets: { forma: [] }, sort: 'popular' }), '/ro/catalog')
})
```

`tests/content.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sampleContent } from '../lib/source/sample/content.ts'
import { PRODUCTS } from '../lib/products.ts'

test('home page blocks exist in every language, in one order, and point at real products', async () => {
  for (const lang of ['ro', 'en', 'hu'] as const) {
    const r = await sampleContent.page(lang, 'home')
    assert.ok(r.ok, lang)
    assert.deepEqual(r.value.blocks.map((b) => b.type), ['hero', 'categories', 'featured', 'lab', 'delivery', 'faq'])
    for (const b of r.value.blocks) if (b.type === 'featured') for (const id of b.ids) assert.ok(PRODUCTS.some((p) => p.id === id), id)
  }
})

test('the required pages exist in every language', async () => {
  for (const lang of ['ro', 'en', 'hu'] as const) {
    const r = await sampleContent.docs(lang)
    assert.ok(r.ok)
    assert.deepEqual(r.value.map((d) => d.slug).sort(), ['confidentialitate', 'contact', 'despre-noi', 'livrare-si-plata', 'retur', 'termeni'])
    for (const d of r.value) assert.ok(d.title && d.summary && d.sections.length >= 2, `${lang}/${d.slug}`)
  }
  assert.deepEqual(await sampleContent.doc('ro', 'nu-exista'), { ok: false, reason: 'not-found' })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: переустановить в демо (`--force`); в демо `node tools/check-test.mjs tests/href.test.ts tests/content.test.ts`
Expected: FAIL — модулей нет.

- [ ] **Step 3: Implement the address function** — `lib/href.ts`:

```ts
import type { Lang } from './locale.ts'
import type { SortKey } from './source/contract.ts'

export type Query = { page?: number; facets?: Record<string, string[]>; sort?: SortKey }
type To =
  | { home: true }
  | ({ catalog: true } & Query)
  | ({ category: string } & Query)
  | { product: string; options?: Record<string, string> }
  | { search: string; page?: number }
  | { doc: string }

type Pair = [string, string]
const withQuery = (path: string, params: Pair[]) => {
  const q = new URLSearchParams(params).toString()
  return q ? `${path}?${q}` : path
}
const pageParam = (page?: number): Pair[] => (page && page > 1 ? [['page', String(page)]] : [])
const shelfParams = (q: Query): Pair[] => [
  ...Object.entries(q.facets ?? {})
    .filter(([, values]) => values.length)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, values]): Pair => [`facet.${code}`, values.join(',')]),
  ...(q.sort && q.sort !== 'popular' ? [['sort', q.sort] as Pair] : []),
  ...pageParam(q.page),
]

/** Одна функция адреса (references/payload.md, «Одна функция адреса»): из
 *  неё ссылки, карта сайта, canonical и hreflang. Склейка адреса в другом
 *  месте — дефект: такой клей однажды отдал в карту 84 несуществующих адреса. */
export function hrefFor(lang: Lang, to: To): string {
  if ('home' in to) return `/${lang}`
  if ('catalog' in to) return withQuery(`/${lang}/catalog`, shelfParams(to))
  if ('category' in to) return withQuery(`/${lang}/catalog/${to.category}`, shelfParams(to))
  if ('product' in to) {
    const opts = Object.entries(to.options ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]): Pair => [`option.${k}`, v])
    return withQuery(`/${lang}/product/${to.product}`, opts)
  }
  if ('search' in to) return withQuery(`/${lang}/search`, [...(to.search ? [['q', to.search] as Pair] : []), ...pageParam(to.page)])
  return `/${lang}/info/${to.doc}`
}
```

- [ ] **Step 4: Implement company and contacts**

`lib/company.ts`:

```ts
/* Реквизиты — образец (COMPANY_IS_REAL = false в lib/flags.ts): настоящие
   даёт заказчик. Ссылки ANPC (SAL) и платформы споров ЕС (SOL) обязательны
   на витрине румынского рынка. */
export const COMPANY = {
  name: 'SC Exemplu Cânepă SRL',
  cui: 'RO00000000',
  regCom: 'J00/0000/2026',
  address: 'Str. Exemplu 1, București',
}
export const ANPC_SAL_URL = 'https://anpc.ro/ce-este-sal/'
export const SOL_URL = 'https://ec.europa.eu/consumers/odr'
```

`lib/contacts.ts`:

```ts
/* Каналы связи — одно место (check:code, семья contactScheme). Образец. */
export const CONTACTS = { phone: '+40 700 000 000', email: 'contact@exemplu.ro' }
export const telHref = () => `tel:${CONTACTS.phone.replace(/\s+/g, '')}`
export const mailHref = () => `mailto:${CONTACTS.email}`
```

- [ ] **Step 5: Write the required pages** — `lib/docs.json`:

```json
[
  { "slug": "despre-noi",
    "title": { "ro": "Despre noi", "en": "About us", "hu": "Rólunk" },
    "summary": { "ro": "Cine suntem și cum lucrăm.", "en": "Who we are and how we work.", "hu": "Kik vagyunk és hogyan dolgozunk." },
    "sections": [
      { "heading": { "ro": "Magazinul", "en": "The shop", "hu": "A bolt" },
        "body": { "ro": "Text de exemplu — îl înlocuiește magazinul. Aici magazinul spune cine este și de unde vin produsele.", "en": "Sample text — the shop replaces it. Here the shop says who it is and where the products come from.", "hu": "Mintaszöveg — a bolt cseréli le. Itt a bolt elmondja, kicsoda, és honnan származnak a termékek." } },
      { "heading": { "ro": "Loturi și analize", "en": "Batches and lab reports", "hu": "Tételek és laborvizsgálatok" },
        "body": { "ro": "Fiecare lot are un număr pe etichetă și un buletin de analiză cu același număr.", "en": "Every batch has a number on the label and a lab report with the same number.", "hu": "Minden tételnek száma van a címkén, és ugyanazzal a számmal laborjegyzőkönyve." } }
    ] },
  { "slug": "livrare-si-plata",
    "title": { "ro": "Livrare și plată", "en": "Delivery and payment", "hu": "Szállítás és fizetés" },
    "summary": { "ro": "Curier, easybox și plata ramburs.", "en": "Courier, parcel locker and cash on delivery.", "hu": "Futár, csomagautomata és utánvét." },
    "sections": [
      { "heading": { "ro": "Curier la domiciliu", "en": "Courier to your door", "hu": "Futár házhoz" },
        "body": { "ro": "Text de exemplu — tarifele și termenele le stabilește magazinul.", "en": "Sample text — the shop sets the rates and delivery times.", "hu": "Mintaszöveg — a díjakat és a határidőket a bolt határozza meg." } },
      { "heading": { "ro": "Easybox", "en": "Parcel locker", "hu": "Csomagautomata" },
        "body": { "ro": "Alegeți un easybox din listă la finalizarea comenzii.", "en": "Choose a parcel locker from the list at checkout.", "hu": "A rendelés véglegesítésekor válasszon csomagautomatát a listából." } },
      { "heading": { "ro": "Plata ramburs", "en": "Cash on delivery", "hu": "Utánvétes fizetés" },
        "body": { "ro": "Plătiți curierului la primirea coletului.", "en": "Pay the courier when the parcel arrives.", "hu": "A csomag átvételekor fizessen a futárnak." } }
    ] },
  { "slug": "contact",
    "title": { "ro": "Contact", "en": "Contact", "hu": "Kapcsolat" },
    "summary": { "ro": "Cum ne puteți scrie sau suna.", "en": "How to write or call us.", "hu": "Hogyan írhat vagy telefonálhat nekünk." },
    "sections": [
      { "heading": { "ro": "Program", "en": "Hours", "hu": "Nyitvatartás" },
        "body": { "ro": "Text de exemplu — programul îl stabilește magazinul.", "en": "Sample text — the shop sets its hours.", "hu": "Mintaszöveg — a nyitvatartást a bolt határozza meg." } },
      { "heading": { "ro": "Date de contact", "en": "Contact details", "hu": "Elérhetőségek" },
        "body": { "ro": "Telefonul și adresa de e-mail sunt în subsolul fiecărei pagini.", "en": "The phone number and email address are in the footer of every page.", "hu": "A telefonszám és az e-mail-cím minden oldal alján megtalálható." } }
    ] },
  { "slug": "termeni",
    "title": { "ro": "Termeni și condiții", "en": "Terms and conditions", "hu": "Általános szerződési feltételek" },
    "summary": { "ro": "Regulile de vânzare ale magazinului.", "en": "The shop's terms of sale.", "hu": "A bolt értékesítési feltételei." },
    "sections": [
      { "heading": { "ro": "Comanda", "en": "The order", "hu": "A rendelés" },
        "body": { "ro": "Text de exemplu — termenii îi redactează magazinul împreună cu juristul său.", "en": "Sample text — the shop writes the terms with its lawyer.", "hu": "Mintaszöveg — a feltételeket a bolt a jogászával együtt írja meg." } },
      { "heading": { "ro": "Prețuri", "en": "Prices", "hu": "Árak" },
        "body": { "ro": "Prețurile sunt în lei și includ TVA.", "en": "Prices are in lei and include VAT.", "hu": "Az árak lejben értendők, és tartalmazzák az áfát." } }
    ] },
  { "slug": "confidentialitate",
    "title": { "ro": "Politica de confidențialitate", "en": "Privacy policy", "hu": "Adatvédelmi tájékoztató" },
    "summary": { "ro": "Ce date colectăm și de ce.", "en": "What data we collect and why.", "hu": "Milyen adatokat gyűjtünk és miért." },
    "sections": [
      { "heading": { "ro": "Date colectate", "en": "Data we collect", "hu": "Gyűjtött adatok" },
        "body": { "ro": "Text de exemplu — politica o redactează magazinul.", "en": "Sample text — the shop writes the policy.", "hu": "Mintaszöveg — a tájékoztatót a bolt írja meg." } },
      { "heading": { "ro": "Drepturile dumneavoastră", "en": "Your rights", "hu": "Az Ön jogai" },
        "body": { "ro": "Puteți cere oricând accesul la date sau ștergerea lor.", "en": "You can ask at any time to see or delete your data.", "hu": "Bármikor kérheti adatai megtekintését vagy törlését." } }
    ] },
  { "slug": "retur",
    "title": { "ro": "Retur", "en": "Returns", "hu": "Visszaküldés" },
    "summary": { "ro": "Cum returnați un produs.", "en": "How to return a product.", "hu": "Hogyan küldhet vissza egy terméket." },
    "sections": [
      { "heading": { "ro": "Termen", "en": "Deadline", "hu": "Határidő" },
        "body": { "ro": "Text de exemplu — termenul și condițiile le stabilește magazinul, conform legii.", "en": "Sample text — the shop sets the deadline and conditions under the law.", "hu": "Mintaszöveg — a határidőt és a feltételeket a bolt határozza meg a törvény szerint." } },
      { "heading": { "ro": "Cum trimiteți", "en": "How to send it", "hu": "Hogyan küldje vissza" },
        "body": { "ro": "Scrieți-ne numărul comenzii și vă trimitem instrucțiunile.", "en": "Send us the order number and we will reply with instructions.", "hu": "Írja meg a rendelésszámot, és elküldjük az útmutatót." } }
    ] }
]
```

- [ ] **Step 6: Write the home page blocks** — `lib/pages.ts`:

```ts
import type { Lang } from './locale.ts'
import type { Block } from './source/contract.ts'

type SamplePage = { title: Record<Lang, string>; description: Record<Lang, string>; blocks: Record<Lang, Block[]> }
const FEATURED = ['ulei-cbd-full-spectrum', 'capsule-cbd-25', 'crema-cbd', 'ulei-caini-cbd']

/* Блоки главной — как придут из Payload (план 4): тип и поля, без вида. */
export const PAGES: Record<string, SamplePage> = {
  home: {
    title: { ro: 'Magazin CBD — uleiuri, capsule, cosmetice', en: 'CBD shop — oils, capsules, cosmetics', hu: 'CBD bolt — olajok, kapszulák, kozmetikumok' },
    description: {
      ro: 'Produse CBD cu buletin de analiză pentru fiecare lot. Livrare prin curier sau easybox, plata ramburs.',
      en: 'CBD products with a lab report for every batch. Courier or parcel locker delivery, cash on delivery.',
      hu: 'CBD termékek minden tételhez laborjegyzőkönyvvel. Futár vagy csomagautomata, utánvétes fizetés.',
    },
    blocks: {
      ro: [
        { type: 'hero', title: 'Produse CBD cu buletin de analiză pentru fiecare lot', lede: 'Uleiuri, capsule și cosmetice din cânepă. Numărul lotului de pe etichetă este același cu cel din buletinul laboratorului.', cta: 'Vedeți produsele' },
        { type: 'categories', title: 'Categorii' },
        { type: 'featured', title: 'Cele mai vândute', ids: FEATURED },
        { type: 'lab', title: 'Buletin de analiză pentru fiecare lot', body: 'Laboratorul măsoară CBD, THC, metale grele, pesticide și solvenți. Buletinul fiecărui lot este pe pagina produsului.' },
        { type: 'delivery', title: 'Livrare și plată', items: [
          { title: 'Curier la domiciliu', body: 'Livrare în 1–3 zile lucrătoare.' },
          { title: 'Easybox', body: 'Ridicați coletul când vă convine.' },
          { title: 'Plata ramburs', body: 'Plătiți la primirea coletului.' },
        ] },
        { type: 'faq', title: 'Întrebări frecvente', items: [
          { q: 'Ce conține buletinul de analiză?', a: 'Concentrația de CBD și THC, metalele grele, pesticidele și solvenții reziduali ai lotului.' },
          { q: 'Unde găsesc numărul lotului?', a: 'Pe eticheta produsului; același număr apare în buletinul laboratorului.' },
          { q: 'Cât durează livrarea?', a: 'De obicei 1–3 zile lucrătoare; termenul exact apare la finalizarea comenzii.' },
          { q: 'Pot plăti la livrare?', a: 'Da, plata ramburs este disponibilă pentru livrarea prin curier și easybox.' },
        ] },
      ],
      en: [
        { type: 'hero', title: 'CBD products with a lab report for every batch', lede: 'Oils, capsules and cosmetics made from hemp. The batch number on the label is the same as in the lab report.', cta: 'See the products' },
        { type: 'categories', title: 'Categories' },
        { type: 'featured', title: 'Best sellers', ids: FEATURED },
        { type: 'lab', title: 'A lab report for every batch', body: 'The lab measures CBD, THC, heavy metals, pesticides and solvents. Every batch report is on the product page.' },
        { type: 'delivery', title: 'Delivery and payment', items: [
          { title: 'Courier to your door', body: 'Delivered in 1–3 working days.' },
          { title: 'Parcel locker', body: 'Pick up the parcel when it suits you.' },
          { title: 'Cash on delivery', body: 'Pay when the parcel arrives.' },
        ] },
        { type: 'faq', title: 'Frequently asked questions', items: [
          { q: 'What does the lab report contain?', a: 'The CBD and THC content, heavy metals, pesticides and residual solvents of the batch.' },
          { q: 'Where do I find the batch number?', a: 'On the product label; the same number appears in the lab report.' },
          { q: 'How long does delivery take?', a: 'Usually 1–3 working days; the exact time is shown at checkout.' },
          { q: 'Can I pay on delivery?', a: 'Yes, cash on delivery is available for courier and parcel locker delivery.' },
        ] },
      ],
      hu: [
        { type: 'hero', title: 'CBD termékek minden tételhez laborjegyzőkönyvvel', lede: 'Kenderből készült olajok, kapszulák és kozmetikumok. A címkén lévő tételszám megegyezik a laborjegyzőkönyvben szereplővel.', cta: 'Termékek megtekintése' },
        { type: 'categories', title: 'Kategóriák' },
        { type: 'featured', title: 'Legnépszerűbb termékek', ids: FEATURED },
        { type: 'lab', title: 'Minden tételhez laborjegyzőkönyv', body: 'A labor méri a CBD- és THC-tartalmat, a nehézfémeket, a növényvédő szereket és az oldószereket. Minden tétel jegyzőkönyve a termékoldalon található.' },
        { type: 'delivery', title: 'Szállítás és fizetés', items: [
          { title: 'Futár házhoz', body: 'Kiszállítás 1–3 munkanapon belül.' },
          { title: 'Csomagautomata', body: 'Vegye át a csomagot, amikor Önnek kényelmes.' },
          { title: 'Utánvét', body: 'Fizessen a csomag átvételekor.' },
        ] },
        { type: 'faq', title: 'Gyakori kérdések', items: [
          { q: 'Mit tartalmaz a laborjegyzőkönyv?', a: 'A tétel CBD- és THC-tartalmát, nehézfém-, növényvédőszer- és oldószer-maradványait.' },
          { q: 'Hol találom a tételszámot?', a: 'A termék címkéjén; ugyanez a szám szerepel a laborjegyzőkönyvben.' },
          { q: 'Mennyi ideig tart a szállítás?', a: 'Általában 1–3 munkanap; a pontos időt a rendelés véglegesítésekor látja.' },
          { q: 'Fizethetek átvételkor?', a: 'Igen, utánvéttel fizethet futáros és csomagautomatás szállításnál is.' },
        ] },
      ],
    },
  },
}
```

- [ ] **Step 7: Write the sample content source** — `lib/source/sample/content.ts`:

```ts
import type { Lang } from '../../locale.ts'
import type { Content, Doc } from '../contract.ts'
import { PAGES } from '../../pages.ts'
import DOCS from '../../docs.json' with { type: 'json' }

type L = Record<Lang, string>
type RawDoc = { slug: string; title: L; summary: L; sections: { heading: L; body: L }[] }
const RAW = DOCS as RawDoc[]
const docOf = (d: RawDoc, lang: Lang): Doc => ({
  slug: d.slug, title: d.title[lang], summary: d.summary[lang],
  sections: d.sections.map((s) => ({ heading: s.heading[lang], body: s.body[lang] })),
})

export const sampleContent: Content = {
  async page(lang, slug) {
    const p = PAGES[slug]
    return p ? { ok: true, value: { slug, title: p.title[lang], description: p.description[lang], blocks: p.blocks[lang] } } : { ok: false, reason: 'not-found' }
  },
  async docs(lang) {
    return { ok: true, value: RAW.map((d) => docOf(d, lang)) }
  },
  async doc(lang, slug) {
    const d = RAW.find((x) => x.slug === slug)
    return d ? { ok: true, value: docOf(d, lang) } : { ok: false, reason: 'not-found' }
  },
}
```

В `lib/source/index.ts` строку `import type { Source } from './contract.ts'` заменить на `import type { Content, Source } from './contract.ts'`, добавить ввоз `import { sampleContent } from './sample/content.ts'` и в конец файла:

```ts
export function content(): Content {
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sampleContent
}
```

- [ ] **Step 8: Run tests** — переустановить в демо (`--force`); в демо `npm test`
Expected: PASS все.

- [ ] **Step 9: Commit**

```bash
git add templates/storefront
git commit -m "Витрина RO: одна функция адреса, реквизиты, обязательные страницы и блоки главной на образце"
```

---

### Task 6: Оболочка сайта — шапка, подвал, языки, знак, экраны состояния, крошки

**Files:**
- Create: `templates/storefront/lib/route.ts`, `components/Icon.tsx`, `components/Header.tsx`, `components/Header.module.css`, `components/Footer.tsx`, `components/Footer.module.css`, `components/LangSwitch.tsx`, `components/StateScreen.tsx`, `components/StateScreen.module.css`, `components/Breadcrumbs.tsx`, `components/Breadcrumbs.module.css`
- Modify: `app/[lang]/layout.tsx`

**Interfaces:**
- Consumes: `t`, `hrefFor`, `source()`, `content()`, `COMPANY`, `ANPC_SAL_URL`, `SOL_URL`, `CONTACTS`, `telHref`, `mailHref`, `COMPANY_IS_REAL`, `LOCALES`, `Collection`, `Doc`.
- Produces:
  - `langOf(params: Promise<{ lang: string }>): Promise<Lang>` — `notFound()` на чужом языке
  - `<Icon id="search" />`
  - `<Header lang collections />`, `<Footer lang docs />`, `<LangSwitch lang label />` (клиентский)
  - `<StateScreen level={1 | 2} kind="empty" | "none" | "unavailable" | "not-found" title step href />`; `<Unavailable lang />` — `<main>` с экраном «не отвечает»
  - `<Breadcrumbs trail={{ name: string; href?: string }[]} label />`

- [ ] **Step 1: Write the components**

`lib/route.ts`:

```ts
import { notFound } from 'next/navigation'
import { isLang, type Lang } from './locale.ts'

/** Язык страницы из адреса. Макет уже отказал чужому языку; страница
 *  спрашивает сама, потому что тип params у неё — строка. */
export async function langOf(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return lang
}
```

`components/Icon.tsx`:

```tsx
/* Знак из листа основы (styles/icons.svg → public/icons.svg). Рисунок — в
   листе, имя — у кнопки или ссылки рядом (у безмолвной — aria-label). */
export function Icon({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" focusable="false">
      <use href={`/icons.svg#${id}`} />
    </svg>
  )
}
```

`components/Header.tsx` (разметка — шапка страницы-доказательства набора):

```tsx
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import s from './Header.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { Collection } from '@/lib/source/contract.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'

export function Header({ lang, collections }: { lang: Lang; collections: Collection[] }) {
  return (
    <header className={`${p.wrap} ${s.head}`}>
      <div className={`${p.cluster} ${s.bar}`}>
        <a className={s.logo} href={hrefFor(lang, { home: true })} translate="no">CBD</a>
        <nav className={`${p.rail} ${s.nav}`} aria-label={t(lang, 'nav.catalog')}>
          <a href={hrefFor(lang, { catalog: true })}>{t(lang, 'nav.catalog')}</a>
          {collections.map((c) => <a key={c.slug} href={hrefFor(lang, { category: c.slug })}>{c.name}</a>)}
        </nav>
        <a className={b.btn} data-size="sm" href={hrefFor(lang, { search: '' })} aria-label={t(lang, 'nav.search')}><Icon id="search" /></a>
      </div>
    </header>
  )
}
```

`components/Header.module.css`:

```css
.head{padding-block:var(--air-row)}
.bar{justify-content:space-between}
.logo{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target);min-inline-size:var(--ctrl-target);font-size:var(--h3-size);font-weight:var(--h3-weight);color:var(--ink)}
.nav a{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target);font-size:var(--ctrl-fs-sm);color:var(--ink-soft)}
```

`components/LangSwitch.tsx`:

```tsx
'use client'
import { usePathname } from 'next/navigation'
import s from './Footer.module.css'
import { LOCALES, type Lang } from '@/lib/locale.ts'

const NAMES: Record<Lang, string> = { ro: 'Română', en: 'English', hu: 'Magyar' }
const FIRST = new RegExp(`^/(${LOCALES.join('|')})(?=/|$)`)

/* Та же страница на другом языке: язык — первый сегмент адреса. */
export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const path = usePathname()
  return (
    <nav aria-label={label}>
      <ul className={s.list}>
        {LOCALES.map((l) => (
          <li key={l}>
            <a href={path.replace(FIRST, `/${l}`)} hrefLang={l} lang={l} aria-current={l === lang ? 'true' : undefined}>{NAMES[l]}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

`components/Footer.tsx` (разметка — подвал страницы-доказательства: лист на полу `paper`):

```tsx
import p from '@/styles/primitives.module.css'
import s from './Footer.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { Doc } from '@/lib/source/contract.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { COMPANY, ANPC_SAL_URL, SOL_URL } from '@/lib/company.ts'
import { CONTACTS, telHref, mailHref } from '@/lib/contacts.ts'
import { COMPANY_IS_REAL } from '@/lib/flags.ts'
import { LangSwitch } from './LangSwitch.tsx'

const HELP = ['livrare-si-plata', 'retur', 'contact', 'despre-noi']
const LEGAL = ['termeni', 'confidentialitate']

export function Footer({ lang, docs }: { lang: Lang; docs: Doc[] }) {
  const links = (slugs: string[]) => docs.filter((d) => slugs.includes(d.slug)).map((d) => <li key={d.slug}><a href={hrefFor(lang, { doc: d.slug })}>{d.title}</a></li>)
  return (
    <footer className={`${p.wrap} ${p.sheet} ${p.section}`} data-ground="paper">
      <div className={`${p.grid} ${s.cols}`}>
        <div className={p.stack}>
          <h2 className={s.h}>{t(lang, 'footer.help')}</h2>
          <ul className={s.list}>{links(HELP)}</ul>
        </div>
        <div className={p.stack}>
          <h2 className={s.h}>{t(lang, 'footer.legal')}</h2>
          <ul className={s.list}>
            {links(LEGAL)}
            <li><a href={ANPC_SAL_URL} rel="noopener">{t(lang, 'footer.anpc')}</a></li>
            <li><a href={SOL_URL} rel="noopener">{t(lang, 'footer.sol')}</a></li>
          </ul>
        </div>
        <div className={p.stack}>
          <h2 className={s.h}>{t(lang, 'footer.company')}</h2>
          <address className={s.addr}>
            <span translate="no">{COMPANY.name}</span><br />
            CUI {COMPANY.cui} · {COMPANY.regCom}<br />
            {COMPANY.address}<br />
            <a href={telHref()}>{CONTACTS.phone}</a><br />
            <a href={mailHref()}>{CONTACTS.email}</a>
          </address>
          {COMPANY_IS_REAL ? null : <p className={p.muted}>{t(lang, 'sample')}</p>}
        </div>
        <LangSwitch lang={lang} label={t(lang, 'nav.lang')} />
      </div>
    </footer>
  )
}
```

`components/Footer.module.css`:

```css
.cols{--cols:4;--cell-min:160px;--cols-min:1}
.h{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:var(--h3-weight)}
.list{list-style:none;padding:0;margin:0}
.list a,.addr a{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target)}
.list a[aria-current='true']{color:var(--ink);font-weight:600}
.addr{font-style:normal;color:var(--ink-soft);line-height:var(--body-lead)}
```

`components/StateScreen.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './StateScreen.module.css'
import type { Lang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'

type Kind = 'empty' | 'none' | 'unavailable' | 'not-found'

/* Пустой экран — почему пусто и куда дальше (слой 12, «Слова»). Источник
   не ответил — свой экран, не «пусто»: это разные состояния. */
export function StateScreen({ level, kind, title, step, href }: { level: 1 | 2; kind: Kind; title: string; step: string; href: string }) {
  const H = level === 1 ? 'h1' : 'h2'
  return (
    <section className={`${p.stack} ${s.state}`} data-kind={kind} role={kind === 'unavailable' ? 'alert' : undefined}>
      <H className={s.title}>{title}</H>
      <a className={go.go} href={href}>{step}<Icon id="arrow-right" /></a>
    </section>
  )
}

export function Unavailable({ lang }: { lang: Lang }) {
  return (
    <main id="main" className={p.wrap}>
      <StateScreen level={1} kind="unavailable" title={t(lang, 'unavailable.title')} step={t(lang, 'unavailable.step')} href={hrefFor(lang, { home: true })} />
    </main>
  )
}
```

`components/StateScreen.module.css`:

```css
.state{--stack:var(--air-group);padding-block:var(--air-band)}
.title{font-size:var(--h2-size);line-height:var(--h2-lead);font-weight:var(--h2-weight)}
```

`components/Breadcrumbs.tsx`:

```tsx
import s from './Breadcrumbs.module.css'

export function Breadcrumbs({ trail, label }: { trail: { name: string; href?: string }[]; label: string }) {
  return (
    <nav aria-label={label} className={s.crumbs}>
      <ol>
        {trail.map((c, i) => <li key={i}>{c.href ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}</li>)}
      </ol>
    </nav>
  )
}
```

`components/Breadcrumbs.module.css` (`--sp-1` — оптика ниже пола, её набор разрешает узлу):

```css
.crumbs ol{display:flex;flex-wrap:wrap;gap:var(--sp-1);list-style:none;padding:0;margin:0;font-size:var(--note-size);color:var(--ink-soft)}
.crumbs li + li::before{content:'/';margin-inline-end:var(--sp-1)}
.crumbs a{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target)}
```

- [ ] **Step 2: Wire the layout** — `app/[lang]/layout.tsx` заменить целиком:

```tsx
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { LOCALES, isLang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'
import { source, content } from '@/lib/source/index.ts'
import { Header } from '@/components/Header.tsx'
import { Footer } from '@/components/Footer.tsx'
import '@/styles/palette.css'
import '@/styles/scale.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/buttons.css'

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

/* Шапка и подвал не падают вместе с источником: не ответил — полок и
   документов в них нет, а страница говорит сама за себя. */
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const [cols, docs] = await Promise.all([source().collections(lang), content().docs(lang)])
  return (
    <html lang={lang}>
      <body>
        <a className={p.skip} href="#main">{t(lang, 'skip')}</a>
        <Header lang={lang} collections={cols.ok ? cols.value : []} />
        {children}
        <Footer lang={lang} docs={docs.ok ? docs.value : []} />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify in the demo**

Run: переустановить в демо (`--force`); в демо `npm run typecheck`, `npm run build`, `npm run check:css`, `npm run check:code`, `npm run check:port`, `npm run check:lint`
Expected: всё зелёное. Находка — чинится в шаблоне, переустановка, повтор.

- [ ] **Step 4: Commit**

```bash
git add templates/storefront
git commit -m "Витрина RO: шапка, подвал с реквизитами, ANPC и SOL, языки, знак, экраны состояния, крошки"
```

---

### Task 7: Главная — карточка товара, реестр блоков, разметка вопросов

**Files:**
- Create: `templates/storefront/lib/view.ts`, `lib/ld.ts`, `components/JsonLd.tsx`, `components/ProductCard.tsx`, `components/ProductCard.module.css`, `components/blocks/types.ts`, `components/blocks/registry.tsx`, `components/blocks/Hero.tsx`, `components/blocks/Categories.tsx`, `components/blocks/Featured.tsx`, `components/blocks/Lab.tsx`, `components/blocks/Delivery.tsx`, `components/blocks/Faq.tsx`, `components/blocks/blocks.module.css`
- Modify: `app/[lang]/page.tsx`
- Test: `templates/storefront/tests/view.test.ts`, `tests/blocks.test.ts`

**Interfaces:**
- Consumes: `Card`, `Stock`, `Price`, `Block`, `Collection`, `money`, `t`, `hrefFor`, `langOf`, `source()`, `content()`, `Unavailable`.
- Produces:
  - `type ShelfCard = { id: string; href: string; name: string; image: Image; price: string; stock: string }`; `stockText(lang, stock): string`; `priceText(lang, price: Price): string`; `shelfCard(lang, card: Card): ShelfCard` (`lib/view.ts`)
  - `faqLd(items: { q: string; a: string }[])` (`lib/ld.ts`)
  - `<JsonLd data />`, `<ProductCard card eager? />`
  - `type BlockCtx = { lang: Lang; collections: Collection[]; cards: Record<string, ShelfCard> }`; `RENDERERS`; `<Blocks blocks ctx />`

- [ ] **Step 1: Write the failing tests**

`tests/view.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { shelfCard } from '../lib/view.ts'
import { faqLd } from '../lib/ld.ts'

test('a shelf card carries ready strings: address, "from" price, stock', async () => {
  const r = await sample.cards('ro', ['ulei-cbd-full-spectrum', 'ser-fata-cbd'])
  assert.ok(r.ok)
  const [oil, serum] = r.value.map((c) => shelfCard('ro', c))
  assert.equal(oil.href, '/ro/product/ulei-cbd-full-spectrum')
  assert.equal(oil.price, 'de la 89,90\u00a0lei')
  assert.equal(oil.stock, 'În stoc')
  assert.equal(serum.price, '159,90\u00a0lei')
  assert.equal(serum.stock, 'Stoc epuizat')
})

test('FAQ markup lists exactly the questions it is given', () => {
  const ld = faqLd([{ q: 'Q1', a: 'A1' }, { q: 'Q2', a: 'A2' }])
  assert.equal(ld['@type'], 'FAQPage')
  assert.equal(ld.mainEntity.length, 2)
  assert.deepEqual(ld.mainEntity[1], { '@type': 'Question', name: 'Q2', acceptedAnswer: { '@type': 'Answer', text: 'A2' } })
})
```

`tests/blocks.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PAGES } from '../lib/pages.ts'

test('every block type in the data has a renderer and every renderer has a block type', () => {
  const src = readFileSync(new URL('../components/blocks/registry.tsx', import.meta.url), 'utf8')
  const body = src.slice(src.indexOf('export const RENDERERS = {'), src.indexOf('} satisfies Renderers'))
  const rendered = [...body.matchAll(/^\s+([a-z]+): [A-Z]\w+,$/gm)].map((m) => m[1]).sort()
  const used = [...new Set(Object.values(PAGES).flatMap((p) => Object.values(p.blocks).flat().map((b) => b.type)))].sort()
  assert.deepEqual(rendered, used)
})
```

- [ ] **Step 2: Run to verify they fail** — переустановить (`--force`); в демо `node tools/check-test.mjs tests/view.test.ts tests/blocks.test.ts` → FAIL (модулей нет).

- [ ] **Step 3: Implement the view helpers and JSON-LD**

`lib/view.ts`:

```ts
import type { Lang } from './locale.ts'
import type { Card, Image, Price, Stock } from './source/contract.ts'
import { t } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'

/* Карточка на полке — готовые строки: блок не считает и не переводит. */
export type ShelfCard = { id: string; href: string; name: string; image: Image; price: string; stock: string }

const STOCK = { in: 'product.inStock', low: 'product.lowStock', out: 'product.outOfStock' } as const
export const stockText = (lang: Lang, stock: Stock): string => t(lang, STOCK[stock])

/** «Цена от» — только у полки с разными ценами вариантов; у выбранного варианта — своя цена. */
export const priceText = (lang: Lang, price: Price): string =>
  price.kind === 'single' ? money(price.value, lang) : t(lang, 'product.from', { price: money(price.min, lang) })

export const shelfCard = (lang: Lang, c: Card): ShelfCard => ({
  id: c.id, href: hrefFor(lang, { product: c.id }), name: c.name, image: c.image,
  price: priceText(lang, c.price), stock: stockText(lang, c.stock),
})
```

`lib/ld.ts`:

```ts
/* JSON-LD — то, что читает машина. Всё — из тех же данных, что нарисованы:
   обещать поисковику больше, чем на странице, нельзя (check:seo, faqPage). */
export const faqLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
})
```

`components/JsonLd.tsx`:

```tsx
/* `<` экранируется: текст из данных не закроет тег скрипта. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
```

- [ ] **Step 4: Implement the product card** (разметка — карточка страницы-доказательства)

`components/ProductCard.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import s from './ProductCard.module.css'
import type { ShelfCard } from '@/lib/view.ts'

/* Снимок — вторая ссылка на тот же товар: скрыт от чтения и от Tab, имя
   товара говорит ссылка в заголовке. */
export function ProductCard({ card, eager = false }: { card: ShelfCard; eager?: boolean }) {
  return (
    <article className={`${p.stack} ${s.card}`}>
      <a className={`${p.frame} ${s.shot}`} href={card.href} tabIndex={-1} aria-hidden="true">
        <img src={card.image.src} alt="" width={card.image.width} height={card.image.height} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      </a>
      <h3 className={s.name}><a href={card.href}>{card.name}</a></h3>
      <div className={`${p.cluster} ${s.buy}`}>
        <b className={s.price}>{card.price}</b>
        <span className={p.muted}>{card.stock}</span>
      </div>
    </article>
  )
}
```

`components/ProductCard.module.css`:

```css
.card{--stack:var(--air-row);block-size:100%;background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card);box-shadow:var(--sh-raised)}
.shot{--frame:1 / 1;border-radius:var(--r-ctrl)}
.name{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:var(--h3-weight);overflow-wrap:anywhere}
.name a{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target)}
.buy{justify-content:space-between;margin-block-start:auto}
.price{font-size:var(--h3-size);font-weight:var(--h3-weight);color:var(--ink)}
```

- [ ] **Step 5: Implement the blocks**

`components/blocks/types.ts`:

```ts
import type { Lang } from '@/lib/locale.ts'
import type { Collection } from '@/lib/source/contract.ts'
import type { ShelfCard } from '@/lib/view.ts'

export type BlockCtx = { lang: Lang; collections: Collection[]; cards: Record<string, ShelfCard> }
```

`components/blocks/blocks.module.css`:

```css
.tiles,.shelf,.points{list-style:none;padding:0;margin:0}
.tiles{--cols:4;--cell-min:200px}
.shelf{--cols:4;--cell-min:200px}
.points{--cols:3;--cell-min:220px;--cols-min:1}
.tile{--stack:var(--air-row);background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card)}
.point{--stack:var(--air-row)}
.point svg{inline-size:calc(var(--ctrl-h-sm) * .6);block-size:calc(var(--ctrl-h-sm) * .6)}
.h3{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:var(--h3-weight)}
.h3 a{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target)}
```

`components/blocks/Hero.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { hrefFor } from '@/lib/href.ts'
import type { BlockCtx } from './types.ts'

export function Hero({ block, ctx }: { block: Extract<Block, { type: 'hero' }>; ctx: BlockCtx }) {
  const shot = Object.values(ctx.cards)[0]
  return (
    <section className={`${p.wrap} ${p.lede}`}>
      <div className={p.ledeText}>
        <h1>{block.title}</h1>
        <p>{block.lede}</p>
        <div className={p.cluster}>
          <a className={b.btn} data-voice="loud" data-size="lg" href={hrefFor(ctx.lang, { catalog: true })}>{block.cta}</a>
        </div>
      </div>
      {shot ? <div className={p.frame}><img src={shot.image.src} alt={shot.image.alt} width={shot.image.width} height={shot.image.height} fetchPriority="high" /></div> : null}
    </section>
  )
}
```

`components/blocks/Categories.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { hrefFor } from '@/lib/href.ts'
import type { BlockCtx } from './types.ts'

export function Categories({ block, ctx }: { block: Extract<Block, { type: 'categories' }>; ctx: BlockCtx }) {
  if (!ctx.collections.length) return null
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2></div>
      <ul className={`${p.grid} ${s.tiles}`}>
        {ctx.collections.map((c) => (
          <li key={c.slug} className={`${p.stack} ${s.tile}`}>
            <h3 className={s.h3}><a href={hrefFor(ctx.lang, { category: c.slug })}>{c.name}</a></h3>
            <p className={p.muted}>{c.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

`components/blocks/Featured.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { ShelfCard } from '@/lib/view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { ProductCard } from '../ProductCard.tsx'
import { Icon } from '../Icon.tsx'
import type { BlockCtx } from './types.ts'

export function Featured({ block, ctx }: { block: Extract<Block, { type: 'featured' }>; ctx: BlockCtx }) {
  const cards = block.ids.map((id) => ctx.cards[id]).filter((c): c is ShelfCard => Boolean(c))
  if (!cards.length) return null
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}>
        <h2>{block.title}</h2>
        <a className={go.go} href={hrefFor(ctx.lang, { catalog: true })}>{t(ctx.lang, 'nav.catalog')}<Icon id="arrow-right" /></a>
      </div>
      <ul className={`${p.grid} ${s.shelf}`}>{cards.map((c) => <li key={c.id}><ProductCard card={c} /></li>)}</ul>
    </section>
  )
}
```

`components/blocks/Lab.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { BlockCtx } from './types.ts'

export function Lab({ block }: { block: Extract<Block, { type: 'lab' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2><p>{block.body}</p></div>
    </section>
  )
}
```

`components/blocks/Delivery.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { Icon } from '../Icon.tsx'
import type { BlockCtx } from './types.ts'

const ICONS = ['truck', 'package', 'circle-check']

export function Delivery({ block }: { block: Extract<Block, { type: 'delivery' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2></div>
      <ul className={`${p.grid} ${s.points}`}>
        {block.items.map((item, i) => (
          <li key={item.title} className={`${p.stack} ${s.point}`}>
            <Icon id={ICONS[i % ICONS.length]} />
            <h3 className={s.h3}>{item.title}</h3>
            <p className={p.muted}>{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

`components/blocks/Faq.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { faqLd } from '@/lib/ld.ts'
import { JsonLd } from '../JsonLd.tsx'
import type { BlockCtx } from './types.ts'

/* Одна FAQPage на страницу и ровно столько вопросов, сколько нарисовано
   (check:seo, faqPage) — разметка строится из тех же пунктов. */
export function Faq({ block }: { block: Extract<Block, { type: 'faq' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section} ${p.prose}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2></div>
      {block.items.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
      <JsonLd data={faqLd(block.items)} />
    </section>
  )
}
```

`components/blocks/registry.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { Block } from '@/lib/source/contract.ts'
import type { BlockCtx } from './types.ts'
import { Hero } from './Hero.tsx'
import { Categories } from './Categories.tsx'
import { Featured } from './Featured.tsx'
import { Lab } from './Lab.tsx'
import { Delivery } from './Delivery.tsx'
import { Faq } from './Faq.tsx'

type Renderers = { [K in Block['type']]: (props: { block: Extract<Block, { type: K }>; ctx: BlockCtx }) => ReactNode }

/* Реестр блоков (references/payload.md): тип блока → отрисовка. Новый тип
   в договоре без строки здесь — ошибка сборки через satisfies; строка без
   типа в данных — красный tests/blocks.test.ts. */
export const RENDERERS = {
  hero: Hero,
  categories: Categories,
  featured: Featured,
  lab: Lab,
  delivery: Delivery,
  faq: Faq,
} satisfies Renderers

export function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: BlockCtx }) {
  return blocks.map((block, i) => {
    const Render = RENDERERS[block.type] as (props: { block: Block; ctx: BlockCtx }) => ReactNode
    return <Render key={`${block.type}-${i}`} block={block} ctx={ctx} />
  })
}
```

- [ ] **Step 6: Write the home page** — `app/[lang]/page.tsx` заменить целиком:

```tsx
import { langOf } from '@/lib/route.ts'
import { source, content } from '@/lib/source/index.ts'
import { shelfCard } from '@/lib/view.ts'
import { Blocks } from '@/components/blocks/registry.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'
import type { BlockCtx } from '@/components/blocks/types.ts'

type Props = { params: Promise<{ lang: string }> }

export default async function Home({ params }: Props) {
  const lang = await langOf(params)
  const page = await content().page(lang, 'home')
  if (!page.ok) return <Unavailable lang={lang} />
  const ids = page.value.blocks.flatMap((b) => (b.type === 'featured' ? b.ids : []))
  const [cols, cards] = await Promise.all([source().collections(lang), source().cards(lang, ids)])
  if (!cols.ok || !cards.ok) return <Unavailable lang={lang} />
  const ctx: BlockCtx = { lang, collections: cols.value, cards: Object.fromEntries(cards.value.map((c) => [c.id, shelfCard(lang, c)])) }
  return (
    <main id="main">
      <Blocks blocks={page.value.blocks} ctx={ctx} />
    </main>
  )
}
```

- [ ] **Step 7: Run** — переустановить (`--force`); в демо `npm test`, `npm run typecheck`, `npm run build`, `npm run check:css`, `npm run check:code`, `npm run check:port`, `npm run check:lint`
Expected: всё зелёное.

- [ ] **Step 8: Commit**

```bash
git add templates/storefront
git commit -m "Витрина RO: главная из реестра блоков — герой, полки, хиты, лаборатория, доставка, вопросы с разметкой"
```

---

### Task 8: Каталог — грани, сортировка, страницы, «пусто» и «нет результатов»

**Files:**
- Create: `templates/storefront/lib/listing.ts`, `lib/catalog-view.ts`, `components/Filters.tsx`, `components/Filters.module.css`, `components/Pagination.tsx`, `components/Catalog.tsx`, `components/Catalog.module.css`, `app/[lang]/catalog/page.tsx`, `app/[lang]/catalog/[cat]/page.tsx`
- Test: `templates/storefront/tests/listing.test.ts`, `tests/catalog-view.test.ts`

**Interfaces:**
- Consumes: `parseFacetParams` (`search.mjs`), `Listing`, `Facet`, `SortKey`, `Query`, `hrefFor`, `t`, `tn`, `Key`, `shelfCard`, `ShelfCard`, `ProductCard`, `StateScreen`, `Unavailable`, `langOf`, `source()`.
- Produces:
  - `type Params = Record<string, string | string[] | undefined>`; `first(v): string | null`; `type Asked = { facets: Record<string, string[]>; sort: SortKey; page: string | null }`; `readQuery(params: Params): Asked` (`lib/listing.ts`)
  - `type Empty`, `type FiltersView`, `type PagesView`, `type CatalogView`; `catalogView(lang, a)`; `emptyFor(lang, asked, at)` (`lib/catalog-view.ts`)
  - `<Catalog view top? />`, `<Filters f />`, `<Pagination pages />`

- [ ] **Step 1: Write the failing tests**

`tests/listing.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readQuery } from '../lib/listing.ts'

test('the address says which facets, sort and page; junk sort falls back, the page stays raw for the source to judge', () => {
  assert.deepEqual(readQuery({ 'facet.forma': ['ulei', 'capsule'], sort: 'price-asc', page: '2' }), { facets: { forma: ['ulei', 'capsule'] }, sort: 'price-asc', page: '2' })
  assert.deepEqual(readQuery({ 'facet.putere': '10,20' }).facets, { putere: ['10', '20'] })
  assert.deepEqual(readQuery({ sort: 'cheap' }), { facets: {}, sort: 'popular', page: null })
  assert.equal(readQuery({ page: 'abc' }).page, 'abc')
})
```

`tests/catalog-view.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { catalogView, emptyFor } from '../lib/catalog-view.ts'
import { hrefFor, type Query } from '../lib/href.ts'
import type { Asked } from '../lib/listing.ts'

test('page links keep the chosen facets and sort; the first page carries no number', async () => {
  const asked: Asked = { facets: {}, sort: 'price-asc', page: '2' }
  const r = await sample.listing('ro', asked)
  assert.ok(r.ok)
  const at = (q: Query) => hrefFor('ro', { catalog: true, ...q })
  const v = catalogView('ro', { title: 'T', lede: null, listing: r.value, asked, at, filters: true, empty: emptyFor('ro', asked, at) })
  assert.equal(v.pages?.prev, '/ro/catalog?sort=price-asc')
  assert.equal(v.pages?.next, null)
  assert.equal(v.pages?.label, 'Pagina 2 din 2')
  assert.equal(v.count, '12 produse')
  assert.equal(v.cards.length, 4)
  assert.equal(v.filters?.sort.value, 'price-asc')
})

test('empty: with facets — clear them; without — go to all products', () => {
  const at = (q: Query) => hrefFor('en', { category: 'uleiuri', ...q })
  const none = emptyFor('en', { facets: { forma: ['crema'] }, sort: 'popular', page: null }, at)
  assert.deepEqual(none, { title: 'No products match these filters', step: 'Clear one of the filters', href: '/en/catalog/uleiuri' })
  assert.equal(emptyFor('en', { facets: {}, sort: 'popular', page: null }, at).href, '/en/catalog')
})
```

- [ ] **Step 2: Run to verify they fail** — переустановить (`--force`); в демо `node tools/check-test.mjs tests/listing.test.ts tests/catalog-view.test.ts` → FAIL.

- [ ] **Step 3: Implement the query and the view**

`lib/listing.ts`:

```ts
import type { SortKey } from './source/contract.ts'
import { parseFacetParams } from './source/vendure/core/search.mjs'

export type Params = Record<string, string | string[] | undefined>
export type Asked = { facets: Record<string, string[]>; sort: SortKey; page: string | null }

const SORTS: SortKey[] = ['popular', 'price-asc', 'price-desc']
export const first = (v: string | string[] | undefined): string | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

/** Что спрошено адресом. Номер страницы здесь не толкуется: мусор и «за
 *  концом» — решение источника (404), а не тихая первая страница. */
export function readQuery(params: Params): Asked {
  const sort = first(params.sort)
  return {
    facets: parseFacetParams(params) as Record<string, string[]>,
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : 'popular',
    page: first(params.page),
  }
}
```

`lib/catalog-view.ts`:

```ts
import type { Lang } from './locale.ts'
import type { Facet, Listing, SortKey } from './source/contract.ts'
import type { Asked } from './listing.ts'
import { hrefFor, type Query } from './href.ts'
import { t, tn, type Key } from './i18n/index.ts'
import { shelfCard, type ShelfCard } from './view.ts'

export type Empty = { title: string; step: string; href: string }
export type FiltersView = {
  action: string; clear: string; facets: Facet[]
  sort: { label: string; value: SortKey; options: { value: SortKey; label: string }[] }
  title: string; apply: string; clearLabel: string
}
export type PagesView = { label: string; prev: string | null; next: string | null; prevLabel: string; nextLabel: string }
export type CatalogView = {
  title: string; lede: string | null; count: string; cards: ShelfCard[]
  filters: FiltersView | null; invalid: string | null; empty: Empty; pages: PagesView | null
}

const SORTS: [SortKey, Key][] = [['popular', 'sort.popular'], ['price-asc', 'sort.priceAsc'], ['price-desc', 'sort.priceDesc']]

/** Полка готовыми строками. `at` строит адрес этой же полки — у категории,
 *  у всего каталога и у поиска он свой, а грани и порядок переносит сам. */
export function catalogView(lang: Lang, a: {
  title: string; lede: string | null; listing: Listing; asked: Asked
  at: (q: Query) => string; filters: boolean; empty: Empty
}): CatalogView {
  const { listing, asked, at } = a
  const keep = { facets: asked.facets, sort: asked.sort }
  return {
    title: a.title,
    lede: a.lede,
    count: tn(lang, 'catalog.count', listing.total),
    cards: listing.items.map((c) => shelfCard(lang, c)),
    filters: a.filters ? {
      action: at({}), clear: at({}), facets: listing.facets,
      sort: { label: t(lang, 'catalog.sort'), value: asked.sort, options: SORTS.map(([value, key]) => ({ value, label: t(lang, key) })) },
      title: t(lang, 'catalog.filters'), apply: t(lang, 'catalog.apply'), clearLabel: t(lang, 'catalog.clear'),
    } : null,
    invalid: listing.invalid.length ? t(lang, 'catalog.invalid') : null,
    empty: a.empty,
    pages: listing.pages > 1 ? {
      label: t(lang, 'catalog.page', { n: listing.page, total: listing.pages }),
      prev: listing.page > 1 ? at({ ...keep, page: listing.page - 1 }) : null,
      next: listing.page < listing.pages ? at({ ...keep, page: listing.page + 1 }) : null,
      prevLabel: t(lang, 'catalog.prev'), nextLabel: t(lang, 'catalog.next'),
    } : null,
  }
}

/** Пусто — почему и куда дальше: грани ничего не дали — снять их; полка пуста — ко всем товарам. */
export function emptyFor(lang: Lang, asked: Asked, at: (q: Query) => string): Empty {
  return Object.keys(asked.facets).length
    ? { title: t(lang, 'catalog.none'), step: t(lang, 'catalog.noneStep'), href: at({}) }
    : { title: t(lang, 'catalog.empty'), step: t(lang, 'catalog.emptyStep'), href: hrefFor(lang, { catalog: true }) }
}
```

- [ ] **Step 4: Implement the components** (разметка — полка страницы-доказательства: `sidebar` → `aside` с `pinned`-формой и `grid`)

`components/Filters.tsx` (форма `GET` — работает без JavaScript):

```tsx
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Filters.module.css'
import type { FiltersView } from '@/lib/catalog-view.ts'
import { Icon } from './Icon.tsx'

export function Filters({ f: view }: { f: FiltersView }) {
  return (
    <form className={`${p.stack} ${p.pinned} ${s.filters}`} action={view.action} method="get" aria-label={view.title}>
      {view.facets.map((facet) => (
        <fieldset key={facet.code} className={`${f.rows} ${s.set}`}>
          <legend className={s.legend}>{facet.name}</legend>
          {facet.values.map((v) => (
            <label key={v.code} className={f.tick}>
              <input type="checkbox" name={`facet.${facet.code}`} value={v.code} defaultChecked={v.selected} />
              {v.name} <span className={p.muted}>({v.count})</span>
            </label>
          ))}
        </fieldset>
      ))}
      <label className={f.field}>
        <span className={f.label}>{view.sort.label}</span>
        <select className={f.pick} name="sort" defaultValue={view.sort.value}>
          {view.sort.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <button className={b.btn} data-voice="loud" data-wide type="submit">{view.apply}</button>
      <a className={b.btn} data-wide href={view.clear}><Icon id="x" />{view.clearLabel}</a>
    </form>
  )
}
```

`components/Filters.module.css`:

```css
.filters{--stack:var(--air-group);background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card)}
.set{border:0;padding:0;margin:0}
.legend{font-weight:600;margin-block-end:var(--air-row)}
```

`components/Pagination.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './Catalog.module.css'
import type { PagesView } from '@/lib/catalog-view.ts'
import { Icon } from './Icon.tsx'

export function Pagination({ pages }: { pages: PagesView }) {
  return (
    <nav className={`${p.cluster} ${s.pages}`} aria-label={pages.label}>
      {pages.prev ? <a className={go.go} data-to="back" href={pages.prev} rel="prev"><Icon id="arrow-left" />{pages.prevLabel}</a> : <span />}
      <span className={p.muted}>{pages.label}</span>
      {pages.next ? <a className={go.go} href={pages.next} rel="next">{pages.nextLabel}<Icon id="arrow-right" /></a> : <span />}
    </nav>
  )
}
```

`components/Catalog.tsx`:

```tsx
import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import s from './Catalog.module.css'
import type { CatalogView } from '@/lib/catalog-view.ts'
import { ProductCard } from './ProductCard.tsx'
import { StateScreen } from './StateScreen.tsx'
import { Filters } from './Filters.tsx'
import { Pagination } from './Pagination.tsx'

export function Catalog({ view, top }: { view: CatalogView; top?: ReactNode }) {
  const shelf = (
    <div className={p.stack}>
      {view.cards.length
        ? <ul className={`${p.grid} ${s.shelf}`}>{view.cards.map((c, i) => <li key={c.id}><ProductCard card={c} eager={i < 4} /></li>)}</ul>
        : <StateScreen level={2} kind="none" title={view.empty.title} step={view.empty.step} href={view.empty.href} />}
      {view.pages ? <Pagination pages={view.pages} /> : null}
    </div>
  )
  return (
    <main id="main" className={`${p.wrap} ${p.section}`}>
      <div className={p.pagehead}>
        <h1>{view.title}</h1>
        {view.lede ? <p>{view.lede}</p> : null}
        <p className={p.muted}>{view.count}</p>
      </div>
      {top}
      {view.invalid ? <p className={p.muted} role="status">{view.invalid}</p> : null}
      {view.filters ? (
        <div className={p.sidebar}>
          <aside className={p.aside}><Filters f={view.filters} /></aside>
          {shelf}
        </div>
      ) : shelf}
    </main>
  )
}
```

`components/Catalog.module.css`:

```css
.shelf{--cols:3;--cell-min:200px;list-style:none;padding:0;margin:0}
.pages{justify-content:space-between}
```

- [ ] **Step 5: Write the catalog pages**

`app/[lang]/catalog/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import { readQuery, type Params } from '@/lib/listing.ts'
import { catalogView, emptyFor } from '@/lib/catalog-view.ts'
import { hrefFor, type Query } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { Catalog } from '@/components/Catalog.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

export default async function CatalogPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const asked = readQuery(await searchParams)
  const r = await source().listing(lang, asked)
  if (!r.ok) {
    if (r.reason === 'unavailable') return <Unavailable lang={lang} />
    notFound()
  }
  const at = (q: Query) => hrefFor(lang, { catalog: true, ...q })
  return <Catalog view={catalogView(lang, { title: t(lang, 'catalog.title'), lede: t(lang, 'catalog.lede'), listing: r.value, asked, at, filters: true, empty: emptyFor(lang, asked, at) })} />
}
```

`app/[lang]/catalog/[cat]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import { readQuery, type Params } from '@/lib/listing.ts'
import { catalogView, emptyFor } from '@/lib/catalog-view.ts'
import { hrefFor, type Query } from '@/lib/href.ts'
import { Catalog } from '@/components/Catalog.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string; cat: string }>; searchParams: Promise<Params> }

export default async function CategoryPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const { cat } = await params
  const asked = readQuery(await searchParams)
  const [col, r] = await Promise.all([source().collection(lang, cat), source().listing(lang, { category: cat, ...asked })])
  if (!col.ok && col.reason === 'not-found') notFound()
  if (!r.ok && r.reason !== 'unavailable') notFound()
  if (!col.ok || !r.ok) return <Unavailable lang={lang} />
  const at = (q: Query) => hrefFor(lang, { category: cat, ...q })
  return <Catalog view={catalogView(lang, { title: col.value.name, lede: col.value.description, listing: r.value, asked, at, filters: true, empty: emptyFor(lang, asked, at) })} />
}
```

- [ ] **Step 6: Run** — переустановить (`--force`); в демо `npm test`, `npm run typecheck`, `npm run build`, `npm run check:css`, `npm run check:code`, `npm run check:port`, `npm run check:lint`. Затем `npm run start` в фоне и открыть: `http://localhost:3020/ro/catalog/uleiuri?facet.forma=ulei&facet.putere=10` (2 товара), `/ro/catalog?page=abc` (404), `/ro/catalog?page=9` (404), `/ro/catalog/nu-exista` (404), `/ro/catalog?facet.forma=nu-exista` (строка «Unele filtre nu mai există…»). Остановить сервер.
Expected: всё так.

- [ ] **Step 7: Commit**

```bash
git add templates/storefront
git commit -m "Витрина RO: каталог — грани ИЛИ/И адресом, сортировка, страницы, пусто и «нет результатов» без JavaScript"
```

---

### Task 9: Товар с вариантами и поиск

**Files:**
- Modify (набор): `styles/primitives.module.css` (блок `/* ── a segmented control */`), `tests/kit.test.ts`
- Create: `templates/storefront/lib/variant.ts`, `lib/product-view.ts`, `components/VariantPicker.tsx`, `components/LabReport.tsx`, `components/ProductView.tsx`, `components/ProductView.module.css`, `components/SearchForm.tsx`, `components/SearchForm.module.css`, `app/[lang]/product/[id]/page.tsx`, `app/[lang]/search/page.tsx`
- Test: `templates/storefront/tests/variant.test.ts`, `tests/product-view.test.ts`

**Interfaces:**
- Consumes: `inspectSelection` (`lib/commerce/variant-selection.mjs`), `Product`, `Variant`, `Card`, `Collection`, `Image`, `LabReport`, `Params`, `money`, `t`, `hrefFor`, `intlLocale`, `shelfCard`, `stockText`, `Breadcrumbs`, `ProductCard`, `Catalog`, `catalogView`, `first`, `Asked`, `langOf`, `source()`, `Unavailable`.
- Produces:
  - `type SelectionStatus`; `readSelection(params: Params, product: Product): Record<string, string>`; `pickState(product, selected): { status: SelectionStatus; variant: Variant | null }`; `type OptionGroupLinks`; `optionLinks(lang, product, selected): OptionGroupLinks[]` (`lib/variant.ts`)
  - `type LabView = { title: string; rows: [string, string][] }`; `type ProductPageView`; `productView(lang, product, selected, ctx: { category: Collection | null; related: Card[] }): ProductPageView` (`lib/product-view.ts`)
  - `.seg` основы рисует и `<button aria-pressed>`, и `<a aria-current>`, и `[aria-disabled]`.

- [ ] **Step 1: Foundation — the segmented control takes a link** (в наборе)

Дописать тест в конец `tests/kit.test.ts`:

```ts
test('сегмент рисует кнопку и ссылку одним рисунком', () => {
  /* Выбор варианта товара — ссылка: адрес несёт выбор и работает без
     JavaScript. Второй рисунок сегмента в модуле витрины — это второе
     место, где решается вид одного контрола (запрет 10). */
  assert.match(primitives, /\.seg :is\(button, a\)\{/)
  assert.match(primitives, /\.seg :is\(\[aria-pressed="true"\], \[aria-current="true"\]\)\{/)
  assert.match(primitives, /\.seg \[aria-disabled="true"\]\{/)
})
```

Run: `node tools/check-test.mjs tests/kit.test.ts` → FAIL (рисунок только у `button`).

В `styles/primitives.module.css` заменить блок сегмента (от строки `.seg{display:flex;flex-wrap:wrap;gap:var(--sp-1)}` до строки `.seg button[aria-pressed="true"]{…}` включительно):

```css
/* Кнопка или ссылка — рисунок один: выбор на месте — кнопка с aria-pressed,
   выбор, который несёт адрес (вариант товара), — ссылка с aria-current. */
.seg{display:flex;flex-wrap:wrap;gap:var(--sp-1)}
.seg :is(button, a){
  display:inline-flex;align-items:center;
  height:var(--ctrl-h-sm);padding:0 calc(var(--ctrl-h-sm) * .4);border-radius:var(--r-ctrl);background:var(--plate-quiet);
  font-size:var(--ctrl-fs-sm);color:var(--ink-soft);text-decoration:none;
  transition:background var(--hover-t) var(--ease),color var(--hover-t) var(--ease)
}
@media (hover:hover){ .seg :is(button, a[href]):hover{background:var(--hover-ctrl);color:var(--ink)} }
.seg :is(button, a[href]):active{background:var(--press-ctrl);color:var(--ink)}
.seg :is([aria-pressed="true"], [aria-current="true"]){background:var(--pop);color:var(--on-pop);font-weight:600}
.seg [aria-disabled="true"]{opacity:var(--state-off);cursor:not-allowed}
```

Run (в наборе): `node tools/check-test.mjs tests/kit.test.ts`, `npm run check:css`
Expected: PASS; `check:css` без новых находок.

- [ ] **Step 2: Write the failing tests** (шаблон)

`tests/variant.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { readSelection, pickState, optionLinks } from '../lib/variant.ts'

test('the variant is chosen by the address and is exact or named as missing', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const product = r.value
  assert.deepEqual(readSelection({ 'option.putere': '10', 'option.volum': '30', 'option.nimic': 'x' }, product), { putere: '10', volum: '30' })
  assert.equal(pickState(product, { putere: '10', volum: '30' }).variant?.sku, 'UF-10-30')
  assert.equal(pickState(product, { putere: '10', volum: '30' }).status, 'ready')
  assert.equal(pickState(product, { putere: '30', volum: '10' }).status, 'unavailable')
  assert.equal(pickState(product, { putere: '5', volum: '30' }).status, 'missing')
  assert.equal(pickState(product, { putere: '10' }).status, 'incomplete')
  assert.equal(pickState(product, { putere: '99', volum: '10' }).status, 'invalid')
})

test('a single-variant product is ready without a choice', async () => {
  const r = await sample.product('ro', 'capsule-cbd-10')
  assert.ok(r.ok)
  assert.equal(pickState(r.value, {}).status, 'ready')
})

test('option links: a combination that does not exist has no address, an out-of-stock one has', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const [putere, volum] = optionLinks('ro', r.value, { putere: '5' })
  assert.equal(volum.options.find((o) => o.code === '30')?.href, null)
  assert.equal(volum.options.find((o) => o.code === '10')?.href, '/ro/product/ulei-cbd-full-spectrum?option.putere=5&option.volum=10')
  assert.equal(putere.options.find((o) => o.code === '5')?.current, true)
  const [strength] = optionLinks('ro', r.value, { volum: '10' })
  assert.ok(strength.options.find((o) => o.code === '30')?.href, 'нет в наличии — адрес есть, страница скажет')
  const [, afterJunk] = optionLinks('ro', r.value, { putere: '99' })
  assert.ok(afterJunk.options.every((o) => o.href), 'мусор в адресе не запирает выбор')
})
```

`tests/product-view.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { productView } from '../lib/product-view.ts'

const none = { category: null, related: [] }

test('nothing chosen: a "from" price and a request to choose', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const v = productView('ro', r.value, {}, none)
  assert.equal(v.price, 'de la 89,90\u00a0lei')
  assert.equal(v.message, 'Alegeți o variantă')
  assert.equal(v.stock, null)
})

test('a chosen variant: its price, its stock and the report of its batch', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const v = productView('ro', r.value, { putere: '20', volum: '10' }, none)
  assert.equal(v.price, '219,90\u00a0lei')
  assert.equal(v.stock, 'În stoc')
  assert.equal(v.message, null)
  assert.equal(v.lab?.title, 'Buletin de analiză · Lot RO-2409-20')
  assert.deepEqual(v.lab?.rows.map(([k]) => k), ['Laborator', 'Data analizei', 'CBD', 'THC'])
  const gone = productView('ro', r.value, { putere: '30', volum: '10' }, none)
  assert.equal(gone.stock, 'Stoc epuizat')
  assert.equal(gone.message, null)
  const missing = productView('en', r.value, { putere: '5', volum: '30' }, none)
  assert.equal(missing.message, 'This combination does not exist')
})

test('a single product has its own price and no choice to make', async () => {
  const r = await sample.product('hu', 'capsule-cbd-10')
  assert.ok(r.ok)
  const v = productView('hu', r.value, {}, none)
  assert.equal(v.price, '79,90\u00a0lei')
  assert.equal(v.message, null)
  assert.equal(v.groups.length, 0)
  assert.equal(v.lab, null)
})
```

- [ ] **Step 3: Run to verify they fail** — переустановить (`--force`); в демо `node tools/check-test.mjs tests/variant.test.ts tests/product-view.test.ts` → FAIL.

- [ ] **Step 4: Implement the variant choice** — `lib/variant.ts`:

```ts
import type { Lang } from './locale.ts'
import type { Product, Variant } from './source/contract.ts'
import type { Params } from './listing.ts'
import { inspectSelection } from './commerce/variant-selection.mjs'
import { hrefFor } from './href.ts'

export type SelectionStatus = 'ready' | 'unavailable' | 'incomplete' | 'missing' | 'invalid' | 'ambiguous'
export type OptionGroupLinks = { code: string; name: string; options: { code: string; name: string; href: string | null; current: boolean }[] }

/* Помощник набора — JavaScript; тип его ответа записан здесь один раз. */
type Inspected = { status: SelectionStatus; variant: { id: string } | null }

/** Выбор из адреса: `option.<группа>=<код>`. Группа, которой у товара нет, не угадывается. */
export function readSelection(params: Params, product: Product): Record<string, string> {
  const out: Record<string, string> = {}
  for (const g of product.optionGroups) {
    const raw = params[`option.${g.code}`]
    const value = Array.isArray(raw) ? raw[0] : raw
    if (value) out[g.code] = value
  }
  return out
}

export function pickState(product: Product, selected: Record<string, string>): { status: SelectionStatus; variant: Variant | null } {
  const options = product.optionGroups.map((g) => ({ id: g.code, values: g.options.map((o) => o.code) }))
  const variants = product.variants.map((v) => ({ id: v.id, options: v.options, available: v.stock !== 'out' }))
  const r = inspectSelection(options, variants, selected) as Inspected
  const found = r.variant
  return { status: r.status, variant: found ? (product.variants.find((v) => v.id === found.id) ?? null) : null }
}

/** Ссылки выбора. У опции — адрес с ней вместо текущей в той же группе.
 *  Сочетания нет вовсе — адреса нет; вариант есть, но нет в наличии —
 *  адрес есть: страница скажет «stoc epuizat», а не спрячет вариант. */
export function optionLinks(lang: Lang, product: Product, selected: Record<string, string>): OptionGroupLinks[] {
  const known = Object.fromEntries(Object.entries(selected).filter(([k, v]) =>
    product.optionGroups.some((g) => g.code === k && g.options.some((o) => o.code === v))))
  const exists = (candidate: Record<string, string>) =>
    product.variants.some((v) => Object.entries(candidate).every(([k, val]) => v.options[k] === val))
  return product.optionGroups.map((g) => ({
    code: g.code,
    name: g.name,
    options: g.options.map((o) => {
      const candidate = { ...known, [g.code]: o.code }
      return { code: o.code, name: o.name, current: known[g.code] === o.code, href: exists(candidate) ? hrefFor(lang, { product: product.id, options: candidate }) : null }
    }),
  }))
}
```

- [ ] **Step 5: Implement the product view** — `lib/product-view.ts`:

```ts
import type { Lang } from './locale.ts'
import type { Card, Collection, Image, LabReport, Product } from './source/contract.ts'
import { t } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { intlLocale } from './market.ts'
import { pickState, optionLinks, type OptionGroupLinks } from './variant.ts'
import { shelfCard, stockText, type ShelfCard } from './view.ts'

export type LabView = { title: string; rows: [string, string][] }
export type ProductPageView = {
  crumbs: { name: string; href?: string }[]; crumbLabel: string
  eyebrow: string; name: string; price: string; stock: string | null; message: string | null
  image: Image; groups: OptionGroupLinks[]; lab: LabView | null; description: string
  related: ShelfCard[]; relatedTitle: string
}

function labView(lang: Lang, r: LabReport): LabView {
  const pct = new Intl.NumberFormat(intlLocale(lang), { style: 'percent', maximumFractionDigits: 2 })
  const date = new Intl.DateTimeFormat(intlLocale(lang), { dateStyle: 'long', timeZone: 'UTC' })
  return {
    title: `${t(lang, 'product.lab')} · ${t(lang, 'product.batch', { batch: r.batch })}`,
    rows: [
      [t(lang, 'lab.lab'), r.lab],
      [t(lang, 'lab.date'), date.format(new Date(r.date))],
      ['CBD', pct.format(r.cbdPercent / 100)],
      ['THC', pct.format(r.thcPercent / 100)],
    ],
  }
}

/** Страница товара готовыми строками. Цена — выбранного варианта; пока
 *  выбора нет — «de la» самой низкой, если цены разные. Протокол — партии
 *  выбранного варианта; без выбора — первой партии товара. */
export function productView(lang: Lang, product: Product, selected: Record<string, string>, ctx: { category: Collection | null; related: Card[] }): ProductPageView {
  const state = pickState(product, selected)
  const cheapest = product.variants.reduce((a, b) => (b.price.minor < a.price.minor ? b : a))
  const same = product.variants.every((v) => v.price.minor === cheapest.price.minor)
  const chosen = state.variant
  const price = chosen ? money(chosen.price, lang) : same ? money(cheapest.price, lang) : t(lang, 'product.from', { price: money(cheapest.price, lang) })
  const message =
    state.status === 'incomplete' || state.status === 'ambiguous' ? t(lang, 'product.choose')
    : state.status === 'missing' || state.status === 'invalid' ? t(lang, 'product.missing')
    : null
  const report = chosen ? product.labReports.find((r) => r.batch === chosen.batch) : product.labReports[0]
  return {
    crumbs: [
      { name: t(lang, 'crumb.home'), href: hrefFor(lang, { home: true }) },
      ...(ctx.category ? [{ name: ctx.category.name, href: hrefFor(lang, { category: ctx.category.slug }) }] : []),
      { name: product.name },
    ],
    crumbLabel: t(lang, 'crumb.label'),
    eyebrow: ctx.category?.name ?? '',
    name: product.name,
    price,
    stock: chosen ? stockText(lang, chosen.stock) : null,
    message,
    image: product.images[0],
    groups: optionLinks(lang, product, selected),
    lab: report ? labView(lang, report) : null,
    description: product.description,
    related: ctx.related.map((c) => shelfCard(lang, c)),
    relatedTitle: t(lang, 'product.related'),
  }
}
```

- [ ] **Step 6: Run the tests** — переустановить (`--force`); в демо `node tools/check-test.mjs tests/variant.test.ts tests/product-view.test.ts` → PASS.

- [ ] **Step 7: Implement the product components** (разметка — карточка товара страницы-доказательства: `switcher` из кадра и `stack`)

`components/VariantPicker.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { OptionGroupLinks } from '@/lib/variant.ts'

/* Выбор — ссылками: адрес несёт вариант, Back возвращает прежний, работает
   без JavaScript. Сочетания нет — опция без адреса и помечена. */
export function VariantPicker({ groups }: { groups: OptionGroupLinks[] }) {
  return groups.map((g) => (
    <fieldset key={g.code} className={s.group}>
      <legend className={s.legend}>{g.name}</legend>
      <div className={p.seg}>
        {g.options.map((o) => o.href
          ? <a key={o.code} href={o.href} aria-current={o.current ? 'true' : undefined}>{o.name}</a>
          : <a key={o.code} aria-disabled="true">{o.name}</a>)}
      </div>
    </fieldset>
  ))
}
```

`components/LabReport.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { LabView } from '@/lib/product-view.ts'

export function LabReport({ lab }: { lab: LabView }) {
  return (
    <section className={`${p.stack} ${s.lab}`} aria-labelledby="lab-title">
      <h2 id="lab-title" className={s.labTitle}>{lab.title}</h2>
      <dl className={s.facts}>
        {lab.rows.map(([k, v]) => <div key={k} className={s.fact}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </section>
  )
}
```

`components/ProductView.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { ProductPageView } from '@/lib/product-view.ts'
import { Breadcrumbs } from './Breadcrumbs.tsx'
import { ProductCard } from './ProductCard.tsx'
import { VariantPicker } from './VariantPicker.tsx'
import { LabReport } from './LabReport.tsx'

export function ProductView({ view }: { view: ProductPageView }) {
  return (
    <>
      <Breadcrumbs trail={view.crumbs} label={view.crumbLabel} />
      <section className={`${p.switcher} ${s.pdp}`}>
        <div className={`${p.frame} ${s.gallery}`}>
          <img src={view.image.src} alt={view.image.alt} width={view.image.width} height={view.image.height} fetchPriority="high" />
        </div>
        <div className={`${p.stack} ${s.offer}`}>
          {view.eyebrow ? <p className={p.eyebrow}>{view.eyebrow}</p> : null}
          <h1 className={s.name}>{view.name}</h1>
          <p className={s.price}>{view.price}</p>
          {view.stock ? <p className={p.muted}>{view.stock}</p> : null}
          <VariantPicker groups={view.groups} />
          {view.message ? <p className={s.message} role="status">{view.message}</p> : null}
          <div className={p.prose}><p>{view.description}</p></div>
          {view.lab ? <LabReport lab={view.lab} /> : null}
        </div>
      </section>
      {view.related.length ? (
        <section className={p.section}>
          <div className={p.sectionHead}><h2>{view.relatedTitle}</h2></div>
          <ul className={`${p.grid} ${s.related}`}>{view.related.map((c) => <li key={c.id}><ProductCard card={c} /></li>)}</ul>
        </section>
      ) : null}
    </>
  )
}
```

`components/ProductView.module.css`:

```css
.pdp{--switch-at:720px;padding-block-start:var(--air-group)}
.gallery{--frame:1 / 1}
.offer{--stack:var(--air-group)}
.name{font-size:var(--h2-size);line-height:var(--h2-lead);font-weight:var(--h2-weight);overflow-wrap:anywhere}
.price{font-size:var(--h3-size);font-weight:var(--h3-weight);color:var(--ink)}
.message{font-weight:600;color:var(--ink)}
.group{border:0;padding:0;margin:0}
.legend{font-weight:600;margin-block-end:var(--air-row)}
.lab{--stack:var(--air-row);background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card)}
.labTitle{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:var(--h3-weight)}
.facts{display:grid;gap:var(--gap-row);margin:0}
.fact{display:flex;justify-content:space-between;gap:var(--gap-row)}
.fact dd{margin:0;font-weight:600;text-align:end}
.related{--cols:4;--cell-min:200px;list-style:none;padding:0;margin:0}
```

`app/[lang]/product/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import type { Params } from '@/lib/listing.ts'
import { readSelection } from '@/lib/variant.ts'
import { productView } from '@/lib/product-view.ts'
import { ProductView } from '@/components/ProductView.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string; id: string }>; searchParams: Promise<Params> }

export default async function ProductPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const { id } = await params
  const r = await source().product(lang, id)
  if (!r.ok) {
    if (r.reason === 'unavailable') return <Unavailable lang={lang} />
    notFound()
  }
  const product = r.value
  const selected = readSelection(await searchParams, product)
  const [col, related] = await Promise.all([source().collection(lang, product.category), source().related(lang, id, 4)])
  const view = productView(lang, product, selected, { category: col.ok ? col.value : null, related: related.ok ? related.value : [] })
  return (
    <main id="main" className={p.wrap}>
      <ProductView view={view} />
    </main>
  )
}
```

- [ ] **Step 8: Implement the search page**

`components/SearchForm.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './SearchForm.module.css'
import { Icon } from './Icon.tsx'

export function SearchForm({ action, q, label, submit }: { action: string; q: string; label: string; submit: string }) {
  return (
    <form className={`${p.cluster} ${s.form}`} action={action} method="get" role="search">
      <label className={`${f.field} ${s.field}`}>
        <span className={f.label}>{label}</span>
        <input className={f.box} name="q" type="search" defaultValue={q} enterKeyHint="search" />
      </label>
      <button className={b.btn} data-voice="loud" type="submit"><Icon id="search" />{submit}</button>
    </form>
  )
}
```

`components/SearchForm.module.css`:

```css
.form{align-items:end}
.field{flex:1 1 auto;min-inline-size:0}
```

`app/[lang]/search/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import { first, type Asked, type Params } from '@/lib/listing.ts'
import { catalogView } from '@/lib/catalog-view.ts'
import { hrefFor, type Query } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { Catalog } from '@/components/Catalog.tsx'
import { SearchForm } from '@/components/SearchForm.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

export default async function SearchPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const sp = await searchParams
  const q = (first(sp.q) ?? '').trim()
  const form = <SearchForm action={hrefFor(lang, { search: '' })} q={q} label={t(lang, 'search.label')} submit={t(lang, 'search.submit')} />
  if (!q) {
    return (
      <main id="main" className={`${p.wrap} ${p.section}`}>
        <div className={p.pagehead}><h1>{t(lang, 'nav.search')}</h1><p>{t(lang, 'search.prompt')}</p></div>
        {form}
      </main>
    )
  }
  const asked: Asked = { facets: {}, sort: 'popular', page: first(sp.page) }
  const r = await source().listing(lang, { q, ...asked })
  if (!r.ok) {
    if (r.reason === 'unavailable') return <Unavailable lang={lang} />
    notFound()
  }
  const at = (query: Query) => hrefFor(lang, { search: q, page: query.page })
  const empty = { title: t(lang, 'search.none', { q }), step: t(lang, 'search.noneStep'), href: hrefFor(lang, { catalog: true }) }
  return <Catalog view={catalogView(lang, { title: t(lang, 'search.results', { q }), lede: null, listing: r.value, asked, at, filters: false, empty })} top={form} />
}
```

- [ ] **Step 9: Run** — переустановить (`--force`); в демо `npm test`, `npm run typecheck`, `npm run build`, `npm run check:css`, `npm run check:code`, `npm run check:port`, `npm run check:lint`. Затем `npm run start` в фоне; открыть `/ro/product/ulei-cbd-full-spectrum?option.putere=30&option.volum=10` («Stoc epuizat»), `/ro/product/ulei-cbd-full-spectrum?option.putere=5&option.volum=30` («Această combinație nu există»), `/ro/product/nu-exista` (404), `/hu/search?q=olaj` (≥ 5 товаров), `/ro/search?q=zzzz` (экран «Niciun rezultat…» со ссылкой). Остановить сервер.
Expected: всё так.

- [ ] **Step 10: Commit**

```bash
git add styles/primitives.module.css tests/kit.test.ts templates/storefront
git commit -m "Витрина RO: товар — вариант адресом с состояниями, протокол партии, похожие; поиск. Основа: сегмент принимает ссылку"
```

---

### Task 10: Обязательные страницы, «не найдено», ошибка, метаданные, JSON-LD, карта сайта

**Files:**
- Create: `templates/storefront/lib/seo.ts`, `components/DocView.tsx`, `components/DocView.module.css`, `app/[lang]/info/[doc]/page.tsx`, `app/[lang]/not-found.tsx`, `app/[lang]/error.tsx`, `app/sitemap.ts`, `app/robots.ts`
- Modify: `lib/ld.ts` (Product, BreadcrumbList, Organization, WebSite); `generateMetadata` и JSON-LD в `app/[lang]/page.tsx`, `catalog/page.tsx`, `catalog/[cat]/page.tsx`, `product/[id]/page.tsx`, `search/page.tsx`
- Test: `templates/storefront/tests/seo.test.ts`

**Interfaces:**
- Consumes: `LOCALES`, `DEFAULT_LANG`, `hrefFor`, флаги, `MARKET`, `COMPANY`, `Product`, `Variant`, `content()`, `source()`, `langOf`, `Breadcrumbs`, `StateScreen`, `JsonLd`, `pickState`.
- Produces:
  - `SITE_URL(): string`; `absolute(path: string): string`; `toMetadata(lang, page: { title: string; description: string; path: (l: Lang) => string; index?: boolean }): Metadata` (`lib/seo.ts`)
  - `productLd(product: Product, variant: Variant | null)`, `breadcrumbLd(trail: { name: string; href: string }[])`, `organizationLd()`, `websiteLd()` (`lib/ld.ts`)

- [ ] **Step 1: Write the failing test** — `tests/seo.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toMetadata } from '../lib/seo.ts'
import { productLd, breadcrumbLd } from '../lib/ld.ts'
import { sample } from '../lib/source/sample/catalog.ts'

test('every page names itself canonical and lists all three languages plus x-default', () => {
  const m = toMetadata('hu', { title: 'T', description: 'D', path: (l) => `/${l}/catalog` })
  assert.equal(m.alternates?.canonical, 'http://localhost:3020/hu/catalog')
  const langs = m.alternates?.languages as Record<string, string>
  assert.deepEqual(Object.keys(langs).sort(), ['en', 'hu', 'ro', 'x-default'])
  assert.equal(langs['x-default'], 'http://localhost:3020/ro/catalog')
  assert.equal((m.openGraph as { locale?: string }).locale, 'hu_RO')
})

test('while the catalogue is a sample, nothing is open to indexing', () => {
  const m = toMetadata('ro', { title: 'T', description: 'D', path: (l) => `/${l}` })
  assert.deepEqual(m.robots, { index: false, follow: false })
})

test('while prices are samples, the product markup carries no offer', async () => {
  const r = await sample.product('ro', 'capsule-cbd-10')
  assert.ok(r.ok)
  const ld = productLd(r.value, r.value.variants[0])
  assert.equal(ld['@type'], 'Product')
  assert.equal(ld.sku, 'CM-30')
  assert.equal('offers' in ld, false)
})

test('breadcrumbs are absolute and numbered from one', () => {
  const ld = breadcrumbLd([{ name: 'Acasă', href: '/ro' }, { name: 'Uleiuri', href: '/ro/catalog/uleiuri' }])
  assert.deepEqual(ld.itemListElement[1], { '@type': 'ListItem', position: 2, name: 'Uleiuri', item: 'http://localhost:3020/ro/catalog/uleiuri' })
})
```

- [ ] **Step 2: Run to verify it fails** — переустановить (`--force`); в демо `node tools/check-test.mjs tests/seo.test.ts` → FAIL.

- [ ] **Step 3: Implement metadata and markup**

`lib/seo.ts`:

```ts
import type { Metadata } from 'next'
import { LOCALES, DEFAULT_LANG, type Lang } from './locale.ts'
import { CATALOG_IS_REAL } from './flags.ts'

export const SITE_URL = () => process.env.SITE_URL ?? 'http://localhost:3020'
export const absolute = (path: string) => `${SITE_URL()}${path}`
const OG: Record<Lang, string> = { ro: 'ro_RO', en: 'en_RO', hu: 'hu_RO' }

/** Метаданные страницы: canonical — на себя, hreflang — на три языка и
 *  x-default на основной. `path` — та же функция адреса, что у ссылок.
 *  Пока каталог — образец, страница закрыта от обхода (флаг настоящести). */
export function toMetadata(lang: Lang, page: { title: string; description: string; path: (l: Lang) => string; index?: boolean }): Metadata {
  const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [l, absolute(page.path(l))]))
  languages['x-default'] = absolute(page.path(DEFAULT_LANG))
  const open = CATALOG_IS_REAL && page.index !== false
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: absolute(page.path(lang)), languages },
    openGraph: { title: page.title, description: page.description, url: absolute(page.path(lang)), locale: OG[lang], type: 'website' },
    robots: { index: open, follow: CATALOG_IS_REAL },
  }
}
```

`lib/ld.ts` — заменить целиком (`faqLd` остаётся как был):

```ts
import type { Product, Variant } from './source/contract.ts'
import { PRICES_ARE_REAL } from './flags.ts'
import { MARKET } from './market.ts'
import { COMPANY } from './company.ts'
import { SITE_URL, absolute } from './seo.ts'

/* JSON-LD — то, что читает машина. Всё — из тех же данных, что нарисованы:
   обещать поисковику больше, чем на странице, нельзя (check:seo, faqPage). */
export const faqLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
})

/** Товар для поиска. Цена идёт в разметку только настоящая: выдуманная
 *  цена в выдаче — отрицательное СЕО (флаг PRICES_ARE_REAL). Строка цены
 *  для машины — точкой и без знака валюты, поэтому деление здесь своё:
 *  это сериализация в lib/, не вёрстка. */
export function productLd(product: Product, variant: Variant | null): Record<string, unknown> {
  const ld: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.summary }
  if (variant) ld.sku = variant.sku
  if (PRICES_ARE_REAL && variant) {
    ld.offers = {
      '@type': 'Offer', priceCurrency: MARKET.currency,
      price: (variant.price.minor / 10 ** MARKET.precision).toFixed(MARKET.precision),
      availability: variant.stock === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    }
  }
  return ld
}

export const breadcrumbLd = (trail: { name: string; href: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(c.href) })),
})

export const organizationLd = () => ({ '@context': 'https://schema.org', '@type': 'Organization', name: COMPANY.name, url: SITE_URL() })
export const websiteLd = () => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: COMPANY.name, url: SITE_URL() })
```

- [ ] **Step 4: Run the test** — переустановить (`--force`); в демо `node tools/check-test.mjs tests/seo.test.ts tests/view.test.ts` → PASS.

- [ ] **Step 5: Add metadata and JSON-LD to the pages**

`app/[lang]/page.tsx` — добавить ввозы `import type { Metadata } from 'next'`, `import { toMetadata } from '@/lib/seo.ts'`, `import { hrefFor } from '@/lib/href.ts'`, `import { organizationLd, websiteLd } from '@/lib/ld.ts'`, `import { JsonLd } from '@/components/JsonLd.tsx'`; функцию

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  const page = await content().page(lang, 'home')
  if (!page.ok) return {}
  return toMetadata(lang, { title: page.value.title, description: page.value.description, path: (l) => hrefFor(l, { home: true }) })
}
```

и внутрь `<main id="main">` главной перед `<Blocks …/>`: `<JsonLd data={organizationLd()} /><JsonLd data={websiteLd()} />`.

`app/[lang]/catalog/page.tsx` — ввозы `import type { Metadata } from 'next'`, `import { toMetadata } from '@/lib/seo.ts'` и функция:

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'catalog.title'), description: t(lang, 'catalog.lede'), path: (l) => hrefFor(l, { catalog: true }) })
}
```

`app/[lang]/catalog/[cat]/page.tsx` — те же ввозы и:

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  const { cat } = await params
  const col = await source().collection(lang, cat)
  if (!col.ok) return {}
  return toMetadata(lang, { title: col.value.name, description: col.value.description, path: (l) => hrefFor(l, { category: cat }) })
}
```

`app/[lang]/product/[id]/page.tsx` — ввозы `import type { Metadata } from 'next'`, `import { toMetadata } from '@/lib/seo.ts'`, `import { hrefFor } from '@/lib/href.ts'`, `import { productLd, breadcrumbLd } from '@/lib/ld.ts'`, `import { pickState } from '@/lib/variant.ts'` (рядом с `readSelection`), `import { JsonLd } from '@/components/JsonLd.tsx'`; функция

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  const { id } = await params
  const r = await source().product(lang, id)
  if (!r.ok) return {}
  return toMetadata(lang, { title: r.value.name, description: r.value.summary, path: (l) => hrefFor(l, { product: id }) })
}
```

и в `<main>` перед `<ProductView …/>`:

```tsx
<JsonLd data={productLd(product, pickState(product, selected).variant ?? (product.variants.length === 1 ? product.variants[0] : null))} />
<JsonLd data={breadcrumbLd(view.crumbs.map((c) => ({ name: c.name, href: c.href ?? hrefFor(lang, { product: id }) })))} />
```

`app/[lang]/search/page.tsx` — ввозы `import type { Metadata } from 'next'`, `import { toMetadata } from '@/lib/seo.ts'`; страница результатов всегда закрыта от обхода:

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'nav.search'), description: t(lang, 'search.label'), path: (l) => hrefFor(l, { search: '' }), index: false })
}
```

- [ ] **Step 6: Write the documents page**

`components/DocView.tsx`:

```tsx
import p from '@/styles/primitives.module.css'
import s from './DocView.module.css'
import type { Doc } from '@/lib/source/contract.ts'

export function DocView({ doc }: { doc: Doc }) {
  return (
    <article className={`${p.stack} ${s.doc}`}>
      <div className={p.pagehead}><h1>{doc.title}</h1><p>{doc.summary}</p></div>
      {doc.sections.map((sec) => (
        <section key={sec.heading} className={`${p.prose} ${s.part}`}>
          <h2>{sec.heading}</h2>
          <p>{sec.body}</p>
        </section>
      ))}
    </article>
  )
}
```

`components/DocView.module.css`:

```css
.doc{--stack:var(--air-group);padding-block-end:var(--air-page)}
.part{max-inline-size:var(--measure)}
```

`app/[lang]/info/[doc]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { langOf } from '@/lib/route.ts'
import { content } from '@/lib/source/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { breadcrumbLd } from '@/lib/ld.ts'
import { Breadcrumbs } from '@/components/Breadcrumbs.tsx'
import { DocView } from '@/components/DocView.tsx'
import { JsonLd } from '@/components/JsonLd.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string; doc: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  const { doc } = await params
  const r = await content().doc(lang, doc)
  if (!r.ok) return {}
  return toMetadata(lang, { title: r.value.title, description: r.value.summary, path: (l) => hrefFor(l, { doc }) })
}

export default async function DocPage({ params }: Props) {
  const lang = await langOf(params)
  const { doc } = await params
  const r = await content().doc(lang, doc)
  if (!r.ok) {
    if (r.reason === 'unavailable') return <Unavailable lang={lang} />
    notFound()
  }
  const home = { name: t(lang, 'crumb.home'), href: hrefFor(lang, { home: true }) }
  return (
    <main id="main" className={p.wrap}>
      <JsonLd data={breadcrumbLd([home, { name: r.value.title, href: hrefFor(lang, { doc }) }])} />
      <Breadcrumbs trail={[home, { name: r.value.title }]} label={t(lang, 'crumb.label')} />
      <DocView doc={r.value} />
    </main>
  )
}
```

- [ ] **Step 7: Write «not found» and the error screen**

`app/[lang]/not-found.tsx`:

```tsx
'use client'
import { usePathname } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { DEFAULT_LANG, isLang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { StateScreen } from '@/components/StateScreen.tsx'

/* «Не найдено» параметров не получает: язык — из первого сегмента адреса. */
export default function NotFound() {
  const segment = usePathname().split('/')[1] ?? ''
  const lang = isLang(segment) ? segment : DEFAULT_LANG
  return (
    <main id="main" className={p.wrap}>
      <StateScreen level={1} kind="not-found" title={t(lang, 'notFound.title')} step={t(lang, 'notFound.step')} href={hrefFor(lang, { catalog: true })} />
    </main>
  )
}
```

`app/[lang]/error.tsx`:

```tsx
'use client'
import { usePathname } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import s from '@/components/StateScreen.module.css'
import { DEFAULT_LANG, isLang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'

export default function ErrorScreen({ reset }: { reset: () => void }) {
  const segment = usePathname().split('/')[1] ?? ''
  const lang = isLang(segment) ? segment : DEFAULT_LANG
  return (
    <main id="main" className={p.wrap}>
      <section className={`${p.stack} ${s.state}`} role="alert">
        <h1 className={s.title}>{t(lang, 'error.title')}</h1>
        <div><button className={b.btn} type="button" onClick={reset}>{t(lang, 'error.retry')}</button></div>
      </section>
    </main>
  )
}
```

- [ ] **Step 8: Write the sitemap and robots**

`app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'
import { LOCALES, DEFAULT_LANG } from '@/lib/locale.ts'
import { hrefFor } from '@/lib/href.ts'
import { absolute } from '@/lib/seo.ts'
import { source, content } from '@/lib/source/index.ts'

/* Обещанное — каждая страница для поиска на всех языках, из того же
   источника, что и сами страницы (check:urls сверяет в обе стороны).
   Источник не ответил — карта не пишется пустой: это была бы ложь. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cols, ids, docs] = await Promise.all([source().collections(DEFAULT_LANG), source().productIds(), content().docs(DEFAULT_LANG)])
  if (!cols.ok || !ids.ok || !docs.ok) throw new Error('sitemap: источник не ответил — карта не пишется пустой')
  const paths = LOCALES.flatMap((lang) => [
    hrefFor(lang, { home: true }),
    hrefFor(lang, { catalog: true }),
    ...cols.value.map((c) => hrefFor(lang, { category: c.slug })),
    ...ids.value.map((id) => hrefFor(lang, { product: id })),
    ...docs.value.map((d) => hrefFor(lang, { doc: d.slug })),
  ])
  return paths.map((path) => ({ url: absolute(path) }))
}
```

`app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'
import { absolute } from '@/lib/seo.ts'
import { CATALOG_IS_REAL } from '@/lib/flags.ts'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: CATALOG_IS_REAL ? { userAgent: '*', allow: '/' } : { userAgent: '*', disallow: '/' },
    sitemap: absolute('/sitemap.xml'),
  }
}
```

- [ ] **Step 9: Run** — переустановить (`--force`); в демо `npm test`, `npm run typecheck`, `npm run check:css`, `npm run check:code`, `npm run check:port`, `npm run check:lint`, `npm run check:open`, `npm run build`. Затем `npm run start` в фоне и при нём: `SITE=http://localhost:3020 npm run check:urls`, `SITE=http://localhost:3020 npm run check:seo`. Остановить сервер.
Expected: всё зелёное. Семья `check:seo`, требующая того, чего нет, чинится в шаблоне (`lib/seo.ts`, `lib/ld.ts`), переустановка, повтор.

- [ ] **Step 10: Commit**

```bash
git add templates/storefront
git commit -m "Витрина RO: обязательные страницы, «не найдено», ошибка, метаданные с hreflang и x-default, JSON-LD, карта сайта и robots"
```

---

### Task 11: Приёмка плана 1 — проверки, свип, снимки, запись в наборе

**Files:**
- Modify: `README.md` набора (раздел установки), `skills/site-building/SKILL.md` (таблица выбора режима), `docs/rules.md` (правило И253)

- [ ] **Step 1: Full run in the demo** — переустановить (`--force`); в `D:\BusinessProject\cbd-storefront-demo`:

```bash
npm run typecheck
npm test
npm run check:css
npm run check:code
npm run check:lint
npm run check:port
npm run check:open
npm run build
```

затем `npm run start` в фоне и при нём:

```bash
SITE=http://localhost:3020 npm run check:urls
SITE=http://localhost:3020 npm run check:seo
SITE=http://localhost:3020 npm run check:craft
SITE=http://localhost:3020 npm run sweep
```

(`check:craft` и `sweep` ищут Playwright через `tools/browser.mjs`; не нашли — печатают, какую переменную (`PLAYWRIGHT`, `BROWSER_EXECUTABLE`) задать.)
Expected: всё зелёное, свип без прокрутки вбок, вылетов и наездов на 41 ширине. Каждая находка чинится в шаблоне набора, переустановка, повтор с первой команды.

- [ ] **Step 2: Kit checks** — в наборе:

```bash
node --test selftest/
node tools/check-test.mjs
npm run check:css
npm run check:rules
node skills/site-building/scripts/check-resources.mjs
```

Expected: зелёное.

- [ ] **Step 3: Record in the kit**

`README.md` — в разделе установки после строки про новый сайт:

```markdown
- **Витрина CBD для румынского рынка на Next.js** — `node install.mjs --storefront <папка>`: основа набора плюс готовое приложение (ro · en · hu, лей, каталог с гранями, товар с вариантами, обязательные страницы, разметка для поиска) на образце данных. Живые Vendure и Payload подключаются настройкой `SOURCE` (план 4).
```

`skills/site-building/SKILL.md` — в таблицу выбора режима строку:

```markdown
| Новая витрина CBD на Next.js (румынский рынок) | `node install.mjs --storefront <папка>` — шаблон `templates/storefront` на основе набора |
```

`docs/rules.md` — правило И253 в формате соседних записей:

```markdown
## И253 · Витрина начинается с образца, собранного из основы

**Дефект.** У набора были правила, шкалы, примитивы и проверки, но не было ни одной витрины, собранной из них целиком: новый магазин начинался с пустой папки, а чужой сайт не с чем было сверить — «как должно быть» жило только в тексте правил.

**Правило.** Новая витрина ставится `node install.mjs --storefront <папка>` из `templates/storefront`: приложение Next.js, где каждая страница берёт данные через один договор (`lib/source/contract.ts`), блоки получают готовые строки, а вид — только основа набора. Правка витрины делается в шаблоне набора и переустанавливается; проверки гоняются на установленной копии.
```

- [ ] **Step 4: Screenshots for the owner** — при поднятом `npm run start` снять главную, `uleiuri` с фильтром `forma=ulei`, товар `ulei-cbd-full-spectrum?option.putere=20&option.volum=10`, документ `livrare-si-plata`, «не найдено» — на ширине 360 и 1280, в светлой и тёмной теме; прислать заказчику с одной строкой о том, что проверено.

- [ ] **Step 5: Commit**

```bash
git add README.md skills/site-building/SKILL.md docs/rules.md
git commit -m "Витрина RO, план 1: приёмка — проверки набора, свип, снимки; --storefront в README и скилле, И253"
```

---

## Самопроверка против замысла

- План 1 покрывает: языки ro · en · hu в адресе, `x-default` → ro; лей «29,90 lei»; каталог с гранями ИЛИ/И, листанием и 404 на мусоре; поиск; товар с вариантами через адрес и протоколом партии; обязательные страницы; «не найдено», ошибку, «магазин не отвечает»; подвал с реквизитами, ANPC и SOL; JSON-LD (Organization, WebSite, BreadcrumbList, Product, FAQPage); карту сайта и robots; флаги настоящести; установку `--storefront`; приёмку проверками набора и свипом.
- Вынесено по замыслу: корзина и оформление с ramburs и easybox (план 2), личный кабинет (план 3), живые адаптеры Vendure и Payload, `cacheComponents`, сброс кэша и предпросмотр, снимок схемы (план 4), задача CI `storefront`, e2e Playwright, Lighthouse, справочник «Образцовая витрина» (план 5). `Offer` в JSON-LD товара включается флагом `PRICES_ARE_REAL` на этапе наполнения.
