package com.umai.backend.tag;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tags")
@io.swagger.v3.oas.annotations.tags.Tag(name = "Tags", description = "タグ")
public class TagController {

	private final TagRepository tagRepository;

	public TagController(TagRepository tagRepository) {
		this.tagRepository = tagRepository;
	}

	@GetMapping
	@Operation(summary = "タグ一覧", description = "レストランに付与されるタグを返します。")
	public List<TagDto> list() {
		return tagRepository.findAllByOrderByNameJaAsc().stream()
			.map(TagDto::from)
			.toList();
	}

}
