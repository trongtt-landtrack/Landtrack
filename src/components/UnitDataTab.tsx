import React, { useState, useEffect, useMemo } from 'react';
import { fetchConfiguredSheetData } from '../services/googleSheets';
import { Loader2, Search, Filter, X, Heart, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface UnitDataTabProps {
  sheetUrl: string;
  headerRow?: number;
  dataStartRow?: number;
  dataEndRow?: number;
  requiredFields?: string[];
  filterFields?: string[];
  initialFilters?: Record<string, string>;
  initialSearchTerm?: string;
  projectName?: string;
  projectId?: string;
}

// Danh sách các cột cần ẩn để bảo mật dữ liệu
const HIDDEN_COLUMNS = ['Giá vốn', 'Chiết khấu']; 

export default function UnitDataTab({ sheetUrl, headerRow, dataStartRow, dataEndRow, requiredFields, filterFields, initialFilters = {}, initialSearchTerm = '', projectName, projectId }: UnitDataTabProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(Object.keys(initialFilters).length > 0 || !!initialSearchTerm);
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [groupBy, setGroupBy] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [priceRange, setPriceRange] = useState<{ min: number | '', max: number | '' }>({ min: 0, max: 500000 });
  const [areaRange, setAreaRange] = useState<{ min: number | '', max: number | '' }>({ min: 0, max: 1000 });
  const [likedUnits, setLikedUnits] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);

  const handleUnitAction = async (unit: any, actionType: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!auth.currentUser) {
      alert('Vui lòng đăng nhập để thực hiện chức năng này.');
      return;
    }

    const unitCodeCol = Object.keys(unit).find(key => key.toLowerCase().includes('mã căn'));
    const unitCode = unitCodeCol ? unit[unitCodeCol] : 'Không rõ mã';
    const actionId = `${unitCode}-${actionType}`;

    if (likedUnits.has(unitCode)) {
      return; // Already liked
    }

    try {
      setActionLoading(actionId);
      await addDoc(collection(db, 'user_history'), {
        uid: auth.currentUser.uid,
        action: 'unit_interest',
        details: `Quan tâm căn ${unitCode} - Dự án ${projectName || 'Không rõ'}`,
        projectId: projectId || '',
        unitCode: unitCode,
        timestamp: serverTimestamp()
      });
      setLikedUnits(prev => new Set(prev).add(unitCode));
    } catch (err) {
      console.error('Error logging unit action:', err);
      alert('Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setActionLoading(null);
    }
  };

  const parseNumber = (value: string, isPrice: boolean = false): number => {
    if (!value) return 0;
    const cleaned = value.toString().replace(/[^0-9,.]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned) || 0;
    return isPrice && num > 1000000 ? num / 1000000000 : num;
  };

  const processedData = useMemo(() => {
    if (data.length === 0) return [];
    // Remove duplicates based on "Mã căn"
    const uniqueData = new Map();
    data.forEach(item => {
      const unitCodeCol = Object.keys(item).find(key => key.toLowerCase().includes('mã căn'));
      const unitCode = (unitCodeCol && item[unitCodeCol]) ? item[unitCodeCol].trim() : '';
      
      // Ignore rows without a unit code (e.g. notes, empty rows)
      if (!unitCode) return;
      
      if (!uniqueData.has(unitCode)) {
        uniqueData.set(unitCode, item);
      }
    });
    return Array.from(uniqueData.values());
  }, [data]);

  useEffect(() => {
    setFilters(initialFilters);
    if (Object.keys(initialFilters).length > 0) setIsFilterOpen(true);
  }, [initialFilters]);

  useEffect(() => {
    console.log('UnitDataTab: initialSearchTerm=', initialSearchTerm, 'processedData.length=', processedData.length);
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      setIsFilterOpen(true);
      
      // Auto-select unit if exact match found
      if (processedData.length > 0) {
        const exactMatch = processedData.find(item => {
          const unitCodeCol = Object.keys(item).find(key => key.toLowerCase().includes('mã căn'));
          const unitCode = unitCodeCol ? String(item[unitCodeCol]).trim() : '';
          console.log('Checking unit:', unitCode, 'against:', initialSearchTerm);
          return unitCode === initialSearchTerm;
        });
        if (exactMatch) {
          console.log('Exact match found:', exactMatch);
          setSelectedUnit(exactMatch);
        } else {
          console.log('No exact match found');
        }
      }
    }
  }, [initialSearchTerm, processedData]);

  useEffect(() => {
    async function loadUnitData() {
      if (!sheetUrl) {
        setError('Không có đường dẫn dữ liệu quỹ căn.');
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
        console.error('Failed to load unit data:', err);
        setError('Không thể tải dữ liệu quỹ căn.');
      } finally {
        setLoading(false);
      }
    }
    loadUnitData();
  }, [sheetUrl, headerRow, dataStartRow, dataEndRow, requiredFields]);

  const columns = useMemo(() => {
    if (processedData.length === 0) return [];
    return Object.keys(processedData[0]).filter(key => key.trim() !== '' && !HIDDEN_COLUMNS.includes(key));
  }, [processedData]);

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    columns.forEach(col => {
      const uniqueValues = Array.from(new Set(processedData.map(item => item[col]))).filter(Boolean);
      options[col] = uniqueValues.sort() as string[];
    });
    return options;
  }, [processedData, columns]);

  const filteredData = useMemo(() => {
    return processedData.filter(item => {
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
  }, [processedData, filters, searchTerm, priceRange, areaRange]);

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPriceRange({ min: 0, max: 500000 });
    setAreaRange({ min: 0, max: 1000 });
  };

  const groupedData = useMemo(() => {
    if (!groupBy) return { 'Tất cả': filteredData };
    return filteredData.reduce((acc, item) => {
      const key = item[groupBy] || 'Khác';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }, [filteredData, groupBy]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Smart Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">Bộ lọc & Thống kê</h2>
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="text-sm text-blue-600 hover:underline font-medium">
            {isFilterOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </button>
        </div>
        
        {isFilterOpen && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhanh (mã căn, hướng, tầng...)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                <option value="">Không nhóm</option>
                {(() => {
                  const groupOptions = (filterFields && filterFields.length > 0)
                    ? filterFields.filter(f => !f.toLowerCase().includes('mã căn'))
                    : ['Phân khu', 'Loại hình'];
                  
                  return columns
                    .filter(c => groupOptions.some(opt => c.toLowerCase().includes(opt.toLowerCase())))
                    .map(c => <option key={c} value={c}>Nhóm theo {c}</option>);
                })()}
              </select>
              <button onClick={clearFilters} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-4 h-4" /> Reset
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Khoảng giá (tỷ)</label>
                <div className="flex gap-2">
                  <input type="number" min="0" max="500000" placeholder="Min" className="w-full p-2.5 border border-gray-200 rounded-xl" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value === '' ? '' : Number(e.target.value)})} />
                  <input type="number" min="0" max="500000" placeholder="Max" className="w-full p-2.5 border border-gray-200 rounded-xl" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value === '' ? '' : Number(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Diện tích (m2)</label>
                <div className="flex gap-2">
                  <input type="number" min="0" max="1000" placeholder="Min" className="w-full p-2.5 border border-gray-200 rounded-xl" value={areaRange.min} onChange={(e) => setAreaRange({...areaRange, min: e.target.value === '' ? '' : Number(e.target.value)})} />
                  <input type="number" min="0" max="1000" placeholder="Max" className="w-full p-2.5 border border-gray-200 rounded-xl" value={areaRange.max} onChange={(e) => setAreaRange({...areaRange, max: e.target.value === '' ? '' : Number(e.target.value)})} />
                </div>
              </div>
              {/* Render dynamic filters */}
              {(() => {
                const fieldsToFilter = (filterFields && filterFields.length > 0)
                  ? filterFields
                  : ['Mã căn', 'Phân khu', 'Loại hình', 'Hướng'];

                return fieldsToFilter.map(col => {
                  const actualCol = columns.find(c => c.toLowerCase().includes(col.toLowerCase())) || col;
                  
                  return (
                    <div key={actualCol} className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{actualCol}</label>
                      <input
                        list={`${actualCol}-options`}
                        className="w-full p-2.5 border border-gray-200 rounded-xl"
                        placeholder={`Tìm ${actualCol.toLowerCase()}...`}
                        value={filters[actualCol] || ''}
                        onChange={(e) => setFilters({...filters, [actualCol]: e.target.value})}
                      />
                      <datalist id={`${actualCol}-options`}>
                        {filterOptions[actualCol]?.map(opt => <option key={opt} value={opt} />)}
                      </datalist>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="space-y-6">
        {Object.entries(groupedData as Record<string, any[]>).map(([groupName, items]) => (
          <div key={groupName} className="overflow-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
            {groupBy && <h3 className="p-5 bg-gray-50 font-bold text-gray-900 border-b border-gray-200">{groupName} <span className="text-gray-500 font-normal">({items.length} căn)</span></h3>}
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 font-medium uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 border-b border-gray-200 text-center whitespace-nowrap">Hành động</th>
                  {columns.map(col => <th key={col} className="px-6 py-4 border-b border-gray-200 whitespace-nowrap">{col}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((row, i) => (
                  <tr 
                    key={i} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedUnit(row)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(() => {
                        const unitCodeCol = Object.keys(row).find(key => key.toLowerCase().includes('mã căn'));
                        const unitCode = unitCodeCol ? row[unitCodeCol] : `row-${i}`;
                        const actionId = `${unitCode}-interest`;
                        const isSuccess = likedUnits.has(unitCode);
                        const isLoading = actionLoading === actionId;

                        return (
                          <button
                            onClick={(e) => handleUnitAction(row, 'interest', e)}
                            disabled={isLoading || isSuccess}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                              isSuccess 
                                ? 'bg-red-50 text-red-600' 
                                : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                            }`}
                            title={isSuccess ? 'Đã lưu' : 'Quan tâm'}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isSuccess ? (
                              <Heart className="w-4 h-4 fill-current" />
                            ) : (
                              <Heart className="w-4 h-4" />
                            )}
                          </button>
                        );
                      })()}
                    </td>
                    {columns.map(col => {
                      const isPrice = col.toLowerCase().includes('giá');
                      return (
                        <td key={col} className={`px-6 py-4 whitespace-nowrap ${isPrice ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                          {row[col]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Unit Detail Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUnit(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">
                Thông tin chi tiết
                {(() => {
                  const unitCodeCol = Object.keys(selectedUnit).find(key => key.toLowerCase().includes('mã căn'));
                  return unitCodeCol ? ` - ${selectedUnit[unitCodeCol]}` : '';
                })()}
              </h3>
              <button 
                onClick={() => setSelectedUnit(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {Object.keys(selectedUnit).filter(key => key.trim() !== '').map(key => {
                  const value = selectedUnit[key];
                  const isPrice = key.toLowerCase().includes('giá');
                  const isHidden = HIDDEN_COLUMNS.includes(key);
                  
                  if (isHidden) return null;
                  
                  return (
                    <div key={key} className="py-3 border-b border-gray-100 last:border-0">
                      <div className="text-sm font-medium text-gray-500 mb-1">{key}</div>
                      <div className={`text-base ${isPrice ? 'font-bold text-blue-600' : 'text-gray-900'}`}>
                        {value || '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedUnit(null)}
                className="px-6 py-2.5 rounded-xl font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              {(() => {
                const unitCodeCol = Object.keys(selectedUnit).find(key => key.toLowerCase().includes('mã căn'));
                const unitCode = unitCodeCol ? selectedUnit[unitCodeCol] : '';
                const isSuccess = likedUnits.has(unitCode);
                const isLoading = actionLoading === `${unitCode}-interest`;

                return (
                  <button
                    onClick={(e) => handleUnitAction(selectedUnit, 'interest', e)}
                    disabled={isLoading || isSuccess}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors ${
                      isSuccess 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isSuccess ? (
                      <Heart className="w-5 h-5 fill-current" />
                    ) : (
                      <Heart className="w-5 h-5" />
                    )}
                    {isSuccess ? 'Đã quan tâm' : 'Quan tâm căn này'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
