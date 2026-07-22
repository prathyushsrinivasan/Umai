package com.umai.backend.area;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AreaRepository extends JpaRepository<Area, Long> {

	Optional<Area> findBySlug(String slug);

	List<Area> findAllByOrderByDisplayOrderAscNameJaAsc();

}
