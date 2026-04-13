import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useAuth from '../hooks/useAuth'

function getProfileFailureNotice(profileError) {
  if (!profileError) return null

  const code = String(profileError.code ?? '').toUpperCase()
  const message = profileError.message ?? '프로필 저장 실패'

  if (code === '42703' || message.toLowerCase().includes('column')) {
    return `계정은 생성되었지만 프로필 테이블 컬럼 불일치로 저장에 실패했습니다. (${message})`
  }

  if (code === 'PGRST301' || code === '42501') {
    return `계정은 생성되었지만 profiles 권한(RLS) 문제로 저장에 실패했습니다. (${message})`
  }

  if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
    return `계정은 생성되었지만 네트워크 문제로 프로필 저장에 실패했습니다. (${message})`
  }

  return `계정은 생성되었지만 프로필 저장에 실패했습니다. 원인: ${message}`
}

function SignupPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    role: '구매자',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = '이름을 입력해 주세요.'
    if (!form.email.trim()) nextErrors.email = '이메일을 입력해 주세요.'
    if (!form.email.includes('@')) nextErrors.email = '올바른 이메일 형식이 아닙니다.'
    if (form.password.length < 6) nextErrors.password = '비밀번호는 6자 이상 입력해 주세요.'
    if (form.password !== form.passwordConfirm) {
      nextErrors.passwordConfirm = '비밀번호 확인이 일치하지 않습니다.'
    }
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
      const result = await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      })
      const profileNotice = result?.profileError
        ? getProfileFailureNotice(result.profileError)
        : result?.requiresEmailConfirmation
          ? '회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.'
          : '회원가입이 완료되었습니다. 로그인 후 서비스를 이용해 주세요.'
      navigate('/login', {
        replace: true,
        state: {
          notice: profileNotice,
        },
      })
    } catch (error) {
      setSubmitError(
        error?.message ?? '회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-card">
      <h1>회원가입</h1>
      <p>새 계정을 만들고 구매자/판매자 역할을 선택해 시작해보세요.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          이름
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          {errors.name ? <small className="auth-error">{errors.name}</small> : null}
        </label>
        <label>
          이메일
          <input
            type="email"
            placeholder="you@example.com"
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
        <label>
          비밀번호 확인
          <input
            type="password"
            placeholder="비밀번호를 다시 입력하세요"
            value={form.passwordConfirm}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, passwordConfirm: event.target.value }))
            }
          />
          {errors.passwordConfirm ? (
            <small className="auth-error">{errors.passwordConfirm}</small>
          ) : null}
        </label>
        <label>
          역할 선택
          <select
            value={form.role}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, role: event.target.value }))
            }
          >
            <option value="구매자">구매자</option>
            <option value="판매자">판매자</option>
            <option value="둘 다">둘 다</option>
          </select>
        </label>
        {submitError ? <small className="auth-error">{submitError}</small> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '가입 처리 중...' : '회원가입'}
        </button>
      </form>

      <p className="auth-link-row">
        이미 계정이 있나요? <Link to="/login">로그인</Link>
      </p>
    </section>
  )
}

export default SignupPage
