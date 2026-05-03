import type { ReactNode } from 'react'

export default function QuotePublicLayout({ children }: { children: ReactNode }) {
	return <div className="min-h-screen bg-gray-50 py-10 px-4">{children}</div>
}
