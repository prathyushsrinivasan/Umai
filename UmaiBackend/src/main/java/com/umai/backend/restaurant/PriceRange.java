package com.umai.backend.restaurant;

/**
 * Rough price band for a typical meal. Null when unknown — the column is nullable
 * precisely so we never invent a price band we do not have data for.
 */
public enum PriceRange {

	/** 〜1,000円 */
	BUDGET,

	/** 1,000〜3,000円 */
	MODERATE,

	/** 3,000円〜 */
	EXPENSIVE

}
