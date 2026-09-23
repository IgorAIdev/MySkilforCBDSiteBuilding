import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { DEFAULT_LANG, LANG_HEADER, isLang, type Lang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'
import { shellData } from '@/lib/shell.ts'
import { Shell } from '@/components/Shell.tsx'
import { Missing } from '@/components/StateScreen.tsx'

/* Адрес, которому в дереве маршрутов нет места (/ro/nu-exista, /hu/a/b,
   /xx/yy), — своя страница сайта с кодом 404 и на языке адреса, а не
   встроенная английская Next. Макета языка у неё нет: макет сам в дереве,
   а дерево не совпало; язык передаёт proxy.ts заголовком (И257). */
const langOfRequest = async (): Promise<Lang> => {
  const asked = (await headers()).get(LANG_HEADER) ?? ''
  return isLang(asked) ? asked : DEFAULT_LANG
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await langOfRequest(), 'notFound.title') }
}

export default async function GlobalNotFound() {
  const lang = await langOfRequest()
  return <Shell lang={lang} data={await shellData(lang)}><Missing lang={lang} /></Shell>
}
