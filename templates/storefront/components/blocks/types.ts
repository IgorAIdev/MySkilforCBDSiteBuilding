import type { Lang } from '@/lib/locale.ts'
import type { Collection } from '@/lib/source/contract.ts'
import type { ShelfCard } from '@/lib/view.ts'
import type { MethodView } from '@/lib/checkout-view.ts'

/** Доставка для блока главной: способы — тем же видом, что выбор на
 *  оформлении (`deliveryView`, И95), и адрес страницы условий доставки,
 *  если она есть. Собирает страница; источник молчит — способов нет. */
export type DeliveryCtx = { methods: MethodView[]; terms: string | null }
export type BlockCtx = { lang: Lang; collections: Collection[]; cards: Record<string, ShelfCard>; delivery: DeliveryCtx }
