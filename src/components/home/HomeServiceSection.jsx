import SectionTitle from '../SectionTitle'
import ServiceCard from '../ServiceCard'

function HomeServiceSection({ title, services = [], onSelectService }) {
  return (
    <section className="main-card">
      <SectionTitle title={title} />
      <div className="seller-service-list">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} onOrder={() => onSelectService(service)} />
        ))}
      </div>
    </section>
  )
}

export default HomeServiceSection
