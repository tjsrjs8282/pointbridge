function SellerCareerList({ careers = [], max = 10 }) {
  const safeCareers = Array.isArray(careers) ? careers.slice(0, max) : []

  return (
    <article className="seller-meta-tile careers">
      <header>
        <h3>경력</h3>
        {safeCareers.length > 0 ? <span className="seller-meta-count">{safeCareers.length}</span> : null}
      </header>
      <ul className="seller-meta-career-list">
        {safeCareers.length > 0 ? (
          safeCareers.map((career, index) => (
            <li key={`${career.title}-${career.organization}-${career.years}-${index}`}>
              <strong>{career.title}</strong>
              {career.organization ? <span>{career.organization}</span> : null}
              {career.years ? <em>{career.years}</em> : null}
            </li>
          ))
        ) : (
          <li className="empty">등록 정보 없음</li>
        )}
      </ul>
    </article>
  )
}

export default SellerCareerList
