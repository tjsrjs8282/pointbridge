function SectionTitle({ title, description }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}

export default SectionTitle
