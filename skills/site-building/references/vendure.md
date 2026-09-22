# Vendure за витриной Next.js

Применять, когда торговля витрины — Vendure (Shop API). Контент — отдельно,
[payload.md](payload.md); общие решения каталога и корзины —
[commerce-patterns.md](commerce-patterns.md). Готовый код адаптера —
[assets/vendure](../assets/vendure/INTEGRATION.md). Сверено с Vendure 3.x и
`vendurehq/nextjs-starter-vendure@7d06ae0` (MIT); ошибки стартера ниже названы,
чтобы их не переносить.

## Порядок работы

1. **Снять конфиг сервера, а не угадывать.** Версия Vendure; каналы: token,
   языки и валюты по умолчанию и доступные; точность `MoneyStrategy`
   (по умолчанию 2, одна на все валюты); стратегия показа остатков
   (`IN_STOCK | LOW_STOCK | OUT_OF_STOCK` по умолчанию); стратегия
   преобразования картинок и пресеты; стратегия доступа к заказу по коду;
   `customFields` товара и варианта. Записать в `docs/decisions.md` витрины.
2. **Снимок схемы в репозиторий.** `schema.graphql` Shop API этой версии и
   типы из него (gql.tada или graphql-codegen). Обновление — командой, а не
   рукой; смена схемы видна в диффе.
3. **Один серверный клиент.** `request.mjs`: адрес API и токены только на
   сервере (`import 'server-only'`, переменные без `NEXT_PUBLIC_`). Канал —
   явный, у каждого рынка свой; молчаливый `__default_channel__` показывает
   цены чужого рынка.
4. **Сессия.** Vendure выдаёт и продлевает токен заголовком ответа
   `vendure-auth-token`. Сервер витрины кладёт его в cookie `httpOnly; secure;
   sameSite=lax; path=/` со сроком не больше срока сессии сервера и шлёт как
   `Authorization: Bearer`. Выход — мутация `logout` С ТОКЕНОМ, затем удалить
   cookie. (Стартер ставит cookie без флагов и зовёт `logout` без токена —
   сессия на сервере переживает выход.)
5. **Каталог, товар, корзина, оформление** — по разделам ниже, каждое через
   ресурсы адаптера; компоненты получают нейтральные данные, не ответы SDK.
6. **Кэш и обновление** — раздел «Кэш». Сначала реестр тегов, потом код.
7. **Проверка** — сценарии в конце; для чужой витрины — «Как проверить готовую».

## Каталог

```graphql
query Search($input: SearchInput!) {
  search(input: $input) {
    totalItems
    items {
      productId slug productName currencyCode
      productAsset { preview focalPoint { x y } }
      priceWithTax { ... on SinglePrice { value } ... on PriceRange { min max } }
    }
    facetValues { count facetValue { id code name facet { id code name } } }
  }
}
# input: { collectionSlug, groupByProduct: true, take, skip, facetValueFilters, sort }
```

* Листание — `take/skip` и `totalItems` (`search.mjs → pageVariables, pageCount`).
  `?page=0`, `-1`, `1.5`, `abc` и страница за концом — 404, а не тихая первая.
* Фильтр в адресе — стабильные `code` (`facet.form=oil`), не числовые ID:
  ID разные на разработке и в бою. Словарь `code → id` строит адаптер.
* Внутри одной грани — ИЛИ (`{ or: [...] }`), между гранями — И. Одна запись
  `{ and }` на каждое значение («масло» + «капсулы») не находит ничего — так
  сделано в стартере.
* Цена на полке — `searchPrice()`: диапазон с разными `min/max` — «от min»,
  не цена выбранного варианта. Счётчики `facetValues` приходят по уже
  отфильтрованному результату; число для соседних значений выбранной грани —
  отдельным запросом без этой грани.

## Товар

```graphql
query Product($slug: String!) {
  product(slug: $slug) {
    id slug name description
    translations { languageCode slug }
    featuredAsset { preview focalPoint { x y } }
    optionGroups { id code name options { id code name } }
    variants { id sku name priceWithTax currencyCode stockLevel options { id code } }
  }
}
```

