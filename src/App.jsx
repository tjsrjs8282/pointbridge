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
import AdminPage from './pages/AdminPage'
import OrdersPage from './pages/OrdersPage'
import PointsPage from './pages/PointsPage'
import PointWithdrawPage from './pages/PointWithdrawPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import SellerDashboardRedirect from './pages/SellerDashboardRedirect'
import SellerDetailPage from './pages/SellerDetailPage'
import SellersPage from './pages/SellersPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ServiceDetailPage from './pages/ServiceDetailPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<Navigate to="/sellers" replace />} />
        <Route path="/seller-search" element={<SellersPage />} />
        <Route path="/sellers" element={<SellersPage />} />
        <Route path="/seller/:id" element={<SellerDetailPage />} />
        <Route path="/service/:id" element={<ServiceDetailPage />} />

        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/points" element={<PointsPage />} />
        <Route path="/point-withdraw" element={<PointWithdrawPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/mypage" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/seller-dashboard" element={<SellerDashboardRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
