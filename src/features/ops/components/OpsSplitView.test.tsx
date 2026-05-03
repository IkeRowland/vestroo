/** @vitest-environment happy-dom */
import * as React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OpsDetailRail } from '@/features/ops/components/OpsDetailRail'
import { OpsSplitView } from '@/features/ops/components/OpsSplitView'
import { opsSplitViewCopy } from '@/features/ops/copy/ops-split-view-copy'

function mockMinLg(matches: boolean) {
	vi.stubGlobal(
		'matchMedia',
		vi.fn().mockImplementation((query: string) => ({
			matches,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	)
}

describe('OpsSplitView (Story 17.9 / FE.17.5)', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('invokes onCloseDetail when Escape is pressed on an open mobile drawer', () => {
		mockMinLg(false)
		const onCloseDetail = vi.fn()
		render(
			<OpsSplitView
				list={<div>List body</div>}
				detail={
					<OpsDetailRail title="Detail title" onClose={onCloseDetail}>
						<p>Detail body</p>
					</OpsDetailRail>
				}
				detailVisible
				onCloseDetail={onCloseDetail}
			/>,
		)
		const dialog = screen.getByRole('dialog')
		fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape', bubbles: true })
		expect(onCloseDetail).toHaveBeenCalled()
	})

	it('invokes onCloseDetail when header close is clicked in the mobile drawer', () => {
		mockMinLg(false)
		const onCloseDetail = vi.fn()
		render(
			<OpsSplitView
				list={<div>List</div>}
				detail={
					<OpsDetailRail title="T" onClose={onCloseDetail}>
						inner
					</OpsDetailRail>
				}
				detailVisible
				onCloseDetail={onCloseDetail}
			/>,
		)
		const closeBtn = screen.getByRole('button', { name: opsSplitViewCopy.closeDetailAriaLabel })
		fireEvent.click(closeBtn)
		expect(onCloseDetail).toHaveBeenCalled()
	})

	it('does not render a dialog when viewport is lg+ (inline rail)', () => {
		mockMinLg(true)
		render(
			<OpsSplitView
				list={<div>List wide</div>}
				detail={<div>Inline detail</div>}
				detailVisible
			/>,
		)
		expect(screen.queryByRole('dialog')).toBeNull()
		expect(screen.getByText('Inline detail')).toBeTruthy()
	})

	it('returns focus to listFocusReturnRef when the drawer closes', async () => {
		mockMinLg(false)
		function Harness() {
			const [open, setOpen] = React.useState(true)
			const rowRef = React.useRef<HTMLButtonElement>(null)
			const close = () => setOpen(false)
			return (
				<>
					<button type="button" ref={rowRef} data-testid="row-anchor">
						Row anchor
					</button>
					<OpsSplitView
						list={<div>list</div>}
						detail={
							<OpsDetailRail title="D" onClose={close} showHeaderClose>
								x
							</OpsDetailRail>
						}
						detailVisible={open}
						onCloseDetail={close}
						listFocusReturnRef={rowRef}
					/>
				</>
			)
		}
		const { container } = render(<Harness />)
		const row = container.querySelector('[data-testid="row-anchor"]') as HTMLButtonElement
		expect(row).toBeTruthy()
		const closeDetail = screen.getByRole('button', { name: opsSplitViewCopy.closeDetailAriaLabel })
		closeDetail.focus()
		expect(document.activeElement).toBe(closeDetail)
		fireEvent.click(closeDetail)
		await waitFor(() => {
			expect(document.activeElement).toBe(row)
		})
	})
})
