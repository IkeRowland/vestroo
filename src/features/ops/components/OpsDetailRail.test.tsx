/** @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { OpsDetailRail } from '@/features/ops/components/OpsDetailRail'
import { opsSplitViewCopy } from '@/features/ops/copy/ops-split-view-copy'

describe('OpsDetailRail (Story 17.9 / FE.17.5)', () => {
	it('calls onClose when header close is pressed', () => {
		const onClose = vi.fn()
		render(
			<OpsDetailRail title="Profile" onClose={onClose} showHeaderClose>
				<p>Body</p>
			</OpsDetailRail>,
		)
		fireEvent.click(screen.getByRole('button', { name: opsSplitViewCopy.closeDetailAriaLabel }))
		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it('renders footer when provided', () => {
		render(
			<OpsDetailRail title="T" footer={<button type="button">Save</button>}>
				main
			</OpsDetailRail>,
		)
		expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
	})
})
