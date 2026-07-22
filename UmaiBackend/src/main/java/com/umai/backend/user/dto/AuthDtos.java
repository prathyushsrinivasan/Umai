package com.umai.backend.user.dto;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.umai.backend.user.UserRole;

/** Request and response payloads for registration and login. */
public final class AuthDtos {

	private AuthDtos() {
	}

	@Schema(description = "ユーザー登録リクエスト")
	public record RegisterRequest(
			@NotBlank
			@Size(min = 2, max = 50)
			// Restricted to a predictable character set so display names cannot be used
			// to smuggle markup or confusable whitespace into the UI.
			@Pattern(regexp = "^[\\p{L}\\p{N}_.-]+$", message = "使用できない文字が含まれています")
			@Schema(example = "taro") String username,

			@NotBlank @Email @Size(max = 255)
			@Schema(example = "taro@example.com") String email,

			@NotBlank
			@Size(min = 8, max = 100, message = "パスワードは8文字以上で入力してください")
			@Schema(example = "correct-horse-battery") String password) {
	}

	@Schema(description = "ログインリクエスト")
	public record LoginRequest(
			@NotBlank @Schema(example = "taro@example.com") String email,
			@NotBlank String password) {
	}

	/** Issued token plus the account it belongs to. */
	@Schema(description = "認証レスポンス")
	public record AuthResponse(
			@Schema(description = "Bearer token") String token,
			Instant expiresAt,
			UserDto user) {
	}

	/** Public view of an account. Never includes the password hash. */
	@Schema(description = "ユーザー情報")
	public record UserDto(Long id, String username, String email, UserRole role) {
	}

}
