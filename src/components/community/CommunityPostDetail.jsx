function CommunityPostDetail({
  post,
  comments = [],
  isCommentsLoading = false,
  commentDraft = '',
  onCommentDraftChange,
  onSubmitComment,
  isCommentSubmitting = false,
  canWriteComment = false,
  onGoBack,
}) {
  if (!post) return <p className="muted">열람할 게시글을 선택하세요.</p>

  return (
    <article className="community-post-article detail">
      <div className="community-detail-top-actions">
        <button type="button" className="btn-secondary" onClick={onGoBack}>
          목록으로
        </button>
      </div>
      <div className="community-article-head">
        <h2>{post.title}</h2>
        <span className="community-author-cell">
          <span className="community-author-avatar">
            {post.authorAvatarUrl ? (
              <img src={post.authorAvatarUrl} alt={`${post.authorName} 프로필`} className="profile-avatar-image" />
            ) : (
              String(post.authorName ?? 'U').slice(0, 1)
            )}
          </span>
          {post.authorName}
        </span>
      </div>
      <p className="muted">{post.createdAt ? String(post.createdAt).slice(0, 16) : '-'}</p>
      {post.isSecret ? (
        <p>비밀글입니다.</p>
      ) : (
        <div
          className="community-post-content"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />
      )}

      <section className="community-comment-section">
        <h3>댓글</h3>
        {isCommentsLoading ? (
          <p className="muted">댓글을 불러오는 중입니다...</p>
        ) : comments.length === 0 ? (
          <p className="muted">아직 댓글이 없습니다.</p>
        ) : (
          <div className="community-comment-list">
            {comments.map((comment) => (
              <article key={comment.id} className="community-comment-item">
                <div className="community-author-cell">
                  <span className="community-author-avatar">
                    {comment.authorAvatarUrl ? (
                      <img src={comment.authorAvatarUrl} alt={`${comment.authorName} 프로필`} className="profile-avatar-image" />
                    ) : (
                      String(comment.authorName ?? 'U').slice(0, 1)
                    )}
                  </span>
                  <strong>{comment.authorName}</strong>
                  <span>{comment.createdAt ? String(comment.createdAt).slice(0, 16) : '-'}</span>
                </div>
                <p>{comment.content}</p>
              </article>
            ))}
          </div>
        )}

        {canWriteComment ? (
          <form className="community-comment-form" onSubmit={onSubmitComment}>
            <textarea
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(event.target.value)}
              placeholder="댓글을 입력하세요."
            />
            <button type="submit" className="btn-primary" disabled={isCommentSubmitting}>
              {isCommentSubmitting ? '등록 중...' : '댓글 등록'}
            </button>
          </form>
        ) : (
          <p className="muted">댓글 작성은 로그인 후 가능합니다.</p>
        )}
      </section>
    </article>
  )
}

export default CommunityPostDetail
