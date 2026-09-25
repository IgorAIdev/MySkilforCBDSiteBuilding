import { readFileSync, existsSync } from 'node:fs'
import assert from 'node:assert/strict'
const html=readFileSync('index.html','utf8')
assert.ok(html.includes('<main'))
assert.ok(!html.includes('editor.mjs'))
for(const [,file] of html.matchAll(/href="([^"#]+\.css)"/g))assert.ok(existsSync(file),'Missing '+file)
assert.ok(existsSync('DESIGN-SYSTEM.pdf'))
console.log('Independent static project build: all selected resources exist')
