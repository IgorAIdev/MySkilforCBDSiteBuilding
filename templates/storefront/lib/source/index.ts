import type { Source } from './contract.ts'
import { sample } from './sample/catalog.ts'

/* Один выбор источника на всю витрину. `live` (Vendure + Payload) — план 4. */
const which = () => process.env.SOURCE ?? 'sample'

export function source(): Source {
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sample
}
