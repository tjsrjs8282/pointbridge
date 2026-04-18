function BrandLoader({ label = '불러오는 중', size = 'md' }) {
  return (
    <div className={`brand-loader brand-loader-${size}`} role="status" aria-live="polite">
      <span className="brand-loader-orb">
        <span className="brand-loader-orb-core" />
        <span className="brand-loader-orb-ring" />
      </span>
      <span className="brand-loader-label">{label}</span>
    </div>
  )
}

export default BrandLoader
