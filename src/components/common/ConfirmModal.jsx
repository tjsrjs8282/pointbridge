function ConfirmModal({
  isOpen,
  title = '확인',
  message = '',
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  isConfirming = false,
}) {
  if (!isOpen) return null

  return (
    <div className="order-modal-overlay" role="presentation">
      <section className="order-modal-card confirm-modal-card" role="dialog" aria-modal="true">
        <div className="order-modal-head">
          <h2>{title}</h2>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            닫기
          </button>
        </div>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={isConfirming}>
            {cancelText}
          </button>
          <button type="button" className="order-submit-btn" onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? '처리 중...' : confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmModal
