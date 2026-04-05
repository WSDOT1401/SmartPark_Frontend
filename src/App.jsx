import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import AvailabilityPage from "./pages/AvailabilityPage";
import EditPage from "./pages/EditPage";
import CardDetailPage from "./pages/CardDetailPage";
import AddCardPage from "./pages/AddCardPage";
import HistoryPage from "./pages/HistoryPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminParkingCreatorPage from "./pages/AdminParkingCreatorPage";
import AdminParkingPage from "./pages/AdminParkingPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — wrapped in shared Layout (navbar) */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/availability" element={<AvailabilityPage />} />
            <Route path="/edit" element={<EditPage />} />
            <Route path="/edit/card/:cardId" element={<CardDetailPage />} />
            <Route path="/edit/add-card" element={<AddCardPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/parking" element={<AdminParkingPage />} />
            <Route path="/admin/parking-creator" element={<AdminParkingCreatorPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
