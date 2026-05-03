import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('opsCommsPreview action module (AC7)', () => {
	it('does not import outbound email send', () => {
		const path = join(process.cwd(), 'src/actions/opsCommsPreview.ts')
		const src = readFileSync(path, 'utf8')
		expect(src).not.toMatch(/from ['"]@\/lib\/email\/send['"]/)
		expect(src).not.toMatch(/\bsendEmail\b/)
	})
})
