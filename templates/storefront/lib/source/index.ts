import type { Commerce, Content, Source } from './contract.ts'
import { sample } from './sample/catalog.ts'
import { sampleContent } from './sample/content.ts'
import { sampleCommerce } from './sample/commerce.ts'

/* Один выбор источника на всю витрину. `live` (Vendure + Payload) — план 4. */
const which = () => process.env.SOURCE ?? 'sample'

export function source(): Source {
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sample
}

export function content(): Content {
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sampleContent
}

export function commerce(): Commerce {
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sampleCommerce
}
