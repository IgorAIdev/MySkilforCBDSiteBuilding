import type { Lang } from './locale.ts'
import type { Pack, Strength } from './source/contract.ts'

type T = Record<Lang, string>
export type SampleCategory = { slug: string; name: T; description: T }
/** `price` — в минорных единицах валюты рынка (у образца — евроцентах);
 *  `was` — цена до скидки, если вариант продаётся со скидкой; `pack` — CBD
 *  в упаковке и её мера (contract.ts, `Pack`). */
export type SampleVariant = { id: string; sku: string; options: Record<string, string>; price: number; was?: number; stock: 'in' | 'low' | 'out'; batch: string; pack: Pack }
/** `facets` — грани, которые НЕ считаются из упаковки: форма. Концентрацию
 *  (`putere`) образец выводит из `pack` сам (sample/catalog.ts): набранная
 *  рукой, она расходилась с этикеткой — капсулы 25 mg числились «10 %», масло
 *  для кошек 2,5 % — «5 %». */
export type SampleProduct = {
  id: string; cat: string; family?: string; label: string; hue: number; popular: number; strength: Strength
  name: T; summary: T; description: T
  facets: Record<string, string[]>
  groups: { code: string; name: T; options: { code: string; name: T }[] }[]
  variants: SampleVariant[]
}

export const CATEGORIES: SampleCategory[] = [
  { slug: 'uleiuri', name: { ro: 'Uleiuri CBD', en: 'CBD oils', hu: 'CBD olajok' }, description: { ro: 'Uleiuri cu CBD în mai multe concentrații.', en: 'CBD oils in several strengths.', hu: 'CBD olajok több erősségben.' } },
  { slug: 'capsule', name: { ro: 'Capsule', en: 'Capsules', hu: 'Kapszulák' }, description: { ro: 'Doză fixă în fiecare capsulă.', en: 'A fixed dose in every capsule.', hu: 'Minden kapszulában azonos adag.' } },
  { slug: 'cosmetice', name: { ro: 'Cosmetice', en: 'Cosmetics', hu: 'Kozmetikumok' }, description: { ro: 'Creme și balsamuri cu CBD.', en: 'Creams and balms with CBD.', hu: 'CBD-s krémek és balzsamok.' } },
  { slug: 'animale', name: { ro: 'Pentru animale', en: 'For pets', hu: 'Háziállatoknak' }, description: { ro: 'Uleiuri pentru câini și pisici.', en: 'Oils for dogs and cats.', hu: 'Olajok kutyáknak és macskáknak.' } },
]

export const FACETS: { code: string; name: T; values: { code: string; name: T }[] }[] = [
  { code: 'forma', name: { ro: 'Formă', en: 'Form', hu: 'Forma' }, values: [
    { code: 'ulei', name: { ro: 'Ulei', en: 'Oil', hu: 'Olaj' } },
    { code: 'capsule', name: { ro: 'Capsule', en: 'Capsules', hu: 'Kapszula' } },
    { code: 'crema', name: { ro: 'Cremă', en: 'Cream', hu: 'Krém' } },
    { code: 'pentru-animale', name: { ro: 'Pentru animale', en: 'For pets', hu: 'Háziállatoknak' } },
  ] },
  { code: 'putere', name: { ro: 'Concentrație', en: 'Strength', hu: 'Erősség' }, values: [
    { code: '2.5', name: { ro: '2,5 %', en: '2,5 %', hu: '2,5 %' } },
    { code: '5', name: { ro: '5 %', en: '5 %', hu: '5 %' } },
    { code: '10', name: { ro: '10 %', en: '10 %', hu: '10 %' } },
    { code: '20', name: { ro: '20 %', en: '20 %', hu: '20 %' } },
    { code: '30', name: { ro: '30 %', en: '30 %', hu: '30 %' } },
  ] },
]

const strength = (codes: string[]) => ({ code: 'putere', name: { ro: 'Concentrație', en: 'Strength', hu: 'Erősség' }, options: codes.map((c) => ({ code: c, name: { ro: `${c} %`, en: `${c} %`, hu: `${c} %` } })) })
const volume = (codes: string[]) => ({ code: 'volum', name: { ro: 'Volum', en: 'Volume', hu: 'Térfogat' }, options: codes.map((c) => ({ code: c, name: { ro: `${c} ml`, en: `${c} ml`, hu: `${c} ml` } })) })
const count = (codes: string[]) => ({ code: 'bucati', name: { ro: 'Bucăți', en: 'Count', hu: 'Darab' }, options: codes.map((c) => ({ code: c, name: { ro: `${c} buc.`, en: `${c} pcs`, hu: `${c} db` } })) })

/* Первым стоит товар с самым большим выбором вариантов: дерево адресов
   (tools/routes.mjs) берёт в дорогие проверки первую семью и первый товар
   без семьи. */
