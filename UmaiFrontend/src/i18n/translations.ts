import type { PriceRange, VegetarianType } from '../types/restaurant'

export type Language = 'ja' | 'en'

export interface Translations {
  home: {
    title: string
    subtitle: string
    searchPlaceholder: string
    searchAriaLabel: string
    all: string
    categoryAll: string
    categoryAriaLabel: string
    resultsHeading: string
    searchResultsHeading: string
    browseAllCta: string
    resultsAriaLabel: string
    mapAriaLabel: string
    updating: string
    truncatedNotice: string
    truncatedSearchNotice: string
    noResultsFiltered: string
    noResultsInBounds: string
    noResultsSearch: string
    detailCta: string
  }
  vegetarianType: Record<VegetarianType, string>
  priceRange: Record<PriceRange, string>
  states: {
    loading: string
    error: string
    retry: string
    emptyTitle: string
    emptyDescription: string
  }
  footer: {
    mapCredit: string
  }
  notFoundPage: {
    title: string
    cta: string
  }
  detailPage: {
    breadcrumbAriaLabel: string
    breadcrumbHome: string
    loadingLabel: string
    info: string
    tagsHeading: string
    mapHeading: string
    area: string
    address: string
    hours: string
    price: string
    phone: string
    website: string
    noContactInfo: string
    seedNotice: string
    notFoundTitle: string
    notFoundBody: string
    notFoundCta: string
  }
  languageToggle: {
    label: string
    switchToJa: string
    switchToEn: string
  }
  browsePage: {
    title: string
    subtitle: string
    backToMap: string
    searchPlaceholder: string
    searchAriaLabel: string
    dietHeading: string
    categoryHeading: string
    areaHeading: string
    priceHeading: string
    ratingHeading: string
    ratingAny: string
    ratingAtLeast: (stars: number) => string
    clearFilters: string
    resultCount: (count: number) => string
    noResults: string
    previous: string
    next: string
    pageOf: (page: number, totalPages: number) => string
  }
}

