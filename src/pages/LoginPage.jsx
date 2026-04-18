import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useAuth from '../hooks/useAuth'

const DEV_ADMIN_LOGIN_ID = 'admin'

function canUseDevAdminAlias() {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  const host = String(window.location?.hostname ?? '').toLowerCase()
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signIn, authError } = useAuth()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const redirectPath = location.state?.from?.pathname ?? '/'
  const noticeMessage = location.state?.notice ?? ''

  const validate = () => {
    const nextErrors = {}
    if (!form.email.trim()) nextErrors.email = '이메일을 입력해 주세요.'
    const isDevAdminAlias =
      canUseDevAdminAlias() && String(form.email ?? '').trim().toLowerCase() === DEV_ADMIN_LOGIN_ID
    if (!form.email.includes('@') && !isDevAdminAlias) nextErrors.email = '올바른 이메일 형식이 아닙니다.'
    if (!form.password) nextErrors.password = '비밀번호를 입력해 주세요.'
    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      setIsSubmitting(true)
      await signIn(form)
      navigate(redirectPath, { replace: true })
    } catch (error) {
      setSubmitError(
        error?.message ?? '로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-card">
      <h1>로그인</h1>
      <p>계정으로 로그인하고 작업 의뢰와 관리를 시작하세요.</p>
      {noticeMessage ? <small className="auth-notice">{noticeMessage}</small> : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          이메일 ({canUseDevAdminAlias() ? '로컬 실행에서는 admin 입력 가능' : '이메일 형식으로 입력'})
          <input
            type="text"
            placeholder={canUseDevAdminAlias() ? 'you@example.com 또는 admin' : 'you@example.com'}
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
          />
          {errors.email ? <small className="auth-error">{errors.email}</small> : null}
        </label>
        <label>
          비밀번호
          <input
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
          />
          {errors.password ? <small className="auth-error">{errors.password}</small> : null}
        </label>
        {submitError ? <small className="auth-error">{submitError}</small> : null}
        {!submitError && authError ? <small className="auth-error">{authError}</small> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p className="auth-link-row">
        계정이 없나요? <Link to="/signup">회원가입</Link>
      </p>
    </section>
  )
}

export default LoginPage
