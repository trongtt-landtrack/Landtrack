import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { getProjectConfigs } from './services/configService';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';

function Layout() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] font-sans">
      <Navbar />
      <main>
        <Outlet />
      </main>
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
