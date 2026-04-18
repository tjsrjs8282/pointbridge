import SellerCareerList from './SellerCareerList'
import SellerTagGroup from './SellerTagGroup'

function SellerProfileMetaCompact({ seller }) {
  const extras = seller?.extras ?? {}

  return (
    <section className="main-card seller-meta-compact-card">
      <div className="seller-meta-compact-row top">
        <SellerTagGroup title="전문분야" items={extras.specialties} max={3} />
        <SellerTagGroup title="보유기술" items={extras.skills} max={10} />
        <SellerTagGroup title="자격증" items={extras.certificates} max={10} />
      </div>

      <div className="seller-meta-compact-row bottom">
        <SellerCareerList careers={extras.careers} max={10} />
        <article className="seller-meta-tile intro">
          <header>
            <h3>상세 소개</h3>
          </header>
          <p className="seller-meta-intro-text">
            {seller?.intro ? seller.intro : '등록된 소개가 없습니다.'}
          </p>
        </article>
      </div>
    </section>
  )
}

export default SellerProfileMetaCompact
