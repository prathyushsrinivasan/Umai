package com.umai.backend.category;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

	Optional<Category> findBySlug(String slug);

	List<Category> findAllByOrderByDisplayOrderAscNameJaAsc();

	List<Category> findBySlugIn(List<String> slugs);

}
