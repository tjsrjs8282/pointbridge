function CommunityPagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) {
  if (totalPages <= 1) return null

  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages)
  const blockStart = Math.floor((safeCurrent - 1) / 5) * 5 + 1
  const blockEnd = Math.min(totalPages, blockStart + 4)
  const pages = []
  for (let page = blockStart; page <= blockEnd; page += 1) {
    pages.push(page)
  }

  return (
    <nav className="community-pagination" aria-label="게시글 페이지네이션">
      <button
        type="button"
        className="community-pagination-nav"
        disabled={safeCurrent <= 1}
        onClick={() => onPageChange(safeCurrent - 1)}
      >
        이전
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={`community-pagination-page ${page === safeCurrent ? 'active' : ''}`}
          onClick={() => onPageChange(page)}
          aria-current={page === safeCurrent ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        className="community-pagination-nav"
        disabled={safeCurrent >= totalPages}
        onClick={() => onPageChange(safeCurrent + 1)}
      >
        다음
      </button>
    </nav>
  )
}

export default CommunityPagination
