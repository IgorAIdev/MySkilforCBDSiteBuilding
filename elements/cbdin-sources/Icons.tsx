/**
 * Every icon on the storefront is drawn here, in one stroke weight, so a page
 * never reaches for a unicode glyph or a second icon library.
 */
import s from './Stars.module.css'
import T from './T'

/** Стрелка «вперёд» — две фигуры, а не одна.
 *
 *  Линия и голова разделены нарочно: знак с разбегом удлиняет линию и везёт
 *  голову вперёд (`styles/go.module.css`, `data-motion='run'`), а склеенная
 *  из двух деталей стрелка ломается на стыке — ровно этот дефект заказчик
 *  нашёл глазом у героя. Рисунок при этом тот же: линия кончается под
 *  головой, как и раньше.
 *
 *  Поворачивают её тоже здесь не они, а контрол: назад, наверх и вниз — это
 *  та же стрелка под углом, а не три новых знака. */
export const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12H18" />
    <path d="M13 6l6 6-6 6" />
  </svg>
)

/** Значок дизайн-системы: набор разных предметов, собранных по одному
 *  правилу. Временный — он ведёт на страницу набора, которой в магазине не
 *  место; уйдёт вместе с ней. */
export const Swatch = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <circle cx="17" cy="17" r="3.5" />
  </svg>
)

/** Сортировка: две стрелки, вверх и вниз.
 *
 *  Знак симметричен НАРОЧНО, и это его смысл: он говорит «здесь решается
 *  порядок», а какой порядок выбран — говорит список под ним. Прежде знак
 *  был несимметричным (стрелка и полосы) и показывал текущее направление
 *  поворотом — потому что направление переключала отдельная кнопка рядом.
 *  Кнопки больше нет: ключ и направление выбираются в одном списке, и
 *  показывать направление знаку стало нечем.
 *
 *  Одна стрелка вверх сюда по-прежнему не годится — заказчик сказал это
 *  раньше и был прав: на сайте она уже значит «наверх страницы». Две
 *  встречные не значат ничего другого нигде. */
/** Знак подредбы. Две стрелки — две стороны, и знак умеет сказать, какая из
 *  них сейчас работает: `dir` гасит вторую (правило гашения — одно на весь
 *  сайт, в `styles/base.css`). Без `dir` горят обе: знак говорит «здесь
 *  порядок» и молчит о том, какой.
 *
 *  Мысль заказчика: «стрелочку в иконке можно сделать одну тусклее, тогда
 *  будет показывать текущее направление фильтрации». Глубину он выбрал сам из
 *  трёх показанных — 40%. */
/** Убрать. Мусорная корзина, а не сумка: сумка на сайте уже значит «положить
 *  в корзину», и тем же знаком удалять — это два разных действия одной
 *  картинкой. Заказчик попросил знак вместо слова «Премахни» в строке
 *  корзины. */
export const Trash = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16M10 4h4M9.5 10.5v7M14.5 10.5v7M6.2 7l.9 13h9.8l.9-13" />
  </svg>
)

export const Sort = ({ dir }: { dir?: 'up' | 'down' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" data-dir={dir}>
    <path data-a="up" d="M8 20V5m-4 4 4-4 4 4" />
    <path data-a="down" d="M16 4v15m4-4-4 4-4-4" />
  </svg>
)

/* Пауза и пуск — залитые, а не штриховые: это единственные два знака в
   слайдере, которые говорят о состоянии показа, а не ведут куда-то. */
export const Pause = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none" /></svg>
)

export const Play = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" /></svg>
)

export const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L19 7" /></svg>
)

export const Star = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 2 3 6.6 7 .8-5.2 4.7 1.5 6.9L12 17.5 5.7 21l1.5-6.9L2 9.4l7-.8z" />
  </svg>
)

