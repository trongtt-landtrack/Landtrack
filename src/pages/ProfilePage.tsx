import { useState } from 'react';
import { mockUser } from '../data/mockData';
import { User, Mail, Phone, Share2, Edit2 } from 'lucide-react';
import Tabs from '../components/Tabs';

const PROFILE_TABS = [
  { id: 'info', label: 'Thông tin cá nhân' },
  { id: 'orders', label: 'Đơn hàng của tôi' },
  { id: 'booking', label: 'Danh sách booking' },
  { id: 'interested', label: 'Căn hộ đang quan tâm' },
  { id: 'history', label: 'Lịch sử tương tác' },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('info');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="relative">
          <img 
            src={mockUser.avatarUrl} 
            alt={mockUser.name} 
            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
            referrerPolicy="no-referrer"
          />
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow border border-gray-200 hover:bg-gray-50">
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        <div className="flex-grow">
          <h1 className="text-2xl font-bold text-gray-900">{mockUser.name}</h1>
          <p className="text-gray-500 flex items-center gap-2 mt-1">
            <User className="w-4 h-4" /> {mockUser.role}
          </p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {mockUser.phone}</span>
            <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {mockUser.email}</span>
          </div>
          <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            <Share2 className="w-4 h-4" /> Giới thiệu bạn bè
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={PROFILE_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'info' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h2 className="font-bold text-gray-900">Thông tin cá nhân</h2>
              <button className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-md border border-gray-200">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <form className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">Avatar</label>
                  <div className="sm:col-span-2 flex items-center gap-4">
                    <img src={mockUser.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-md object-cover border border-gray-200" referrerPolicy="no-referrer" />
                    <p className="text-xs text-gray-500">Ảnh hợp lệ: png, jpg, jpeg.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">Họ và tên *</label>
                  <div className="sm:col-span-2">
                    <input type="text" defaultValue={mockUser.name} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">Email *</label>
                  <div className="sm:col-span-2">
                    <input type="email" defaultValue={mockUser.email} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">Ngày sinh</label>
                  <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                    <select className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 focus:outline-none">
                      <option>Ngày</option>
                    </select>
                    <select className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 focus:outline-none">
                      <option>Tháng</option>
                    </select>
                    <select className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 focus:outline-none">
                      <option>Năm</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">SĐT liên hệ *</label>
                  <div className="sm:col-span-2">
                    <input type="tel" defaultValue={mockUser.phone} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">SĐT người giới thiệu</label>
                  <div className="sm:col-span-2">
                    <input type="tel" placeholder="Nhập SĐT người giới thiệu" className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {activeTab !== 'info' && (
          <div className="p-12 text-center text-gray-500">
            Chưa có dữ liệu cho phần này.
          </div>
        )}
      </div>
    </div>
  );
}
