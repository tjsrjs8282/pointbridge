function SellerManagementPage() {
  return (
    <div className="page-stack">
      <section className="main-card">
        <h1>판매관리</h1>
        <p>판매자 모드에서 서비스 등록, 견적, 응답 현황을 관리합니다.</p>
      </section>
      <section className="main-card list-card">
        <article>
          <h3>등록된 서비스</h3>
          <p>3개 · 평균 평점 4.9 · 최근 30일 주문 22건</p>
        </article>
        <article>
          <h3>신규 견적 요청</h3>
          <p>6건 대기중 · 평균 응답 목표 15분</p>
        </article>
      </section>
    </div>
  )
}

export default SellerManagementPage
