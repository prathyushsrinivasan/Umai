package com.umai.backend.area;

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
 * A Tokyo district used by the エリア filter (新宿, 渋谷, ...).
 *
 * <p>A lookup table rather than a string column on the restaurant, so areas can be
 * listed, renamed and ordered without touching restaurant rows.
 */
@Entity
@Table(name = "areas")
public class Area extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Stable machine-readable key, used in URLs and filters. */
	@NotBlank
	@Size(max = 64)
	@Column(name = "slug", nullable = false, unique = true, length = 64)
	private String slug;

	/** Display name, shown to users in Japanese. */
	@NotBlank
	@Size(max = 100)
	@Column(name = "name_ja", nullable = false, length = 100)
	private String nameJa;

	@Column(name = "display_order", nullable = false)
	private int displayOrder;

	protected Area() {
		// Required by JPA.
	}

	public Area(String slug, String nameJa, int displayOrder) {
		this.slug = slug;
		this.nameJa = nameJa;
		this.displayOrder = displayOrder;
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

	public int getDisplayOrder() {
		return displayOrder;
	}

	public void setDisplayOrder(int displayOrder) {
		this.displayOrder = displayOrder;
	}

}
