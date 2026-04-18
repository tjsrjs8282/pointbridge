function normalizeRole(role) {
  const normalized = String(role ?? '').trim().toLowerCase()
  if (!normalized) return 'user'
  if (normalized === 'admin' || normalized === '관리자') return 'admin'
  if (normalized === 'seller' || normalized === '판매자') return 'seller'
  if (normalized === 'buyer' || normalized === '구매자') return 'buyer'
  return 'user'
}

export function isAdminProfile(profile) {
  return Boolean(profile?.is_admin) || normalizeRole(profile?.role) === 'admin'
}

export function canManageSellerProfile({ profile, currentUserId, sellerUserId }) {
  if (!sellerUserId) return false
  if (isAdminProfile(profile)) return true
  return Boolean(currentUserId && sellerUserId && currentUserId === sellerUserId)
}

export function canWriteNotice(profile) {
  return isAdminProfile(profile)
}

export function normalizeRoleLabel(role) {
  const normalized = normalizeRole(role)
  if (normalized === 'admin') return '관리자'
  if (normalized === 'seller') return '판매자'
  if (normalized === 'buyer') return '구매자'
  return '일반 회원'
}

