import { createContext, useEffect, useMemo, useReducer } from 'react'
import useAuth from '../hooks/useAuth'
import { syncProfileThemeSettings } from '../lib/profile'

const SettingsContext = createContext(null)

const themePresets = {
  darkViolet: {
    label: 'Dark Violet',
    surface: {
      bgBase: '#140f2c',
      radialA: '#3a1d65',
      radialB: '#3c1f7e',
      card: 'rgba(33, 22, 66, 0.68)',
      border: 'rgba(188, 158, 255, 0.2)',
      text: '#f3efff',
      textMuted: '#bfb6dd',
      inputBg: 'rgba(80, 59, 134, 0.32)',
      inputBorder: 'rgba(191, 160, 255, 0.25)',
    },
  },
  darkMint: {
    label: 'Dark Mint',
    surface: {
      bgBase: '#10272a',
      radialA: '#1b4f4c',
      radialB: '#1a3b64',
      card: 'rgba(20, 43, 52, 0.72)',
      border: 'rgba(116, 211, 189, 0.28)',
      text: '#edfdf8',
      textMuted: '#b5ddd4',
      inputBg: 'rgba(45, 97, 111, 0.3)',
      inputBorder: 'rgba(118, 210, 189, 0.3)',
    },
  },
  darkAmber: {
    label: 'Dark Amber',
    surface: {
      bgBase: '#2b1e0f',
      radialA: '#573a14',
      radialB: '#5e2d11',
      card: 'rgba(61, 40, 20, 0.72)',
      border: 'rgba(255, 190, 114, 0.3)',
      text: '#fff5e7',
      textMuted: '#e6c7a0',
      inputBg: 'rgba(126, 86, 54, 0.3)',
      inputBorder: 'rgba(255, 191, 120, 0.32)',
    },
  },
  darkRose: {
    label: 'Dark Rose',
    surface: {
      bgBase: '#2a1325',
      radialA: '#5a1f48',
      radialB: '#442469',
      card: 'rgba(56, 24, 56, 0.72)',
      border: 'rgba(255, 157, 198, 0.3)',
      text: '#ffeef8',
      textMuted: '#e7b5d0',
      inputBg: 'rgba(110, 63, 101, 0.32)',
      inputBorder: 'rgba(255, 166, 207, 0.3)',
    },
  },
  darkKhaki: {
    label: 'Dark Khaki',
    surface: {
      bgBase: '#262316',
      radialA: '#4d482a',
      radialB: '#313d2a',
      card: 'rgba(55, 53, 32, 0.72)',
      border: 'rgba(191, 183, 132, 0.28)',
      text: '#f8f7eb',
      textMuted: '#d4cfad',
      inputBg: 'rgba(98, 96, 67, 0.3)',
      inputBorder: 'rgba(193, 184, 135, 0.32)',
    },
  },
  whiteLavender: {
    label: 'Soft White',
    surface: {
      bgBase: '#f5f4fb',
      radialA: '#ece4ff',
      radialB: '#d9e6ff',
      card: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(184, 168, 228, 0.32)',
      text: '#282447',
      textMuted: '#5e5a80',
      inputBg: 'rgba(243, 238, 255, 0.9)',
      inputBorder: 'rgba(178, 163, 226, 0.38)',
    },
  },
  whiteMint: {
    label: 'Cool White',
    surface: {
      bgBase: '#edf7f7',
      radialA: '#dcf4ee',
      radialB: '#d8ecff',
      card: 'rgba(255, 255, 255, 0.94)',
      border: 'rgba(149, 205, 194, 0.38)',
      text: '#243f42',
      textMuted: '#4f6a6e',
      inputBg: 'rgba(235, 250, 246, 0.94)',
      inputBorder: 'rgba(142, 199, 189, 0.4)',
    },
  },
  softGray: {
    label: 'Soft Gray',
    surface: {
      bgBase: '#e9ecf2',
      radialA: '#d8dee9',
      radialB: '#d4d9e4',
      card: 'rgba(244, 247, 252, 0.96)',
      border: 'rgba(128, 140, 160, 0.42)',
      text: '#1f2735',
      textMuted: '#49566b',
      inputBg: 'rgba(234, 239, 247, 0.96)',
      inputBorder: 'rgba(128, 140, 160, 0.48)',
    },
  },
  graphiteClean: {
    label: 'Graphite Clean',
    surface: {
      bgBase: '#1b1f26',
      radialA: '#2b3342',
      radialB: '#202733',
      card: 'rgba(36, 43, 55, 0.82)',
      border: 'rgba(145, 159, 181, 0.32)',
      text: '#eef2f8',
      textMuted: '#b9c2d1',
      inputBg: 'rgba(65, 76, 95, 0.36)',
      inputBorder: 'rgba(151, 163, 184, 0.35)',
    },
  },
  sunsetPop: {
    label: 'Sunset Pop',
    surface: {
      bgBase: '#2d1a1f',
      radialA: '#6a2f46',
      radialB: '#9a4f2b',
      card: 'rgba(58, 29, 42, 0.78)',
      border: 'rgba(255, 164, 119, 0.32)',
      text: '#fff2eb',
      textMuted: '#f2c3ad',
      inputBg: 'rgba(118, 63, 71, 0.36)',
      inputBorder: 'rgba(255, 169, 124, 0.35)',
    },
  },
  cyberNeon: {
    label: 'Cyber Neon',
    surface: {
      bgBase: '#0a1630',
      radialA: '#113f6a',
      radialB: '#2e1e66',
      card: 'rgba(19, 43, 77, 0.78)',
      border: 'rgba(102, 255, 222, 0.35)',
      text: '#e7fbff',
      textMuted: '#a7d8e6',
      inputBg: 'rgba(35, 79, 114, 0.38)',
      inputBorder: 'rgba(104, 255, 225, 0.38)',
    },
  },
  auroraDream: {
    label: 'Aurora Dream',
    surface: {
      bgBase: '#1c2139',
      radialA: '#2f4b87',
      radialB: '#32586c',
      card: 'rgba(39, 52, 94, 0.78)',
      border: 'rgba(151, 221, 206, 0.35)',
      text: '#eef7ff',
      textMuted: '#bad6e7',
      inputBg: 'rgba(67, 84, 126, 0.4)',
      inputBorder: 'rgba(151, 223, 208, 0.37)',
    },
  },
}

