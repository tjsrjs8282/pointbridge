import { Link } from 'react-router-dom'

function SellerCard({
  seller,
  isFavorite = false,
  onToggleFavorite,
  canFavorite = false,
  canAdminManage = false,
  onAdminEdit,
  onAdminDelete,
}) {
  const categoryText =
    seller.categories?.length > 0 ? seller.categories.join(' · ') : seller.category
  const specialtyPreview = seller.extras?.specialties?.slice(0, 2) ?? []
  const minPrice = Number(seller.minPrice ?? seller.startPrice ?? 0)
  const maxPrice = Number(seller.maxPrice ?? seller.startPrice ?? 0)
  const priceRangeText = `${minPrice.toLocaleString()}P ~ ${Math.max(minPrice, maxPrice).toLocaleString()}P`
  const sellerAvatar = seller.avatarUrl ? (
    <img src={seller.avatarUrl} alt={`${seller.name} 프로필`} className="profile-avatar-image" />
  ) : (
    seller.avatar
  )

  return (
    <article className="main-card seller-card compact">
      <div className="seller-card-top-row">
        <span className="seller-card-title-line">
          <strong>{seller.name}</strong>
          <em>
            {Number(seller.rating ?? 0).toFixed(1)} ★ · 리뷰 {Number(seller.reviewCount ?? 0)}개
          </em>
        </span>
        {canFavorite ? (
          <button
            type="button"
            className={`favorite-toggle-btn ${isFavorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite?.(seller)}
            aria-label={isFavorite ? '판매자 찜 해제' : '판매자 찜하기'}
            title={isFavorite ? '찜 해제' : '찜하기'}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        ) : null}
      </div>
      <div className="seller-profile">
        <div className="seller-avatar">{sellerAvatar}</div>
        <div>
          <span className="seller-category">{categoryText}</span>
          <p className="seller-region">지역 {seller.region}</p>
        </div>
      </div>

      <p className="seller-intro">{seller.intro}</p>
      {specialtyPreview.length > 0 ? (
        <div className="seller-mini-tag-list">
          {specialtyPreview.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}

      <div className="seller-meta-grid">
        <span>가격 {priceRangeText}</span>
        <Link to={`/seller/${seller.id}#reviews`} className="seller-meta-link">
          리뷰 보기
        </Link>
      </div>
      <div className="seller-card-actions">
        <Link className="seller-link-btn" to={`/seller/${seller.id}`}>
          프로필 보기
        </Link>
        {canAdminManage ? (
          <>
            <button type="button" className="btn-secondary" onClick={() => onAdminEdit?.(seller)}>
              수정
            </button>
            <button type="button" className="btn-secondary" onClick={() => onAdminDelete?.(seller)}>
              삭제
            </button>
          </>
        ) : null}
      </div>
    </article>
  )
}

export default SellerCard
