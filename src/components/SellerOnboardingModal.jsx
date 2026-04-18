import { useEffect, useState } from 'react'
import BrandLoader from './common/BrandLoader'
import { MARKETPLACE_CATEGORIES, normalizeMarketplaceCategory } from '../constants/marketplaceTaxonomy'
import useAuth from '../hooks/useAuth'
import { isAdminProfile } from '../lib/permissions'
import {
  fetchSellerDetailByProfileId,
  fetchSellerProfileIdByUserId,
  registerSellerProfile,
} from '../lib/marketplace'
import {
  SELLER_LIMITS,
  createEmptySellerProfileExtras,
  normalizeSellerProfileExtras,
  saveSellerProfileExtrasByUserId,
} from '../lib/sellerProfileExtras'

const defaultForm = {
  sellerName: '',
  category: '디자인',
  tagline: '',
  description: '',
  region: '',
  specialtiesInput: '',
  skillsInput: '',
  careersInput: '',
  certificatesInput: '',
}

function countListItems(value) {
  if (!value) return 0
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean).length
}

function countLineItems(value) {
  if (!value) return 0
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length
}

function listToCommaText(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(', ') : ''
}

function careersToMultilineText(value) {
  if (!Array.isArray(value)) return ''
  return value
    .map((item) => String(item?.title ?? '').trim())
    .filter(Boolean)
    .join('\n')
}

function buildFormFromSeller({ seller, draft }) {
  const extras = seller?.extras ?? createEmptySellerProfileExtras()
  const categories = seller?.categories ?? []
  return {
    ...defaultForm,
    ...(draft ?? {}),
    sellerName: seller?.name ?? draft?.sellerName ?? '',
    category: categories[0] ?? seller?.category ?? draft?.category ?? defaultForm.category,
    tagline: extras.tagline ?? seller?.tagline ?? draft?.tagline ?? '',
    description: seller?.intro ?? draft?.description ?? '',
    region: seller?.region ?? draft?.region ?? '',
    specialtiesInput: listToCommaText(extras.specialties) || draft?.specialtiesInput || '',
    skillsInput: listToCommaText(extras.skills) || draft?.skillsInput || '',
    careersInput: careersToMultilineText(extras.careers) || draft?.careersInput || '',
    certificatesInput: listToCommaText(extras.certificates) || draft?.certificatesInput || '',
  }
}

