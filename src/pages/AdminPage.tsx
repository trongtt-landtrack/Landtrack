import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Plus, Trash2, Search, Phone, Loader2, ArrowLeft, Edit2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { updateDoc } from 'firebase/firestore';

interface AllowedPhone {
  id: string;
  phone: string;
  position?: string;
  createdAt: string;
}

interface AdminPageProps {
  standalone?: boolean;
}

export default function AdminPage({ standalone = true }: AdminPageProps) {
  const [phones, setPhones] = useState<AllowedPhone[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editPosition, setEditPosition] = useState('');

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

  const handleUpdatePhone = async (id: string) => {
    if (!editPhone.trim()) return;
    
    try {
      let normalized = editPhone.replace(/\D/g, '');
      if (normalized.startsWith('84')) {
        normalized = '0' + normalized.substring(2);
      } else if (!normalized.startsWith('0')) {
        normalized = '0' + normalized;
      }

      const phoneRef = doc(db, 'allowed_phones', id);
      await updateDoc(phoneRef, {
        phone: normalized,
        position: editPosition.trim() || 'Thành viên'
      });
      
      setEditingId(null);
      fetchPhones();
      alert('Cập nhật thành công!');
    } catch (error) {
      console.error('Error updating phone:', error);
      alert('Có lỗi xảy ra khi cập nhật.');
    }
  };

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    setAdding(true);
    try {
      let normalized = newPhone.replace(/\D/g, '');
      if (normalized.startsWith('84')) {
        normalized = '0' + normalized.substring(2);
      } else if (!normalized.startsWith('0')) {
        normalized = '0' + normalized;
      }

      const q = query(collection(db, 'allowed_phones'), where('phone', '==', normalized));
      const existingSnapshot = await getDocs(q);
      
      if (!existingSnapshot.empty) {
        alert('Số điện thoại này đã có trong danh sách!');
        setAdding(false);
        return;
      }

      await addDoc(collection(db, 'allowed_phones'), {
        phone: normalized,
        position: newPosition.trim() || 'Thành viên',
        createdAt: new Date().toISOString()
      });
      setNewPhone('');
      setNewPosition('');
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
        <form onSubmit={handleAddPhone} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
              <input 
                type="tel"
                placeholder="Số điện thoại (VD: 0938...)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
              />
            </div>
            <div className="relative flex-1">
              <Shield className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Chức danh (VD: Quản lý, Giám đốc...)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={adding}
              className="px-6 py-3 bg-accent text-white rounded-xl font-display font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 min-w-[120px]"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Thêm
            </button>
          </div>
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
              {filteredPhones.map((p, idx) => (
                <motion.div 
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group ${!standalone ? 'py-3' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-accent/5'}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`rounded-full bg-accent/10 flex items-center justify-center text-accent ${standalone ? 'w-10 h-10' : 'w-8 h-8'}`}>
                      <Phone className={`${standalone ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    </div>
                    
                    {editingId === p.id ? (
                      <div className="flex flex-col sm:flex-row gap-2 flex-1 mr-4">
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-accent/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                          placeholder="Số điện thoại"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editPosition}
                          onChange={(e) => setEditPosition(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-accent/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                          placeholder="Chức danh"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-display font-bold text-gray-900">{p.phone}</p>
                        <div className="flex items-center gap-2">
                          {p.position && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/5 px-1.5 py-0.5 rounded">
                              {p.position}
                            </span>
                          )}
                          <p className="text-[10px] text-gray-400">
                            {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {editingId === p.id ? (
                      <>
                        <button 
                          onClick={() => handleUpdatePhone(p.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Lưu"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Hủy"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            setEditingId(p.id);
                            setEditPhone(p.phone);
                            setEditPosition(p.position || '');
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePhone(p.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
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
          <div className="w-9" />
        </div>
      </div>
      {content}
    </div>
  );
}
