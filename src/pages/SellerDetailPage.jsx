import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import SecondaryButton from '../components/SecondaryButton'
import ConfirmModal from '../components/common/ConfirmModal'
import EmptyStateCard from '../components/common/EmptyStateCard'
import SectionLoader from '../components/common/SectionLoader'
import ReviewSection from '../components/seller/ReviewSection'
import SellerProfileHeader from '../components/seller/SellerProfileHeader'
import SellerProfileMetaCompact from '../components/seller/SellerProfileMetaCompact'
import SellerServicesSection from '../components/seller/SellerServicesSection'
import ServiceCreateModal from '../components/seller/ServiceCreateModal'
import useAuth from '../hooks/useAuth'
import { fetchFavoritesByUser, toggleFavorite } from '../lib/favorites'
import {
  createOrderRequest,
  createReview,
  deactivateSellerProfile,
  fetchSellerDetailByProfileId,
  getBuyerCompletedOrdersWithoutReview,
} from '../lib/marketplace'
import { pushChatRequestNotification, pushServiceRequestNotification } from '../lib/notifications'
import { canManageSellerProfile, isAdminProfile } from '../lib/permissions'

const optionMultipliers = {
  기본: 1,
  소: 1,
  중: 1.2,
  대: 1.45,
}

function SellerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { requireAuth, user, profile, refreshProfile, updateProfile, requestSellerOnboarding } = useAuth()
  const pointBalance = Number(profile?.point_balance ?? 0)
  const [seller, setSeller] = useState(null)
  const [sellerServices, setSellerServices] = useState([])
  const [sellerReviews, setSellerReviews] = useState([])
  const [loadErrorMessage, setLoadErrorMessage] = useState('')
  const [isDetailLoading, setIsDetailLoading] = useState(true)
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedOption, setSelectedOption] = useState('기본')
  const [requestNote, setRequestNote] = useState('')
  const [schedule, setSchedule] = useState('')
  const [processType, setProcessType] = useState('온라인')
  const [address, setAddress] = useState('')
  const [orderStatusMessage, setOrderStatusMessage] = useState('')
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false)
  const [reviewOrderId, setReviewOrderId] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [availableReviewOrders, setAvailableReviewOrders] = useState([])
  const [reviewStatusMessage, setReviewStatusMessage] = useState('')
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)
  const [isDeletingSellerProfile, setIsDeletingSellerProfile] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isServiceCreateOpen, setIsServiceCreateOpen] = useState(false)
  const [isFavoriteSeller, setIsFavoriteSeller] = useState(false)

  const totalPoints = useMemo(() => {
    if (!selectedService) return 0
    const multiplier = optionMultipliers[selectedOption] ?? 1
    return Math.round(selectedService.price * multiplier)
  }, [selectedOption, selectedService])

  const hasEnoughPoints = pointBalance >= totalPoints
  const isAdmin = isAdminProfile(profile)
  const canManageSeller = canManageSellerProfile({
    profile,
    currentUserId: user?.id,
    sellerUserId: seller?.sellerUserId,
  })
  const isOwnerView = canManageSeller
  const isVisitorView = !canManageSeller && Boolean(user?.id)

  const loadSellerDetail = async () => {
    setIsDetailLoading(true)
    setLoadErrorMessage('')
    const { data, error } = await fetchSellerDetailByProfileId(id)
    if (error) {
      setSeller(null)
      setSellerServices([])
      setSellerReviews([])
      setLoadErrorMessage(error.message ?? '판매자 정보를 불러오지 못했습니다.')
      setIsDetailLoading(false)
      return
    }

    setSeller(data.seller)
    setSellerServices(data.services)
    setSellerReviews(data.reviews)
    setIsDetailLoading(false)
  }

  useEffect(() => {
    loadSellerDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (location.hash !== '#reviews') return
    const timer = setTimeout(() => {
      const element = document.getElementById('seller-review-section')
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => clearTimeout(timer)
  }, [location.hash, sellerReviews.length])

  useEffect(() => {
    const currentSellerUserId = seller?.sellerUserId
    if (!user?.id || !currentSellerUserId) {
      setAvailableReviewOrders([])
      setReviewOrderId('')
      return
    }

    getBuyerCompletedOrdersWithoutReview({
      buyerUserId: user.id,
      sellerUserId: currentSellerUserId,
    }).then(({ data, error }) => {
      if (error) return
      setAvailableReviewOrders(data)
      setReviewOrderId(data[0]?.id ?? '')
    })
  }, [user?.id, seller?.sellerUserId])

  useEffect(() => {
    let mounted = true
    if (!user?.id || !seller?.id) {
      setIsFavoriteSeller(false)
      return undefined
    }
    fetchFavoritesByUser({ userId: user.id }).then(({ data, error }) => {
      if (!mounted || error) return
      setIsFavoriteSeller(
        (data ?? []).some(
          (item) => item.targetType === 'seller' && String(item.targetId) === String(seller.id),
        ),
      )
    })
    return () => {
      mounted = false
    }
  }, [user?.id, seller?.id])

  const openOrderModal = (service) => {
    requireAuth({
      reason: '주문 신청은 로그인 후 이용할 수 있습니다.',
      onSuccess: () => {
        setOrderStatusMessage('')
        setSelectedService(service)
        setSelectedOption(service.option ?? '기본')
        setRequestNote('')
        setSchedule('')
        setProcessType('온라인')
        setAddress('')
        setIsOrderOpen(true)
      },
    })
  }

  const handleDeleteSellerProfile = async () => {
    if (!canManageSeller) return

    setIsDeletingSellerProfile(true)
    const { error } = await deactivateSellerProfile({ userId: seller?.sellerUserId })
    setIsDeletingSellerProfile(false)
    if (error) {
      setLoadErrorMessage('판매자 프로필 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    if (user?.id === seller?.sellerUserId) {
      updateProfile({
        ...(profile ?? {}),
        is_seller: false,
        seller_status: 'deleted',
      })
      refreshProfile().catch(() => {
        // Keep optimistic UI state even if profile refresh fails temporarily.
      })
    }
    setIsDeleteConfirmOpen(false)
    navigate('/sellers', { replace: true })
  }

  const handleToggleFavoriteSeller = () => {
    if (!seller?.id) return
    requireAuth({
      reason: '판매자 찜은 로그인 후 이용할 수 있습니다.',
      onSuccess: async () => {
        const { data, error } = await toggleFavorite({
          userId: user.id,
          targetType: 'seller',
          targetId: String(seller.id),
        })
        if (error) {
          setOrderStatusMessage(error.message ?? '찜 처리에 실패했습니다.')
          return
        }
        setIsFavoriteSeller(Boolean(data?.isFavorite))
      },
    })
  }

  const handleStartChat = () => {
    requireAuth({
      reason: '채팅신청은 로그인 후 이용할 수 있습니다.',
      onSuccess: async () => {
        if (!seller?.sellerUserId || !user?.id) return
        const { error } = await pushChatRequestNotification({
          sellerUserId: seller.sellerUserId,
          buyerUserId: user.id,
          actorId: user.id,
          actorName:
            profile?.nickname ??
            profile?.name ??
            user?.user_metadata?.nickname ??
            user?.user_metadata?.name ??
            user?.email?.split('@')?.[0] ??
            '사용자',
        })
        setOrderStatusMessage(
          error
            ? error.message ?? '채팅신청 전송 중 오류가 발생했습니다.'
            : `${profile?.nickname ?? profile?.name ?? '사용자'}님이 채팅을 신청하였습니다.`,
        )
      },
    })
  }

  const submitOrder = async () => {
    if (!selectedService || !seller?.sellerUserId) return
    if (!user?.id) {
      setOrderStatusMessage('로그인 후 주문 신청이 가능합니다.')
      return
    }
    if (!hasEnoughPoints) {
      setOrderStatusMessage('포인트가 부족합니다. 충전 후 다시 시도해 주세요.')
      return
    }

    const composedMessage = [requestNote, schedule ? `희망일정: ${schedule}` : '', processType, address]
      .filter(Boolean)
      .join('\n')

    setIsOrderSubmitting(true)
    setOrderStatusMessage('')
    const { data: createdOrder, error } = await createOrderRequest({
      buyerUserId: user.id,
      sellerUserId: seller.sellerUserId,
      serviceId: selectedService.id,
      category: selectedService.category ?? seller.category,
      titleSnapshot: selectedService.name,
      pricePoint: totalPoints,
      requestMessage: composedMessage,
    })
    setIsOrderSubmitting(false)

    if (error) {
      setOrderStatusMessage(error.message ?? '주문 신청 중 오류가 발생했습니다.')
      return
    }

    setOrderStatusMessage('주문 신청이 접수되었습니다. 판매자 응답을 기다려 주세요.')
    const { error: notificationError } = await pushServiceRequestNotification({
      sellerUserId: seller.sellerUserId,
      buyerUserId: user.id,
      actorId: user.id,
      actorName:
        profile?.nickname ??
        profile?.name ??
        user?.user_metadata?.nickname ??
        user?.user_metadata?.name ??
        user?.email?.split('@')?.[0] ??
        '구매자',
      serviceId: selectedService.id,
      serviceTitle: selectedService.name,
      points: totalPoints,
      orderId: createdOrder?.id ?? null,
      requestId: createdOrder?.id ? `req-${createdOrder.id}` : undefined,
    })
    if (notificationError) {
      setOrderStatusMessage('주문은 접수되었지만 알림 전송에 일부 문제가 발생했습니다.')
    }
    setIsOrderOpen(false)
  }

  const submitReview = async () => {
    if (!user?.id) {
      requireAuth({ reason: '리뷰 작성은 로그인 후 이용할 수 있습니다.' })
      return
    }
    if (!reviewOrderId || !seller?.sellerUserId) {
      setReviewStatusMessage('리뷰 가능한 완료 주문이 없습니다.')
      return
    }
    if (!reviewContent.trim()) {
      setReviewStatusMessage('리뷰 내용을 입력해 주세요.')
      return
    }

    const order = availableReviewOrders.find((item) => item.id === reviewOrderId)
    if (!order) {
      setReviewStatusMessage('선택한 주문 정보를 찾을 수 없습니다.')
      return
    }

    setIsReviewSubmitting(true)
    setReviewStatusMessage('')
    const { error } = await createReview({
      orderId: order.id,
      serviceId: order.service_id,
      sellerUserId: seller.sellerUserId,
      buyerUserId: user.id,
      rating: reviewRating,
      content: reviewContent.trim(),
    })
    setIsReviewSubmitting(false)

    if (error) {
      setReviewStatusMessage(error.message ?? '리뷰 등록 중 오류가 발생했습니다.')
      return
    }

    setReviewContent('')
    setReviewRating(5)
    setReviewStatusMessage('리뷰가 등록되었습니다.')
    await Promise.all([loadSellerDetail(), refreshProfile()])
  }

  return (
    <div className="page-stack">
      {isDetailLoading ? <SectionLoader label="판매자 프로필 불러오는 중" minHeight={220} /> : null}

      {!isDetailLoading && !seller ? (
        <EmptyStateCard
          title="판매자 정보를 찾을 수 없습니다."
          description="비활성화된 판매자이거나 접근할 수 없는 프로필입니다."
        />
      ) : null}
      {!isDetailLoading && loadErrorMessage && !seller ? <p className="muted">{loadErrorMessage}</p> : null}

      {!isDetailLoading && seller ? (
        <>
          <SellerProfileHeader
            seller={seller}
            isOwnerView={isOwnerView}
            isAdminView={isAdmin && user?.id !== seller?.sellerUserId}
            onStartChat={handleStartChat}
            onEditProfile={() => requestSellerOnboarding({ targetUserId: seller?.sellerUserId })}
            onDeleteProfile={() => setIsDeleteConfirmOpen(true)}
            isDeletingSellerProfile={isDeletingSellerProfile}
            canFavorite={!isOwnerView}
            isFavorite={isFavoriteSeller}
            onToggleFavorite={handleToggleFavoriteSeller}
          />

          <SellerProfileMetaCompact seller={seller} />

          {loadErrorMessage ? <p className="muted">{loadErrorMessage}</p> : null}
          {orderStatusMessage ? <p className="muted">{orderStatusMessage}</p> : null}

          <SellerServicesSection
            services={sellerServices}
            isOwnerView={canManageSeller}
            onOpenCreateModal={() => setIsServiceCreateOpen(true)}
            onOrder={openOrderModal}
          />

          <ReviewSection
            seller={seller}
            reviews={sellerReviews}
            isOwnerView={isOwnerView}
            availableReviewOrders={availableReviewOrders}
            reviewOrderId={reviewOrderId}
            setReviewOrderId={setReviewOrderId}
            reviewRating={reviewRating}
            setReviewRating={setReviewRating}
            reviewContent={reviewContent}
            setReviewContent={setReviewContent}
            isReviewSubmitting={isReviewSubmitting}
            reviewStatusMessage={reviewStatusMessage}
            onSubmitReview={submitReview}
            showReviewForm={isVisitorView}
          />

          <section className="main-card seller-summary-grid">
            <article>
              <h3>대표 서비스 수</h3>
              <p>{sellerServices.length}개</p>
            </article>
            <article>
              <h3>평균 응답시간</h3>
              <p>{seller?.avgResponse ?? '-'}</p>
            </article>
            <article>
              <h3>누적 작업 수</h3>
              <p>{seller?.totalWorks ?? 0}건</p>
            </article>
          </section>
        </>
      ) : null}

      {isOrderOpen && selectedService ? (
        <div className="order-modal-overlay" role="presentation">
          <section className="order-modal-card" role="dialog" aria-modal="true">
            <div className="order-modal-head">
              <h2>서비스 주문 신청</h2>
              <SecondaryButton onClick={() => setIsOrderOpen(false)}>
                닫기
              </SecondaryButton>
            </div>

            <div className="order-field">
              <label>선택한 서비스명</label>
              <input value={selectedService.name} readOnly />
            </div>

            <div className="order-grid">
              <div className="order-field">
                <label>옵션 선택</label>
                <select
                  value={selectedOption}
                  onChange={(event) => setSelectedOption(event.target.value)}
                >
                  <option value="소">소</option>
                  <option value="중">중</option>
                  <option value="대">대</option>
                </select>
              </div>
              <div className="order-field">
                <label>일정 선택</label>
                <input
                  type="date"
                  value={schedule}
                  onChange={(event) => setSchedule(event.target.value)}
                />
              </div>
            </div>

            <div className="order-field">
              <label>주소 또는 진행 방식</label>
              <div className="order-type-row">
                <select
                  value={processType}
                  onChange={(event) => setProcessType(event.target.value)}
                >
                  <option value="온라인">온라인</option>
                  <option value="방문">방문</option>
                </select>
                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="방문 진행 시 주소를 입력하세요"
                />
              </div>
            </div>

            <div className="order-field">
              <label>요청사항 입력</label>
              <textarea
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                placeholder="필요한 작업 범위와 전달사항을 입력하세요."
              />
            </div>

            <div className="order-total">
              <strong>총 포인트: {totalPoints.toLocaleString()}P</strong>
              <p className={hasEnoughPoints ? 'point-ok' : 'point-low'}>
                보유 포인트 {pointBalance.toLocaleString()}P ·{' '}
                {hasEnoughPoints
                  ? '현재 포인트로 주문 신청 가능합니다.'
                  : '포인트가 부족합니다. 충전 후 진행해 주세요.'}
              </p>
            </div>

            <button
              type="button"
              className="order-submit-btn"
              onClick={submitOrder}
              disabled={isOrderSubmitting}
            >
              {isOrderSubmitting ? '신청 중...' : '주문 신청'}
            </button>
          </section>
        </div>
      ) : null}

      <ServiceCreateModal
        isOpen={isServiceCreateOpen}
        sellerUserId={seller?.sellerUserId}
        onClose={() => setIsServiceCreateOpen(false)}
        onCreated={loadSellerDetail}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="판매자 프로필 삭제"
        message="판매자 프로필을 삭제하면 서비스 노출이 중단됩니다. 계속 진행할까요?"
        confirmText="확인"
        cancelText="취소"
        onConfirm={handleDeleteSellerProfile}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        isConfirming={isDeletingSellerProfile}
      />
    </div>
  )
}

export default SellerDetailPage
