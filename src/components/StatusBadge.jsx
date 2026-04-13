function StatusBadge({ status }) {
  return <span className={`order-status-badge status-${status}`}>{status}</span>
}

export default StatusBadge
