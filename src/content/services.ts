/**
 * Marketing service lines — aligned with docs/epic-4 domain vocabulary and company profile.
 * Each entry maps to a route under /services/...
 */

export type ServiceSlug =
  | 'premium-shuttle'
  | 'corporate'
  | 'vip'
  | 'tours'
  | 'close-protection'

export type ServiceContent = {
  slug: ServiceSlug
  nav_label: string
  short_title: string
  meta_title: string
  meta_description: string
  hero_title: string
  audience: string
  promise: string
  body_html: string
  primary_cta: { label: string; href: string }
  secondary_cta?: { label: string; href: string }
}

export const servicesList: ServiceContent[] = [
  {
    slug: 'premium-shuttle',
    nav_label: 'Premium shuttle',
    short_title: 'Premium shuttle',
    meta_title: 'Premium shuttle transport',
    meta_description:
      'Scheduled and on-demand premium shuttle-style transport for groups, events, and corridors across South Africa — professional chauffeurs and a maintained vehicle fleet.',
    hero_title: 'Premium shuttle transport',
    audience:
      'Event organisers, hospitality teams, and travellers who need dependable, repeatable movements—not mass transit, but coordinated private transport at scale.',
    promise:
      'Comfortable vehicles, punctual pickups, and clear communication for every leg of your itinerary.',
    body_html: `
      <p>Our premium shuttle offering is built for organisations and private groups that need reliable movement between airports, hotels, venues, and corporate campuses. Each movement is planned around your timetable and service points—not fixed public stops.</p>
      <p>Chauffeurs are briefed on discretion and route efficiency; vehicles are chosen from our fleet classes to match group size and luggage needs.</p>
    `,
    primary_cta: { label: 'Request a quote', href: '/book/search' },
    secondary_cta: { label: 'Contact sales', href: '/contact' },
  },
  {
    slug: 'corporate',
    nav_label: 'Corporate',
    short_title: 'Corporate transport',
    meta_title: 'Corporate transport & patterns',
    meta_description:
      'Corporate passenger transport in South Africa — recurring patterns, visitor programmes, and executive-ready vehicles with professional chauffeurs.',
    hero_title: 'Corporate transport',
    audience:
      'HR, travel managers, and PAs who coordinate staff shuttles, visitor programmes, and recurring service patterns.',
    promise:
      'Consistent service standards, transparent booking flows, and vehicles suited to board-level and team travel.',
    body_html: `
      <p>We support corporate clients with point-to-point bookings and recurring <strong>corporate patterns</strong> where the same service routes or timings repeat—ideal for shifts, campus links, and multi-day programmes.</p>
      <p>Your account team can align on service points, escalation paths, and reporting expectations without exposing sensitive data in public channels.</p>
    `,
    primary_cta: { label: 'Corporate enquiry', href: '/contact' },
    secondary_cta: { label: 'Book a trip', href: '/book/search' },
  },
  {
    slug: 'vip',
    nav_label: 'VIP transfers',
    short_title: 'VIP transfers',
    meta_title: 'VIP & executive transfers',
    meta_description:
      'Discreet VIP and executive transfers in South Africa — premium sedans and SUVs, professional chauffeurs, and punctual door-to-door service.',
    hero_title: 'VIP & executive transfers',
    audience:
      'Executives, dignitaries, and private clients who expect minimal friction, privacy, and absolute reliability.',
    promise:
      'Discreet chauffeurs, premium vehicle classes, and proactive timing around flights and meetings.',
    body_html: `
      <p>VIP movements are handled with extra attention to punctuality, routing, and in-vehicle comfort. We prioritise suitable vehicle classes—sedan, SUV, or MPV—and brief chauffeurs on protocol and discretion.</p>
      <p>Share itinerary details when you book so we can align pickup windows and service points with security or concierge requirements where applicable.</p>
    `,
    primary_cta: { label: 'Book VIP transfer', href: '/book/search' },
    secondary_cta: { label: 'Speak to us', href: '/contact' },
  },
  {
    slug: 'tours',
    nav_label: 'Tours & experiences',
    short_title: 'Tours & experiences',
    meta_title: 'Curated tours & experience packages',
    meta_description:
      'Curated tours and experience-oriented transport in South Africa — private itineraries, premium vehicles, and chauffeur-led journeys.',
    hero_title: 'Tours & experience packages',
    audience:
      'Leisure travellers, concierge teams, and brands packaging multi-stop itineraries or regional experiences.',
    promise:
      'Flexible itineraries, comfortable vehicles for longer distances, and chauffeurs who understand hospitality-led journeys.',
    body_html: `
      <p>Whether you are planning a day of wine routes, a multi-stop city experience, or a bespoke regional itinerary, we align vehicle class and timing to the experience—not a one-size-fits-all tour bus model.</p>
      <p>Share your preferred <strong>service points</strong> and duration; we will propose transport that matches group size and terrain.</p>
    `,
    primary_cta: { label: 'Browse experiences', href: '/tours' },
    secondary_cta: { label: 'Point-to-point booking', href: '/book/search' },
  },
  {
    slug: 'close-protection',
    nav_label: 'Close protection',
    short_title: 'Close protection',
    meta_title: 'Close protection transport (overview)',
    meta_description:
      'High-level close protection transport coordination in South Africa — discreet enquiry path for qualified engagements (overview; detail via consultation).',
    hero_title: 'Close protection engagements',
    audience:
      'Security details, family offices, and risk teams who need movement integrated with protection protocols.',
    promise:
      'A private consultation path to scope engagements—we do not publish tactical detail on the open web.',
    body_html: `
      <p>Vestroo can support <strong>close protection engagements</strong> where chauffeured transport must align with a wider security plan. Scope, rostering, and vehicle choices are agreed in consultation—not via instant online checkout.</p>
      <p>Contact us with a secure summary of requirements; we will route your enquiry to the right operations lead.</p>
    `,
    primary_cta: { label: 'Enquire confidentially', href: '/contact' },
  },
]

export function getServiceBySlug(slug: string): ServiceContent | undefined {
  return servicesList.find((s) => s.slug === slug)
}
