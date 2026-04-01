import React from 'react';
import { Lock, Eye, Building2, FileText, Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GuestWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuestWarningModal({ isOpen, onClose }: GuestWarningModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-5 border border-accent/20">
            <Lock className="w-10 h-10 text-accent" />
          </div>
          
          <h3 className="text-2xl font-display font-bold text-primary mb-2">
            Vui lòng đăng nhập
          </h3>
          <p className="text-sm text-gray-500 font-sans mb-6">
            để xem đầy đủ thông tin dự án
          </p>

          <div className="w-full text-left mb-8">
            <p className="text-sm font-display font-bold text-gray-700 mb-4 uppercase tracking-wider">
              Đặc quyền thành viên:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-accent/30 transition-colors">
                <div className="w-10 h-10 bg-primary text-accent rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Eye className="w-5 h-5" />
                </div>
                <span className="text-sm font-sans text-gray-700 font-medium">Xem đầy đủ thông tin dự án</span>
              </div>
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-accent/30 transition-colors">
                <div className="w-10 h-10 bg-primary text-accent rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-sm font-sans text-gray-700 font-medium">Truy cập bảng hàng và mặt bằng</span>
              </div>
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-accent/30 transition-colors">
                <div className="w-10 h-10 bg-primary text-accent rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-sm font-sans text-gray-700 font-medium">Tải tài liệu và chính sách bán hàng</span>
              </div>
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-accent/30 transition-colors">
                <div className="w-10 h-10 bg-primary text-accent rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bell className="w-5 h-5" />
                </div>
                <span className="text-sm font-sans text-gray-700 font-medium">Nhận thông báo về dự án, trạng thái căn hộ</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button 
              onClick={() => navigate('/login')}
              className="flex-1 bg-primary hover:bg-accent text-white font-display font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              ĐĂNG NHẬP
            </button>
            <button 
              onClick={() => navigate('/login?register=true')}
              className="flex-1 bg-white border-2 border-gray-200 hover:border-accent text-gray-700 hover:text-accent font-display font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Đăng ký
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
