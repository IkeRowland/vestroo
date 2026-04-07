import Link from 'next/link'

type TrustStripProps = {
  eyebrow: string
  title: string
  description: string
  link_label: string
  link_href: string
}

export function TrustStrip({
  eyebrow,
  title,
  description,
  link_label,
  link_href,
}: TrustStripProps) {
  return (
    <section
      className="py-14 bg-vest-charcoal text-gray-200"
      aria-labelledby="trust-strip-heading"
    >
      <div className="container mx-auto px-4 max-w-5xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vest-rust mb-3">
          {eyebrow}
        </p>
        <h2
          id="trust-strip-heading"
          className="text-2xl md:text-3xl font-bold text-white mb-4"
        >
          {title}
        </h2>
        <p className="text-base md:text-lg text-gray-300 mb-6 leading-relaxed">
          {description}
        </p>
        <Link
          href={link_href}
          className="inline-flex text-sm font-semibold text-white underline-offset-4 hover:text-vest-rust hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {link_label}
        </Link>
      </div>
    </section>
  )
}
