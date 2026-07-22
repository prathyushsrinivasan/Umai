package com.umai.backend.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.umai.backend.common.domain.Auditable;

/**
 * A registered account.
 *
 * <p>Only the password <em>hash</em> is stored, and it is never exposed through a
 * DTO. Username and email are unique case-insensitively, enforced by functional
 * unique indexes in the schema.
 */
@Entity
@Table(name = "users")
public class User extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotBlank
	@Size(min = 2, max = 50)
	@Column(name = "username", nullable = false, length = 50)
	private String username;

	@NotBlank
	@Email
	@Size(max = 255)
	@Column(name = "email", nullable = false, length = 255)
	private String email;

	@NotBlank
	@Column(name = "password_hash", nullable = false, length = 255)
	private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(name = "role", nullable = false, length = 20)
	private UserRole role = UserRole.USER;

	protected User() {
		// Required by JPA.
	}

	public User(String username, String email, String passwordHash, UserRole role) {
		this.username = username;
		this.email = email;
		this.passwordHash = passwordHash;
		this.role = role;
	}

	public Long getId() {
		return id;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public UserRole getRole() {
		return role;
	}

	public void setRole(UserRole role) {
		this.role = role;
	}

}
