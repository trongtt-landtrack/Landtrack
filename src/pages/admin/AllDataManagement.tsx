import { useState, useEffect } from 'react';
import { getProjectConfigs } from '../../services/configService';
import { ProjectConfig } from '../../types';
import { Loader2, Database, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

export default function AllDataManagement() {
  const [configs, setConfigs] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectConfigs();
      setConfigs(data);
    } catch (err: any) {
      console.error('Failed to load configs:', err);
      setError(err.message || 'Không thể tải cấu hình hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary font-display">Dữ liệu hệ thống</h2>
            <p className="text-sm text-gray-500 font-sans">Quản lý cấu hình các dự án từ Google Sheets</p>
          </div>
        </div>
        <button 
          onClick={loadConfigs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all disabled:opacity-50 font-display"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          LÀM MỚI
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 font-sans">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold font-display">Lỗi tải dữ liệu</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2 opacity-80">Đảm bảo Google Sheet cấu hình đã được chia sẻ công khai (Anyone with the link can view).</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {configs.map((config) => (
            <div key={config.projectId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider font-display">
                        ID: {config.projectId}
                      </span>
                      {config.isHot && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded uppercase tracking-wider font-display">
                          HOT
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-primary font-display">{config.name}</h3>
                    <p className="text-sm text-gray-500 italic font-sans">{config.slogan}</p>
                  </div>
                  <a 
                    href={config.sheetUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors font-display"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    XEM GOOGLE SHEET
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 font-display">Dòng tiêu đề</p>
                    <p className="text-sm font-medium text-gray-900 font-sans">{config.headerRow}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 font-display">Dòng bắt đầu</p>
                    <p className="text-sm font-medium text-gray-900 font-sans">{config.dataStartRow}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 font-display">Dòng kết thúc</p>
                    <p className="text-sm font-medium text-gray-900 font-sans">{config.dataEndRow || 'Tự động'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 font-display">Trạng thái</p>
                    <p className="text-sm font-medium text-gray-900 font-sans">{config.status || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 font-display">Ma trận tiêu đề (Mapping)</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(config.headerMatrix).map(([standard, actual]) => (
                      <div key={standard} className="flex items-center bg-gray-50 rounded-md border border-gray-100 overflow-hidden">
                        <span className="px-2 py-1 text-[10px] font-bold text-gray-500 border-r border-gray-100 font-display">{standard}</span>
                        <span className="px-2 py-1 text-[10px] font-bold text-primary font-sans">{actual}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {configs.length === 0 && !error && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300 font-sans">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Chưa có dự án nào được cấu hình.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