export const PRODUCTS: SampleProduct[] = [
  { id:'ulei-cbd-full-spectrum', cat:'uleiuri', family:'ulei-full', label: 'CBD', hue: 145, popular: 1, strength: 'percent',
    name: { ro: 'Ulei CBD full spectrum', en: 'Full-spectrum CBD oil', hu: 'Teljes spektrumú CBD olaj' },
    summary: { ro: 'Extract de cânepă în ulei MCT, cu picurător.', en: 'Hemp extract in MCT oil, with dropper.', hu: 'Kenderkivonat MCT olajban, cseppentővel.' },
    description: { ro: 'Extract din flori de cânepă din soiuri înscrise în catalogul comun al UE, în ulei MCT. Fiecare lot are buletin de analiză.', en: 'Extract of hemp flowers from varieties in the EU common catalogue, in MCT oil. Every batch has a lab report.', hu: 'Az EU közös fajtajegyzékében szereplő kenderfajták virágkivonata MCT olajban. Minden tételhez laborjegyzőkönyv tartozik.' },
    facets: { forma: ['ulei'] },
    groups: [strength(['5', '10', '20', '30']), volume(['10', '30'])],
    variants: [
      { id: 'uf-5-10', sku: 'UF-5-10', options: { putere: '5', volum: '10' }, price: 3490, stock: 'in', batch: 'RO-2409-05', pack: { mg: 500, size: 10, unit: 'ml' } },
      { id: 'uf-10-10', sku: 'UF-10-10', options: { putere: '10', volum: '10' }, price: 4490, stock: 'in', batch: 'RO-2409-10', pack: { mg: 1000, size: 10, unit: 'ml' } },
      { id: 'uf-10-30', sku: 'UF-10-30', options: { putere: '10', volum: '30' }, price: 8990, stock: 'low', batch: 'RO-2409-10', pack: { mg: 3000, size: 30, unit: 'ml' } },
      { id: 'uf-20-10', sku: 'UF-20-10', options: { putere: '20', volum: '10' }, price: 6490, stock: 'in', batch: 'RO-2409-20', pack: { mg: 2000, size: 10, unit: 'ml' } },
      { id: 'uf-30-10', sku: 'UF-30-10', options: { putere: '30', volum: '10' }, price: 8490, stock: 'out', batch: 'RO-2409-30', pack: { mg: 3000, size: 10, unit: 'ml' } },
    ] },
  { id:'ulei-cbd-izolat-10', cat:'uleiuri', label: '10 %', hue: 190, popular: 4, strength: 'percent',
    name: { ro: 'Ulei CBD izolat 10 %', en: 'CBD isolate oil 10 %', hu: 'CBD izolátum olaj 10 %' },
    summary: { ro: 'CBD izolat în ulei de semințe de cânepă.', en: 'CBD isolate in hemp seed oil.', hu: 'CBD izolátum kendermagolajban.' },
    description: { ro: 'CBD izolat, dizolvat în ulei de semințe de cânepă presat la rece.', en: 'CBD isolate dissolved in cold-pressed hemp seed oil.', hu: 'Hidegen sajtolt kendermagolajban oldott CBD izolátum.' },
    facets: { forma: ['ulei'] },
    groups: [],
    variants: [{ id: 'ui-10-10', sku: 'UI-10-10', options: {}, price: 3990, stock: 'in', batch: 'RO-2408-I10', pack: { mg: 1000, size: 10, unit: 'ml' } }] },
  { id:'ulei-cbd-5-incepatori', cat:'uleiuri', label: '5 %', hue: 120, popular: 3, strength: 'percent',
    name: { ro: 'Ulei CBD 5 % pentru început', en: 'CBD oil 5 % starter', hu: 'CBD olaj 5 % kezdőknek' },
    summary: { ro: 'Concentrație blândă, 10 ml.', en: 'A gentle strength, 10 ml.', hu: 'Enyhe erősség, 10 ml.' },
    description: { ro: 'Pentru cine încearcă un ulei CBD pentru prima dată.', en: 'For those trying a CBD oil for the first time.', hu: 'Azoknak, akik először próbálnak CBD olajat.' },
    facets: { forma: ['ulei'] },
    groups: [],
    variants: [{ id: 'us-5-10', sku: 'US-5-10', options: {}, price: 2990, stock: 'in', batch: 'RO-2409-S05', pack: { mg: 500, size: 10, unit: 'ml' } }] },
  { id:'ulei-cbd-20-seara', cat:'uleiuri', family:'ulei-seara', label: '20 %', hue: 250, popular: 6, strength: 'percent',
    name: { ro: 'Ulei CBD 20 % cu lavandă', en: 'CBD oil 20 % with lavender', hu: 'CBD olaj 20 % levendulával' },
    summary: { ro: 'Cu ulei esențial de lavandă.', en: 'With lavender essential oil.', hu: 'Levendula illóolajjal.' },
    description: { ro: 'Ulei CBD 20 % cu ulei esențial de lavandă.', en: 'CBD oil 20 % with lavender essential oil.', hu: '20 %-os CBD olaj levendula illóolajjal.' },
    facets: { forma: ['ulei'] },
    groups: [volume(['10', '30'])],
    variants: [
      { id: 'ul-20-10', sku: 'UL-20-10', options: { volum: '10' }, price: 6990, stock: 'in', batch: 'RO-2409-L20', pack: { mg: 2000, size: 10, unit: 'ml' } },
      { id: 'ul-20-30', sku: 'UL-20-30', options: { volum: '30' }, price: 8990, stock: 'in', batch: 'RO-2409-L20', pack: { mg: 6000, size: 30, unit: 'ml' } },
    ] },
  { id:'ulei-cbd-30-forte', cat:'uleiuri', label: '30 %', hue: 10, popular: 8, strength: 'percent',
    name: { ro: 'Ulei CBD 30 % forte', en: 'CBD oil 30 % forte', hu: 'CBD olaj 30 % forte' },
    summary: { ro: 'Concentrație mare, 10 ml.', en: 'High strength, 10 ml.', hu: 'Magas erősség, 10 ml.' },
    description: { ro: 'Pentru cine folosește deja uleiuri CBD.', en: 'For those who already use CBD oils.', hu: 'Azoknak, akik már használnak CBD olajat.' },
    facets: { forma: ['ulei'] },
    groups: [],
    variants: [{ id: 'uf30-10', sku: 'UF30-10', options: {}, price: 8990, stock: 'in', batch: 'RO-2409-F30', pack: { mg: 3000, size: 10, unit: 'ml' } }] },
  { id:'capsule-cbd-25', cat:'capsule', family:'capsule', label: '25 mg', hue: 30, popular: 2, strength: 'mg',
    name: { ro: 'Capsule CBD 25 mg', en: 'CBD capsules 25 mg', hu: 'CBD kapszula 25 mg' },
    summary: { ro: 'Capsule vegane, 25 mg CBD fiecare.', en: 'Vegan capsules, 25 mg CBD each.', hu: 'Vegán kapszulák, egyenként 25 mg CBD.' },
    description: { ro: 'Fiecare capsulă conține 25 mg CBD.', en: 'Each capsule contains 25 mg CBD.', hu: 'Minden kapszula 25 mg CBD-t tartalmaz.' },
    facets: { forma: ['capsule'] },
    groups: [count(['30', '60'])],
    variants: [
      { id: 'cc-30', sku: 'CC-30', options: { bucati: '30' }, price: 3990, was: 4690, stock: 'in', batch: 'RO-2409-C25', pack: { mg: 750, size: 30, unit: 'pcs' } },
      { id: 'cc-60', sku: 'CC-60', options: { bucati: '60' }, price: 5990, stock: 'low', batch: 'RO-2409-C25', pack: { mg: 1500, size: 60, unit: 'pcs' } },
    ] },
  { id:'capsule-cbd-10', cat:'capsule', label: '10 mg', hue: 45, popular: 9, strength: 'mg',
    name: { ro: 'Capsule CBD 10 mg', en: 'CBD capsules 10 mg', hu: 'CBD kapszula 10 mg' },
    summary: { ro: 'Doză mică, 30 de capsule.', en: 'A small dose, 30 capsules.', hu: 'Kis adag, 30 kapszula.' },
    description: { ro: 'Fiecare capsulă conține 10 mg CBD.', en: 'Each capsule contains 10 mg CBD.', hu: 'Minden kapszula 10 mg CBD-t tartalmaz.' },
    facets: { forma: ['capsule'] },
    groups: [],
    variants: [{ id: 'cm-30', sku: 'CM-30', options: {}, price: 3490, stock: 'in', batch: 'RO-2408-C10', pack: { mg: 300, size: 30, unit: 'pcs' } }] },
  { id:'crema-cbd', cat:'cosmetice', label: 'crema', hue: 20, popular: 5, strength: 'mg',
    name: { ro: 'Cremă cu CBD', en: 'CBD cream', hu: 'CBD krém' },
    summary: { ro: '50 ml, 500 mg CBD.', en: '50 ml, 500 mg CBD.', hu: '50 ml, 500 mg CBD.' },
    description: { ro: 'Cremă cu CBD și mentol.', en: 'Cream with CBD and menthol.', hu: 'Krém CBD-vel és mentollal.' },
    facets: { forma: ['crema'] },
    groups: [],
    variants: [{ id: 'cr-50', sku: 'CR-50', options: {}, price: 2490, stock: 'in', batch: 'RO-2409-CR', pack: { mg: 500, size: 50, unit: 'ml' } }] },
  { id:'balsam-buze-cbd', cat:'cosmetice', label: 'balsam', hue: 340, popular: 10, strength: 'mg',
    name: { ro: 'Balsam de buze cu CBD', en: 'CBD lip balm', hu: 'CBD ajakbalzsam' },
    summary: { ro: '5 g, 50 mg CBD.', en: '5 g, 50 mg CBD.', hu: '5 g, 50 mg CBD.' },
    description: { ro: 'Balsam cu ceară de albine și CBD.', en: 'Beeswax balm with CBD.', hu: 'Méhviaszos balzsam CBD-vel.' },
    facets: { forma: ['crema'] },
    groups: [],
    variants: [{ id: 'bb-5', sku: 'BB-5', options: {}, price: 1190, stock: 'in', batch: 'RO-2408-BB', pack: { mg: 50, size: 5, unit: 'g' } }] },
  { id:'ser-fata-cbd', cat:'cosmetice', label: 'ser', hue: 300, popular: 11, strength: 'mg',
    name: { ro: 'Ser de față cu CBD', en: 'CBD face serum', hu: 'CBD arcszérum' },
    summary: { ro: 'Ser ușor, 30 ml.', en: 'A light serum, 30 ml.', hu: 'Könnyű szérum, 30 ml.' },
    description: { ro: 'Ser cu CBD și acid hialuronic.', en: 'Serum with CBD and hyaluronic acid.', hu: 'Szérum CBD-vel és hialuronsavval.' },
    facets: { forma: ['crema'] },
    groups: [],
    variants: [{ id: 'sf-30', sku: 'SF-30', options: {}, price: 3290, stock: 'out', batch: 'RO-2407-SF', pack: { mg: null, size: 30, unit: 'ml' } }] },
  { id:'ulei-caini-cbd', cat:'animale', family:'animale-caini', label: 'dog', hue: 90, popular: 7, strength: 'percent',
    name: { ro: 'Ulei CBD pentru câini', en: 'CBD oil for dogs', hu: 'CBD olaj kutyáknak' },
    summary: { ro: 'Cu ulei de somon.', en: 'With salmon oil.', hu: 'Lazacolajjal.' },
    description: { ro: 'Ulei CBD 5 % cu ulei de somon, pentru câini.', en: 'CBD oil 5 % with salmon oil, for dogs.', hu: '5 %-os CBD olaj lazacolajjal, kutyáknak.' },
    facets: { forma: ['pentru-animale'] },
    groups: [volume(['10', '30'])],
    variants: [
      { id: 'ac-10', sku: 'AC-10', options: { volum: '10' }, price: 2290, stock: 'in', batch: 'RO-2409-AC', pack: { mg: 500, size: 10, unit: 'ml' } },
      { id: 'ac-30', sku: 'AC-30', options: { volum: '30' }, price: 2990, stock: 'in', batch: 'RO-2409-AC', pack: { mg: 1500, size: 30, unit: 'ml' } },
    ] },
  { id:'ulei-pisici-cbd', cat:'animale', label: 'cat', hue: 60, popular: 12, strength: 'percent',
    name: { ro: 'Ulei CBD pentru pisici', en: 'CBD oil for cats', hu: 'CBD olaj macskáknak' },
    summary: { ro: '10 ml, 2,5 %.', en: '10 ml, 2.5 %.', hu: '10 ml, 2,5 %.' },
    description: { ro: 'Concentrație redusă, pentru pisici.', en: 'A low strength, for cats.', hu: 'Alacsony erősség, macskáknak.' },
    facets: { forma: ['pentru-animale'] },
    groups: [],
    variants: [{ id: 'ap-10', sku: 'AP-10', options: {}, price: 1990, stock: 'low', batch: 'RO-2409-AP', pack: { mg: 250, size: 10, unit: 'ml' } }] },
]

export const LAB_REPORTS: Record<string, { lab: string; date: string; cbdPercent: number; thcPercent: number }> = {
  'RO-2409-05': { lab: 'Laborator de exemplu', date: '2026-09-02', cbdPercent: 5.1, thcPercent: 0.12 },
  'RO-2409-10': { lab: 'Laborator de exemplu', date: '2026-09-02', cbdPercent: 10.2, thcPercent: 0.15 },
  'RO-2409-20': { lab: 'Laborator de exemplu', date: '2026-09-03', cbdPercent: 20.4, thcPercent: 0.18 },
  'RO-2409-30': { lab: 'Laborator de exemplu', date: '2026-09-03', cbdPercent: 30.1, thcPercent: 0.19 },
  'RO-2409-C25': { lab: 'Laborator de exemplu', date: '2026-09-04', cbdPercent: 10.0, thcPercent: 0.05 },
}
