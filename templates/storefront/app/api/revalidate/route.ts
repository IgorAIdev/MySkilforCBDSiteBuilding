import { timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'

/* Пересборка кэша по слову источника: админка сохранила — вызывает сюда
   `POST` с секретом и тегом. Теги — закрытый список: чужое слово ничего не
   сбрасывает. `expire: 0` — следующий запрос уже с новыми данными, без
   старой страницы на время пересчёта (так вид меняется через секунды). */
const TAGS = ['look'] as const

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? ''
  const given = request.headers.get('x-revalidate-secret') ?? ''
  if (!secret || !same(given, secret)) return Response.json({ ok: false, error: 'secret' }, { status: 401 })
  let tag: unknown = null
  try { tag = ((await request.json()) as { tag?: unknown }).tag } catch { /* тела нет */ }
  const known = TAGS.find((x) => x === tag)
  if (!known) return Response.json({ ok: false, error: 'tag', tags: TAGS }, { status: 400 })
  revalidateTag(known, { expire: 0 })
  return Response.json({ ok: true, tag: known })
}
