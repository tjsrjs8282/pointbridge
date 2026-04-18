import { useRef, useState } from 'react'
import { MARKETPLACE_CATEGORIES, normalizeMarketplaceCategory } from '../../constants/marketplaceTaxonomy'
import { prepareImageFileForUpload, readFileAsDataUrl, validateImageFile } from '../../lib/imageUpload'
import { createSellerService } from '../../lib/marketplace'

const defaultForm = {
  title: '',
  description: '',
  detailContent: '',
  category: '디자인',
  pricePoint: '',
  tagsInput: '',
}

function ServiceCreateModal({ isOpen, sellerUserId, onClose, onCreated }) {
  const [form, setForm] = useState(defaultForm)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [additionalPreviews, setAdditionalPreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const thumbnailInputRef = useRef(null)
  const additionalInputRef = useRef(null)

  if (!isOpen) return null

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleThumbnailUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const validation = validateImageFile(file, { maxSizeBytes: 5 * 1024 * 1024 })
    if (!validation.ok) {
      setStatusMessage('5MB 이하의 jpg, png, webp 파일만 업로드할 수 있습니다.')
      return
    }
    const { file: prepared, error } = await prepareImageFileForUpload(file, {
      maxSizeBytes: 5 * 1024 * 1024,
      maxWidth: 1400,
      maxHeight: 1400,
      quality: 0.84,
    })
    if (error || !prepared) {
      setStatusMessage(error?.message ?? '대표 이미지를 처리하지 못했습니다.')
      return
    }
    const dataUrl = await readFileAsDataUrl(prepared)
    setThumbnailPreview(dataUrl)
    setStatusMessage('')
  }

  const handleAdditionalUpload = async (event) => {
    const files = Array.from(event.target.files ?? []).slice(0, 5)
    if (files.length === 0) return
    const nextUrls = []
    for (const file of files) {
      const validation = validateImageFile(file, { maxSizeBytes: 5 * 1024 * 1024 })
      if (!validation.ok) {
        setStatusMessage('5MB 이하의 jpg, png, webp 파일만 업로드할 수 있습니다.')
        return
      }
      const { file: prepared, error } = await prepareImageFileForUpload(file, {
        maxSizeBytes: 5 * 1024 * 1024,
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.84,
      })
      if (error || !prepared) {
        setStatusMessage(error?.message ?? '추가 이미지를 처리하지 못했습니다.')
        return
      }
      const dataUrl = await readFileAsDataUrl(prepared)
      nextUrls.push(dataUrl)
    }
    setAdditionalPreviews(nextUrls)
    setStatusMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatusMessage('')
    const parsedPoint = Number(form.pricePoint)
    if (!form.title.trim() || !form.category.trim() || !parsedPoint || parsedPoint <= 0) {
      setStatusMessage('서비스명, 카테고리, 포인트를 올바르게 입력해 주세요.')
      return
    }
    const tags = form.tagsInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12)

    setIsSubmitting(true)
    const { error } = await createSellerService({
      sellerUserId,
      title: form.title.trim(),
      description: form.description.trim(),
      detailContent: form.detailContent.trim(),
      category: normalizeMarketplaceCategory(form.category.trim(), form.category.trim()),
      pricePoint: parsedPoint,
      thumbnailUrl: thumbnailPreview,
      additionalImageUrls: additionalPreviews,
      tags,
    })
    setIsSubmitting(false)

    if (error) {
      setStatusMessage(error.message ?? '서비스 등록 중 오류가 발생했습니다.')
      return
    }

    setForm(defaultForm)
    setThumbnailPreview('')
    setAdditionalPreviews([])
    onCreated?.()
    onClose?.()
  }

  return (
    <div className="order-modal-overlay" role="presentation">
      <section className="order-modal-card service-create-modal" role="dialog" aria-modal="true">
        <div className="order-modal-head">
          <h2>서비스 추가</h2>
          <button type="button" className="btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>

        <form className="seller-onboarding-form" onSubmit={handleSubmit}>
          <label>
            서비스 제목
            <input
              type="text"
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="예) 랜딩페이지 제작"
            />
          </label>

          <label>
            서비스 설명
            <textarea
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder="작업 범위, 전달물, 소요 기간 등을 작성하세요."
            />
          </label>

          <label>
            상세 내용
            <textarea
              value={form.detailContent}
              onChange={(event) => handleChange('detailContent', event.target.value)}
              placeholder="상세 작업 방식, 작업물 예시, 진행 절차를 작성해 주세요."
            />
          </label>

          <label>
            카테고리
            <select
              value={form.category}
              onChange={(event) => handleChange('category', event.target.value)}
            >
              {MARKETPLACE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            가격(포인트)
            <input
              type="number"
              min="1"
              step="1"
              value={form.pricePoint}
              onChange={(event) => handleChange('pricePoint', event.target.value)}
              placeholder="예) 4500"
            />
          </label>

          <label>
            태그/키워드 (쉼표 구분)
            <input
              type="text"
              value={form.tagsInput}
              onChange={(event) => handleChange('tagsInput', event.target.value)}
              placeholder="예) 로고, 브랜드가이드"
            />
          </label>

          <div className="seller-image-uploader">
            <p>대표 이미지</p>
            <p className="muted">5MB 이하의 jpg, png, webp 파일만 업로드할 수 있습니다.</p>
            <div className="seller-image-uploader-row">
              <div className="seller-image-preview">
                {thumbnailPreview ? <img src={thumbnailPreview} alt="대표 이미지 미리보기" /> : <span>대표</span>}
              </div>
              <button
                type="button"
                className="seller-image-upload-btn"
                onClick={() => thumbnailInputRef.current?.click()}
              >
                대표 이미지 업로드
              </button>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleThumbnailUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="seller-image-uploader">
            <p>추가 이미지</p>
            <div className="seller-image-uploader-row">
              <button
                type="button"
                className="seller-image-upload-btn"
                onClick={() => additionalInputRef.current?.click()}
              >
                추가 이미지 업로드
              </button>
              <input
                ref={additionalInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                onChange={handleAdditionalUpload}
                style={{ display: 'none' }}
              />
            </div>
            {additionalPreviews.length > 0 ? (
              <div className="seller-service-gallery">
                {additionalPreviews.map((imageUrl) => (
                  <img key={imageUrl} src={imageUrl} alt="추가 이미지 미리보기" />
                ))}
              </div>
            ) : null}
          </div>

          {statusMessage ? <p className="muted">{statusMessage}</p> : null}
          <button type="submit" className="order-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? '등록 중...' : '서비스 등록'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default ServiceCreateModal
