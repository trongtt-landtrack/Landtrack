import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Plus, Trash2, Search, Phone, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface AllowedPhone {
  id: string;
  phone: string;
  createdAt: string;
}

interface AdminPageProps {
  standalone?: boolean;
}

export default function AdminPage({ standalone = true }: AdminPageProps) {
  const [phones, setPhones] = useState<AllowedPhone[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPhones();
  }, []);

  const fetchPhones = async () => {
    try {
      const q = query(collection(db, 'allowed_phones'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const phoneList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AllowedPhone[];
      setPhones(phoneList);
    } catch (error) {
      console.error('Error fetching phones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    setAdding(true);
    try {
      // Normalize phone: remove non-digits, ensure starts with 0
      let normalized = newPhone.replace(/\D/g, '');
      if (normalized.startsWith('84')) {
        normalized = '0' + normalized.substring(2);
      } else if (!normalized.startsWith('0')) {
        normalized = '0' + normalized;
      }

      // Check if already exists in database (not just local state)
      const q = query(collection(db, 'allowed_phones'), where('phone', '==', normalized));
      const existingSnapshot = await getDocs(q);
      
      if (!existingSnapshot.empty) {
        alert('Số điện thoại này đã có trong danh sách!');
        setAdding(false);
        return;
      }

      await addDoc(collection(db, 'allowed_phones'), {
        phone: normalized,
        createdAt: new Date().toISOString()
      });
      setNewPhone('');
      fetchPhones();
    } catch (error) {
      console.error('Error adding phone:', error);
      alert('Có lỗi xảy ra khi thêm số điện thoại.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePhone = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa số điện thoại này khỏi danh sách cho phép?')) return;

    try {
      await deleteDoc(doc(db, 'allowed_phones', id));
      setPhones(phones.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting phone:', error);
      alert('Có lỗi xảy ra khi xóa số điện thoại.');
    }
  };

  const handleCleanDuplicates = async () => {
    if (!window.confirm('Bạn có muốn tự động xóa các số điện thoại trùng lặp trong cơ sở dữ liệu?')) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, 'allowed_phones'));
      const querySnapshot = await getDocs(q);
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      querySnapshot.docs.forEach(doc => {
        const phone = doc.data().phone;
        if (seen.has(phone)) {
          duplicates.push(doc.id);
        } else {
          seen.add(phone);
        }
      });

      if (duplicates.length === 0) {
        alert('Không tìm thấy số điện thoại trùng lặp.');
      } else {
        for (const id of duplicates) {
          await deleteDoc(doc(db, 'allowed_phones', id));
        }
        alert(`Đã xóa ${duplicates.length} số điện thoại trùng lặp.`);
        fetchPhones();
      }
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      alert('Có lỗi xảy ra khi dọn dẹp trùng lặp.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPhones = phones.filter(p => 
    p.phone.includes(searchTerm)
  );

  const content = (
    <div className={`${standalone ? 'max-w-4xl mx-auto px-4 py-8' : 'space-y-6'}`}>
      {/* Add New Phone Card */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${standalone ? 'mb-8' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent" />
            Thêm số điện thoại mới
          </h2>
          <button 
            onClick={handleCleanDuplicates}
            className="text-xs text-gray-500 hover:text-accent transition-colors underline"
          >
            Dọn dẹp trùng lặp
          </button>
        </div>
        <form onSubmit={handleAddPhone} className="flex gap-3">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
            <input 
              type="tel"
              placeholder="Nhập số điện thoại (VD: 0938...)"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit"
            disabled={adding}
            className="px-6 py-3 bg-accent text-white rounded-xl font-display font-bold text-sm hover:bg-accent-dark transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent/20"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Thêm
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-500 italic">
          * SĐT sẽ được tự động chuẩn hóa về định dạng bắt đầu bằng số 0.
        </p>
      </div>

      {/* List Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className={`p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 ${!standalone ? 'py-4' : ''}`}>
          <h2 className="font-display font-bold text-gray-900">Danh sách đã cấp phép ({phones.length})</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Tìm kiếm SĐT..."
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className={`${standalone ? 'p-12' : 'p-8'} flex flex-col items-center justify-center text-gray-400`}>
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Đang tải danh sách...</p>
            </div>
          ) : filteredPhones.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredPhones.map((p) => (
                <motion.div 
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group ${!standalone ? 'py-3' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full bg-accent/10 flex items-center justify-center text-accent ${standalone ? 'w-10 h-10' : 'w-8 h-8'}`}>
                      <Phone className={`${standalone ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    </div>
                    <div>
                      <p className="font-display font-bold text-gray-900">{p.phone}</p>
                      <p className="text-xs text-gray-500">
                        Thêm ngày: {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeletePhone(p.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className={`${standalone ? 'p-12' : 'p-8'} text-center text-gray-400`}>
              <p className="text-sm">Không tìm thấy số điện thoại nào.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!standalone) return content;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <h1 className="font-display font-bold text-lg text-gray-900">Quản lý SĐT cho phép</h1>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </div>
      {content}
    </div>
  );
}
