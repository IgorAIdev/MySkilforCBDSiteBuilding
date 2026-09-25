// Original SiteBuildingSkill helper. Vendure mutations return a union of the
// success type and ErrorResult types instead of throwing. A result whose
// __typename is never read turns "not enough stock" into a silent success.
// Select on every mutation:  __typename  ...on ErrorResult { errorCode message }

export const ERROR_RESULT_FIELDS = '... on ErrorResult { errorCode message }'

/**
 * @param result   the mutation field value, e.g. data.addItemToOrder
 * @param success  success __typename(s), e.g. 'Order'
 * @returns { ok: true, value } | { ok: false, code, message, typename, partial? }
 * InsufficientStockError is a partial success: Vendure added what it could and
 * returns the updated order and quantityAvailable — show both, refresh the cart.
 */
export function readResult(result, success) {
  const expected = new Set([success].flat())
  if (!expected.size || [...expected].some((t) => typeof t !== 'string' || !t)) throw new TypeError('Name the success __typename')
  if (!result || typeof result !== 'object' || typeof result.__typename !== 'string') {
    throw new TypeError('Select __typename on every Vendure mutation result')
  }
  if (expected.has(result.__typename)) return { ok: true, value: result }
  if (typeof result.errorCode !== 'string') {
    throw new TypeError(`Unhandled ${result.__typename}: add "${ERROR_RESULT_FIELDS}" to the selection`)
  }
  const failure = { ok: false, code: result.errorCode, message: result.message ?? '', typename: result.__typename }
  if (result.__typename === 'InsufficientStockError' && result.order) {
    failure.partial = { order: result.order, quantityAvailable: result.quantityAvailable }
  }
  return failure
}