/**
 * Оценка звёздами, закрашенными на её долю.
 *
 * Здесь стояло пять полных звёзд без всякой оценки на входе — картинка не
 * могла отличить 4.2 от 4.9 в принципе. Теперь доля приходит числом и
 * уезжает в вёрстку пользовательским свойством: проценты считает тот, кто
 * знает оценку, а рисует тот, кто знает, как рисовать.
 *
 * Скринридеру не отдаётся ничего: рядом всегда стоит то же число словами
 * («4.2 · 31 отзыва»), и второй раз произносить его незачем.
 */
/* Пять номеров — постоянная, а не работа: массив, собранный заново на каждую
   отрисовку каждой карточки, это сорок лишних массивов на полке каталога. */
const FIVE = [0, 1, 2, 3, 4]

export const Stars = ({ value, className }: { value: number; className?: string }) => {
  const five = FIVE
  return (
    <span
      className={`${s.stars}${className ? ` ${className}` : ''}`}
      /* Округление не косметика: 4.9 / 5 * 100 в двоичной дроби даёт
         98.00000000000001, и этот хвост уезжал в разметку каждой страницы.
         Десятой доли процента хватает с запасом — она уже меньше пикселя. */
      style={{ ['--fill' as string]: `${Math.round(Math.max(0, Math.min(5, value)) * 200) / 10}%` }}
      aria-hidden="true"
    >
      <span className={s.back}>{five.map((i) => <Star key={i} />)}</span>
      <span className={s.front}><span className={s.inner}>{five.map((i) => <Star key={i} />)}</span></span>
    </span>
  )
}

/* Здесь был знак `Mark` — две капли и черта. Его больше нет, и это не
   уборка, а правка по слову заказчика: «это удали — не используем».

   Он выводился ровно в одном месте — на листе набора, — а на витрине не
   стоял нигде. Лист, показывающий то, чего покупатель не видит, врёт молча;
   правило целиком — И42 в `docs/rules.md`. Это третий такой знак за одну
   сессию: до него так же ушли `Whatsapp` и `Viber`. */

/** The same drop the mark is built from, on its own — so the one that stands
 *  in for the i's tittle is literally the mark's shape, not a lookalike. */
export const Drop = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 13 20" aria-hidden="true">
    <path d="M6.4.6c4.3 6 6.3 9 6.3 11.8a6.3 6.3 0 0 1-12.6 0C.1 9.6 2.1 6.6 6.4.6z" fill="currentColor" />
  </svg>
)

/** Рисованная заглушка вместо съёмки.
 *
 *  Краски заглушки — токены, а не числа. Литерал не следует теме: светлые
 *  серые, записанные числом, оставались светлыми и на тёмной карточке —
 *  пузырёк светил белым там, где всё вокруг приглушено. Ни одна проверка
 *  этого не видела: литерал стоял в разметке, а не в стилях.
 *
 *  Заглушка одна на товар, но не одна на магазин: пузырёк на месте капсул
 *  сообщает не «снимка нет», а «здесь масло», и это хуже пустого места.
 *  Форм три — по тому, во что товар налит или упакован: пузырёк, банка
 *  капсул, баночка для кожи. Заливка у всех трёх — тон марки, как и был. */
