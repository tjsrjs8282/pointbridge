function SkeletonBlock({ width = '100%', height = 14, radius = 8, className = '' }) {
  return (
    <span
      className={`skeleton-block ${className}`.trim()}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  )
}

export default SkeletonBlock
