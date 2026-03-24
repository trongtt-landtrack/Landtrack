import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Share2, LayoutGrid, Home, File, Loader2, BarChart3, ExternalLink, MapPin } from 'lucide-react';
import Tabs from '../components/Tabs';
import UnitDataTab from '../components/UnitDataTab';
import DocsTab from '../components/DocsTab';
import DashboardTab from '../components/DashboardTab';
import { getProjectConfig } from '../services/configService';
import { Project, UserRole } from '../types';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { useUserRole } from '../hooks/useUserRole';

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: <BarChart3 className="w-4 h-4" /> },
  // { id: 'subdivisions', label: 'Phân khu', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'units', label: 'Quỹ căn', icon: <Home className="w-4 h-4" /> },
  { id: 'docs', label: 'Tài liệu', icon: <File className="w-4 h-4" /> },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { role, loading: roleLoading } = useUserRole();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    
    if (tab) setActiveTab(tab);
  }, [location.search]);

  const handleNavigate = (tab: string, newFilters: Record<string, string>) => {
    setActiveTab(tab);
    setFilters(newFilters);
  };

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        const config = await getProjectConfig(id!);
        
        if (!config) {
          setError('Không tìm thấy dự án.');
          setLoading(false);
          return;
        }

        const projectData = {
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
          isFavorite: false,
          headerRow: config.headerRow,
          dataStartRow: config.dataStartRow,
          dataEndRow: config.dataEndRow,
          requiredFields: config.requiredFields,
          statsFields: config.statsFields,
          filterFields: config.filterFields,
          docStatsField: config.docStatsField,
          docLinkField: config.docLinkField,
        };

        setProject(projectData);

      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Không thể tải thông tin dự án.');
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id]);

  if (loading || roleLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (role === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tài khoản của bạn đang chờ duyệt.</h2>
        <p className="text-gray-600">Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || 'Không tìm thấy dự án'}</h2>
        <Link to="/" className="text-blue-600 hover:underline">Quay lại danh sách dự án</Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-900 font-medium">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Chi tiết dự án</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 uppercase">{project.name}</h1>
                {project.sheetUrl && (
                  <a href={project.sheetUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-600 transition-colors">
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
              
              {project.location && (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>{project.location}</span>
                </div>
              )}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors">
              Chia sẻ <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-lg shadow-sm border-x border-t border-gray-200 px-6 pt-2 overflow-x-auto scrollbar-hide">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow-sm border-x border-b border-gray-200 p-6 min-h-[500px]">
          {activeTab === 'overview' && (
            <DashboardTab 
              sheetUrl={project.sheetUrl || ''} 
              headerRow={project.headerRow}
              dataStartRow={project.dataStartRow}
              dataEndRow={project.dataEndRow}
              requiredFields={project.requiredFields}
              statsFields={project.statsFields}
              onNavigate={handleNavigate} 
            />
          )}

          {activeTab === 'units' && (
            <UnitDataTab 
              sheetUrl={project.sheetUrl || ''} 
              headerRow={project.headerRow}
              dataStartRow={project.dataStartRow}
              dataEndRow={project.dataEndRow}
              requiredFields={project.requiredFields}
              filterFields={project.filterFields}
              initialFilters={filters} 
              initialSearchTerm={new URLSearchParams(location.search).get('unitCode') || ''}
              projectName={project.name}
              projectId={project.id}
            />
          )}

          {activeTab === 'docs' && (
            <DocsTab 
              sheetUrl={project.sheetUrl || ''} 
              headerRow={project.headerRow}
              dataStartRow={project.dataStartRow}
              dataEndRow={project.dataEndRow}
              requiredFields={project.requiredFields}
              docStatsField={project.docStatsField}
              docLinkField={project.docLinkField}
            />
          )}

          {/* {activeTab === 'subdivisions' && project.subdivisions && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {project.subdivisions.map(sub => (
                <div key={sub.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">PHÂN KHU</span>
                  </div>
                  <div className="px-4 py-2">
                    <h3 className="text-xl font-bold text-blue-900">{sub.code}</h3>
                  </div>
                  <div className="h-48 relative">
                    <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <h4 className="text-white font-bold text-2xl uppercase drop-shadow-lg">{sub.name}</h4>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded flex items-center justify-center text-white">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">TỔNG CĂN HỘ</p>
                      <p className="text-lg font-bold text-gray-900">{sub.totalUnits}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}
