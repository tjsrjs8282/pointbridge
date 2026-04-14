export const CHAT_ROOMS_STORAGE_KEY = 'pointbridge:chatRooms'
export const CHAT_MESSAGES_STORAGE_KEY = 'pointbridge:chatMessages'

function formatClockTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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
      sellerUserId: null,
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
      sellerUserId: 'sample-seller-2',
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
      sellerUserId: 'sample-seller-3',
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

export function readChatRooms({ myNickname, myAvatarText, myAvatarUrl, role }) {
  const fallback = buildDefaultRooms({
    myNickname,
    myAvatarText,
    myAvatarUrl,
    role,
  })
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_ROOMS_STORAGE_KEY) ?? 'null')
    return Array.isArray(saved) && saved.length > 0 ? saved : fallback
  } catch {
    return fallback
  }
}

export function readChatMessages({ myNickname }) {
  const fallback = buildDefaultMessages({ myNickname })
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY) ?? 'null')
    return saved && typeof saved === 'object' ? saved : fallback
  } catch {
    return fallback
  }
}

export function saveChatRooms(rooms) {
  localStorage.setItem(CHAT_ROOMS_STORAGE_KEY, JSON.stringify(rooms))
}

export function saveChatMessages(messagesByRoom) {
  localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messagesByRoom))
}

export function ensureChatRoom({
  rooms,
  messagesByRoom,
  sellerUserId,
  sellerName,
  sellerAvatar,
  sellerAvatarUrl,
  sellerRole = '판매자',
  initialMessage = '안녕하세요, 문의드립니다.',
  systemMessage = '판매자와의 채팅이 시작되었습니다.',
}) {
  const existingRoom = (rooms ?? []).find((room) => room.sellerUserId === sellerUserId)
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
    sellerUserId: sellerUserId ?? null,
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
