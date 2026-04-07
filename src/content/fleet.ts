/**
 * Fleet / vehicle classes — epic-4 vocabulary (no public-transit framing).
 */

export const fleetContent = {
  meta_title: 'Fleet & vehicle classes',
  meta_description:
    'Premium vehicle classes for South Africa — sedan, SUV, MPV, minibus, and armoured options where required. Capacity and use-case guidance for bookings.',
  page_title: 'Our fleet',
  intro_html: `
    <p>Every <strong>booking</strong> is matched to a <strong>vehicle</strong> class that fits passengers, luggage, and road context. Below is a practical guide—exact availability depends on date and region; confirm at quote time.</p>
  `,
  classes: [
    {
      id: 'sedan',
      name: 'Premium sedan',
      summary: 'Executive travel, airport transfers, up to 3 passengers comfortably.',
      capacity_hint: 'Typically 1–3 passengers; luggage for standard airline cases.',
      image_url:
        'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80',
    },
    {
      id: 'suv',
      name: 'SUV',
      summary: 'Extra ride height and luggage volume for small groups and uneven access.',
      capacity_hint: 'Typically 1–4 passengers; strong luggage flexibility.',
      image_url:
        'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=900&q=80',
    },
    {
      id: 'mpv',
      name: 'MPV',
      summary: 'Flexible seating for families and small teams without stepping up to a minibus.',
      capacity_hint: 'Typically up to 6 passengers depending on configuration.',
      image_url:
        'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=900&q=80',
    },
    {
      id: 'minibus',
      name: 'Minibus',
      summary: 'Group movements, events, and shuttle-style programmes with one coordinated vehicle.',
      capacity_hint: 'Larger groups; ideal when a single service point sequence is agreed in advance.',
      image_url:
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=900&q=80',
    },
    {
      id: 'armoured',
      name: 'Armoured (on request)',
      summary: 'Where risk assessment requires armoured transport, we align vehicle sourcing and chauffeur briefing to policy—always via consultation.',
      capacity_hint: 'Subject to availability, route, and compliance checks.',
      image_url:
        'https://images.unsplash.com/photo-1489827905167-cab38225535c?w=900&q=80',
    },
  ],
} as const
