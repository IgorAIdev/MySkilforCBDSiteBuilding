/** Restricted Markdown renderer for generated handoff documents; raw HTML is always escaped. */
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const inline = value => escape(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
export function documentHtml(markdown, title = 'Design system') {
  const lines = markdown.replace(/\r/g, '').split('\n')
  const output = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (!line.trim()) continue
    if (line.startsWith('```')) {
      const code = []
      while (++index < lines.length && !lines[index].startsWith('```')) code.push(lines[index])
      output.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`)
    } else if (line.startsWith('|')) {
      const rows = []
      while (index < lines.length && lines[index].startsWith('|')) { rows.push(lines[index]); index++ }
      index--
      const cells = row => row.slice(1, -1).split(/(?<!\\)\|/).map(cell => cell.trim().replaceAll('\\|', '|'))
      output.push(`<table><thead><tr>${cells(rows[0]).map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.slice(2).map(row => `<tr>${cells(row).map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
    } else if (/^#{1,6} /.test(line)) {
      const [, hashes, text] = /^(#+) (.*)$/.exec(line)
      output.push(`<h${hashes.length}>${inline(text)}</h${hashes.length}>`)
    } else if (/^[-*] |^\d+\. /.test(line)) {
      const ordered = /^\d/.test(line), items = [], pattern = ordered ? /^\d+\. / : /^[-*] /
      while (index < lines.length && pattern.test(lines[index])) { items.push(lines[index].replace(pattern, '')); index++ }
      index--
      output.push(`<${ordered ? 'ol' : 'ul'}>${items.map(item => `<li>${inline(item)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`)
    } else output.push(`<p>${inline(line.replace(/^> /, ''))}</p>`)
  }
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escape(title)}</title><style>
  *{box-sizing:border-box}body{font:10pt/1.5 Arial,sans-serif;color:#20282b;margin:0}h1{font-size:24pt;line-height:1.15}h2{font-size:16pt;margin-top:24pt;break-after:avoid}h3{font-size:12pt;break-after:avoid}p,li{orphans:3;widows:3}table{border-collapse:collapse;width:100%;table-layout:fixed;margin:12pt 0;font-size:8.5pt}th,td{border:1px solid #c6cece;text-align:left;vertical-align:top;padding:6pt;overflow-wrap:anywhere}th{background:#edf1f0}thead{display:table-header-group}tr{break-inside:avoid}ul,ol{break-inside:avoid}code{font-size:8.5pt;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:8pt}h1,p,li{overflow-wrap:anywhere}@page{size:A4;margin:17mm 14mm 18mm}
  </style></head><body>${output.join('\n')}</body></html>`
}
export async function renderDocumentPdf(markdown, { chromium, title, launchOptions } = {}) {
  if (!chromium) throw new Error('Inject a supported Playwright Chromium renderer')
  const candidates = launchOptions ? [launchOptions] : [{ headless: true }, ...(process.platform === 'win32' ? [{ headless: true, channel: 'chrome' }, { headless: true, channel: 'msedge' }] : [])]
  let browser, failure
  for (const options of candidates) { try { browser = await chromium.launch(options); break } catch (error) { failure = error } }
  if (!browser) throw failure
  try {
    const page = await browser.newPage()
    await page.setContent(documentHtml(markdown, title), { waitUntil: 'load' })
    await page.emulateMedia({ media: 'print', colorScheme: 'light' })
    await page.evaluate(() => document.fonts.ready)
    return new Uint8Array(await page.pdf({ format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;font:8px Arial;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>', margin: { top: '17mm', right: '14mm', bottom: '18mm', left: '14mm' } }))
  } finally { await browser.close() }
}
