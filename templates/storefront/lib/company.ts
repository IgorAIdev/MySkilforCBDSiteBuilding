/* Реквизиты — образец (COMPANY_IS_REAL = false в lib/flags.ts): настоящие
   даёт заказчик. Ссылки ANPC (SAL) и платформы споров ЕС (SOL) обязательны
   на витрине румынского рынка. */
export const COMPANY = {
  name: 'SC Exemplu Cânepă SRL',
  cui: 'RO00000000',
  regCom: 'J00/0000/2026',
  address: 'Str. Exemplu 1, București',
}
export const ANPC_SAL_URL = 'https://anpc.ro/ce-este-sal/'
// Обязанность ссылаться на платформу споров ЕС (ODR) перепроверить: сообщается о её закрытии 20.07.2025 (Регламент (ЕС) 2024/3228) — docs/open.md набора; решают заказчик и юрист.
export const SOL_URL = 'https://ec.europa.eu/consumers/odr'
