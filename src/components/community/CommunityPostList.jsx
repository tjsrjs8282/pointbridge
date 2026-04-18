function CommunityPostList({
  posts = [],
  isLoading,
  onOpenPost,
  onStartWrite,
  minHeightClassName = '',
}) {
  return (
    <section className={`main-card community-post-list ${minHeightClassName}`.trim()}>
      <div className="community-head-row">
        <h2>게시글 목록</h2>
        <button type="button" className="btn-primary" onClick={onStartWrite}>
          글쓰기
        </button>
      </div>
      {isLoading ? (
        <p className="muted">게시글을 불러오는 중입니다...</p>
      ) : posts.length === 0 ? (
        <div className="community-empty-state">
          <p>게시글이 존재하지 않습니다.</p>
        </div>
      ) : (
        <div className="community-post-items board">
          {posts.map((post) => (
            <button
              key={post.id}
              type="button"
              className="community-post-item board-row"
              onClick={() => onOpenPost(post.id)}
            >
              <strong>{post.title}</strong>
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
              <span>{post.createdAt ? String(post.createdAt).slice(0, 10) : '-'}</span>
              <span>{Number(post.commentCount ?? 0)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default CommunityPostList
