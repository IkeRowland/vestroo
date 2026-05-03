import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

/** Run axe on `page`; throws when any violation has impact `serious` or `critical`. */
export async function expectNoSeriousAxeViolations(page: Page, contextLabel: string): Promise<void> {
	const results = await new AxeBuilder({ page }).analyze()
	const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
	if (blocking.length > 0) {
		const summary = blocking.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')
		throw new Error(`Axe serious/critical on ${contextLabel}:\n${summary}`)
	}
}
