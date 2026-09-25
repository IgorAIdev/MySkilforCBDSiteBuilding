// Original SiteBuildingSkill helper for Vendure AssetServerPlugin URLs.
// The asset server resizes on request: w, h, mode (crop|resize), format,
// fpx/fpy (focal point 0..1) or a named preset. Build srcset here instead of
// sending Vendure's `preview` through a second optimizer. If the server uses a
// preset-only transform strategy, pass presets — check the target config.

const MODES = new Set(['crop', 'resize'])
const FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif'])
const unit = (n) => typeof n === 'number' && n >= 0 && n <= 1

export function assetUrl(preview, { w, h, mode, format, focalPoint, preset } = {}) {
  let url
  try { url = new URL(preview) } catch { throw new Error('preview must be an absolute asset URL') }
  const size = (n, name) => {
    if (n === undefined) return
    if (!Number.isSafeInteger(n) || n < 1 || n > 4096) throw new RangeError(`${name} must be 1..4096`)
    url.searchParams.set(name, String(n))
  }
  if (preset !== undefined) {
    if (!/^[a-z][a-z0-9_-]*$/i.test(preset)) throw new Error(`Invalid preset ${preset}`)
    url.searchParams.set('preset', preset)
  }
  size(w, 'w')
  size(h, 'h')
  if (mode !== undefined) {
    if (!MODES.has(mode)) throw new Error(`Invalid mode ${mode}`)
    url.searchParams.set('mode', mode)
  }
  if (format !== undefined) {
    if (!FORMATS.has(format)) throw new Error(`Invalid format ${format}`)
    url.searchParams.set('format', format)
  }
  if (focalPoint) {
    if (!unit(focalPoint.x) || !unit(focalPoint.y)) throw new RangeError('focalPoint x/y must be 0..1')
    url.searchParams.set('fpx', String(focalPoint.x))
    url.searchParams.set('fpy', String(focalPoint.y))
  }
  return url.toString()
}

/** `srcset` for one frame: same aspect via h = round(w * ratio) when ratio is given. */
export function assetSrcSet(preview, widths, { ratio, format = 'webp', focalPoint } = {}) {
  if (!Array.isArray(widths) || !widths.length) throw new Error('widths are required')
  const sorted = [...new Set(widths)].sort((a, b) => a - b)
  return sorted.map((w) => {
    const h = ratio ? Math.round(w * ratio) : undefined
    return `${assetUrl(preview, { w, h, mode: ratio ? 'crop' : undefined, format, focalPoint })} ${w}w`
  }).join(', ')
}

/** CSS object-position for the same focal point, so crop and fit agree. */
export const objectPosition = (focalPoint) => (focalPoint && unit(focalPoint.x) && unit(focalPoint.y)
  ? `${Math.round(focalPoint.x * 100)}% ${Math.round(focalPoint.y * 100)}%`
  : '50% 50%')
