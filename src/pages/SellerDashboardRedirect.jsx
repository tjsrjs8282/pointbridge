import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { fetchSellerProfileIdByUserId } from '../lib/marketplace'
import SectionLoader from '../components/common/SectionLoader'

function SellerDashboardRedirect() {
  const navigate = useNavigate()
  const { user, requestSellerOnboarding, isInitializing } = useAuth()

  useEffect(() => {
    if (isInitializing) return
    let mounted = true

    const run = async () => {
      if (!user?.id) {
        navigate('/', { replace: true })
        return
      }
      const { data } = await fetchSellerProfileIdByUserId(user.id)
      if (!mounted) return
      if (data) {
        navigate(`/seller/${data}`, { replace: true })
        return
      }
      requestSellerOnboarding()
      navigate('/mypage?tab=activity', { replace: true })
    }

    run()
    return () => {
      mounted = false
    }
  }, [isInitializing, user?.id, navigate, requestSellerOnboarding])

  return (
    <div className="page-stack">
      <SectionLoader label="판매자 대시보드로 이동 중" />
    </div>
  )
}

export default SellerDashboardRedirect
