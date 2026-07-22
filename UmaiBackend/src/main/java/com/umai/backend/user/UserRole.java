package com.umai.backend.user;

/**
 * Authorisation level of an account.
 *
 * <p>{@link #MODERATOR} and {@link #ADMIN} are defined now so the restaurant
 * moderation workflow has a role to hang off when it is implemented.
 */
public enum UserRole {

	/** Standard account: can review restaurants and submit new ones. */
	USER,

	/** Can approve or reject submitted restaurants. */
	MODERATOR,

	/** Full administrative access. */
	ADMIN

}
