import { useState, useEffect } from 'react';
import { fetchSheetData } from '../../services/googleSheets';
import { Project } from '../../types';
import { Loader2, CheckCircle2, XCircle, ExternalLink, RefreshCw } from 'lucide-react';

const MAIN_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/edit?gid=0#gid=0';

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchSheetData<any>(MAIN_SHEET_URL);
      const formattedProjects: Project[] = data.map((row: any, index: number) => ({
        id: row.id || String(index),
        name: row.name || 'Unnamed Project',
        developer: row.developer || '',
        location: row.location || '',
        type: row.type || '',
        status: row.status || '',
        imageUrl: row.imageUrl || '',
        sheetUrl: row.sheetUrl || '',
        isHot: row.isHot === 'TRUE' || row.isHot === 'true',
        isFavorite: false,
      })).filter(p => p.name !== 'Unnamed Project');
      
      setProjects(formattedProjects);
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Không thể tải danh sách dự án từ Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Trạng thái đồng bộ</h2>
          <p className="text-sm text-gray-500 mt-1">
            {lastSync ? `Cập nhật lần cuối: ${lastSync.toLocaleTimeString()} ${lastSync.toLocaleDateString()}` : 'Chưa đồng bộ'}
          </p>
        </div>
        <button
          onClick={loadProjects}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Đồng bộ ngay
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Danh sách dự án đang quản lý ({projects.length})</h3>
        </div>
        
        {loading && !projects.length ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 bg-red-50">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên dự án</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nguồn dữ liệu (Sheet)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Kết nối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects.map((project) => {
                  const hasValidSheet = project.sheetUrl && project.sheetUrl.includes('docs.google.com/spreadsheets');
                  
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{project.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{project.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{project.developer}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {project.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {project.sheetUrl ? (
                          <a 
                            href={project.sheetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[200px]"
                            title={project.sheetUrl}
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Mở Sheet</span>
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Chưa cấu hình</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {hasValidSheet ? (
                          <div className="flex justify-center" title="Đã cấu hình link Sheet hợp lệ">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </div>
                        ) : (
                          <div className="flex justify-center" title="Thiếu link Sheet hoặc không hợp lệ">
                            <XCircle className="w-5 h-5 text-red-500" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Không có dữ liệu dự án. Hãy kiểm tra lại Google Sheet chính.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
