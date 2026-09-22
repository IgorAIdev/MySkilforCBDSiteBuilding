import { canonical, clone, verifyApproval } from './snapshot.mjs'

/** Storage and events are injected; React, PHP pages and plain JS use the same state machine. */
export function createStudioStore({ key, defaults, parse, check, storage, events, projectId, resolveTokens, extras = {}, readExtras = _saved => extras }) {
  const initial = { ...clone(extras), draft: clone(defaults), applied: clone(defaults), approved: null, lastApproval: null, error: null }
  let state = initial
  let loaded = false
  const listeners = new Set()
  const emit = () => listeners.forEach(listener => listener())
  const valid = value => !check(value).findings.length
  function persist(next, atomic = false) {
    try {
      storage().setItem(key, JSON.stringify({ ...next, error: null }))
      state = { ...next, error: null }
    } catch {
      state = { ...(atomic ? state : next), error: 'Браузер запретил сохранение. Не закрывайте страницу до экспорта JSON.' }
    }
    emit()
    return !state.error
  }
  function read() {
    try {
      const text = storage().getItem(key)
      if (!text) { state = initial; return }
      const saved = JSON.parse(text)
      const draft = parse(saved.draft)
      const applied = parse(saved.applied)
      const lastApproval = saved.lastApproval ?? saved.approved ?? null
      // Old presets are never silently promoted to approved. Verify the record before restoring it.
      state = { ...readExtras(saved), draft, applied, approved: null, lastApproval: null, error: null }
      if (lastApproval) {
        const captured = state
        void verifyApproval(lastApproval, { projectId }).then(record => {
          if (state !== captured) return
          const current = canonical(record.design) === canonical(draft) && (!resolveTokens || canonical(record.tokens) === canonical(resolveTokens(draft)))
          state = { ...state, lastApproval: record, approved: current ? record : null }
          emit()
        }).catch(() => { if (state === captured) { state = { ...state, error: 'Запись утверждения повреждена. Настройки сохранены, требуется новое подтверждение.' }; emit() } })
      }
    } catch { state = { ...initial, error: 'Сохранённый пресет не прочитан. Можно импортировать JSON или выбрать базовый.' } }
  }
  const onStorage = event => { if (event.key === key || event.key === null) { read(); emit() } }
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
      return persist({ ...state, draft, approved: state.approved && canonical(state.approved.design) === canonical(draft) ? state.approved : null, error: null })
    },
    apply() {
      if (!valid(state.draft)) { state = { ...state, error: 'Перед применением исправьте замечания в разделе «Проверки».' }; emit(); return false }
      return persist({ ...state, applied: clone(state.draft), error: null })
    },
    updateExtras(patch) { return persist({ ...state, ...readExtras({ ...state, ...patch }), error: null }) },
    async approve(record, tokens, projectId) {
      const captured = clone(state.draft)
      await verifyApproval(record, { design: captured, tokens, projectId })
      if (canonical(captured) !== canonical(state.draft)) throw new Error('Настройки изменились во время подтверждения. Подтвердите новый вариант.')
      if (!valid(captured)) throw new Error('Approved design no longer passes checks')
      return persist({ ...state, applied: captured, approved: clone(record), lastApproval: clone(record), error: null }, true)
    },
  }
}
