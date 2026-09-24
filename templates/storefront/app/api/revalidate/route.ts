import { timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'

/* Пересборка кэша по слову источника: админка сохранила — вызывает сюда
   `POST` с секретом и тегом. Теги — закрытый список: чужое слово ничего не
   сбрасывает. Профиль `max` — «устарело, пересчитай»: первый запрос ещё
   получает прежнюю страницу и запускает пересчёт, следующий — новую (вид
   меняется через секунды). Не `expire: 0`: он стирает запись страницы, а
   у языков `dynamicParams = false` (app/[lang]/layout.tsx) — и Next,
   не найдя записи, отвечает «не найдено» вместо пересчёта (NoFallbackError,
   поймано на `next start` 24.09.2026; И270). */
const TAGS = ['look', 'catalog'] as const

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? ''
  const given = request.headers.get('x-revalidate-secret') ?? ''
  if (!secret || !same(given, secret)) return Response.json({ ok: false, error: 'secret' }, { status: 401 })
  let tag: unknown = null
  try { tag = ((await request.json()) as { tag?: unknown }).tag } catch { /* тела нет */ }
  const known = TAGS.find((x) => x === tag)
  if (!known) return Response.json({ ok: false, error: 'tag', tags: TAGS }, { status: 400 })
  revalidateTag(known, 'max')
  return Response.json({ ok: true, tag: known })
}
