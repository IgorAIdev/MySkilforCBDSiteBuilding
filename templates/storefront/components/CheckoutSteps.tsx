import s from './Checkout.module.css'
import type { StepsView } from '@/lib/checkout-view.ts'

/* Шаги: пройденные — ссылками назад, текущий — `aria-current="step"`,
   будущие — текстом: к ним не пускает сервер. */
export function CheckoutSteps({ steps }: { steps: StepsView }) {
  return (
    <nav aria-label={steps.label}>
      <ol className={s.steps}>
        {steps.items.map((i, n) => (
          <li key={i.name} className={s.stepItem} aria-current={i.current ? 'step' : undefined}>
            <span className={s.stepNo} aria-hidden="true">{n + 1}</span>
            {i.href ? <a href={i.href}>{i.name}</a> : <span>{i.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
