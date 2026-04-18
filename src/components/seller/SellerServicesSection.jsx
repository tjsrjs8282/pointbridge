import ServiceCard from '../ServiceCard'

function SellerServicesSection({ services, isOwnerView, onOpenCreateModal, onOrder }) {
  return (
    <section className="main-card">
      <div className="seller-services-head">
        <h2>제공 서비스</h2>
        {isOwnerView ? (
          <button type="button" className="btn-primary" onClick={onOpenCreateModal}>
            서비스 추가
          </button>
        ) : null}
      </div>
      <div className="seller-service-list seller-service-list-fixed">
        {services.length === 0 ? (
          <div className="seller-service-empty-state">
            <p className="muted">현재 등록된 서비스가 없습니다.</p>
          </div>
        ) : (
          services.map((service) => (
            <ServiceCard key={service.id} service={service} onOrder={onOrder} canOrder={!isOwnerView} />
          ))
        )}
      </div>
    </section>
  )
}

export default SellerServicesSection
