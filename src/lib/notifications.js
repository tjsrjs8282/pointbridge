import { supabase } from './supabase'

const NOTIFICATIONS_STORAGE_KEY = 'pointbridge:notifications'

export const REJECTION_REASONS = [
  { code: 'unavailable_schedule', label: '현재 작업 가능 일정이 아닙니다.' },
  { code: 'out_of_scope', label: '요청 내용이 서비스 범위를 벗어났습니다.' },
  { code: 'insufficient_material', label: '전달 자료가 부족합니다.' },
  { code: 'budget_mismatch', label: '예산/포인트가 맞지 않습니다.' },
  { code: 'internal_issue', label: '기타 내부 사정으로 진행이 어렵습니다.' },
  { code: 'other', label: '기타' },
]

export const CHAT_REJECTION_REASONS = [
  { code: 'busy_schedule', label: '현재 일정상 채팅 응답이 어렵습니다.' },
  { code: 'insufficient_info', label: '요청 정보가 부족해 진행이 어렵습니다.' },
  { code: 'out_of_scope', label: '요청 내용이 제공 범위를 벗어났습니다.' },
  { code: 'other', label: '기타' },
]

function nowIso() {
  return new Date().toISOString()
}

function randomId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveAll(items) {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items))
}

function toReasonLabel(code) {
  return REJECTION_REASONS.find((item) => item.code === code)?.label ?? ''
}

function buildSeed(userId, displayName) {
  const requestId = randomId('req')
  return [
    {
      notificationId: randomId('noti'),
      userId,
      type: 'service_request',
      actionType: 'order_request',
      actorId: 'buyer-demo',
      actorName: '김철수',
      sellerId: userId,
      buyerId: 'buyer-demo',
      serviceId: 'service-demo',
      serviceTitle: '영상 편집 3000P',
      points: 3000,
      status: 'pending',
      rejectionReasonCode: '',
      rejectionReasonText: '',
      createdAt: nowIso(),
      isRead: false,
      orderId: null,
      requestId,
      metadata: { requestId },
      message: `${displayName}님에게 서비스 신청이 도착했습니다.`,
    },
    {
      notificationId: randomId('noti'),
      userId,
      type: 'system',
      actionType: 'system',
      actorId: null,
      actorName: 'PointBridge',
      sellerId: null,
      buyerId: null,
      serviceId: null,
      serviceTitle: '',
      points: 0,
      status: 'accepted',
      rejectionReasonCode: '',
      rejectionReasonText: '',
      createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      isRead: false,
      orderId: null,
      requestId: null,
      metadata: {},
      message: '새로운 기능: 알림 센터가 업데이트되었습니다.',
    },
  ]
}

function readNotificationsForUserLocal({ userId, displayName = '사용자' }) {
  if (!userId) return []
  const all = readAll()
  const scoped = all.filter((item) => item.userId === userId)
  if (scoped.length > 0) return scoped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const seeded = buildSeed(userId, displayName)
  saveAll([...all, ...seeded])
  return seeded
}

export function saveNotificationsForUser({ userId, notifications }) {
  const all = readAll().filter((item) => item.userId !== userId)
  saveAll([...all, ...notifications])
}

function normalizeError(error, fallbackMessage) {
  return {
    message: fallbackMessage,
    code: error?.code ?? 'NOTIFICATION_ERROR',
    details: error?.details ?? null,
  }
}

function isSchemaCompatibilityError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  const code = String(error?.code ?? '').toUpperCase()
  return (
    code === 'PGRST204' ||
    code === '23502' ||
    code === '22P02' ||
    message.includes('column') ||
    message.includes('does not exist') ||
    message.includes('schema') ||
    message.includes('relation') ||
    error?.code === 'PGRST204'
  )
}

function normalizeUuidOrNull(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(raw) ? raw : null
}

function normalizeBigintOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  if (!Number.isInteger(parsed)) return null
  return parsed
}

