import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { activeSupabaseUrl, supabase } from '../lib/supabase'
import {
  getCurrentSession,
  getCurrentUser,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
} from '../lib/auth'
import { createUserProfile, getProfileByUserId } from '../lib/profile'

const AuthContext = createContext(null)

function normalizeProfileData(rawProfile, user) {
  if (!rawProfile && !user) return null
  const fallbackName = user?.user_metadata?.name ?? user?.email?.split('@')?.[0] ?? '사용자'
  const fallbackNickname = user?.user_metadata?.nickname ?? fallbackName
  return {
    id: rawProfile?.id ?? user?.id ?? null,
    name: rawProfile?.name ?? fallbackName,
    email: rawProfile?.email ?? user?.email ?? '',
    nickname: rawProfile?.nickname ?? fallbackNickname,
    avatar_url: rawProfile?.avatar_url ?? '',
    role: rawProfile?.role ?? user?.user_metadata?.role ?? '구매자',
    bio: rawProfile?.bio ?? '',
    phone: rawProfile?.phone ?? '',
    address: rawProfile?.address ?? '',
    address_detail: rawProfile?.address_detail ?? '',
    region: rawProfile?.region ?? '',
    interests: rawProfile?.interests ?? '',
    point_balance: rawProfile?.point_balance ?? 0,
    created_at: rawProfile?.created_at ?? null,
    ...rawProfile,
  }
}

