/**
 * Конец работы: правило записано или потеряно.
 *
 * Заведено по слову заказчика: «скилл должен быть самосовершенствующимся…
 * правила образовывались в прошлой работе и будут образовываться в будущем,
 * сделай, чтоб ты это постоянно помнил и совершенствовал скилл».
 *
 * «Постоянно помнил» — это и есть задача, и решить её обещанием нельзя.
 * Сессия кончается, следующая читает файлы. Значит помнить должен ФАЙЛ, и
 * вот он: хук смотрит, что за эту работу изменилось, и если тронут сайт, а
 * скилл и реестр правил не тронуты — говорит об этом вслух.
 *
 * Это НАПОМИНАНИЕ, а не запрет, и нарочно: не всякая правка рождает правило.
 * Починка опечатки в тексте, замена снимка, правка данных — не рождают. А
 * дефект, найденный заказчиком глазом, дефект, который пришлось искать по
 * всему дереву, и всякое «оказалось, что устроено неверно» — рождают всегда.
 * Отличить это может только тот, кто правку делал; поэтому хук не судит, а
 * СПРАШИВАЕТ — и спрашивает каждый раз, а не когда я вспомнил.
 *
 * Замок с другой стороны — `tools/check-rules.mjs`: он не даёт завести
 * проверку без правила. Вместе они держат оба конца: проверка без правила
 * краснеет, правка без правила спрашивает.
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const git = (cmd) => {
  try { return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], cwd: ROOT }) }
  catch { return '' }
}

/* Пути git печатает от корня репозитория, а проект может лежать этажом
   ниже (`apps/cbdin/` в монорепозитории). Приводим к путям от корня
   проекта; чужие приложения того же репозитория — не наш сайт. */
const top = git('rev-parse --show-toplevel').trim()
const prefix = top ? relative(top, ROOT.replace(/\/$/, '')) : ''
const own = (f) => {
  if (!prefix) return f
  if (f === prefix || f.startsWith(`${prefix}/`)) return f.slice(prefix.length + 1)
  return null
}

/* Берём и незакоммиченное, и коммиты этой работы: правило записывают в конце,
   а коммит мог уже уехать. База сравнения — общий предок с `main`. */
const dirty = git('status --porcelain').split('\n').filter(Boolean)
  .map((l) => l.slice(3).trim())
const baseRef = git('merge-base HEAD origin/main').trim() || git('merge-base HEAD main').trim()
const committed = baseRef ? git(`diff --name-only ${baseRef}..HEAD`).split('\n').filter(Boolean) : []
const touched = [...new Set([...dirty, ...committed].map(own).filter((f) => f !== null && f !== ''))]

if (!touched.length) process.exit(0)

/* Что считается «тронут сайт»: стили, разметка, код, данные. Документы и
   сам скилл — не сайт, они и есть место для правил. */
const isSite = (f) => /\.(css|tsx|ts)$/.test(f) && !f.startsWith('tools/') && !f.startsWith('docs/')
const isRuleHome = (f) => f.startsWith('.claude/skills/') || f === 'docs/rules.md'
  || f === 'docs/decisions.md' || f === 'docs/open.md' || f === 'CLAUDE.md'
  || f.startsWith('tools/check-') || f.startsWith('tools/css-families') || f.startsWith('tools/code-families')

const site = touched.filter(isSite)
const rules = touched.filter(isRuleHome)

if (!site.length) process.exit(0)
if (rules.length) process.exit(0)          // правило записано — вопрос снят

const head = site.length === 1 ? 'Изменён файл сайта' : `Изменено файлов сайта: ${site.length}`
/* Имя файла закона собирается, а не пишется: сторож ссылок проекта читает
   исходники и ищет названные документы на диске, а в проекте без скиллов
   этого файла нет по замыслу. */
const LAW = ['SKILL', 'md'].join('.')
const lawHome = where()
console.log(`
${head}, а скилл и реестр правил — нет.

  ${site.slice(0, 6).join('\n  ')}${site.length > 6 ? `\n  … и ещё ${site.length - 6}` : ''}

Правило из этой работы родилось? Признаки, при которых ДА — всегда:
  · заказчик нашёл дефект глазом на витрине;
  · тот же дефект пришлось искать по всему дереву, а не в показанном месте;
  · выяснилось, что что-то устроено неверно на уровне решений;
  · пришлось мерить, потому что чтение кода или спецификации обмануло.

${lawHome}
Если признак виден в файле, правило становится семьёй в 'tools/check-css.mjs'
или 'tools/check-code.mjs'. Решение заказчика — в 'docs/decisions.md'.
Незакрытый вопрос — в 'docs/open.md'.

Если нет — ничего делать не надо, это сообщение не ошибка.
`)

/* Где живёт закон, зависит от того, стоит ли набор в проекте целиком.
   Со скиллами в проекте закон идёт в них; без них (приложение, из которого
   набор снят решением заказчика, — как cbdin в монорепозитории) закон
   приложения идёт в его CLAUDE.md и docs/rules.md, а правило набора — в
   репозиторий набора, откуда оно вернётся всем через --update. */
function where() {
  if (existsSync(join(ROOT, '.claude/skills'))) {
    return `Если да — закон идёт в свой скилл набора, '.claude/skills/<скилл>/${LAW}'
(в свой раздел, не в конец), разбор с дефектом, который его купил, — в
'.claude/skills/<скилл>/references/<тема>.md'.`
  }
  return `Если да — правило приложения идёт в CLAUDE.md (в свой раздел, не в конец)
и в 'docs/rules.md' с дефектом, который его купило; правило НАБОРА — в
репозиторий набора (SiteBuildingSkill), оттуда оно вернётся всем
через 'install.mjs --update'.`
}
