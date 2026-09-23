'use server'
import { redirect } from 'next/navigation'
import { commerce } from '../source/index.ts'
import { readSession, writeSession } from '../session.ts'
import { readCartOp, runCartOp, outcomeOf, type Outcome } from '../cart-ops.ts'
import { DEFAULT_LANG, isLang, type Lang } from '../locale.ts'
import { hrefFor } from '../href.ts'

async function apply(form: FormData): Promise<{ lang: Lang; code: string; count: number | null }> {
  const raw = String(form.get('lang') ?? '')
  const lang = isLang(raw) ? raw : DEFAULT_LANG
  const before = await readSession()
  const done = await runCartOp(commerce(), before, lang, readCartOp(form))
  if (done.session && done.session !== before) await writeSession(done.session)
  return { lang, code: done.code, count: done.count }
}

/** Без скрипта: запись, затем переход на корзину с кодом исхода в адресе
 *  (POST → переход → GET): обновление страницы не повторяет запись. */
export async function cartSubmit(form: FormData): Promise<void> {
  const { lang, code } = await apply(form)
  redirect(hrefFor(lang, { cart: true, result: code }))
}

/** Со скриптом: запись и исход словами; страница покажет его и перечитает
 *  корзину сама. */
export async function cartCall(form: FormData): Promise<Outcome> {
  const { lang, code, count } = await apply(form)
  return outcomeOf(lang, code, count) ?? { kind: 'error', code, message: '', count }
}
