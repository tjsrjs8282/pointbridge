import { Link } from 'react-router-dom'

function SellerCard({ seller }) {
  return (
    <article className="main-card seller-card">
      <div className="seller-profile">
        <div className="seller-avatar">{seller.avatar}</div>
        <div>
          <h3>{seller.name}</h3>
          <span className="seller-category">{seller.category}</span>
        </div>
      </div>

      <p className="seller-intro">{seller.intro}</p>

      <div className="seller-meta-grid">
        <span>평점 {seller.rating}</span>
        <span>리뷰 {seller.reviewCount}건</span>
        <span>시작 {seller.startPrice.toLocaleString()}P</span>
        <span>지역 {seller.region}</span>
      </div>
      <Link className="seller-link-btn" to={`/seller/${seller.id}`}>
        프로필 보기
      </Link>
    </article>
  )
}

export default SellerCard
