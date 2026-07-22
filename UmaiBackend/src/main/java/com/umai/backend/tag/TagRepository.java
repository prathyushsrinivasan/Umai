package com.umai.backend.tag;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {

	Optional<Tag> findBySlug(String slug);

	List<Tag> findBySlugIn(List<String> slugs);

	List<Tag> findAllByOrderByNameJaAsc();

}
