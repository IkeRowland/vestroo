import fs from 'node:fs'
import path from 'node:path'

/**
 * When **`src/app/(ops)/ops/bookings/[id]/availability/page.tsx`** exists, the dedicated
 * **availability check** route is reachable (deep links / bookmarks); primary queue CTAs use
 * **Send Quote** → booking detail **Quote** instead.
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
