/* Адреса панели вида — за одним входом сайта app/look-panel/[...path]
   (PANEL.md, «Где что лежит»). Сайт их не знает и не ввозит; вход открыт,
   только пока LOOK_PICKER=on.

     GET    /look-panel/look.js, look.css, choice.mjs, catalog.json, engine/* — сама панель
     GET    /look-panel/state    опубликованные и черновые имена вариантов и краски палитры
     POST   /look-panel/preview  включить черновой режим (видит только этот браузер)
     DELETE /look-panel/preview  выключить: снова опубликованный вид
     POST   /look-panel/guard    своя палитра → с какими вариантами она не носится
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
import { lookCss, type Slots } from '@/lib/look-values.ts'
import { DEFAULT_LANG, LOCALES } from '@/lib/locale.ts'
import { acceptLook, problems, type Facts } from '@/lib/look-rule.ts'
import type { LookFont } from '@/lib/source/contract.ts'
import { CUSTOM, clashes, compose, fieldsOf, paletteChecks, paletteVars, validPaints, valuesOf } from '../ui/choice.mjs'
import { fetchFonts } from '../scripts/fonts.mjs'
import { pairsOf } from '../scripts/pairs.mjs'

const ROOT = process.cwd()
const UI = join(ROOT, 'look-panel/ui')
const SAMPLE = join(ROOT, 'lib/source/sample')
const FILES: Record<string, string> = {
  'look.js': 'text/javascript; charset=utf-8',
  'look.css': 'text/css; charset=utf-8',
  'choice.mjs': 'text/javascript; charset=utf-8',
  'catalog.json': 'application/json; charset=utf-8',
  'engine/palette.mjs': 'text/javascript; charset=utf-8',
  'engine/thresholds.mjs': 'text/javascript; charset=utf-8',
  'engine/palette-profile.json': 'application/json; charset=utf-8',
}
type Pair = { x: { field: string; id: string }; y: { field: string; id: string }; why: string }
type Option = { id: string; vars?: Record<string, string>; fonts?: { family: string; weights: number[] }[] }
type Catalog = { defaults: Record<string, string>; groups: Record<string, Option[]>; axes: { field: string; name: string }[]; pairs: Pair[]; steps: Record<string, Record<string, string>> }
type Intent = { brand: string; paper: string; tint: string; inkTowardBrand: boolean }
type Paints = { name?: string; light: Record<string, string>; dark: Record<string, string>; intent?: Intent }
/** Намерение строителя — метаданные рядом с красками: только свои поля. */
const intentOf = (x: unknown): Intent | undefined => {
  const r = x && typeof x === 'object' ? (x as Record<string, unknown>) : null
  return r && typeof r.brand === 'string' && /^#[0-9a-f]{6}$/i.test(r.brand) && ['warm', 'neutral', 'cool'].includes(r.paper as string) && ['none', 'light'].includes(r.tint as string)
    ? { brand: r.brand, paper: r.paper as string, tint: r.tint as string, inkTowardBrand: r.inkTowardBrand === true } : undefined
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
const catalog = (): Catalog => JSON.parse(readFileSync(join(UI, 'catalog.json'), 'utf8')) as Catalog
const stateOf = (file: string): { names: Record<string, string> | null; paints: Paints | null } => {
  try {
    const raw = JSON.parse(readFileSync(join(SAMPLE, file), 'utf8')) as { names?: Record<string, string>; paints?: Paints }
    return { names: raw.names ?? null, paints: validPaints(raw.paints) ? (raw.paints as Paints) : null }
  } catch { return { names: null, paints: null } }
}
const NAME = /^[\p{L}\p{N} .+-]{1,40}$/u
/** Имена из тела запроса — только поля выбора и только варианты каталога;
 *  своя палитра — только с тремя красками на тему. */
function names(body: unknown, cat: Catalog): { chosen: Record<string, string>; paints: Paints | null } | string {
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const given = validPaints(raw.paints) ? (raw.paints as Paints) : null
  const three = (t: Record<string, string>) => ({ paper: t.paper, ink: t.ink, accent: t.accent })
  const paints = given ? { name: given.name, light: three(given.light), dark: three(given.dark), intent: intentOf(given.intent) } : null
  if (paints && paints.name !== undefined && (typeof paints.name !== 'string' || !NAME.test(paints.name))) return 'palette: the name takes letters, digits, spaces and . + -'
  const chosen: Record<string, string> = {}
  for (const f of fieldsOf(cat)) {
    const v = raw[f] ?? cat.defaults[f]
    const own = f === 'palette' && v === CUSTOM && paints
    if (typeof v !== 'string' || (!own && !cat.groups[f]?.some((o) => o.id === v))) return `${f}: «${String(v)}» is not in the catalog`
    chosen[f] = v
  }
  return { chosen, paints: chosen.palette === CUSTOM ? paints : null }
}
const base = () => Object.fromEntries(Object.entries(SLOTS.slots as Slots).map(([k, s]) => [k, s.value]))
/** Своя палитра против вариантов остальных групп — тем же правилом сайта,
 *  что пары каталога (scripts/pairs.mjs). */
const customPairs = (paints: Paints, cat: Catalog): Pair[] => pairsOf({
  groups: { ...cat.groups, palette: [{ id: CUSTOM, vars: paletteVars(paints) }] }, fields: valuesOf(cat), base: base(),
  facts: SLOTS.facts as Facts, problems, only: 'palette',
}) as Pair[]
/** Вид значениями для имён: собран, шрифты скачаны, принят сайтом без потерь. */
async function build(chosen: Record<string, string>, paints: Paints | null, cat: Catalog) {
  if (paints) {
    const measured = paletteChecks(paints, cat.steps)
    if (!measured.ok) return { error: `palette: ${[...measured.rows.filter((r: { pass: boolean }) => !r.pass), ...measured.extra].map((r: { label: string; mode: string }) => `${r.label} (${r.mode})`).join('; ')}` }
  }
  const bad: Pair[] = clashes(chosen, paints ? [...cat.pairs, ...customPairs(paints, cat)] : cat.pairs)
  if (bad.length) return { error: bad.map((p) => `${p.x.field} «${p.x.id}» with ${p.y.field} «${p.y.id}»: ${p.why}`).join('; ') }
  const composed = compose(chosen, cat, paints)
  const look = { ...composed.look, fonts: (await fetchFonts(composed.need, join(ROOT, 'public/fonts'))) as LookFont[] }
  const { notes } = acceptLook(look, SLOTS.slots as Slots, SLOTS.facts as Facts)
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
  const [head = ''] = path
  const file = path.join('/')
  const method = request.method
  if (method === 'GET' && Object.hasOwn(FILES, file)) {
    return new Response(readFileSync(join(UI, file)), { headers: { 'content-type': FILES[file], 'cache-control': 'no-store' } })
  }
  if (method === 'GET' && head === 'state') {
    const previewing = (await draftMode()).isEnabled
    const published = stateOf('look.json')
    const draft = existsSync(join(SAMPLE, 'look.draft.json')) ? stateOf('look.draft.json') : { names: null, paints: null }
    return json({ published: published.names, publishedPaints: published.paints, draft: draft.names, draftPaints: draft.paints, previewing })
  }
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403)
  if (head === 'preview' && method === 'POST') { (await draftMode()).enable(); return json({ ok: true }) }
  if (head === 'preview' && method === 'DELETE') { (await draftMode()).disable(); return json({ ok: true }) }
  if (head === 'guard' && method === 'POST') {
    const body = (await request.json().catch(() => null)) as { paints?: unknown } | null
    if (!validPaints(body?.paints)) return json({ ok: false, error: 'paints: three #RRGGBB paints per theme' }, 400)
    return json({ ok: true, pairs: customPairs(body!.paints as Paints, catalog()) })
  }
  if ((head === 'draft' || head === 'publish') && method === 'POST') {
    const cat = catalog()
    const asked = names(await request.json().catch(() => null), cat)
    if (typeof asked === 'string') return json({ ok: false, error: asked }, 400)
    const built = await build(asked.chosen, asked.paints, cat).catch((e: Error) => ({ error: e.message }))
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
    const css = lookCss(acceptLook(built.look, SLOTS.slots as Slots, SLOTS.facts as Facts).look)
    return json({ ok: true, css, langs: LOCALES, main: DEFAULT_LANG, verdict: verdict.out.trim().split('\n').slice(-3) })
  }
  return json({ ok: false, error: 'not found' }, 404)
}
