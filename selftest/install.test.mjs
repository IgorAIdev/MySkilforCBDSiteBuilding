/**
 * Ставщик в трёх режимах — и что он НЕ трогает.
 *
 * Самопроверка набора, в проекты не едет (`selftest/` — в MINE ставщика).
 * Каждый случай куплен дефектом из `docs/rules.md`:
 *   И168 — проверки читают пути из kit.config.json, а не помнят их;
 *   И169 — ставщик не затирает того, что принадлежит проекту;
 *   И170 — заготовка CI лежит там, где её не исполняют.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const KIT = new URL('..', import.meta.url).pathname
const run = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' })
const install = (dir, ...flags) => run([join(KIT, 'install.mjs'), ...flags, dir], KIT)
const check = (dir, tool) => run([join(dir, 'tools', tool)], dir)
const fresh = (name) => {
  const dir = mkdtempSync(join(tmpdir(), `kit-${name}-`))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, private: true, scripts: { dev: 'next dev' } }, null, 2))
  return dir
}
const scriptsOf = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts
const foreign = (name) => {
  const dir = fresh(name)
  writeFileSync(join(dir, 'CLAUDE.md'), '# Свои правила проекта\n')
  mkdirSync(join(dir, 'docs'))
  writeFileSync(join(dir, 'docs/rules.md'), '# Свой реестр\n')
  mkdirSync(join(dir, '.github/workflows'), { recursive: true })
  writeFileSync(join(dir, '.github/workflows/check.yml'), 'name: свой\n')
  return dir
}

/* Проверки на новом сайте обязаны быть зелёными с первого дня: долг
   собственных стилей набора записан в его базе вёрстки (И171), а не
   прощён и не спрятан — иначе первый же `check:css` красный. */
test('новый сайт: всё разложено, команды дописаны, проверки зелёные на пустом проекте', () => {
  const dir = fresh('new')
  const r = install(dir)
  assert.equal(r.status, 0, r.stderr)
  for (const f of ['CLAUDE.md', 'tools/check-css.mjs', 'tools/kit-config.mjs', 'styles/tokens.css',
    '.claude/skills/craft/SKILL.md', '.claude/skills/taste-skill/SKILL.md', '.claude/settings.json',
    '.github/workflows/check.yml', 'docs/rules.md', 'install.mjs', 'scripts.mjs']) {
    assert.ok(existsSync(join(dir, f)), `нет ${f}`)
  }
  assert.ok(!existsSync(join(dir, 'templates')), 'заготовки — не содержимое проекта')
  assert.ok(!existsSync(join(dir, 'selftest')), 'самопроверка набора — не содержимое проекта')
  assert.ok(!existsSync(join(dir, 'research')), 'исследования набора — не содержимое проекта')
  assert.ok(!existsSync(join(dir, '.github/workflows/kit.yml')), 'CI набора — не CI проекта')
  const s = scriptsOf(dir)
  assert.equal(s.dev, 'next dev', 'свои команды остаются')
  assert.equal(s['check:css'], 'node tools/check-css.mjs')
  for (const t of ['check-css.mjs', 'check-code.mjs', 'check-port.mjs']) {
    const c = check(dir, t)
    assert.equal(c.status, 0, `${t} на пустом проекте:\n${c.stdout}${c.stderr}`)
  }
  /* И192: палитра не ехала вовсе — ни инструменты, ни краски, ни команда, —
     а `check:palette` в реестре подсказок стояла. То есть новый сайт видел
     её в списке и не мог запустить, а покрасить себя по шкале не мог тем
     более. Проверяется весь путь: файлы на месте, краски на месте,
     выпущенный CSS не отстал, замер зелёный. */
  for (const f of ['tools/palette.mjs', 'tools/palette-profile.json', 'tools/palette-css.mjs',
    'tools/check-palette.mjs', 'styles/palette.json', 'styles/palette.css']) {
    assert.ok(existsSync(join(dir, f)), `палитра не доехала: ${f}`)
  }
  assert.equal(s.palette, 'node tools/palette-css.mjs', 'команды выпуска палитры нет')
  const pal = check(dir, 'check-palette.mjs')
  assert.equal(pal.status, 0, `палитра нового сайта:\n${pal.stdout}${pal.stderr}`)
  assert.match(pal.stdout, /Палитра в норме/, 'замер прошёл мимо красок проекта')
  assert.equal(spawnSync(process.execPath, [join(dir, 'tools/palette-css.mjs'), '--check'],
    { cwd: dir }).status, 0, 'выпущенный styles/palette.css отстал от красок')
  /* И202: то же самое для шкал. Новый сайт получает правило «размер из
     шкалы, ритм из шкалы» — и обязан получить вместе с ним то, чем шкалу
     меняют: числа, строитель, замер и команда. Без этого правило снова
     ссылается в пустоту, а ступени набираются рукой. */
  for (const f of ['tools/scale.mjs', 'tools/scale-css.mjs', 'tools/check-scale.mjs',
    'tools/scale-stand.mjs', 'styles/scale.json', 'styles/scale.css']) {
    assert.ok(existsSync(join(dir, f)), `шкалы не доехали: ${f}`)
  }
  assert.equal(s.scale, 'node tools/scale-css.mjs', 'команды выпуска шкал нет')
  const sc = check(dir, 'check-scale.mjs')
  assert.equal(sc.status, 0, `шкалы нового сайта:\n${sc.stdout}${sc.stderr}`)
  assert.match(sc.stdout, /Шкалы в норме/, 'замер прошёл мимо чисел проекта')
  assert.equal(spawnSync(process.execPath, [join(dir, 'tools/scale-css.mjs'), '--check'],
    { cwd: dir }).status, 0, 'выпущенный styles/scale.css отстал от чисел')
  rmSync(dir, { recursive: true, force: true })
})

