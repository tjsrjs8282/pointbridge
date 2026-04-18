import { getMockSellerProfileExtras } from '../data/mockSellerProfileExtras'

const SELLER_PROFILE_EXTRAS_STORAGE_KEY = 'pointbridge:sellerProfileExtrasByUserId'

/**
 * @typedef {Object} SellerCareerItem
 * @property {string} title
 * @property {string} [organization]
 * @property {string} [years]
 *
 * @typedef {Object} SellerProfileExtras
 * @property {string[]} specialties
 * @property {string[]} skills
 * @property {SellerCareerItem[]} careers
 * @property {string[]} certificates
 */

export const SELLER_LIMITS = {
  specialties: 3,
  skills: 10,
  certificates: 10,
  careers: 10,
  taglineMaxLength: 60,
  introMaxLength: 500,
}

function normalizeStringList(value, max = 12) {
  if (!value) return []
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => String(item ?? '').trim())
          .filter(Boolean),
      ),
    ).slice(0, max)
  }
  return Array.from(
    new Set(
      String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, max)
}

function normalizeCareers(value, max = SELLER_LIMITS.careers) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const title = String(item.title ?? '').trim()
        if (!title) return null
        return {
          title,
          organization: String(item.organization ?? '').trim(),
          years: String(item.years ?? '').trim(),
        }
      })
      .filter(Boolean)
      .slice(0, max)
  }

  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((line) => ({ title: line, organization: '', years: '' }))
}

export function createEmptySellerProfileExtras() {
  return {
    specialties: [],
    skills: [],
    careers: [],
    certificates: [],
    tagline: '',
  }
}

export function normalizeSellerProfileExtras(raw) {
  const source = raw ?? {}
  const taglineValue = String(source.tagline ?? '').trim().slice(0, SELLER_LIMITS.taglineMaxLength)
  return {
    specialties: normalizeStringList(source.specialties, SELLER_LIMITS.specialties),
    skills: normalizeStringList(source.skills, SELLER_LIMITS.skills),
    careers: normalizeCareers(source.careers, SELLER_LIMITS.careers),
    certificates: normalizeStringList(source.certificates, SELLER_LIMITS.certificates),
    tagline: taglineValue,
  }
}

export function mergeSellerProfileExtrasWithMock({ sellerUserId, category, rawExtras }) {
  const normalized = normalizeSellerProfileExtras(rawExtras)
  const stored = normalizeSellerProfileExtras(getStoredSellerProfileExtrasByUserId(sellerUserId))
  const mock = normalizeSellerProfileExtras(
    getMockSellerProfileExtras({
      sellerUserId,
      category,
    }),
  )

  return {
    specialties:
      normalized.specialties.length > 0
        ? normalized.specialties
        : stored.specialties.length > 0
          ? stored.specialties
          : mock.specialties,
    skills:
      normalized.skills.length > 0
        ? normalized.skills
        : stored.skills.length > 0
          ? stored.skills
          : mock.skills,
    careers:
      normalized.careers.length > 0
        ? normalized.careers
        : stored.careers.length > 0
          ? stored.careers
          : mock.careers,
    certificates:
      normalized.certificates.length > 0
        ? normalized.certificates
        : stored.certificates.length > 0
          ? stored.certificates
          : mock.certificates,
    tagline: normalized.tagline || stored.tagline || mock.tagline || '',
  }
}

export function getStoredSellerProfileExtrasByUserId(userId) {
  const targetId = String(userId ?? '').trim()
  if (!targetId || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SELLER_PROFILE_EXTRAS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object') return null
    return parsed[targetId] ?? null
  } catch {
    return null
  }
}

export function saveSellerProfileExtrasByUserId({ userId, extras }) {
  const targetId = String(userId ?? '').trim()
  if (!targetId || typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(SELLER_PROFILE_EXTRAS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const safeObject = parsed && typeof parsed === 'object' ? parsed : {}
    safeObject[targetId] = normalizeSellerProfileExtras(extras)
    localStorage.setItem(SELLER_PROFILE_EXTRAS_STORAGE_KEY, JSON.stringify(safeObject))
  } catch {
    // no-op
  }
}
