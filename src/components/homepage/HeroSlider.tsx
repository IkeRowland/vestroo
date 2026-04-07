'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type HeroSlide = {
  id?: string
  title: string
  subtitle?: string
  background_type: 'image' | 'video'
  background_image_url?: string
  background_image_upload?: {
    url?: string
  } | string | number | null
  background_video_url?: string
  background_video_upload?: {
    url?: string
  } | string | number | null
  show_app_download?: boolean
  app_store_link?: string
  google_play_link?: string
}

type HeroSliderProps = {
  slides: HeroSlide[]
}

const SLIDE_INTERVAL_MS = 5500
const SLIDE_TRANSITION_MS = 700

export function HeroSlider({ slides }: HeroSliderProps) {
  const [trackIndex, setTrackIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [instantMove, setInstantMove] = useState(false)

  const imageOnly = slides.every((s) => s.background_type === 'image')
  const useInfiniteLoop = imageOnly && slides.length > 1
  const n = slides.length
  const loopSlides = useMemo(
    () => (useInfiniteLoop ? [...slides, slides[0]!] : slides),
    [slides, useInfiniteLoop]
  )
  const panelCount = loopSlides.length

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Auto-advance: after last real slide, move onto clone of first (same visual), then snap to 0
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return

    const interval = setInterval(() => {
      setTrackIndex((prev) => {
        if (useInfiniteLoop) {
          if (prev === n) return prev
          if (prev === n - 1) return n
          return prev + 1
        }
        return (prev + 1) % n
      })
    }, SLIDE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length, n, useInfiniteLoop])

  if (!slides || slides.length === 0) {
    return null
  }

  const displayIndex =
    useInfiniteLoop && trackIndex === n ? 0 : Math.min(trackIndex, n - 1)
  const slide = slides[displayIndex]!

  const getBackgroundImageUrl = (slide: HeroSlide): string | null => {
    if (slide.background_type === 'video') return null

    if (slide.background_image_url) {
      return slide.background_image_url
    }

    if (slide.background_image_upload) {
      if (typeof slide.background_image_upload === 'object' && slide.background_image_upload?.url) {
        return slide.background_image_upload.url
      }
      // If it's a number or string ID, we'd need to fetch it, but for now return null
      // In production, you'd resolve the media relation
    }

    return null
  }

  const goToSlide = (index: number) => {
    setTrackIndex(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const nextSlide = () => {
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
    if (useInfiniteLoop) {
      if (trackIndex === n - 1) setTrackIndex(n)
      else if (trackIndex === n) return
      else setTrackIndex((i) => i + 1)
    } else {
      setTrackIndex((prev) => (prev + 1) % n)
    }
  }

  const prevSlide = () => {
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
    if (useInfiniteLoop && trackIndex === n) {
      setInstantMove(true)
      setTrackIndex(n - 1)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setInstantMove(false))
      })
      return
    }
    if (useInfiniteLoop && trackIndex === 0) {
      setTrackIndex(n - 1)
      return
    }
    setTrackIndex((prev) => (prev - 1 + n) % n)
  }

  const slideCount = slides.length
  const slideFractionPct = panelCount > 0 ? 100 / panelCount : 100
  const translatePct = -(trackIndex * slideFractionPct)

  const handleTrackTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return
    if (!useInfiniteLoop || trackIndex !== n) return
    setInstantMove(true)
    setTrackIndex(0)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setInstantMove(false))
    })
  }

  return (
    <div
      className="relative min-h-[800px] md:min-h-[900px] flex items-center overflow-hidden w-full"
      aria-roledescription="carousel"
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {displayIndex + 1} of {slideCount}
      </div>

      {/* Background: horizontal strip, slides left to show next image from the right */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {slides.some((s) => s.background_type === 'video') ? (
          (() => {
            const s = slide
            const videoUrl =
              s.background_video_url ||
              (typeof s.background_video_upload === 'object' &&
                s.background_video_upload?.url) ||
              (typeof s.background_video_upload === 'string' &&
                s.background_video_upload)
            return videoUrl ? (
              <video
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-600 to-green-800" />
            )
          })()
        ) : (
          <div
            className="flex h-full ease-out motion-safe:transition-transform"
            style={{
              width: `${panelCount * 100}%`,
              transform: `translateX(${translatePct}%)`,
              transitionDuration:
                reduceMotion || instantMove ? '0ms' : `${SLIDE_TRANSITION_MS}ms`,
            }}
            onTransitionEnd={handleTrackTransitionEnd}
          >
            {loopSlides.map((s, index) => {
              const url = getBackgroundImageUrl(s)
              const isClone = useInfiniteLoop && index === n
              const panelKey = isClone ? 'loop-clone-head' : (s.id ?? `slide-${index}`)
              if (!url) {
                return (
                  <div
                    key={panelKey}
                    className="relative h-full shrink-0 bg-gradient-to-br from-vest-rust to-vest-rust-dark"
                    style={{ width: `${slideFractionPct}%` }}
                  />
                )
              }
              return (
                <div
                  key={panelKey}
                  className="relative h-full shrink-0"
                  style={{ width: `${slideFractionPct}%` }}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                    priority={index === 0}
                    aria-hidden
                  />
                </div>
              )
            })}
          </div>
        )}
        {/* Light veil — banners already carry a solid brand panel on the left */}
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 h-full flex items-center">
        <div className="w-full lg:w-1/2 lg:ml-auto text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.55)]">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p className="text-xl md:text-2xl mb-8 opacity-95 drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">
                {slide.subtitle}
              </p>
            )}
            {slide.show_app_download && (
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                {slide.app_store_link && (
                  <Link
                    href={slide.app_store_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Image
                      src="/app-store-badge.svg"
                      alt="Download on the App Store"
                      width={180}
                      height={60}
                      className="h-12 w-auto"
                      onError={(e) => {
                        // Fallback if image doesn't exist
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </Link>
                )}
                {slide.google_play_link && (
                  <Link
                    href={slide.google_play_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Image
                      src="/google-play-badge.svg"
                      alt="Get it on Google Play"
                      width={180}
                      height={60}
                      className="h-12 w-auto"
                      onError={(e) => {
                        // Fallback if image doesn't exist
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Slider Controls */}
      {slides.length > 1 && (
        <>
          {/* Previous/Next Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === displayIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

