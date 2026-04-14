function CommunityPostDetail({ post }) {
  if (!post) return <p className="muted">열람할 게시글을 선택하세요.</p>

  return (
    <article className="community-post-article">
      <div className="community-article-head">
        <h2>{post.title}</h2>
        <span>{post.authorName}</span>
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
    </article>
  )
}

export default CommunityPostDetail
