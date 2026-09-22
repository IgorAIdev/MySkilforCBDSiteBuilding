/** Portable JSON snapshot contract. No framework, shop, filesystem or backend. */
export function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && Object.getPrototypeOf(value) === Object.prototype) return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  throw new Error('Snapshot must contain only finite JSON values')
}
export const clone = value => JSON.parse(canonical(value))
export async function fingerprint(value) {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
export function createVersionedParser({ version, supported, normalize }) {
  return input => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Нужен JSON-пресет дизайна.')
    const raw = clone(input)
    if (!supported.includes(raw.version)) throw new Error('Неизвестная версия пресета.')
    const result = normalize(raw)
    if (result.version !== version) throw new Error('Migration did not produce the current schema')
    return clone(result)
  }
}
export async function createApproval({ design, tokens, projectId, sourceRevision, actor, now = new Date().toISOString() }) {
  if (!projectId || !sourceRevision || !['owner-ui', 'verification'].includes(actor) || !Number.isFinite(Date.parse(now))) throw new Error('Approval metadata is incomplete')
  const payload = clone({ design, tokens, projectId, sourceRevision })
  return { format: 1, id: await fingerprint(payload), approvedAt: now, actor, ...payload }
}
export async function verifyApproval(record, { design, tokens, projectId, sourceRevision } = {}) {
  if (!record || record.format !== 1 || !Number.isFinite(Date.parse(record.approvedAt)) || !['owner-ui', 'verification'].includes(record.actor)) throw new Error('Invalid approval record')
  if (!record.projectId || !record.sourceRevision || record.id !== await fingerprint({ design: record.design, tokens: record.tokens, projectId: record.projectId, sourceRevision: record.sourceRevision })) throw new Error('Approval fingerprint mismatch')
  if (design && canonical(record.design) !== canonical(design)) throw new Error('Approved design changed')
  if (tokens && canonical(record.tokens) !== canonical(tokens)) throw new Error('Approved tokens changed')
  if (projectId && record.projectId !== projectId) throw new Error('Approval belongs to another project')
  if (sourceRevision && record.sourceRevision !== sourceRevision) throw new Error('Approval belongs to another source revision')
  return clone(record)
}
