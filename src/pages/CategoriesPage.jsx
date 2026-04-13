function CategoriesPage() {
  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">카테고리</p>
        <h1>카테고리</h1>
        <p>원하는 작업 분야를 빠르게 탐색해보세요.</p>
      </section>
      <section className="main-card">
        <div className="chip-grid">
          <span>웹/앱 개발</span>
          <span>그래픽 디자인</span>
          <span>영상 편집</span>
          <span>생활심부름</span>
          <span>청소</span>
          <span>설치/수리</span>
        </div>
      </section>
    </div>
  )
}

export default CategoriesPage
