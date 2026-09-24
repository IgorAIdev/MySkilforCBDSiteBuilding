/**
 * Браузер и обработка снимков — одним местом для всех отрисованных проверок.
 *
 * Заведено по дефекту 22.09.2026 (И240): `check:craft`, `sweep` и `shade`
 * каждый сам искал Playwright и при неудаче шёл по пути
 * `/opt/node…/lib/node_modules/…` — пути одной облачной машины. На Windows
 * и на любом сайте без глобального Playwright проверка падала сообщением
 * `Cannot find module 'C:\opt\node22\…'`, а `sharp` импортировался статически
 * и ронял `check:craft` раньше, чем тот успевал сказать, чего не хватает.
 * Путь из `PLAYWRIGHT=` на Windows тоже не открывался: `import('C:\\…')`
 * требует file-URL.
 *
 * Теперь один порядок поиска и одно человеческое сообщение с командой
 * установки. Выход с кодом 2 — «не проверено», а не «найдено нарушение».
 */

import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

const INSTALL = 'npm i -D playwright sharp && npx playwright install chromium'

/** Путь на диске — через file-URL, имя пакета — как есть. */
const load = (spec) => import(isAbsolute(spec) ? pathToFileURL(spec).href : spec)

const missing = (what, error) => {
  console.error(`\n✗ Нет ${what} — отрисованная проверка НЕ ПРОВЕДЕНА.`)
  console.error(`    Поставить: ${INSTALL}`)
  console.error('    Свой Playwright: PLAYWRIGHT=путь/к/playwright/index.mjs; свой sharp: SHARP=путь/к/sharp/dist/index.mjs; свой Chrome: BROWSER_EXECUTABLE=путь')
  if (error?.message) console.error(`    Причина: ${error.message.split('\n')[0]}`)
  process.exit(2)
}

export async function loadPlaywright() {
  const spec = process.env.PLAYWRIGHT || 'playwright'
  try {
    return await load(spec)
  } catch (error) {
    return missing(`Playwright (${spec})`, error)
  }
}

/* `SHARP=` — как `PLAYWRIGHT=`: свой путь к модулю, когда у проекта своих
   node_modules нет (самопроверка набора прогоняет отрисованную проверку на
   модулях витрины, selftest/craft-fields.test.mjs). */
export async function loadSharp() {
  const spec = process.env.SHARP || 'sharp'
  try {
    return (await load(spec)).default
  } catch (error) {
    return missing(`sharp (${spec})`, error)
  }
}
