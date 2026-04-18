import {
  ALL_CATEGORY_VALUE,
  CATEGORY_SELECT_OPTIONS,
} from '../../constants/marketplaceTaxonomy'

function HomeSearchHero({
  query,
  category,
  onQueryChange,
  onCategoryChange,
  onSubmit,
  recentSearches = [],
  onRecentClick,
  quickCategoryChips,
  promoBanner,
}) {
  return (
    <section className="main-card home-search-card">
      <div className="home-search-hero-grid">
        <div>
          <p className="badge">메인</p>
          <h1>어떤 작업이 필요하세요?</h1>
          <p>서비스 키워드 검색 후 바로 판매자 찾기로 이동합니다.</p>
          <form className="home-search-wrap" onSubmit={onSubmit}>
            <div className="home-search-filter-row">
              <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
                {CATEGORY_SELECT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value === ALL_CATEGORY_VALUE ? '전체 카테고리' : option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="home-search-box">
              <input
                type="text"
                placeholder="예) 상세페이지 디자인, 한-영 번역, 랜딩페이지 제작"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
              <button type="submit">판매자 찾기</button>
            </div>
            {recentSearches.length > 0 ? (
              <div className="home-recent-searches">
                <strong>최근 검색</strong>
                <div>
                  {recentSearches.slice(0, 5).map((item) => (
                    <button key={item} type="button" onClick={() => onRecentClick(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {quickCategoryChips ? (
              <div className="home-search-quick-chip-row">
                <strong>빠른 카테고리</strong>
                {quickCategoryChips}
              </div>
            ) : null}
          </form>
        </div>
        {promoBanner ? <aside className="home-search-promo">{promoBanner}</aside> : null}
      </div>
    </section>
  )
}

export default HomeSearchHero
