// look-panel:file — весь файл принадлежит панели «Look»; `npm run look:remove` его удаляет.
import { draftMode } from 'next/headers'

/* Черновой режим Next для просмотра вида панелью «Look» (public/look/): в
   нём страница рисуется по запросу и берёт выбранное из cookie `look`
   (lib/look.ts), остальные гости видят опубликованное. Только пока
   LOOK_PICKER=on; иначе адреса нет. */
const off = () => process.env.LOOK_PICKER !== 'on'

export async function POST() {
  if (off()) return new Response(null, { status: 404 })
  ;(await draftMode()).enable()
  return Response.json({ ok: true, preview: true })
}

export async function DELETE() {
  if (off()) return new Response(null, { status: 404 })
  ;(await draftMode()).disable()
  return Response.json({ ok: true, preview: false })
}
