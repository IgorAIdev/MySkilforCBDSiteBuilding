import type { Lang } from './locale.ts'

/* Рынок шаблона — Румыния. Валюта, её запись и запись индекса — факты рынка,
   не вёрстки: проверка поля берёт образец отсюда, а не из кода формы.

   Валюта образца — евро (слово заказчика 24.09.2026: «цена делай в евро»):
   цены каталога, доставки и порог оплаты при получении — в евроцентах.
   Настоящий магазин RO ставит леи при постановке: `install.mjs --storefront
   --currency RON` переписывает строку `currency` ниже (запись не менять —
   ставщик ищет её регуляркой). Как число читается — решает язык страницы
   через `Intl`: en «€29.90», ro и hu «29,90 €»; запись числа одна —
   lib/format.ts (И347), цена — lib/money.ts на ней же. Тег рынка ниже
   (`intlLocale`) — датам, названиям регионов и правилам числа слов, не
   цифрам: `en-RO` у `Intl` пишет дробь по-румынски.

   Уезды (`regions`) — тоже факт рынка: сорок один județ и București, как их
   пишет адрес и читает курьер, — на всех языках страницы одними именами, в
   порядке румынского алфавита. Поле «уезд» кассы — выбор из этого списка, а
   не свободная строка: «Buc.», «Bucuresti» и «Sector 3» курьер не ищет
   (разбор 24.09.2026, O4). Список закрытый — проверка адреса берёт его
   отсюда (lib/checkout-form.ts). */
export const MARKET = {
  country: 'RO', currency: 'EUR', precision: 2, display: 'narrowSymbol',
  postal: { pattern: '^\\d{6}$', example: '010011' },
  /* Запись номера рынка — образец поля телефона (окно быстрого заказа). */
  phone: { example: '+40 712 345 678' },
  regions: [
    'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brașov', 'Brăila', 'București',
    'Buzău', 'Caraș-Severin', 'Călărași', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
    'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț',
    'Olt', 'Prahova', 'Satu Mare', 'Sălaj', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vaslui',
    'Vâlcea', 'Vrancea',
  ],
} as const
const TAGS: Record<Lang, string> = { ro: 'ro-RO', en: 'en-RO', hu: 'hu-RO' }
export const intlLocale = (lang: Lang): string => TAGS[lang]
