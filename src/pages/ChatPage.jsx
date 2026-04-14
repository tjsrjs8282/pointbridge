import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import {
  ensureChatRoom,
  readChatMessages,
  readChatRooms,
  saveChatMessages,
  saveChatRooms,
} from '../lib/chat'

function ChatPage() {
  const location = useLocation()
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
  const [rooms, setRooms] = useState(() =>
    readChatRooms({
      myNickname,
      myAvatarText,
      myAvatarUrl,
      role: profile?.role ?? '사용자',
    }),
  )
  const [messagesByRoom, setMessagesByRoom] = useState(() => {
    return readChatMessages({ myNickname })
  })
  const [selectedChat, setSelectedChat] = useState(() => {
    const firstRoom = rooms[0]
    return firstRoom?.id ?? 'room-1'
  })

  useEffect(() => {
    saveChatRooms(rooms)
  }, [rooms])

  useEffect(() => {
    saveChatMessages(messagesByRoom)
  }, [messagesByRoom])

  useEffect(() => {
    const freshRooms = readChatRooms({
      myNickname,
      myAvatarText,
      myAvatarUrl,
      role: profile?.role ?? '사용자',
    })
    const startChat = location.state?.startChat
    if (!startChat?.sellerUserId) return

    const ensured = ensureChatRoom({
      rooms: freshRooms,
      messagesByRoom,
      sellerUserId: startChat.sellerUserId,
      sellerName: startChat.sellerName,
      sellerAvatar: startChat.sellerAvatar,
      sellerAvatarUrl: startChat.sellerAvatarUrl,
      sellerRole: startChat.sellerRole ?? '판매자',
      systemMessage: '판매자와의 채팅이 시작되었습니다.',
      initialMessage: '안녕하세요, 문의드립니다.',
    })
    if (!ensured.created) {
      setRooms(freshRooms)
      setSelectedChat(ensured.roomId)
      return
    }
    setRooms(ensured.rooms)
    setMessagesByRoom(ensured.messagesByRoom)
    setSelectedChat(ensured.roomId)
  }, [location.state, messagesByRoom, myNickname, myAvatarText, myAvatarUrl, profile?.role])

  useEffect(() => {
    const roomId = location.state?.openRoomId
    if (!roomId) return
    const matchedRoom = rooms.find((room) => room.id === roomId)
    if (matchedRoom) setSelectedChat(roomId)
  }, [location.state, rooms])

  const activeRoom = useMemo(() => rooms.find((room) => room.id === selectedChat) ?? rooms[0], [rooms, selectedChat])
  const messages = activeRoom ? messagesByRoom[activeRoom.id] ?? [] : []

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
                  <div className={`chat-room-avatar ${room.avatarUrl ? 'image' : ''}`}>
                    {room.avatarUrl ? <img src={room.avatarUrl} alt={`${room.nickname} 프로필`} /> : room.avatar}
                  </div>
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
          {!activeRoom ? (
            <div className="chat-messages">
              <p className="muted">아직 생성된 채팅방이 없습니다.</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </section>
      </section>
    </div>
  )
}

export default ChatPage
