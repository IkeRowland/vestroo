/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/image', () => ({
	default: ({
		src,
		alt,
		className,
		width,
		height,
	}: {
		src: string
		alt: string
		className?: string
		width?: number
		height?: number
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			data-testid="avatar-image"
			src={src}
			alt={alt}
			width={width}
			height={height}
			className={className}
		/>
	),
}))

import { OpsAvatarCell } from '@/features/ops/components/OpsAvatarCell'

describe('OpsAvatarCell (Story 17.7)', () => {
	it('renders initials from name when src absent', () => {
		render(<OpsAvatarCell name="Alice Johnson" />)
		expect(screen.getByText('Alice Johnson')).toBeTruthy()
		expect(screen.getByText('AJ')).toBeTruthy()
	})

	it('renders secondary line when provided', () => {
		render(<OpsAvatarCell name="Bob Smith" secondary="bob@example.com" />)
		expect(screen.getByText('bob@example.com')).toBeTruthy()
	})

	it('renders next/image when src set', () => {
		render(
			<OpsAvatarCell
				name="Carol"
				src="https://abc.supabase.co/storage/v1/object/public/avatars/x.png"
			/>,
		)
		const img = screen.getByTestId('avatar-image')
		expect(img.getAttribute('src')).toContain('supabase.co')
		expect(screen.queryByText('CA')).toBeNull()
	})
})
