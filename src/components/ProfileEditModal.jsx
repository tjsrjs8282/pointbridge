import { useEffect, useMemo, useState } from 'react'
import useAuth from '../hooks/useAuth'
import { openKakaoPostcode } from '../lib/postcode'
import { supabase } from '../lib/supabase'
import { NICKNAME_MAX_LENGTH, validateNickname } from '../lib/userProfileRules'

function formatPhoneNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

const INTEREST_CATEGORY_OPTIONS = [
  '디자인',
  'IT프로그래밍',
  '영상/음향',
  '마케팅',
  '언어/번역',
  '설치/수리',
  '생활서비스',
]

function parseInterests(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function ProfileEditModal({ isOpen, onClose, onSaved }) {
  const { user, profile, updateProfile, refreshProfile } = useAuth()
  const [editForm, setEditForm] = useState({
    nickname: '',
    bio: '',
    phone: '',
    address: '',
    addressDetail: '',
    region: '',
    interests: [],
  })
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const readonlyInfo = useMemo(
    () => ({
      name: profile?.name ?? user?.user_metadata?.name ?? '사용자',
      email: profile?.email ?? user?.email ?? '',
    }),
    [profile?.name, profile?.email, user?.user_metadata?.name, user?.email],
  )

  useEffect(() => {
    if (!isOpen) return
    setEditForm({
      nickname: profile?.nickname ?? profile?.name ?? '',
      bio: profile?.bio ?? '',
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
      addressDetail: profile?.address_detail ?? '',
      region: profile?.region ?? '',
      interests: parseInterests(profile?.interests),
    })
    setSaveError('')
  }, [isOpen, profile])

  if (!isOpen) return null

  const handleAddressSearch = async () => {
    try {
      await openKakaoPostcode({
        onComplete: (address) => {
          setEditForm((prev) => ({ ...prev, address }))
        },
      })
    } catch (error) {
      setSaveError(error?.message ?? '주소 검색을 불러오지 못했습니다.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user?.id) {
      setSaveError('로그인 정보가 없습니다. 다시 로그인해 주세요.')
      return
    }

    const nicknameValidation = validateNickname(editForm.nickname)
    if (!nicknameValidation.ok) {
      setSaveError(nicknameValidation.message)
      return
    }

    try {
      setIsSaving(true)
      setSaveError('')
      const updatePayload = {
        nickname: editForm.nickname.trim(),
        bio: editForm.bio,
        phone: formatPhoneNumber(editForm.phone),
        address: editForm.address,
        address_detail: editForm.addressDetail,
        region: editForm.region,
        interests: editForm.interests.join(', '),
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('[ProfileEditModal] update failed', error)
        throw new Error(error.message)
      }

      updateProfile({ ...(profile ?? {}), ...data })
      await refreshProfile()
      onSaved?.('프로필 정보가 저장되었습니다.')
      onClose?.()
    } catch (error) {
      console.error('[ProfileEditModal] save exception', error)
      setSaveError(error?.message ?? '프로필 저장 중 문제가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleInterest = (category) => {
    setEditForm((prev) => {
      const isSelected = prev.interests.includes(category)
      return {
        ...prev,
        interests: isSelected
          ? prev.interests.filter((item) => item !== category)
          : [...prev.interests, category],
      }
    })
  }

  return (
    <div className="profile-edit-overlay" role="presentation">
      <section className="profile-edit-modal" role="dialog" aria-modal="true">
        <div className="profile-edit-head">
          <h2>내 정보 수정</h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="profile-edit-form" onSubmit={handleSubmit}>
          <div className="profile-edit-scroll-body">
            <section className="profile-edit-section readonly">
              <h3>계정 기본 정보</h3>
              <p className="profile-edit-section-note">🔒 잠금됨 · 수정 불가</p>
              <label>
                이름
                <input type="text" value={readonlyInfo.name} readOnly disabled className="readonly-input" />
              </label>
              <label>
                이메일
                <input type="text" value={readonlyInfo.email} readOnly disabled className="readonly-input" />
              </label>
            </section>

            <section className="profile-edit-section">
              <h3>프로필 정보</h3>
              <label>
                닉네임
                <input
                  type="text"
                  value={editForm.nickname}
                  maxLength={NICKNAME_MAX_LENGTH}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, nickname: event.target.value }))
                  }
                />
              </label>
              <label>
                한줄 소개
                <input
                  type="text"
                  value={editForm.bio}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, bio: event.target.value }))
                  }
                />
              </label>
              <label>
                연락처
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      phone: formatPhoneNumber(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                주소
                <div className="auth-inline-row">
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                  />
                  <button type="button" className="auth-secondary-btn" onClick={handleAddressSearch}>
                    주소 찾기
                  </button>
                </div>
              </label>
              <label>
                상세주소
                <input
                  type="text"
                  value={editForm.addressDetail}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, addressDetail: event.target.value }))
                  }
                />
              </label>
              <label>
                활동 지역
                <input
                  type="text"
                  value={editForm.region}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, region: event.target.value }))
                  }
                />
              </label>
              <div className="profile-interest-picker">
                <span>관심 카테고리</span>
                <div className="profile-interest-tags">
                  {INTEREST_CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={editForm.interests.includes(category) ? 'active' : ''}
                      onClick={() => toggleInterest(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="profile-edit-footer">
            {saveError ? <small className="auth-error">{saveError}</small> : <span />}
            <button type="submit" disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ProfileEditModal
