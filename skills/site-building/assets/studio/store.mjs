import { canonical, clone, verifyApproval, verifyRecord } from './snapshot.mjs'

/** Storage and events are injected; React, PHP pages and plain JS use the same state machine.
 *
 *  The saved record belongs to the owner, not to this tab (И244):
 *  - `applied` unreadable (future version, broken field, broken JSON) → the store
 *    is LOCKED: nothing is written until `discardSaved()`, which backs the raw
 *    record up to `<key>:backup` first;
 *  - only `draft` unreadable → the draft falls back to `applied` (never to
 *    defaults) and the raw record is backed up before the first write;
 *  - a restored approval stays in the record while it is being checked, and is
 *    re-evaluated against the draft of that moment, not discarded;
 *  - approvals are checked against this store's own project, source revision
 *    and engine tokens — the caller cannot pass weaker context. */
export function createStudioStore({ key, defaults, parse, check, storage, events, projectId, sourceRevision, resolveTokens, extras = {}, readExtras = _saved => extras }) {
  for (const [name, value] of Object.entries({ projectId, sourceRevision })) if (!value) throw new Error(`Studio store needs ${name}: approvals are checked against it`)
  if (typeof resolveTokens !== 'function') throw new Error('Studio store needs resolveTokens: approvals are checked against the engine output')
  const initial = { ...clone(extras), draft: clone(defaults), applied: clone(defaults), approved: null, lastApproval: null, error: null }
  const LOCKED = 'Сохранённые настройки записаны более новой версией или повреждены. Изменения не записываются, чтобы их не затереть: экспортируйте JSON или сбросьте явно.'
  let state = initial
  let loaded = false
  let locked = false
  let backup = null
  let trusted = null
  const listeners = new Set()
  const emit = () => listeners.forEach(listener => listener())
  const valid = value => !check(value).findings.length
  const current = (record, draft) => canonical(record.design) === canonical(draft) && canonical(record.tokens) === canonical(resolveTokens(draft))
  const approvedFor = draft => (trusted && current(trusted, draft) ? trusted : null)
  function persist(next, atomic = false) {
    if (locked) { state = { ...state, error: LOCKED }; emit(); return false }
    try {
      if (backup !== null) { storage().setItem(`${key}:backup`, backup); backup = null }
      storage().setItem(key, JSON.stringify({ ...next, error: null }))
      state = { ...next, error: null }
    } catch {
      state = { ...(atomic ? state : next), error: 'Браузер запретил сохранение. Не закрывайте страницу до экспорта JSON.' }
    }
    emit()
    return !state.error
  }
  function restore(record) {
    void verifyRecord(record, { projectId, sourceRevision }).then(verified => {
      if (state.lastApproval !== record) return
      trusted = verified
      state = { ...state, lastApproval: verified, approved: approvedFor(state.draft) }
      emit()
    }).catch(() => {
      if (state.lastApproval !== record) return
      state = { ...state, approved: null, error: 'Запись утверждения не подходит этому проекту или повреждена. Настройки сохранены, требуется новое подтверждение.' }
      emit()
    })
  }
  function read(keepMemory = false) {
    let text
    try { text = storage().getItem(key) } catch { text = null }
    if (!text) { locked = false; if (!keepMemory) state = initial; return }
    let saved, applied
    try {
      saved = JSON.parse(text)
      applied = parse(saved?.applied)
    } catch {
      locked = true
      state = { ...(keepMemory ? state : initial), error: LOCKED }
      return
    }
    locked = false
    let draft = applied
    let error = null
    try { draft = parse(saved.draft) } catch {
      draft = clone(applied)
      backup = text
      error = 'Черновик не прочитан — показан применённый дизайн; исходная запись сохранена в резерв.'
    }
    const lastApproval = saved.lastApproval ?? saved.approved ?? null
    trusted = null
    // Old presets are never silently promoted to approved: the record is kept and checked.
    state = { ...readExtras(saved), draft, applied, approved: null, lastApproval, error }
    if (lastApproval) restore(lastApproval)
  }
  const onStorage = event => { if (event.key === key || event.key === null) { read(true); emit() } }
  return {
    subscribe(listener) {
      if (!loaded) { read(); loaded = true }
      if (!listeners.size) events()?.addEventListener('storage', onStorage)
      listeners.add(listener)
      return () => { listeners.delete(listener); if (!listeners.size) events()?.removeEventListener('storage', onStorage) }
    },
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    draft(value) {
      const draft = parse(value)
      return persist({ ...state, draft, approved: approvedFor(draft), error: null })
    },
    apply() {
      if (locked) return persist(state)
      if (!valid(state.draft)) { state = { ...state, error: 'Перед применением исправьте замечания в разделе «Проверки».' }; emit(); return false }
      return persist({ ...state, applied: clone(state.draft), error: null })
    },
    updateExtras(patch) { return persist({ ...state, ...readExtras({ ...state, ...patch }), error: null }) },
    /** Explicit owner action: keep the unreadable record as `<key>:backup`, start from defaults. */
    discardSaved() {
      let text = null
      try { text = storage().getItem(key) } catch { /* nothing to keep */ }
      locked = false
      trusted = null
      if (text !== null) backup = text
      return persist(initial)
    },
    async approve(record) {
      if (locked) return persist(state)
      const captured = clone(state.draft)
      const verified = await verifyApproval(record, { design: captured, tokens: resolveTokens(captured), projectId, sourceRevision })
      if (canonical(captured) !== canonical(state.draft)) throw new Error('Настройки изменились во время подтверждения. Подтвердите новый вариант.')
      if (!valid(captured)) throw new Error('Approved design no longer passes checks')
      const ok = persist({ ...state, applied: captured, approved: verified, lastApproval: verified, error: null }, true)
      if (ok) trusted = verified
      return ok
    },
  }
}
