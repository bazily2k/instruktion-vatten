import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import UserLogin from "./pages/UserLogin";
import AdminLogin from "./pages/AdminLogin";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { Droplets } from "lucide-react";

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Droplets className="w-12 h-12 text-[#0047FF] mx-auto mb-4 animate-pulse" />
          <p className="text-[#52525B]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!requireAdmin && user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Droplets className="w-12 h-12 text-[#0047FF] mx-auto mb-4 animate-pulse" />
          <p className="text-[#52525B]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/" 
        element={
          user ? (
            user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
          ) : (
            <UserLogin />
          )
        } 
      />
      <Route 
        path="/admin/login" 
        element={
          user ? (
            user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
          ) : (
            <AdminLogin />
          )
        } 
      />

      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
