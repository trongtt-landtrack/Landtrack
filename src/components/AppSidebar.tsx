import React from 'react';
import { User, LayoutDashboard, LogOut, LayoutGrid } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface AppSidebarProps {
  user: any;
}

export default function AppSidebar({ user }: AppSidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2">
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
          <span className="font-display font-black text-2xl tracking-tight logo-text-gradient">LANDTRACK</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <Link to="/projects" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors">
          <LayoutGrid className="h-5 w-5" />
          <span className="font-medium">Dự án</span>
        </Link>
        <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors">
          <User className="h-5 w-5" />
          <span className="font-medium">Hồ sơ</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-200">
        {user ? (
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        ) : (
          <Link to="/login" className="flex items-center gap-3 w-full px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <User className="h-5 w-5" />
            <span className="font-medium">Đăng nhập</span>
          </Link>
        )}
      </div>
    </div>
  );
}
