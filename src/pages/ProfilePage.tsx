import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Share2, Edit2, Loader2, Save, Clock, Heart, ArrowRight, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import Tabs from '../components/Tabs';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { getProjectConfigs } from '../services/configService';
import { Project, UserRole } from '../types';
import ProjectCard from '../components/ProjectCard';
import UserManagement from './admin/UserManagement';

const canManageUsers = (role: UserRole, email: string) => {
  const isSuperAdminEmail = ['tranthetrong91@gmail.com', 'trongtt.landtrack@gmail.com'].includes(email);
  return isSuperAdminEmail || [
    UserRole.SUPER_ADMIN,
    UserRole.PROJECT_DIRECTOR,
    UserRole.DEPARTMENT_HEAD,
    UserRole.TEAM_LEADER,
    UserRole.PROJECT_ADMIN
  ].includes(role);
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('info');
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [favoriteProjects, setFavoriteProjects] = useState<Project[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  const PROFILE_TABS = [
    { id: 'info', label: 'Thông tin cá nhân' },
    ...(userData && canManageUsers(userData.role, userData.email) ? [{ id: 'user-management', label: 'Quản lý người dùng' }] : []),
    { id: 'interested', label: 'Dự án đang quan tâm' },
    { id: 'history', label: 'Lịch sử tương tác' },
  ];

  useEffect(() => {
    async function fetchUserData() {
      if (!auth.currentUser) return;
      
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setFormData(data);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser.uid}`);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, []);

  useEffect(() => {
    async function fetchExtras() {
      if (!auth.currentUser) return;
      if (activeTab !== 'interested' && activeTab !== 'history') return;
      
      try {
        setLoadingExtras(true);
        
        if (activeTab === 'interested') {
          // Fetch favorites
          const q = query(collection(db, 'favorites'), where('uid', '==', auth.currentUser.uid));
          const querySnapshot = await getDocs(q);
          const favoriteProjectIds = new Set<string>();
          querySnapshot.forEach((doc) => {
            favoriteProjectIds.add(doc.data().projectId);
          });

          if (favoriteProjectIds.size > 0) {
            const configs = await getProjectConfigs();
            const formattedProjects: Project[] = configs
              .filter(config => favoriteProjectIds.has(config.projectId))
              .map(config => ({
                id: config.projectId,
                name: config.name || 'Unnamed Project',
                slogan: config.slogan || '',
                developer: config.developer || '',
                location: config.location || '',
                type: config.type || '',
                status: config.status || '',
                imageUrl: config.imageUrl || `https://picsum.photos/seed/${config.projectId}/600/400`,
                sheetUrl: config.sheetUrl || '',
                isHot: config.isHot,
                isFavorite: true,
              }));
            setFavoriteProjects(formattedProjects);
          } else {
            setFavoriteProjects([]);
          }
        } else if (activeTab === 'history') {
          // Fetch history
          const q = query(
            collection(db, 'user_history'), 
            where('uid', '==', auth.currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
          const querySnapshot = await getDocs(q);
          const logs: any[] = [];
          querySnapshot.forEach((doc) => {
            logs.push({ id: doc.id, ...doc.data() });
          });
          setHistoryLogs(logs);
        }
      } catch (err) {
        console.error('Error fetching extras:', err);
      } finally {
        setLoadingExtras(false);
      }
    }

    fetchExtras();
  }, [activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(docRef, {
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender,
        workLocation: formData.workLocation,
        referrer: formData.referrer,
      });
      
      setUserData(formData);
      setIsEditing(false);
      setSuccess('Cập nhật thông tin thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Có lỗi xảy ra khi cập nhật thông tin.');
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = (projectId: string, isFavorite: boolean) => {
    if (!isFavorite) {
      setFavoriteProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center text-gray-500">
        Không tìm thấy thông tin người dùng.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="relative">
          <img 
            src={userData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=0D8ABC&color=fff`} 
            alt={userData.name} 
            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
            referrerPolicy="no-referrer"
          />
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow border border-gray-200 hover:bg-gray-50">
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        <div className="flex-grow">
          <h1 className="text-2xl font-bold text-gray-900">{userData.name}</h1>
          <p className="text-gray-500 flex items-center gap-2 mt-1">
            <User className="w-4 h-4" /> {userData.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
          </p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {userData.phone || 'Chưa cập nhật'}</span>
            <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {userData.email}</span>
          </div>
          <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            <Share2 className="w-4 h-4" /> Giới thiệu bạn bè
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={PROFILE_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 min-h-[400px]">
        {activeTab === 'info' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h2 className="font-bold text-gray-900">Thông tin cá nhân</h2>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 bg-white rounded-md border border-gray-200 transition-colors"
                  title="Chỉnh sửa"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="p-6">
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
              {success && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-md text-sm">{success}</div>}
              
              <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">Họ và tên *</label>
                  <div className="sm:col-span-2">
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name || ''} 
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${isEditing ? 'border-gray-300 bg-white' : 'border-transparent bg-gray-50'}`} 
                      readOnly={!isEditing}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">Email *</label>
                  <div className="sm:col-span-2">
                    <input 
                      type="email" 
                      value={userData.email} 
                      className="w-full px-3 py-2 border border-transparent rounded-md bg-gray-50 text-gray-500 cursor-not-allowed" 
                      readOnly 
                      title="Không thể thay đổi email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">Giới tính</label>
                  <div className="sm:col-span-2">
                    <select 
                      name="gender"
                      value={formData.gender || ''} 
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${isEditing ? 'border-gray-300 bg-white' : 'border-transparent bg-gray-50 appearance-none'}`}
                      disabled={!isEditing}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">SĐT liên hệ *</label>
                  <div className="sm:col-span-2">
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone || ''} 
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${isEditing ? 'border-gray-300 bg-white' : 'border-transparent bg-gray-50'}`} 
                      readOnly={!isEditing}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">SĐT người giới thiệu</label>
                  <div className="sm:col-span-2">
                    <input 
                      type="tel" 
                      name="referrer"
                      value={formData.referrer || ''} 
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${isEditing ? 'border-gray-300 bg-white' : 'border-transparent bg-gray-50'}`} 
                      readOnly={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 sm:text-right">Khu vực làm việc</label>
                  <div className="sm:col-span-2">
                    <input 
                      type="text" 
                      name="workLocation"
                      value={formData.workLocation || ''} 
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${isEditing ? 'border-gray-300 bg-white' : 'border-transparent bg-gray-50'}`} 
                      readOnly={!isEditing}
                      placeholder="Ví dụ: Hà Nội, TP.HCM..."
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData(userData); // Reset form
                        setError('');
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
                      disabled={saving}
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium flex items-center gap-2 transition-colors"
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Lưu thay đổi
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {activeTab === 'user-management' && (
          <div className="p-6">
            <UserManagement />
          </div>
        )}
        
        {activeTab === 'interested' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" /> Dự án bạn đang quan tâm
            </h2>
            
            {loadingExtras ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : favoriteProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteProjects.map(project => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Bạn chưa có dự án nào trong danh sách quan tâm.</p>
                <Link to="/projects" className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1">
                  Khám phá dự án ngay <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> Lịch sử tương tác gần đây
            </h2>
            
            {loadingExtras ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : historyLogs.length > 0 ? (
              <div className="space-y-4">
                {historyLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      {log.action === 'unit_interest' && log.projectId ? (
                        <Link 
                          to={`/project/${log.projectId}?tab=units&unitCode=${encodeURIComponent(log.unitCode || '')}`}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          {log.details}
                        </Link>
                      ) : log.action === 'view_project' && log.projectId ? (
                        <Link 
                          to={`/project/${log.projectId}`}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          {log.details}
                        </Link>
                      ) : (
                        <p className="text-gray-900 font-medium">{log.details}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        {log.timestamp && (
                          (log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp)).toLocaleString('vi-VN', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Chưa có lịch sử tương tác nào.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
