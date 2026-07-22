package com.umai.backend.review;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.umai.backend.common.domain.Auditable;
import com.umai.backend.restaurant.Restaurant;
import com.umai.backend.user.User;

/**
 * A user's rating and optional written review of a restaurant.
 *
 * <p>A user has at most one review per restaurant, enforced by a unique constraint.
 * Re-reviewing updates the existing row rather than adding another, so aggregate
 * ratings cannot be inflated by repeat submissions.
 */
@Entity
@Table(
	name = "reviews",
	uniqueConstraints = @UniqueConstraint(
		name = "uq_reviews_user_restaurant",
		columnNames = { "user_id", "restaurant_id" }))
public class Review extends Auditable {

	/** Lowest permitted rating. */
	public static final int MIN_RATING = 1;

	/** Highest permitted rating. */
	public static final int MAX_RATING = 5;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotNull
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@NotNull
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "restaurant_id", nullable = false)
	private Restaurant restaurant;

	/** 1–5. Also enforced by a database CHECK constraint. */
	@NotNull
	@Min(MIN_RATING)
	@Max(MAX_RATING)
	@Column(name = "rating", nullable = false)
	private Short rating;

	@Size(max = 2000)
	@Column(name = "comment", columnDefinition = "text")
	private String comment;

	protected Review() {
		// Required by JPA.
	}

	public Review(User user, Restaurant restaurant, Short rating, String comment) {
		this.user = user;
		this.restaurant = restaurant;
		this.rating = rating;
		this.comment = comment;
	}

	public Long getId() {
		return id;
	}

	public User getUser() {
		return user;
	}

	public Restaurant getRestaurant() {
		return restaurant;
	}

	public Short getRating() {
		return rating;
	}

	public void setRating(Short rating) {
		this.rating = rating;
	}

	public String getComment() {
		return comment;
	}

	public void setComment(String comment) {
		this.comment = comment;
	}

}
