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
| постамат | locker | parcel locker | csomagautomata | имя сети и службы — данные, не слово интерфейса (И261) |
| пункт выдачи | punct de ridicare | pickup point | átvételi pont | |
| наложенный платёж | ramburs | cash on delivery | utánvét | |
| код скидки | cod de reducere | discount code | kedvezménykód | |

## Кнопки

| Действие | ro | en | hu |
| --- | --- | --- | --- |
| положить в корзину | Adaugă în coș | Add to cart | Kosárba |
| перейти к оформлению | Finalizează comanda | Continue to checkout | Tovább a pénztárhoz |
| подтвердить заказ | Comandă cu obligație de plată | Order with obligation to pay | Megrendelés fizetési kötelezettséggel |
| применить код | Aplică | Apply | Beváltás |
| убрать из корзины | Șterge | Remove | Eltávolítás |
| применить фильтры | Aplică filtrele | Apply filters | Szűrők alkalmazása |
| сбросить фильтры | Șterge filtrele | Clear filters | Szűrők törlése |
| искать | Caută | Search | Keresés |
| открыть меню полок (шапка, узкий экран) | Meniu | Menu | Menü |
| закрыть меню полок | Închide meniul | Close menu | Menü bezárása |

Кнопка заказа называет обязанность платить — Директива 2011/83/ЕС, ст. 8(2) (И262). Формулировку внутри этой рамки утверждает заказчик.

## Ошибки у поля

| Поле и случай | ro | Шаг | en | hu |
| --- | --- | --- | --- | --- |
| e-mail пуст | Introduceți adresa de e-mail | pentru a primi confirmarea comenzii | Enter your email to receive the order confirmation | Adja meg e-mail-címét a rendelés visszaigazolásához |
| e-mail неполон | Adresa de e-mail pare incompletă | de exemplu nume@exemplu.ro | The email looks incomplete, e.g. name@example.com | Az e-mail-cím hiányosnak tűnik, például nev@pelda.hu |
| телефон | Introduceți numărul de telefon | de exemplu 0722 123 456 | Enter your phone number, e.g. 0722 123 456 | Adja meg telefonszámát, például 0722 123 456 |
| код скидки | Codul nu este valabil | verificați-l și introduceți-l fără spații | The code is not valid; check it and enter it without spaces | A kód nem érvényes; ellenőrizze, és szóközök nélkül írja be |
| варианта больше нет | Această variantă nu mai există | alegeți alta | This option no longer exists — pick another | Ez a változat már nem létezik — válasszon másikat |
| количество больше остатка | Avem doar {n} buc. în stoc | atât sunt acum în coș | We only have {n} in stock — that is how many are in your cart now | Csak {n} db van raktáron — most ennyi van a kosárban |
| обязательное поле | Completați câmpul | pentru a continua | Fill in this field to continue | A folytatáshoz töltse ki a mezőt |
| индекс | Verificați codul poștal | de exemplu {example} | Check the postcode, e.g. {example} | Ellenőrizze az irányítószámot, például {example} |
| слишком длинно | Scurtați textul | la cel mult {n} caractere | Shorten this to at most {n} characters | Legfeljebb {n} karakter lehet |
| итог заказа изменился у кнопки | Totalul comenzii s-a schimbat | verificați-l din nou înainte să plasați comanda | Your order total has changed — check it again before placing the order | A rendelés végösszege megváltozott — ellenőrizze újra, mielőtt leadja a rendelést |

## Пустые экраны

| Экран | ro | Шаг | en | hu |
| --- | --- | --- | --- | --- |
| пустая корзина | Coșul este gol | Vedeți produsele | Your cart is empty — see the products | A kosár üres — termékek megtekintése |
| поиск без результатов | Niciun rezultat pentru „{q}” | Verificați ortografia sau vedeți toate produsele | No results for “{q}” — check the spelling or see all products | Nincs találat: „{q}” — ellenőrizze a helyesírást, vagy nézze meg az összes terméket |
| фильтры без результатов | Niciun produs nu corespunde filtrelor | Ștergeți unul dintre filtre | No products match these filters — clear one | Nincs a szűrőknek megfelelő termék — töröljön egy szűrőt |
| пустая категория | Nu sunt produse în această categorie | Vedeți toate produsele | There are no products in this category — see all products | Ebben a kategóriában nincs termék — összes termék |
| нет заказов | Nu aveți încă nicio comandă | Mergeți la magazin | No orders yet — go to the shop | Még nincs rendelése — irány a bolt |
| магазин не отвечает | Magazinul nu răspunde momentan | Încercați din nou peste un minut | The shop is not responding — try again in a minute | A bolt jelenleg nem válaszol — próbálja újra egy perc múlva |
| нет точек выдачи | Niciun punct de ridicare în „{city}” | Încercați o localitate apropiată | No pickup points in “{city}” — try a nearby town | Nincs átvételi pont itt: „{city}” — próbáljon egy közeli települést |
| нет свежего заказа | Nu există o comandă recentă de afișat | Mergeți la produse | There is no recent order to show — go to the products | Nincs megjeleníthető friss rendelés — tovább a termékekhez |

«Магазин не отвечает» — не «пусто»: источник недоступен и пустой каталог —
разные состояния.
