/**
 * Detects Resend **test** API keys so non-production environments can skip live sends.
 *
 * **Deterministic pattern:** trim the key, then test with anchored regex **`/^re_test_/`**
 * (prefix `re_test_` as issued by Resend for test keys — see Resend dashboard / API key docs).
 *
 * @param key — raw `RESEND_API_KEY` value (may include whitespace; trimmed before test)
 * @returns true when the key is non-empty and matches the test-key prefix
 */
export function isResendTestApiKey(key: string): boolean {
	const trimmed = key.trim()
	if (!trimmed) return false
	return /^re_test_/.test(trimmed)
}
