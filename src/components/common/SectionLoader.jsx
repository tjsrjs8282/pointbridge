import BrandLoader from './BrandLoader'

function SectionLoader({ label = '불러오는 중', minHeight = 160 }) {
  return (
    <section className="main-card section-loader-card" style={{ minHeight }}>
      <BrandLoader label={label} size="md" />
    </section>
  )
}

export default SectionLoader
