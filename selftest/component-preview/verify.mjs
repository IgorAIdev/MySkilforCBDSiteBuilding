import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('.', import.meta.url))
const base = 'http://127.0.0.1:4176'
// Use Vite's executable with Node, avoiding npm.cmd and shell portability issues.
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4176', '--strictPort'], { cwd: root, stdio: 'pipe' })
let logs = ''
server.stdout.on('data', chunk => { logs += chunk })
server.stderr.on('data', chunk => { logs += chunk })
const out = fileURLToPath(new URL('../../dist/component-review/', import.meta.url))
let browser
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(logs)
    try { if (stripVTControlCharacters(logs).includes(base) && (await fetch(base)).ok) { ready = true; break } } catch {}
    await new Promise(r => setTimeout(r, 100))
  }
  assert.ok(ready, logs)
  browser = await chromium.launch({ headless: true, ...(process.env.CI ? {} : { channel: 'chrome' }) })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  mkdirSync(out, { recursive: true })
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(base)
    await page.getByRole('button', { name: 'Добавить', exact: true }).click()
    assert.equal(await page.getByRole('status').textContent(), 'Добавлено: 1')
    const trigger = page.getByRole('button', { name: 'Действия', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('menuitem', { name: 'Добавить ещё', exact: true }).waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    await page.waitForFunction(el => document.activeElement === el, await trigger.elementHandle(), { timeout: 3000 })
    assert.ok(await trigger.evaluate(el => document.activeElement === el))
    await trigger.click()
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden')
    await page.getByRole('menuitem', { name: 'Добавить ещё', exact: true }).click()
    assert.equal(await page.getByRole('status').textContent(), 'Добавлено: 2')
    await trigger.click()
    await page.getByRole('menuitemcheckbox', { name: 'Выделить', exact: true }).click()
    assert.ok(await page.getByText('Выделено: да', { exact: true }).isVisible())
    await page.getByRole('button', { name: 'Каталог', exact: true }).click()
    await page.getByRole('link', { name: 'Все элементы', exact: true }).waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.ok(await page.locator('img').evaluateAll(images => images.length === 8 && images.every(img => img.complete && img.naturalWidth > 0)))
    await page.screenshot({ path: out + `light-${width}.png`, fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Сменить тему', exact: true }).click()
    await page.screenshot({ path: out + `dark-${width}.png`, fullPage: true, animations: 'disabled' })
    await trigger.click()
    await page.screenshot({ path: out + `dark-menu-${width}.png`, fullPage: true, animations: 'disabled' })
    await page.keyboard.press('Escape')
  }
  assert.deepEqual(errors, [])
  writeFileSync(out + 'result.json', JSON.stringify({ widths: [375, 1280], themes: ['light', 'dark'],
    checks: ['button action', 'menu keyboard open/Escape focus return', 'nonmodal scroll', 'menu action and checkbox', 'navigation disclosure', 'horizontal overflow', '8 loaded SVGs', 'runtime errors'],
    scope: 'isolated source fixture, not storefront approval', errors }, null, 2))
  console.log(`Component checks passed. Screenshots: ${out}`)
} finally {
  await browser?.close()
  server.kill()
}
