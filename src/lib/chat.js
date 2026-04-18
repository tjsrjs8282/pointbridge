import { supabase } from './supabase'

export const CHAT_ROOMS_STORAGE_KEY = 'pointbridge:chatRooms'
export const CHAT_MESSAGES_STORAGE_KEY = 'pointbridge:chatMessages'
const CHAT_LAST_READ_PREFIX = 'pointbridge:chatLastRead:'

function formatClockTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toInitials(value) {
  const text = String(value ?? '').trim()
  if (!text) return 'PB'
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join('')
    .toUpperCase()
}

function normalizeError(error, fallbackMessage = '채팅 처리 중 오류가 발생했습니다.') {
  if (!error) return null
  return {
    message: error.message ?? fallbackMessage,
    code: error.code ?? 'CHAT_ERROR',
    status: error.status ?? null,
    details: error.details ?? null,
  }
}

function createNotConfiguredError() {
  return {
    message:
      'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    code: 'SUPABASE_NOT_CONFIGURED',
  }
}

function isSchemaCompatibilityError(error) {
  const code = String(error?.code ?? '').toUpperCase()
  const message = String(error?.message ?? '').toLowerCase()
  return (
    code === 'PGRST204' ||
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST116' ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('column')
  )
}

export function buildDefaultRooms({ myNickname, myAvatarText, myAvatarUrl, role }) {
  return [
    {
      id: 'room-1',
      nickname: myNickname,
      avatar: myAvatarText,
      avatarUrl: myAvatarUrl,
      role,
      isOnline: true,
      lastMessage: '요청하신 수정사항 반영해서 오늘 8시에 전달드릴게요.',
      time: '10:42',
      unread: 2,
      counterpartUserId: null,
    },
    {
      id: 'room-2',
      nickname: '수현 디자이너',
      avatar: 'SH',
      role: '브랜드 디자인',
      isOnline: false,
      lastMessage: '브랜드 컬러 시안 3가지를 업로드했습니다.',
      time: '어제',
      unread: 0,
      counterpartUserId: 'sample-seller-2',
    },
    {
      id: 'room-3',
      nickname: '민규 라이프헬퍼',
      avatar: 'MK',
      role: '생활심부름',
      isOnline: true,
      lastMessage: '내일 오전 10시 방문 가능해요.',
      time: '04/12',
      unread: 1,
      counterpartUserId: 'sample-seller-3',
    },
  ]
}

export function buildDefaultMessages({ myNickname }) {
  return {
    'room-1': [
      { type: 'date', text: '2026년 4월 13일' },
      { type: 'other', text: '안녕하세요! 요청하신 작업 내용 확인했습니다.', time: '10:12' },
      { type: 'system', text: '주문이 수락되었습니다. 진행 상태는 주문내역에서 확인할 수 있습니다.' },
      { type: 'me', text: '좋습니다. 메인 섹션 카드 간격만 조금 더 넓혀주세요.', time: '10:31' },
      { type: 'other', text: '네, 간격과 타이포 정리해서 1차 시안 공유드릴게요.', time: '10:42' },
    ],
    'room-2': [
      { type: 'date', text: '2026년 4월 12일' },
      { type: 'other', text: '브랜드 무드보드 먼저 공유드릴게요.', time: '09:45' },
      { type: 'me', text: `${myNickname}입니다. 파스텔톤도 한 버전 부탁드려요.`, time: '09:52' },
      { type: 'other', text: '좋아요. 파스텔 버전도 같이 준비할게요.', time: '10:05' },
    ],
    'room-3': [
      { type: 'date', text: '2026년 4월 11일' },
      { type: 'other', text: '내일 오전 10시 방문 가능합니다.', time: '20:10' },
      { type: 'me', text: '확인했습니다. 주소는 주문서에 기입해둘게요.', time: '20:12' },
    ],
  }
}

function getUserScopedRoomKey(userId) {
  return `${CHAT_ROOMS_STORAGE_KEY}:${userId || 'guest'}`
}

function getUserScopedMessageKey(userId) {
  return `${CHAT_MESSAGES_STORAGE_KEY}:${userId || 'guest'}`
}

