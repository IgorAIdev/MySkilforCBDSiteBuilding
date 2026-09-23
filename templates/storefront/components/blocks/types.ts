import type { Lang } from '@/lib/locale.ts'
import type { Collection } from '@/lib/source/contract.ts'
import type { ShelfCard } from '@/lib/view.ts'

export type BlockCtx = { lang: Lang; collections: Collection[]; cards: Record<string, ShelfCard> }
