package com.umai.backend.user;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.umai.backend.security.CurrentUser;
import com.umai.backend.user.dto.AuthDtos.AuthResponse;
import com.umai.backend.user.dto.AuthDtos.LoginRequest;
import com.umai.backend.user.dto.AuthDtos.RegisterRequest;
import com.umai.backend.user.dto.AuthDtos.UserDto;

/**
 * Registration and login.
 *
 * <p>Logout is deliberately client-side: the token is stateless and short-lived, so
 * the client discards it. A server-side logout would require a revocation store,
 * which is not warranted for this MVP.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "ユーザー登録・ログイン")
public class AuthController {

	private final UserService userService;

	public AuthController(UserService userService) {
		this.userService = userService;
	}

	@PostMapping("/register")
	@Operation(summary = "ユーザー登録", description = "アカウントを作成し、アクセストークンを返します。")
	public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(userService.register(request));
	}

	@PostMapping("/login")
	@Operation(summary = "ログイン", description = "メールアドレスとパスワードでアクセストークンを取得します。")
	public AuthResponse login(@Valid @RequestBody LoginRequest request) {
		return userService.login(request);
	}

	@GetMapping("/me")
	@Operation(summary = "ログイン中のユーザー", description = "トークンに対応するアカウント情報を返します。")
	@SecurityRequirement(name = "bearerAuth")
	public UserDto me() {
		return userService.findById(CurrentUser.requireId());
	}

}
