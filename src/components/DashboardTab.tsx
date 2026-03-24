import { useState, useEffect, useMemo } from 'react';
import { fetchConfiguredSheetData } from '../services/googleSheets';
import { Loader2, LayoutGrid, Home, Tag, BarChart2 } from 'lucide-react';

interface DashboardTabProps {
  sheetUrl: string;
  headerRow?: number;
  dataStartRow?: number;
  dataEndRow?: number;
  requiredFields?: string[];
  statsFields?: string[];
  onNavigate: (tab: string, filters: Record<string, string>) => void;
}

export default function DashboardTab({ sheetUrl, headerRow, dataStartRow, dataEndRow, requiredFields, statsFields, onNavigate }: DashboardTabProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!sheetUrl) {
        setError('Không có đường dẫn dữ liệu.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        let result: any[];
        if (headerRow !== undefined && dataStartRow !== undefined) {
          result = await fetchConfiguredSheetData<any>(sheetUrl, headerRow, dataStartRow, dataEndRow || 0, requiredFields);
        } else {
          // Fallback to old method if config is missing
          const { fetchSheetData } = await import('../services/googleSheets');
          result = await fetchSheetData<any>(sheetUrl);
        }
        setData(result);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Không thể tải dữ liệu thống kê.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sheetUrl, headerRow, dataStartRow, dataEndRow, requiredFields]);

  const stats = useMemo(() => {
    const fieldsToStat = (statsFields && statsFields.length > 0) 
      ? statsFields 
      : ['Phân khu', 'Loại hình'];

    const result: Record<string, { actualCol: string, stats: Record<string, number> }> = {};
    fieldsToStat.forEach(field => {
      result[field] = { actualCol: field, stats: {} };
    });

    data.forEach(item => {
      const unitCodeCol = Object.keys(item).find(key => key.toLowerCase().includes('mã căn'));
      const unitCode = (unitCodeCol && item[unitCodeCol]) ? item[unitCodeCol].trim() : '';
      
      // Ignore rows without a unit code (e.g. notes, empty rows)
      if (!unitCode) return;

      fieldsToStat.forEach(field => {
        const fieldCol = Object.keys(item).find(key => key.toLowerCase().includes(field.toLowerCase()));
        if (fieldCol) {
          result[field].actualCol = fieldCol;
          const val = item[fieldCol] || 'Khác';
          result[field].stats[val] = (result[field].stats[val] || 0) + 1;
        }
      });
    });

    return result;
  }, [data, statsFields]) as Record<string, { actualCol: string, stats: Record<string, number> }>;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="space-y-8">
      {Object.entries(stats).map(([field, { actualCol, stats: fieldStats }]) => (
        <section key={field}>
          <h3 className="text-lg font-serif italic text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-500" /> Thống kê theo {field}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(fieldStats).map(([val, count]) => (
              <div 
                key={val} 
                className="bg-gray-50 border border-gray-200 rounded-lg p-6 transition-all duration-200 hover:bg-gray-900 hover:text-white cursor-pointer group"
                onDoubleClick={() => onNavigate('units', { [actualCol]: val })}
              >
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 group-hover:text-gray-400 mb-1">{field}</p>
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2">{val}</h4>
                <p className="text-3xl font-mono font-bold text-blue-600 group-hover:text-blue-400">{count} <span className="text-sm font-normal text-gray-500 group-hover:text-gray-400">căn</span></p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