const SHAPE: Record<string, (tone: string) => React.ReactElement> = {
  bottle: (tone) => (
    <>
      <rect x="10" y="2.5" width="4" height="3.5" rx="1" fill="var(--sage-8)" />
      <path d="M8.5 8.5a2 2 0 0 1 1.6-2h3.8a2 2 0 0 1 1.6 2v10a2.5 2.5 0 0 1-2.5 2.5h-2a2.5 2.5 0 0 1-2.5-2.5z" fill="var(--sage-6)" />
      <path d="M8.5 13.5h7v5a2.5 2.5 0 0 1-2.5 2.5h-2a2.5 2.5 0 0 1-2.5-2.5z" fill={tone} />
    </>
  ),
  /* Банка капсул: шире пузырька, с крышкой во всю ширину и пояском этикетки. */
  jar: (tone) => (
    <>
      <rect x="6" y="3" width="12" height="3.2" rx="1.4" fill="var(--sage-8)" />
      <path d="M6.6 7h10.8a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H7.6a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1z" fill="var(--sage-6)" />
      <path d="M5.6 12.5h12.8v5H5.6z" fill={tone} />
    </>
  ),
  /* Баночка для кожи: приземистая, с широкой крышкой — так её и держат. */
  tub: (tone) => (
    <>
      <rect x="4.5" y="6.5" width="15" height="3.6" rx="1.6" fill="var(--sage-8)" />
      <path d="M6 11h12v6.5a3.5 3.5 0 0 1-3.5 3.5h-5A3.5 3.5 0 0 1 6 17.5z" fill="var(--sage-6)" />
      <path d="M6 14.5h12v3a3.5 3.5 0 0 1-3.5 3.5h-5A3.5 3.5 0 0 1 6 17.5z" fill={tone} />
    </>
  ),
  /* Вейп: тонкий столбик с мундштуком — ни пузырёк, ни банка. */
  pen: (tone: string) => (
    <>
      <rect x="10" y="2" width="4" height="3" rx="1.4" fill="var(--sage-8)" />
      <rect x="9" y="5.5" width="6" height="15.5" rx="2.4" fill="var(--sage-6)" />
      <rect x="9" y="12" width="6" height="9" rx="2.4" fill={tone} />
    </>
  ),
  /* Цветя: пакет с загнутым верхом и окном. */
  pouch: (tone: string) => (
    <>
      <path d="M6 6.5h12l-.9 13.2a2 2 0 0 1-2 1.8H8.9a2 2 0 0 1-2-1.8z" fill="var(--sage-6)" />
      <path d="M6 6.5h12l-.35 5H6.35z" fill="var(--sage-8)" />
      <rect x="9" y="13.5" width="6" height="5" rx="1.2" fill={tone} />
    </>
  ),
}

/** Во что этот вид товара упакован. */
export const shapeOf = (cat: string): string =>
  cat === 'capsules' ? 'jar'
    : cat === 'cosmetics' || cat === 'topicals' ? 'tub'
    : cat === 'vape' ? 'pen'
    : cat === 'flowers' ? 'pouch'
    : 'bottle'

export const Bottle = (
  { tone, shape = 'bottle', className }:
  { tone: string; shape?: string; className?: string },
) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {(SHAPE[shape] ?? SHAPE.bottle!)(tone)}
  </svg>
)

export const Search = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
)

export const Grid = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </svg>
)

/* The table view's own sign — a grid of cells, not the header's Burger: that
   one means "open navigation," this one means "rows and columns of data,"
   and the two answer different questions even though both are made of
   parallel lines. */
export const Rows = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M9.5 4.5v15" />
  </svg>
)

export const Home = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 4l8 7" /><path d="M6.5 10v9h11v-9" /></svg>
)

/* The shop itself — an awning, a wall and a door. The catalogue is not an
   index of documents, it is the shop floor, and the tab that leads to it
   should say so with the same glyph a high street would use. Drawn on the
   same 24 grid as Home, so the two stand at the same weight beside each
   other. */
export const Shop = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.2 8.6 4.8 4.4h14.4l1.6 4.2z" />
    <path d="M5.2 8.6V19.6h13.6V8.6" />
    <path d="M3.6 19.6h16.8" />
    <path d="M9.8 19.6v-4.8h4.4v4.8" />
  </svg>
)

export const Burger = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
)

export const Close = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
)

/* ── the ways to reach a shop ──────────────────────────────────────────────
   Drawn here in the same stroke as everything else rather than pasted in as
   brand logos: a footer of six differently-drawn marks from six brand kits is
   six visual languages in one row. */
/* Телефон и почта стоят в одном ряду с фирменными знаками мессенджеров, а у
   способа связи фирменного знака нет и быть не может. Значит семейство здесь
   задаётся не набором, а манерой: сплошной силуэт того же оптического веса,
   что и знаки из Simple Icons рядом. Обводкой они выбивались из ряда — три
   залитых знака и два нарисованных линией читались как два разных пера.

   Свободного набора, где лежали бы разом Viber и обычный телефон одного
   рисунка, нет: Simple Icons — только марки, а наборы с тем и другим просят
   строку атрибуции. Поэтому знаки марок берутся у марок, а эти два —
   подгоняются к ним. */
