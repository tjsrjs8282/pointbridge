function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <p className="app-footer-brand">PointBridge</p>
        <div className="app-footer-links">
          <button type="button">이용약관</button>
          <button type="button">개인정보처리방침</button>
          <button type="button">고객문의</button>
        </div>
        <span className="app-footer-copy">© {new Date().getFullYear()} PointBridge. All rights reserved.</span>
      </div>
    </footer>
  )
}

export default AppFooter
