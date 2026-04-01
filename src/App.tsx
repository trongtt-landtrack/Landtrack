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
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Public Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            } />
            <Route path="projects" element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            } />
            <Route path="projects/:id" element={
              <ProtectedRoute>
                <ProjectDetailPage />
              </ProtectedRoute>
            } />
            <Route path="profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
