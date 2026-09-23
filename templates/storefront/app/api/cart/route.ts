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
