export const NICKNAME_MAX_LENGTH = 10

export function getDisplayLength(value = '') {
  return Array.from(String(value ?? '')).length
}

export function validateNickname(value = '') {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    return {
      ok: false,
      message: '닉네임을 입력해 주세요.',
      code: 'NICKNAME_REQUIRED',
    }
  }

  if (getDisplayLength(normalized) > NICKNAME_MAX_LENGTH) {
    return {
      ok: false,
      message: '닉네임은 10자 이하로 입력해주세요.',
      code: 'NICKNAME_TOO_LONG',
    }
  }

  return { ok: true, message: '', code: null }
}
