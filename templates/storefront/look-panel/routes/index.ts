/* Адреса панели вида — за одним входом сайта app/look-panel/[...path]
   (PANEL.md, «Где что лежит»). Сайт их не знает и не ввозит; вход открыт,
   только пока LOOK_PICKER=on.

     GET    /look-panel/look.js, look.css, choice.mjs, catalog.json — сама панель
     GET    /look-panel/state    опубликованные и черновые имена вариантов
     POST   /look-panel/preview  включить черновой режим (видит только этот браузер)
     DELETE /look-panel/preview  выключить: снова опубликованный вид
     POST   /look-panel/draft    выбор → черновик вида (значения, шрифты скачаны)
     POST   /look-panel/publish  проверить черновик (check:choice) → опубликовать

   Черновик и опубликованный вид — файлы источника образца
   (lib/source/sample/look.draft.json и look.json); у Payload — черновая и
   опубликованная версия global «look» (план 4). */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { draftMode } from 'next/headers'
import { revalidateTag } from 'next/cache'
import SLOTS from '@/lib/look-slots.json' with { type: 'json' }
import { HEADERS } from '@/lib/headers.ts'
import { lookCss, type Slots } from '@/lib/look-values.ts'
import { DEFAULT_LANG, LOCALES } from '@/lib/locale.ts'
import { acceptLook, type Facts } from '@/lib/look-rule.ts'
import type { LookFont } from '@/lib/source/contract.ts'
import { FIELDS, clashes, compose } from '../ui/choice.mjs'
import { fetchFonts } from '../scripts/fonts.mjs'

const ROOT = process.cwd()
const UI = join(ROOT, 'look-panel/ui')
const SAMPLE = join(ROOT, 'lib/source/sample')
const FILES: Record<string, string> = {
  'look.js': 'text/javascript; charset=utf-8',
  'look.css': 'text/css; charset=utf-8',
  'choice.mjs': 'text/javascript; charset=utf-8',
  'catalog.json': 'application/json; charset=utf-8',
}
type Pair = { x: { field: string; id: string }; y: { field: string; id: string }; why: string }
type Catalog = { defaults: Record<string, string>; groups: Record<string, { id: string }[]>; pairs: Pair[] }

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
const catalog = (): Catalog => JSON.parse(readFileSync(join(UI, 'catalog.json'), 'utf8')) as Catalog
const namesOf = (file: string): Record<string, string> | null => {
  try { return (JSON.parse(readFileSync(join(SAMPLE, file), 'utf8')) as { names?: Record<string, string> }).names ?? null } catch { return null }
}
/** Имена из тела запроса — только поля выбора и только варианты каталога. */
function names(body: unknown, cat: Catalog): Record<string, string> | string {
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const out: Record<string, string> = {}
  for (const f of FIELDS) {
    const v = raw[f] ?? cat.defaults[f]
    if (typeof v !== 'string' || !cat.groups[f]?.some((o) => o.id === v)) return `${f}: «${String(v)}» is not in the catalog`
    out[f] = v
  }
  return out
}
/** Вид значениями для имён: собран, шрифты скачаны, принят сайтом без потерь. */
async function build(chosen: Record<string, string>, cat: Catalog) {
  const bad: Pair[] = clashes(chosen, cat.pairs)
  if (bad.length) return { error: bad.map((p) => `${p.x.field} «${p.x.id}» with ${p.y.field} «${p.y.id}»: ${p.why}`).join('; ') }
  const composed = compose(chosen, cat)
  const look = { ...composed.look, fonts: (await fetchFonts(composed.need, join(ROOT, 'public/fonts'))) as LookFont[] }
  const { notes } = acceptLook(look, SLOTS.slots as Slots, SLOTS.facts as Facts, HEADERS)
  if (notes.length) return { error: notes.map((n) => `${n.what} ${n.why}`).join('; ') }
  return { look }
}
/** Та же страница, а не чужой сайт: запросы, меняющие вид, — только со своего адреса. */
const sameOrigin = (request: Request) => {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}
/** Проверка выбранного — `check:choice` на черновике, отдельным процессом:
 *  он ходит в этот же сервер, и ждать его надо, не занимая сервер. */
const checkDraft = (site: string) => new Promise<{ ok: boolean; out: string }>((done) => {
  const run = spawn(process.execPath, [join(ROOT, 'look-panel/scripts/check-choice.mjs'), '--draft'], { cwd: ROOT, env: { ...process.env, SITE: site } })
  let out = ''
  run.stdout.on('data', (d: Buffer) => { out += d.toString() })
  run.stderr.on('data', (d: Buffer) => { out += d.toString() })
  run.on('close', (code) => done({ ok: code === 0, out }))
})

export async function handle(request: Request, path: string[]): Promise<Response> {
  const [head = '', ...rest] = path
  const method = request.method
  if (method === 'GET' && !rest.length && Object.hasOwn(FILES, head)) {
    return new Response(readFileSync(join(UI, head)), { headers: { 'content-type': FILES[head], 'cache-control': 'no-store' } })
  }
  if (method === 'GET' && head === 'state') {
    const previewing = (await draftMode()).isEnabled
    return json({ published: namesOf('look.json'), draft: existsSync(join(SAMPLE, 'look.draft.json')) ? namesOf('look.draft.json') : null, previewing })
  }
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403)
  if (head === 'preview' && method === 'POST') { (await draftMode()).enable(); return json({ ok: true }) }
  if (head === 'preview' && method === 'DELETE') { (await draftMode()).disable(); return json({ ok: true }) }
  if ((head === 'draft' || head === 'publish') && method === 'POST') {
    const cat = catalog()
    const chosen = names(await request.json().catch(() => null), cat)
    if (typeof chosen === 'string') return json({ ok: false, error: chosen }, 400)
    const built = await build(chosen, cat).catch((e: Error) => ({ error: e.message }))
    if ('error' in built) return json({ ok: false, error: built.error }, 422)
    writeFileSync(join(SAMPLE, 'look.draft.json'), JSON.stringify(built.look, null, 2) + '\n')
    ;(await draftMode()).enable()
    if (head === 'draft') return json({ ok: true })
    const verdict = await checkDraft(new URL(request.url).origin)
    if (!verdict.ok) return json({ ok: false, error: 'check', verdict: verdict.out.trim().split('\n').slice(-12) }, 409)
    writeFileSync(join(SAMPLE, 'look.json'), JSON.stringify(built.look, null, 2) + '\n')
    /* «Устарело, пересчитай» (app/api/revalidate/route.ts): сброс
       применяется, когда этот ответ ушёл, — поэтому страницы досчитывает
       панель: ей отдаётся блок вида, которого ждать на главной. */
    revalidateTag('look', 'max')
    const css = lookCss(acceptLook(built.look, SLOTS.slots as Slots, SLOTS.facts as Facts, HEADERS).look)
    return json({ ok: true, css, langs: LOCALES, main: DEFAULT_LANG, verdict: verdict.out.trim().split('\n').slice(-3) })
  }
  return json({ ok: false, error: 'not found' }, 404)
}
