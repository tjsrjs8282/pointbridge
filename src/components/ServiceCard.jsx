import PrimaryButton from './PrimaryButton'

function ServiceCard({ service, onOrder }) {
  return (
    <article className="seller-service-card">
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <div className="seller-service-meta">
        <span>{service.price.toLocaleString()}P</span>
        <span>옵션: {service.option}</span>
      </div>
      <PrimaryButton onClick={() => onOrder(service)}>주문 신청</PrimaryButton>
    </article>
  )
}

export default ServiceCard
