function SellerTagGroup({ title, items = [], emptyLabel = '등록 정보 없음', max = 0 }) {
  const safeItems = Array.isArray(items) ? items : []
  const displayItems = max > 0 ? safeItems.slice(0, max) : safeItems

  return (
    <article className="seller-meta-tile">
      <header>
        <h3>{title}</h3>
        {safeItems.length > 0 ? <span className="seller-meta-count">{safeItems.length}</span> : null}
      </header>
      <div className="seller-meta-chip-list compact">
        {displayItems.length > 0 ? (
          displayItems.map((item) => <span key={item}>{item}</span>)
        ) : (
          <span className="empty">{emptyLabel}</span>
        )}
      </div>
    </article>
  )
}

export default SellerTagGroup
