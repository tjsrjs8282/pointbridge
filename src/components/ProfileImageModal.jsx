import { useEffect, useRef, useState } from 'react'
import useAuth from '../hooks/useAuth'
import { uploadProfileAvatar } from '../lib/profile'
import { validateImageFile } from '../lib/imageUpload'

function ProfileImageModal({ isOpen, onClose, onSaved }) {
  const { user, profile, updateProfile, refreshProfile } = useAuth()
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setSelectedFile(null)
    setPreviewUrl(profile?.avatar_url ?? '')
    setSaveError('')
  }, [isOpen, profile?.avatar_url])

  if (!isOpen) return null

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const validation = validateImageFile(file, {
      maxSizeBytes: 1 * 1024 * 1024,
      allowedExtensions: ['jpg', 'jpeg'],
    })
    if (!validation.ok) {
      setSaveError(validation.message)
      setSelectedFile(null)
      return
    }
    setSaveError('')
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!user?.id) {
      setSaveError('로그인 정보가 없습니다. 다시 로그인해 주세요.')
      return
    }
    if (!selectedFile) {
      setSaveError('업로드할 이미지를 먼저 선택해 주세요.')
      return
    }

    try {
      setIsSaving(true)
      setSaveError('')
      const uploadResult = await uploadProfileAvatar({ userId: user.id, file: selectedFile })
      if (uploadResult.error) {
        throw new Error(uploadResult.error.message)
      }

      updateProfile(uploadResult.data?.profile ?? { ...(profile ?? {}), avatar_url: uploadResult.data?.publicUrl })
      await refreshProfile()
      onSaved?.('프로필 이미지가 변경되었습니다.')
      onClose?.()
    } catch (error) {
      setSaveError(error?.message ?? '프로필 이미지 저장 중 문제가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const fallbackText = (profile?.nickname ?? profile?.name ?? user?.email ?? '사용자').slice(0, 1).toUpperCase()

  return (
    <div className="profile-edit-overlay" role="presentation">
      <section className="profile-edit-modal profile-image-modal" role="dialog" aria-modal="true">
        <div className="profile-edit-head">
          <h2>프로필 이미지 변경</h2>
          <button type="button" onClick={onClose} aria-label="프로필 이미지 변경 모달 닫기">
            ×
          </button>
        </div>

        <div className="profile-image-body">
          <div className="profile-image-current">
            <p>현재 프로필 이미지</p>
            <div className="profile-image-preview-lg">
              {previewUrl ? <img src={previewUrl} alt="선택한 프로필 이미지 미리보기" /> : <span>{fallbackText}</span>}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="profile-avatar-file-input"
            accept=".jpg,.jpeg,image/jpeg"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="btn-secondary profile-image-select-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            새 이미지 선택
          </button>
          {selectedFile ? <small className="profile-image-file-name">{selectedFile.name}</small> : null}
          <small className="profile-image-file-name">jpg 이미지, 1MB 이하만 업로드할 수 있습니다.</small>
          <small className="profile-image-file-name">권장 사이즈: 80×80px</small>
        </div>

        <div className="profile-edit-footer profile-image-footer">
          {saveError ? <small className="auth-error">{saveError}</small> : <span />}
          <div className="profile-image-footer-actions">
            <button type="button" className="profile-image-cancel-btn" onClick={onClose}>
              취소
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProfileImageModal
