import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { User, UserRole } from '../../types';
import { Loader2, UserCog, Save, X, RefreshCw, Plus, Trash2, AlertCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { fetchSheetData } from '../../services/googleSheets';
import { cn } from '../../lib/utils';
import { usePermissions } from '../../contexts/PermissionsContext';

export default function UserManagement() {
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(userList);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
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
      
      for (const row of data) {
        // Handle different possible header names from the sheet
        const email = row.Email || row.Gmail || row.email || row.gmail;
        const role = row.Role || row['Phân quyền'] || row.role;

        // Sync Role
        if (email && role) {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(async (userDoc) => {
            const userRef = doc(db, 'users', userDoc.id);
            await updateDoc(userRef, { role: role });
          });
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

  const handleUpdateRoleAndStatus = async (userId: string) => {
    if (!editRole && !editStatus) return;
    if (userId === auth.currentUser?.uid) {
      alert('Bạn không thể tự thay đổi quyền hoặc trạng thái của chính mình.');
      setEditingUserId(null);
      return;
    }
    try {
      const userRef = doc(db, 'users', userId);
      const updates: any = {};
      if (editRole) updates.role = editRole;
      if (editStatus) updates.status = editStatus;

      await updateDoc(userRef, updates);
      setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
      setEditingUserId(null);
      setEditRole(null);
      setEditStatus(null);
      alert('Cập nhật thành công!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === auth.currentUser?.uid) {
      alert('Bạn không thể xóa tài khoản của chính mình.');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản của "${userName}"? Hành động này không thể hoàn tác.`)) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.id !== userId));
      alert('Đã xóa người dùng thành công!');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    } finally {
      setLoading(false);
    }
  };

  const currentUser = users.find(u => u.id === auth.currentUser?.uid);
  const canEdit = hasPermission('user:edit');
  const canDelete = hasPermission('user:delete');

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary font-display">Quản lý hệ thống</h2>
        {hasPermission('admin:system_data:sync') && (
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
        <div className="pb-2 px-1 text-sm font-bold font-display border-b-2 border-primary text-primary">
          TÀI KHOẢN NGƯỜI DÙNG
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Tên</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Vai trò</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Trạng thái</th>
                {(canEdit || canDelete) && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase font-display">Hành động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user, idx) => (
                <tr key={user.id} className={cn("hover:bg-gray-50", idx % 2 !== 0 && "bg-accent/5")}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-sans">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    {editingUserId === user.id && canEdit ? (
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
                  <td className="px-6 py-4 text-sm">
                    {editingUserId === user.id && canEdit ? (
                      <select 
                        value={editStatus || user.status || 'active'}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="p-1 border rounded font-sans"
                      >
                        <option value="active">Hoạt động</option>
                        <option value="banned">Bị khóa (Banned)</option>
                      </select>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-display",
                        user.status === 'banned' ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                      )}>
                        {user.status === 'banned' ? 'Bị khóa' : 'Hoạt động'}
                      </span>
                    )}
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-6 py-4 text-sm">
                      {editingUserId === user.id ? (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleUpdateRoleAndStatus(user.id)} 
                            className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                            title="Lưu"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setEditingUserId(null); setEditRole(null); setEditStatus(null); }} 
                            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 rounded transition-colors"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          {canEdit && (
                            <button 
                              onClick={() => { setEditingUserId(user.id); setEditRole(user.role); setEditStatus(user.status || 'active'); }} 
                              className="text-primary hover:text-accent p-1 hover:bg-primary/5 rounded transition-colors"
                              title="Sửa"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && user.id !== auth.currentUser?.uid && (
                            <button 
                              onClick={() => handleDeleteUser(user.id, user.name || '')} 
                              className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                              title="Xóa người dùng"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
