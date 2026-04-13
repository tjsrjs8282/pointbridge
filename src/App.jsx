import './App.css'
import './styles/components.css'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import ChatPage from './pages/ChatPage'
import HomePage from './pages/HomePage'
import OrdersPage from './pages/OrdersPage'
import PointsPage from './pages/PointsPage'
import ProfilePage from './pages/ProfilePage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import SellerDetailPage from './pages/SellerDetailPage'
import SellersPage from './pages/SellersPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout isSellerMode />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<Navigate to="/sellers" replace />} />
        <Route path="/sellers" element={<SellersPage />} />
        <Route path="/seller/:id" element={<SellerDetailPage />} />

        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/points" element={<PointsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/seller-dashboard" element={<SellerDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
