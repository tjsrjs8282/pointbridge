import './App.css'
import './styles/components.css'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import ChatPage from './pages/ChatPage'
import CommunityPage from './pages/CommunityPage'
import HomePage from './pages/HomePage'
import OrdersPage from './pages/OrdersPage'
import PointsPage from './pages/PointsPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import SellerDetailPage from './pages/SellerDetailPage'
import SellersPage from './pages/SellersPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<Navigate to="/sellers" replace />} />
        <Route path="/seller-search" element={<SellersPage />} />
        <Route path="/sellers" element={<SellersPage />} />
        <Route path="/seller/:id" element={<SellerDetailPage />} />

        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/points" element={<PointsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/mypage" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/seller-dashboard" element={<SellerDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
