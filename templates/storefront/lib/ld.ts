/* JSON-LD — то, что читает машина. Всё — из тех же данных, что нарисованы:
   обещать поисковику больше, чем на странице, нельзя (check:seo, faqPage). */
export const faqLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
})
