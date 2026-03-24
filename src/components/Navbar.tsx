import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, User, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                S
              </div>
              <span className="font-bold text-xl tracking-tight text-blue-900">LANDTRACK</span>
            </Link>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              <Link to="/projects" className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium uppercase">
                Dự án
              </Link>
            </div>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {user ? (
              <>
                <button 
                  className="p-2 text-gray-400 hover:text-gray-500"
                  onClick={() => window.location.reload()}
                  title="Tải lại trang"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
                <Link to="/profile" className="relative">
                  <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
                    <User className="h-5 w-5" />
                  </div>
                </Link>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600" title="Đăng xuất">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800">
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
            <Link to="/projects" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-4 text-lg font-medium text-gray-900 border-b border-gray-100">
              <LayoutDashboard className="h-5 w-5 text-blue-600" />
              Dự án
            </Link>
            {user ? (
              <>
                <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-4 text-lg font-medium text-gray-900 border-b border-gray-100">
                  <User className="h-5 w-5 text-blue-600" />
                  Hồ sơ cá nhân
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-4 py-4 text-lg font-medium text-red-600">
                  <LogOut className="h-5 w-5" />
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-4 text-lg font-medium text-blue-600">
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
