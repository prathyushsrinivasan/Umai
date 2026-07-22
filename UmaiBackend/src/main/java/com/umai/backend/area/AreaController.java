package com.umai.backend.area;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/areas")
@Tag(name = "Areas", description = "エリア")
public class AreaController {

	private final AreaRepository areaRepository;

	public AreaController(AreaRepository areaRepository) {
		this.areaRepository = areaRepository;
	}

	@GetMapping
	@Operation(summary = "エリア一覧", description = "表示順に並べた東京のエリアを返します。")
	public List<AreaDto> list() {
		return areaRepository.findAllByOrderByDisplayOrderAscNameJaAsc().stream()
			.map(AreaDto::from)
			.toList();
	}

}
