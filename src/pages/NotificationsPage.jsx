import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CommunityPagination from '../components/community/CommunityPagination'
import useAuth from '../hooks/useAuth'
import {
  ensureChatRoomForUsers,
} from '../lib/chat'
import {
  CHAT_REJECTION_REASONS,
  deleteAllNotificationsForUser,
  deleteNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  pushChatDecisionNotification,
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
const PAGE_SIZE = 5
const ACTION_TYPE_LABELS = {
  order_request: '서비스 신청',
  order_accepted: '서비스 수락',
  order_rejected: '서비스 거절',
  chat_request: '채팅 신청',
  chat_request_sent: '채팅 신청 접수',
  chat_request_accepted: '채팅 신청 수락',
  chat_request_rejected: '채팅 신청 거절',
  chat_started: '채팅 시작',
  system: '시스템',
}
const STATUS_LABELS = {
  pending: '대기중',
  accepted: '수락됨',
  rejected: '거절됨',
}

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
  const [currentPage, setCurrentPage] = useState(1)
  const [rejectModalState, setRejectModalState] = useState({
    isOpen: false,
    notificationId: '',
    actionType: 'order_request',
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
      queueMicrotask(() => {
        if (!mounted) return
        setNotifications([])
        setIsLoading(false)
      })
      return () => {
        mounted = false
      }
    }

    queueMicrotask(() => {
      if (!mounted) return
      setIsLoading(true)
    })
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
    if (activeTab === 'chat') {
      return notifications.filter((item) =>
        ['chat_started', 'chat_request', 'chat_request_sent', 'chat_request_accepted', 'chat_request_rejected'].includes(
          item.actionType,
        ),
      )
    }
    return notifications.filter((item) => item.actionType === 'system')
  }, [activeTab, notifications])
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE))
  const pagedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredNotifications.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, filteredNotifications])
  const rejectReasonOptions = rejectModalState.actionType === 'chat_request' ? CHAT_REJECTION_REASONS : REJECTION_REASONS

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  useEffect(() => {
    if (currentPage <= totalPages) return
    setCurrentPage(totalPages)
  }, [currentPage, totalPages])

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

  const openChatForNotification = async (item) => {
    if (!item?.sellerId) return
    const counterpartId = item.sellerId === user?.id ? item.buyerId : item.sellerId
    if (!counterpartId) return
    const { data, error } = await ensureChatRoomForUsers({
      buyerUserId: item.buyerId,
      sellerUserId: item.sellerId,
      requestId: item.requestId ?? null,
    })
    if (error || !data?.roomId) {
      setStatusMessage(error?.message ?? '채팅방을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    navigate('/chat', { state: { openRoomId: data.roomId } })
  }

  const statusLabel = (status) => STATUS_LABELS[status] ?? status ?? '-'
  const actionTypeLabel = (actionType, fallbackType) => {
    if (ACTION_TYPE_LABELS[actionType]) return ACTION_TYPE_LABELS[actionType]
    if (ACTION_TYPE_LABELS[fallbackType]) return ACTION_TYPE_LABELS[fallbackType]
    return '알림'
  }
  const readStateLabel = (isRead) => (isRead ? '읽음' : '안읽음')

  const handleAccept = async (item) => {
    if (!user?.id) {
      requireAuth({ reason: '신청 수락은 로그인 후 이용할 수 있습니다.' })
      return
    }
    setIsActing(true)
    await updateRequestStatus({ notificationId: item.notificationId, status: 'accepted' })
    const isChatRequest = item.actionType === 'chat_request'
    const result = isChatRequest
      ? await pushChatDecisionNotification({
          buyerUserId: item.buyerId,
          sellerUserId: item.sellerId,
          actorName: displayName,
          status: 'accepted',
          requestId: item.requestId,
        })
      : await pushDecisionNotification({
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
    if (result.error) {
      setStatusMessage(result.error.message ?? '신청 수락 처리 중 오류가 발생했습니다.')
      return
    }
    setStatusMessage(
      isChatRequest
        ? '채팅신청이 수락되었습니다. 이제 대화를 시작할 수 있습니다.'
        : '신청을 수락했습니다. 채팅으로 바로 이동합니다.',
    )
    await openChatForNotification(item)
  }

  const openRejectModal = (item) => {
    const isChatRequest = item.actionType === 'chat_request'
    setRejectModalState({
      isOpen: true,
      notificationId: item.notificationId,
      actionType: item.actionType,
      reasonCode: (isChatRequest ? CHAT_REJECTION_REASONS : REJECTION_REASONS)[0].code,
    })
  }

  const handleRejectConfirm = async () => {
    const target = notifications.find((item) => item.notificationId === rejectModalState.notificationId)
    if (!target) return

    const isChatRequest = target.actionType === 'chat_request'
    const selectedReasons = isChatRequest ? CHAT_REJECTION_REASONS : REJECTION_REASONS
    const selectedReasonText = selectedReasons.find((item) => item.code === rejectModalState.reasonCode)?.label ?? ''

    setIsActing(true)
    await updateRequestStatus({
      notificationId: target.notificationId,
      status: 'rejected',
      rejectionReasonCode: rejectModalState.reasonCode,
      rejectionReasonText: selectedReasonText,
    })
    const result = isChatRequest
      ? await pushChatDecisionNotification({
          buyerUserId: target.buyerId,
          sellerUserId: target.sellerId,
          actorName: displayName,
          status: 'rejected',
          rejectionReasonCode: rejectModalState.reasonCode,
          rejectionReasonText: selectedReasonText,
          requestId: target.requestId,
        })
      : await pushDecisionNotification({
          buyerUserId: target.buyerId,
          sellerUserId: target.sellerId,
          actorName: displayName,
          serviceTitle: target.serviceTitle,
          points: target.points,
          status: 'rejected',
          orderId: target.orderId ?? null,
          rejectionReasonCode: rejectModalState.reasonCode,
          rejectionReasonText: selectedReasonText,
          requestId: target.requestId,
        })
    setIsActing(false)
    if (result.error) {
      setStatusMessage(result.error.message ?? '신청 거절 처리 중 오류가 발생했습니다.')
      return
    }
    setRejectModalState({
      isOpen: false,
      notificationId: '',
      actionType: 'order_request',
      reasonCode: REJECTION_REASONS[0].code,
    })
    setStatusMessage(
      isChatRequest
        ? selectedReasonText
          ? `다음 사유로 채팅신청이 거절되었습니다: ${selectedReasonText}`
          : '채팅신청이 거절되었습니다.'
        : '선택한 사유로 신청을 거절했습니다.',
    )
  }

  const handleDeleteNotification = async (notificationId) => {
    if (!notificationId || !user?.id) return
    const { error } = await deleteNotification({ notificationId, userId: user.id })
    if (error) {
      setStatusMessage(error.message ?? '알림 삭제 중 오류가 발생했습니다.')
      return
    }
    setNotifications((prev) => prev.filter((item) => item.notificationId !== notificationId))
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    const { error } = await markAllNotificationsAsRead({ userId: user.id })
    if (error) {
      setStatusMessage(error.message ?? '전체 읽음 처리 중 오류가 발생했습니다.')
      return
    }
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    setStatusMessage('모든 알림을 읽음으로 처리했습니다.')
  }

  const handleDeleteAllNotifications = async () => {
    if (!user?.id) return
    const { error } = await deleteAllNotificationsForUser({ userId: user.id })
    if (error) {
      setStatusMessage(error.message ?? '전체 알림 삭제 중 오류가 발생했습니다.')
      return
    }
    setNotifications([])
    setCurrentPage(1)
    setStatusMessage('모든 알림을 삭제했습니다.')
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
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
        {filteredNotifications.length > 0 ? (
          <div className="notification-bulk-actions">
            <button type="button" className="btn-secondary" onClick={handleMarkAllAsRead}>
              전체 읽음
            </button>
            <button type="button" className="btn-secondary" onClick={handleDeleteAllNotifications}>
              전체 삭제
            </button>
          </div>
        ) : null}
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
          pagedNotifications.map((item) => {
            const canAct =
              ['order_request', 'chat_request'].includes(item.actionType) &&
              item.status === 'pending' &&
              item.sellerId === user?.id
            const canOpenChat = ['chat_request_accepted', 'chat_started', 'order_accepted'].includes(item.actionType)
            return (
              <article key={item.notificationId} className="main-card notification-card">
                <div className="notification-head">
                  <span className="badge">{actionTypeLabel(item.actionType, item.type)}</span>
                  <div className="notification-head-right">
                    <span className={`notification-status ${item.status}`}>{statusLabel(item.status)}</span>
                    <span className={`notification-read-state ${item.isRead ? 'read' : 'unread'}`}>
                      {readStateLabel(item.isRead)}
                    </span>
                  </div>
                </div>
                <p>{item.message}</p>
                <div className="notification-meta-grid">
                  <span>신청자 {item.actorName ?? '-'}</span>
                  <span>{item.actionType?.startsWith('chat') ? '유형 채팅신청' : `서비스 ${item.serviceTitle || '-'}`}</span>
                  <span>
                    {item.actionType?.startsWith('chat')
                      ? `상태 ${statusLabel(item.status)}`
                      : `포인트 ${Number(item.points ?? 0).toLocaleString()}P`}
                  </span>
                  <span>시간 {formatTime(item.createdAt)}</span>
                </div>
                {item.status === 'rejected' && item.rejectionReasonText ? (
                  <p className="muted">거절 사유: {item.rejectionReasonText}</p>
                ) : null}
                {canAct ? (
                  <div className="notification-actions">
                    <button type="button" className="btn-primary" onClick={() => handleAccept(item)}>
                      {isActing ? '처리 중...' : item.actionType === 'chat_request' ? '채팅 수락' : '수락'}
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
                {canOpenChat && item.status === 'accepted' ? (
                  <div className="notification-actions">
                    <button type="button" className="btn-secondary" onClick={() => openChatForNotification(item)}>
                      채팅 열기
                    </button>
                  </div>
                ) : null}
                <div className="notification-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleDeleteNotification(item.notificationId)}
                  >
                    삭제
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>
      {filteredNotifications.length > PAGE_SIZE ? (
        <CommunityPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      ) : null}

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
                    actionType: 'order_request',
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
                {rejectReasonOptions.map((reason) => (
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
