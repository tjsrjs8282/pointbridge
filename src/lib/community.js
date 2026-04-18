import { supabase } from './supabase'

function createNotConfiguredError() {
  return {
    message:
      'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    code: 'SUPABASE_NOT_CONFIGURED',
  }
}

function normalizeError(error) {
  if (!error) return null
  return {
    message: error.message ?? 'Unknown community error',
    code: error.code ?? 'UNKNOWN_COMMUNITY_ERROR',
    details: error.details ?? null,
    hint: error.hint ?? null,
    status: error.status ?? null,
  }
}

function isSchemaCompatibilityError(error) {
  const code = String(error?.code ?? '').toUpperCase()
  const message = String(error?.message ?? '').toLowerCase()
  return (
    code === 'PGRST204' ||
    code === '42P01' ||
    message.includes('column') ||
    message.includes('does not exist') ||
    message.includes('relation')
  )
}

export const COMMUNITY_CATEGORIES = {
  notice: '공지사항',
  free: '자유게시판',
  inquiry: '문의게시판',
}

function mapPostRow(row) {
  const plainText = String(row.content ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    title: row.title,
    content: row.content,
    contentText: plainText,
    isSecret: Boolean(row.is_secret),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    authorName: row.author_name ?? '사용자',
    authorAvatarUrl: row.author_avatar_url ?? '',
  }
}

function mapCommentRow(row) {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    content: row.content ?? '',
    createdAt: row.created_at ?? null,
    authorName: row.author_name ?? '사용자',
    authorAvatarUrl: row.author_avatar_url ?? '',
  }
}

export async function fetchPostsByCategory(category) {
  if (!supabase) return { data: [], error: createNotConfiguredError() }

  let query = supabase
    .from('posts')
    .select('id, user_id, category, title, content, is_secret, created_at, updated_at, is_deleted')
    .order('created_at', { ascending: false })

  if (category && category !== 'all') query = query.eq('category', category)
  query = query.eq('is_deleted', false)
  const { data, error } = await query
  if (error) return { data: [], error: normalizeError(error) }

  const userIds = Array.from(new Set((data ?? []).map((row) => row.user_id)))
  let profileMap = new Map()
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, nickname, name, avatar_url')
      .in('id', userIds)
    if (profileError) return { data: [], error: normalizeError(profileError) }
    profileMap = new Map((profiles ?? []).map((row) => [
      row.id,
      {
        name: row.nickname ?? row.name ?? '사용자',
        avatarUrl: row.avatar_url ?? '',
      },
    ]))
  }

  return {
    data: (data ?? []).map((row) =>
      mapPostRow({
        ...row,
        author_name: profileMap.get(row.user_id)?.name ?? profileMap.get(row.user_id),
        author_avatar_url: profileMap.get(row.user_id)?.avatarUrl ?? '',
      }),
    ),
    error: null,
  }
}

