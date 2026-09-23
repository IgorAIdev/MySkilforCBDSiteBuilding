import { createMutationLane } from './commerce/mutation-lane.mjs'

/* Одна полоса записи на корзину вкладки (references/commerce-patterns.md,
   «Цена и корзина»): пока запись идёт, вторая ОТКЛОНЯЕТСЯ — поля формы
   выключены; нет ответа 15 секунд — исход неизвестен, корзина
   перечитывается, сама запись не повторяется. Помощник набора — JavaScript;
   тип его ответа записан здесь один раз. */
export type Lane = {
  readonly pending: boolean
  subscribe(listener: () => void): () => void
  run<T>(action: (signal: AbortSignal) => Promise<T>): Promise<T>
}
export const cartLane = createMutationLane({ timeoutMs: 15_000 }) as Lane
export const isTimeout = (error: unknown): boolean => error instanceof Error && error.name === 'MutationTimeout'
