export const ALL_CATEGORY_VALUE = '전체'

export const MARKETPLACE_CATEGORY_ITEMS = [
  {
    key: 'design',
    label: '디자인',
    aliases: ['그래픽 디자인', '브랜딩 디자인'],
  },
  {
    key: 'it-programming',
    label: 'IT프로그래밍',
    aliases: ['개발', '웹/앱 개발', '앱개발', '웹개발', '개발자'],
  },
  {
    key: 'video-audio',
    label: '영상/음향',
    aliases: ['영상 편집', '영상/편집', '영상편집', '영상 제작'],
  },
  {
    key: 'marketing',
    label: '마케팅',
    aliases: ['마케팅 대행', '광고 운영'],
  },
  {
    key: 'language-translation',
    label: '언어/번역',
    aliases: ['번역', '통역', '언어'],
  },
  {
    key: 'installation-repair',
    label: '설치/수리',
    aliases: ['설치', '수리', '청소/수리'],
  },
  {
    key: 'life-service',
    label: '생활서비스',
    aliases: ['생활심부름', '청소', '입주청소', '청소 서비스', '심부름', '생활 도움'],
  },
]

const categoryByNormalizedToken = MARKETPLACE_CATEGORY_ITEMS.reduce((acc, category) => {
  const tokens = [category.label, ...(category.aliases ?? [])]
  tokens.forEach((token) => {
    const normalizedToken = String(token).trim().toLowerCase()
    if (!normalizedToken) return
    acc.set(normalizedToken, category.label)
  })
  return acc
}, new Map())

export const MARKETPLACE_CATEGORIES = MARKETPLACE_CATEGORY_ITEMS.map((item) => item.label)

export const CATEGORY_SELECT_OPTIONS = [
  { label: '전체', value: ALL_CATEGORY_VALUE },
  ...MARKETPLACE_CATEGORIES.map((label) => ({ label, value: label })),
]

export const QUICK_CATEGORY_OPTIONS = [...MARKETPLACE_CATEGORIES]

export function normalizeMarketplaceCategory(rawCategory, fallback = '기타') {
  const normalized = String(rawCategory ?? '')
    .trim()
    .toLowerCase()
  if (!normalized) return fallback
  return categoryByNormalizedToken.get(normalized) ?? rawCategory ?? fallback
}

export function normalizeMarketplaceCategoryList(rawCategories = []) {
  const list = Array.isArray(rawCategories) ? rawCategories : [rawCategories]
  const normalized = list
    .map((item) => normalizeMarketplaceCategory(item, ''))
    .map((item) => String(item).trim())
    .filter(Boolean)
  return Array.from(new Set(normalized))
}

export function normalizeCategoryFilter(rawCategory) {
  const value = String(rawCategory ?? '').trim()
  if (!value || value === ALL_CATEGORY_VALUE) return ALL_CATEGORY_VALUE
  return normalizeMarketplaceCategory(value, ALL_CATEGORY_VALUE)
}
