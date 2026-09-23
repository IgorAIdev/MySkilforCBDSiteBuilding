import type { Lang } from './locale.ts'
import type { Block } from './source/contract.ts'

type SamplePage = { title: Record<Lang, string>; description: Record<Lang, string>; blocks: Record<Lang, Block[]> }
const FEATURED = ['ulei-cbd-full-spectrum', 'capsule-cbd-25', 'crema-cbd', 'ulei-caini-cbd']

/* Блоки главной — как придут из Payload (план 4): тип и поля, без вида. */
export const PAGES: Record<string, SamplePage> = {
  home: {
    title: { ro: 'Magazin CBD — uleiuri, capsule, cosmetice', en: 'CBD shop — oils, capsules, cosmetics', hu: 'CBD bolt — olajok, kapszulák, kozmetikumok' },
    description: {
      ro: 'Produse CBD cu buletin de analiză pentru fiecare lot. Livrare prin curier sau la punct de ridicare, plata ramburs.',
      en: 'CBD products with a lab report for every batch. Courier or parcel locker delivery, cash on delivery.',
      hu: 'CBD termékek minden tételhez laborjegyzőkönyvvel. Futár vagy csomagautomata, utánvétes fizetés.',
    },
    blocks: {
      ro: [
        { type: 'hero', title: 'Produse CBD cu buletin de analiză pentru fiecare lot', lede: 'Uleiuri, capsule și cosmetice din cânepă. Numărul lotului de pe etichetă este același cu cel din buletinul laboratorului.', cta: 'Vedeți produsele' },
        { type: 'categories', title: 'Categorii' },
        { type: 'featured', title: 'Cele mai vândute', ids: FEATURED },
        { type: 'lab', title: 'Buletin de analiză pentru fiecare lot', body: 'Laboratorul măsoară CBD, THC, metale grele, pesticide și solvenți. Buletinul fiecărui lot este pe pagina produsului.' },
        { type: 'delivery', title: 'Livrare și plată', items: [
          { title: 'Curier la domiciliu', body: 'Livrare în 1–3 zile lucrătoare.' },
          { title: 'Locker sau punct de ridicare', body: 'Ridicați coletul când vă convine.' },
          { title: 'Plata ramburs', body: 'Plătiți la primirea coletului.' },
        ] },
        { type: 'faq', title: 'Întrebări frecvente', items: [
          { q: 'Ce conține buletinul de analiză?', a: 'Concentrația de CBD și THC, metalele grele, pesticidele și solvenții reziduali ai lotului.' },
          { q: 'Unde găsesc numărul lotului?', a: 'Pe eticheta produsului; același număr apare în buletinul laboratorului.' },
          { q: 'Cât durează livrarea?', a: 'De obicei 1–3 zile lucrătoare; termenul exact apare la finalizarea comenzii.' },
          { q: 'Pot plăti la livrare?', a: 'Da, plata ramburs este disponibilă pentru livrarea prin curier și la punct de ridicare.' },
        ] },
      ],
      en: [
        { type: 'hero', title: 'CBD products with a lab report for every batch', lede: 'Oils, capsules and cosmetics made from hemp. The batch number on the label is the same as in the lab report.', cta: 'See the products' },
        { type: 'categories', title: 'Categories' },
        { type: 'featured', title: 'Best sellers', ids: FEATURED },
        { type: 'lab', title: 'A lab report for every batch', body: 'The lab measures CBD, THC, heavy metals, pesticides and solvents. Every batch report is on the product page.' },
        { type: 'delivery', title: 'Delivery and payment', items: [
          { title: 'Courier to your door', body: 'Delivered in 1–3 working days.' },
          { title: 'Parcel locker', body: 'Pick up the parcel when it suits you.' },
          { title: 'Cash on delivery', body: 'Pay when the parcel arrives.' },
        ] },
        { type: 'faq', title: 'Frequently asked questions', items: [
          { q: 'What does the lab report contain?', a: 'The CBD and THC content, heavy metals, pesticides and residual solvents of the batch.' },
          { q: 'Where do I find the batch number?', a: 'On the product label; the same number appears in the lab report.' },
          { q: 'How long does delivery take?', a: 'Usually 1–3 working days; the exact time is shown at checkout.' },
          { q: 'Can I pay on delivery?', a: 'Yes, cash on delivery is available for courier and parcel locker delivery.' },
        ] },
      ],
      hu: [
        { type: 'hero', title: 'CBD termékek minden tételhez laborjegyzőkönyvvel', lede: 'Kenderből készült olajok, kapszulák és kozmetikumok. A címkén lévő tételszám megegyezik a laborjegyzőkönyvben szereplővel.', cta: 'Termékek megtekintése' },
        { type: 'categories', title: 'Kategóriák' },
        { type: 'featured', title: 'Legnépszerűbb termékek', ids: FEATURED },
        { type: 'lab', title: 'Minden tételhez laborjegyzőkönyv', body: 'A labor méri a CBD- és THC-tartalmat, a nehézfémeket, a növényvédő szereket és az oldószereket. Minden tétel jegyzőkönyve a termékoldalon található.' },
        { type: 'delivery', title: 'Szállítás és fizetés', items: [
          { title: 'Futár házhoz', body: 'Kiszállítás 1–3 munkanapon belül.' },
          { title: 'Csomagautomata', body: 'Vegye át a csomagot, amikor Önnek kényelmes.' },
          { title: 'Utánvét', body: 'Fizessen a csomag átvételekor.' },
        ] },
        { type: 'faq', title: 'Gyakori kérdések', items: [
          { q: 'Mit tartalmaz a laborjegyzőkönyv?', a: 'A tétel CBD- és THC-tartalmát, nehézfém-, növényvédőszer- és oldószer-maradványait.' },
          { q: 'Hol találom a tételszámot?', a: 'A termék címkéjén; ugyanez a szám szerepel a laborjegyzőkönyvben.' },
          { q: 'Mennyi ideig tart a szállítás?', a: 'Általában 1–3 munkanap; a pontos időt a rendelés véglegesítésekor látja.' },
          { q: 'Fizethetek átvételkor?', a: 'Igen, utánvéttel fizethet futáros és csomagautomatás szállításnál is.' },
        ] },
      ],
    },
  },
}