export const Phone = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none">
    <path d="M6.6 2.9a1.9 1.9 0 0 1 1.7 1l1.5 3a1.9 1.9 0 0 1-.43 2.2l-1.2 1.1a12.4 12.4 0 0 0 5.6 5.6l1.1-1.2a1.9 1.9 0 0 1 2.2-.43l3 1.5a1.9 1.9 0 0 1 1 1.7v2.3a2.3 2.3 0 0 1-2.5 2.3C10.1 20.6 3.4 13.9 2.6 5.4A2.3 2.3 0 0 1 4.9 2.9z" />
  </svg>
)
export const Mail = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="none">
    <path d="M3.4 4.6h17.2c1 0 1.8.8 1.8 1.8v11.2c0 1-.8 1.8-1.8 1.8H3.4c-1 0-1.8-.8-1.8-1.8V6.4c0-1 .8-1.8 1.8-1.8zm8.6 9.05L20.2 7.2a.9.9 0 0 0-.1-.15H3.9a.9.9 0 0 0-.1.15z" />
  </svg>
)
/** Телефон в цвете — парой к почте.
 *
 *  Краска — через ручку `--mark-self`: самая тёмная краска акцента верна на
 *  светлой подложке, а на тёмной палубе подвала знак ею пропадал целиком.
 *  Тёмный хозяин называет свою краску ручкой; путь при этом не трогает.
 *
 *  В ряду каналов он оставался единственным линейным знаком среди цветных, и
 *  ряд читался незаконченным. Цвет свой, янтарный: телефон и почта — наши
 *  способы связи, а не чужие марки, и красить их в зелёный «как в трубке»
 *  значило бы занимать цвет, которым на этом сайте ничего не помечено. */
export const PhoneColour = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="var(--mark-self, var(--cyan-12))" stroke="none">
    <path d="M6.6 2.9a1.9 1.9 0 0 1 1.7 1l1.5 3a1.9 1.9 0 0 1-.43 2.2l-1.2 1.1a12.4 12.4 0 0 0 5.6 5.6l1.1-1.2a1.9 1.9 0 0 1 2.2-.43l3 1.5a1.9 1.9 0 0 1 1 1.7v2.3a2.3 2.3 0 0 1-2.5 2.3C10.1 20.6 3.4 13.9 2.6 5.4A2.3 2.3 0 0 1 4.9 2.9z" />
  </svg>
)

/** Почта — знаком Gmail. Так выбрал заказчик, и выбор знака за ним.
 *
 *  Знак взят как он нарисован владельцем, вместе с его рамкой обзора 88×66:
 *  перерисовывать чужую марку своими числами — значит нарисовать похожее, а
 *  похожее на марку хуже, чем марка. Отношение сторон у него не квадратное,
 *  и в строке он окажется чуть ниже соседей — так и надо: буква M широкая, а
 *  подгонять её до квадрата пришлось бы растяжением.
 *
 *  Белого листа под ним нет намеренно: буква набрана насыщенными красками и
 *  читается на обеих темах сама, а белая плашка — часть ПЛИТКИ приложения, а
 *  не часть знака.
 *
 *  Цвета — литералами, и это единственное законное место для литерала:
 *  чужая марка не подчиняется нашим шкалам, и токен здесь означал бы, что
 *  тема магазина перекрашивает чужой знак. */
