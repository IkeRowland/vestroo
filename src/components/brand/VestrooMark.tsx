/**
 * Stylized V + simple vehicle silhouette (marketing logo mark).
 */
export function VestrooMark({
  className,
  size = 'nav',
}: {
  className?: string
  size?: 'nav' | 'footer'
}) {
  const dim = size === 'footer' ? 'h-[3.5rem] w-[3.5rem]' : 'h-[4.25rem] w-[4.25rem]'
  const car = size === 'footer' ? 'top-1.5 h-4 w-6' : 'top-2 h-5 w-8'
  const letter = size === 'footer' ? 'mt-3 text-xl' : 'mt-4 text-2xl'

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-full bg-vest-rust text-white shadow-md ${dim} ${className ?? ''}`}
    >
      <svg
        className={`absolute ${car} opacity-95`}
        viewBox="0 0 32 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M2 14 L6 8 L12 8 L16 4 L22 4 L28 10 L30 14 Z"
          fill="currentColor"
          className="text-white/90"
        />
        <circle cx="8" cy="15" r="2.5" fill="#222" />
        <circle cx="22" cy="15" r="2.5" fill="#222" />
      </svg>
      <span className={`font-bold tracking-tight ${letter}`}>V</span>
    </div>
  )
}