const defaultSettings = {
  themeMode: 'system',
  themePreset: 'darkViolet',
  accentColor: 'violet',
  compactMode: false,
  reducedMotion: false,
  notificationPreferences: {
    orders: true,
    chat: true,
    marketing: false,
  },
  uiDensity: 'comfortable',
  cardStyle: 'glass',
  cornerRadius: 'md',
  motionIntensity: 'normal',
  sidebarDefaultState: 'expanded',
  searchScope: 'all',
  saveRecentSearches: true,
}

function normalizeThemePresetKey(themePreset) {
  const legacyMap = {
    whiteLavender: 'whiteLavender',
    whiteMint: 'whiteMint',
    whitePeach: 'whiteLavender',
    whiteKhaki: 'softGray',
  }
  return legacyMap[themePreset] ?? themePreset
}

function getStorageKey(userId) {
  return `appSettings:${userId ?? 'guest'}`
}

function parseStoredSettings(raw) {
  if (!raw) return defaultSettings
  try {
    const parsed = JSON.parse(raw)
    return {
      ...defaultSettings,
      ...parsed,
      themeMode:
        parsed.themeMode ??
        (parsed.theme === 'system' ? 'system' : 'preset'),
      themePreset: normalizeThemePresetKey(
        parsed.themePreset ?? defaultSettings.themePreset,
      ),
      notificationPreferences: {
        ...defaultSettings.notificationPreferences,
        ...(parsed.notificationPreferences ?? {}),
        orders: parsed.notifyOrder ?? parsed.notificationPreferences?.orders ?? true,
        chat: parsed.notifyChat ?? parsed.notificationPreferences?.chat ?? true,
        marketing: parsed.notifyMarketing ?? parsed.notificationPreferences?.marketing ?? false,
      },
    }
  } catch {
    return defaultSettings
  }
}

function loadSettingsFromStorage(userId) {
  const storageKey = getStorageKey(userId)
  const legacyRaw = localStorage.getItem('appSettings')
  const raw = localStorage.getItem(storageKey) ?? legacyRaw
  return parseStoredSettings(raw)
}

function applySettingsToDocument(settings) {
  const body = document.body
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  const resolvedPreset =
    settings.themeMode === 'system'
      ? prefersDark
        ? 'darkViolet'
        : 'whiteMint'
      : settings.themePreset
  body.setAttribute('data-theme-preset', resolvedPreset)
  body.setAttribute('data-accent-color', settings.accentColor ?? 'violet')

  body.classList.toggle('compact-mode', Boolean(settings.compactMode))
  body.classList.toggle('reduced-motion', Boolean(settings.reducedMotion))
  body.setAttribute('data-ui-density', settings.uiDensity ?? 'comfortable')
  body.setAttribute('data-card-style', settings.cardStyle ?? 'glass')
  body.setAttribute('data-corner-radius', settings.cornerRadius ?? 'md')
  body.setAttribute('data-motion-intensity', settings.motionIntensity ?? 'normal')
  body.setAttribute('data-sidebar-default', settings.sidebarDefaultState ?? 'expanded')
}

function settingsReducer(state, action) {
  if (action.type === 'load') {
    return {
      ...state,
      settings: action.payload,
      settingsLoading: false,
      userId: action.userId ?? null,
    }
  }

  if (action.type === 'update') {
    const nextPartial =
      typeof action.payload === 'function' ? action.payload(state.settings) : action.payload
    return {
      ...state,
      settings: {
        ...state.settings,
        ...nextPartial,
        notificationPreferences: {
          ...state.settings.notificationPreferences,
          ...(nextPartial.notificationPreferences ?? {}),
        },
      },
    }
  }

  return state
}

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [state, dispatch] = useReducer(settingsReducer, {
    settings: loadSettingsFromStorage(userId),
    settingsLoading: false,
    userId,
  })
  const { settings, settingsLoading } = state

  useEffect(() => {
    if (state.userId === userId) {
      return
    }
    dispatch({ type: 'load', payload: loadSettingsFromStorage(userId), userId })
  }, [state.userId, userId])

  useEffect(() => {
    if (settingsLoading) return
    localStorage.setItem(getStorageKey(userId), JSON.stringify(settings))
    applySettingsToDocument(settings)
    if (userId) {
      syncProfileThemeSettings({ userId, settings }).catch(() => {})
    }
  }, [settings, userId, settingsLoading])

  const updateSettings = (updater) => {
    dispatch({ type: 'update', payload: updater })
  }

  const value = useMemo(
    () => ({
      settings,
      settingsLoading,
      themePresets,
      setSettings: updateSettings,
      resetSettings: () => dispatch({ type: 'load', payload: defaultSettings, userId }),
    }),
    [settings, settingsLoading, userId],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export default SettingsContext