function SellerOnboardingModal() {
  const {
    isSellerOnboardingOpen,
    closeSellerOnboarding,
    saveSellerProfileDraft,
    sellerProfileDraft,
    sellerOnboardingTargetUserId,
    user,
    profile,
    refreshProfile,
  } = useAuth()
  const [form, setForm] = useState(defaultForm)
  const [submitMessage, setSubmitMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isHydrating, setIsHydrating] = useState(false)

  useEffect(() => {
    if (!isSellerOnboardingOpen) return
    let mounted = true

    const hydrateForm = async () => {
      setIsHydrating(true)
      setSubmitMessage('')
      const draft = sellerProfileDraft ?? {}
      let nextForm = {
        ...defaultForm,
        ...draft,
      }

      const targetUserId = sellerOnboardingTargetUserId ?? user?.id
      if (targetUserId) {
        const { data: sellerProfileId } = await fetchSellerProfileIdByUserId(targetUserId)
        if (!mounted) return
        if (sellerProfileId) {
          const { data, error } = await fetchSellerDetailByProfileId(sellerProfileId)
          if (!mounted) return
          if (!error && data?.seller) {
            nextForm = buildFormFromSeller({
              seller: data.seller,
              draft,
            })
          }
        }
      }

      setForm(nextForm)
      setIsHydrating(false)
    }

    hydrateForm()
    return () => {
      mounted = false
    }
  }, [isSellerOnboardingOpen, sellerOnboardingTargetUserId, sellerProfileDraft, user?.id])

  if (!isSellerOnboardingOpen) return null

  const counts = {
    specialties: countListItems(form.specialtiesInput),
    skills: countListItems(form.skillsInput),
    certificates: countListItems(form.certificatesInput),
    careers: countLineItems(form.careersInput),
    tagline: (form.tagline ?? '').length,
    description: (form.description ?? '').length,
  }

  const overLimitMessage = (() => {
    if (counts.specialties > SELLER_LIMITS.specialties) return `전문분야는 최대 ${SELLER_LIMITS.specialties}개까지 입력할 수 있습니다.`
    if (counts.skills > SELLER_LIMITS.skills) return `보유기술은 최대 ${SELLER_LIMITS.skills}개까지 입력할 수 있습니다.`
    if (counts.certificates > SELLER_LIMITS.certificates) return `자격증은 최대 ${SELLER_LIMITS.certificates}개까지 입력할 수 있습니다.`
    if (counts.careers > SELLER_LIMITS.careers) return `경력은 최대 ${SELLER_LIMITS.careers}개까지 입력할 수 있습니다.`
    if (counts.tagline > SELLER_LIMITS.taglineMaxLength) return `한줄소개는 ${SELLER_LIMITS.taglineMaxLength}자 이내로 작성해 주세요.`
    if (counts.description > SELLER_LIMITS.introMaxLength) return `상세 소개는 ${SELLER_LIMITS.introMaxLength}자 이내로 작성해 주세요.`
    return ''
  })()

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitMessage('')

    const targetUserId = sellerOnboardingTargetUserId ?? user?.id
    if (!targetUserId || !user?.id) {
      setSubmitMessage('로그인 후 판매자 등록이 가능합니다.')
      return
    }
    if (targetUserId !== user.id && !isAdminProfile(profile)) {
      setSubmitMessage('다른 판매자 정보 수정 권한이 없습니다.')
      return
    }

    if (overLimitMessage) {
      setSubmitMessage(overLimitMessage)
      return
    }

    const extraProfile = normalizeSellerProfileExtras({
      specialties: form.specialtiesInput,
      skills: form.skillsInput,
      careers: form.careersInput,
      certificates: form.certificatesInput,
      tagline: form.tagline,
    })

    setIsSubmitting(true)
    const { error } = await registerSellerProfile({
      userId: targetUserId,
      displayName: form.sellerName,
      intro: (form.description ?? '').slice(0, SELLER_LIMITS.introMaxLength),
      region: form.region,
      categories: [normalizeMarketplaceCategory(form.category, form.category)],
      isActive: true,
      extraProfile,
    })
    setIsSubmitting(false)

    if (error) {
      setSubmitMessage(error.message ?? '판매자 등록 중 오류가 발생했습니다.')
      return
    }

    saveSellerProfileExtrasByUserId({ userId: targetUserId, extras: extraProfile })

    saveSellerProfileDraft({
      sellerName: form.sellerName,
      category: form.category,
      tagline: extraProfile.tagline,
      description: form.description,
      region: form.region,
      specialtiesInput: form.specialtiesInput,
      skillsInput: form.skillsInput,
      careersInput: form.careersInput,
      certificatesInput: form.certificatesInput,
      extraProfile: {
        ...createEmptySellerProfileExtras(),
        ...extraProfile,
      },
    })
    if (targetUserId === user.id) await refreshProfile()
    setSubmitMessage('판매자 정보가 저장되었습니다.')
  }

  return (
    <div className="seller-modal-overlay" role="presentation">
      <section className="seller-modal-card" role="dialog" aria-modal="true" aria-label="판매자 정보 수정">
        <div className="seller-modal-head">
          <h2>판매자 정보 수정</h2>
          <button type="button" className="seller-modal-close-btn" onClick={closeSellerOnboarding}>
            ×
          </button>
        </div>
        <p className="seller-modal-subtitle">
          현재 판매자 정보를 불러와 등록·수정할 수 있습니다.
        </p>

        {isHydrating ? (
          <div className="seller-onboarding-loader">
            <BrandLoader label="판매자 정보 불러오는 중" />
          </div>
        ) : (
          <form className="seller-onboarding-form" onSubmit={handleSubmit}>
          <label>
            활동명 또는 판매자명
            <input
              type="text"
              value={form.sellerName}
              maxLength={40}
              onChange={(event) => handleFieldChange('sellerName', event.target.value)}
              placeholder="예) 김유저 스튜디오"
            />
          </label>

          <label>
            카테고리 선택
            <select
              value={form.category}
              onChange={(event) => handleFieldChange('category', event.target.value)}
            >
              {MARKETPLACE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="form-label-row">
              한줄 소개
              <small>{counts.tagline}/{SELLER_LIMITS.taglineMaxLength}</small>
            </span>
            <input
              type="text"
              value={form.tagline}
              maxLength={SELLER_LIMITS.taglineMaxLength}
              onChange={(event) => handleFieldChange('tagline', event.target.value)}
              placeholder="예) 빠른 응답과 높은 완성도, 믿을 수 있는 작업자입니다."
            />
          </label>

          <label>
            <span className="form-label-row">
              상세 소개
              <small>{counts.description}/{SELLER_LIMITS.introMaxLength}</small>
            </span>
            <textarea
              value={form.description}
              maxLength={SELLER_LIMITS.introMaxLength}
              onChange={(event) => handleFieldChange('description', event.target.value)}
              placeholder="경력, 작업 방식, 강점을 자유롭게 작성하세요."
            />
          </label>

          <div className="seller-onboarding-subsection">
            <h3>전문성 정보</h3>
          </div>

          <label>
            <span className="form-label-row">
              전문분야 (쉼표 구분)
              <small className={counts.specialties > SELLER_LIMITS.specialties ? 'over' : ''}>
                {counts.specialties}/{SELLER_LIMITS.specialties}
              </small>
            </span>
            <input
              type="text"
              value={form.specialtiesInput}
              onChange={(event) => handleFieldChange('specialtiesInput', event.target.value)}
              placeholder="예) 랜딩페이지 제작, 앱 유지보수"
            />
          </label>

          <label>
            <span className="form-label-row">
              보유기술 (쉼표 구분)
              <small className={counts.skills > SELLER_LIMITS.skills ? 'over' : ''}>
                {counts.skills}/{SELLER_LIMITS.skills}
              </small>
            </span>
            <input
              type="text"
              value={form.skillsInput}
              onChange={(event) => handleFieldChange('skillsInput', event.target.value)}
              placeholder="예) React, TypeScript, Figma"
            />
          </label>

          <label>
            <span className="form-label-row">
              경력 (줄바꿈 구분)
              <small className={counts.careers > SELLER_LIMITS.careers ? 'over' : ''}>
                {counts.careers}/{SELLER_LIMITS.careers}
              </small>
            </span>
            <textarea
              value={form.careersInput}
              onChange={(event) => handleFieldChange('careersInput', event.target.value)}
              placeholder={'예) 프론트엔드 개발자 3년\n프리랜서 2년'}
            />
          </label>

          <label>
            <span className="form-label-row">
              자격증 (쉼표 구분)
              <small className={counts.certificates > SELLER_LIMITS.certificates ? 'over' : ''}>
                {counts.certificates}/{SELLER_LIMITS.certificates}
              </small>
            </span>
            <input
              type="text"
              value={form.certificatesInput}
              onChange={(event) => handleFieldChange('certificatesInput', event.target.value)}
              placeholder="예) 정보처리기사, GTQ"
            />
          </label>

          <label>
            활동 지역
            <input
              type="text"
              value={form.region}
              maxLength={60}
              onChange={(event) => handleFieldChange('region', event.target.value)}
              placeholder="예) 서울 전지역, 원격 가능"
            />
          </label>

          {overLimitMessage ? <p className="auth-error">{overLimitMessage}</p> : null}
          <button
            type="submit"
            className="seller-onboarding-submit-btn"
            disabled={isSubmitting || Boolean(overLimitMessage)}
          >
            {isSubmitting ? '저장 중...' : '판매자 정보 저장'}
          </button>
          {submitMessage ? <p className="muted">{submitMessage}</p> : null}
          </form>
        )}
      </section>
    </div>
  )
}

export default SellerOnboardingModal
