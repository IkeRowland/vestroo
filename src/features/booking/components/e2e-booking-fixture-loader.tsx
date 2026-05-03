/**
 * Hook point for Playwright / E2E to seed booking search fixtures when needed.
 * Renders nothing today so `/book/search` stays a valid module graph for `next build`.
 */
export function E2eBookingFixtureLoader() {
	return null
}