export const translations: Record<Language, Translations> = {
  ja: {
    home: {
      title: '東京のベジ・ヴィーガンを地図で',
      subtitle: '地図を動かすと、その範囲のお店が一覧に出ます',
      searchPlaceholder: '店名・料理・エリアで絞り込む',
      searchAriaLabel: 'キーワードで絞り込む',
      all: 'すべて',
      categoryAll: 'すべてのジャンル',
      categoryAriaLabel: 'ジャンルで絞り込む',
      resultsHeading: 'この範囲のお店',
      searchResultsHeading: '検索結果',
      browseAllCta: 'すべてのお店を見る・絞り込む',
      resultsAriaLabel: '表示範囲内のお店',
      mapAriaLabel: '東京のレストラン地図',
      updating: '更新中…',
      truncatedNotice: '一部のみ表示しています（拡大で絞り込み）',
      truncatedSearchNotice: '一部のみ表示しています（絞り込むと見つけやすくなります）',
      noResultsFiltered: '条件に合うお店が範囲内にありません',
      noResultsInBounds: 'この範囲にお店が見つかりませんでした',
      noResultsSearch: '東京都内に該当するお店が見つかりませんでした',
      detailCta: '詳細',
    },
    vegetarianType: {
      VEGAN_ONLY: 'ヴィーガン専門',
      VEGETARIAN_ONLY: 'ベジタリアン専門',
      VEGAN_FRIENDLY: 'ヴィーガン対応',
      VEGETARIAN_FRIENDLY: 'ベジタリアン対応',
      UNKNOWN: '情報なし',
    },
    priceRange: {
      BUDGET: '〜1,000円',
      MODERATE: '1,000〜3,000円',
      EXPENSIVE: '3,000円〜',
    },
    states: {
      loading: '読み込み中…',
      error: 'データの取得に失敗しました。時間をおいてもう一度お試しください。',
      retry: '再読み込み',
      emptyTitle: 'お店が見つかりませんでした',
      emptyDescription: '条件を変えて、もう一度お試しください。',
    },
    footer: {
      mapCredit: '地図データ © OpenStreetMap contributors',
    },
    notFoundPage: {
      title: 'ページが見つかりませんでした',
      cta: 'ホームへ戻る',
    },
    detailPage: {
      breadcrumbAriaLabel: 'パンくず',
      breadcrumbHome: '地図で探す',
      loadingLabel: 'お店の情報を読み込んでいます…',
      info: '店舗情報',
      tagsHeading: 'こだわり条件',
      mapHeading: '地図',
      area: 'エリア',
      address: '住所',
      hours: '営業時間',
      price: '価格帯',
      phone: '電話番号',
      website: 'Webサイト',
      noContactInfo: '営業時間・電話番号・Webサイトの情報はまだ登録されていません。',
      seedNotice: '※ このお店は開発用のサンプルデータです。',
      notFoundTitle: 'お店が見つかりませんでした',
      notFoundBody: '削除されたか、URL が間違っている可能性があります。',
      notFoundCta: '地図で探す',
    },
    languageToggle: {
      label: '言語',
      switchToJa: '日本語に切り替える',
      switchToEn: 'Switch to English',
    },
    browsePage: {
      title: 'すべてのお店',
      subtitle: '条件を組み合わせて絞り込めます',
      backToMap: '地図に戻る',
      searchPlaceholder: '店名・料理・エリアで検索',
      searchAriaLabel: 'キーワードで検索',
      dietHeading: 'ヴィーガン・ベジタリアン区分',
      categoryHeading: 'ジャンル',
      areaHeading: 'エリア',
      priceHeading: '価格帯',
      ratingHeading: '評価',
      ratingAny: '指定なし',
      ratingAtLeast: (stars: number) => `★${stars}以上`,
      clearFilters: '絞り込みをリセット',
      resultCount: (count: number) => `${count}件のお店`,
      noResults: '条件に合うお店が見つかりませんでした',
      previous: '前へ',
      next: '次へ',
      pageOf: (page: number, totalPages: number) => `${page} / ${totalPages} ページ`,
    },
  },
  en: {
    home: {
      title: 'Find veg & vegan spots in Tokyo',
      subtitle: 'Move the map to see restaurants in that area',
      searchPlaceholder: 'Search by name, cuisine, or area',
      searchAriaLabel: 'Filter by keyword',
      all: 'All',
      categoryAll: 'All cuisines',
      categoryAriaLabel: 'Filter by cuisine',
      resultsHeading: 'Restaurants in view',
      searchResultsHeading: 'Search results',
      browseAllCta: 'Browse & filter all restaurants',
      resultsAriaLabel: 'Restaurants in the visible area',
      mapAriaLabel: 'Map of Tokyo restaurants',
      updating: 'Updating…',
      truncatedNotice: 'Showing only some results — zoom in to narrow it down',
      truncatedSearchNotice: 'Showing only some matches — narrow your search to see more precisely',
      noResultsFiltered: 'No restaurants match your filters in this area',
      noResultsInBounds: 'No restaurants found in this area',
      noResultsSearch: 'No restaurants in Tokyo match your search',
      detailCta: 'Details',
    },
    vegetarianType: {
      VEGAN_ONLY: 'Vegan only',
      VEGETARIAN_ONLY: 'Vegetarian only',
      VEGAN_FRIENDLY: 'Vegan friendly',
      VEGETARIAN_FRIENDLY: 'Vegetarian friendly',
      UNKNOWN: 'Not specified',
    },
    priceRange: {
      BUDGET: 'Under ¥1,000',
      MODERATE: '¥1,000–3,000',
      EXPENSIVE: '¥3,000+',
    },
    states: {
      loading: 'Loading…',
      error: 'Something went wrong loading this. Please try again shortly.',
      retry: 'Retry',
      emptyTitle: 'No restaurants found',
      emptyDescription: 'Try adjusting your filters and searching again.',
    },
    footer: {
      mapCredit: 'Map data © OpenStreetMap contributors',
    },
    notFoundPage: {
      title: 'Page not found',
      cta: 'Back to home',
    },
    detailPage: {
      breadcrumbAriaLabel: 'Breadcrumb',
      breadcrumbHome: 'Browse the map',
      loadingLabel: 'Loading restaurant details…',
      info: 'Restaurant info',
      tagsHeading: 'Highlights',
      mapHeading: 'Map',
      area: 'Area',
      address: 'Address',
      hours: 'Hours',
      price: 'Price range',
      phone: 'Phone',
      website: 'Website',
      noContactInfo: 'Hours, phone, and website haven’t been added yet.',
      seedNotice: '※ This restaurant is development sample data.',
      notFoundTitle: 'Restaurant not found',
      notFoundBody: 'It may have been removed, or the link may be incorrect.',
      notFoundCta: 'Browse the map',
    },
    languageToggle: {
      label: 'Language',
      switchToJa: '日本語に切り替える',
      switchToEn: 'Switch to English',
    },
    browsePage: {
      title: 'All restaurants',
      subtitle: 'Combine filters to narrow things down',
      backToMap: 'Back to map',
      searchPlaceholder: 'Search by name, cuisine, or area',
      searchAriaLabel: 'Search by keyword',
      dietHeading: 'Vegan / vegetarian',
      categoryHeading: 'Cuisine',
      areaHeading: 'Area',
      priceHeading: 'Price range',
      ratingHeading: 'Rating',
      ratingAny: 'Any',
      ratingAtLeast: (stars: number) => `${stars}+ stars`,
      clearFilters: 'Clear filters',
      resultCount: (count: number) => `${count} restaurants`,
      noResults: 'No restaurants match your filters',
      previous: 'Previous',
      next: 'Next',
      pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
    },
  },
}
