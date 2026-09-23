import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import STYLES from '../styles/buttons.json' with { type: 'json' }
import PALETTE from '../styles/palette.json' with { type: 'json' }
import { FACES, buttonOptions, lookOn, lookScript, type LookData } from './look.ts'

type Measure = { availability: (styles: object, palettes: object) => { off: object } }

/** Данные панели «Вид» или `null`, если переключатель выключен: тогда нет ни
 *  скрипта, ни шрифтов сверх умолчания, ни панели. Замер кнопок — тот же код,
 *  что выпускает styles/buttons.css (`availability`, tools/buttons.mjs), на
 *  палитре сайта; не прошедший стиль стоит в списке выключенным и говорит,
 *  чем не прошёл.
 *
 *  Замер грузится самим Node с диска, мимо сборщика: инструмент читает свои
 *  файлы рядом с собой (`new URL('…', import.meta.url)` — слепок палитры,
 *  tokens.css), а собранный Next такие ссылки принимает за ресурсы и ломает
 *  (сборка падала «Can't resolve '../styles/tokens.css'»). */
export async function lookData(env: Record<string, string | undefined> = process.env): Promise<LookData | null> {
  if (!lookOn(env)) return null
  const tool = pathToFileURL(join(process.cwd(), 'tools/buttons.mjs')).href
  const { availability } = (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ tool)) as Measure
  const buttons = buttonOptions(STYLES, availability(STYLES, PALETTE).off)
  return { faces: FACES, buttons, script: lookScript(FACES, buttons) }
}
