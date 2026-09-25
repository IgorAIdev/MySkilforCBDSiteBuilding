// Original SiteBuildingSkill utility. No copied commerce reducer or payment code.
// One lane per shared mutable resource (for example the entire cart): while a
// write is pending, a second write is REJECTED, not queued — the UI disables
// the control and shows pending. A write that never settles would lock the lane
// forever, so `timeoutMs` aborts it (the action receives the AbortSignal) and
// frees the lane with outcome "unknown": re-read the cart before any retry.
// `subscribe` feeds React's useSyncExternalStore or any other renderer.

export class MutationTimeout extends Error {
  constructor(ms) {
    super(`No answer in ${ms} ms; outcome unknown — re-read the resource before retrying`)
    this.name = 'MutationTimeout'
    this.outcome = 'unknown'
  }
}

export function createMutationLane({ timeoutMs } = {}) {
  if (timeoutMs !== undefined && (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)) throw new RangeError('timeoutMs must be a positive integer')
  let pending = false
  const listeners = new Set()
  const notify = () => { for (const listener of listeners) listener() }
  return {
    get pending() { return pending },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async run(action) {
      if (pending) throw new Error('Mutation already pending')
      pending = true
      notify()
      const controller = new AbortController()
      let timer
      const expired = new Promise((_, fail) => {
        if (!timeoutMs) return
        timer = setTimeout(() => {
          const error = new MutationTimeout(timeoutMs)
          controller.abort(error)
          fail(error)
        }, timeoutMs)
      })
      try {
        return await Promise.race([action(controller.signal), expired])
      } finally {
        clearTimeout(timer)
        pending = false
        notify()
      }
    },
  }
}
