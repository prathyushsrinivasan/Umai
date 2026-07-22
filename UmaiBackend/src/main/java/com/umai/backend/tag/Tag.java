package com.umai.backend.tag;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.umai.backend.common.domain.Auditable;

/**
 * A free-form label attached to restaurants (グルテンフリー対応, テイクアウト可, ...).
 *
 * <p>Tags carry no fixed meaning to the application; they exist so descriptive
 * facets can be added over time without new columns.
 */
@Entity
@Table(name = "tags")
public class Tag extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotBlank
	@Size(max = 64)
	@Column(name = "slug", nullable = false, unique = true, length = 64)
	private String slug;

	@NotBlank
	@Size(max = 100)
	@Column(name = "name_ja", nullable = false, length = 100)
	private String nameJa;

	protected Tag() {
		// Required by JPA.
	}

	public Tag(String slug, String nameJa) {
		this.slug = slug;
		this.nameJa = nameJa;
	}

	public Long getId() {
		return id;
	}

	public String getSlug() {
		return slug;
	}

	public String getNameJa() {
		return nameJa;
	}

	public void setNameJa(String nameJa) {
		this.nameJa = nameJa;
	}

}
