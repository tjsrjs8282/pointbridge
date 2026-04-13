import { useState } from 'react'
import useAuth from '../hooks/useAuth'
import { openKakaoPostcode } from '../lib/postcode'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

function formatPhoneNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function LoginModal() {
  const {
    isLoginModalOpen,
    authModalTab,
    setAuthModalTab,
    closeLoginModal,
    signIn,
    signUp,
    authError,
    handleModalLoginSuccess,
  } = useAuth()
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })
  const [signupForm, setSignupForm] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    address: '',
    addressDetail: '',
  })
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitted, setForgotSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitNotice, setSubmitNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoginModalOpen) return null

  const validateLogin = () => {
    const nextErrors = {}
    if (!loginForm.email.trim()) nextErrors.email = '이메일을 입력해 주세요.'
    if (loginForm.email && !emailRegex.test(loginForm.email)) {
      nextErrors.email = '올바른 이메일 형식이 아닙니다.'
    }
    if (!loginForm.password) nextErrors.password = '비밀번호를 입력해 주세요.'
    return nextErrors
  }

  const validateSignup = () => {
    const nextErrors = {}
    if (!signupForm.name.trim()) nextErrors.name = '이름을 입력해 주세요.'
    if (!signupForm.nickname.trim()) nextErrors.nickname = '닉네임을 입력해 주세요.'
    if (!signupForm.email.trim()) nextErrors.email = '이메일을 입력해 주세요.'
    if (signupForm.email && !emailRegex.test(signupForm.email)) {
      nextErrors.email = '올바른 이메일 형식이 아닙니다.'
    }
    if (!signupForm.phone.trim()) nextErrors.phone = '휴대폰 번호를 입력해 주세요.'
    const phoneDigits = signupForm.phone.replace(/\D/g, '')
    if (signupForm.phone && !/^01\d{8,9}$/.test(phoneDigits)) {
      nextErrors.phone = '휴대폰 번호 형식이 올바르지 않습니다.'
    }
    if (!signupForm.password) nextErrors.password = '비밀번호를 입력해 주세요.'
    if (signupForm.password && !passwordRegex.test(signupForm.password)) {
      nextErrors.password = '비밀번호는 8자 이상, 영문+숫자를 포함해야 합니다.'
    }
    if (!signupForm.passwordConfirm) nextErrors.passwordConfirm = '비밀번호 확인을 입력해 주세요.'
    if (
      signupForm.password &&
      signupForm.passwordConfirm &&
      signupForm.password !== signupForm.passwordConfirm
    ) {
      nextErrors.passwordConfirm = '비밀번호 확인이 일치하지 않습니다.'
    }
    if (!signupForm.address.trim()) nextErrors.address = '주소를 입력해 주세요.'
    return nextErrors
  }

  const resetTransientState = () => {
    setErrors({})
    setSubmitError('')
    setSubmitNotice('')
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    resetTransientState()
    const nextErrors = validateLogin()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      setIsSubmitting(true)
      await signIn(loginForm)
      handleModalLoginSuccess()
      setLoginForm({ email: '', password: '' })
      setErrors({})
    } catch (error) {
      setSubmitError(error?.message ?? '로그인 처리 중 문제가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignupSubmit = async (event) => {
    event.preventDefault()
    resetTransientState()
    const nextErrors = validateSignup()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      setIsSubmitting(true)
      const result = await signUp({
        name: signupForm.name,
        nickname: signupForm.nickname,
        email: signupForm.email,
        phone: signupForm.phone,
        password: signupForm.password,
        address: signupForm.address,
        addressDetail: signupForm.addressDetail,
        role: '구매자',
      })
      if (result?.requiresEmailConfirmation) {
        setSubmitNotice('가입 완료! 인증 메일을 보냈어요. 이메일 인증 후 로그인해 주세요.')
      } else {
        setSubmitNotice('가입 완료! 이메일 인증 설정에 따라 메일함을 확인해 주세요.')
      }
      setAuthModalTab('login')
      setLoginForm({ email: signupForm.email, password: '' })
    } catch (error) {
      setSubmitError(error?.message ?? '회원가입 처리 중 문제가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotSubmit = (event) => {
    event.preventDefault()
    resetTransientState()
    if (!forgotEmail.trim() || !emailRegex.test(forgotEmail)) {
      setErrors({ forgotEmail: '올바른 이메일을 입력해 주세요.' })
      return
    }
    setForgotSubmitted(true)
    setSubmitNotice('비밀번호 재설정 링크를 발송했습니다. 메일함을 확인해 주세요.')
  }

  const handleAddressSearch = async () => {
    try {
      await openKakaoPostcode({
        onComplete: (address) => {
          setSignupForm((prev) => ({ ...prev, address }))
        },
      })
    } catch (error) {
      setSubmitError(error?.message ?? '주소 검색을 불러오지 못했습니다.')
    }
  }

  return (
    <div className="login-modal-overlay" role="presentation">
      <section className="login-modal-card" role="dialog" aria-modal="true" aria-label="로그인">
        <button
          type="button"
          className="login-modal-close-btn"
          aria-label="로그인 모달 닫기"
          onClick={closeLoginModal}
        >
          ×
        </button>

        <h2>{authModalTab === 'signup' ? '회원가입' : '로그인'}</h2>

        <div className="auth-modal-tabs">
          <button
            type="button"
            className={authModalTab === 'login' ? 'active' : ''}
            onClick={() => {
              setAuthModalTab('login')
              resetTransientState()
            }}
          >
            로그인
          </button>
          <button
            type="button"
            className={authModalTab === 'signup' ? 'active' : ''}
            onClick={() => {
              setAuthModalTab('signup')
              resetTransientState()
            }}
          >
            회원가입
          </button>
        </div>

        {authModalTab === 'signup' ? (
          <form className="auth-form" onSubmit={handleSignupSubmit}>
            <label>
              이름
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={signupForm.name}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              {errors.name ? <small className="auth-error">{errors.name}</small> : null}
            </label>
            <label>
              닉네임
              <input
                type="text"
                placeholder="닉네임을 입력하세요"
                value={signupForm.nickname}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, nickname: event.target.value }))
                }
              />
              {errors.nickname ? <small className="auth-error">{errors.nickname}</small> : null}
            </label>
            <label>
              이메일
              <input
                type="email"
                placeholder="you@example.com"
                value={signupForm.email}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              {errors.email ? <small className="auth-error">{errors.email}</small> : null}
            </label>
            <label>
              휴대폰 번호
              <input
                type="tel"
                placeholder="010-1234-5678"
                value={signupForm.phone}
                onChange={(event) =>
                  setSignupForm((prev) => ({
                    ...prev,
                    phone: formatPhoneNumber(event.target.value),
                  }))
                }
              />
              {errors.phone ? <small className="auth-error">{errors.phone}</small> : null}
            </label>
            <label>
              비밀번호
              <input
                type="password"
                placeholder="8자 이상, 영문+숫자 포함"
                value={signupForm.password}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
              {errors.password ? <small className="auth-error">{errors.password}</small> : null}
            </label>
            <label>
              비밀번호 확인
              <input
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={signupForm.passwordConfirm}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, passwordConfirm: event.target.value }))
                }
              />
              {errors.passwordConfirm ? (
                <small className="auth-error">{errors.passwordConfirm}</small>
              ) : null}
            </label>
            <label>
              주소
              <div className="auth-inline-row">
                <input
                  type="text"
                  placeholder="주소를 검색해 주세요"
                  value={signupForm.address}
                  onChange={(event) =>
                    setSignupForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={handleAddressSearch}
                >
                  주소 찾기
                </button>
              </div>
              {errors.address ? <small className="auth-error">{errors.address}</small> : null}
            </label>
            <label>
              상세주소
              <input
                type="text"
                placeholder="상세주소를 입력해 주세요"
                value={signupForm.addressDetail}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, addressDetail: event.target.value }))
                }
              />
            </label>
            {submitError ? <small className="auth-error">{submitError}</small> : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '가입 처리 중...' : '회원가입'}
            </button>
          </form>
        ) : authModalTab === 'forgot' ? (
          <form className="auth-form" onSubmit={handleForgotSubmit}>
            <label>
              비밀번호 재설정 이메일
              <input
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
              />
              {errors.forgotEmail ? <small className="auth-error">{errors.forgotEmail}</small> : null}
            </label>
            {forgotSubmitted ? (
              <small className="auth-notice">재설정 링크를 보냈어요. 메일함을 확인해 주세요.</small>
            ) : null}
            <button type="submit">링크 보내기</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label>
              이메일
              <input
                type="email"
                placeholder="you@example.com"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              {errors.email ? <small className="auth-error">{errors.email}</small> : null}
            </label>
            <label>
              비밀번호
              <input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
              {errors.password ? <small className="auth-error">{errors.password}</small> : null}
            </label>
            {submitError ? <small className="auth-error">{submitError}</small> : null}
            {!submitError && authError ? <small className="auth-error">{authError}</small> : null}
            {submitNotice ? <small className="auth-notice">{submitNotice}</small> : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}

        <div className="login-modal-links">
          <button
            type="button"
            onClick={() => {
              if (authModalTab === 'signup') {
                setAuthModalTab('login')
              } else {
                setAuthModalTab('signup')
              }
              resetTransientState()
            }}
          >
            {authModalTab === 'signup' ? '로그인' : '회원가입'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('forgot')
              setForgotSubmitted(false)
              setErrors({})
            }}
          >
            비밀번호 찾기
          </button>
        </div>

      </section>
    </div>
  )
}

export default LoginModal
