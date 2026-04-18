function StatusBadge({ status }) {
  const normalizedStatus = String(status ?? '').toLowerCase()
  const statusLabelMap = {
    pending: '대기중',
    accepted: '수락됨',
    rejected: '거절됨',
    completed: '완료',
    canceled: '취소',
    cancelled: '취소',
  }
  const label = statusLabelMap[normalizedStatus] ?? status

  return <span className={`order-status-badge status-${normalizedStatus || 'unknown'}`}>{label}</span>
}

export default StatusBadge
