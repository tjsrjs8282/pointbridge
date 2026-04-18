import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import useAuth from '../hooks/useAuth'
import {
  adminApplyPointAdjustment,
  adminDeletePost,
  adminDeleteProfile,
  adminDeleteSellerProfile,
  adminDeleteService,
  adminHideReview,
  adminListOrders,
  adminListPosts,
  adminListProfiles,
  adminListReviews,
  adminListSellerProfiles,
  adminListServices,
  adminUpdateProfile,
} from '../lib/admin'
import { pushAdminNotification } from '../lib/notifications'
import { isAdminProfile } from '../lib/permissions'

const ADMIN_TABS = [
  { key: 'members', label: '회원 관리' },
  { key: 'sellers', label: '판매자 관리' },
  { key: 'services', label: '서비스 관리' },
  { key: 'posts', label: '게시판 관리' },
  { key: 'notifications', label: '알림/메시지 관리' },
  { key: 'summary', label: '통계/요약' },
]

function AdminPage() {
  const { profile, user } = useAuth()
  const [activeTab, setActiveTab] = useState('members')
  const [statusMessage, setStatusMessage] = useState('')
  const [memberRows, setMemberRows] = useState([])
  const [sellerRows, setSellerRows] = useState([])
  const [serviceRows, setServiceRows] = useState([])
  const [postRows, setPostRows] = useState([])
  const [orderRows, setOrderRows] = useState([])
  const [reviewRows, setReviewRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [notificationForm, setNotificationForm] = useState({
    mode: 'single',
    userIds: '',
    title: '',
    body: '',
  })
  const [pointAdjustForm, setPointAdjustForm] = useState({
    userId: '',
    amount: '',
    reason: '관리자 포인트 조정',
  })

  const canAccessAdminPage = isAdminProfile(profile)
  const totalSellerCount = useMemo(
    () => memberRows.filter((item) => Boolean(item.is_seller) || item.seller_status === 'active').length,
    [memberRows],
  )

  const loadAdminData = async () => {
    if (!canAccessAdminPage) return
    setIsLoading(true)
    const [
      membersResult,
      sellersResult,
      servicesResult,
      postsResult,
      ordersResult,
      reviewsResult,
    ] = await Promise.all([
      adminListProfiles(),
      adminListSellerProfiles(),
      adminListServices(),
      adminListPosts(),
      adminListOrders(),
      adminListReviews(),
    ])
    setIsLoading(false)

    if (membersResult.error) setStatusMessage(membersResult.error.message)
    if (sellersResult.error) setStatusMessage(sellersResult.error.message)
    if (servicesResult.error) setStatusMessage(servicesResult.error.message)
    if (postsResult.error) setStatusMessage(postsResult.error.message)
    if (ordersResult.error) setStatusMessage(ordersResult.error.message)
    if (reviewsResult.error) setStatusMessage(reviewsResult.error.message)

    setMemberRows(membersResult.data ?? [])
    setSellerRows(sellersResult.data ?? [])
    setServiceRows(servicesResult.data ?? [])
    setPostRows(postsResult.data ?? [])
    setOrderRows(ordersResult.data ?? [])
    setReviewRows(reviewsResult.data ?? [])
  }

  useEffect(() => {
    loadAdminData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, canAccessAdminPage])

  if (!canAccessAdminPage) {
    return <Navigate to="/" replace />
  }

  const handleMemberUpdate = async (member) => {
    const { error } = await adminUpdateProfile({
      userId: member.id,
      role: member.role ?? 'buyer',
      isAdmin: Boolean(member.is_admin),
      isSeller: Boolean(member.is_seller),
      sellerStatus: member.seller_status ?? 'none',
      nickname: member.nickname ?? '',
    })
    if (error) {
      setStatusMessage(error.message)
      return
    }
    setStatusMessage('회원 정보가 저장되었습니다.')
    loadAdminData()
  }

  const handleDeleteMember = async (targetUserId) => {
    if (!targetUserId) return
    const confirmed = window.confirm('정말 해당 회원을 삭제하시겠습니까?')
    if (!confirmed) return
    const { error } = await adminDeleteProfile({ userId: targetUserId })
    if (error) {
      setStatusMessage(error.message)
      return
    }
    setStatusMessage('회원이 삭제되었습니다.')
    loadAdminData()
  }

  const handleDeleteSeller = async (targetUserId) => {
    if (!targetUserId) return
    const confirmed = window.confirm('해당 판매자 프로필을 비활성화할까요?')
    if (!confirmed) return
    const { error } = await adminDeleteSellerProfile({ userId: targetUserId })
    if (error) {
      setStatusMessage(error.message)
      return
    }
    setStatusMessage('판매자 프로필이 비활성화되었습니다.')
    loadAdminData()
  }

  const handleDeleteService = async (serviceId) => {
    if (!serviceId) return
    const confirmed = window.confirm('해당 서비스를 삭제(비노출)할까요?')
    if (!confirmed) return
    const { error } = await adminDeleteService({ serviceId })
    if (error) {
      setStatusMessage(error.message)
      return
    }
    setStatusMessage('서비스가 삭제되었습니다.')
    loadAdminData()
  }

  const handleDeletePost = async (postId) => {
    if (!postId) return
    const confirmed = window.confirm('해당 게시글을 삭제(숨김)할까요?')
    if (!confirmed) return
    const { error } = await adminDeletePost({ postId })
    if (error) {
      setStatusMessage(error.message)
      return
    }
    setStatusMessage('게시글이 삭제되었습니다.')
    loadAdminData()
  }

  const handleToggleReviewHidden = async (reviewId, isHidden) => {
    const { error } = await adminHideReview({ reviewId, isHidden: !isHidden })
    if (error) {
      setStatusMessage(error.message)
      return
    }
    setStatusMessage(!isHidden ? '리뷰를 숨김 처리했습니다.' : '리뷰 숨김을 해제했습니다.')
    loadAdminData()
  }

  const handleSendAdminNotification = async (event) => {
    event.preventDefault()
    const { mode, userIds, title, body } = notificationForm
    const normalizedTitle = String(title ?? '').trim()
    const normalizedBody = String(body ?? '').trim()
    if (!normalizedTitle || !normalizedBody) {
      setStatusMessage('알림 제목과 내용을 입력해 주세요.')
      return
    }

    let targetUserIds = []
    if (mode === 'all') {
      targetUserIds = memberRows.map((item) => item.id)
    } else {
      targetUserIds = String(userIds ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    if (targetUserIds.length === 0) {
      setStatusMessage('알림을 보낼 회원 ID를 입력해 주세요.')
      return
    }

    const { error } = await pushAdminNotification({
      userIds: targetUserIds,
      title: normalizedTitle,
      body: normalizedBody,
      notificationType: 'admin_message',
      actorName: profile?.nickname ?? profile?.name ?? 'PointBridge 운영팀',
    })
    if (error) {
      setStatusMessage(error.message)
      return
    }
    setStatusMessage(`운영 알림 발송 완료 (${targetUserIds.length}명)`)
    setNotificationForm((prev) => ({ ...prev, title: '', body: '' }))
  }

  const handlePointAdjustment = async (event) => {
    event.preventDefault()
    const { userId, amount, reason } = pointAdjustForm
    const safeAmount = Number(amount)
    if (!userId.trim() || !Number.isFinite(safeAmount) || safeAmount === 0) {
      setStatusMessage('포인트 조정 대상/금액을 확인해 주세요.')
      return
    }
    const { error } = await adminApplyPointAdjustment({
      userId: userId.trim(),
      amount: safeAmount,
      reason: reason.trim() || '관리자 포인트 조정',
    })
    if (error) {
      setStatusMessage(error.message)
      return
    }
    setStatusMessage('포인트 조정이 반영되었습니다.')
    setPointAdjustForm((prev) => ({ ...prev, amount: '' }))
    loadAdminData()
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>관리자 전용 페이지</h1>
        <p>회원/판매자/서비스/게시판/운영 알림을 통합 관리합니다.</p>
      </section>

      <section className="main-card admin-tabs-card">
        <div className="admin-tab-list">
          {ADMIN_TABS.map((tab) => (
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
      {isLoading ? <p className="muted">관리 데이터 불러오는 중...</p> : null}

      {activeTab === 'members' ? (
        <section className="main-card admin-table-card">
          <h2>회원 관리</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>닉네임</th>
                  <th>이메일</th>
                  <th>권한</th>
                  <th>판매자</th>
                  <th>가입일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <input
                        type="text"
                        value={member.nickname ?? ''}
                        onChange={(event) =>
                          setMemberRows((prev) =>
                            prev.map((row) =>
                              row.id === member.id ? { ...row, nickname: event.target.value } : row,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>{member.email || '-'}</td>
                    <td>
                      <select
                        value={member.role ?? 'buyer'}
                        onChange={(event) =>
                          setMemberRows((prev) =>
                            prev.map((row) => (row.id === member.id ? { ...row, role: event.target.value } : row)),
                          )
                        }
                      >
                        <option value="buyer">buyer</option>
                        <option value="seller">seller</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={member.seller_status ?? 'none'}
                        onChange={(event) =>
                          setMemberRows((prev) =>
                            prev.map((row) =>
                              row.id === member.id
                                ? {
                                    ...row,
                                    seller_status: event.target.value,
                                    is_seller: event.target.value === 'active',
                                  }
                                : row,
                            ),
                          )
                        }
                      >
                        <option value="none">none</option>
                        <option value="pending">pending</option>
                        <option value="active">active</option>
                        <option value="blocked">blocked</option>
                        <option value="deleted">deleted</option>
                      </select>
                    </td>
                    <td>{member.created_at ? String(member.created_at).slice(0, 10) : '-'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <SecondaryButton onClick={() => handleMemberUpdate(member)}>저장</SecondaryButton>
                        <SecondaryButton onClick={() => handleDeleteMember(member.id)}>삭제</SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'sellers' ? (
        <section className="main-card admin-table-card">
          <h2>판매자 관리</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>판매자명</th>
                  <th>이메일</th>
                  <th>카테고리</th>
                  <th>서비스 수</th>
                  <th>가격 범위</th>
                  <th>상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {sellerRows.map((seller) => (
                  <tr key={seller.id}>
                    <td>{seller.display_name}</td>
                    <td>{seller.email || '-'}</td>
                    <td>{(seller.categories ?? []).join(', ') || '-'}</td>
                    <td>{seller.service_stats?.activeCount ?? 0}</td>
                    <td>
                      {(seller.service_stats?.minPrice ?? 0).toLocaleString()}P ~{' '}
                      {(seller.service_stats?.maxPrice ?? 0).toLocaleString()}P
                    </td>
                    <td>{seller.seller_status ?? (seller.is_active ? 'active' : 'inactive')}</td>
                    <td>
                      <div className="admin-row-actions">
                        <SecondaryButton onClick={() => handleDeleteSeller(seller.user_id)}>삭제</SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'services' ? (
        <section className="main-card admin-table-card">
          <h2>서비스 관리</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>서비스명</th>
                  <th>카테고리</th>
                  <th>가격</th>
                  <th>상태</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {serviceRows.map((service) => (
                  <tr key={service.id}>
                    <td>{service.title}</td>
                    <td>{service.category}</td>
                    <td>{Number(service.price_point ?? 0).toLocaleString()}P</td>
                    <td>{service.is_active ? '활성' : '비활성'}</td>
                    <td>{service.created_at ? String(service.created_at).slice(0, 10) : '-'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <SecondaryButton onClick={() => handleDeleteService(service.id)}>삭제</SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'posts' ? (
        <section className="main-card admin-table-card">
          <h2>게시판 관리</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>카테고리</th>
                  <th>제목</th>
                  <th>상태</th>
                  <th>작성일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {postRows.map((post) => (
                  <tr key={post.id}>
                    <td>{post.id}</td>
                    <td>{post.category}</td>
                    <td>{post.title}</td>
                    <td>{post.is_deleted ? '삭제됨' : '게시중'}</td>
                    <td>{post.created_at ? String(post.created_at).slice(0, 10) : '-'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <SecondaryButton onClick={() => handleDeletePost(post.id)}>삭제</SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'notifications' ? (
        <section className="main-card admin-table-card">
          <h2>알림/메시지 관리</h2>
          <form className="admin-notification-form" onSubmit={handleSendAdminNotification}>
            <label>
              발송 대상
              <select
                value={notificationForm.mode}
                onChange={(event) =>
                  setNotificationForm((prev) => ({
                    ...prev,
                    mode: event.target.value,
                  }))
                }
              >
                <option value="single">특정 회원(단일/다중 ID 입력)</option>
                <option value="all">전체 회원</option>
              </select>
            </label>
            {notificationForm.mode !== 'all' ? (
              <label>
                회원 ID (쉼표 구분)
                <input
                  type="text"
                  value={notificationForm.userIds}
                  onChange={(event) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      userIds: event.target.value,
                    }))
                  }
                  placeholder="uuid, uuid"
                />
              </label>
            ) : null}
            <label>
              알림 제목
              <input
                type="text"
                value={notificationForm.title}
                onChange={(event) =>
                  setNotificationForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              알림 내용
              <textarea
                value={notificationForm.body}
                onChange={(event) =>
                  setNotificationForm((prev) => ({
                    ...prev,
                    body: event.target.value,
                  }))
                }
              />
            </label>
            <PrimaryButton>운영 알림 발송</PrimaryButton>
          </form>

          <form className="admin-notification-form compact" onSubmit={handlePointAdjustment}>
            <h3>포인트 조정</h3>
            <label>
              회원 ID
              <input
                type="text"
                value={pointAdjustForm.userId}
                onChange={(event) =>
                  setPointAdjustForm((prev) => ({
                    ...prev,
                    userId: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              조정 금액 (+/-)
              <input
                type="number"
                value={pointAdjustForm.amount}
                onChange={(event) =>
                  setPointAdjustForm((prev) => ({
                    ...prev,
                    amount: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              사유
              <input
                type="text"
                value={pointAdjustForm.reason}
                onChange={(event) =>
                  setPointAdjustForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
              />
            </label>
            <PrimaryButton>포인트 반영</PrimaryButton>
          </form>
        </section>
      ) : null}

      {activeTab === 'summary' ? (
        <section className="main-card admin-summary-grid">
          <article>
            <h3>총 회원 수</h3>
            <p>{memberRows.length.toLocaleString()}명</p>
          </article>
          <article>
            <h3>총 판매자 수</h3>
            <p>{totalSellerCount.toLocaleString()}명</p>
          </article>
          <article>
            <h3>총 서비스 수</h3>
            <p>{serviceRows.length.toLocaleString()}개</p>
          </article>
          <article>
            <h3>총 주문 수</h3>
            <p>{orderRows.length.toLocaleString()}건</p>
          </article>
          <article>
            <h3>리뷰 숨김 대기</h3>
            <p>{reviewRows.filter((item) => !item.is_hidden).length.toLocaleString()}건</p>
          </article>
          <article>
            <h3>최근 가입자</h3>
            <p>{memberRows[0]?.nickname ?? '-'}</p>
          </article>
        </section>
      ) : null}

      {activeTab === 'summary' ? (
        <section className="main-card admin-table-card">
          <h2>리뷰 관리 (신고/숨김)</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>리뷰</th>
                  <th>평점</th>
                  <th>상태</th>
                  <th>작성일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.slice(0, 80).map((review) => (
                  <tr key={review.id}>
                    <td>{review.content || '-'}</td>
                    <td>{Number(review.rating ?? 0).toFixed(1)}</td>
                    <td>{review.is_hidden ? '숨김' : '노출'}</td>
                    <td>{review.created_at ? String(review.created_at).slice(0, 10) : '-'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <SecondaryButton onClick={() => handleToggleReviewHidden(review.id, review.is_hidden)}>
                          {review.is_hidden ? '숨김 해제' : '숨김'}
                        </SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default AdminPage
