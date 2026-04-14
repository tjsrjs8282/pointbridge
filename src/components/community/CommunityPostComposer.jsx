import RichTextEditor from './RichTextEditor'

function CommunityPostComposer({
  tabKey,
  form,
  isSubmitting,
  onChangeTitle,
  onChangeContent,
  onChangeSecret,
  onCancel,
  onSubmit,
}) {
  return (
    <form className="community-write-form" onSubmit={onSubmit}>
      <h2>글쓰기</h2>
      <label>
        제목
        <input
          type="text"
          value={form.title}
          onChange={(event) => onChangeTitle(event.target.value)}
          placeholder="제목을 입력하세요"
        />
      </label>
      <label>
        내용
        <RichTextEditor value={form.content} onChange={onChangeContent} />
      </label>
      {tabKey === 'inquiry' ? (
        <label className="community-secret-toggle">
          <input
            type="checkbox"
            checked={form.isSecret}
            onChange={(event) => onChangeSecret(event.target.checked)}
          />
          비밀글로 등록
        </label>
      ) : null}
      <div className="community-write-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? '등록 중...' : '등록'}
        </button>
      </div>
    </form>
  )
}

export default CommunityPostComposer
