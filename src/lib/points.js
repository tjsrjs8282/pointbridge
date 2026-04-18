import { supabase } from './supabase'

function createNotConfiguredError() {
  return {
    message:
      'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    code: 'SUPABASE_NOT_CONFIGURED',
  }
}

function normalizeError(error, fallbackMessage = '포인트 처리 중 오류가 발생했습니다.') {
  if (!error) return null
  return {
    message: error.message ?? fallbackMessage,
    code: error.code ?? 'POINT_ERROR',
    status: error.status ?? null,
    details: error.details ?? null,
  }
}

function isSchemaCompatibilityError(error) {
  const code = String(error?.code ?? '').toUpperCase()
  const message = String(error?.message ?? '').toLowerCase()
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    code === '42P01' ||
    code === '23514' ||
    message.includes('column') ||
    message.includes('schema') ||
    message.includes('relation') ||
    message.includes('does not exist')
  )
}

/** UI용: 설명 문구에서 금액 표기 제거(금액은 오른쪽 컬럼만 사용). */
export function stripPointLogDescriptionForDisplay(raw = '') {
  let s = String(raw ?? '').trim()
  if (!s) return s
  s = s.replace(/\s*\([\d,.]+P\)\s*$/u, '').trim()
  s = s.replace(/\s*\+[\d,.]+P\s*$/u, '').trim()
  s = s.replace(/\s*[－-]\s*[\d,.]+P\s*$/u, '').trim()
  return s
}

function normalizePointLogType(type = '') {
  const normalized = String(type ?? '').toLowerCase()
  if (
    [
      'charge',
      'event',
      'refund',
      'sell',
      'credit',
      'reward',
      'withdraw_request',
      'withdraw_approved',
      'withdraw_rejected',
      'adjustment',
    ].includes(normalized)
  ) {
    return normalized
  }
  if (['use', 'debit'].includes(normalized)) return 'use'
  return 'event'
}

function getFilterStartDate(filter = '1y') {
  if (filter === 'all' || filter === '1y') {
    const now = new Date()
    now.setFullYear(now.getFullYear() - 1)
    return now.toISOString()
  }
  const now = new Date()
  if (filter === '7d') now.setDate(now.getDate() - 7)
  else if (filter === '1m') now.setMonth(now.getMonth() - 1)
  else if (filter === '3m') now.setMonth(now.getMonth() - 3)
  else if (filter === '6m') now.setMonth(now.getMonth() - 6)
  else now.setFullYear(now.getFullYear() - 1)
  return now.toISOString()
}

export async function applyTestPointCharge({ userId, amount }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId) {
    return {
      data: null,
      error: {
        message: '포인트 충전 대상 사용자 ID가 없습니다.',
        code: 'MISSING_USER_ID',
      },
    }
  }
  const safeAmount = Number(amount)
  if (!Number.isInteger(safeAmount) || safeAmount <= 0) {
    return {
      data: null,
      error: {
        message: '충전 금액은 1P 이상의 정수여야 합니다.',
        code: 'INVALID_AMOUNT',
      },
    }
  }

  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, point_balance')
    .eq('id', userId)
    .single()
  if (profileError) {
    return {
      data: null,
      error: normalizeError(profileError, '현재 포인트 잔액을 불러오지 못했습니다.'),
    }
  }

  const nextBalance = Number(currentProfile?.point_balance ?? 0) + safeAmount
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ point_balance: nextBalance })
    .eq('id', userId)
    .select('id, point_balance')
    .single()
  if (updateError) {
    return {
      data: null,
      error: normalizeError(updateError, '포인트 잔액 업데이트에 실패했습니다.'),
    }
  }

  const chargeDescription = '테스트 충전'
  const richInsert = await supabase
    .from('point_transactions')
    .insert({
      user_id: userId,
      type: 'charge',
      amount: safeAmount,
      description: chargeDescription,
      status: 'done',
      payment_method: 'test-instant',
      metadata: {
        is_test_charge: true,
      },
    })
    .select('*')
    .single()

  let transaction = richInsert.data ?? null
  let insertError = richInsert.error
  if (insertError && isSchemaCompatibilityError(insertError)) {
    const legacyInsert = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        type: 'credit',
        amount: safeAmount,
        description: chargeDescription,
      })
      .select('*')
      .single()
    transaction = legacyInsert.data ?? null
    insertError = legacyInsert.error
  }

  // New schema: mirror to point_logs if table is available.
  const pointLogInsert = await supabase.from('point_logs').insert({
    user_id: userId,
    type: 'charge',
    description: '포인트 충전',
    amount: safeAmount,
  })
  if (pointLogInsert.error && !isSchemaCompatibilityError(pointLogInsert.error)) {
    return {
      data: {
        profile: updatedProfile,
        transaction,
      },
      error: normalizeError(pointLogInsert.error, '포인트 로그 기록에 실패했습니다.'),
    }
  }

  if (insertError) {
    return {
      data: {
        profile: updatedProfile,
        transaction: null,
      },
      error: normalizeError(insertError, '잔액은 충전되었지만 거래내역 기록에 실패했습니다.'),
    }
  }

  return {
    data: {
      profile: updatedProfile,
      transaction,
    },
    error: null,
  }
}

