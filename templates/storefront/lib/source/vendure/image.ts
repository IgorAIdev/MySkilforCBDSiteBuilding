import type { Image } from '../contract.ts'
import { assetSrcSet, assetUrl } from './core/asset.mjs'

export type Asset = { preview: string; width?: number; height?: number; focalPoint?: { x: number; y: number } | null }

/** Ширины, которые витрина просит у сервера снимков движка: миниатюра
 *  строки, карточка на телефоне, карточка и кадр на широком, кадр на плотном
 *  экране. Какую взять, решает браузер по месту (`sizes`, lib/shot.ts). */
const WIDTHS = [160, 400, 800, 1200]
/** Ширины ряда не шире оригинала; оригинал уже ряда — он сам последней. */
const widthsUpTo = (original: number): number[] => {
  const fit = WIDTHS.filter((w) => w <= original)
  return original < WIDTHS[WIDTHS.length - 1] && !fit.includes(original) ? [...fit, original] : fit
}

/** Снимок — сервером снимков движка (asset.mjs), без второго оптимизатора
 *  (references/vendure.md, «Картинки»): `src` — ширина `base`, `srcset` — все
 *  ширины меньше оригинала и сам оригинал, та же пропорция. Шире оригинала
 *  не просится: сервер растягивает снимок, и растянутый весит как большой, а
 *  резкости не прибавляет. Размеры `width`/`height` — отданного снимка: по
 *  ним место занято до загрузки. Один на каталог и корзину: до 25.09.2026
 *  каждый файл собирал снимок сам и отдавал одну ширину 800 — `check:craft`
 *  нашёл 395 снимков вдвое крупнее места, и у части из них оригинал был в
 *  140 пикселей. */
export function assetImage(asset: Asset, alt: string, base: number): Image {
  const ratio = asset.width && asset.height ? asset.height / asset.width : 1
  const top = asset.width ? Math.min(base, asset.width) : base
  const widths = asset.width ? widthsUpTo(asset.width) : WIDTHS
  return {
    src: assetUrl(asset.preview, { w: top, format: 'webp' }), alt,
    width: top, height: Math.round(top * ratio),
    srcset: assetSrcSet(asset.preview, widths, { format: 'webp' }),
  }
}
