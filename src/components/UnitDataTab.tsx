import { useState, useEffect, useMemo } from 'react';
import { fetchSheetData } from '../services/googleSheets';
import { Loader2, Search, Filter, X } from 'lucide-react';

interface UnitDataTabProps {
  sheetUrl: string;
}

export default function UnitDataTab({ sheetUrl }: UnitDataTabProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<{ min: number | '', max: number | '' }>({ min: '', max: '' });
  const [areaRange, setAreaRange] = useState<{ min: number | '', max: number | '' }>({ min: '', max: '' });

  const parseNumber = (value: string, isPrice: boolean = false): number => {
    if (!value) return 0;
    const cleaned = value.toString().replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned) || 0;
    return isPrice && num > 1000000 ? num / 1000000000 : num;
  };

  useEffect(() => {
    async function loadUnitData() {
      if (!sheetUrl) {
        setError('Không có đường dẫn dữ liệu quỹ căn.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const result = await fetchSheetData<any>(sheetUrl);
        setData(result);
      } catch (err) {
        console.error('Failed to load unit data:', err);
        setError('Không thể tải dữ liệu quỹ căn.');
      } finally {
        setLoading(false);
      }
    }
    loadUnitData();
  }, [sheetUrl]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => key.trim() !== '');
  }, [data]);

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    columns.forEach(col => {
      const uniqueValues = Array.from(new Set(data.map(item => item[col]))).filter(Boolean);
      options[col] = uniqueValues.sort() as string[];
    });
    return options;
  }, [data, columns]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (searchTerm) {
        const matchesSearch = Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!matchesSearch) return false;
      }

      for (const [key, value] of Object.entries(filters)) {
        if (value && item[key] !== value) return false;
      }

      if (priceRange.min !== '' || priceRange.max !== '') {
        const priceCol = Object.keys(item).find(key => key.includes('Giá'));
        if (priceCol) {
          const price = parseNumber(item[priceCol], true);
          if (priceRange.min !== '' && price < priceRange.min) return false;
          if (priceRange.max !== '' && price > priceRange.max) return false;
        }
      }
      
      if (areaRange.min !== '' || areaRange.max !== '') {
        const areaCol = Object.keys(item).find(key => key.includes('DT'));
        if (areaCol) {
          const area = parseNumber(item[areaCol], false);
          if (areaRange.min !== '' && area < areaRange.min) return false;
          if (areaRange.max !== '' && area > areaRange.max) return false;
        }
      }

      return true;
    });
  }, [data, filters, searchTerm, priceRange, areaRange]);

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPriceRange({ min: '', max: '' });
    setAreaRange({ min: '', max: '' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Smart Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhanh (mã căn, hướng, tầng...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={clearFilters} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Giá (tỷ)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" className="w-full p-2 border rounded-lg" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value === '' ? '' : Number(e.target.value)})} />
              <input type="number" placeholder="Max" className="w-full p-2 border rounded-lg" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value === '' ? '' : Number(e.target.value)})} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Diện tích (m2)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" className="w-full p-2 border rounded-lg" value={areaRange.min} onChange={(e) => setAreaRange({...areaRange, min: e.target.value === '' ? '' : Number(e.target.value)})} />
              <input type="number" placeholder="Max" className="w-full p-2 border rounded-lg" value={areaRange.max} onChange={(e) => setAreaRange({...areaRange, max: e.target.value === '' ? '' : Number(e.target.value)})} />
            </div>
          </div>
          {columns.filter(c => filterOptions[c].length > 1 && filterOptions[c].length < 20).map(col => (
            <div key={col} className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase truncate">{col}</label>
              <select className="w-full p-2 border rounded-lg" value={filters[col] || ''} onChange={(e) => setFilters({...filters, [col]: e.target.value})}>
                <option value="">Tất cả</option>
                {filterOptions[col].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 uppercase font-bold">
            <tr>
              {columns.map(col => <th key={col} className="px-6 py-4">{col}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredData.map((row, i) => (
              <tr key={i} className="hover:bg-blue-50/50">
                {columns.map(col => <td key={col} className="px-6 py-4">{row[col]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
