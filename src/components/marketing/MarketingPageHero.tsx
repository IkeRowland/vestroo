type MarketingPageHeroProps = {
  title: string
  subtitle?: string
  backgroundVideoSrc?: string
}

export function MarketingPageHero({
  title,
  subtitle,
  backgroundVideoSrc,
}: MarketingPageHeroProps) {
  return (
    <section
      className={`relative h-[26.25rem] md:h-[30rem] flex items-center justify-center overflow-hidden ${
        backgroundVideoSrc ? '' : 'bg-gradient-to-r from-gray-800 to-gray-900'
      }`}
    >
      {backgroundVideoSrc ? (
        <video
          className="absolute inset-0 z-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
        >
          <source src={backgroundVideoSrc} type="video/mp4" />
        </video>
      ) : null}
      <div
        className={`absolute inset-0 ${backgroundVideoSrc ? 'bg-black/50' : 'bg-black/40'}`}
        aria-hidden
      />
      <div className="relative z-10 max-w-4xl px-4 text-center text-white">
        <h1 className="mb-2 text-3xl font-bold md:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="text-lg text-white/90 md:text-xl">{subtitle}</p>
        ) : null}
      </div>
    </section>
  )
}