function mapNotificationRow(row) {
  const actionType = row.action_type ?? row.actionType ?? row.type ?? 'system'
  const metadata = row.metadata ?? {}
  const rejectionReasonCode = metadata.rejection_reason_code ?? row.rejection_reason_code ?? ''
  const rejectionReasonText = metadata.rejection_reason_text ?? row.rejection_reason_text ?? toReasonLabel(rejectionReasonCode)
  return {
    notificationId: row.id ?? row.notificationId,
    userId: row.user_id ?? row.userId,
    type: row.type ?? actionType,
    actionType,
    actorId: row.actor_user_id ?? row.actorId ?? null,
    actorName: metadata.actor_name ?? row.actor_name ?? row.actorName ?? '',
    sellerId: metadata.seller_id ?? row.seller_id ?? row.sellerId ?? null,
    buyerId: metadata.buyer_id ?? row.buyer_id ?? row.buyerId ?? null,
    serviceId: row.service_id ?? metadata.service_id ?? row.serviceId ?? null,
    serviceTitle: metadata.service_title ?? row.service_title ?? row.serviceTitle ?? '',
    points: Number(metadata.points ?? row.points ?? 0),
    status: metadata.status ?? row.status ?? 'pending',
    rejectionReasonCode,
    rejectionReasonText,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    isRead: Boolean(row.is_read ?? row.isRead),
    orderId: row.order_id ?? row.related_order_id ?? metadata.order_id ?? row.orderId ?? null,
    requestId: metadata.request_id ?? row.request_id ?? row.requestId ?? null,
    metadata,
    message: row.body ?? row.message ?? row.title ?? '',
  }
}

async function insertNotification(payload) {
  if (!supabase) return { data: null, error: { message: 'SUPABASE_NOT_CONFIGURED' } }

  const safePayload = {
    ...payload,
    type: payload.type ?? payload.action_type ?? 'system',
    order_id: normalizeUuidOrNull(payload.order_id),
    service_id: normalizeUuidOrNull(payload.service_id),
    related_order_id: normalizeBigintOrNull(payload.related_order_id ?? payload.order_id),
  }

  // New schema first
  const { data, error } = await supabase
    .from('notifications')
    .insert(safePayload)
    .select('*')
    .single()
  if (!error) return { data, error: null }
  if (!isSchemaCompatibilityError(error)) return { data: null, error }

  // Legacy fallback schema compatibility
  const legacyPayload = {
    user_id: safePayload.user_id,
    type: safePayload.action_type ?? safePayload.type ?? 'system',
    title: safePayload.title ?? '알림',
    body: safePayload.body ?? '',
    related_order_id: safePayload.related_order_id ?? null,
    is_read: false,
  }
  const legacyResult = await supabase
    .from('notifications')
    .insert(legacyPayload)
    .select('*')
    .single()
  return {
    data: legacyResult.data,
    error: legacyResult.error,
  }
}

export async function readNotificationsForUser({ userId, displayName = '사용자' }) {
  if (!userId) return { data: [], error: null }
  if (!supabase) {
    return {
      data: readNotificationsForUserLocal({ userId, displayName }),
      error: null,
    }
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    if (isSchemaCompatibilityError(error)) {
      return {
        data: readNotificationsForUserLocal({ userId, displayName }),
        error: null,
      }
    }
    return {
      data: [],
      error: normalizeError(error, '알림 목록을 불러오지 못했습니다.'),
    }
  }

  return {
    data: (data ?? []).map(mapNotificationRow),
    error: null,
  }
}

