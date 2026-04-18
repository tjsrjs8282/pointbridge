function MemberStatusIcon({
  tier,
  isSeller = false,
  className = '',
  size = 'md',
}) {
  const safeTier = tier ?? { key: 'newbie', icon: '🌱', label: 'Newbie' }

  return (
    <span className={`member-tier-display ${className}`.trim()}>
      {isSeller ? (
        <span className="member-status-tooltip-wrap">
          <span className={`member-status-icon seller ${size}`.trim()} role="img" aria-label="판매자" tabIndex={0}>
            🏪
          </span>
          <span className="member-status-tooltip" role="tooltip">
            판매자
          </span>
        </span>
      ) : null}
      <span className="member-status-tooltip-wrap">
        <span
          className={`member-status-icon ${safeTier.key} ${size}`.trim()}
          role="img"
          aria-label={safeTier.label}
          tabIndex={0}
        >
          {safeTier.icon}
        </span>
        <span className="member-status-tooltip" role="tooltip">
          {safeTier.label}
        </span>
      </span>
    </span>
  )
}

export default MemberStatusIcon
