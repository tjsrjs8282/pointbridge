import { useState } from 'react'
import useAuth from '../hooks/useAuth'

const defaultForm = {
  sellerName: '',
  category: '개발',
  tagline: '',
  description: '',
  region: '',
  profileImage: '',
}

function SellerOnboardingModal() {
  const {
    isSellerOnboardingOpen,
    closeSellerOnboarding,
    saveSellerProfileDraft,
    sellerProfileDraft,
  } = useAuth()
  const [form, setForm] = useState(defaultForm)

  if (!isSellerOnboardingOpen) return null

  const mergedForm = {
    ...(sellerProfileDraft ?? {}),
    ...form,
  }

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : ''
      handleFieldChange('profileImage', imageUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    saveSellerProfileDraft({
      sellerName: mergedForm.sellerName,
      category: mergedForm.category,
      tagline: mergedForm.tagline,
      description: mergedForm.description,
      region: mergedForm.region,
      profileImage: mergedForm.profileImage,
    })
  }

  return (
    <div className="seller-modal-overlay" role="presentation">
      <section className="seller-modal-card" role="dialog" aria-modal="true" aria-label="판매자 등록">
        <div className="seller-modal-head">
          <h2>판매자 등록</h2>
          <button type="button" className="seller-modal-close-btn" onClick={closeSellerOnboarding}>
            ×
          </button>
        </div>
        <p className="seller-modal-subtitle">
          지금은 UI 중심 단계입니다. 제출한 데이터는 임시 draft로 저장됩니다.
        </p>

        <form className="seller-onboarding-form" onSubmit={handleSubmit}>
          <label>
            활동명 또는 판매자명
            <input
              type="text"
              value={mergedForm.sellerName}
              onChange={(event) => handleFieldChange('sellerName', event.target.value)}
              placeholder="예) 김유저 스튜디오"
            />
          </label>

          <label>
            카테고리 선택
            <select
              value={mergedForm.category}
              onChange={(event) => handleFieldChange('category', event.target.value)}
            >
              <option value="개발">개발</option>
              <option value="디자인">디자인</option>
              <option value="영상/편집">영상/편집</option>
              <option value="생활심부름">생활심부름</option>
              <option value="청소/수리">청소/수리</option>
            </select>
          </label>

          <label>
            한줄 소개
            <input
              type="text"
              value={mergedForm.tagline}
              onChange={(event) => handleFieldChange('tagline', event.target.value)}
              placeholder="예) 빠른 응답과 높은 완성도로 도와드립니다."
            />
          </label>

          <label>
            상세 소개
            <textarea
              value={mergedForm.description}
              onChange={(event) => handleFieldChange('description', event.target.value)}
              placeholder="경력, 작업 방식, 강점을 자유롭게 작성하세요."
            />
          </label>

          <label>
            활동 지역
            <input
              type="text"
              value={mergedForm.region}
              onChange={(event) => handleFieldChange('region', event.target.value)}
              placeholder="예) 서울 전지역, 원격 가능"
            />
          </label>

          <div className="seller-image-uploader">
            <p>프로필 이미지</p>
            <div className="seller-image-uploader-row">
              <div className="seller-image-preview">
                {mergedForm.profileImage ? (
                  <img src={mergedForm.profileImage} alt="판매자 프로필 미리보기" />
                ) : (
                  <span>미리보기</span>
                )}
              </div>
              <label className="seller-image-upload-btn">
                이미지 업로드
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>
            </div>
          </div>

          <button type="submit" className="seller-onboarding-submit-btn">
            서비스 등록 시작
          </button>
        </form>
      </section>
    </div>
  )
}

export default SellerOnboardingModal