export async function markNotificationAsRead({ notificationId }) {
  if (!notificationId) return { data: null, error: null }
  if (!supabase) {
    const all = readAll()
    saveAll(
      all.map((item) =>
        item.notificationId === notificationId
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    )
    return { data: null, error: null }
  }
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select('*')
    .single()
  if (error) return { data: null, error: normalizeError(error, '알림 읽음 처리에 실패했습니다.') }
  return { data, error: null }
}

export async function markAllNotificationsAsRead({ userId }) {
  if (!userId) return { data: null, error: null }
  if (!supabase) {
    const all = readAll()
    saveAll(
      all.map((item) =>
        item.userId === userId
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    )
    return { data: null, error: null }
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
  if (error) return { data: null, error: normalizeError(error, '전체 알림 읽음 처리에 실패했습니다.') }
  return { data, error: null }
}

export async function deleteNotification({ notificationId, userId = null }) {
  if (!notificationId) return { data: null, error: null }
  if (!supabase) {
    const all = readAll()
    const next = all.filter((item) => {
      if (item.notificationId !== notificationId) return true
      if (!userId) return false
      return item.userId !== userId
    })
    saveAll(next)
    return { data: null, error: null }
  }

  let query = supabase.from('notifications').delete().eq('id', notificationId)
  if (userId) {
    query = query.eq('user_id', userId)
  }
  const { error } = await query
  if (error) return { data: null, error: normalizeError(error, '알림 삭제에 실패했습니다.') }
  return { data: { notificationId }, error: null }
}

export async function deleteAllNotificationsForUser({ userId }) {
  if (!userId) return { data: null, error: null }
  if (!supabase) {
    const all = readAll()
    saveAll(all.filter((item) => item.userId !== userId))
    return { data: null, error: null }
  }

  const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
  if (error) return { data: null, error: normalizeError(error, '전체 알림 삭제에 실패했습니다.') }
  return { data: null, error: null }
}

export async function pushServiceRequestNotification({
  sellerUserId,
  buyerUserId,
  actorId,
  actorName,
  serviceId,
  serviceTitle,
  points,
  orderId = null,
  requestId = randomId('req'),
}) {
  if (!supabase) {
    const all = readAll()
    const now = nowIso()
    const sellerNotification = {
      notificationId: randomId('noti'),
      userId: sellerUserId,
      type: 'service_request',
      actionType: 'order_request',
      actorId,
      actorName,
      sellerId: sellerUserId,
      buyerId: buyerUserId,
      serviceId: serviceId ?? null,
      serviceTitle,
      points: Number(points ?? 0),
      status: 'pending',
      rejectionReasonCode: '',
      rejectionReasonText: '',
      createdAt: now,
      isRead: false,
      orderId,
      requestId,
      metadata: { orderId, requestId },
      message: `${actorName ?? '구매자'}님이 '${serviceTitle}' 서비스를 신청했습니다.`,
    }
    const buyerNotification = {
      notificationId: randomId('noti'),
      userId: buyerUserId,
      type: 'service_request',
      actionType: 'order_request',
      actorId,
      actorName,
      sellerId: sellerUserId,
      buyerId: buyerUserId,
      serviceId: serviceId ?? null,
      serviceTitle,
      points: Number(points ?? 0),
      status: 'pending',
      rejectionReasonCode: '',
      rejectionReasonText: '',
      createdAt: now,
      isRead: false,
      orderId,
      requestId,
      metadata: { orderId, requestId },
      message: `'${serviceTitle}' 서비스 신청이 접수되었습니다.`,
    }
    saveAll([...all, sellerNotification, buyerNotification])
    return { data: { requestId }, error: null }
  }

  const sellerPayload = {
    user_id: sellerUserId,
    actor_user_id: actorId ?? buyerUserId,
    action_type: 'order_request',
    order_id: orderId,
    service_id: serviceId ?? null,
    title: '새 주문 신청',
    body: `${actorName ?? '구매자'}님이 '${serviceTitle}' 서비스를 신청했습니다.`,
    is_read: false,
    metadata: {
      actor_name: actorName ?? '구매자',
      seller_id: sellerUserId,
      buyer_id: buyerUserId,
      service_title: serviceTitle,
      points: Number(points ?? 0),
      status: 'pending',
      request_id: requestId,
      order_id: orderId,
    },
  }
  const buyerPayload = {
    user_id: buyerUserId,
    actor_user_id: sellerUserId,
    action_type: 'order_request',
    order_id: orderId,
    service_id: serviceId ?? null,
    title: '주문 신청 접수',
    body: `'${serviceTitle}' 서비스 신청이 접수되었습니다.`,
    is_read: false,
    metadata: {
      actor_name: actorName ?? '구매자',
      seller_id: sellerUserId,
      buyer_id: buyerUserId,
      service_title: serviceTitle,
      points: Number(points ?? 0),
      status: 'pending',
      request_id: requestId,
      order_id: orderId,
    },
  }

  const [sellerInsert, buyerInsert] = await Promise.all([
    insertNotification(sellerPayload),
    insertNotification(buyerPayload),
  ])
  const insertionError = sellerInsert.error ?? buyerInsert.error
  if (insertionError) {
    return {
      data: null,
      error: normalizeError(insertionError, '주문 신청 알림 생성에 실패했습니다.'),
    }
  }
  return { data: { requestId }, error: null }
}

async function updateOrderStatus({
  orderId,
  status,
  rejectionReasonCode = '',
  rejectionReasonText = '',
}) {
  if (!supabase || !orderId) return { data: null, error: null }

  const timestampKey = status === 'accepted' ? 'accepted_at' : 'rejected_at'
  const richPayload = {
    status,
    [timestampKey]: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rejection_reason_code: status === 'rejected' ? rejectionReasonCode : null,
    rejection_reason_text: status === 'rejected' ? rejectionReasonText : null,
  }

  const richResult = await supabase.from('orders').update(richPayload).eq('id', orderId).select('*').single()
  if (!richResult.error) return { data: richResult.data, error: null }
  if (!isSchemaCompatibilityError(richResult.error)) {
    return {
      data: null,
      error: normalizeError(richResult.error, '주문 상태 변경에 실패했습니다.'),
    }
  }

  const basicPayload = {
    status,
    [timestampKey]: new Date().toISOString(),
  }
  const basicResult = await supabase.from('orders').update(basicPayload).eq('id', orderId).select('*').single()
  if (basicResult.error) {
    return {
      data: null,
      error: normalizeError(basicResult.error, '주문 상태 변경에 실패했습니다.'),
    }
  }
  return { data: basicResult.data, error: null }
}

export async function pushDecisionNotification({
  buyerUserId,
  sellerUserId,
  actorName,
  serviceTitle,
  points,
  status,
  orderId = null,
  rejectionReasonCode = '',
  rejectionReasonText = '',
  requestId,
}) {
  const reasonText = rejectionReasonText || (rejectionReasonCode ? toReasonLabel(rejectionReasonCode) : '')

  const orderUpdate = await updateOrderStatus({
    orderId,
    status,
    rejectionReasonCode,
    rejectionReasonText: reasonText,
  })
  if (orderUpdate.error) return { data: null, error: orderUpdate.error }

  if (!supabase) {
    const all = readAll()
    const item = {
      notificationId: randomId('noti'),
      userId: buyerUserId,
      type: status === 'accepted' ? 'request_accepted' : 'request_rejected',
      actionType: status === 'accepted' ? 'order_accepted' : 'order_rejected',
      actorId: sellerUserId,
      actorName: actorName ?? '판매자',
      sellerId: sellerUserId,
      buyerId: buyerUserId,
      serviceId: null,
      serviceTitle,
      points: Number(points ?? 0),
      status,
      rejectionReasonCode,
      rejectionReasonText: reasonText,
      createdAt: nowIso(),
      isRead: false,
      orderId,
      requestId,
      metadata: { orderId, requestId, rejectionReasonCode },
      message:
        status === 'accepted'
          ? `'${serviceTitle}' 서비스 신청이 수락되었습니다.`
          : `'${serviceTitle}' 서비스 신청이 거절되었습니다.`,
    }
    saveAll([...all, item])
    return { data: item, error: null }
  }

  const payload = {
    user_id: buyerUserId,
    actor_user_id: sellerUserId,
    action_type: status === 'accepted' ? 'order_accepted' : 'order_rejected',
    order_id: orderId,
    title: status === 'accepted' ? '주문 수락' : '주문 거절',
    body:
      status === 'accepted'
        ? `'${serviceTitle}' 서비스 신청이 수락되었습니다.`
        : `'${serviceTitle}' 서비스 신청이 거절되었습니다.`,
    is_read: false,
    metadata: {
      actor_name: actorName ?? '판매자',
      seller_id: sellerUserId,
      buyer_id: buyerUserId,
      service_title: serviceTitle,
      points: Number(points ?? 0),
      status,
      request_id: requestId,
      order_id: orderId,
      rejection_reason_code: rejectionReasonCode,
      rejection_reason_text: reasonText,
    },
  }
  const insertResult = await insertNotification(payload)
  if (insertResult.error) {
    return {
      data: null,
      error: normalizeError(insertResult.error, '주문 상태 알림 생성에 실패했습니다.'),
    }
  }
  return { data: insertResult.data, error: null }
}

export async function pushChatRequestNotification({
  sellerUserId,
  buyerUserId,
  actorId,
  actorName,
  requestId = randomId('chat-req'),
}) {
  const safeActorName = actorName ?? '사용자'
  if (!supabase) {
    const all = readAll()
    const now = nowIso()
    const sellerNotification = {
      notificationId: randomId('noti'),
      userId: sellerUserId,
      type: 'chat_request',
      actionType: 'chat_request',
      actorId: actorId ?? buyerUserId,
      actorName: safeActorName,
      sellerId: sellerUserId,
      buyerId: buyerUserId,
      serviceId: null,
      serviceTitle: '채팅신청',
      points: 0,
      status: 'pending',
      rejectionReasonCode: '',
      rejectionReasonText: '',
      createdAt: now,
      isRead: false,
      orderId: null,
      requestId,
      metadata: { request_id: requestId, seller_id: sellerUserId, buyer_id: buyerUserId },
      message: `${safeActorName}님이 채팅을 신청하였습니다.`,
    }
    const buyerNotification = {
      notificationId: randomId('noti'),
      userId: buyerUserId,
      type: 'chat_request',
      actionType: 'chat_request_sent',
      actorId: sellerUserId,
      actorName: 'PointBridge',
      sellerId: sellerUserId,
      buyerId: buyerUserId,
      serviceId: null,
      serviceTitle: '채팅신청',
      points: 0,
      status: 'pending',
      rejectionReasonCode: '',
      rejectionReasonText: '',
      createdAt: now,
      isRead: false,
      orderId: null,
      requestId,
      metadata: { request_id: requestId, seller_id: sellerUserId, buyer_id: buyerUserId },
      message: '채팅신청이 접수되었습니다. 판매자 응답을 기다려 주세요.',
    }
    saveAll([...all, sellerNotification, buyerNotification])
    return { data: { requestId }, error: null }
  }

  const sellerPayload = {
    user_id: sellerUserId,
    actor_user_id: actorId ?? buyerUserId,
    action_type: 'chat_request',
    title: '채팅신청 도착',
    body: `${safeActorName}님이 채팅을 신청하였습니다.`,
    is_read: false,
    metadata: {
      actor_name: safeActorName,
      seller_id: sellerUserId,
      buyer_id: buyerUserId,
      request_id: requestId,
      status: 'pending',
    },
  }
  const buyerPayload = {
    user_id: buyerUserId,
    actor_user_id: sellerUserId,
    action_type: 'chat_request_sent',
    title: '채팅신청 접수',
    body: '채팅신청이 접수되었습니다. 판매자 응답을 기다려 주세요.',
    is_read: false,
    metadata: {
      actor_name: 'PointBridge',
      seller_id: sellerUserId,
      buyer_id: buyerUserId,
      request_id: requestId,
      status: 'pending',
    },
  }
  const [sellerInsert, buyerInsert] = await Promise.all([
    insertNotification(sellerPayload),
    insertNotification(buyerPayload),
  ])
  const insertionError = sellerInsert.error ?? buyerInsert.error
  if (insertionError) {
    return {
      data: null,
      error: normalizeError(insertionError, '채팅신청 알림 생성에 실패했습니다.'),
    }
  }
  return { data: { requestId }, error: null }
}

export async function pushChatDecisionNotification({
  buyerUserId,
  sellerUserId,
  actorName,
  status,
  requestId,
  rejectionReasonCode = '',
  rejectionReasonText = '',
}) {
  const reasonText = rejectionReasonText || (rejectionReasonCode ? toReasonLabel(rejectionReasonCode) : '')
  const accepted = status === 'accepted'
  const actionType = accepted ? 'chat_request_accepted' : 'chat_request_rejected'
  const title = accepted ? '채팅신청 수락' : '채팅신청 거절'
  const body = accepted
    ? '채팅신청이 수락되었습니다. 이제 대화를 시작할 수 있습니다.'
    : reasonText
      ? `다음 사유로 채팅신청이 거절되었습니다: ${reasonText}`
      : '채팅신청이 거절되었습니다.'

  if (!supabase) {
    const all = readAll()
    const item = {
      notificationId: randomId('noti'),
      userId: buyerUserId,
      type: 'chat_request',
      actionType,
      actorId: sellerUserId,
      actorName: actorName ?? '판매자',
      sellerId: sellerUserId,
      buyerId: buyerUserId,
      serviceId: null,
      serviceTitle: '채팅신청',
      points: 0,
      status,
      rejectionReasonCode,
      rejectionReasonText: reasonText,
      createdAt: nowIso(),
      isRead: false,
      orderId: null,
      requestId,
      metadata: {
        seller_id: sellerUserId,
        buyer_id: buyerUserId,
        request_id: requestId,
        status,
        rejection_reason_code: rejectionReasonCode,
        rejection_reason_text: reasonText,
      },
      message: body,
    }
    saveAll([...all, item])
    return { data: item, error: null }
  }

  const payload = {
    user_id: buyerUserId,
    actor_user_id: sellerUserId,
    action_type: actionType,
    title,
    body,
    is_read: false,
    metadata: {
      actor_name: actorName ?? '판매자',
      seller_id: sellerUserId,
      buyer_id: buyerUserId,
      request_id: requestId,
      status,
      rejection_reason_code: rejectionReasonCode,
      rejection_reason_text: reasonText,
    },
  }
  const insertResult = await insertNotification(payload)
  if (insertResult.error) {
    return {
      data: null,
      error: normalizeError(insertResult.error, '채팅신청 상태 알림 생성에 실패했습니다.'),
    }
  }
  return { data: insertResult.data, error: null }
}

export async function pushAdminNotification({
  userIds = [],
  title = '운영 알림',
  body = '',
  notificationType = 'admin_message',
  actorName = 'PointBridge 운영팀',
}) {
  const normalizedIds = Array.from(new Set((userIds ?? []).filter(Boolean)))
  if (normalizedIds.length === 0) {
    return {
      data: null,
      error: {
        message: '알림을 보낼 사용자 ID가 없습니다.',
        code: 'MISSING_TARGET_USERS',
      },
    }
  }

  if (!supabase) {
    const all = readAll()
    const now = nowIso()
    const inserted = normalizedIds.map((userId) => ({
      notificationId: randomId('noti'),
      userId,
      type: notificationType,
      actionType: 'system',
      actorId: null,
      actorName,
      sellerId: null,
      buyerId: null,
      serviceId: null,
      serviceTitle: '',
      points: 0,
      status: 'accepted',
      rejectionReasonCode: '',
      rejectionReasonText: '',
      createdAt: now,
      isRead: false,
      orderId: null,
      requestId: null,
      metadata: {
        actor_name: actorName,
        admin_message: true,
      },
      message: body || title,
    }))
    saveAll([...all, ...inserted])
    return { data: inserted, error: null }
  }

  const payloads = normalizedIds.map((userId) => ({
    user_id: userId,
    actor_user_id: null,
    action_type: 'system',
    type: notificationType,
    title,
    body: body || title,
    is_read: false,
    metadata: {
      actor_name: actorName,
      admin_message: true,
    },
  }))

  const { data, error } = await supabase.from('notifications').insert(payloads).select('*')
  if (error) {
    return {
      data: null,
      error: normalizeError(error, '운영 알림 발송에 실패했습니다.'),
    }
  }
  return { data: data ?? [], error: null }
}