export async function fetchPostsByCategoryPaged({
  category,
  page = 1,
  pageSize = 10,
} = {}) {
  if (!supabase) {
    return {
      data: { posts: [], totalCount: 0, totalPages: 1, page: 1, pageSize },
      error: createNotConfiguredError(),
    }
  }

  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1
  const safePageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Number(pageSize)) : 10
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1

  let query = supabase
    .from('posts')
    .select(
      'id, user_id, category, title, content, is_secret, created_at, updated_at, is_deleted',
      { count: 'exact' },
    )
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (category && category !== 'all') query = query.eq('category', category)

  const { data, count, error } = await query
  if (error) {
    return {
      data: { posts: [], totalCount: 0, totalPages: 1, page: safePage, pageSize: safePageSize },
      error: normalizeError(error),
    }
  }

  const pageRows = data ?? []
  const userIds = Array.from(new Set(pageRows.map((row) => row.user_id)))
  let profileMap = new Map()
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, nickname, name, avatar_url')
      .in('id', userIds)
    if (profileError) {
      return {
        data: { posts: [], totalCount: 0, totalPages: 1, page: safePage, pageSize: safePageSize },
        error: normalizeError(profileError),
      }
    }
    profileMap = new Map((profiles ?? []).map((row) => [
      row.id,
      {
        name: row.nickname ?? row.name ?? '사용자',
        avatarUrl: row.avatar_url ?? '',
      },
    ]))
  }

  const postIds = pageRows.map((row) => row.id)
  let commentCountByPostId = new Map()
  if (postIds.length > 0) {
    const { data: commentRows, error: commentError } = await supabase
      .from('post_comments')
      .select('post_id')
      .in('post_id', postIds)
      .eq('is_deleted', false)

    if (!commentError) {
      commentCountByPostId = (commentRows ?? []).reduce((acc, row) => {
        const current = Number(acc.get(row.post_id) ?? 0)
        acc.set(row.post_id, current + 1)
        return acc
      }, new Map())
    }
  }

  const posts = pageRows.map((row) => ({
    ...mapPostRow({
      ...row,
      author_name: profileMap.get(row.user_id)?.name,
      author_avatar_url: profileMap.get(row.user_id)?.avatarUrl ?? '',
    }),
    commentCount: Number(commentCountByPostId.get(row.id) ?? 0),
  }))

  const totalCount = Number(count ?? 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize))
  return {
    data: {
      posts,
      totalCount,
      totalPages,
      page: safePage,
      pageSize: safePageSize,
    },
    error: null,
  }
}

export async function fetchPostDetailById(postId) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!postId) return { data: null, error: { code: 'MISSING_POST_ID', message: '게시글 ID가 필요합니다.' } }

  const { data: postRow, error: postError } = await supabase
    .from('posts')
    .select('id, user_id, category, title, content, is_secret, created_at, updated_at, is_deleted')
    .eq('id', postId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (postError) return { data: null, error: normalizeError(postError) }
  if (!postRow) {
    return { data: null, error: { code: 'POST_NOT_FOUND', message: '게시글을 찾을 수 없습니다.' } }
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, name, avatar_url')
    .eq('id', postRow.user_id)
    .maybeSingle()
  if (profileError) return { data: null, error: normalizeError(profileError) }

  return {
    data: mapPostRow({
      ...postRow,
      author_name: profileRow?.nickname ?? profileRow?.name ?? '사용자',
      author_avatar_url: profileRow?.avatar_url ?? '',
    }),
    error: null,
  }
}

export async function fetchPostComments(postId) {
  if (!supabase) return { data: [], error: createNotConfiguredError() }
  if (!postId) return { data: [], error: { code: 'MISSING_POST_ID', message: '게시글 ID가 필요합니다.' } }

  const { data, error } = await supabase
    .from('post_comments')
    .select('id, post_id, user_id, content, created_at, is_deleted')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
  if (error) {
    if (isSchemaCompatibilityError(error)) return { data: [], error: null }
    return { data: [], error: normalizeError(error) }
  }

  const userIds = Array.from(new Set((data ?? []).map((row) => row.user_id)))
  let profileMap = new Map()
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, nickname, name, avatar_url')
      .in('id', userIds)
    if (profileError) return { data: [], error: normalizeError(profileError) }
    profileMap = new Map((profiles ?? []).map((row) => [
      row.id,
      {
        name: row.nickname ?? row.name ?? '사용자',
        avatarUrl: row.avatar_url ?? '',
      },
    ]))
  }

  return {
    data: (data ?? []).map((row) =>
      mapCommentRow({
        ...row,
        author_name: profileMap.get(row.user_id)?.name,
        author_avatar_url: profileMap.get(row.user_id)?.avatarUrl ?? '',
      }),
    ),
    error: null,
  }
}