export const MailColour = () => (
  <svg viewBox="52 42 88 66" aria-hidden="true" fill="none" stroke="none">
    {/* чужая марка: цвета Google, токеном их красить нельзя */}
    <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
    <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
    <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
    <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
    <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
  </svg>
)
/* Здесь стояли `Whatsapp` и `Viber`, нарисованные обводкой, — и их больше
   нет намеренно, а не по забывчивости.
 
   Это то самое «третье перо», о котором говорят комментарий выше и
   `components/Marks.tsx`: ряд каналов собирался из трёх разных рисунков, и
   его свели к одному набору — Simple Icons. После этого мои два знака нигде
   не выводились: и в подвале, и в шапке, и у помощника канал рисует
   `ChannelMark`, то есть фирменная марка. Остались они только на листе
   набора — и лист год показывал два знака, которых покупатель не видит.

   Вайбер вдобавок был не дорисован: внутри пузыря лежала голая дуга вместо
   трубки, и знак читался как кружок с царапиной. Заказчик нашёл это глазом
   на листе — «посмотри иконку вайбера, с ней явно что-то не то, хотя в
   подвале иконка нормальная». Нормальная потому, что в подвале другая.

   Дорисовывать трубку значило бы починить рисунок, у которого нет места на
   сайте. Поэтому знака нет, а марка берётся у марки. */
/* Кабинет и корзина — не по одному рисунку, а выбором: и то и другое стоит в
   шапке всех страниц, и какой из них «наш», решается глазами, а не спором.

   У каждого по четыре знака, и все они об одном: на 22px читается силуэт, а
   не рисунок. Поэтому ни в одном не больше двух фигур — кольцо вокруг головы
   и плеч давало три линии и на этом размере превращалось в кляксу. */

/** Голова и плечи, контуром: две фигуры и ни одной лишней. Один знак
 *  кабинета на весь сайт — в шапке, в чекмедже и в нижней полосе телефона. */
export const AccountLine = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8.6" r="3.6" />
    <path d="M5.4 20.2a6.6 6.6 0 0 1 13.2 0" />
  </svg>
)

/* Здесь стояли `AccountDisc` и `Account` — кабинет, вырезанный из кружка, и
   он же сплошной. Оба сняты вместе с выбором: заказчик выбрал контурный
   окончательно, «Account icon — Line выбрал», а знак, который никто не
   берёт, — не запас, а вторая правда о том, как сайт рисует кабинет.
   Сплошной при этом стоял в нижней полосе телефона среди четырёх штриховых:
   один залитый знак в ряду контурных читался ошибкой набора.

   Здесь же стоял `Tote` — четвёртая корзина: «tote удаляй, остальные
   оставь».

   И здесь стоял `AccountRing` — тонкое кольцо со сплошной фигурой внутри.
   Снят по слову заказчика с листа знаков: «слишком тяжёлый визуально».

   И он прав по устройству знака, а не только на глаз. Знак был смешанный:
   обод штриховой, фигурка внутри залитая. На 22 пикселях залитая фигура в
   кольце даёт пятно чернил вплотную к ободу, и знак весит заметно больше
   трёх соседей, между которыми его выбирают. Ровнять его с ними нечем:
   штрих у обода можно утончить, у заливки толщины нет.

   Осталось три рисунка кабинета — сплошной, контурный и вырезанный из
   кружка, — и у каждого одна манера на весь знак. Пятого не заводить: знак
   кабинета читается силуэтом, а силуэт из двух разных манер не собирается. */

/** Тележка: короб и два колеса, ручка одной линией. */
export const Trolley = ({ full }: { full: boolean }) => (
  <svg className={full ? 'is-full' : undefined} viewBox="0 0 24 24" aria-hidden="true">
    <g transform="translate(0 -.5)">
      <path d="M3 4.5h2.3l2.4 10h9.6l2.2-7.2H6.6"
            fill={full ? 'currentColor' : 'none'} />
      <circle cx="9.6" cy="19" r="1.5" fill={full ? 'currentColor' : 'none'} />
      <circle cx="16.9" cy="19" r="1.5" fill={full ? 'currentColor' : 'none'} />
    </g>
  </svg>
)

/** Корзина: трапеция и две ручки. */
export const BasketWide = ({ full }: { full: boolean }) => (
  <svg className={full ? 'is-full' : undefined} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 9.6h17l-1.8 8.2a2 2 0 0 1-2 1.6H7.3a2 2 0 0 1-2-1.6Z"
          fill={full ? 'currentColor' : 'none'} />
    <path d="m8.6 9.6 2.2-5m4.9 5-2.2-5" fill="none" />
  </svg>
)


