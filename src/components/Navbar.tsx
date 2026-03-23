import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, User, Shield, LogOut, Menu, X } from 'lucide-react';
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
              <span className="font-bold text-xl tracking-tight text-blue-900">SALEPRO<span className="text-gray-500 text-sm font-normal">.COM</span></span>
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
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <RefreshCw className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                </button>
                <Link to="/admin" className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Admin Panel">
                  <Shield className="h-5 w-5" />
                </Link>
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
        <div className="sm:hidden bg-white border-b border-gray-200 p-4 space-y-2">
          <Link to="/projects" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md">Dự án</Link>
          {user ? (
            <>
              <Link to="/profile" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md">Hồ sơ</Link>
              <Link to="/admin" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md">Admin</Link>
              <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md">Đăng xuất</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50 rounded-md">Đăng nhập</Link>
          )}
        </div>
      )}
    </nav>
  );
}