function getLastReadMap(userId) {
  try {
    const raw = localStorage.getItem(`${CHAT_LAST_READ_PREFIX}${userId}`)
    const parsed = JSON.parse(raw ?? '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function setLastReadMap(userId, map) {
  localStorage.setItem(`${CHAT_LAST_READ_PREFIX}${userId}`, JSON.stringify(map))
}

export function readChatRooms({ myNickname, myAvatarText, myAvatarUrl, role, userId }) {
  const fallback = buildDefaultRooms({
    myNickname,
    myAvatarText,
    myAvatarUrl,
    role,
  })
  try {
    const saved = JSON.parse(localStorage.getItem(getUserScopedRoomKey(userId)) ?? 'null')
    return Array.isArray(saved) && saved.length > 0 ? saved : fallback
  } catch {
    return fallback
  }
}

export function readChatMessages({ myNickname, userId }) {
  const fallback = buildDefaultMessages({ myNickname })
  try {
    const saved = JSON.parse(localStorage.getItem(getUserScopedMessageKey(userId)) ?? 'null')
    return saved && typeof saved === 'object' ? saved : fallback
  } catch {
    return fallback
  }
}

export function saveChatRooms(rooms, userId) {
  localStorage.setItem(getUserScopedRoomKey(userId), JSON.stringify(rooms))
}

export function saveChatMessages(messagesByRoom, userId) {
  localStorage.setItem(getUserScopedMessageKey(userId), JSON.stringify(messagesByRoom))
}

export function ensureChatRoom({
  rooms,
  messagesByRoom,
  counterpartUserId,
  sellerName,
  sellerAvatar,
  sellerAvatarUrl,
  sellerRole = '판매자',
  initialMessage = '안녕하세요, 문의드립니다.',
  systemMessage = '판매자와의 채팅이 시작되었습니다.',
}) {
  const existingRoom = (rooms ?? []).find((room) => room.counterpartUserId === counterpartUserId)
  if (existingRoom) {
    return {
      roomId: existingRoom.id,
      rooms: rooms ?? [],
      messagesByRoom: messagesByRoom ?? {},
      created: false,
    }
  }

  const roomId = `room-${Date.now()}`
  const createdTime = formatClockTime()
  const nextRoom = {
    id: roomId,
    nickname: sellerName ?? '판매자',
    avatar: sellerAvatar ?? 'PB',
    avatarUrl: sellerAvatarUrl ?? '',
    role: sellerRole,
    isOnline: true,
    lastMessage: systemMessage,
    time: createdTime,
    unread: 0,
    counterpartUserId: counterpartUserId ?? null,
  }

  return {
    roomId,
    rooms: [nextRoom, ...(rooms ?? [])],
    messagesByRoom: {
      ...(messagesByRoom ?? {}),
      [roomId]: [
        { type: 'date', text: new Date().toLocaleDateString('ko-KR') },
        { type: 'system', text: systemMessage },
        { type: 'me', text: initialMessage, time: createdTime },
      ],
    },
    created: true,
  }
}

function formatRoomTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function mapMessageRows(rows = [], currentUserId) {
  return rows.map((row) => ({
    id: row.id,
    type: row.sender_user_id === currentUserId ? 'me' : row.message_type === 'system' ? 'system' : 'other',
    text: row.body ?? '',
    time: formatRoomTime(row.created_at),
    createdAt: row.created_at ?? null,
    senderUserId: row.sender_user_id ?? null,
    messageType: row.message_type ?? 'text',
  }))
}

export async function ensureChatRoomForUsers({
  buyerUserId,
  sellerUserId,
  requestId = null,
}) {
  if (!supabase) {
    return {
      data: null,
      error: {
        message: 'SUPABASE_NOT_CONFIGURED',
        code: 'SUPABASE_NOT_CONFIGURED',
      },
    }
  }
  if (!buyerUserId || !sellerUserId) {
    return {
      data: null,
      error: {
        message: '채팅방 생성 대상 사용자 정보가 누락되었습니다.',
        code: 'MISSING_CHAT_USERS',
      },
    }
  }

  const { data: candidates, error: candidateError } = await supabase
    .from('chat_room_participants')
    .select('chat_room_id, chat_rooms!inner(id, request_id)')
    .in('user_id', [buyerUserId, sellerUserId])
  if (candidateError && !isSchemaCompatibilityError(candidateError)) {
    return { data: null, error: normalizeError(candidateError, '채팅방 조회에 실패했습니다.') }
  }
  if (candidateError && isSchemaCompatibilityError(candidateError)) {
    return { data: null, error: normalizeError(candidateError, '채팅 스키마가 준비되지 않았습니다.') }
  }

  const countMap = (candidates ?? []).reduce((acc, row) => {
    const roomId = row.chat_room_id
    if (!roomId) return acc
    acc.set(roomId, (acc.get(roomId) ?? 0) + 1)
    return acc
  }, new Map())
  const existingRoomId = Array.from(countMap.entries()).find(([, count]) => count >= 2)?.[0]
  if (existingRoomId) {
    return { data: { roomId: existingRoomId, created: false }, error: null }
  }

  const roomInsert = await supabase
    .from('chat_rooms')
    .insert({
      created_by: buyerUserId,
      request_id: requestId,
    })
    .select('id')
    .single()
  if (roomInsert.error) {
    return { data: null, error: normalizeError(roomInsert.error, '채팅방 생성에 실패했습니다.') }
  }

  const roomId = roomInsert.data.id
  const participantsInsert = await supabase.from('chat_room_participants').insert([
    {
      chat_room_id: roomId,
      user_id: buyerUserId,
      role: 'buyer',
    },
    {
      chat_room_id: roomId,
      user_id: sellerUserId,
      role: 'seller',
    },
  ])
  if (participantsInsert.error) {
    return {
      data: null,
      error: normalizeError(participantsInsert.error, '채팅방 참여자 등록에 실패했습니다.'),
    }
  }

  const systemMessageInsert = await supabase.from('messages').insert({
    room_id: roomId,
    sender_user_id: buyerUserId,
    message_type: 'system',
    body: '채팅신청이 수락되었습니다. 이제 대화를 시작할 수 있습니다.',
  })
  if (systemMessageInsert.error && !isSchemaCompatibilityError(systemMessageInsert.error)) {
    return {
      data: null,
      error: normalizeError(systemMessageInsert.error, '시스템 메시지 저장에 실패했습니다.'),
    }
  }

  return { data: { roomId, created: true }, error: null }
}

export async function fetchChatRoomsForUser({ userId }) {
  if (!supabase) return { data: [], error: normalizeError(createNotConfiguredError(), 'Supabase 미설정') }
  if (!userId) return { data: [], error: null }

  const participantResult = await supabase
    .from('chat_room_participants')
    .select('chat_room_id, user_id, last_read_at, chat_rooms!inner(id, updated_at, created_at)')
    .eq('user_id', userId)
  if (participantResult.error) {
    return { data: [], error: normalizeError(participantResult.error, '채팅방 목록을 불러오지 못했습니다.') }
  }

  const roomIds = (participantResult.data ?? []).map((item) => item.chat_room_id).filter(Boolean)
  if (roomIds.length === 0) return { data: [], error: null }

  const [allParticipantsResult, messagesResult] = await Promise.all([
    supabase
      .from('chat_room_participants')
      .select('chat_room_id, user_id, role')
      .in('chat_room_id', roomIds),
    supabase
      .from('messages')
      .select('id, room_id, sender_user_id, body, message_type, created_at')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false }),
  ])
  if (allParticipantsResult.error) {
    return {
      data: [],
      error: normalizeError(allParticipantsResult.error, '채팅 참여자 정보를 불러오지 못했습니다.'),
    }
  }
  if (messagesResult.error) {
    return {
      data: [],
      error: normalizeError(messagesResult.error, '채팅 메시지를 불러오지 못했습니다.'),
    }
  }

  const participantsByRoom = (allParticipantsResult.data ?? []).reduce((acc, row) => {
    const roomId = row.chat_room_id
    if (!roomId) return acc
    const list = acc.get(roomId) ?? []
    list.push(row)
    acc.set(roomId, list)
    return acc
  }, new Map())
  const counterpartIds = Array.from(
    new Set(
      (allParticipantsResult.data ?? [])
        .map((row) => row.user_id)
        .filter((id) => id && id !== userId),
    ),
  )
  let profileMap = new Map()
  if (counterpartIds.length > 0) {
    const profileResult = await supabase
      .from('profiles')
      .select('id, nickname, name, avatar_url')
      .in('id', counterpartIds)
    if (!profileResult.error) {
      profileMap = new Map((profileResult.data ?? []).map((row) => [row.id, row]))
    }
  }

  const lastReadMap = getLastReadMap(userId)
  const messagesByRoom = (messagesResult.data ?? []).reduce((acc, row) => {
    const list = acc.get(row.room_id) ?? []
    list.push(row)
    acc.set(row.room_id, list)
    return acc
  }, new Map())

  const rooms = (participantResult.data ?? [])
    .map((participant) => {
      const roomId = participant.chat_room_id
      const participants = participantsByRoom.get(roomId) ?? []
      const counterpart = participants.find((item) => item.user_id !== userId)
      const counterpartProfile = profileMap.get(counterpart?.user_id)
      const latestMessage = (messagesByRoom.get(roomId) ?? [])[0]
      const lastReadAt = lastReadMap[roomId] ?? participant.last_read_at ?? null
      const unread = (messagesByRoom.get(roomId) ?? []).filter((message) => {
        if (message.sender_user_id === userId) return false
        if (!lastReadAt) return true
        return new Date(message.created_at).getTime() > new Date(lastReadAt).getTime()
      }).length

      return {
        id: roomId,
        nickname: counterpartProfile?.nickname ?? counterpartProfile?.name ?? '대화 상대',
        avatar: toInitials(counterpartProfile?.nickname ?? counterpartProfile?.name ?? 'PB'),
        avatarUrl: counterpartProfile?.avatar_url ?? '',
        role: counterpart?.role === 'seller' ? '판매자' : '구매자',
        isOnline: true,
        lastMessage: latestMessage?.body ?? '대화를 시작해보세요.',
        time: formatRoomTime(latestMessage?.created_at ?? participant.chat_rooms?.updated_at),
        unread,
        counterpartUserId: counterpart?.user_id ?? null,
      }
    })
    .sort((a, b) => {
      const aMessages = messagesByRoom.get(a.id) ?? []
      const bMessages = messagesByRoom.get(b.id) ?? []
      const aTime = aMessages[0]?.created_at
      const bTime = bMessages[0]?.created_at
      return new Date(bTime ?? 0).getTime() - new Date(aTime ?? 0).getTime()
    })

  return { data: rooms, error: null }
}

