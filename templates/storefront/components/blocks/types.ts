import type { Lang } from '@/lib/locale.ts'
import type { Collection } from '@/lib/source/contract.ts'
import type { ShelfCard } from '@/lib/view.ts'
import type { MethodView } from '@/lib/checkout-view.ts'
import type { PledgesView } from '@/lib/pledges.ts'
import type { Air, HomeVariant } from '@/lib/homes.ts'

/** Доставка для блока главной: способы — тем же видом, что выбор на
 *  оформлении (`deliveryView`, И95), и адрес страницы условий доставки,
 *  если она есть. Собирает страница; источник молчит — способов нет. */
export type DeliveryCtx = { methods: MethodView[]; terms: string | null }
/** `home` — вариант главной из вида (lib/homes.ts): блок раскладывается по
 *  нему. `pledges` — обещания покупки из данных магазина (lib/pledges.ts);
 *  их ставит вариант, которому они нужны у первого экрана. */
export type BlockCtx = { lang: Lang; home: HomeVariant; collections: Collection[]; cards: Record<string, ShelfCard>; delivery: DeliveryCtx; pledges: PledgesView }
/** Место блока на главной: воздух над ним — роль примитива `section`
 *  (`data-air`); null — воздух раздела. */
export type Place = { air: Air | null }
