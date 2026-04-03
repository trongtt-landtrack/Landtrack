import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, User, LayoutDashboard, LogOut, Menu, X, Users, Database, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { RequirePermission } from '../contexts/PermissionsContext';

export default function Navbar() {
  const { user, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>(() => {
    return localStorage.getItem('last_sync_time') || '--:--:--';
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleUpdateSuccess = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const fullStr = `${dateStr} ${timeStr}`;
      
      setLastUpdate(fullStr);
      localStorage.setItem('last_sync_time', fullStr);
      setIsRefreshing(false);
      
      // Hiển thị thông báo thành công tạm thời
      setSuccessMsg('Cập nhật thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
    };

    window.addEventListener('sync-success', handleUpdateSuccess);
    return () => {
      window.removeEventListener('sync-success', handleUpdateSuccess);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Gửi sự kiện yêu cầu các trang làm mới dữ liệu
    window.dispatchEvent(new CustomEvent('trigger-refresh'));
    
    // Timeout phòng trường hợp trang không phản hồi
    setTimeout(() => setIsRefreshing(false), 10000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
    navigate('/login');
  };

  return (
    <nav className="bg-[var(--bg-app)] border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="metallic-border w-10 h-10">
                <div className="metallic-border-inner">
                  <img 
                    src="https://github.com/trongtt-landtrack/Anh-Logo/blob/main/xql6xl4b.png?raw=true" 
                    alt="LandTrack Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <span className="font-display font-black text-[23px] tracking-normal logo-text-gradient">
                LANDTRACK
              </span>
            </Link>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              <RequirePermission actionKey="nav:projects">
                <Link to="/projects" className="border-accent text-primary inline-flex items-center px-1 pt-1 border-b-2 text-sm font-display font-bold uppercase transition-colors">
                  Dự án
                </Link>
              </RequirePermission>
              <RequirePermission actionKey="nav:admin">
                <Link to="/admin" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-display font-bold uppercase transition-colors">
                  Quản trị
                </Link>
              </RequirePermission>
            </div>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {userRole !== 'guest' && (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                  <span className="text-[10px] font-display font-bold text-gray-400 uppercase tracking-tight">
                    Cập nhật: {lastUpdate}
                  </span>
                  <button 
                    className={`p-1.5 rounded-full transition-all ${isRefreshing ? 'text-accent bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-accent/10'}`}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    title="Cập nhật dữ liệu mới"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {successMsg && (
                  <span className="text-[9px] text-green-600 font-display font-bold uppercase mt-0.5 mr-2 animate-pulse">
                    {successMsg}
                  </span>
                )}
              </div>
            )}
            {userRole !== 'guest' ? (
              <>
                <RequirePermission actionKey="nav:profile">
                  <Link to="/profile" className="relative">
                    <div className="h-8 w-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                  </Link>
                </RequirePermission>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Đăng xuất">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm font-display font-bold text-accent hover:text-yellow-600 transition-colors">
                Đăng nhập
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center sm:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400 hover:text-gray-500">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-[100] bg-white pt-16 animate-in slide-in-from-right duration-300">
          <div className="p-4 space-y-4">
            {userRole !== 'guest' && (
              <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-display font-bold text-gray-400 uppercase tracking-tight">
                    Cập nhật: {lastUpdate}
                  </span>
                  {successMsg && (
                    <span className="text-[9px] text-green-600 font-display font-bold uppercase mt-0.5 animate-pulse">
                      {successMsg}
                    </span>
                  )}
                </div>
                <button 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-display font-bold transition-all ${isRefreshing ? 'text-accent bg-accent/10' : 'text-gray-600 bg-gray-100 hover:text-accent hover:bg-accent/10'}`}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            )}
            <RequirePermission actionKey="nav:projects">
              <Link to="/projects" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-4 text-lg font-display font-bold text-primary border-b border-gray-100">
                <LayoutDashboard className="h-5 w-5 text-accent" />
                Dự án
              </Link>
            </RequirePermission>
            <RequirePermission actionKey="nav:admin">
              <Link to="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-4 text-lg font-display font-bold text-primary border-b border-gray-100">
                <Shield className="h-5 w-5 text-accent" />
                Quản trị
              </Link>
            </RequirePermission>
            {userRole !== 'guest' ? (
              <>
                <RequirePermission actionKey="nav:profile">
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-4 text-lg font-display font-bold text-primary border-b border-gray-100">
                    <User className="h-5 w-5 text-accent" />
                    Hồ sơ cá nhân
                  </Link>
                </RequirePermission>
                <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-4 py-4 text-lg font-display font-bold text-red-600">
                  <LogOut className="h-5 w-5" />
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-4 text-lg font-display font-bold text-accent">
                Đăng nhập
              </Link>
            )}
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </nav>
  );
}
