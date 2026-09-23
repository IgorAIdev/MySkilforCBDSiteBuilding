import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Cart.module.css'
import type { CartPageView } from '@/lib/cart-view.ts'
import type { Outcome } from '@/lib/cart-ops.ts'
import { CartForm } from './CartForm.tsx'
import { OrderTotals } from './OrderTotals.tsx'
import { StateScreen } from './StateScreen.tsx'
import { Icon } from './Icon.tsx'

type Actions = { submit: (form: FormData) => Promise<void>; call: (form: FormData) => Promise<Outcome> }

/* Корзина: строки товара слева, итог и переход к оформлению — в колонке,
   что едет рядом (pinned). Строка показывает товар, а не сводку: снимок,
   имя со ссылкой на вариант, цену за штуку, количество, сумму (И49, И63). */
export function CartView({ lang, view, submit, call }: { lang: string; view: CartPageView } & Actions) {
  const msgs = { timeout: view.messages.timeout, failed: view.messages.failed }
  if (!view.lines.length) {
    return (
      <main id="main" className={`${p.wrap} ${p.section}`}>
        {view.notice ? <p className={p.muted} role="status">{view.notice.message}</p> : null}
        <StateScreen level={1} kind="empty" title={view.empty.title} step={view.empty.step} href={view.empty.href} />
      </main>
    )
  }
  return (
    <main id="main" className={`${p.wrap} ${p.section}`}>
      <div className={p.pagehead}><h1>{view.title}</h1><p className={p.muted}>{view.count}</p></div>
      <div className={p.sidebar}>
        <CartForm lang={lang} submit={submit} call={call} initial={view.notice} {...msgs}>
          <ul className={s.list}>
            {view.lines.map((l) => (
              <li key={l.id} className={s.line}>
                <div className={`${p.frame} ${s.thumb}`}><img src={l.image.src} alt="" width={l.image.width} height={l.image.height} loading="lazy" /></div>
                <div className={s.what}>
                  <a className={s.name} href={l.href}>{l.name}</a>
                  {l.options ? <p className={p.muted}>{l.options}</p> : null}
                  <p className={p.muted}>{l.unit}</p>
                </div>
                <div className={s.qty} role="group" aria-label={l.labels.quantity}>
                  <button className={b.btn} data-size="sm" type="submit" name="op" value={l.less ?? ''} disabled={!l.less} aria-label={l.labels.less}><Icon id="minus" /></button>
                  <output className={s.count}>{l.quantity}</output>
                  <button className={b.btn} data-size="sm" type="submit" name="op" value={l.more ?? ''} disabled={!l.more} aria-label={l.labels.more}><Icon id="plus" /></button>
                </div>
                <p className={s.sum}>{l.total}</p>
                <button className={b.btn} data-size="sm" type="submit" name="op" value={l.remove} aria-label={l.labels.remove}><Icon id="trash" /></button>
              </li>
            ))}
          </ul>
        </CartForm>
        <aside className={p.aside}>
          <div className={`${p.stack} ${p.pinned} ${s.summary}`}>
            <h2 className={s.summaryTitle}>{view.summary}</h2>
            <OrderTotals totals={view.totals} />
            <a className={b.btn} data-voice="loud" data-wide href={view.checkout.href}>{view.checkout.label}</a>
            <CartForm lang={lang} className={p.stack} submit={submit} call={call} initial={view.couponNotice} {...msgs}>
              <label className={f.field}>
                <span className={f.label}>{view.coupon.label}</span>
                <input className={f.box} name="code" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
              </label>
              <button className={b.btn} type="submit" name="op" value="coupon">{view.coupon.apply}</button>
              {view.coupon.applied.map((c) => (
                <button key={c.code} className={b.btn} data-size="sm" type="submit" name="op" value={c.op} aria-label={c.label}><Icon id="x" />{c.code}</button>
              ))}
            </CartForm>
          </div>
        </aside>
      </div>
    </main>
  )
}
