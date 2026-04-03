import React, { useEffect, Suspense, lazy } from 'react';
import { useNavigate, BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import { getProjectConfigs } from './services/configService';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import InstallPWA from './components/InstallPWA';

const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

function Layout() {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleGlobalClick = (e: React.MouseEvent) => {
    // If guest and NOT loading, redirect to login on any click
    if (!authLoading && userRole === 'guest') {
      // Check if the click is NOT on the login link itself (though LoginPage doesn't use Layout)
      // We use navigate to ensure a smooth transition
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] font-sans" onClickCapture={handleGlobalClick}>
      <Navbar />
      <main className="pb-20 sm:pb-0">
        <Suspense fallback={<div className="p-8 text-center">Đang tải...</div>}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
      <InstallPWA />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Pre-fetch project configs
    getProjectConfigs().catch(err => console.error('Error pre-fetching configs:', err));
  }, []);

  return (
    <AuthProvider>
      <PermissionsProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              {/* Public Routes */}
              <Route path="/" element={<Layout />}>
                <Route index element={
                  <ProtectedRoute actionKey="project:view">
                    <ProjectsPage />
                  </ProtectedRoute>
                } />
                <Route path="projects" element={
                  <ProtectedRoute actionKey="project:view">
                    <ProjectsPage />
                  </ProtectedRoute>
                } />
                <Route path="projects/:id" element={
                  <ProtectedRoute actionKey="project_detail:view">
                    <ProjectDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="profile" element={
                  <ProtectedRoute actionKey="nav:profile">
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="admin" element={
                  <ProtectedRoute actionKey="nav:admin">
                    <AdminPage />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </Router>
        </ThemeProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}