async function resolveProfileForUser({ user, allowCreate = true }) {
  const userId = user?.id
  if (!userId) {
    return { profile: null, profileError: null }
  }

  const profileResult = await getProfileByUserId(userId)
  if (profileResult.data) {
    return { profile: normalizeProfileData(profileResult.data, user), profileError: null }
  }

  if (profileResult.error && profileResult.errorType !== 'ROW_NOT_FOUND') {
    console.error('[Auth] Profile fetch failed', {
      userId,
      errorType: profileResult.errorType,
      message: profileResult.error.message,
      code: profileResult.error.code,
      details: profileResult.error.details,
      status: profileResult.error.status,
    })
    return { profile: null, profileError: profileResult.error }
  }

  if (!allowCreate) {
    return { profile: null, profileError: null }
  }

  const createResult = await createUserProfile({
    userId,
    name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? '',
    nickname:
      user.user_metadata?.nickname ??
      user.user_metadata?.name ??
      user.email?.split('@')?.[0] ??
      '사용자',
    role: user.user_metadata?.role ?? '구매자',
    email: user.email,
    phone: user.user_metadata?.phone ?? '',
    address: user.user_metadata?.address ?? '',
    addressDetail: user.user_metadata?.addressDetail ?? '',
  })

  if (createResult.error) {
    console.error('[Auth] Profile create fallback failed', {
      userId,
      message: createResult.error.message,
      code: createResult.error.code,
      details: createResult.error.details,
      status: createResult.error.status,
    })
    return { profile: null, profileError: createResult.error }
  }

  return { profile: normalizeProfileData(createResult.data, user), profileError: null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [loginModalReason, setLoginModalReason] = useState('')
  const [authModalTab, setAuthModalTab] = useState('login')
  const [isSellerOnboardingOpen, setIsSellerOnboardingOpen] = useState(false)
  const [sellerProfileDraft, setSellerProfileDraft] = useState(null)
  const pendingAuthActionRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    const initAuthState = async () => {
      setLoading(true)
      try {
        const [
          { data: sessionData, error: sessionError },
          { data: userData, error: userError },
        ] = await Promise.all([getCurrentSession(), getCurrentUser()])

        const nextSession = sessionData?.session ?? null
        const nextUser = nextSession?.user ?? userData?.user ?? null
        const { profile: nextProfile } = await resolveProfileForUser({
          user: nextUser,
          allowCreate: Boolean(nextSession?.user?.id),
        })

        if (!isMounted) return
        setSession(nextSession)
        setUser(nextUser)
        setProfile(nextProfile)
        setAuthError(sessionError?.message ?? userError?.message ?? null)
      } catch (error) {
        if (!isMounted) return
        setSession(null)
        setUser(null)
        setProfile(null)
        setAuthError(error?.message ?? '인증 상태를 불러오지 못했습니다.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuthState()

    const subscription = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setLoading(true)
      setSession(nextSession)
      const nextUser = nextSession?.user ?? null
      setUser(nextUser)
      if (!nextUser?.id) {
        setProfile(null)
        setAuthError(null)
        setLoading(false)
        return
      }

      resolveProfileForUser({ user: nextUser, allowCreate: true })
        .then(({ profile }) => {
          if (!isMounted) return
          setProfile(profile ?? null)
        })
        .catch((error) => {
          if (!isMounted) return
          setProfile(null)
          console.error('[Auth] Unexpected profile fetch exception', {
            userId: nextUser.id,
            error,
          })
        })
        .finally(() => {
          if (!isMounted) return
          setLoading(false)
        })
    })

    return () => {
      isMounted = false
      subscription?.data.subscription.unsubscribe()
    }
  }, [])

  const signIn = async ({ email, password }) => {
    setAuthError(null)
    const { data, error } = await signInWithEmail({ email, password })
    if (error) {
      setAuthError(error.message)
      throw new Error(error.message)
    }
    const nextSession = data?.session ?? null
    const nextUser = data?.user ?? null
    setSession(nextSession)
    setUser(nextUser)

    const { profile } = await resolveProfileForUser({
      user: nextUser,
      allowCreate: Boolean(nextSession?.user?.id),
    })
    setProfile(profile ?? null)

    return { data, error: null }
  }

  const signUp = async ({
    name,
    nickname,
    email,
    phone,
    password,
    address,
    addressDetail,
    role,
  }) => {
    setAuthError(null)
    console.log('[Auth][signup][debug] Supabase URL in use:', activeSupabaseUrl)
    const { data, error } = await signUpWithEmail({
      email,
      password,
      metadata: {
        name,
        nickname,
        phone,
        address,
        addressDetail,
        role,
      },
    })
    if (error) {
      setAuthError(error.message)
      throw new Error(error.message)
    }

    const nextSession = data?.session ?? null
    const nextUser = nextSession?.user ?? null
    let profileError = null
    let nextProfile = null

    // Email confirmation mode may return user without session.
    // In this case, do not treat missing profile as signup failure.
    if (nextSession?.user?.id) {
      const createResult = await createUserProfile({
        userId: nextSession.user.id,
        name,
        nickname,
        role,
        email,
        phone,
        address,
        addressDetail,
      })
      if (createResult.error) {
        profileError = createResult.error
      } else {
        nextProfile = createResult.data ?? null
      }
    }

    setSession(nextSession)
    setUser(nextUser)
    setProfile(nextProfile)
    return {
      data,
      profile: nextProfile,
      profileError,
      requiresEmailConfirmation: Boolean(data?.user && !data?.session),
      error: null,
    }
  }

  const signOut = async () => {
    setAuthError(null)
    const { error } = await signOutUser()
    if (error) {
      setAuthError(error.message)
      throw new Error(error.message)
    }
    setSession(null)
    setUser(null)
    setProfile(null)
    return { data: { signedOut: true }, error: null }
  }

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false)
    setLoginModalReason('')
    setAuthModalTab('login')
    pendingAuthActionRef.current = null
  }, [])

  const openAuthModal = useCallback(
    ({ tab = 'login', reason = '', onSuccess } = {}) => {
      pendingAuthActionRef.current = typeof onSuccess === 'function' ? onSuccess : null
      setAuthModalTab(tab)
      setLoginModalReason(reason)
      setIsLoginModalOpen(true)
    },
    [],
  )

  const requireAuth = useCallback(({ reason = '로그인이 필요한 기능입니다.', onSuccess } = {}) => {
    if (user) {
      if (typeof onSuccess === 'function') onSuccess()
      return true
    }

    openAuthModal({ tab: 'login', reason, onSuccess })
    return false
  }, [openAuthModal, user])

  const handleModalLoginSuccess = useCallback(() => {
    const pendingAction = pendingAuthActionRef.current
    setIsLoginModalOpen(false)
    setLoginModalReason('')
    pendingAuthActionRef.current = null
    if (typeof pendingAction === 'function') pendingAction()
  }, [])

  const openSellerOnboarding = useCallback(() => {
    setIsSellerOnboardingOpen(true)
  }, [])

  const closeSellerOnboarding = useCallback(() => {
    setIsSellerOnboardingOpen(false)
  }, [])

  const requestSellerOnboarding = useCallback(() => {
    requireAuth({
      reason: '판매자 등록은 로그인 후 이용할 수 있습니다.',
      onSuccess: openSellerOnboarding,
    })
  }, [requireAuth, openSellerOnboarding])

  const saveSellerProfileDraft = useCallback((draft) => {
    setSellerProfileDraft({
      ...draft,
      updatedAt: new Date().toISOString(),
    })
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            is_seller: true,
            seller_status: 'active',
          }
        : prev,
    )
    setIsSellerOnboardingOpen(false)
  }, [])

  const updateProfile = useCallback((nextProfile) => {
    setProfile(normalizeProfileData(nextProfile, user))
  }, [user])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      return null
    }
    const { profile: nextProfile } = await resolveProfileForUser({ user, allowCreate: true })
    setProfile(nextProfile ?? null)
    return nextProfile ?? null
  }, [user])

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      authError,
      isLoggedIn: Boolean(user),
      isInitializing: loading,
      signIn,
      signUp,
      signOut,
      requireAuth,
      isLoginModalOpen,
      loginModalReason,
      authModalTab,
      setAuthModalTab,
      openAuthModal,
      closeLoginModal,
      handleModalLoginSuccess,
      isSellerOnboardingOpen,
      sellerProfileDraft,
      requestSellerOnboarding,
      closeSellerOnboarding,
      saveSellerProfileDraft,
      updateProfile,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      loading,
      authError,
      requireAuth,
      isLoginModalOpen,
      loginModalReason,
      authModalTab,
      openAuthModal,
      closeLoginModal,
      handleModalLoginSuccess,
      isSellerOnboardingOpen,
      sellerProfileDraft,
      requestSellerOnboarding,
      closeSellerOnboarding,
      saveSellerProfileDraft,
      updateProfile,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