* `null` → `notFound()`. Адрес товара на другом языке — из `translations`,
  для `hreflang` и переключателя языка.
* С Vendure 3.6 группы опций общие: `displayOptionGroups()` убирает опции без
  варианта, `toSelection()` отдаёт товар в `variant-selection.mjs` по `code`.
* Описание — HTML из админки: санитизировать на сервере перед
  `dangerouslySetInnerHTML` (стартер этого не делает).
* Обещания доверия и частые вопросы — из Payload, не строками в компоненте.

## Корзина

```graphql
mutation Add($id: ID!, $qty: Int!) {
  addItemToOrder(productVariantId: $id, quantity: $qty) {
    __typename
    ... on Order { id code totalQuantity totalWithTax currencyCode }
    ... on ErrorResult { errorCode message }
    ... on InsufficientStockError { quantityAvailable order { id totalQuantity } }
  }
}
```

* Каждая мутация выбирает `__typename` и `... on ErrorResult`, результат
  читается `readResult()`. Не прочитанный union превращает «нет столько на
  складе» в молчаливый успех. `InsufficientStockError` — частичный успех:
  показать, сколько добавлено, и обновить корзину из `order`.
* Изменение — `adjustOrderLine(orderLineId, quantity)`, удаление —
  `removeOrderLine`, купон — `applyCouponCode` / `removeCouponCode`: по ID
  строки, не варианта.
* Мутации — Server Actions; одна полоса на корзину (`mutation-lane.mjs`,
  `timeoutMs`); после таймаута корзина перечитывается, повтор не автоматический.
* Итоги, налог и скидку считает Vendure. Витрина не складывает цены.

## Оформление — машина состояний заказа

1. Гость: `setCustomerForOrder({ emailAddress, firstName, lastName })`;
   вошедший получает `AlreadyLoggedInError` — шаг пропускается.
2. `setOrderShippingAddress(input)` — `countryCode` по ISO.
3. `eligibleShippingMethods` → `setOrderShippingMethod(shippingMethodId: [id])`.
4. Переход в `ArrangingPayment` — только из `AddingItems`: прочитать
   `order.state` и `nextOrderStates`. Повтор после отказа платежа идёт без
   перехода (стартер требует переход всегда, и повторная оплата падает).
5. `eligiblePaymentMethods` → показывать только `isEligible`, причину
   недоступности — `eligibilityMessage`.
6. `addPaymentToOrder({ method, metadata })` → `readResult(…, 'Order')`;
   `PaymentDeclinedError`, `PaymentFailedError`, `IneligiblePaymentMethodError`
   — сообщение у формы, заказ остаётся в `ArrangingPayment`.
7. Вернуться к правке корзины из `ArrangingPayment` —
   `transitionOrderToState("AddingItems")`.
8. Подтверждение — `orderByCode(code)`; доступ гостя ограничен стратегией
   сервера — проверить её. Оплаченным заказ считается по ответу Vendure, не
   по параметру адреса.

Шаги адресуемы и переживают Back и обновление. Способ оплаты для витрины
определяет сервер: тестовый (`standard-payment`, `dummy`) не попадает в бой.
Для CBD-рынка наложенный платёж — обработчик оплаты на сервере Vendure;
карточный провайдер высокого риска подключается там же, ключи — не в витрине.

## Кэш (Next 16, `cacheComponents`)

* Реестр тегов — один модуль: `vd:product:{id}`, `vd:collection:{id}`,
  `vd:search`, `vd:facets`; по ID, не по slug (переименование не должно
  оставлять старый кэш). Страница помечается тегами источников, из которых
  собрана.
* Публичное — функции `'use cache'` с языком, валютой и каналом АРГУМЕНТАМИ
  + `cacheTag`. Внутри публичного кэша не читать `cookies()`, `headers()` и
  токен сессии: одна корзина попадёт всем.
