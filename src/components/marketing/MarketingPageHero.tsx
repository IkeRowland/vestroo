type MarketingPageHeroProps = {
  title: string
  subtitle?: string
}

export function MarketingPageHero({ title, subtitle }: MarketingPageHeroProps) {
  return (
    <section className="relative h-56 md:h-64 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div className="relative z-10 text-center text-white px-4 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold mb-2">{title}</h1>
        {subtitle ? (
          <p className="text-lg text-white/90 md:text-xl">{subtitle}</p>
        ) : null}
      </div>
    </section>
  )
}
