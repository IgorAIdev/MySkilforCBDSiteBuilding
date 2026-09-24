import type { Block, Commerce, Content, Source } from './contract.ts'
import { sample } from './sample/catalog.ts'
import { sampleContent } from './sample/content.ts'
import { sampleCommerce } from './sample/commerce.ts'
import { vendureEnv, vendureSource } from './vendure/catalog.ts'
import { vendureCommerce } from './vendure/commerce.ts'

/* Один выбор источника на всю витрину (`SOURCE` в .env):
   · `sample` — образец в lib/ (по умолчанию);
   · `vendure` — торговля из Vendure Shop API: каталог и корзина движка
     (`VENDURE_SHOP_API_URL`, `VENDURE_CHANNEL_TOKEN`), содержание — пока
     образец; заказы ставятся только при `VENDURE_PLACE_ORDERS=on`;
   · `live` (Vendure + Payload) — план 4, содержание из Payload. */
const which = () => process.env.SOURCE ?? 'sample'

let trade: { source: Source; commerce: Commerce; content: Content } | null = null
function vendure() {
  if (!trade) {
    const env = vendureEnv()
    const catalog = vendureSource(env)
    trade = { source: catalog, commerce: vendureCommerce({ ...env, placeOrders: process.env.VENDURE_PLACE_ORDERS === 'on' }), content: standIn(catalog) }
  }
  return trade
}

/* Содержание при торговле из Vendure — образец, пока не подключён Payload.
   Одно место образца знает товары по адресу — «Ходовые» главной, адреса
   товаров образца; у движка таких нет, и блок молча исчез бы. До Payload
   ходовые — первые четыре товара каталога движка по его порядку: подставка
   на время, записанная здесь, а не догадка на странице. */
function standIn(catalog: Source): Content {
  return {
    ...sampleContent,
    async page(lang, slug) {
      const r = await sampleContent.page(lang, slug)
      if (!r.ok || !r.value.blocks.some((b) => b.type === 'featured')) return r
      const top = await catalog.listing(lang, { facets: {}, sort: 'popular', page: null })
      const ids = top.ok ? top.value.items.slice(0, 4).map((c) => c.id) : []
      const blocks: Block[] = r.value.blocks.map((b) => (b.type === 'featured' ? { type: 'featured', title: b.title, ids } : b))
      return { ok: true, value: { ...r.value, blocks } }
    },
  }
}

export function source(): Source {
  if (which() === 'vendure') return vendure().source
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sample
}

export function content(): Content {
  if (which() === 'vendure') return vendure().content
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sampleContent
}

export function commerce(): Commerce {
  if (which() === 'vendure') return vendure().commerce
  if (which() !== 'sample') throw new Error(`SOURCE=${which()} ещё не подключён — план 4`)
  return sampleCommerce
}
