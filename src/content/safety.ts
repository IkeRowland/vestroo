/**
 * Safety & compliance teaser — not VST-12 full compliance UI.
 */

export const safetyContent = {
  meta_title: 'Safety & standards',
  meta_description:
    'How Vestroo approaches passenger safety, professional standards, and regulatory awareness in South Africa — overview with contact for detail.',
  page_title: 'Safety & standards',
  intro_html: `
    <p>Passenger safety and professional conduct are central to how we plan routes, maintain vehicles, and brief <strong>chauffeurs</strong>. This page summarises our posture at a high level—it is not legal advice, and it does not replace policies your organisation may require.</p>
  `,
  sections: [
    {
      title: 'Operations & vehicle care',
      body_html: `
        <p>We work to keep vehicles roadworthy and appropriately specified for South African conditions. Pre-trip checks and maintenance expectations are part of normal operations—not a one-off campaign.</p>
      `,
    },
    {
      title: 'Data & privacy awareness',
      body_html: `
        <p>We treat personal information shared for <strong>bookings</strong> and enquiries with care. Detailed privacy statements, retention, and POPIA-aligned practices may evolve; for specifics beyond this teaser, please <a href="/contact">contact us</a>—we will not promise legal outcomes from marketing copy alone.</p>
      `,
    },
    {
      title: 'What we do not claim here',
      body_html: `
        <p>Full compliance documentation, incident workflows, and audit artefacts belong in formal programmes (see roadmap: <strong>VST-12</strong>). This foundation page exists so prospects know we take safety and regulatory awareness seriously and know where to ask for more.</p>
      `,
    },
  ],
  cta: { label: 'Discuss requirements', href: '/contact' },
} as const