export async function fetchPointTransactions({ userId }) {
  if (!supabase) return { data: [], error: createNotConfiguredError() }
  if (!userId) return { data: [], error: null }

  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    return {
      data: [],
      error: normalizeError(error, '포인트 내역을 불러오지 못했습니다.'),
    }
  }
  return { data: data ?? [], error: null }
}

export async function fetchPointLogsPaged({
  userId,
  page = 1,
  pageSize = 10,
  filter = '1y',
} = {}) {
  if (!supabase) {
    return {
      data: { rows: [], totalCount: 0, totalPages: 1, page: 1, pageSize: 10 },
      error: createNotConfiguredError(),
    }
  }
  if (!userId) {
    return {
      data: { rows: [], totalCount: 0, totalPages: 1, page: 1, pageSize: 10 },
      error: null,
    }
  }
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1
  const safePageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Number(pageSize)) : 10
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1
  const startDate = getFilterStartDate(filter)

  let pointLogQuery = supabase
    .from('point_logs')
    .select('id, user_id, type, description, amount, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (startDate) pointLogQuery = pointLogQuery.gte('created_at', startDate)
  const pointLogsResult = await pointLogQuery

  if (!pointLogsResult.error) {
    const rows = (pointLogsResult.data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      type: normalizePointLogType(row.type),
      description: stripPointLogDescriptionForDisplay(row.description ?? ''),
      amount: Number(row.amount ?? 0),
      created_at: row.created_at ?? null,
    }))
    const totalCount = Number(pointLogsResult.count ?? 0)
    return {
      data: {
        rows,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
        page: safePage,
        pageSize: safePageSize,
      },
      error: null,
    }
  }

  if (!isSchemaCompatibilityError(pointLogsResult.error)) {
    return {
      data: { rows: [], totalCount: 0, totalPages: 1, page: safePage, pageSize: safePageSize },
      error: normalizeError(pointLogsResult.error, '포인트 로그를 불러오지 못했습니다.'),
    }
  }

  // Legacy fallback: point_transactions -> point_logs shape.
  let legacyQuery = supabase
    .from('point_transactions')
    .select('id, user_id, type, description, amount, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (startDate) legacyQuery = legacyQuery.gte('created_at', startDate)
  const legacyResult = await legacyQuery
  if (legacyResult.error) {
    return {
      data: { rows: [], totalCount: 0, totalPages: 1, page: safePage, pageSize: safePageSize },
      error: normalizeError(legacyResult.error, '포인트 로그를 불러오지 못했습니다.'),
    }
  }

  const rows = (legacyResult.data ?? []).map((row) => {
    const normalizedType = normalizePointLogType(row.type)
    const rawAmount = Number(row.amount ?? 0)
    const signedAmount = normalizedType === 'use' ? -Math.abs(rawAmount) : Math.abs(rawAmount)
    return {
      id: row.id,
      user_id: row.user_id,
      type: normalizedType,
      description: stripPointLogDescriptionForDisplay(row.description ?? ''),
      amount: signedAmount,
      created_at: row.created_at ?? null,
    }
  })
  const totalCount = Number(legacyResult.count ?? 0)
  return {
    data: {
      rows,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
      page: safePage,
      pageSize: safePageSize,
    },
    error: null,
  }
}

export async function fetchPointLogSummary({ userId } = {}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId) {
    return {
      data: {
        hasCharge: false,
        hasUse: false,
        hasSell: false,
      },
      error: null,
    }
  }

  const pointLogsResult = await supabase
    .from('point_logs')
    .select('type')
    .eq('user_id', userId)
    .limit(500)

  if (!pointLogsResult.error) {
    const typeSet = new Set((pointLogsResult.data ?? []).map((row) => normalizePointLogType(row.type)))
    return {
      data: {
        hasCharge: typeSet.has('charge'),
        hasUse: typeSet.has('use'),
        hasSell: typeSet.has('sell'),
      },
      error: null,
    }
  }

  if (!isSchemaCompatibilityError(pointLogsResult.error)) {
    return { data: null, error: normalizeError(pointLogsResult.error, '포인트 요약 조회에 실패했습니다.') }
  }

  const legacyResult = await supabase
    .from('point_transactions')
    .select('type')
    .eq('user_id', userId)
    .limit(500)
  if (legacyResult.error) {
    return { data: null, error: normalizeError(legacyResult.error, '포인트 요약 조회에 실패했습니다.') }
  }
  const typeSet = new Set((legacyResult.data ?? []).map((row) => normalizePointLogType(row.type)))
  return {
    data: {
      hasCharge: typeSet.has('charge') || typeSet.has('credit'),
      hasUse: typeSet.has('use') || typeSet.has('debit'),
      hasSell: typeSet.has('sell'),
    },
    error: null,
  }
}

