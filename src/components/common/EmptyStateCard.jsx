function EmptyStateCard({ title = '표시할 데이터가 없습니다.', description = '' }) {
  return (
    <section className="main-card empty-state-card">
      <h3>{title}</h3>
      {description ? <p className="muted">{description}</p> : null}
    </section>
  )
}

export default EmptyStateCard
