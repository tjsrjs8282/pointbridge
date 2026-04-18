import MemberStatusIcon from '../common/MemberStatusIcon'

function SidebarUserPanel({
  nickname,
  avatarText,
  avatarUrl,
  tier,
  isSellerRegistered = false,
  pointBalance,
  onProfile,
  onPointCharge,
  actions = [],
}) {
  return (
    <>
      <button
        type="button"
        className="right-profile-row account-link"
        onClick={onProfile}
        aria-label="마이페이지로 이동"
      >
        <div className="right-profile-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="내 프로필 이미지" /> : avatarText}
        </div>
        <div className="account-hub-profile-text">
          <div className="profile-status-head profile-status-head--sidebar">
            <span className="profile-name profile-status-head__name">{nickname}</span>
            <div className="profile-status-head__icons">
              <MemberStatusIcon tier={tier} isSeller={isSellerRegistered} className="sidebar-member-status-icon" size="sm" />
            </div>
          </div>
        </div>
      </button>

      <div className="account-point-block">
        <div className="account-point-top-row">
          <span className="account-point-label">보유 포인트</span>
          <button type="button" className="account-point-charge-link" onClick={onPointCharge}>
            충전하기
          </button>
        </div>
        <strong className="account-point-balance">{pointBalance.toLocaleString()}P</strong>
      </div>

      <div className="account-hub-actions">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
            onClick={action.onClick}
            title={action.label}
            aria-label={action.label}
          >
            {action.label}
          </button>
        ))}
      </div>
    </>
  )
}

export default SidebarUserPanel
