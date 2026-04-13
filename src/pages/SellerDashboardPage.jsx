function SellerDashboardPage() {
  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">판매관리</p>
        <h1>판매자 대시보드</h1>
        <p>서비스 등록, 견적, 진행중 주문을 관리하는 판매자 전용 화면입니다.</p>
      </section>
      <section className="main-card list-card">
        <article>
          <h3>신규 견적 요청</h3>
          <p>6건 대기중 · 평균 응답 목표 15분</p>
        </article>
        <article>
          <h3>활성 서비스</h3>
          <p>3개 공개중 · 평균 평점 4.9</p>
        </article>
      </section>
    </div>
  )
}

export default SellerDashboardPage
