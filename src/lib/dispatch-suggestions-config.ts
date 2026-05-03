/**
 * Dispatch suggestion weights — **Q26** (deterministic scoring).
 * Maps: capacity fit, schedule gap, chauffeur familiarity, cost tier alignment.
 */

/** Weight for **capacity fit** sub-score (normalised 0–100 before applying). */
export const WEIGHT_CAPACITY = 0.4

/** Weight for **schedule gap** sub-score. */
export const WEIGHT_SCHEDULE = 0.2

/** Weight for **chauffeur familiarity** sub-score. */
export const WEIGHT_CHAUFFEUR = 0.2

/** Weight for **cost tier alignment** sub-score. */
export const WEIGHT_COST = 0.2
