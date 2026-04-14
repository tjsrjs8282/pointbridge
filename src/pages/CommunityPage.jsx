import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { COMMUNITY_CATEGORIES, createPost, fetchPostsByCategory } from '../lib/community'
import CommunityPostComposer from '../components/community/CommunityPostComposer'
import CommunityPostDetail from '../components/community/CommunityPostDetail'
import CommunityPostList from '../components/community/CommunityPostList'
import CommunityTabs from '../components/community/CommunityTabs'

const COMMUNITY_TABS = [
  { key: 'notice', label: COMMUNITY_CATEGORIES.notice },
  { key: 'free', label: COMMUNITY_CATEGORIES.free },
  { key: 'inquiry', label: COMMUNITY_CATEGORIES.inquiry },
]

function CommunityPage() {
  const { user, requireAuth } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromQuery = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(
    COMMUNITY_TABS.some((tab) => tab.key === tabFromQuery) ? tabFromQuery : 'notice',
  )
  const [posts, setPosts] = useState([])
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [isWriting, setIsWriting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    isSecret: false,
  })

  useEffect(() => {
    const nextTab = searchParams.get('tab')
    if (!nextTab || !COMMUNITY_TABS.some((tab) => tab.key === nextTab)) return
    setActiveTab(nextTab)
  }, [searchParams])

  useEffect(() => {
    const postFromQuery = searchParams.get('post')
    if (!postFromQuery) return
    setSelectedPostId(postFromQuery)
  }, [searchParams])

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    setStatusMessage('')
    fetchPostsByCategory(activeTab)
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          setStatusMessage(error.message ?? '게시글을 불러오지 못했습니다.')
          setPosts([])
          setSelectedPostId(null)
          return
        }
        setPosts(data ?? [])
        setSelectedPostId((prev) => {
          const postFromQuery = searchParams.get('post')
          if (postFromQuery && (data ?? []).some((post) => post.id === postFromQuery)) {
            return postFromQuery
          }
          return prev && (data ?? []).some((post) => post.id === prev) ? prev : (data ?? [])[0]?.id ?? null
        })
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [activeTab, searchParams])

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  )

  const handleStartWriting = () => {
    requireAuth({
      reason: '글쓰기는 로그인 후 이용할 수 있습니다.',
      onSuccess: () => {
        setIsWriting(true)
        setStatusMessage('')
      },
    })
  }

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

    setPosts((prev) => [data, ...prev])
    setSelectedPostId(data.id)
    setForm({ title: '', content: '', isSecret: false })
    setIsWriting(false)
    setStatusMessage('게시글이 등록되었습니다.')
  }

  const handleTabChange = (tabKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', tabKey)
      next.delete('post')
      return next
    })
    setActiveTab(tabKey)
    setIsWriting(false)
    setForm({ title: '', content: '', isSecret: false })
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">커뮤니티</p>
        <h1>게시판</h1>
        <p>공지, 자유글, 문의글을 탭에서 전환하며 확인할 수 있습니다.</p>
      </section>

      <CommunityTabs tabs={COMMUNITY_TABS} activeTab={activeTab} onChange={handleTabChange} />

      <section className="community-layout">
        <CommunityPostList
          posts={posts}
          isLoading={isLoading}
          selectedPostId={selectedPostId}
          onSelectPost={(postId) => {
            setSelectedPostId(postId)
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('tab', activeTab)
              next.set('post', postId)
              return next
            })
          }}
          onStartWrite={handleStartWriting}
        />

        <section className="main-card community-post-detail">
          {isWriting ? (
            <CommunityPostComposer
              tabKey={activeTab}
              form={form}
              isSubmitting={isSubmitting}
              onChangeTitle={(value) => setForm((prev) => ({ ...prev, title: value }))}
              onChangeContent={(value) => setForm((prev) => ({ ...prev, content: value }))}
              onChangeSecret={(value) => setForm((prev) => ({ ...prev, isSecret: value }))}
              onCancel={() => setIsWriting(false)}
              onSubmit={handleSubmitPost}
            />
          ) : (
            <CommunityPostDetail post={selectedPost} />
          )}
        </section>
      </section>

      {statusMessage ? <p className="muted">{statusMessage}</p> : null}
    </div>
  )
}

export default CommunityPage
