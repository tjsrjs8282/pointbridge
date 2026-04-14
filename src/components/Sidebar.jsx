import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

const baseMenus = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/sellers', label: '판매자 찾기', icon: '🔎' },
  { to: '/chat', label: '채팅', requiresAuth: true, icon: '💬' },
  { to: '/settings', label: '설정', requiresAuth: true, icon: '⚙️' },
]

function Sidebar({ isSellerMode, isCollapsed, onToggleCollapse }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { requireAuth } = useAuth()

  const handleProtectedNavigate = ({ to, label }) => {
    requireAuth({
      reason: `${label} 기능은 로그인 후 이용할 수 있습니다.`,
      onSuccess: () => navigate(to),
    })
  }

  const renderMenuContent = (menu) => (
    <>
      <span className="sidebar-link-icon" aria-hidden="true">{menu.icon}</span>
      <span className="sidebar-link-text">{menu.label}</span>
      <span className="sidebar-tooltip" role="tooltip">{menu.label}</span>
    </>
  )

  return (
    <aside className={`sidebar-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <p>PointBridge</p>
        <span>WORK SERVICE HUB</span>
      </div>
      <nav className="sidebar-nav">
        {baseMenus.map((menu) =>
          menu.requiresAuth ? (
            <button
              key={menu.to}
              type="button"
              className={`sidebar-link ${location.pathname === menu.to ? 'active' : ''}`.trim()}
              onClick={() => handleProtectedNavigate(menu)}
              aria-label={menu.label}
              title={menu.label}
            >
              {renderMenuContent(menu)}
            </button>
          ) : (
            <NavLink
              key={menu.to}
              to={menu.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`.trim()
              }
              end={menu.to === '/'}
              aria-label={menu.label}
              title={menu.label}
            >
              {renderMenuContent(menu)}
            </NavLink>
          ),
        )}
        {isSellerMode ? (
          <button
            type="button"
            className={`sidebar-link seller ${location.pathname === '/seller-dashboard' ? 'active' : ''}`.trim()}
            onClick={() =>
              handleProtectedNavigate({
                to: '/seller-dashboard',
                label: '판매관리',
                icon: '🧰',
              })
            }
            aria-label="판매관리"
            title="판매관리"
          >
            {renderMenuContent({ label: '판매관리', icon: '🧰' })}
          </button>
        ) : null}
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          <span>{isCollapsed ? '»' : '«'}</span>
          <span className="sidebar-link-text">{isCollapsed ? '펼치기' : '접기'}</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
