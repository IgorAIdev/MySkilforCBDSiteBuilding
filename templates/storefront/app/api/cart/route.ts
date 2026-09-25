import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { DEFAULT_LANG, isLang } from '@/lib/locale.ts'
import { money } from '@/lib/money.ts'

/* Счётчик шапки. Личное не кэшируется нигде, а страницы каталога остаются
   общими и статическими: счётчик приходит отдельным запросом, а не делает
   динамическим каждый адрес магазина. Источник молчит — `count: null`, и
   шапка показывает корзину без числа, а не «0».

   Сумма — готовой строкой в записи языка страницы (`?lang=`): деньги
   считает и пишет страница, не компонент (И430; сумма у корзины — вид
   `--cart-meta: sum`, шапка cbdin.bg). Сумма — товары без доставки: выбор
   доставки на оформлении её в шапке не двигает. Пустая корзина — без суммы. */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get('lang') ?? ''
  const lang = isLang(asked) ? asked : DEFAULT_LANG
  const r = await commerce().checkout(await readSession(), lang)
  const cart = r.ok ? r.value?.cart ?? null : null
  const count = r.ok ? (cart?.quantity ?? 0) : null
  const sum = cart && cart.quantity > 0 ? money(cart.subtotal, lang) : null
  return Response.json({ count, sum }, { headers: { 'Cache-Control': 'private, no-store' } })
}
