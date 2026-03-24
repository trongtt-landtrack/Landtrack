import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, UserRole } from '../../types';
import { Loader2, UserCog, Save, X, RefreshCw } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { fetchSheetData } from '../../services/googleSheets';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole | null>(null);

  const loadUsers = async () => {
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
    loadUsers();
  }, []);

  const handleSyncFromSheets = async () => {
    setLoading(true);
    try {
      const data = await fetchSheetData<any>('https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/edit?gid=1058648471#gid=1058648471');
      for (const row of data) {
        const email = row.Email;
        const role = row.Role;
        if (email && role) {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(async (userDoc) => {
            const userRef = doc(db, 'users', userDoc.id);
            await updateDoc(userRef, { role: role });
          });
        }
      }
      await loadUsers();
    } catch (err) {
      console.error('Sync failed:', err);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h2>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Tên</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    {editingUserId === user.id ? (
                      <select 
                        value={editRole || user.role}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="p-1 border rounded"
                      >
                        {Object.values(UserRole).map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {editingUserId === user.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateRole(user.id)} className="text-green-600 hover:text-green-800"><Save className="w-4 h-4" /></button>
                        <button onClick={() => { setEditingUserId(null); setEditRole(null); }} className="text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingUserId(user.id); setEditRole(user.role); }} className="text-blue-600 hover:text-blue-800"><UserCog className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
