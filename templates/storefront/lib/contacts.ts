/* Каналы связи — одно место (check:code, семья contactScheme). Образец. */
export const CONTACTS = { phone: '+40 700 000 000', email: 'contact@exemplu.ro' }
export const telHref = () => `tel:${CONTACTS.phone.replace(/\s+/g, '')}`
export const mailHref = () => `mailto:${CONTACTS.email}`
