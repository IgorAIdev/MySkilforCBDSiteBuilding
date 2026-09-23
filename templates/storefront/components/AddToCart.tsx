import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import go from '@/styles/go.module.css'
import s from './ProductView.module.css'
import type { BuyView } from '@/lib/product-view.ts'
import type { Outcome } from '@/lib/cart-ops.ts'
import { CartForm } from './CartForm.tsx'
import { Icon } from './Icon.tsx'

/* Покупка на карте товара. Вариант выбран адресом; нет варианта в наличии
   — кнопка выключена. Почему — подсказка рядом с кнопкой («Alegeți o
   variantă»), приглушённая, а не строка ростом с заголовок над рядом:
   подсказка говорит о кнопке и стоит у неё. */
export function AddToCart({ lang, buy, hint, submit, call }: { lang: string; buy: BuyView; hint: string | null; submit: (form: FormData) => Promise<void>; call: (form: FormData) => Promise<Outcome> }) {
  return (
    <CartForm
      lang={lang} className={s.buy} refresh={false} submit={submit} call={call}
      initial={null} timeout={buy.timeout} failed={buy.failed}
      after={<a className={go.go} href={buy.view.href}>{buy.view.label}<Icon id="arrow-right" /></a>}
    >
      <input type="hidden" name="op" value="add" />
      <input type="hidden" name="variant" value={buy.variant ?? ''} />
      <label className={`${f.field} ${s.qty}`}>
        <span className={f.label}>{buy.quantity}</span>
        <input className={f.box} type="number" name="quantity" min={1} max={99} defaultValue={1} inputMode="numeric" />
      </label>
      <button className={b.btn} data-voice="loud" type="submit" disabled={!buy.variant} aria-describedby={hint ? 'buy-hint' : undefined}>{buy.add}</button>
      {hint ? <p className={s.hint} id="buy-hint" role="status">{hint}</p> : null}
    </CartForm>
  )
}
