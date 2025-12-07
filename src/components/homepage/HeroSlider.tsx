'use client'

import { useState, useEffect } from 'react'
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

export function HeroSlider({ slides }: HeroSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-advance slides
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length])

  if (!slides || slides.length === 0) {
    return null
  }

  const slide = slides[currentSlide]

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
    setCurrentSlide(index)
    setIsAutoPlaying(false)
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const nextSlide = () => {
    goToSlide((currentSlide + 1) % slides.length)
  }

  const prevSlide = () => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length)
  }

  const backgroundImageUrl = getBackgroundImageUrl(slide)

  return (
    <div className="relative min-h-[800px] md:min-h-[900px] flex items-center overflow-hidden w-full">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {slide.background_type === 'video' ? (
          (() => {
            const videoUrl =
              slide.background_video_url ||
              (typeof slide.background_video_upload === 'object' &&
                slide.background_video_upload?.url) ||
              (typeof slide.background_video_upload === 'string' &&
                slide.background_video_upload)
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
        ) : backgroundImageUrl ? (
          <Image
            src={backgroundImageUrl}
            alt={slide.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-600 to-green-800" />
        )}
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 h-full flex items-center">
        <div className="w-full lg:w-1/2 lg:ml-auto text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p className="text-xl md:text-2xl mb-8 opacity-90">
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
                  index === currentSlide
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

