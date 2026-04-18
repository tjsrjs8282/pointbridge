const DEFAULT_BANNERS = [
  {
    id: 'point-review-double',
    title: '첫 거래 리뷰 작성 시 포인트 2배',
    description: '첫 거래 완료 후 리뷰를 작성하면 보너스 포인트를 2배로 적립해드립니다.',
    onClickKey: 'point',
  },
  {
    id: 'seller-boost',
    title: '신규 판매자 등록 시 노출 부스트',
    description: '판매자 등록 후 첫 서비스 등록을 완료하면 추천 영역 노출 우선권이 적용됩니다.',
    onClickKey: 'seller',
  },
]

function SidebarPromoBanners({ onPointEvent, onSellerEvent, onClose, hiddenBannerIds = [] }) {
  const visibleBanners = DEFAULT_BANNERS.filter((banner) => !hiddenBannerIds.includes(banner.id))
  return (
    <>
      {visibleBanners.map((banner) => (
        <section key={banner.id} className="panel-card account-event-banner">
          <button
            type="button"
            className="account-event-banner-close-btn"
            onClick={() => onClose?.(banner.id)}
            aria-label="이벤트 배너 닫기"
          >
            ×
          </button>
          <p className="badge">이벤트</p>
          <h3>{banner.title}</h3>
          <p>{banner.description}</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={banner.onClickKey === 'point' ? onPointEvent : onSellerEvent}
          >
            이벤트 보기
          </button>
        </section>
      ))}
    </>
  )
}

export default SidebarPromoBanners
