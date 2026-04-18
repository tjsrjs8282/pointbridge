import { useRef } from 'react'

function HorizontalCarousel({ children, className = '', scrollStep = 380, ariaLabel = '가로 캐러셀' }) {
  const trackRef = useRef(null)

  const scrollByStep = (direction) => {
    const node = trackRef.current
    if (!node) return
    node.scrollBy({
      left: direction === 'next' ? scrollStep : -scrollStep,
      behavior: 'smooth',
    })
  }

  return (
    <div className={`horizontal-carousel ${className}`.trim()}>
      <button
        type="button"
        className="horizontal-carousel-nav prev"
        aria-label={`${ariaLabel} 이전`}
        onClick={() => scrollByStep('prev')}
      >
        이전
      </button>
      <div ref={trackRef} className="horizontal-carousel-track" role="region" aria-label={ariaLabel}>
        {children}
      </div>
      <button
        type="button"
        className="horizontal-carousel-nav next"
        aria-label={`${ariaLabel} 다음`}
        onClick={() => scrollByStep('next')}
      >
        다음
      </button>
    </div>
  )
}

export default HorizontalCarousel
