import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import go from '@/styles/go.module.css'
import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { BuyView } from '@/lib/product-view.ts'
import type { Outcome } from '@/lib/cart-ops.ts'
import { CartForm } from './CartForm.tsx'
import { Icon } from './Icon.tsx'

/* Покупка на карте товара — одна строка: количество и кнопка ростом крупного
   органа, кнопка забирает остаток строки и называет цену выбранного варианта
   («Add to cart · €39.90», строку собирает вид). Варианта нет — кнопка
   выключена и говорит одно действие; почему — подсказка под строкой
   («Choose an option»), приглушённая: она говорит о кнопке и стоит у неё.
   Подпись количества — для чтения вслух: число рядом с кнопкой понятно без
   слова, а видимое слово над полем сдвигало строку. */
export function AddToCart({ lang, buy, hint, submit, call }: { lang: string; buy: BuyView; hint: string | null; submit: (form: FormData) => Promise<void>; call: (form: FormData) => Promise<Outcome> }) {
  return (
    <CartForm
      lang={lang} className={s.buy} refresh={false} submit={submit} call={call}
      initial={null} timeout={buy.timeout} failed={buy.failed}
      after={<a className={go.go} href={buy.view.href}>{buy.view.label}<Icon id="arrow-right" /></a>}
    >
      <input type="hidden" name="op" value="add" />
      <input type="hidden" name="variant" value={buy.variant ?? ''} />
      <label className={s.qty}>
        <span className={p.said}>{buy.quantity}</span>
        <input className={`${f.box} ${s.count}`} type="number" name="quantity" min={1} max={99} defaultValue={1} inputMode="numeric" />
      </label>
      <button className={`${b.btn} ${s.add}`} data-voice="loud" data-size="lg" type="submit" disabled={!buy.variant} aria-describedby={hint ? 'buy-hint' : undefined}>{buy.add}</button>
      {hint ? <p className={s.hint} id="buy-hint" role="status">{hint}</p> : null}
    </CartForm>
  )
}
