import fs from 'node:fs'
import path from 'node:path'

/**
 * When **`src/app/(ops)/ops/bookings/[id]/availability/page.tsx`** exists, **Check availability**
 * CTAs may navigate here without 404 (walk-in + account workflows).
 */
export function opsBookingsAvailabilityCheckPageExists(): boolean {
	const p = path.join(
		process.cwd(),
		'src',
		'app',
		'(ops)',
		'ops',
		'bookings',
		'[id]',
		'availability',
		'page.tsx',
	)
	return fs.existsSync(p)
}
