import SellerProfileOwnerActions from './SellerProfileOwnerActions'
import SellerProfileVisitorActions from './SellerProfileVisitorActions'

function SellerProfileHeader({
  seller,
  isOwnerView,
  isAdminView = false,
  onStartChat,
  onEditProfile,
  onDeleteProfile,
  isDeletingSellerProfile,
  canFavorite = false,
  isFavorite = false,
  onToggleFavorite,
}) {
  return (
    <section className="main-card seller-detail-profile compact">
      <div className="seller-detail-head compact">
        <div className={`seller-detail-avatar ${seller?.avatarUrl ? 'image' : ''}`}>
          {seller?.avatarUrl ? (
            <img src={seller.avatarUrl} alt={`${seller.name} 프로필`} />
          ) : (
            seller?.avatar ?? 'PB'
          )}
        </div>
        <div className="seller-detail-info">
          <p className="badge subtle">
            {isOwnerView ? '내 판매자 프로필' : isAdminView ? '관리자 관리 보기' : '판매자 상세'}
          </p>
          <h1 className="seller-detail-name">{seller?.name ?? '-'}</h1>
          {seller?.tagline ? (
            <p className="seller-detail-tagline">{seller.tagline}</p>
          ) : null}
          <p className="seller-detail-category">
            {(seller?.categories?.length ?? 0) > 0
              ? seller.categories.join(' · ')
              : seller?.category ?? '-'}
          </p>
        </div>
        <span className={`verify-badge ${seller?.verified ? 'on' : ''}`}>
          {seller?.verified ? '인증 판매자' : '일반 판매자'}
        </span>
        {canFavorite ? (
          <button
            type="button"
            className={`favorite-toggle-btn seller-detail-favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            aria-label={isFavorite ? '판매자 찜 해제' : '판매자 찜하기'}
            title={isFavorite ? '찜 해제' : '찜하기'}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        ) : null}
      </div>

      <div className="seller-detail-meta compact">
        <span>활동지역 {seller?.region ?? '-'}</span>
        <span>평균 응답 {seller?.avgResponse ?? '-'}</span>
        <span>누적 작업 {seller?.totalWorks ?? 0}건</span>
      </div>

      {isOwnerView ? (
        <SellerProfileOwnerActions
          onEditProfile={onEditProfile}
          onDeleteProfile={onDeleteProfile}
          isDeletingSellerProfile={isDeletingSellerProfile}
        />
      ) : (
        <SellerProfileVisitorActions onStartChat={onStartChat} />
      )}
    </section>
  )
}

export default SellerProfileHeader
