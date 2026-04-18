import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import {
  COMMUNITY_CATEGORIES,
  ensureBridgePointNotice,
  createPost,
  createPostComment,
  fetchPostComments,
  fetchPostDetailById,
  fetchPostsByCategoryPaged,
} from '../lib/community'
import { canWriteNotice, isAdminProfile } from '../lib/permissions'
import CommunityPostComposer from '../components/community/CommunityPostComposer'
import CommunityPostDetail from '../components/community/CommunityPostDetail'
import CommunityPostList from '../components/community/CommunityPostList'
import CommunityTabs from '../components/community/CommunityTabs'
import CommunityPagination from '../components/community/CommunityPagination'

const COMMUNITY_TABS = [
  { key: 'notice', label: COMMUNITY_CATEGORIES.notice },
  { key: 'free', label: COMMUNITY_CATEGORIES.free },
  { key: 'inquiry', label: COMMUNITY_CATEGORIES.inquiry },
]

const COMMUNITY_HEADER_META = {
  notice: {
    title: '공지사항',
    description: '운영 정책, 업데이트, 주요 공지를 확인할 수 있습니다.',
  },
  free: {
    title: '자유게시판',
    description: '자유롭게 질문하고 경험을 공유하는 공간입니다.',
  },
  inquiry: {
    title: '문의게시판',
    description: '서비스 관련 문의를 남기고 답변을 받을 수 있습니다.',
  },
}

