// Original SiteBuildingSkill utility. No copied commerce reducer or payment code.
// One lane per shared mutable resource (for example the entire cart).
export function createMutationLane() {
  let pending = false
  return {
    get pending() { return pending },
    async run(action) {
      if (pending) throw new Error('Mutation already pending')
      pending = true
      try { return await action() }
      finally { pending = false }
    },
  }
}
