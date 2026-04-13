function PointCard({ title, value, subValue, action }) {
  return (
    <section className="main-card points-balance-card">
      <div>
        <p>{title}</p>
        <h2>{value}</h2>
        {subValue ? <span>{subValue}</span> : null}
      </div>
      {action}
    </section>
  )
}

export default PointCard
