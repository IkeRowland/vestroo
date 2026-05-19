/**
 * Static homepage sections (replaces Payload `homepage` global).
 * Visual reference: Vestroo landing — rust red, charcoal, light gray sections.
 */

/** Homepage hero carousel — add/replace files under `public/images/` (paths are case-sensitive on Linux/Vercel). */
const HERO_BANNER_IMAGES = [
  '/images/Vestroo_Hero_Banner_1.png',
  '/images/Vestroo_Hero_Banner_2.png',
  '/images/Vestroo_Hero_Banner_3.png',
  '/images/Vestroo_Hero_Banner_4.png',
  '/images/Vestroo_Hero_Banner_5.png',
  '/images/Vestroo_Hero_Banner_6.png',
  '/images/Vestroo_Hero_Banner_7.png',
  '/images/Vestroo_Hero_Banner_8.png',
  '/images/Vestroo_Hero_Banner_9.png',
  '/images/Vestroo_Hero_Banner_10.png',
] as const

/** Branded fleet image — replace the file in `public/images/` to update the Ten Reasons section. */
const TEN_REASONS_FLEET_IMAGE = '/images/vestroo-ten-reasons-suv.png'
const APP_IMAGE =
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80'

export const homepageContent = {
  seo: {
    meta_title: 'Premium passenger transport & chauffeured bookings',
    meta_description:
      'Premium passenger transport in South Africa — safe, discreet, and easy to book for airport, corporate, VIP, and tour itineraries.',
  },
  hero_slider: {
    slides: HERO_BANNER_IMAGES.map((src, index) => ({
      id: `hero-banner-${index + 1}`,
      title: 'Premium Transport Solutions',
      subtitle: 'Seamlessly Connecting People, Places, and Experiences',
      background_type: 'image' as const,
      background_image_url: src,
      show_app_download: false,
    })),
  },
  great_journeys: {
    title: 'EXCEPTIONAL JOURNEYS BEGIN WITH VESTROO',
    subtitle: 'SAFE, RELIABLE, AND CULTURALLY-RICH TRANSPORT EXPERIENCES',
    description:
      'Vestroo connects you to the people and places that matter—with professional chauffeurs who take pride in punctuality, discretion, and calm, comfortable journeys. From airport transfers to corporate movements and special events, we plan around real-world traffic and schedules so you arrive ready for what’s next.\n\nOur fleet is maintained to a high standard and our team is focused on one thing: making passenger transport simple to book, easy to understand, and dependable every time you travel with us.',
  },
  ten_reasons: {
    title: '10 COMPELLING REASONS TO CHOOSE VESTROO',
    subtitle:
      'Ten practical reasons travellers and businesses choose Vestroo for important journeys.',
    items: [
      {
        title: 'Safety-led operations',
        description:
          'Professional standards, well-maintained vehicles, and careful route planning.',
      },
      {
        title: 'On-time service',
        description:
          'We build buffer into pickups so you are not left waiting—or rushing.',
      },
      {
        title: 'Clear, upfront pricing',
        description:
          'Know what you are paying before you confirm—no surprises at the kerb.',
      },
      {
        title: 'Comfortable, modern fleet',
        description:
          'Space for passengers and luggage, suited to groups and longer runs.',
      },
      {
        title: 'Local knowledge',
        description:
          'Chauffeurs who understand venues, airports, and city flows across our service areas.',
      },
      {
        title: 'Straightforward booking',
        description:
          'A focused flow from search to quote so you can book in minutes.',
      },
      {
        title: 'Corporate-friendly',
        description:
          'Reliable transport for teams, visitors, and executive itineraries.',
      },
      {
        title: 'Airport expertise',
        description:
          'Smooth arrivals and departures with flight-aware timing where it helps.',
      },
      {
        title: 'Responsive support',
        description:
          'A team that answers questions and helps when itineraries change.',
      },
      {
        title: 'Consistent quality',
        description:
          'The same service bar for leisure, business, and event travel.',
      },
    ],
    image_url: TEN_REASONS_FLEET_IMAGE,
    image_upload: null,
  },
  mission_statement: {
    quote:
      'OUR MISSION IS TO MAKE PASSENGER TRANSPORT SAFE, SEAMLESS, AND EASY TO BOOK AND USE—EVERYTHING WE DO IS IN SUPPORT OF THIS SMALL YET COMPLEX GOAL.',
    author: 'CEO, VESTROO GROUP',
    author_title: '',
  },
  app_download: {
    title: 'Download the Vestroo App',
    headline: 'Safe reliable transfers in the palm of your hand',
    description:
      'Book, manage trips, and travel with confidence from your phone. iOS and Android availability will be announced here—watch this space.',
    app_store_link: '',
    google_play_link: '',
    app_screenshot_url: APP_IMAGE,
    app_screenshot_upload: null,
    qr_code_app_store_url: '',
    qr_code_google_play_url: '',
  },
  partners: {
    title: 'OUR PARTNERS',
    logos: [] as Array<{
      name: string
      logo_url?: string
      logo_upload?: unknown
      link?: string
    }>,
  },
  testimonials: {
    title: 'WHAT OUR CLIENTS SAY',
    subtitle: '',
    description: '',
    items: [
      {
        quote:
          'From the first message to drop-off, the team was professional and on time. Vestroo is now our go-to for airport runs and client visits—we recommend them without hesitation.',
        rating: 5,
        customer_name: 'Robert Smith',
        photo_url:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
        photo_upload: null,
      },
    ],
  },
  cta_section: {
    title: 'Ready to Experience the Vestroo Difference?',
    description:
      'Whether for business or leisure, your next great journey starts here.',
    button_text: 'Get a Quote',
    button_link: '/book/search',
  },
  /** SA-oriented trust cues — keep claims supportable (no unverifiable certifications). */
  trust_strip: {
    eyebrow: 'South Africa',
    title: 'Professional standards you can see on every trip',
    description:
      'Local service areas, punctual pickups, discretion for VIP and corporate clients, and vehicles maintained for real SA roads. We stay precise in what we claim—ask us for detail on your corridor or programme.',
    link_label: 'How we approach safety & standards',
    link_href: '/safety',
  },
  services_overview: {
    title: 'What we offer',
    subtitle:
      'Premium shuttle, corporate patterns, VIP transfers, and curated tours—each with clear next steps.',
    hub_cta_label: 'View all services',
    hub_href: '/services',
  },
}
