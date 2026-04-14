function HomeCommunityLatestSection({ noticePosts = [], freePosts = [], onMore, onOpenPost }) {
  return (
    <section className="main-card home-community-summary">
      <div className="home-community-grid">
        <article className="home-community-card">
          <div className="home-community-head">
            <h3>공지사항</h3>
            <button type="button" onClick={() => onMore('notice')}>
              더보기
            </button>
          </div>
          <ul>
            {noticePosts.length === 0 ? (
              <li className="muted">등록된 공지사항이 없습니다.</li>
            ) : (
              noticePosts.map((post) => (
                <li key={post.id}>
                  <button type="button" onClick={() => onOpenPost(post.id, 'notice')}>
                    <span>{post.title}</span>
                    <em>{String(post.createdAt ?? '').slice(0, 10)}</em>
                  </button>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="home-community-card">
          <div className="home-community-head">
            <h3>자유게시판</h3>
            <button type="button" onClick={() => onMore('free')}>
              더보기
            </button>
          </div>
          <ul>
            {freePosts.length === 0 ? (
              <li className="muted">등록된 자유게시글이 없습니다.</li>
            ) : (
              freePosts.map((post) => (
                <li key={post.id}>
                  <button type="button" onClick={() => onOpenPost(post.id, 'free')}>
                    <span>{post.title}</span>
                    <em>{String(post.createdAt ?? '').slice(0, 10)}</em>
                  </button>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </section>
  )
}

export default HomeCommunityLatestSection