export async function fetchMessagesByRoom({ roomId, currentUserId }) {
  if (!supabase) return { data: [], error: normalizeError(createNotConfiguredError(), 'Supabase 미설정') }
  if (!roomId) return { data: [], error: null }

  const { data, error } = await supabase
    .from('messages')
    .select('id, room_id, sender_user_id, body, created_at, message_type')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
  if (error) {
    return { data: [], error: normalizeError(error, '메시지를 불러오지 못했습니다.') }
  }
  return {
    data: mapMessageRows(data ?? [], currentUserId),
    error: null,
  }
}

export async function sendChatMessage({ roomId, senderUserId, body, receiverUserId = null }) {
  if (!supabase) return { data: null, error: normalizeError(createNotConfiguredError(), 'Supabase 미설정') }
  if (!roomId || !senderUserId || !String(body).trim()) {
    return {
      data: null,
      error: {
        message: '메시지 전송 필수값이 누락되었습니다.',
        code: 'MISSING_MESSAGE_DATA',
      },
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_user_id: senderUserId,
      receiver_user_id: receiverUserId,
      body: String(body).trim(),
      message_type: 'text',
    })
    .select('id, room_id, sender_user_id, body, created_at, message_type')
    .single()
  if (error) {
    return { data: null, error: normalizeError(error, '메시지 전송에 실패했습니다.') }
  }
  return { data, error: null }
}

export async function markChatRoomAsRead({ roomId, userId }) {
  if (!roomId || !userId) return { data: null, error: null }
  const lastReadMap = getLastReadMap(userId)
  lastReadMap[roomId] = new Date().toISOString()
  setLastReadMap(userId, lastReadMap)

  if (!supabase) return { data: null, error: null }
  const { error } = await supabase
    .from('chat_room_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('chat_room_id', roomId)
    .eq('user_id', userId)
  if (error && !isSchemaCompatibilityError(error)) {
    return { data: null, error: normalizeError(error, '읽음 처리에 실패했습니다.') }
  }
  return { data: { roomId }, error: null }
}

export async function getChatUnreadCountForUser({ userId }) {
  const roomsResult = await fetchChatRoomsForUser({ userId })
  if (roomsResult.error) {
    return { data: 0, error: roomsResult.error }
  }
  const unread = (roomsResult.data ?? []).reduce((sum, room) => sum + Number(room.unread ?? 0), 0)
  return { data: unread, error: null }
}