export async function createPostComment({ postId, userId, content }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  const normalizedContent = String(content ?? '').trim()
  if (!postId || !userId || !normalizedContent) {
    return {
      data: null,
      error: {
        code: 'INVALID_COMMENT_PAYLOAD',
        message: '댓글 등록에 필요한 정보가 부족합니다.',
      },
    }
  }

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content: normalizedContent,
    })
    .select('id, post_id, user_id, content, created_at')
    .single()
  if (error) {
    if (isSchemaCompatibilityError(error)) {
      return {
        data: null,
        error: {
          code: 'COMMENTS_NOT_READY',
          message: '댓글 기능 준비 중입니다. 관리자에게 문의해 주세요.',
        },
      }
    }
    return { data: null, error: normalizeError(error) }
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, nickname, name, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  return {
    data: mapCommentRow({
      ...data,
      author_name: profileRow?.nickname ?? profileRow?.name ?? '사용자',
      author_avatar_url: profileRow?.avatar_url ?? '',
    }),
    error: null,
  }
}

export async function ensureBridgePointNotice({ adminUserId }) {
  if (!supabase) return { data: null, error: createNotConfiguredError(), skipped: false }
  if (!adminUserId) {
    return {
      data: null,
      error: {
        code: 'MISSING_ADMIN_USER_ID',
        message: '공지 작성용 관리자 사용자 ID가 필요합니다.',
      },
      skipped: false,
    }
  }

  const targetTitle = '브릿포인트 소개'
  const { data: existing, error: lookupError } = await supabase
    .from('posts')
    .select('id')
    .eq('category', 'notice')
    .eq('title', targetTitle)
    .eq('is_deleted', false)
    .maybeSingle()

  if (lookupError) return { data: null, error: normalizeError(lookupError), skipped: false }
  if (existing?.id) return { data: existing, error: null, skipped: true }

  const content = `
<p>안녕하세요, PointBridge 운영팀입니다.</p>
<p><strong>브릿포인트</strong>는 PointBridge 안에서 서비스 결제와 다양한 혜택에 사용하는 공통 포인트입니다.</p>
<p>서비스 신청 시 포인트로 간편하게 결제할 수 있고, 이벤트 참여/리뷰 작성/운영 프로모션을 통해 추가 적립도 가능합니다.</p>
<p>앞으로는 활동 리워드, 등급별 보너스, 추천 미션 등 포인트 활용 범위를 계속 확장할 예정입니다.</p>
<p>더 좋은 거래 경험을 위해 브릿포인트 정책도 투명하게 안내드리겠습니다. 감사합니다.</p>
  `.trim()

  return createPost({
    userId: adminUserId,
    category: 'notice',
    title: targetTitle,
    content,
    isSecret: false,
  }).then(({ data, error }) => ({ data, error, skipped: false }))
}

export async function createPost({
  userId,
  category,
  title,
  content,
  isSecret = false,
}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      category,
      title,
      content,
      is_secret: Boolean(isSecret),
    })
    .select('id, user_id, category, title, content, is_secret, created_at, updated_at')
    .single()
  if (error) return { data: null, error: normalizeError(error) }
  return { data: mapPostRow(data), error: null }
}

export async function fetchLatestPostsByCategories({
  categories = ['notice', 'free'],
  limitPerCategory = 5,
} = {}) {
  if (!supabase) return { data: {}, error: createNotConfiguredError() }

  const normalizedCategories = categories.filter(Boolean)
  if (normalizedCategories.length === 0) return { data: {}, error: null }

  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, category, title, content, is_secret, created_at, updated_at, is_deleted')
    .in('category', normalizedCategories)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) return { data: {}, error: normalizeError(error) }

  const grouped = normalizedCategories.reduce((acc, key) => ({ ...acc, [key]: [] }), {})
  ;(data ?? []).forEach((row) => {
    const current = grouped[row.category] ?? []
    if (current.length < limitPerCategory) {
      current.push(mapPostRow(row))
      grouped[row.category] = current
    }
  })

  return { data: grouped, error: null }
}
