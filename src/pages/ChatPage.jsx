import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import BrandLoader from '../components/common/BrandLoader'
import useAuth from '../hooks/useAuth'
import {
  ensureChatRoomForUsers,
  fetchChatRoomsForUser,
  fetchMessagesByRoom,
  markChatRoomAsRead,
  sendChatMessage,
} from '../lib/chat'

function ChatPage() {
  const location = useLocation()
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [selectedChat, setSelectedChat] = useState('')
  const [messages, setMessages] = useState([])
  const [draftMessage, setDraftMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const refreshRooms = async ({ preserveRoomId = '', showLoader = false } = {}) => {
    if (!user?.id) {
      setRooms([])
      setIsLoadingRooms(false)
      return
    }
    if (showLoader) setIsLoadingRooms(true)
    const { data, error } = await fetchChatRoomsForUser({ userId: user.id })
    if (showLoader) setIsLoadingRooms(false)
    if (error) {
      setStatusMessage(error.message ?? '채팅방 목록을 불러오지 못했습니다.')
      setRooms([])
      return
    }
    const nextRooms = data ?? []
    setRooms(nextRooms)
    if (preserveRoomId && nextRooms.some((room) => room.id === preserveRoomId)) {
      setSelectedChat(preserveRoomId)
      return
    }
    setSelectedChat((prev) => {
      if (prev && nextRooms.some((room) => room.id === prev)) return prev
      return nextRooms[0]?.id ?? ''
    })
  }

  useEffect(() => {
    let mounted = true
    const startChat = location.state?.startChat
    const init = async () => {
      if (!user?.id) {
        setRooms([])
        setSelectedChat('')
        setIsLoadingRooms(false)
        return
      }
      if (startChat?.sellerUserId) {
        const { data, error } = await ensureChatRoomForUsers({
          buyerUserId: user.id,
          sellerUserId: startChat.sellerUserId,
        })
        if (!mounted) return
        if (error) {
          setStatusMessage(error.message ?? '채팅방 생성에 실패했습니다.')
        }
        await refreshRooms({ preserveRoomId: data?.roomId ?? '', showLoader: true })
        return
      }
      await refreshRooms({ showLoader: true })
    }
    init()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, user?.id])

  useEffect(() => {
    const roomId = location.state?.openRoomId
    if (!roomId) return
    setSelectedChat(roomId)
  }, [location.state])

  useEffect(() => {
    let mounted = true
    if (!selectedChat || !user?.id) {
      setMessages([])
      return
    }
    setIsLoadingMessages(true)
    fetchMessagesByRoom({ roomId: selectedChat, currentUserId: user.id })
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          setStatusMessage(error.message ?? '메시지를 불러오지 못했습니다.')
          setMessages([])
          return
        }
        setMessages(data ?? [])
      })
      .finally(() => {
        if (mounted) setIsLoadingMessages(false)
      })

    markChatRoomAsRead({ roomId: selectedChat, userId: user.id }).then(() => {
      refreshRooms({ preserveRoomId: selectedChat })
    })
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, user?.id])

  useEffect(() => {
    if (!selectedChat || !user?.id) return undefined
    const timer = window.setInterval(() => {
      fetchMessagesByRoom({ roomId: selectedChat, currentUserId: user.id }).then(({ data, error }) => {
        if (error) return
        setMessages(data ?? [])
      })
      refreshRooms({ preserveRoomId: selectedChat })
    }, 3500)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, user?.id])

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === selectedChat) ?? rooms[0],
    [rooms, selectedChat],
  )

  const handleSendMessage = async () => {
    if (!activeRoom?.id || !user?.id) return
    if (!draftMessage.trim()) return
    setIsSending(true)
    const { error } = await sendChatMessage({
      roomId: activeRoom.id,
      senderUserId: user.id,
      receiverUserId: activeRoom.counterpartUserId ?? null,
      body: draftMessage,
    })
    setIsSending(false)
    if (error) {
      setStatusMessage(error.message ?? '메시지 전송에 실패했습니다.')
      return
    }
    setDraftMessage('')
    const [messagesResult] = await Promise.all([
      fetchMessagesByRoom({ roomId: activeRoom.id, currentUserId: user.id }),
      refreshRooms({ preserveRoomId: activeRoom.id }),
    ])
    if (!messagesResult.error) setMessages(messagesResult.data ?? [])
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>채팅</h1>
        <p>작업 요청 전후로 판매자와 빠르게 대화해보세요.</p>
      </section>

      <section className="chat-layout">
        {isLoadingRooms ? (
          <section className="main-card chat-loading-card">
            <BrandLoader label="채팅방 불러오는 중" />
          </section>
        ) : (
          <>
            <aside className="main-card chat-room-list">
              <h2>채팅방</h2>
              <div className="chat-room-items">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className={`chat-room-item ${room.id === activeRoom?.id ? 'active' : ''}`}
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
                    {isLoadingMessages ? (
                      <BrandLoader label="메시지 불러오는 중" size="sm" />
                    ) : (
                      messages.map((message) => {
                        if (message.type === 'system') {
                          return (
                            <div key={message.id ?? message.text} className="chat-system-message">
                              {message.text}
                            </div>
                          )
                        }

                        return (
                          <div
                            key={message.id ?? `${message.createdAt}-${message.text}`}
                            className={`chat-bubble-row ${message.type === 'me' ? 'me' : 'other'}`}
                          >
                            <div className="chat-bubble">
                              <p>{message.text}</p>
                              <span>{message.time}</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <footer className="chat-input-row">
                    <input
                      type="text"
                      value={draftMessage}
                      onChange={(event) => setDraftMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' || event.shiftKey) return
                        event.preventDefault()
                        handleSendMessage()
                      }}
                      placeholder={`${activeRoom.nickname}에게 메시지 보내기`}
                      aria-label="채팅 메시지 입력"
                    />
                    <button type="button" onClick={handleSendMessage} disabled={isSending}>
                      {isSending ? '전송 중...' : '전송'}
                    </button>
                  </footer>
                </>
              )}
            </section>
          </>
        )}
      </section>
      {statusMessage ? <p className="muted">{statusMessage}</p> : null}
    </div>
  )
}

export default ChatPage
