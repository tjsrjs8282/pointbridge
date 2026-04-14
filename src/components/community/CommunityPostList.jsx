function CommunityPostList({
  posts = [],
  isLoading,
  selectedPostId,
  onSelectPost,
  onStartWrite,
}) {
  return (
    <aside className="main-card community-post-list">
      <div className="community-head-row">
        <h2>게시글 목록</h2>
        <button type="button" className="btn-secondary" onClick={onStartWrite}>
          글쓰기
        </button>
      </div>
      {isLoading ? (
        <p className="muted">게시글을 불러오는 중입니다...</p>
      ) : posts.length === 0 ? (
        <p className="muted">등록된 게시글이 없습니다.</p>
      ) : (
        <div className="community-post-items">
          {posts.map((post) => (
            <button
              key={post.id}
              type="button"
              className={`community-post-item ${selectedPostId === post.id ? 'active' : ''}`}
              onClick={() => onSelectPost(post.id)}
            >
              <strong>{post.title}</strong>
              <p>{post.isSecret ? '비밀글' : post.contentText ?? post.content}</p>
              <span>{post.authorName}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}

export default CommunityPostList
