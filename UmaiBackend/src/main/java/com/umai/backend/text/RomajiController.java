package com.umai.backend.text;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Romanizes Japanese text on demand, for the frontend's English-mode display of
 * restaurant names/addresses. Public and read-only — no different in sensitivity
 * from any other browse endpoint — but bounded in input size since it runs a
 * dictionary-backed tokenizer per call.
 */
@RestController
@RequestMapping("/api/v1/romaji")
@Validated
@Tag(name = "Romaji", description = "日本語テキストの簡易ローマ字変換")
public class RomajiController {

	private static final int MAX_LENGTH = 500;

	private final RomajiService romajiService;

	public RomajiController(RomajiService romajiService) {
		this.romajiService = romajiService;
	}

	@GetMapping
	@Operation(
		summary = "ローマ字変換",
		description = "日本語テキストを簡易的にローマ字へ変換します（翻訳ではなく発音の近似です）。")
	public RomajiResponse romanize(@RequestParam @NotBlank @Size(max = MAX_LENGTH) String text) {
		return new RomajiResponse(text, romajiService.toRomaji(text));
	}

	public record RomajiResponse(String text, String romaji) {
	}

}