test('чужой сайт без ключа: отказ, и ни один его файл не тронут (И169)', () => {
  const dir = foreign('refuse')
  const r = install(dir)
  assert.notEqual(r.status, 0, 'должен отказать')
  assert.match(r.stderr, /--audit/)
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), '# Свои правила проекта\n')
  assert.equal(readFileSync(join(dir, 'docs/rules.md'), 'utf8'), '# Свой реестр\n')
  assert.ok(!existsSync(join(dir, 'tools')), 'до отказа ничего не пишется')
  rmSync(dir, { recursive: true, force: true })
})

test('--audit: инструменты и четыре скилла, kit.config.json, проектное не тронуто', () => {
  const dir = foreign('audit')
  const r = install(dir, '--audit')
  assert.equal(r.status, 0, r.stderr)
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), '# Свои правила проекта\n')
  assert.equal(readFileSync(join(dir, '.github/workflows/check.yml'), 'utf8'), 'name: свой\n')
  assert.ok(!existsSync(join(dir, 'styles/tokens.css')), 'шкалы набора чужому сайту не навязываются')
  assert.ok(!existsSync(join(dir, '.claude/settings.json')), 'хуки на чужой сайт не вешаются')
  assert.ok(!existsSync(join(dir, '.oxlintrc.json')))
  assert.ok(existsSync(join(dir, 'tools/check-css.mjs')))
  assert.ok(existsSync(join(dir, 'kit.config.json')))
  for (const s of ['craft', 'code', 'shop', 'stages']) assert.ok(existsSync(join(dir, '.claude/skills', s, 'SKILL.md')), s)
  assert.ok(!existsSync(join(dir, '.claude/skills/taste-skill')), 'чужие скиллы аудиту не нужны')
  const s = scriptsOf(dir)
  assert.equal(s['check:css'], 'node tools/check-css.mjs')
  assert.equal(s.lint, undefined, 'lint у чужого проекта свой')
  assert.equal(s.test, undefined, 'test у чужого проекта свой')
  rmSync(dir, { recursive: true, force: true })
})

test('--update: базы храповиков и CLAUDE.md проекта остаются, инструменты обновляются', () => {
  const dir = fresh('update')
  assert.equal(install(dir).status, 0)
  writeFileSync(join(dir, 'CLAUDE.md'), 'Этап производства: **3 · Поведение**\n')
  writeFileSync(join(dir, 'tools/css-baseline.json'), '{"fontPx": 7}\n')
  writeFileSync(join(dir, 'tools/check-css.mjs'), '// устаревшая копия\n')
  const r = install(dir, '--update')
  assert.equal(r.status, 0, r.stderr)
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), 'Этап производства: **3 · Поведение**\n', 'этап проекта не сбрасывается')
  assert.equal(readFileSync(join(dir, 'tools/css-baseline.json'), 'utf8'), '{"fontPx": 7}\n', 'долг не прощается')
  assert.notEqual(readFileSync(join(dir, 'tools/check-css.mjs'), 'utf8'), '// устаревшая копия\n', 'инструмент обновлён')
  rmSync(dir, { recursive: true, force: true })
})

test('kit.config.json: проверка видит src/ только когда ей сказали, где искать (И168)', () => {
  const dir = foreign('config')
  assert.equal(install(dir, '--audit').status, 0)
  mkdirSync(join(dir, 'src/app'), { recursive: true })
  writeFileSync(join(dir, 'src/app/page.module.css'), '.hero { font-size: 13px; z-index: 40; }\n')
  /* Без конфига папок набора нет — проверка честно молчит нулём. */
  assert.equal(check(dir, 'check-css.mjs').status, 0)
  writeFileSync(join(dir, 'kit.config.json'), JSON.stringify({
    code: ['src/app'], styles: ['src'], lib: 'src/lib', tokens: null, base: null, primitives: null,
    scale: { font: 'text', space: 'space', layer: 'layer' }, breakpoints: [860],
  }))
  const c = check(dir, 'check-css.mjs')
  assert.notEqual(c.status, 0, 'font-size в px и z-index числом обязаны быть найдены')
  assert.match(c.stdout + c.stderr, /src\/app\/page\.module\.css/)
  assert.match(c.stdout + c.stderr, /--layer-/, 'имя слоя берётся из конфига')
  rmSync(dir, { recursive: true, force: true })
})

test('заготовка CI лежит в templates/, а не в .github/workflows/ набора (И170)', () => {
  assert.ok(existsSync(join(KIT, 'templates/check.yml')))
  assert.ok(!existsSync(join(KIT, '.github/workflows/check.yml')))
  assert.ok(existsSync(join(KIT, 'package.json')), 'у набора есть свой package.json — его CI есть чем запускать')
})
