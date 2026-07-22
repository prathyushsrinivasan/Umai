package com.umai.backend.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

	/** Case-insensitive lookup, matching the functional unique index on the table. */
	@Query("select u from User u where lower(u.email) = lower(:email)")
	Optional<User> findByEmailIgnoreCase(@Param("email") String email);

	@Query("select u from User u where lower(u.username) = lower(:username)")
	Optional<User> findByUsernameIgnoreCase(@Param("username") String username);

	@Query("select count(u) > 0 from User u where lower(u.email) = lower(:email)")
	boolean existsByEmailIgnoreCase(@Param("email") String email);

	@Query("select count(u) > 0 from User u where lower(u.username) = lower(:username)")
	boolean existsByUsernameIgnoreCase(@Param("username") String username);

}
