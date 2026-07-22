package com.umai.backend.user;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Promotes configured accounts to {@link UserRole#ADMIN} at startup.
 *
 * <p>Replaces hand-written SQL as the only way to create the first administrator.
 * Promotion is by email of an <em>already registered</em> account: this never creates
 * users and never sets a password, so it cannot become a backdoor.
 *
 * <p>Runs on every start and is idempotent, so adding an address to the configuration
 * and restarting is enough.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

	private final UserRepository userRepository;

	private final AdminProperties properties;

	public AdminBootstrap(UserRepository userRepository, AdminProperties properties) {
		this.userRepository = userRepository;
		this.properties = properties;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (properties.emails().isEmpty()) {
			return;
		}

		for (String email : properties.emails()) {
			String trimmed = email.trim();
			if (trimmed.isEmpty()) {
				continue;
			}

			userRepository.findByEmailIgnoreCase(trimmed).ifPresentOrElse(
				user -> {
					if (user.getRole() == UserRole.ADMIN) {
						return;
					}
					user.setRole(UserRole.ADMIN);
					userRepository.save(user);
					log.info("Promoted {} to ADMIN via umai.security.admin-emails", trimmed);
				},
				// Not an error: the operator may list an address before that person
				// has registered. They are promoted on the next restart.
				() -> log.info(
					"Configured admin '{}' has no account yet; will be promoted once registered", trimmed));
		}
	}

	/**
	 * @param adminEmails addresses to promote, bound from
	 *                    {@code umai.security.admin-emails}
	 */
	@ConfigurationProperties(prefix = "umai.security")
	public record AdminProperties(List<String> adminEmails) {

		public AdminProperties {
			adminEmails = adminEmails == null ? List.of() : adminEmails;
		}

		List<String> emails() {
			return adminEmails;
		}

	}

}
