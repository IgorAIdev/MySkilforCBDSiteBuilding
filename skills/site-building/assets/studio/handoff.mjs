import { clone, fingerprint, verifyApproval } from './snapshot.mjs'

const bytes = value => typeof value === 'string' ? new TextEncoder().encode(value) : value
export function safeExportPath(path) {
  if (typeof path !== 'string' || !path || /[\\:\x00]/.test(path) || path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..' || ['.git', 'node_modules'].includes(part) || (part.startsWith('.env') && part !== '.env.example'))) throw new Error(`Unsafe export path: ${path}`)
  return path
}
/** Adapter provides selected files and prose; the core owns identity, documents and manifest. */
export async function createHandoff({ design, tokens, project, approval = null, files, markdown, renderPdf, manifest = {} }) {
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
  for (const reserved of ['DESIGN-SYSTEM.md', 'DESIGN-SYSTEM.pdf', 'design-snapshot.json', 'approval.json', 'export-manifest.json']) if (Object.hasOwn(output, reserved)) throw new Error(`Reserved handoff file: ${reserved}`)
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
