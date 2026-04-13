import { useMemo, useState } from 'react'
import useAuth from '../hooks/useAuth'

function ChatPage() {
  const { profile, user } = useAuth()
  const myNickname =
    profile?.nickname ??
    profile?.name ??
    user?.user_metadata?.nickname ??
    user?.user_metadata?.name ??
    user?.email?.split('@')?.[0] ??
    '나'

  const myAvatarUrl = profile?.avatar_url ?? ''
  const myAvatarText = myNickname.slice(0, 2).toUpperCase()
  const rooms = [
    {
      id: 'room-1',
      nickname: myNickname,
      avatar: myAvatarText,
      avatarUrl: myAvatarUrl,
      role: profile?.role ?? '사용자',
      isOnline: true,
      lastMessage: '요청하신 수정사항 반영해서 오늘 8시에 전달드릴게요.',
      time: '10:42',
      unread: 2,
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
    },
  ]
  const [selectedChat, setSelectedChat] = useState('room-1')
  const messagesByRoom = {
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
  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === selectedChat) ?? rooms[0],
    [selectedChat],
  )
  const messages = messagesByRoom[activeRoom.id] ?? []

  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">채팅</p>
        <h1>채팅</h1>
        <p>작업 요청 전후로 판매자와 빠르게 대화해보세요.</p>
      </section>

      <section className="chat-layout">
        <aside className="main-card chat-room-list">
          <h2>채팅방</h2>
          <div className="chat-room-items">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                className={`chat-room-item ${room.id === activeRoom.id ? 'active' : ''}`}
                onClick={() => setSelectedChat(room.id)}
                aria-pressed={room.id === selectedChat}
              >
                <div className="chat-room-user">
                  <div className="chat-room-avatar">{room.avatar}</div>
                  <div>
                    <strong>{room.nickname}</strong>
                    <p>{room.lastMessage}</p>
                  </div>
                </div>
                <div className="chat-room-meta">
                  <span>{room.time}</span>
                  {room.unread > 0 ? <em>{room.unread}</em> : null}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="main-card chat-conversation">
          <header className="chat-header">
            <div className="chat-header-user">
              {activeRoom.avatarUrl ? (
                <div className="chat-header-avatar image">
                  <img src={activeRoom.avatarUrl} alt="채팅 상대 프로필" />
                </div>
              ) : (
                <div className="chat-header-avatar">{activeRoom.avatar}</div>
              )}
              <div>
                <h3>{activeRoom.nickname}</h3>
                <p>{activeRoom.role}</p>
              </div>
            </div>
            <span className={`chat-status ${activeRoom.isOnline ? 'on' : 'off'}`}>
              {activeRoom.isOnline ? '온라인' : '오프라인'}
            </span>
          </header>

          <div className="chat-messages">
            {messages.map((message, index) => {
              if (message.type === 'date') {
                return (
                  <div key={`${message.text}-${index}`} className="chat-date-divider">
                    {message.text}
                  </div>
                )
              }

              if (message.type === 'system') {
                return (
                  <div key={`${message.text}-${index}`} className="chat-system-message">
                    {message.text}
                  </div>
                )
              }

              return (
                <div
                  key={`${message.text}-${index}`}
                  className={`chat-bubble-row ${message.type === 'me' ? 'me' : 'other'}`}
                >
                  <div className="chat-bubble">
                    <p>{message.text}</p>
                    <span>{message.time}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <footer className="chat-input-row">
            <input
              type="text"
              value={`${activeRoom.nickname}에게 메시지 보내기`}
              readOnly
              aria-label="채팅 메시지 입력"
            />
            <button type="button">전송</button>
          </footer>
        </section>
      </section>
    </div>
  )
}

export default ChatPage
