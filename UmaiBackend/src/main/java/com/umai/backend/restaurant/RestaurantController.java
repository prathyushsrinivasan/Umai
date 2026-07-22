package com.umai.backend.restaurant;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.umai.backend.common.web.PageResponse;
import com.umai.backend.restaurant.dto.CreateRestaurantRequest;
import com.umai.backend.restaurant.dto.MapRestaurantsDto;
import com.umai.backend.restaurant.dto.RestaurantDetailDto;
import com.umai.backend.restaurant.dto.RestaurantSearchCriteria;
import com.umai.backend.restaurant.dto.RestaurantSummaryDto;

/**
 * Public read API for restaurants.
 *
 * <p>Sorting is restricted to an allow-list: {@code Pageable} otherwise lets a client
 * sort by any persistent property, which leaks the internal model and can be used to
 * force expensive unindexed sorts.
 */
@RestController
@RequestMapping("/api/v1/restaurants")
@Validated
@Tag(name = "Restaurants", description = "レストランの検索・取得")
public class RestaurantController {

	/** Properties a client may sort by. */
	private static final List<String> SORTABLE = List.of("name", "createdAt", "updatedAt");

	private final RestaurantService restaurantService;

	public RestaurantController(RestaurantService restaurantService) {
		this.restaurantService = restaurantService;
	}

	@GetMapping
	@Operation(summary = "レストラン一覧", description = "公開済みレストランをページングして返します。")
	public PageResponse<RestaurantSummaryDto> list(
			@PageableDefault(size = 20, sort = "name") Pageable pageable) {
		return restaurantService.search(emptyCriteria(), sanitiseSort(pageable));
	}

	@GetMapping("/search")
	@Operation(
		summary = "レストラン検索",
		description = "キーワードと絞り込み条件を組み合わせて検索します。条件は AND、リスト内は OR で結合されます。")
	public PageResponse<RestaurantSummaryDto> search(
			@Parameter(description = "店名・説明・住所に対する部分一致") @RequestParam(required = false) String keyword,
			@Parameter(description = "ヴィーガン・ベジタリアン区分") @RequestParam(required = false) List<VegetarianType> vegetarianTypes,
			@Parameter(description = "料理ジャンルの slug") @RequestParam(required = false) List<String> categories,
			@Parameter(description = "タグの slug（すべて満たすもの）") @RequestParam(required = false) List<String> tags,
			@Parameter(description = "エリアの slug") @RequestParam(required = false) List<String> areas,
			@Parameter(description = "価格帯") @RequestParam(required = false) List<PriceRange> priceRanges,
			@Parameter(description = "平均評価の下限。未評価の店舗は除外されます")
			@RequestParam(required = false) @Min(1) @Max(5) Double minRating,
			@PageableDefault(size = 20, sort = "name") Pageable pageable) {

		RestaurantSearchCriteria criteria = new RestaurantSearchCriteria(
			keyword, vegetarianTypes, categories, tags, areas, priceRanges, minRating);

		return restaurantService.search(criteria, sanitiseSort(pageable));
	}

	@GetMapping("/map")
	@Operation(
		summary = "地図表示用のレストラン取得",
		description = "表示範囲（bounding box）内の公開済みレストランを返します。件数が多い場合は truncated が true になります。")
	public MapRestaurantsDto map(
			@Parameter(description = "南端の緯度", required = true) @RequestParam double minLat,
			@Parameter(description = "西端の経度", required = true) @RequestParam double minLon,
			@Parameter(description = "北端の緯度", required = true) @RequestParam double maxLat,
			@Parameter(description = "東端の経度", required = true) @RequestParam double maxLon) {

		// MapBounds validates the box and throws IllegalArgumentException, which the
		// global handler renders as a 400.
		return restaurantService.findInBounds(new MapBounds(minLat, minLon, maxLat, maxLon));
	}

	@GetMapping("/featured")
	@Operation(summary = "おすすめレストラン", description = "評価の高いレストランをトップページ用に返します。")
	public List<RestaurantSummaryDto> featured(
			@RequestParam(defaultValue = "6") @Min(1) @Max(24) int limit) {
		return restaurantService.findFeatured(limit);
	}

	@GetMapping("/{id}")
	@Operation(summary = "店舗詳細", description = "公開済みレストランの詳細を返します。")
	public RestaurantDetailDto detail(@PathVariable Long id) {
		return restaurantService.findById(id);
	}

	@PostMapping
	@Operation(
		summary = "レストランを登録",
		description = "ログインしているユーザーが新しいお店を登録します。出所と公開状態はサーバー側で決定されます。")
	@SecurityRequirement(name = "bearerAuth")
	public ResponseEntity<RestaurantDetailDto> create(@Valid @RequestBody CreateRestaurantRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(restaurantService.create(request));
	}

	private RestaurantSearchCriteria emptyCriteria() {
		return new RestaurantSearchCriteria(null, null, null, null, null, null, null);
	}

	/**
	 * Drops any sort property that is not on the allow-list, falling back to name.
	 * Invalid input is ignored rather than rejected, so a stale bookmark still works.
	 */
	private Pageable sanitiseSort(Pageable pageable) {
		Sort filtered = Sort.by(pageable.getSort().stream()
			.filter(order -> SORTABLE.contains(order.getProperty()))
			.toList());

		Sort effective = filtered.isSorted() ? filtered : Sort.by(Sort.Direction.ASC, "name");
		return org.springframework.data.domain.PageRequest.of(
			pageable.getPageNumber(), pageable.getPageSize(), effective);
	}

}
