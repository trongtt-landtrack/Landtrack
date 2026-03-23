import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Share2, LayoutGrid, Home, File, Loader2 } from 'lucide-react';
import Tabs from '../components/Tabs';
import UnitDataTab from '../components/UnitDataTab';
import DocsTab from '../components/DocsTab';
import { fetchSheetData } from '../services/googleSheets';
import { Project } from '../types';

const MAIN_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/edit?gid=0#gid=0';

const TABS = [
  { id: 'units', label: 'Quỹ căn', icon: <Home className="w-4 h-4" /> },
  { id: 'subdivisions', label: 'Phân khu', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'docs', label: 'Tài liệu', icon: <File className="w-4 h-4" /> },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('units');

  useEffect(() => {
    async function loadProject() {
      try {
        const data = await fetchSheetData<any>(MAIN_SHEET_URL);
        const foundProject = data.find((row: any, index: number) => (row.id || String(index)) === id);
        
        if (foundProject) {
          setProject({
            id: foundProject.id || id!,
            name: foundProject.name || 'Unnamed Project',
            developer: foundProject.developer || '',
            location: foundProject.location || '',
            type: foundProject.type || '',
            status: foundProject.status || '',
            imageUrl: foundProject.imageUrl || `https://picsum.photos/seed/${foundProject.id || id}/600/400`,
            sheetUrl: foundProject.sheetUrl || '',
            isHot: foundProject.isHot === 'TRUE' || foundProject.isHot === 'true',
            isFavorite: false,
          });
        } else {
          setError('Không tìm thấy dự án.');
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Không thể tải thông tin dự án.');
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
            <div>
              <h1 className="text-2xl font-bold text-blue-900 uppercase mb-2">{project.name}</h1>
              <p className="text-gray-600">Theo dõi thông tin chi tiết và bảng giá, mặt bằng, tiến độ và chính sách bán hàng dự án {project.name}.</p>
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
          {activeTab === 'units' && (
            <UnitDataTab sheetUrl={project.sheetUrl || ''} />
          )}

          {activeTab === 'docs' && (
            <DocsTab sheetUrl={project.sheetUrl || ''} />
          )}

          {activeTab === 'subdivisions' && project.subdivisions && (
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
          )}
        </div>
      </div>
    </div>
  );
}
