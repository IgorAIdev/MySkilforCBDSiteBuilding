import type { MetadataRoute } from 'next'
import { absolute } from '@/lib/seo.ts'
import { CATALOG_IS_REAL } from '@/lib/flags.ts'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: CATALOG_IS_REAL ? { userAgent: '*', allow: '/' } : { userAgent: '*', disallow: '/' },
    sitemap: absolute('/sitemap.xml'),
  }
}
