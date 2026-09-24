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

/** Остановить показ слайдов перед замером.
 *
 *  Заведено находкой, которая НЕ ПОВТОРИЛАСЬ: полный прогон показал контраст
 *  3.35 у подписи героя на 700, а узкий по той же странице и той же семье —
 *  ноль. Причина не в странице: кадры героя сами сменяются по таймеру, и
 *  замер иногда попадал В СЕРЕДИНУ ПЕРЕХОДА, когда на экране два снимка
 *  сразу и подпись лежит на их смеси. Все четыре снимка замерены по
 *  отдельности и держат 5.76:1 — мерилось не то, что видит покупатель.
 *
 *  Правило общее, не про этот слайдер: ЗАМЕР ИДЁТ ПО НЕПОДВИЖНОЙ СТРАНИЦЕ.
 *  Ожидание конца анимаций этого не даёт — таймер заводит следующую, и
 *  страница не бывает неподвижной никогда. Останавливаем тем же органом,
 *  которым останавливает человек: кнопкой паузы. Путь, который проверка
 *  проходит, — тот самый, что у покупателя.
 *
 *  Кнопки нет — ничего и не делаем: страниц без слайдера большинство.
 *  Одно место на все отрисованные проверки: `check:craft` и детектор
 *  impeccable `check:detect` (И310). */
export async function still(page) {
  await page.evaluate(() => {
    const b = document.querySelector('[data-ctl="run"]')
    if (!b) return
    const before = b.getAttribute('aria-label')
    b.click()
    /* Нажатие не сработало (кнопка уже на паузе) — второго не делаем: оно
       снова запустило бы показ. */
    if (b.getAttribute('aria-label') === before) b.click()
  }).catch(() => {})
}
