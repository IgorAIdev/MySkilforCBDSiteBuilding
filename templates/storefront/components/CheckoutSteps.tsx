import s from './Checkout.module.css'
import type { StepsView } from '@/lib/checkout-view.ts'
import { Icon } from './Icon.tsx'

/* Шаги: пройденные — ссылками назад с галочкой, текущий —
   `aria-current="step"`, будущие — текстом: к ним не пускает сервер.
   Кружки связаны чертой — это путь, а не три пилюли.

   На узкой коробке шагов (шов 560) имена сняты с глаз и остаются для
   чтения вслух: строка из трёх кружков не переносится на два этажа, а имя
   текущего шага стоит прямо под ней заголовком страницы (разбор 24.09.2026,
   O6). */
export function CheckoutSteps({ steps }: { steps: StepsView }) {
  return (
    <nav className={s.stepsNav} aria-label={steps.label}>
      <ol className={s.steps}>
        {steps.items.map((i, n) => {
          const mark = <span className={s.stepNo} aria-hidden="true">{i.done ? <Icon id="check" /> : n + 1}</span>
          const name = <span className={s.stepName}>{i.name}</span>
          return (
            <li key={i.name} className={s.stepItem} aria-current={i.current ? 'step' : undefined} data-done={i.done ? '' : undefined}>
              {i.href ? <a href={i.href}>{mark}{name}</a> : <span className={s.stepHere}>{mark}{name}</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
