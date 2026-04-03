import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { auth } from '../firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  actionKey?: string;
}

export default function ProtectedRoute({ children, actionKey }: ProtectedRouteProps) {
  const { loading: authLoading, userStatus, userRole } = useAuth();
  const { loading: permLoading, hasPermission } = usePermissions();

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is banned, redirect to a banned page or login
  if (userStatus === 'banned') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tài khoản bị khóa</h2>
          <p className="text-gray-600 mb-6">Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.</p>
          <a href="/login" className="inline-block bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-accent transition-colors">
            Quay lại đăng nhập
          </a>
        </div>
      </div>
    );
  }

  if (actionKey && !hasPermission(actionKey)) {
    // If it's a guest trying to access a protected route, send to login
    if (userRole === 'guest') {
      return <Navigate to="/login" replace />;
    }
    
    // Otherwise, show access denied instead of redirecting to / (which causes loops)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Truy cập bị từ chối</h2>
          <p className="text-gray-600 mb-6">Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Quay lại trang chủ
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
