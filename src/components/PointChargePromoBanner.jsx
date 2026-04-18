/**
 * 포인트 충전 상단 프로모션 배너 슬롯.
 * 운영 시 `imageSrc`에 실제 배너 URL(또는 `/public` 경로)만 넘기면 됩니다.
 */
function PointChargePromoBanner({ imageSrc = '', alt = '프로모션 배너' }) {
  if (imageSrc) {
    return (
      <div className="points-promo-banner-wrap">
        <img className="points-promo-banner-img" src={imageSrc} alt={alt} loading="lazy" />
      </div>
    )
  }

  return (
    <div
      className="points-promo-banner-wrap points-promo-banner-wrap--placeholder"
      role="img"
      aria-label="프로모션 배너 (이미지 교체 예정)"
    >
      <span className="points-promo-banner-placeholder-text">프로모션 배너</span>
    </div>
  )
}

export default PointChargePromoBanner
