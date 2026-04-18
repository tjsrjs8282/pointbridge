import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchUserTierKeyFromServer,
  fetchUserTierStats,
  resolveUserTier,
  tierMetaFromServerKey,
} from '../lib/userTier'

function useUserTier({ userId, profile }) {
  const [serverTierKey, setServerTierKey] = useState(null)
  const [stats, setStats] = useState({
    chargeCount: 0,
    serviceUseCount: 0,
    serviceCount: 0,
    completedSalesCount: 0,
    reviewAvg: Number(profile?.review_avg ?? 0),
    isSellerRegistered: Boolean(profile?.is_seller) || profile?.seller_status === 'active',
  })

  useEffect(() => {
    let mounted = true
    if (!userId) {
      setServerTierKey(null)
      setStats({
        chargeCount: 0,
        serviceUseCount: 0,
        serviceCount: 0,
        completedSalesCount: 0,
        reviewAvg: Number(profile?.review_avg ?? 0),
        isSellerRegistered: Boolean(profile?.is_seller) || profile?.seller_status === 'active',
      })
      return undefined
    }

    fetchUserTierKeyFromServer({ supabase, userId }).then(({ data, error }) => {
      if (!mounted) return
      setServerTierKey(!error && data ? data : null)
    })

    fetchUserTierStats({ userId, profile }).then(({ data }) => {
      if (!mounted || !data) return
      setStats(data)
    })

    return () => {
      mounted = false
    }
  }, [profile, userId])

  const tier = useMemo(() => {
    if (serverTierKey) return tierMetaFromServerKey(serverTierKey)
    return resolveUserTier(stats)
  }, [serverTierKey, stats])

  return { tier, tierStats: stats }
}

export default useUserTier
