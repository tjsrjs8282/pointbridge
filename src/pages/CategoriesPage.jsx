import { MARKETPLACE_CATEGORIES } from '../constants/marketplaceTaxonomy'

function CategoriesPage() {
  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>카테고리</h1>
        <p>원하는 작업 분야를 빠르게 탐색해보세요.</p>
      </section>
      <section className="main-card">
        <div className="chip-grid">
          {MARKETPLACE_CATEGORIES.map((category) => (
            <span key={category}>{category}</span>
          ))}
        </div>
      </section>
    </div>
  )
}

export default CategoriesPage
