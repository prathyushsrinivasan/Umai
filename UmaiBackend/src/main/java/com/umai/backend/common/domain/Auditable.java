package com.umai.backend.common.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Creation and modification timestamps shared by every persistent entity.
 *
 * <p>Hibernate maintains both. The columns also carry database defaults so rows
 * inserted by migrations or seed scripts are timestamped correctly too.
 */
@MappedSuperclass
public abstract class Auditable {

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

}
