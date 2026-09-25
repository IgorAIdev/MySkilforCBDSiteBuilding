/* Каналы связи — одно место (check:code, семья contactScheme). Образец. */
export const CONTACTS = { phone: '+40 700 000 000', email: 'contact@exemplu.ro' }
export const telHref = () => `tel:${CONTACTS.phone.replace(/\s+/g, '')}`
export const mailHref = () => `mailto:${CONTACTS.email}`

/* Мессенджеры магазина — куда уходит быстрый заказ (слово заказчика
   25.09.2026: «быстрый заказ вызывает всплывающее меню с мессенджерами»,
   И442). Порядок — порядок строк окна; какие стоят и с каким адресом —
   данные магазина: образец держит заглушки, настоящие номера и имена
   вписывает заказчик. Канал без адреса не выпадает из списка: строка
   печатается, нажатие прячется (И111 прежнего проекта — «прячется не факт,
   а нажатие»). Адрес ссылки считается здесь из значения, а не хранится
   рядом: поправят номер — поправится и ссылка. */
export type Messenger = 'viber' | 'telegram' | 'whatsapp' | 'instagram'
export const MESSENGERS: readonly { key: Messenger; label: string; value: string }[] = [
  { key: 'viber', label: 'Viber', value: '+40 700 000 000' },
  { key: 'telegram', label: 'Telegram', value: '@exemplu' },
  { key: 'whatsapp', label: 'WhatsApp', value: '+40 700 000 000' },
  { key: 'instagram', label: 'Instagram', value: 'exemplu' },
]

const digits = (v: string) => v.replace(/[^\d+]/g, '')

/** Ссылка на разговор с магазином; где мессенджер принимает текст в
 *  адресе (Telegram, WhatsApp) — с уже набранным сообщением. У Viber и
 *  Instagram такого параметра нет: добавленный, он сломал бы ссылку, —
 *  текст заказа окно показывает само. Значения нет — ссылки нет. */
export function chatHref(m: { key: Messenger; value: string }, text: string): string | null {
  const v = m.value.trim()
  if (!v) return null
  const said = `text=${encodeURIComponent(text)}`
  switch (m.key) {
    case 'telegram': return `https://t.me/${v.replace(/^@/, '')}?${said}`
    case 'whatsapp': return `https://wa.me/${digits(v).replace(/^\+/, '')}?${said}`
    case 'viber': return `viber://chat?number=${encodeURIComponent(digits(v))}`
    case 'instagram': return `https://ig.me/m/${v.replace(/^@/, '')}`
  }
}