* Личное (корзина, счётчик в шапке, кабинет) — динамическое или
  `'use cache: private'`; после мутации — обновление тега/страницы средствами
  установленной версии Next (сверить с её документацией).
* Сброс по событию: плагин на сервере Vendure слушает события товара,
  варианта, коллекции, остатка и ассета и шлёт каждой витрине подписанный
  POST на `/api/revalidate`: HMAC по телу и времени, сравнение
  `timingSafeEqual`, окно повтора 5 минут, теги старого и нового состояния.
  Витрина раскрывает базовый тег по всем языкам и валютам канала. Пример
  стартера получает запрос, но отправителя на стороне Vendure не содержит.

## Картинки

Сервер ассетов Vendure сам режет: `assetSrcSet()` (`w`, `h`, `mode=crop`,
`format=webp`, фокус `fpx/fpy`) и тот же фокус в `object-position` кадра
(`frame`, запрет 4 в `CLAUDE.md`). Не пропускать `preview` через второй
оптимизатор `next/image`. Первый кадр — `fetchpriority="high"`, остальные —
`loading="lazy"`; `preconnect` к хосту ассетов.

## Рынки, языки, каналы

Рынок = канал Vendure (цены, валюта, налоги, наличие) + язык адреса.
`languageCode` — из сегмента адреса, валюта — из канала рынка. Перевод — поле
движка; если перевода нет, Vendure отдаёт язык канала по умолчанию — для
юридических и медицинских формулировок это дефект, а не удобство.

## CBD

`customFields` варианта: номер партии, CBD мг на единицу, THC % — числа
приходят данными, витрина их форматирует, но не пишет. Протокол лаборатории —
в Payload по номеру партии; блок протокола показывается только при совпадении
партии (флаг `lab`, скилл `shop`). Никаких обещаний здоровья в описаниях —
`shop`, «Магазин CBD».

## Устройство кода

Из стартера (тесты `tests/architecture`, `tests/i18n`): файлы `app/` только
собирают страницу; функции одной части не лезут во внутренности другой;
слой платформы (`lib/vendure`) не импортирует страницы; ключи переводов
совпадают во всех языках. Меряется `check:code`, `check:port`.

## Сценарии проверки

Неизвестный slug; фильтр с исчезнувшим значением; два значения одной грани;
`?page=` мусор и за концом; цена 0; диапазон цены; вариант без остатка;
общая группа опций; двойное нажатие «в корзину»; `InsufficientStockError`;
таймаут мутации; отказ платежа и повтор; Back между шагами; второй канал и
язык; недоступный Vendure (витрина говорит «временно недоступно», не «пусто»);
выход из аккаунта завершает сессию на сервере.

## Как проверить готовую витрину

| Искать | Что значит |
| --- | --- |
| мутация без `__typename` / `ErrorResult` | ошибка корзины выглядит как успех |
| `/ 100`, `toFixed(2)`, `'USD'` в компонентах | денежная арифметика вне адаптера |
| `facetValueFilters` только с `and` | два значения одной грани дают пустой список |
| `Number(page) \|\| 1` | мусорный адрес отдаётся как первая страница, дубли в поиске |
| `'use cache'` рядом с `cookies()` / токеном | личные данные в общем кэше |
| cookie токена без `httpOnly`, `secure` | токен сессии доступен скриптам страницы |
| `logout` без токена | выход не завершает сессию |
| `transitionOrderToState('ArrangingPayment')` без проверки `state` | повторная оплата ломается |
| код тестового способа оплаты в конфиге боя | заказ «оплачен» без денег |
| `/api/revalidate` со сравнением секрета через `===` | подбор секрета по времени ответа |
| `dangerouslySetInnerHTML` с описанием без очистки | HTML из админки исполняется у покупателя |
| нет `error.tsx`, `not-found.tsx` | сбой источника — белый экран |
| `NEXT_PUBLIC_VENDURE_*` у адреса API или токена | запросы идут из браузера мимо сервера витрины |

Итог отчёта — числами по строкам таблицы и тем, что запускалось; не
проверенное названо.
