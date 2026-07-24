package com.umai.backend.text;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.atilika.kuromoji.ipadic.Token;
import com.atilika.kuromoji.ipadic.Tokenizer;

/**
 * Best-effort Hepburn romanization of Japanese text (restaurant names, addresses),
 * for showing something readable to English-mode visitors.
 *
 * <p>This is <strong>not translation</strong> — it is a phonetic approximation.
 * Kanji readings are genuinely ambiguous (the same characters can be read several
 * ways depending on context and, for proper nouns, on the specific business), so
 * kuromoji's dictionary-based guess can be wrong, especially for restaurant names
 * a general-purpose dictionary (IPADIC) has never seen. It is still more useful to
 * an English-reading visitor than untouched kanji.
 *
 * <p>{@link Tokenizer} loads its dictionary once at construction (a few seconds);
 * as a singleton Spring bean that cost is paid once at startup, not per request.
 * It is safe to share across concurrent requests — kuromoji's tokenizer does not
 * mutate any shared state during {@code tokenize()}.
 */
@Service
public class RomajiService {

	private static final Pattern KATAKANA_ONLY = Pattern.compile("^[\\u30A0-\\u30FFー]+$");

	/** Punctuation/digits/ASCII symbols: glued directly onto neighbours, not space-separated,
	 *  so "3-2-2" and "11:00" don't come back as "3 - 2 - 2" / "11 : 00". */
	private static final Pattern SYMBOL_OR_DIGITS = Pattern.compile("^[0-9\\p{Punct}\\s　（）]+$");

	private final Tokenizer tokenizer = new Tokenizer();

	private final KatakanaRomanizer katakanaRomanizer;

	public RomajiService(KatakanaRomanizer katakanaRomanizer) {
		this.katakanaRomanizer = katakanaRomanizer;
	}

	public String toRomaji(String text) {
		List<Token> tokens = tokenizer.tokenize(text);
		StringBuilder result = new StringBuilder();
		boolean previousWasSymbolOrDigits = false;

		for (Token token : tokens) {
			String segment = romanizeToken(token);
			if (segment.isEmpty()) {
				continue;
			}

			// A run of consecutive symbol/digit tokens glues together (so "3", "-", "2",
			// "-", "2" become "3-2-2", not "3 - 2 - 2"); a word next to one still gets a
			// normal space ("Shinjuku" + "3-2-2" → "Shinjuku 3-2-2").
			boolean isSymbolOrDigits = SYMBOL_OR_DIGITS.matcher(token.getSurface()).matches();
			boolean glueToPrevious = isSymbolOrDigits && previousWasSymbolOrDigits;
			if (!result.isEmpty() && !glueToPrevious) {
				result.append(' ');
			}
			result.append(isSymbolOrDigits ? segment : capitalize(segment));
			previousWasSymbolOrDigits = isSymbolOrDigits;
		}

		return result.toString();
	}

	/**
	 * @return the romanized segment for one token, or its original surface text
	 *         when kuromoji has no reading for it and it isn't already kana
	 *         (typically rare kanji or symbols) — passed through rather than guessed.
	 */
	private String romanizeToken(Token token) {
		String surface = token.getSurface();
		String reading = token.getReading();

		boolean readingKnown = reading != null && !reading.equals("*");
		if (readingKnown) {
			return katakanaRomanizer.toRomaji(reading);
		}

		boolean surfaceIsKana = KATAKANA_ONLY.matcher(surface).matches();
		return surfaceIsKana ? katakanaRomanizer.toRomaji(surface) : surface;
	}

	private String capitalize(String value) {
		if (value.isEmpty()) {
			return value;
		}
		return Character.toUpperCase(value.charAt(0)) + value.substring(1);
	}

}
