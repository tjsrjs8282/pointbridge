import SectionTitle from '../SectionTitle'
import ServiceCard from '../ServiceCard'
import HorizontalCarousel from '../common/HorizontalCarousel'

function HomeServiceSection({ title, services = [], onSelectService, canAdminManage = false, onAdminDeleteService }) {
  return (
    <section className="main-card">
      <SectionTitle title={title} />
      <HorizontalCarousel ariaLabel={title}>
        {services.map((service) => (
          <div key={service.id} className="carousel-item service">
            <ServiceCard
              service={service}
              onOrder={() => onSelectService(service)}
              canAdminManage={canAdminManage}
              onAdminDelete={onAdminDeleteService}
            />
          </div>
        ))}
      </HorizontalCarousel>
    </section>
  )
}

export default HomeServiceSection
