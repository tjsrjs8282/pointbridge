function SidebarToggleButton({ isCollapsed, onToggle }) {
  return (
    <button
      type="button"
      className="sidebar-toggle-icon-btn"
      onClick={onToggle}
      aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
      title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {isCollapsed ? (
          <path
            d="M5 2.5l4 4.5-4 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M9 2.5l-4 4.5 4 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  )
}

export default SidebarToggleButton
