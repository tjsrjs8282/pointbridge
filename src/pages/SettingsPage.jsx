import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionTitle from '../components/SectionTitle'
import useAuth from '../hooks/useAuth'
import useSettings from '../hooks/useSettings'

function SettingsPage() {
  const { settings, setSettings, settingsLoading, themePresets } = useSettings()
  const { user, requireAuth } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (settingsLoading) return
    if (user?.id) return
    requireAuth({
      reason: '설정 페이지는 로그인 후 이용할 수 있습니다.',
      onSuccess: () => navigate('/settings'),
    })
    navigate('/', { replace: true })
  }, [settingsLoading, user?.id, requireAuth, navigate])

  const accentOptions = useMemo(
    () => [
      { key: 'violet', label: 'Violet / Blue' },
      { key: 'mint', label: 'Mint / Sky' },
      { key: 'coral', label: 'Coral / Peach' },
      { key: 'amber', label: 'Amber / Orange' },
      { key: 'rose', label: 'Rose / Pink' },
      { key: 'emerald', label: 'Emerald / Teal' },
      { key: 'brown', label: 'Brown / Khaki' },
      { key: 'graphite', label: 'Graphite / Silver' },
      { key: 'indigo', label: 'Indigo / Cyan' },
      { key: 'wine', label: 'Wine / Plum' },
    ],
    [],
  )

  const themePresetOptions = useMemo(
    () => [
      { key: 'darkViolet', label: 'Dark Violet' },
      { key: 'darkMint', label: 'Dark Mint' },
      { key: 'darkAmber', label: 'Dark Amber' },
      { key: 'darkRose', label: 'Dark Rose' },
      { key: 'darkKhaki', label: 'Dark Khaki' },
      { key: 'whiteLavender', label: 'Soft White' },
      { key: 'whiteMint', label: 'Cool White' },
      { key: 'softGray', label: 'Soft Gray' },
      { key: 'graphiteClean', label: 'Graphite Clean' },
      { key: 'sunsetPop', label: 'Sunset Pop' },
      { key: 'cyberNeon', label: 'Cyber Neon' },
      { key: 'auroraDream', label: 'Aurora Dream' },
    ],
    [],
  )

  if (settingsLoading) {
    return (
      <div className="page-stack">
        <section className="main-card hero-card hero-card--tight">
          <h1>앱 설정</h1>
          <p>설정을 불러오는 중입니다...</p>
        </section>
      </div>
    )
  }

  if (!user?.id) return null

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>앱 설정</h1>
        <p>테마, 알림, 화면 표시를 내 사용 방식에 맞게 조정할 수 있습니다.</p>
      </section>

      <section className="main-card settings-card">
        <SectionTitle title="테마 설정" />
        <div className="settings-group">
          <label>전체 테마 프리셋</label>
          <div className="settings-chip-row">
            {themePresetOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={settings.themePreset === option.key ? 'active' : ''}
                onClick={() => setSettings({ themePreset: option.key, themeMode: 'preset' })}
                title={themePresets?.[option.key]?.label ?? option.label}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <label>표시 모드</label>
          <div className="settings-chip-row">
            <button
              type="button"
              className={settings.themeMode === 'preset' ? 'active' : ''}
              onClick={() => setSettings({ themeMode: 'preset' })}
            >
              프리셋 우선
            </button>
            <button
              type="button"
              className={settings.themeMode === 'system' ? 'active' : ''}
              onClick={() => setSettings({ themeMode: 'system' })}
            >
              시스템 연동
            </button>
          </div>
        </div>

        <div className="settings-group">
          <label>포인트 컬러 (강조색)</label>
          <div className="settings-chip-row">
            {accentOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={settings.accentColor === option.key ? 'active' : ''}
                onClick={() => setSettings({ accentColor: option.key })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="main-card settings-card">
        <SectionTitle title="알림 설정" />
        <div className="settings-toggle-list">
          <label>
            <input
              type="checkbox"
              checked={settings.notificationPreferences.orders}
              onChange={(event) =>
                setSettings({
                  notificationPreferences: { orders: event.target.checked },
                })
              }
            />
            주문 알림
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.notificationPreferences.chat}
              onChange={(event) =>
                setSettings({
                  notificationPreferences: { chat: event.target.checked },
                })
              }
            />
            채팅 알림
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.notificationPreferences.marketing}
              onChange={(event) =>
                setSettings({
                  notificationPreferences: { marketing: event.target.checked },
                })
              }
            />
            마케팅 알림
          </label>
        </div>
      </section>

      <section className="main-card settings-card">
        <SectionTitle title="화면 설정" />
        <div className="settings-toggle-list">
          <label>
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(event) => setSettings({ compactMode: event.target.checked })}
            />
            컴팩트 모드
          </label>
          <label>
            UI 밀도
            <select
              value={settings.uiDensity}
              onChange={(event) => setSettings({ uiDensity: event.target.value })}
            >
              <option value="comfortable">보통</option>
              <option value="compact">촘촘</option>
              <option value="spacious">넓게</option>
            </select>
          </label>
          <label>
            카드 스타일
            <select
              value={settings.cardStyle}
              onChange={(event) => setSettings({ cardStyle: event.target.value })}
            >
              <option value="glass">Glass</option>
              <option value="solid">Solid</option>
              <option value="outline">Outline</option>
            </select>
          </label>
          <label>
            라운드 정도
            <select
              value={settings.cornerRadius}
              onChange={(event) => setSettings({ cornerRadius: event.target.value })}
            >
              <option value="sm">작게</option>
              <option value="md">보통</option>
              <option value="lg">크게</option>
            </select>
          </label>
          <label>
            애니메이션 강도
            <select
              value={settings.motionIntensity}
              onChange={(event) => setSettings({ motionIntensity: event.target.value })}
            >
              <option value="reduced">약하게</option>
              <option value="normal">보통</option>
              <option value="strong">강하게</option>
            </select>
          </label>
          <label>
            사이드바 기본 상태
            <select
              value={settings.sidebarDefaultState}
              onChange={(event) => setSettings({ sidebarDefaultState: event.target.value })}
            >
              <option value="expanded">펼침</option>
              <option value="collapsed">접힘</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) => setSettings({ reducedMotion: event.target.checked })}
            />
            애니메이션 감소
          </label>
        </div>
      </section>

      <section className="main-card settings-card">
        <SectionTitle title="검색 설정" />
        <div className="settings-toggle-list">
          <label>
            기본 검색 범위
            <select
              value={settings.searchScope}
              onChange={(event) => setSettings({ searchScope: event.target.value })}
            >
              <option value="all">전체</option>
              <option value="category">카테고리</option>
              <option value="seller">판매자</option>
              <option value="service">서비스</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.saveRecentSearches}
              onChange={(event) => setSettings({ saveRecentSearches: event.target.checked })}
            />
            최근 검색어 저장
          </label>
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
