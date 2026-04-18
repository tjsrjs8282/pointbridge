import { Link } from 'react-router-dom'
import PrimaryButton from './PrimaryButton'
import SecondaryButton from './SecondaryButton'

function ServiceCard({
  service,
  onOrder,
  canOrder = true,
  canAdminManage = false,
  onAdminDelete,
}) {
  return (
    <article className="seller-service-card compact">
      {service.thumbnailUrl ? (
        <div className="seller-service-thumb-wrap">
          <img src={service.thumbnailUrl} alt={`${service.name} 썸네일`} className="seller-service-thumb" />
        </div>
      ) : null}
      <div className="service-card-head">
        <h3>{service.name}</h3>
        <strong>{service.price.toLocaleString()}P</strong>
      </div>
      <p>{service.description}</p>
      <div className="seller-service-meta">
        <span>{service.usageCount ? `이용 ${service.usageCount}건` : `옵션 ${service.option}`}</span>
        <span>{service.category ?? '기타'}</span>
      </div>
      {service.tags?.length ? (
        <div className="seller-extra-chip-list">
          {service.tags.slice(0, 3).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      ) : null}
      <div className="seller-service-card-actions">
        <Link to={`/service/${service.id}`} className="seller-link-btn">
          상세 보기
        </Link>
        {canOrder ? <PrimaryButton onClick={() => onOrder(service)}>주문 신청</PrimaryButton> : null}
        {canAdminManage ? (
          <SecondaryButton onClick={() => onAdminDelete?.(service)}>삭제</SecondaryButton>
        ) : null}
      </div>
    </article>
  )
}

export default ServiceCard
