function isSellerRegistered(profile) {
  return Boolean(profile?.is_seller) || profile?.seller_status === 'active'
}

function isNewMember(profile) {
  if (!profile?.created_at) return false
  const createdAt = new Date(profile.created_at).getTime()
  if (!Number.isFinite(createdAt)) return false
  const diffMs = Date.now() - createdAt
  return diffMs <= 7 * 24 * 60 * 60 * 1000
}

export function resolveMemberStatus(profile) {
  if (isSellerRegistered(profile)) {
    return {
      key: 'seller',
      icon: '🏪',
      shortLabel: '판매자',
      label: '판매자 등록 회원',
      isSeller: true,
    }
  }

  if (isNewMember(profile)) {
    return {
      key: 'new',
      icon: '✨',
      shortLabel: '신규',
      label: '신규회원',
      isSeller: false,
    }
  }

  return {
    key: 'normal',
    icon: '👤',
    shortLabel: '일반',
    label: '일반회원',
    isSeller: false,
  }
}
