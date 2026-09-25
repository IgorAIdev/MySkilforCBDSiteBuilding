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
/* Format 2 (И244): the fingerprint also signs who approved and when, so a test
   run cannot be relabelled as the owner's approval. Format 1 records are not
   silently trusted — they need one new confirmation. */
const ACTORS = ['owner-ui', 'verification']
const signed = (record) => ({ design: record.design, tokens: record.tokens, projectId: record.projectId, sourceRevision: record.sourceRevision, actor: record.actor, approvedAt: record.approvedAt })
export async function createApproval({ design, tokens, projectId, sourceRevision, actor, now = new Date().toISOString() }) {
  if (!projectId || !sourceRevision || !ACTORS.includes(actor) || !Number.isFinite(Date.parse(now))) throw new Error('Approval metadata is incomplete')
  const record = clone({ design, tokens, projectId, sourceRevision, actor, approvedAt: now })
  return { format: 2, id: await fingerprint(signed(record)), ...record }
}
/** Integrity of the record itself, for this project and source revision — both required. */
export async function verifyRecord(record, { projectId, sourceRevision } = {}) {
  for (const [name, value] of Object.entries({ projectId, sourceRevision })) if (!value) throw new Error(`Approval check needs ${name}`)
  if (record?.format === 1) throw new Error('Approval format 1 is outdated; confirm the design again')
  if (!record || record.format !== 2 || !Number.isFinite(Date.parse(record.approvedAt)) || !ACTORS.includes(record.actor)) throw new Error('Invalid approval record')
  if (!record.projectId || !record.sourceRevision || record.id !== await fingerprint(signed(record))) throw new Error('Approval fingerprint mismatch')
  if (record.projectId !== projectId) throw new Error('Approval belongs to another project')
  if (record.sourceRevision !== sourceRevision) throw new Error('Approval belongs to another source revision')
  return clone(record)
}
/** Fails closed: design, tokens, project and revision are all required. */
export async function verifyApproval(record, { design, tokens, projectId, sourceRevision } = {}) {
  for (const [name, value] of Object.entries({ design, tokens })) if (value == null) throw new Error(`Approval check needs ${name}`)
  const verified = await verifyRecord(record, { projectId, sourceRevision })
  if (canonical(verified.design) !== canonical(design)) throw new Error('Approved design changed')
  if (canonical(verified.tokens) !== canonical(tokens)) throw new Error('Approved tokens changed')
  return verified
}