/* ── знаки мессенджеров ───────────────────────────────────────────────────
   Не наши рисунки, а чужие марки: Telegram, WhatsApp и Viber узнают по цвету
   раньше, чем по форме, и перерисованные в один тонкий контур они перестают
   быть собой. Поэтому здесь они залиты своими цветами и не подчиняются
   currentColor. Телефон и почта — не марки, они идут чернилами строки. */

/** «Написать нам» — тот же пузырь, что у плавающего помощника. */
/** Бумажный самолётик — знак телеграма БЕЗ круга.
 *
 *  Решено заказчиком: «значок телеграм давай другой использовать, тот,
 *  который без фона». Simple Icons отдаёт телеграм плашкой: залитый круг, а
 *  самолётик в нём вырезан. В ряду подвала такой знак читается не как
 *  самолётик, а как кружок — рядом с инстаграмом, у которого круга нет.
 *
 *  Поэтому самолётик рисуется НАШИМ пером: две фигуры, вес штриха общий из
 *  `styles/base.css`, концы круглые. Так он встаёт в один ряд и с нашими
 *  знаками (телефон, почта, чат), и с инстаграмом.
 *
 *  Две фигуры, а не одна: складка — отдельный штрих, иначе она заливается
 *  вместе с корпусом и самолётик превращается в треугольник. */
export const Telegram = ({ tone }: { tone?: string }) => (
  /* Краску назначает МЕСТО, но назвать её знак обязан сам: в ряду соцсетей
     подвала общего правила `fill:none; stroke:currentColor` больше нет — его
     сняли, когда ряд переехал на силуэты, и штриховой знак без своей краски
     остался бы невидимым. */
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke={tone ?? 'currentColor'}>
    <path d="M21.5 2.5 14.8 21.5 11 13 2.5 9.2Z" />
    <path d="M21.5 2.5 11 13" />
  </svg>
)

export const Chat = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.5 12c0 4.1-3.8 7.4-8.5 7.4a10 10 0 0 1-2.6-.3L4.5 21l1.2-3.7A7 7 0 0 1 3.5 12C3.5 7.9 7.3 4.6 12 4.6s8.5 3.3 8.5 7.4Z" />
  </svg>
)

/* Штрихи счётчика принимают класс: у счётчика четыре вида, и в двух из них
   на месте штриха стоит уголок. Оба знака лежат в разметке, показывает один
   CSS — выбор вида приходит атрибутом до первой отрисовки. */
export const Minus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>
)
export const Plus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" /></svg>
)

export const Up = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6 12l6-6 6 6" /></svg>
)

export const Grip = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" />
  </svg>
)

export const Pencil = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14.5 6.5l3 3" />
  </svg>
)

export const Dials = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2.2" /><circle cx="10" cy="17" r="2.2" />
  </svg>
)

export const Sides = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="15" rx="3" />
    <path d="M15 4.5v15" /><path d="M17.5 9v6" strokeWidth="3" />
  </svg>
)

export const Chevron = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9.5 6 6 6-6" /></svg>
)

export const Globe = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3.2 9h17.6M3.2 15h17.6M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" strokeLinecap="round" />
  </svg>
)

export const Sun = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
  </svg>
)

export const Moon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 14.2A8.3 8.3 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z" />
  </svg>
)

export const Heart = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13z" />
  </svg>
)

/** The same bag the header carries, outlined — a card that says "add" with a
 *  trolley while the row above it shows a bag is two shops. */
export const Cart = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={BAG_BODY} /><path d={BAG_HANDLE} />
  </svg>
)

/** A plain carton, for the promise that nothing is printed on it. */
export const Box = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 7.6 12 3.6l8.5 4v8.8L12 20.4l-8.5-4z" />
    <path d="M3.5 7.6 12 11.6l8.5-4M12 11.6v8.8" />
  </svg>
)

export const Shield = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v6c0 4.4-3 8.2-7 9-4-.8-7-4.6-7-9V6z" /></svg>
)

