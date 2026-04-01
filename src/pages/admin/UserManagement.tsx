import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { User, UserRole } from '../../types';
import { Loader2, UserCog, Save, X, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { fetchSheetData } from '../../services/googleSheets';
import { cn } from '../../lib/utils';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [allowedPhones, setAllowedPhones] = useState<{id: string, phone: string}[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'phones'>('users');

  const loadData = async () => {
    try {
      setLoading(true);
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(userList);

      const phonesCol = collection(db, 'allowed_phones');
      const phoneSnapshot = await getDocs(phonesCol);
      const phoneList = phoneSnapshot.docs.map(doc => ({ id: doc.id, phone: doc.data().phone }));
      setAllowedPhones(phoneList);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users/allowed_phones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncFromSheets = async () => {
    const sheetUrl = import.meta.env.VITE_GOOGLE_SHEET_SYNC_URL || "https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/edit?gid=1058648471#gid=1058648471";
    if (!sheetUrl) {
      alert("Chưa cấu hình link Google Sheet đồng bộ (VITE_GOOGLE_SHEET_SYNC_URL).");
      return;
    }
    setLoading(true);
    try {
      const data = await fetchSheetData<any>(sheetUrl);
      
      // Get existing allowed phones to avoid duplicates
      const phonesCol = collection(db, 'allowed_phones');
      const phoneSnapshot = await getDocs(phonesCol);
      const existingPhones = new Set(phoneSnapshot.docs.map(doc => doc.data().phone));

      for (const row of data) {
        // Handle different possible header names from the sheet
        const email = row.Email || row.Gmail || row.email || row.gmail;
        const role = row.Role || row['Phân quyền'] || row.role;
        const phone = row['SĐT liên hệ'] || row.Phone || row.phone || row['Số điện thoại'];

        // Sync Role
        if (email && role) {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(async (userDoc) => {
            const userRef = doc(db, 'users', userDoc.id);
            await updateDoc(userRef, { role: role });
          });
        }

        // Sync Allowed Phone
        if (phone) {
          const cleanPhone = phone.toString().replace(/\s+/g, '');
          const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
          
          if (phoneRegex.test(cleanPhone) && !existingPhones.has(cleanPhone)) {
            const phoneRef = doc(collection(db, 'allowed_phones'));
            await setDoc(phoneRef, { phone: cleanPhone });
            existingPhones.add(cleanPhone); // Add to set to prevent duplicate inserts in the same run
          }
        }
      }
      await loadData();
      alert('Đồng bộ từ Google Sheet thành công!');
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Có lỗi xảy ra khi đồng bộ từ Google Sheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToSheets = async () => {
    if (!confirm('Bạn có chắc chắn muốn đồng bộ toàn bộ danh sách người dùng lên Google Sheets? Dữ liệu cũ trên Sheet sẽ bị ghi đè.')) return;
    
    setLoading(true);
    try {
      const payload = users.map(u => ({
        email: u.email || '',
        name: u.name || '',
        phone: u.phone || '',
        referrer: u.referrer || '',
        workLocation: u.workLocation || '',
        role: u.role || 'user',
        createdAt: u.createdAt || new Date().toISOString()
      }));

      // Use the configurable GAS URL
      const gasUrl = import.meta.env.VITE_USER_SYNC_GAS_URL || 'https://script.google.com/macros/s/AKfycbwwdfjr62BudOsfgER93I5673lVCtNr24InQkUwExzA8YNaHxaUohWGGqDyUzqPyAKf/exec';
      
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      alert('Đã gửi yêu cầu đồng bộ thành công!');
    } catch (err) {
      console.error('Lỗi đồng bộ:', err);
      alert('Có lỗi xảy ra khi đồng bộ.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    if (!editRole) return;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: editRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: editRole } : u));
      setEditingUserId(null);
      setEditRole(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newPhone.replace(/\s+/g, '');
    if (!cleanPhone) return;
    
    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      alert('Số điện thoại không hợp lệ. Vui lòng nhập SĐT Việt Nam.');
      return;
    }

    setLoading(true);
    try {
      const phoneRef = doc(collection(db, 'allowed_phones'));
      await setDoc(phoneRef, { phone: cleanPhone });
      setNewPhone('');
      await loadData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'allowed_phones');
      setLoading(false);
    }
  };

  const handleDeletePhone = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa số điện thoại này?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'allowed_phones', id));
      await loadData();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `allowed_phones/${id}`);
      setLoading(false);
    }
  };

  const currentUser = users.find(u => u.id === auth.currentUser?.uid);
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary font-display">Quản lý hệ thống</h2>
        {isSuperAdmin && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSyncToSheets}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-50 font-display"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              ĐỒNG BỘ LÊN SHEETS
            </button>
            <button 
              onClick={handleSyncFromSheets}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-accent transition-all disabled:opacity-50 font-display"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              ĐỒNG BỘ TỪ SHEETS
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={cn("pb-2 px-1 text-sm font-bold font-display border-b-2 transition-colors", activeTab === 'users' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700")}
        >
          TÀI KHOẢN NGƯỜI DÙNG
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('phones')}
            className={cn("pb-2 px-1 text-sm font-bold font-display border-b-2 transition-colors", activeTab === 'phones' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            SĐT ĐƯỢC PHÉP ĐĂNG KÝ
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activeTab === 'users' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Tên</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Vai trò</th>
                {isSuperAdmin && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Hành động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-sans">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    {editingUserId === user.id && isSuperAdmin ? (
                      <select 
                        value={editRole || user.role}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="p-1 border rounded font-sans"
                      >
                        {Object.values(UserRole).map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary font-display">
                        {user.role}
                      </span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 text-sm">
                      {editingUserId === user.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateRole(user.id)} className="text-green-600 hover:text-green-800"><Save className="w-4 h-4" /></button>
                          <button onClick={() => { setEditingUserId(null); setEditRole(null); }} className="text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingUserId(user.id); setEditRole(user.role); }} className="text-primary hover:text-accent"><UserCog className="w-4 h-4" /></button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleAddPhone} className="flex gap-4">
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Nhập số điện thoại mới..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent font-sans"
              required
            />
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-accent transition-colors font-display">
              <Plus className="w-4 h-4" /> Thêm SĐT
            </button>
          </form>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Số điện thoại</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display w-24">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allowedPhones.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 font-sans">{item.phone}</td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => handleDeletePhone(item.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {allowedPhones.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-500 font-sans">
                      Chưa có số điện thoại nào trong danh sách.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
