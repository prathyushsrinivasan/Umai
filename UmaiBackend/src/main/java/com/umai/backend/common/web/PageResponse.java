package com.umai.backend.common.web;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/**
 * Envelope for paginated results.
 *
 * <p>Spring's {@code Page} serialises to an unstable, deeply nested JSON shape, so the
 * API exposes this explicit contract instead.
 *
 * @param content       items on this page
 * @param page          zero-based page index
 * @param size          requested page size
 * @param totalElements total matching items across all pages
 * @param totalPages    total number of pages
 * @param first         whether this is the first page
 * @param last          whether this is the last page
 */
public record PageResponse<T>(
		List<T> content,
		int page,
		int size,
		long totalElements,
		int totalPages,
		boolean first,
		boolean last) {

	/** Wraps a {@link Page}, mapping each element through {@code mapper}. */
	public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
		return new PageResponse<>(
			page.getContent().stream().map(mapper).toList(),
			page.getNumber(),
			page.getSize(),
			page.getTotalElements(),
			page.getTotalPages(),
			page.isFirst(),
			page.isLast());
	}

}
