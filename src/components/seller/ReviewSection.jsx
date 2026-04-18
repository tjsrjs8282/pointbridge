import SectionTitle from '../SectionTitle'
import SecondaryButton from '../SecondaryButton'

function ReviewSection({
  seller,
  reviews,
  isOwnerView,
  availableReviewOrders,
  reviewOrderId,
  setReviewOrderId,
  reviewRating,
  setReviewRating,
  reviewContent,
  setReviewContent,
  isReviewSubmitting,
  reviewStatusMessage,
  onSubmitReview,
  showReviewForm,
}) {
  return (
    <section className="main-card" id="seller-review-section">
      <div className="seller-review-header">
        <SectionTitle title="리뷰" />
        <p className="seller-review-inline-meta">
          리뷰 {seller?.reviewCount ?? 0} · {Number(seller?.rating ?? 0).toFixed(1)} ★
        </p>
      </div>
      <div className="seller-review-list fixed">
        {reviews.length === 0 ? (
          <p className="muted seller-review-empty">아직 등록된 리뷰가 없습니다.</p>
        ) : (
          reviews.map((review) => (
            <article key={review.id} className="seller-review-item">
              <div className="seller-review-item-head">
                <div className="review-author-avatar">
                  {review.userAvatarUrl ? (
                    <img src={review.userAvatarUrl} alt={`${review.user} 프로필`} className="profile-avatar-image" />
                  ) : (
                    review.userAvatar ?? 'U'
                  )}
                </div>
                <strong>{review.user}</strong>
                <span>{'★'.repeat(Math.max(1, Math.round(Number(review.score ?? 0))))}</span>
              </div>
              <p>{review.text}</p>
              <small>{review.createdAt ? String(review.createdAt).slice(0, 10) : '작성일 미표기'}</small>
            </article>
          ))
        )}
      </div>

      {!isOwnerView && showReviewForm ? (
        <div className="order-field seller-review-form-wrap" style={{ marginTop: 16 }}>
          <p className="muted">리뷰 작성은 완료된 주문 건에 한해 가능합니다.</p>
          <label>리뷰 작성 (완료 주문 1건당 1회)</label>
          {availableReviewOrders.length === 0 ? (
            <p className="muted">작성 가능한 완료 주문이 없습니다.</p>
          ) : (
            <>
              <select value={reviewOrderId} onChange={(event) => setReviewOrderId(event.target.value)}>
                {availableReviewOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.title_snapshot}
                  </option>
                ))}
              </select>
              <select
                value={reviewRating}
                onChange={(event) => setReviewRating(Number(event.target.value))}
                style={{ marginTop: 8 }}
              >
                <option value={5}>5점</option>
                <option value={4}>4점</option>
                <option value={3}>3점</option>
                <option value={2}>2점</option>
                <option value={1}>1점</option>
              </select>
            </>
          )}
          <textarea
            value={reviewContent}
            onChange={(event) => setReviewContent(event.target.value)}
            placeholder="서비스 후기를 작성해 주세요."
            style={{ marginTop: 8 }}
          />
          <SecondaryButton onClick={onSubmitReview} disabled={isReviewSubmitting}>
            {isReviewSubmitting ? '등록 중...' : '리뷰 등록'}
          </SecondaryButton>
          {reviewStatusMessage ? <p className="muted">{reviewStatusMessage}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

export default ReviewSection
