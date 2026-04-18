function SidebarGuestPanel({ onLogin, onSignup }) {
  return (
    <div className="account-guest-notice simple">
      <strong>PointBridge 시작하기</strong>
      <p>PointBridge를 더 편리하게 시작해보세요.</p>
      <div className="account-guest-actions inline">
        <button type="button" className="btn-secondary" onClick={onLogin}>
          로그인
        </button>
        <button type="button" className="btn-primary" onClick={onSignup}>
          회원가입
        </button>
      </div>
    </div>
  )
}

export default SidebarGuestPanel
