import { clone, fingerprint, verifyApproval } from './snapshot.mjs'

const bytes = value => typeof value === 'string' ? new TextEncoder().encode(value) : value
/* Export paths are compared case-insensitively: Windows and macOS treat
   `.GIT` as `.git` and `APPROVAL.json` as `approval.json` (И244). Only plain
   names; hidden files only from a short list of public ones; no secrets, no
   Windows device names, no trailing dot or space. */
const PUBLIC_DOTFILES = new Set(['.env.example', '.well-known', '.htaccess', '.nojekyll'])
const DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/
const SECRET = /^(\.env.*|\.npmrc|\.git.*|node_modules|id_(rsa|dsa|ecdsa|ed25519).*|.*\.(pem|key|p12|pfx))$/
export function safeExportPath(path) {
  const unsafe = () => new Error(`Unsafe export path: ${path}`)
  if (typeof path !== 'string' || !path || path.startsWith('/')) throw unsafe()
  for (const part of path.split('/')) {
    const lower = part.toLowerCase()
    if (!/^[A-Za-z0-9._-]+$/.test(part) || part === '.' || part === '..' || /[. ]$/.test(part)) throw unsafe()
    if (DEVICE.test(lower)) throw unsafe()
    if (PUBLIC_DOTFILES.has(lower)) continue
    if (lower.startsWith('.') || SECRET.test(lower)) throw unsafe()
  }
  return path
}
/** Adapter provides selected files and prose; the core owns identity, documents and manifest. */
export async function createHandoff({ design, tokens, project, approval = null, files, markdown, renderPdf, manifest = {} }) {
  if (!project?.id) throw new Error('Handoff needs project.id')
  if (!project.sourceRevision) throw new Error('Handoff needs project.sourceRevision')
  const snapshot = clone({ design, tokens })
  if (approval) await verifyApproval(approval, { ...snapshot, projectId: project.id, sourceRevision: project.sourceRevision })
  const identity = approval?.id ?? await fingerprint({ ...snapshot, projectId: project.id, sourceRevision: project.sourceRevision })
  const status = approval ? (approval.actor === 'verification' ? 'verification' : 'approved') : 'draft'
  const stamp = [
    `# ${project.name} - ${status === 'approved' ? 'утверждённая дизайн-система' : status === 'verification' ? 'проверочный пакет дизайн-системы' : 'черновик дизайн-системы'}`,
    '', `- Статус: ${status}.`, `- Версия контракта настроек: \`${design.version}\`.`,
    `- Снимок: \`${identity}\`.`, `- Версия исходников: \`${project.sourceRevision}\`.`,
    ...(approval ? [`- Подтверждение: ${approval.approvedAt}; источник: ${approval.actor}.`] : ['- Финальное утверждение владельца отсутствует.']), '', markdown,
  ].join('\n')
  const output = Object.fromEntries(Object.entries(files).map(([path, value]) => [safeExportPath(path), bytes(value)]))
  const seen = new Map()
  for (const path of Object.keys(output)) {
    const lower = path.toLowerCase()
    if (seen.has(lower)) throw new Error(`Export paths differ only in letter case: ${seen.get(lower)} / ${path}`)
    seen.set(lower, path)
  }
  for (const reserved of ['DESIGN-SYSTEM.md', 'DESIGN-SYSTEM.pdf', 'design-snapshot.json', 'approval.json', 'export-manifest.json']) if (seen.has(reserved.toLowerCase())) throw new Error(`Reserved handoff file: ${reserved}`)
  output['DESIGN-SYSTEM.md'] = bytes(stamp)
  output['DESIGN-SYSTEM.pdf'] = await renderPdf(stamp)
  if (new TextDecoder().decode(output['DESIGN-SYSTEM.pdf'].slice(0, 5)) !== '%PDF-') throw new Error('Renderer did not return a PDF')
  output['design-snapshot.json'] = bytes(JSON.stringify({ format: 1, id: identity, status, project, ...snapshot }, null, 2))
  if (approval) output['approval.json'] = bytes(JSON.stringify(approval, null, 2))
  const hashes = {}
  for (const [name, value] of Object.entries(output)) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', value)
    hashes[name] = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  }
  output['export-manifest.json'] = bytes(JSON.stringify({ ...manifest, format: 1, snapshotId: identity, status, project, hashes, files: [...Object.keys(output), 'export-manifest.json'].sort() }, null, 2))
  return output
}
