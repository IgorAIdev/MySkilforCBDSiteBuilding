import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/* Шрифты вида — свои, с адреса сайта (`/fonts/…`, public/fonts/), а не с
   чужого сервера: страница покупателя не ходит к Google (LG München,
   20.01.2022). Файл, лежавший в public/fonts/ при запуске сервера, отдаёт
   сам Next; файл, положенный туда ПОСЛЕ запуска (опубликован новый вид —
   без сборки), `next start` не видит, и его отдаёт этот адрес. Имя — только
   из букв, цифр и дефисов, другого файла отсюда не достать. */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  if (!/^[a-z0-9-]{1,80}\.woff2$/.test(file)) return new Response(null, { status: 404 })
  try {
    const body = await readFile(join(process.cwd(), 'public/fonts', file))
    return new Response(body, { headers: { 'content-type': 'font/woff2', 'cache-control': 'public, max-age=31536000, immutable' } })
  } catch {
    return new Response(null, { status: 404 })
  }
}