export async function checkPointWithdrawEligibility({ userId } = {}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId) {
    return {
      data: {
        eligible: false,
        pointBalance: 0,
        minRequired: 1000,
      },
      error: null,
    }
  }

  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('id, point_balance')
    .eq('id', userId)
    .single()
  if (error) {
    return {
      data: null,
      error: normalizeError(error, '환전 가능 여부를 확인하지 못했습니다.'),
    }
  }

  const pointBalance = Number(profileRow?.point_balance ?? 0)
  const minRequired = 1000
  return {
    data: {
      eligible: pointBalance >= minRequired,
      pointBalance,
      minRequired,
    },
    error: null,
  }
}

export async function requestPointWithdraw({ userId, amount }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId) {
    return { data: null, error: { message: '사용자 정보가 없습니다.', code: 'MISSING_USER_ID' } }
  }

  const safeAmount = Math.round(Number(amount ?? 0))
  if (!Number.isFinite(safeAmount) || safeAmount < 1000) {
    return {
      data: null,
      error: {
        message: '1,000P 이상부터 환전 가능합니다.',
        code: 'WITHDRAW_MINIMUM_NOT_MET',
      },
    }
  }

  const eligibility = await checkPointWithdrawEligibility({ userId })
  if (eligibility.error) return { data: null, error: eligibility.error }
  if (!eligibility.data?.eligible || Number(eligibility.data?.pointBalance ?? 0) < safeAmount) {
    return {
      data: null,
      error: {
        message: '환전 가능 포인트가 부족합니다. (최소 1,000P)',
        code: 'INSUFFICIENT_POINT_BALANCE',
      },
    }
  }

  const { data: requestId, error: rpcError } = await supabase.rpc('submit_point_withdraw_request', {
    p_amount: safeAmount,
  })

  if (rpcError) {
    const msg = String(rpcError.message ?? '')
    if (/submit_point_withdraw_request|42883|does not exist/i.test(msg)) {
      return {
        data: null,
        error: {
          message:
            '환전 신청 RPC가 없습니다. Supabase에 supabase/migrations/20260420_pointbridge_tier_points_withdraw_banner.sql 을 적용한 뒤 다시 시도해 주세요.',
          code: 'WITHDRAW_RPC_UNAVAILABLE',
        },
      }
    }
    if (msg.includes('WITHDRAW_MINIMUM')) {
      return { data: null, error: { message: '1,000P 이상부터 환전 가능합니다.', code: 'WITHDRAW_MINIMUM_NOT_MET' } }
    }
    if (msg.includes('INSUFFICIENT')) {
      return {
        data: null,
        error: { message: '환전 가능 포인트가 부족합니다.', code: 'INSUFFICIENT_POINT_BALANCE' },
      }
    }
    return { data: null, error: normalizeError(rpcError, '환전 신청에 실패했습니다.') }
  }

  const { data: profileRow } = await supabase.from('profiles').select('id, point_balance').eq('id', userId).single()

  return {
    data: {
      profile: profileRow ?? null,
      withdrawRequest: requestId ? { id: requestId, amount: safeAmount, status: 'pending' } : null,
    },
    error: null,
  }
}

/** 관리자: 환전 승인 (잔액 차감 + 로그). Supabase RPC `admin_approve_point_withdraw`. */
export async function adminApprovePointWithdraw({ requestId }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  const { error } = await supabase.rpc('admin_approve_point_withdraw', { p_request_id: requestId })
  if (error) return { data: null, error: normalizeError(error, '환전 승인 처리에 실패했습니다.') }
  return { data: { ok: true }, error: null }
}

/** 관리자: 환전 반려. Supabase RPC `admin_reject_point_withdraw`. */
export async function adminRejectPointWithdraw({ requestId, reason = '' }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  const { error } = await supabase.rpc('admin_reject_point_withdraw', {
    p_request_id: requestId,
    p_reason: reason,
  })
  if (error) return { data: null, error: normalizeError(error, '환전 반려 처리에 실패했습니다.') }
  return { data: { ok: true }, error: null }
}
