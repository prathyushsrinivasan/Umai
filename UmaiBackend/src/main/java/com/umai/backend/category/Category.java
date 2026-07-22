package com.umai.backend.category;

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
 * A cuisine genre (和食, インド料理, カフェ, ...).
 *
 * <p>Deliberately a table, not an enum: the spec's example genres are a starting
 * point, and new ones must be addable without a code change.
 *
 * <p>Vegetarian/vegan classification is not a category — see
 * {@link com.umai.backend.restaurant.VegetarianType}.
 */
@Entity
@Table(name = "categories")
public class Category extends Auditable {

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

	@Column(name = "description", columnDefinition = "text")
	private String description;

	@Column(name = "display_order", nullable = false)
	private int displayOrder;

	protected Category() {
		// Required by JPA.
	}

	public Category(String slug, String nameJa, String description, int displayOrder) {
		this.slug = slug;
		this.nameJa = nameJa;
		this.description = description;
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

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public int getDisplayOrder() {
		return displayOrder;
	}

	public void setDisplayOrder(int displayOrder) {
		this.displayOrder = displayOrder;
	}

}
