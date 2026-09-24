import s from './Cart.module.css'
import type { PledgesView } from '@/lib/pledges.ts'
import { Icon } from './Icon.tsx'

/* Обещания у кнопки заказа — строки из данных магазина (lib/pledges.ts):
   оплата при получении, доставка «от», срок возврата. Стоят под кнопкой,
   тихим кеглем сноски: они отвечают на «а если…», которое останавливает
   руку над кнопкой (разбор 24.09.2026, K4), и не спорят с ней. Нет данных —
   нет строк, нет и списка. */
export function Pledges({ pledges }: { pledges: PledgesView }) {
  if (!pledges.items.length) return null
  return (
    <ul className={s.pledges} aria-label={pledges.label}>
      {pledges.items.map((i) => <li key={i.icon}><Icon id={i.icon} />{i.text}</li>)}
    </ul>
  )
}
