package com.umai.backend.category;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/categories")
@Tag(name = "Categories", description = "料理ジャンル")
public class CategoryController {

	private final CategoryRepository categoryRepository;

	public CategoryController(CategoryRepository categoryRepository) {
		this.categoryRepository = categoryRepository;
	}

	@GetMapping
	@Operation(summary = "料理ジャンル一覧", description = "表示順に並べた料理ジャンルを返します。")
	public List<CategoryDto> list() {
		return categoryRepository.findAllByOrderByDisplayOrderAscNameJaAsc().stream()
			.map(CategoryDto::from)
			.toList();
	}

}
