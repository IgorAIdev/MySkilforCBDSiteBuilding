/**
 * Команды набора — один список на всех.
 *
 * Заведено по счёту: список жил в двух местах — в сборщике (`tools/kit.mjs`)
 * и в ставщике (`tools/kit/install.mjs`), — и они разошлись ровно так, как
 * расходятся две копии. Одна сессия дописала в набор линтер и тесты, другая
 * — проверку разметки и этапы; каждая правила свою копию. После слияния
 * ставщик раскладывал в новый проект файлы линтера, но команды `check:lint`
 * не заводил: проверка приезжала и не запускалась никем.
 *
 * Это тот самый признак заплатки из правил проекта: на вопрос «где это
 * решается?» ответов стало два. Теперь один.
 *
 * В опубликованном наборе он лежит рядом с `install.mjs` и переезжает в
 * проект вместе с ним: `npm run kit` из проекта, где заготовок `tools/kit/`
 * нет, собирает набор заново — и берёт список отсюда.
 */

export const SCRIPTS = {
  images: 'node tools/shrink.mjs',
  typecheck: 'tsc --noEmit',
  'build:site': 'npm run build',
  'check:css': 'node tools/check-css.mjs',
  'check:code': 'node tools/check-code.mjs',
  'check:port': 'node tools/check-port.mjs',
  /* Палитра: выпуск и замер. Команда замера стояла в реестре `checks.mjs`,
     а в проекте её не было ни в скриптах, ни файлом — то есть каждый новый
     сайт получал её в подсказках и не мог запустить (И192). */
  palette: 'node tools/palette-css.mjs',
  'check:palette': 'node tools/check-palette.mjs && node tools/palette-css.mjs --check',
  /* Шкалы: выпуск, замер и стенд. То же устройство, что у палитры, и по той
     же причине (И202): числа шкал стояли в tokens.css набранными рукой, а
     формула к ним — словами в комментарии рядом. */
  /* Лист знаков (И249): рисунок каждого знака — в одном месте, выпуск и сверка
     тем же устройством, что у палитры и шкал. */
  icons: 'node tools/icons.mjs',
  /* Каталог стилей кнопки (И252): стиль — роли одной кнопки основы; выпуск
     только после замера на палитре сайта, стенд — выбор глазами. */
  buttons: 'node tools/buttons.mjs',
  'check:buttons': 'node tools/buttons.mjs --check',
  'button:stand': 'node tools/button-stand.mjs',
  'check:icons': 'node tools/icons.mjs --check',
  scale: 'node tools/scale-css.mjs',
  'check:scale': 'node tools/check-scale.mjs && node tools/scale-css.mjs --check',
  'scale:stand': 'node tools/scale-stand.mjs',
  'control:stand': 'node tools/control-stand.mjs',
  'layout:stand': 'node tools/layout-stand.mjs',
  'shape:stand': 'node tools/shape-stand.mjs',
  'mood:stand': 'node tools/mood-stand.mjs',
  'face:stand': 'node tools/face-stand.mjs',
  'palette:stand': 'node tools/palette-stand.mjs',
  'palette:sheet': 'node tools/palette-sheet.mjs',
  'palette:builder': 'node tools/palette-builder.mjs',
  'pro:check': 'node tools/pro-check.mjs',
  'check:all': 'node tools/check-all.mjs',
  checks: 'node tools/checks.mjs',
  'check:lint': 'node tools/check-lint.mjs',
  /* Механическая половина impeccable храповиком (И271): правило «Дизайн
     делается дизайнерскими скиллами», семьи — tools/design-families.mjs. */
  'check:design': 'node tools/check-design.mjs',
  lint: 'oxlint app components lib',
  test: 'node tools/check-test.mjs',
  'check:craft': 'node tools/check-craft.mjs',
  /* Детектор impeccable по отрисованной странице (И310): вендоренная
     браузерная сборка, закреплённая хешем; семьи — tools/detect-families.mjs. */
  'check:detect': 'node tools/check-detect.mjs',
  'check:open': 'node tools/check-open.mjs',
  'check:urls': 'node tools/check-urls.mjs',
  'check:seo': 'node tools/check-seo.mjs',
  'check:rules': 'node tools/check-rules.mjs',
  'check:stage': 'node tools/stage.mjs --gate',
  stage: 'node tools/stage.mjs',
  serve: 'node tools/serve.mjs',
  sweep: 'node tools/sweep.mjs',
  shade: 'node tools/shade.mjs',
  kit: 'node tools/kit.mjs',
}