/* Три штриха слева — знак «быстро», а не третье колесо: заказчик прислал
   образец с ним же (icon-icons.com, «delivery»). Чужой рисунок был залит
   плашками одной толщины поверх обводки — а здесь, как и у всех знаков
   файла, один и тот же штрих (`svg{stroke-width:1.4}` в base.css), поэтому
   перерисован своим пером, а не вставлен чужим. */
export const Van = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M1 8.5h7M2.5 12h4.5M4.5 15h3.5" />
    <path d="M9 7h7v10H9z" /><path d="M16 10h3l2 3v4h-5z" />
    <path d="M17.1 10.4 18.5 13" />
    <circle cx="12" cy="18" r="1.6" /><circle cx="19" cy="18" r="1.6" />
  </svg>
)

export const Scale = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M8 7H6a3 3 0 0 0 0 6h12a3 3 0 0 1 0 6h-2" /></svg>
)

/** Карта: прямоугольник с магнитной полосой. Тем же пером, что коробка и
 *  стрелка возврата, — три знака в одном ряду обязаны быть одной руки. */
export const Card = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2.8" y="5.5" width="18.4" height="13" rx="2.4" />
    <path d="M2.8 10h18.4" />
  </svg>
)

export const Return = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v4h4" /></svg>
)

/* ── the four icon sets, for the cart and the account ─────────────────────
   `data-icons` on <html> shows one and hides the rest; the CSS lives in
   Header.module.css. Each set is drawn, never borrowed from a font. */

const BAG_BODY = 'M5.6 8h12.8l.9 11.1a1.7 1.7 0 0 1-1.7 1.8H6.4a1.7 1.7 0 0 1-1.7-1.8z'
const BAG_HANDLE = 'M9.2 8.4V6.7a2.8 2.8 0 0 1 5.6 0v1.7'

/** The basket. Empty it is an outline in the row's own ink; with something in
 *  it the bag fills with the shop's one loud colour, so the state reads
 *  before the number next to it does. */
/* Полная корзина звучит янтарём, но КАКИМ — решает не знак, а шапка: у неё
   для этого две ручки, покой и ответ. Стоял инлайновый `color`, и он прибивал
   цвет намертво: под курсором менялась сумма рядом, а сам знак — нет.
   Заказчик увидел это глазом. */
export const Basket = ({ full }: { full: boolean }) => (
  <svg className={full ? 'is-full' : undefined} viewBox="0 0 24 24" aria-hidden="true">
    {/* Нарисованный пакет занимает 6.7–20.9 своей коробки, то есть сидит на
        1.8 ниже её середины. Сдвиг возвращает его на ось: всё, что равняется
        по знаку — счётчик, сумма, соседние иконки, — равняется по тому, что
        видно, а не по пустому полю сверху. */}
    <g transform="translate(0 -0.4)">
      <path d={BAG_BODY} fill={full ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d={BAG_HANDLE} fill="none" stroke="currentColor" />
    </g>
  </svg>
)


export const LabChip = ({ chip, chipLab }: { chip: string; chipLab: string }) => (
  <span className={`${chip} ${chipLab}`}><Check /><T k="Lab" /></span>
)

/* Лист протокола — знак рядом со ссылкой на лабораторный анализ. Загнутый
   угол и галочка внутри: это документ, и он подписан. Так просил заказчик,
   и так же нарисовано в присланном образце. */
export const Doc = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14.2 3H7.4A1.9 1.9 0 0 0 5.5 4.9v14.2A1.9 1.9 0 0 0 7.4 21h9.2a1.9 1.9 0 0 0 1.9-1.9V7.2z" />
    <path d="M14.2 3v4.2h4.3" />
    <path d="m9.4 14.3 1.7 1.7 3.3-3.6" />
  </svg>
)

/* Лист конопли одним лепестком: знак «выращено», а не марка сорта. Стоит
   рядом с «коноп от ЕС» — там, где страница отвечает на «откуда это». */
export const Leaf = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4.8 19.2C4.8 11.4 11.4 4.8 19.2 4.8c0 7.8-6.6 14.4-14.4 14.4z" />
    <path d="M4.8 19.2 14.6 9.4" />
  </svg>
)
