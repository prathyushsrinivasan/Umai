package com.umai.backend.restaurant;

/**
 * How well a restaurant caters to vegetarian and vegan diets.
 *
 * <p>Exactly one value applies to a restaurant, which is why this is a column on
 * {@code restaurants} rather than a many-to-many category. Imported data is often
 * ambiguous, so {@link #UNKNOWN} is a first-class value — never guess a
 * classification we cannot support.
 */
public enum VegetarianType {

	/** Entirely vegan. 「ヴィーガン専門」 */
	VEGAN_ONLY,

	/** Entirely vegetarian, may serve dairy or eggs. 「ベジタリアン専門」 */
	VEGETARIAN_ONLY,

	/** Not exclusively vegan, but has dependable vegan options. 「ヴィーガン対応」 */
	VEGAN_FRIENDLY,

	/** Not exclusively vegetarian, but has dependable vegetarian options. 「ベジタリアン対応」 */
	VEGETARIAN_FRIENDLY,

	/** Not yet classified. Typical for freshly imported external data. */
	UNKNOWN

}
