# Доставка и оплата — общий механизм

**Черновик.** Справочник служб (`assets/commerce/carriers.json`) — рабочий
список вариантов по странам, не готовое решение. Слово заказчика 23.09.2026,
при разборе задания: «с доставками не нужна суперточность, это будет
решаться в каждом конкретном магазине отдельно; сейчас накидай черновых
вариантов». Каждый магазин выбирает и перепроверяет свои службы сам.

Откуда взялся общий механизм — решение заказчика 23.09.2026, при начале
плана 2: «не почтомат изибокс, а служба доставки универсальная — мы ж скил
делаем универсальный»; «в скиле собери основные варианты доставки по
странам»; «проверь ещё, какими службами пользуются CBD-магазины». Первая
редакция замысла называла easybox видом доставки — это было прибито к
одному рынку (раздел «Доставка и оплата — общий механизм»,
`docs/superpowers/specs/2026-09-23-storefront-ro-design.md`).

## Порядок работы

1. Найти страну рынка в `assets/commerce/carriers.json`.
2. Заказчик выбирает 2–4 службы — одну до двери, сеть пунктов выдачи или
   постаматов — и решает про наложенный платёж; ему показывается таблица
   его страны словами, не кодами.
3. Завести способы доставки в Vendure: код способа — id способа витрины,
   вид `address`/`pickup` и имя службы — поля способа.
4. Точки выдачи — адаптер к списку точек службы (`api.points`) или её
   виджет, поиск по городу.
5. Способы оплаты — обработчики на сервере Vendure; наложенный платёж —
   свой обработчик; тестовый в бой не идёт.
6. Страница «Доставка и оплата» — таблицей из того же списка, что выбор на
   оформлении (И95 скилла `shop`).
7. До запуска — письменно спросить выбранную службу о пересылке CBD (см.
   «CBD и службы доставки» ниже).

## Устройство в витрине

Вид способа — закрытый список из двух: до двери (`address`) и пункт выдачи
(`pickup`; тип точки — `office`, `locker`, `partner`, самовывоз продавца —
`shop`). Справочник ложится на них так: `door` → `address`; `office` →
`pickup` с типом `office` или `partner`; `locker` → `pickup` с типом
`locker`. Оплата — `on-delivery | transfer | online`; недопустимая
показывается выключенной с причиной, а не прячется. Договор —
`templates/storefront/lib/source/contract.ts`.

## Справочник по странам

Из `assets/commerce/carriers.json` (черновик, дата проверки — `checked`
реестра). «По некоторым службам» значит: наложенный платёж подтверждён не у
всех служб страны, а не что его нет вовсе.

| страна | до двери | пункты и постаматы | наложенный платёж |
| --- | --- | --- | --- |
| Болгария (BG) | Econt, Speedy, Sameday | Econt, Speedy, BOX NOW, Sameday | по некоторым службам |
| Румыния (RO) | FAN Courier, Sameday, Cargus, DPD, GLS, Poșta Română | FAN Courier, Sameday, Cargus, DPD, GLS, Poșta Română | да |
| Венгрия (HU) | Magyar Posta, GLS, FOXPOST, DPD, Packeta | Magyar Posta, GLS, FOXPOST, DPD, Packeta | по некоторым службам |
| Украина (UA) | Nova Post, Ukrposhta, Meest | Nova Post, Ukrposhta, Meest | по некоторым службам |
| Молдова (MD) | Poșta Moldovei, Nova Post, EVS Courier | Poșta Moldovei, Nova Post | по некоторым службам |
| Греция (GR) | ELTA Courier, ACS Courier, Speedex, Geniki Taxydromiki, Skroutz Last Mile | ELTA Courier, ACS Courier, Speedex, Geniki Taxydromiki, BOX NOW, Skroutz Last Mile | по некоторым службам |
| Сербия (RS) | Pošta Srbije (Post Express), Dexpress, BEX, AKS Express Kurir, City Express | Pošta Srbije (Post Express), Dexpress, BEX, AKS Express Kurir, City Express | да |
| Хорватия (HR) | Hrvatska pošta, GLS Croatia, DPD, Overseas Express | Hrvatska pošta, GLS Croatia, DPD, Overseas Express, BOX NOW | да |
| Словения (SI) | Pošta Slovenije, GLS, DPD | Pošta Slovenije, GLS, DPD | да |
| Польша (PL) | InPost, Poczta Polska (Pocztex), DPD, GLS | InPost, Poczta Polska (Pocztex), DPD, ORLEN Paczka, GLS | по некоторым службам |
| Чехия (CZ) | Balíkovna, DPD, PPL, GLS | Zásilkovna (Packeta), Balíkovna, DPD, PPL, GLS | да |
| Словакия (SK) | Slovenská pošta, DPD, GLS | Packeta, Slovenská pošta, DPD, GLS | да |
| Литва (LT) | LP EXPRESS, DPD, Venipak | LP EXPRESS, Omniva, DPD, Venipak | нет данных |
| Латвия (LV) | DPD, Venipak, Latvijas Pasts | Omniva, DPD, Venipak, Latvijas Pasts | нет данных |
| Эстония (EE) | Omniva, SmartPosti (Itella), DPD, Venipak | Omniva, SmartPosti (Itella), DPD, Venipak | нет данных |
| Германия (DE) | DHL, DPD, Hermes, GLS, UPS | DHL, DPD, Hermes, GLS, UPS | нет данных |
| Австрия (AT) | Österreichische Post, DPD, GLS | Österreichische Post, DPD, GLS, Hermes | нет данных |
| Италия (IT) | Poste Italiane, BRT, GLS | Poste Italiane, BRT, GLS, InPost | по некоторым службам |
| Испания (ES) | Correos, SEUR, MRW, GLS | Correos, SEUR, MRW, GLS, InPost | по некоторым службам |
| Португалия (PT) | CTT, DPD, GLS | CTT, DPD, GLS | по некоторым службам |
| Франция (FR) | Colissimo, Chronopost, DPD | Colissimo, Chronopost, Mondial Relay, DPD, Relais Colis | по некоторым службам |
| Бельгия (BE) | bpost, DPD, GLS | bpost, DPD, Mondial Relay, GLS | по некоторым службам |
| Нидерланды (NL) | PostNL, DHL, DPD, GLS | PostNL, DHL, DPD, GLS | нет данных |
| Ирландия (IE) | An Post, DPD, GLS | An Post, DPD, GLS | нет данных |

Перепроверять перед запуском: службы сливаются и закрываются. По
исследованию 23.09.2026 — Fastway Ireland ушла в процедуру банкротства
(окт. 2025, из справочника исключена совсем); Sameday закрывает бизнес в
Венгрии; Packeta и Foxpost в Венгрии объединяют сети постаматов; D Express
и City Express в Сербии становятся одной компанией под Австрийской почтой.

## CBD и службы доставки

Часть крупных служб открыто запрещает CBD в правилах перевозки — по
исследованию 23.09.2026 это DHL Express, UPS, DPD (Великобритания),
InPost (Польша), Nova Poshta (Украина), PostNL, Correos (Испания), Magyar
Posta (Венгрия), ELTA (Греция). Отсутствие строки в реестре — не
разрешение: перед запуском магазина каждую выбранную службу нужно
спросить о пересылке CBD письменно.
