package com.umai.backend.user;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.umai.backend.common.exception.ConflictException;
import com.umai.backend.common.exception.ResourceNotFoundException;
import com.umai.backend.security.TokenService;
import com.umai.backend.user.dto.AuthDtos.AuthResponse;
import com.umai.backend.user.dto.AuthDtos.LoginRequest;
import com.umai.backend.user.dto.AuthDtos.RegisterRequest;
import com.umai.backend.user.dto.AuthDtos.UserDto;

/** Registration, login and account lookup. */
@Service
@Transactional(readOnly = true)
public class UserService {

	private final UserRepository userRepository;

	private final PasswordEncoder passwordEncoder;

	private final TokenService tokenService;

	public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, TokenService tokenService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.tokenService = tokenService;
	}

	@Transactional
	public AuthResponse register(RegisterRequest request) {
		// Checked up front for a clear message; the unique indexes remain the real
		// guarantee against a concurrent duplicate registration.
		if (userRepository.existsByEmailIgnoreCase(request.email())) {
			throw new ConflictException("このメールアドレスは既に登録されています");
		}
		if (userRepository.existsByUsernameIgnoreCase(request.username())) {
			throw new ConflictException("このユーザー名は既に使われています");
		}

		User user = new User(
			request.username(),
			request.email(),
			passwordEncoder.encode(request.password()),
			UserRole.USER);

		return toAuthResponse(userRepository.save(user));
	}

	public AuthResponse login(LoginRequest request) {
		User user = userRepository.findByEmailIgnoreCase(request.email())
			.orElse(null);

		// A wrong email and a wrong password produce the same failure, so the response
		// cannot be used to discover which addresses are registered.
		if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new BadCredentialsException("メールアドレスまたはパスワードが正しくありません");
		}

		return toAuthResponse(user);
	}

	public UserDto findById(Long id) {
		return toDto(userRepository.findById(id)
			.orElseThrow(() -> ResourceNotFoundException.of("User", id)));
	}

	/** Loads the entity for association with reviews and submissions. */
	public User requireEntity(Long id) {
		return userRepository.findById(id)
			.orElseThrow(() -> ResourceNotFoundException.of("User", id));
	}

	private AuthResponse toAuthResponse(User user) {
		TokenService.IssuedToken token = tokenService.issue(user);
		return new AuthResponse(token.value(), token.expiresAt(), toDto(user));
	}

	private UserDto toDto(User user) {
		return new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getRole());
	}

}
