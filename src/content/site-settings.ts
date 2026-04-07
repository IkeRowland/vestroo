/**
 * Static marketing / chrome (replaces Payload `site-settings` global).
 * Matches Vestroo landing: rust top bar, charcoal footer.
 */
export const siteSettings = {
  top_bar: {
    brand_left: 'VESTROO',
    phone_numbers: [{ number: '+27 (0)11 123 4567' }],
    email: 'info@vestroo.com',
    client_login_text: 'Client Login',
    client_login_url: '/book/search?tab=login',
  },
  header: {
    logo_type: 'image' as 'text' | 'image',
    logo_text: 'V',
    logo_image_url: '/images/vestro-logo.png',
    logo_image_upload: null,
    company_name: 'VESTROO',
    tagline: '',
    navigation_links: [
      { label: 'BOOKING', url: '/book/search' },
      { label: 'SERVICES', url: '/services' },
      { label: 'FLEET', url: '/fleet' },
      { label: 'SAFETY', url: '/safety' },
      { label: 'ABOUT', url: '/about' },
      { label: 'CONTACT', url: '/contact' },
      { label: 'LOGIN', url: '/book/search?tab=login' },
    ],
  },
  footer: {
    logo_type: 'image' as 'text' | 'image',
    logo_text: 'V',
    logo_image_url: '/images/vestro-logo.png',
    logo_image_upload: null,
    company_name: 'Vestroo',
    general_column_title: 'General Info',
    contact_column_title: 'Quick Contact',
    social_media: [] as Array<{ platform: string; url: string }>,
    general_links: [
      { label: 'Booking', url: '/book/search' },
      { label: 'Services', url: '/services' },
      { label: 'Fleet', url: '/fleet' },
      { label: 'Safety & standards', url: '/safety' },
      { label: 'About', url: '/about' },
      { label: 'Contact', url: '/contact' },
    ],
    contact_links: [
      { label: 'WhatsApp', url: '/contact' },
      { label: 'Customer Care', url: '/contact' },
      { label: 'Office Address', url: '/contact' },
    ],
    careers: {
      enabled: true,
      description:
        'Join a growing team dedicated to safe, professional chauffeured transport across South Africa.',
      button_text: 'JOIN OUR TEAM',
      button_url: '/contact',
    },
    copyright_text: '© Copyright {year}. All Rights Reserved by Vestroo',
    terms_url: '/terms',
    terms_text: 'Terms and Conditions',
  },
} as const
