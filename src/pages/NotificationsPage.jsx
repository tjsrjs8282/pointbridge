import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import {
  ensureChatRoom,
  readChatMessages,
  readChatRooms,
  saveChatMessages,
  saveChatRooms,
} from '../lib/chat'
import {
  markNotificationAsRead,
  pushDecisionNotification,
  REJECTION_REASONS,
  readNotificationsForUser,
} from '../lib/notifications'

const tabs = [
  { key: 'all', label: '전체' },
  { key: 'service', label: '신청 관련' },
  { key: 'chat', label: '채팅' },
  { key: 'system', label: '시스템' },
]

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

function NotificationsPage() {
  const navigate = useNavigate()
  const { user, profile, requireAuth } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isActing, setIsActing] = useState(false)
  const [rejectModalState, setRejectModalState] = useState({
    isOpen: false,
    notificationId: '',
    reasonCode: REJECTION_REASONS[0].code,
  })

  const displayName =
    profile?.nickname ??
    profile?.name ??
    user?.user_metadata?.nickname ??
    user?.user_metadata?.name ??
    user?.email?.split('@')?.[0] ??
    '사용자'

  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      setNotifications([])
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    readNotificationsForUser({ userId: user.id, displayName })
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          setStatusMessage(error.message ?? '알림 목록을 불러오지 못했습니다.')
          setNotifications([])
          return
        }
        setNotifications(data ?? [])
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [displayName, user?.id])

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications
    if (activeTab === 'service') {
      return notifications.filter((item) =>
        ['order_request', 'order_accepted', 'order_rejected'].includes(item.actionType),
      )
    }
    if (activeTab === 'chat') return notifications.filter((item) => item.actionType === 'chat_started')
    return notifications.filter((item) => item.actionType === 'system')
  }, [activeTab, notifications])

  const updateRequestStatus = async ({
    notificationId,
    status,
    rejectionReasonCode = '',
    rejectionReasonText = '',
  }) => {
    setNotifications((prev) =>
      prev.map((item) => {
        if (item.notificationId !== notificationId) return item
        return {
          ...item,
          status,
          rejectionReasonCode,
          rejectionReasonText,
          isRead: true,
        }
      }),
    )
    await markNotificationAsRead({ notificationId })
  }

  const openChatForNotification = (item) => {
    if (!item?.sellerId) return
    const counterpartId = item.sellerId === user?.id ? item.buyerId : item.sellerId
    const counterpartName = item.sellerId === user?.id ? item.actorName ?? '구매자' : item.actorName ?? '판매자'
    if (!counterpartId) return
    const myNickname =
      profile?.nickname ??
      profile?.name ??
      user?.user_metadata?.nickname ??
      user?.user_metadata?.name ??
      user?.email?.split('@')?.[0] ??
      '나'
    const myAvatarUrl = profile?.avatar_url ?? ''
    const myAvatarText = myNickname.slice(0, 2).toUpperCase()
    const rooms = readChatRooms({
      myNickname,
      myAvatarText,
      myAvatarUrl,
      role: profile?.role ?? '사용자',
    })
    const messagesByRoom = readChatMessages({ myNickname })
    const ensured = ensureChatRoom({
      rooms,
      messagesByRoom,
      sellerUserId: counterpartId,
      sellerName: counterpartName,
      sellerRole: '판매자',
      systemMessage: '서비스 신청이 수락되어 채팅이 시작되었습니다.',
      initialMessage: '안녕하세요, 신청 건 관련해서 문의드립니다.',
    })
    saveChatRooms(ensured.rooms)
    saveChatMessages(ensured.messagesByRoom)
    navigate('/chat', { state: { openRoomId: ensured.roomId } })
  }

  const handleAccept = async (item) => {
    if (!user?.id) {
      requireAuth({ reason: '신청 수락은 로그인 후 이용할 수 있습니다.' })
      return
    }
    setIsActing(true)
    await updateRequestStatus({ notificationId: item.notificationId, status: 'accepted' })
    const { error } = await pushDecisionNotification({
      buyerUserId: item.buyerId,
      sellerUserId: item.sellerId,
      actorName: displayName,
      serviceTitle: item.serviceTitle,
      points: item.points,
      status: 'accepted',
      orderId: item.orderId ?? null,
      requestId: item.requestId,
    })
    setIsActing(false)
    if (error) {
      setStatusMessage(error.message ?? '신청 수락 처리 중 오류가 발생했습니다.')
      return
    }
    setStatusMessage('신청을 수락했습니다. 채팅으로 바로 이동합니다.')
    openChatForNotification(item)
  }

  const openRejectModal = (item) => {
    setRejectModalState({
      isOpen: true,
      notificationId: item.notificationId,
      reasonCode: REJECTION_REASONS[0].code,
    })
  }

  const handleRejectConfirm = async () => {
    const target = notifications.find((item) => item.notificationId === rejectModalState.notificationId)
    if (!target) return

    setIsActing(true)
    await updateRequestStatus({
      notificationId: target.notificationId,
      status: 'rejected',
      rejectionReasonCode: rejectModalState.reasonCode,
      rejectionReasonText:
        REJECTION_REASONS.find((item) => item.code === rejectModalState.reasonCode)?.label ?? '',
    })
    const { error } = await pushDecisionNotification({
      buyerUserId: target.buyerId,
      sellerUserId: target.sellerId,
      actorName: displayName,
      serviceTitle: target.serviceTitle,
      points: target.points,
      status: 'rejected',
      orderId: target.orderId ?? null,
      rejectionReasonCode: rejectModalState.reasonCode,
      rejectionReasonText:
        REJECTION_REASONS.find((item) => item.code === rejectModalState.reasonCode)?.label ?? '',
      requestId: target.requestId,
    })
    setIsActing(false)
    if (error) {
      setStatusMessage(error.message ?? '신청 거절 처리 중 오류가 발생했습니다.')
      return
    }
    setRejectModalState({
      isOpen: false,
      notificationId: '',
      reasonCode: REJECTION_REASONS[0].code,
    })
    setStatusMessage('선택한 사유로 신청을 거절했습니다.')
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">알림</p>
        <h1>알림</h1>
        <p>신청 접수, 수락/거절, 채팅 시작 상태를 한 곳에서 확인합니다.</p>
      </section>

      <section className="main-card">
        <div className="notifications-tab-list">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {statusMessage ? <p className="muted">{statusMessage}</p> : null}

      <section className="notifications-list">
        {isLoading ? (
          <section className="main-card">
            <p className="muted">알림 목록을 불러오는 중입니다...</p>
          </section>
        ) : filteredNotifications.length === 0 ? (
          <section className="main-card">
            <p className="muted">표시할 알림이 없습니다.</p>
          </section>
        ) : (
          filteredNotifications.map((item) => {
            const canAct =
              item.actionType === 'order_request' &&
              item.status === 'pending' &&
              item.sellerId === user?.id
            return (
              <article key={item.notificationId} className="main-card notification-card">
                <div className="notification-head">
                  <span className="badge">{item.actionType ?? item.type}</span>
                  <span className={`notification-status ${item.status}`}>{item.status}</span>
                </div>
                <p>{item.message}</p>
                <div className="notification-meta-grid">
                  <span>신청자 {item.actorName ?? '-'}</span>
                  <span>서비스 {item.serviceTitle || '-'}</span>
                  <span>포인트 {Number(item.points ?? 0).toLocaleString()}P</span>
                  <span>시간 {formatTime(item.createdAt)}</span>
                </div>
                {item.status === 'rejected' && item.rejectionReasonText ? (
                  <p className="muted">거절 사유: {item.rejectionReasonText}</p>
                ) : null}
                {canAct ? (
                  <div className="notification-actions">
                    <button type="button" className="btn-primary" onClick={() => handleAccept(item)}>
                      {isActing ? '처리 중...' : '수락'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => openRejectModal(item)}
                      disabled={isActing}
                    >
                      거절
                    </button>
                  </div>
                ) : null}
              </article>
            )
          })
        )}
      </section>

      {rejectModalState.isOpen ? (
        <div className="order-modal-overlay" role="presentation">
          <section className="order-modal-card notification-reject-modal" role="dialog" aria-modal="true">
            <div className="order-modal-head">
              <h2>거절 사유 선택</h2>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setRejectModalState({
                    isOpen: false,
                    notificationId: '',
                    reasonCode: REJECTION_REASONS[0].code,
                  })
                }
              >
                닫기
              </button>
            </div>
            <label className="order-field">
              <span>사유</span>
              <select
                value={rejectModalState.reasonCode}
                onChange={(event) =>
                  setRejectModalState((prev) => ({
                    ...prev,
                    reasonCode: event.target.value,
                  }))
                }
              >
                {REJECTION_REASONS.map((reason) => (
                  <option key={reason.code} value={reason.code}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="order-submit-btn" onClick={handleRejectConfirm} disabled={isActing}>
              {isActing ? '전송 중...' : '거절 사유 전송'}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default NotificationsPage