function CommunityPage() {
  const { user, profile, requireAuth } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = useMemo(() => {
    const tabFromQuery = searchParams.get('tab')
    return COMMUNITY_TABS.some((tab) => tab.key === tabFromQuery) ? tabFromQuery : 'notice'
  }, [searchParams])
  const currentPage = useMemo(() => {
    const raw = Number(searchParams.get('page') ?? 1)
    if (!Number.isFinite(raw)) return 1
    return Math.max(1, Math.floor(raw))
  }, [searchParams])
  const currentHeader = COMMUNITY_HEADER_META[activeTab] ?? COMMUNITY_HEADER_META.notice
  const selectedPostId = searchParams.get('post')
  const isWriting = searchParams.get('mode') === 'write'
  const [statusMessage, setStatusMessage] = useState('')
  const [listState, setListState] = useState({
    key: '',
    posts: [],
    totalCount: 0,
    totalPages: 1,
    pageSize: 10,
    error: null,
  })
  const [detailState, setDetailState] = useState({
    key: '',
    post: null,
    error: null,
  })
  const [commentsState, setCommentsState] = useState({
    key: '',
    comments: [],
    error: null,
  })
  const [commentDraft, setCommentDraft] = useState('')
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    isSecret: false,
  })

  useEffect(() => {
    let mounted = true
    const requestKey = `${activeTab}:${currentPage}`
    fetchPostsByCategoryPaged({
      category: activeTab,
      page: currentPage,
      pageSize: 10,
    })
      .then(({ data, error }) => {
        if (!mounted) return
        setListState({
          key: requestKey,
          posts: data?.posts ?? [],
          totalCount: Number(data?.totalCount ?? 0),
          totalPages: Number(data?.totalPages ?? 1),
          pageSize: Number(data?.pageSize ?? 10),
          error,
        })
      })
    return () => {
      mounted = false
    }
  }, [activeTab, currentPage])

  useEffect(() => {
    if (!selectedPostId) return undefined
    let mounted = true
    const detailKey = String(selectedPostId)
    Promise.all([
      fetchPostDetailById(selectedPostId),
      fetchPostComments(selectedPostId),
    ]).then(([postResult, commentsResult]) => {
      if (!mounted) return
      setDetailState({
        key: detailKey,
        post: postResult.data,
        error: postResult.error,
      })
      setCommentsState({
        key: detailKey,
        comments: commentsResult.data ?? [],
        error: commentsResult.error,
      })
    })

    return () => {
      mounted = false
    }
  }, [selectedPostId])

  const listRequestKey = `${activeTab}:${currentPage}`
  const isListLoading = listState.key !== listRequestKey
  const selectedPost =
    selectedPostId && detailState.key === String(selectedPostId) ? detailState.post : null
  const isDetailLoading = Boolean(selectedPostId) && detailState.key !== String(selectedPostId)
  const isCommentsLoading =
    Boolean(selectedPostId) && commentsState.key !== String(selectedPostId)

  const updateBoardQuery = (updater) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      updater(next)
      if (!next.get('tab')) next.set('tab', activeTab)
      if (!next.get('page')) next.set('page', String(currentPage))
      return next
    })
  }

  const handleStartWriting = () => {
    requireAuth({
      reason: '글쓰기는 로그인 후 이용할 수 있습니다.',
      onSuccess: () => {
        if (activeTab === 'notice' && !canWriteNotice(profile)) {
          setStatusMessage('공지사항 작성은 관리자만 가능합니다.')
          return
        }
        updateBoardQuery((next) => {
          next.set('mode', 'write')
          next.delete('post')
        })
        setStatusMessage('')
      },
    })
  }

  useEffect(() => {
    if (!user?.id || !isAdminProfile(profile)) return
    ensureBridgePointNotice({ adminUserId: user.id }).then(({ error }) => {
      if (error) {
        console.warn('[Community] Failed to seed bridge-point notice', error)
      }
    })
  }, [profile, user?.id])

  const handleSubmitPost = async (event) => {
    event.preventDefault()
    if (!user?.id) return
    const normalizedContent = String(form.content ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!form.title.trim() || !normalizedContent) {
      setStatusMessage('제목과 내용을 입력해 주세요.')
      return
    }
    if (activeTab === 'notice' && !canWriteNotice(profile)) {
      setStatusMessage('공지사항 작성 권한이 없습니다.')
      return
    }

    setIsSubmitting(true)
    const { data, error } = await createPost({
      userId: user.id,
      category: activeTab,
      title: form.title.trim(),
      content: form.content.trim(),
      isSecret: activeTab === 'inquiry' ? form.isSecret : false,
    })
    setIsSubmitting(false)

    if (error) {
      setStatusMessage(error.message ?? '게시글 등록 중 오류가 발생했습니다.')
      return
    }

    updateBoardQuery((next) => {
      next.set('tab', activeTab)
      next.set('page', '1')
      next.set('post', String(data.id))
      next.delete('mode')
    })
    setListState((prev) => ({ ...prev, key: '' }))
    setForm({ title: '', content: '', isSecret: false })
    setStatusMessage('게시글이 등록되었습니다.')
  }

  const handleTabChange = (tabKey) => {
    setSearchParams(() => {
      const next = new URLSearchParams()
      next.set('tab', tabKey)
      next.set('page', '1')
      next.delete('post')
      next.delete('mode')
      return next
    })
    setForm({ title: '', content: '', isSecret: false })
  }

  const handlePageChange = (nextPage) => {
    const safeNext = Math.max(1, Number(nextPage))
    updateBoardQuery((next) => {
      next.set('page', String(safeNext))
      next.delete('post')
      next.delete('mode')
    })
  }

  const handleOpenPost = (postId) => {
    updateBoardQuery((next) => {
      next.set('post', String(postId))
      next.delete('mode')
    })
  }

  const handleBackToList = () => {
    updateBoardQuery((next) => {
      next.delete('post')
      next.delete('mode')
    })
  }

  const handleSubmitComment = async (event) => {
    event.preventDefault()
    if (!selectedPostId) return
    if (!user?.id) {
      requireAuth({ reason: '댓글 작성은 로그인 후 가능합니다.' })
      return
    }

    const normalized = String(commentDraft ?? '').trim()
    if (!normalized) {
      setStatusMessage('댓글 내용을 입력해 주세요.')
      return
    }

    setIsCommentSubmitting(true)
    const { data, error } = await createPostComment({
      postId: selectedPostId,
      userId: user.id,
      content: normalized,
    })
    setIsCommentSubmitting(false)

    if (error) {
      setStatusMessage(error.message ?? '댓글 등록 중 오류가 발생했습니다.')
      return
    }

    setCommentsState((prev) => ({
      ...prev,
      comments: [...prev.comments, data],
    }))
    setListState((prev) => ({
      ...prev,
      posts: prev.posts.map((post) =>
        String(post.id) === String(selectedPostId)
          ? { ...post, commentCount: Number(post.commentCount ?? 0) + 1 }
          : post,
      ),
    }))
    setCommentDraft('')
    setStatusMessage('댓글이 등록되었습니다.')
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>{currentHeader.title}</h1>
        <p>{currentHeader.description}</p>
      </section>

      <CommunityTabs tabs={COMMUNITY_TABS} activeTab={activeTab} onChange={handleTabChange} />

      {!isWriting && !selectedPostId ? (
        <>
          <CommunityPostList
            posts={listState.posts}
            isLoading={isListLoading}
            onOpenPost={handleOpenPost}
            onStartWrite={handleStartWriting}
            minHeightClassName="community-board-min-height"
          />
          <CommunityPagination
            currentPage={currentPage}
            totalPages={listState.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : null}

      {isWriting ? (
        <section className="main-card community-post-detail single">
          <CommunityPostComposer
            tabKey={activeTab}
            form={form}
            isSubmitting={isSubmitting}
            onChangeTitle={(value) => setForm((prev) => ({ ...prev, title: value }))}
            onChangeContent={(value) => setForm((prev) => ({ ...prev, content: value }))}
            onChangeSecret={(value) => setForm((prev) => ({ ...prev, isSecret: value }))}
            onCancel={handleBackToList}
            onSubmit={handleSubmitPost}
          />
        </section>
      ) : null}

      {!isWriting && selectedPostId ? (
        <section className="main-card community-post-detail single">
          {isDetailLoading ? (
            <p className="muted">게시글을 불러오는 중입니다...</p>
          ) : (
            <CommunityPostDetail
              post={selectedPost}
              comments={commentsState.comments}
              isCommentsLoading={isCommentsLoading}
              commentDraft={commentDraft}
              onCommentDraftChange={setCommentDraft}
              onSubmitComment={handleSubmitComment}
              isCommentSubmitting={isCommentSubmitting}
              canWriteComment={Boolean(user?.id)}
              onGoBack={handleBackToList}
            />
          )}
        </section>
      ) : null}

      {statusMessage ? <p className="muted">{statusMessage}</p> : null}
      {listState.error ? <p className="muted">{listState.error.message}</p> : null}
      {detailState.error ? <p className="muted">{detailState.error.message}</p> : null}
      {commentsState.error ? <p className="muted">{commentsState.error.message}</p> : null}
    </div>
  )
}

export default CommunityPage
