import { useContext } from 'react'
import SettingsContext from '../context/SettingsContext'

function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}

export default useSettings
