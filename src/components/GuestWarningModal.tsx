import React from 'react';
import { Lock, Eye, Building2, FileText, Bell, X, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface GuestWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuestWarningModal({ isOpen, onClose }: GuestWarningModalProps) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden relative border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 sm:p-8 flex flex-col items-center">
              {/* Lock Icon */}
              <div className="mb-5">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center rotate-3 border border-accent/20">
                  <Lock className="w-7 h-7 text-accent" fill="currentColor" fillOpacity={0.1} />
                </div>
              </div>
              
              <h3 className="text-lg sm:text-xl font-display font-black text-primary text-center mb-1.5 leading-tight">
                Vui lòng đăng nhập để xem đầy đủ thông tin
              </h3>
              <p className="text-xs text-gray-400 font-sans text-center mb-6">
                (Nếu bạn chưa có tài khoản vui lòng đăng ký)
              </p>

              <div className="w-full text-left mb-6">
                <p className="text-sm font-display font-bold text-primary mb-3">
                  Khi đăng nhập, bạn sẽ được:
                </p>
                <div className="space-y-2.5">
                  {[
                    { icon: Eye, text: "Xem đầy đủ thông tin dự án" },
                    { icon: Building2, text: "Truy cập bảng hàng và mặt bằng" },
                    { icon: FileText, text: "Tải tài liệu và chính sách bán hàng" },
                    { icon: Bell, text: "Nhận thông báo về dự án, trạng thái căn hộ" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-accent/30 transition-all group">
                      <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm group-hover:bg-accent transition-colors">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs sm:text-[13px] font-sans text-gray-700 font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-row gap-3 w-full">
                <button 
                  onClick={() => navigate('/login')}
                  className="flex-[1.2] bg-primary hover:bg-primary/90 text-white font-display font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] text-xs sm:text-sm uppercase tracking-wider"
                >
                  <LogIn className="w-4 h-4" />
                  ĐĂNG NHẬP
                </button>
                <button 
                  onClick={() => navigate('/login?register=true')}
                  className="flex-1 bg-white border-2 border-gray-100 hover:border-accent text-gray-500 hover:text-accent font-display font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-xs sm:text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Đăng ký
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
