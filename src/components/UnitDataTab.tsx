import React, { useState, useEffect, useMemo } from 'react';
import { fetchConfiguredSheetData } from '../services/googleSheets';
import { Loader2, Search, Filter, X, Heart, CheckCircle2, ArrowUpDown, Scale, Database, ArrowRightLeft, ChevronUp, ChevronDown, Layers, Info, Trash2, ExternalLink, MapPin, Home, Tag, User } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { STANDARD_HEADERS, MASTER_SHEET_URL } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface UnitDataTabProps {
  sheetUrl: string;
  headerRow?: number;
  dataStartRow?: number;
  dataEndRow?: number;
  requiredFields?: string[];
  filterFields?: string[];
  headerMatrix?: Record<string, string>;
  standardHeaders?: string[];
  initialFilters?: Record<string, string>;
  initialSearchTerm?: string;
  projectName?: string;
  projectId?: string;
  onNavigate?: (tab: string, filters: Record<string, string>) => void;
  initialData?: any[];
  initialLoading?: boolean;
}

// Danh sách các cột cần ẩn để bảo mật dữ liệu hoặc thay thế bằng cột tự động
const HIDDEN_COLUMNS = ['Giá vốn', 'Chiết khấu', 'STT', 'Stt', 'Số thứ tự', 'No.', 'Index', '#', 'Dự án', 'Tên dự án', 'ProjectName', 'SpreadsheetID', 'TabName', 'Link tài liệu']; 

export default function UnitDataTab({ 
  sheetUrl, 
  headerRow, 
  dataStartRow, 
  dataEndRow, 
  requiredFields, 
  filterFields, 
  headerMatrix,
  initialFilters = {}, 
  initialSearchTerm = '', 
  projectName, 
  projectId,
  onNavigate,
  initialData,
  initialLoading
}: UnitDataTabProps) {
  const [data, setData] = useState<any[]>(initialData || []);
  const [loading, setLoading] = useState(initialLoading !== undefined ? initialLoading : true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [groupBy, setGroupBy] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [priceRange, setPriceRange] = useState<{ min: number | '', max: number | '' }>({ min: 0, max: 500000 });
  const [areaRange, setAreaRange] = useState<{ min: number | '', max: number | '' }>({ min: 0, max: 1000 });
  const [likedUnits, setLikedUnits] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchLikedUnits = async () => {
      if (!auth.currentUser || !projectId) return;
      try {
        const q = query(
          collection(db, 'favorites'),
          where('uid', '==', auth.currentUser.uid),
          where('projectId', '==', projectId)
        );
        const snapshot = await getDocs(q);
        const liked = new Set<string>();
        snapshot.forEach(doc => {
          if (doc.data().unitCode) {
            liked.add(doc.data().unitCode);
          }
        });
        setLikedUnits(liked);
      } catch (e) {
        console.error('Failed to fetch liked units:', e);
      }
    };
    fetchLikedUnits();
  }, [projectId, auth.currentUser?.uid]);

  const renderAgentValue = (val: any) => {
    if (!val || val === 'N/A' || val === '0') return '';
    return String(val);
  };

  const handleUnitAction = async (unit: any, actionType: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!auth.currentUser) {
      alert('Vui lòng đăng nhập để thực hiện chức năng này.');
      return;
    }

    const unitCodeCol = Object.keys(unit).find(k => k.toLowerCase().includes('mã căn') || k.toLowerCase().includes('mã sp'));
    const unitCode = unitCodeCol ? String(unit[unitCodeCol]).trim() : 'Không rõ mã';
    const actionId = `${unitCode}-${actionType}`;
    const safeUnitCode = unitCode.replace(/\//g, '-');
    const favoriteId = `${auth.currentUser.uid}_${projectId}_${safeUnitCode}`;

    try {
      setActionLoading(actionId);
      
      const isCurrentlyLiked = likedUnits.has(unitCode);
      if (isCurrentlyLiked) {
        // Optimistic Unlike
        setLikedUnits(prev => {
          const newSet = new Set(prev);
          newSet.delete(unitCode);
          return newSet;
        });
        await deleteDoc(doc(db, 'favorites', favoriteId));
      } else {
        // Optimistic Like
        setLikedUnits(prev => new Set(prev).add(unitCode));
        await setDoc(doc(db, 'favorites', favoriteId), {
          uid: auth.currentUser.uid,
          projectId: projectId || '',
          unitCode: unitCode,
          timestamp: serverTimestamp()
        });
        
        // Log to history
        await addDoc(collection(db, 'user_history'), {
          uid: auth.currentUser.uid,
          action: 'unit_interest',
          details: `Quan tâm căn ${unitCode} - Dự án ${projectName || 'Không rõ'}`,
          projectId: projectId || '',
          unitCode: unitCode,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error toggling unit favorite:', err);
      // Rollback
      if (likedUnits.has(unitCode)) {
        setLikedUnits(prev => new Set(prev).add(unitCode));
      } else {
        setLikedUnits(prev => {
          const newSet = new Set(prev);
          newSet.delete(unitCode);
          return newSet;
        });
      }
      alert('Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setActionLoading(null);
    }
  };

  const parseNumber = (value: any, isPrice: boolean = false): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return isPrice && value > 1000000 ? value / 1000000000 : value;
    
    // Xử lý chuỗi: loại bỏ ký tự không phải số, giữ lại dấu phẩy và dấu chấm
    const str = value.toString();
    
    // Xác định định dạng thập phân (dấu phẩy hay dấu chấm)
    // Nếu có cả . và , thì dấu cuối cùng thường là thập phân
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    let cleaned = str;
    if (lastComma > lastDot) {
      // Định dạng kiểu VN: 1.234,56 -> bỏ chấm, thay phẩy bằng chấm
      cleaned = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Định dạng kiểu US: 1,234.56 -> bỏ phẩy
      cleaned = str.replace(/,/g, '');
    } else {
      // Chỉ có 1 loại dấu hoặc không có
      cleaned = str.replace(/,/g, '.');
    }
    
    // Chỉ giữ lại số và dấu chấm thập phân duy nhất
    cleaned = cleaned.replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      cleaned = cleaned.substring(0, firstDot + 1) + cleaned.substring(firstDot + 1).replace(/\./g, '');
    }
    
    const num = parseFloat(cleaned) || 0;
    // Nếu là giá và đơn vị là VNĐ (số rất lớn), chuyển về tỷ
    return isPrice && num > 1000000 ? num / 1000000000 : num;
  };

  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const processedData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Filter by project name if using Master Sheet
    let filteredByProject = data;
    if (projectName) {
      const normProjectName = removeAccents(projectName.toLowerCase().trim());
      filteredByProject = data.filter(item => {
        const possibleKeys = ['ProjectName', 'Dự án', 'Tên dự án', 'projectname', 'Project Name', 'DỰ ÁN'];
        const itemProject = possibleKeys
          .map(key => String(item[key] || '').trim())
          .find(val => val !== '') || '';
          
        return removeAccents(itemProject.toLowerCase()) === normProjectName;
      });
    }

    // Remove duplicates based on "Mã căn"
    const uniqueData = new Map();
    filteredByProject.forEach(item => {
      // Standardized identifier: "Mã căn" is the standard key from HEADER_MATRIX
      const unitCode = (item['Mã căn'] || item['Mã SP']) ? (item['Mã căn'] || item['Mã SP']).toString().trim() : '';
      
      // Ignore rows without a unit code (e.g. notes, empty rows)
      if (!unitCode) return;
      
      if (!uniqueData.has(unitCode)) {
        uniqueData.set(unitCode, item);
      }
    });
    return Array.from(uniqueData.values());
  }, [data, projectName]);

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
          const unitCode = (item['Mã căn'] || item['Mã SP']) ? String(item['Mã căn'] || item['Mã SP']).trim() : '';
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
      try {
        setLoading(true);
        // Prioritize MASTER_SHEET_URL if projectName is provided
        const sourceUrl = projectName ? MASTER_SHEET_URL : (sheetUrl || '');
        
        if (!sourceUrl) {
          setError('Không có đường dẫn dữ liệu quỹ căn.');
          setLoading(false);
          return;
        }

        let result: any[];
        // Always use standard header config for Master Sheet
        if (projectName) {
          result = await fetchConfiguredSheetData<any>(MASTER_SHEET_URL, 1, 2, 0);
        } else if (headerRow !== undefined && dataStartRow !== undefined) {
          result = await fetchConfiguredSheetData<any>(sourceUrl, headerRow, dataStartRow, dataEndRow || 0, requiredFields, headerMatrix);
        } else {
          // Fallback to old method if config is missing
          const { fetchSheetData } = await import('../services/googleSheets');
          result = await fetchSheetData<any>(sourceUrl);
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
  }, [sheetUrl, headerRow, dataStartRow, dataEndRow, requiredFields, projectName]);

  const columns = useMemo(() => {
    if (processedData.length === 0) return [];
    const allKeys = Object.keys(processedData[0]).filter(key => 
      key.trim() !== '' && 
      key.length <= 60 && 
      !HIDDEN_COLUMNS.includes(key)
    );

    // Sort based on STANDARD_HEADERS order
    return allKeys.sort((a, b) => {
      const indexA = STANDARD_HEADERS.indexOf(a);
      const indexB = STANDARD_HEADERS.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
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
    let result = processedData.filter(item => {
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
        const priceCol = Object.keys(item).find(key => key.toLowerCase().includes('giá') && !key.toLowerCase().includes('đơn giá'));
        if (priceCol) {
          const price = parseNumber(item[priceCol], true);
          if (priceRange.min !== '' && price < priceRange.min) return false;
          if (priceRange.max !== '' && price > priceRange.max) return false;
        }
      }
      
      if (areaRange.min !== '' || areaRange.max !== '') {
        const areaCol = Object.keys(item).find(key => key.toLowerCase().includes('dt') || key.toLowerCase().includes('diện tích'));
        if (areaCol) {
          const area = parseNumber(item[areaCol], false);
          if (areaRange.min !== '' && area < areaRange.min) return false;
          if (areaRange.max !== '' && area > areaRange.max) return false;
        }
      }

      return true;
    });

    // Apply Sorting
    if (sortConfig.key && sortConfig.direction) {
      // Tìm cột thực tế tương ứng với key sắp xếp
      const firstItem = result[0] || processedData[0];
      if (firstItem) {
        const actualCol = Object.keys(firstItem).find(k => {
          const key = sortConfig.key.toLowerCase();
          const col = k.toLowerCase();
          if (key === 'dt') {
            // Ưu tiên khớp chính xác "diện tích đất"
            if (col === 'diện tích đất' || col === 'dt đất') return true;
            return col.includes('dt') || col.includes('diện tích');
          }
          if (key === 'giá') return col.includes('giá') && !col.includes('đơn giá');
          if (key === 'đơn giá') return col.includes('đơn giá') || col.includes('/m2');
          return col.includes(key);
        });

        if (actualCol) {
          result = [...result].sort((a, b) => {
            const isPrice = sortConfig.key.toLowerCase().includes('giá');
            const valA = parseNumber(a[actualCol], isPrice);
            const valB = parseNumber(b[actualCol], isPrice);
            
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          });
        }
      }
    }

    return result;
  }, [processedData, filters, searchTerm, priceRange, areaRange, sortConfig]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm, priceRange, areaRange, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPriceRange({ min: 0, max: 500000 });
    setAreaRange({ min: 0, max: 1000 });
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
  };

  const activeFiltersCount = useMemo(() => {
    let count = Object.keys(filters).length;
    if (searchTerm) count++;
    if (priceRange.min !== 0 || priceRange.max !== 500000) count++;
    if (areaRange.min !== 0 || areaRange.max !== 1000) count++;
    return count;
  }, [filters, searchTerm, priceRange, areaRange]);

  const getStatusColor = (s: string) => {
    const lower = s.toLowerCase();
    if (lower.includes('trống') || lower.includes('mở') || lower.includes('còn')) 
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-100/20';
    if (lower.includes('đã bán') || lower.includes('hết')) 
      return 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-100/20';
    if (lower.includes('cọc') || lower.includes('đặt')) 
      return 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm shadow-amber-100/20';
    return 'bg-slate-50 text-slate-700 border-slate-100';
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

  if (loading) return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-gray-200 rounded-2xl"></div>
          <div className="h-4 w-32 bg-gray-100 rounded-full"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-12 w-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-12 w-48 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-50 rounded-[2rem] animate-pulse border border-gray-100"></div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto p-8 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-6 text-red-600">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <Info className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-xl font-black uppercase tracking-tight mb-1 font-display">Lỗi tải dữ liệu</h3>
        <p className="font-medium opacity-80 font-sans">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header & Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase tracking-tight mb-2 font-display">
            QUỸ CĂN CHI TIẾT
          </h2>
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 bg-accent rounded-full"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest font-display">
              {filteredData.length} kết quả phù hợp
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white rounded-2xl p-1 border border-gray-100 shadow-sm">
            {[
              { label: 'Diện tích', key: 'DT', icon: <Scale className="w-4 h-4" /> },
              { label: 'Giá', key: 'Giá', icon: <Database className="w-4 h-4" /> },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleSort(btn.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all font-display ${
                  sortConfig.key === btn.key 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                {btn.icon}
                <span>{btn.label}</span>
                {sortConfig.key === btn.key && (
                  sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)} 
            className={`relative flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all shadow-sm font-display ${
              isFilterOpen 
                ? 'bg-accent text-white' 
                : 'bg-white text-primary border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            {isFilterOpen ? 'Đóng bộ lọc' : 'Bộ lọc nâng cao'}
            {activeFiltersCount > 0 && !isFilterOpen && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg font-display">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Tags */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center gap-2"
          >
            <div className="flex items-center gap-2 mr-2">
              <Filter className="w-3 h-3 text-accent" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-display">Đang lọc:</span>
            </div>
            
            {searchTerm && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white text-primary rounded-xl text-[10px] font-bold border border-gray-100 shadow-sm font-display">
                <span className="text-gray-400">Từ khóa:</span>
                <span>{searchTerm}</span>
                <button onClick={() => setSearchTerm('')} className="hover:text-accent transition-colors"><X className="w-3 h-3" /></button>
              </div>
            )}
            {Object.entries(filters).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 px-3 py-1.5 bg-white text-primary rounded-xl text-[10px] font-bold border border-gray-100 shadow-sm font-display">
                <span className="text-gray-400">{key}:</span>
                <span>{value}</span>
                <button onClick={() => removeFilter(key)} className="hover:text-accent transition-colors"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {(priceRange.min !== 0 || priceRange.max !== 500000) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white text-primary rounded-xl text-[10px] font-bold border border-gray-100 shadow-sm font-display">
                <span className="text-gray-400">Giá:</span>
                <span>{priceRange.min} - {priceRange.max} tỷ</span>
                <button onClick={() => setPriceRange({ min: 0, max: 500000 })} className="hover:text-accent transition-colors"><X className="w-3 h-3" /></button>
              </div>
            )}
            {(areaRange.min !== 0 || areaRange.max !== 1000) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white text-primary rounded-xl text-[10px] font-bold border border-gray-100 shadow-sm font-display">
                <span className="text-gray-400">DT:</span>
                <span>{areaRange.min} - {areaRange.max} m²</span>
                <button onClick={() => setAreaRange({ min: 0, max: 1000 })} className="hover:text-accent transition-colors"><X className="w-3 h-3" /></button>
              </div>
            )}
            
            <button 
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-accent uppercase tracking-widest hover:bg-accent/10 rounded-xl transition-all font-display"
            >
              <Trash2 className="w-3 h-3" /> Xóa tất cả
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="z-20"
          >
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-2xl space-y-6 relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Căn hộ */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-1 font-display">Tìm kiếm mã căn</label>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-accent transition-colors" />
                    <input
                      type="text"
                      placeholder="Nhập mã căn..."
                      className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all outline-none font-sans"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Phân khu */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-1 font-display">Phân khu</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:bg-white appearance-none cursor-pointer font-medium outline-none font-sans"
                      value={filters['Phân khu'] || ''}
                      onChange={(e) => setFilters({...filters, 'Phân khu': e.target.value})}
                    >
                      <option value="">Tất cả phân khu</option>
                      {filterOptions['Phân khu']?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Loại hình */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-1 font-display">Loại hình</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:bg-white appearance-none cursor-pointer font-medium outline-none font-sans"
                      value={filters['Loại hình'] || ''}
                      onChange={(e) => setFilters({...filters, 'Loại hình': e.target.value})}
                    >
                      <option value="">Tất cả loại hình</option>
                      {filterOptions['Loại hình']?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Hướng */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-1 font-display">Hướng</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:bg-white appearance-none cursor-pointer font-medium outline-none font-sans"
                      value={filters['Hướng'] || ''}
                      onChange={(e) => setFilters({...filters, 'Hướng': e.target.value})}
                    >
                      <option value="">Tất cả hướng</option>
                      {filterOptions['Hướng']?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Quỹ bán */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-1 font-display">Quỹ bán</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:bg-white appearance-none cursor-pointer font-medium outline-none font-sans"
                      value={filters['Quỹ'] || ''}
                      onChange={(e) => setFilters({...filters, 'Quỹ': e.target.value})}
                    >
                      <option value="">Tất cả quỹ</option>
                      {filterOptions['Quỹ']?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Khoảng giá */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-1 font-display">Khoảng giá (tỷ)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Từ" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-accent/10 font-sans" value={priceRange.min} onChange={(e) => setPriceRange({...priceRange, min: e.target.value === '' ? '' : Number(e.target.value)})} />
                    <input type="number" placeholder="Đến" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-accent/10 font-sans" value={priceRange.max} onChange={(e) => setPriceRange({...priceRange, max: e.target.value === '' ? '' : Number(e.target.value)})} />
                  </div>
                </div>

                {/* Diện tích đất */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-1 font-display">Diện tích đất (m2)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Từ" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-accent/10 font-sans" value={areaRange.min} onChange={(e) => setAreaRange({...areaRange, min: e.target.value === '' ? '' : Number(e.target.value)})} />
                    <input type="number" placeholder="Đến" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-accent/10 font-sans" value={areaRange.max} onChange={(e) => setAreaRange({...areaRange, max: e.target.value === '' ? '' : Number(e.target.value)})} />
                  </div>
                </div>

                {/* Phân nhóm (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest ml-1 font-display">Phân nhóm</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:bg-white appearance-none cursor-pointer font-medium outline-none font-sans" 
                      value={groupBy} 
                      onChange={(e) => setGroupBy(e.target.value)}
                    >
                      <option value="">Không phân nhóm</option>
                      {columns
                        .filter(c => ['Phân khu', 'Loại hình', 'Hướng', 'Quỹ'].some(opt => c.toLowerCase().includes(opt.toLowerCase())))
                        .map(c => <option key={c} value={c}>Nhóm theo {c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-2">
                <button 
                  onClick={clearFilters} 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-[10px] font-black text-gray-400 hover:text-accent transition-colors uppercase tracking-widest font-display"
                >
                  <Trash2 className="w-4 h-4" /> Làm mới
                </button>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-accent transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 font-display"
                >
                  Áp dụng <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data List */}
      <div className="space-y-8">
        {filteredData.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d99b28]/20 to-transparent"></div>
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 bg-[#d99b28]/5 rounded-full animate-ping"></div>
              <Search className="w-10 h-10 text-gray-300 relative z-10" />
            </div>
            <h3 className="text-2xl font-black text-primary uppercase tracking-tight mb-3 font-display">Không tìm thấy kết quả</h3>
            <p className="text-gray-400 font-medium max-w-xs text-center px-6 leading-relaxed font-sans">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để tìm thấy căn hộ ưng ý.
            </p>
            <button 
              onClick={clearFilters}
              className="mt-10 px-10 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-accent transition-all shadow-xl shadow-primary/10 flex items-center gap-3 font-display"
            >
              <Trash2 className="w-4 h-4" /> Làm mới bộ lọc
            </button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {/* Desktop View: Scrollable Table */}
              <div className="hidden lg:block max-h-[600px] overflow-auto">
                <div className="min-w-max">
                  {/* Table Header */}
                  <div className="flex bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <div className="flex-none w-[60px] px-4 py-5 text-[10px] font-black text-primary/60 uppercase tracking-widest text-center font-display">
                      <Heart className="w-3.5 h-3.5 mx-auto" />
                    </div>
                    {columns.map((col) => {
                      const lowerCol = col.toLowerCase();
                      let width = 'w-[150px]';
                      if (lowerCol.includes('mã')) width = 'w-[140px]';
                      if (lowerCol.includes('giá')) width = 'w-[180px]';
                      if (lowerCol.includes('diện tích')) width = 'w-[160px]';
                      if (lowerCol.includes('tình trạng') || lowerCol.includes('trạng thái')) width = 'w-[140px]';
                      if (lowerCol.includes('csbh') || lowerCol.includes('quà tặng') || lowerCol.includes('ghi chú')) width = 'w-[250px]';

                      return (
                        <div 
                          key={col} 
                          className={`flex-none ${width} px-4 py-5 text-[10px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-2 font-display`}
                        >
                          {lowerCol.includes('mã') && <Tag className="w-3 h-3" />}
                          {lowerCol.includes('giá') && <Database className="w-3 h-3" />}
                          {lowerCol.includes('diện tích') && <Scale className="w-3 h-3" />}
                          {col}
                        </div>
                      );
                    })}
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-50">
                    {paginatedData.map((row, i) => {
                      const unitCodeCol = Object.keys(row).find(k => k.toLowerCase().includes('mã căn') || k.toLowerCase().includes('mã sp'));
                      const unitCode = unitCodeCol ? String(row[unitCodeCol]).trim() : '';
                      const isSuccess = likedUnits.has(unitCode);

                      return (
                        <motion.div
                          key={unitCode || i}
                          whileHover={{ backgroundColor: "rgba(217, 155, 40, 0.02)" }}
                          className={`flex items-center group cursor-pointer transition-all border-b border-gray-50 ${
                            i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          }`}
                          onClick={() => setSelectedUnit(row)}
                        >
                          {/* Heart Button in First Column */}
                          <div className="flex-none w-[60px] px-4 py-4 flex justify-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnitAction(row, 'interest', e);
                              }}
                              className={`p-2 rounded-full transition-all ${isSuccess ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                            >
                              <Heart className={`w-4 h-4 ${isSuccess ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          {columns.map((col) => {
                            const val = row[col] || '-';
                            const lowerCol = col.toLowerCase();
                            const isStatus = lowerCol.includes('tình trạng') || lowerCol.includes('trạng thái');
                            const isCode = lowerCol.includes('mã');
                            const isPrice = lowerCol === 'giá niêm yết' || lowerCol === 'giá';
                            const isArea = lowerCol === 'diện tích đất' || lowerCol === 'dt đất';
                            const isAgentName = col === 'ĐL';
                            const isPTG = col === 'PTG';

                            let width = 'w-[150px]';
                            if (lowerCol.includes('mã')) width = 'w-[140px]';
                            if (lowerCol.includes('giá')) width = 'w-[180px]';
                            if (lowerCol.includes('diện tích')) width = 'w-[160px]';
                            if (lowerCol.includes('tình trạng') || lowerCol.includes('trạng thái')) width = 'w-[140px]';
                            if (lowerCol.includes('csbh') || lowerCol.includes('quà tặng') || lowerCol.includes('ghi chú')) width = 'w-[250px]';

                            return (
                              <div 
                                key={col} 
                                className={`flex-none ${width} px-4 py-4 break-words`}
                              >
                                {isStatus ? (
                                  <div className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border font-display ${getStatusColor(String(val))}`}>
                                    {String(val)}
                                  </div>
                                ) : isAgentName ? (
                                  <a 
                                    href={row['SpreadsheetID'] || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm font-black text-accent hover:underline font-sans"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {renderAgentValue(val)}
                                  </a>
                                ) : isPTG ? (
                                  val !== '-' && val !== '' ? (
                                    <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onNavigate) onNavigate('docs', { searchTerm: unitCode });
                                    }}
                                    className="text-sm font-black text-accent hover:underline font-sans"
                                  >
                                    {unitCode}
                                  </button>
                                  ) : null
                                ) : (
                                  <span className={`text-sm block font-sans ${
                                    isCode ? 'text-accent font-black' : 
                                    isPrice ? 'text-accent font-black' : 
                                    isArea ? 'text-primary font-black' : 
                                    'text-slate-600 font-bold'
                                  }`}>
                                    {String(val)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mobile View: Cards with Height Limit */}
              <div className="lg:hidden max-h-[70vh] overflow-y-auto divide-y divide-gray-50">
                {paginatedData.map((row, i) => {
                  const unitCodeCol = Object.keys(row).find(k => k.toLowerCase().includes('mã căn') || k.toLowerCase().includes('mã sp'));
                  const unitCode = unitCodeCol ? String(row[unitCodeCol]).trim() : '';
                  const statusCol = Object.keys(row).find(k => k.toLowerCase().includes('tình trạng') || k.toLowerCase().includes('trạng thái'));
                  const status = statusCol ? String(row[statusCol]).trim() : '';
                  const isSuccess = likedUnits.has(unitCode);

                  return (
                    <div key={unitCode || i} className="p-5 space-y-4" onClick={() => setSelectedUnit(row)}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-display">Mã căn</span>
                          <h4 className="text-lg font-black text-accent font-display">{unitCode || `Căn #${i+1}`}</h4>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border font-display ${getStatusColor(status)}`}>
                          {status || 'N/A'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        {columns.slice(0, 12).map(col => {
                          if (col.toLowerCase().includes('mã') || col.toLowerCase().includes('trạng thái') || col.toLowerCase().includes('tình trạng')) return null;
                          const val = row[col] || '-';
                          const isAgentName = col === 'ĐL';
                          const isPTG = col === 'PTG';

                          return (
                            <div key={col} className="space-y-1">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate block font-display">{col}</span>
                              {isAgentName ? (
                                <a 
                                  href={row['SpreadsheetID'] || '#'} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold text-accent hover:underline font-sans truncate block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {renderAgentValue(val)}
                                </a>
                              ) : isPTG ? (
                                val !== '-' && val !== '' ? (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onNavigate) onNavigate('docs', { searchTerm: unitCode });
                                    }}
                                    className="text-sm font-bold text-accent hover:underline font-sans truncate block text-left"
                                  >
                                    {unitCode}
                                  </button>
                                ) : <p className="text-sm font-bold text-primary truncate font-sans">-</p>
                              ) : (
                                <p className="text-sm font-bold text-primary truncate font-sans">{String(val)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <button className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest font-display">
                          Xem chi tiết <ArrowRightLeft className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnitAction(row, 'interest', e);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all font-display ${
                            isSuccess ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${isSuccess ? 'fill-current' : ''}`} />
                          {isSuccess ? 'Đã quan tâm' : 'Quan tâm'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-display">
                  Trang {currentPage} / {totalPages} ({filteredData.length} căn)
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-3 rounded-xl bg-white border border-gray-100 text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <ChevronUp className="w-4 h-4 -rotate-90" />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum = currentPage;
                      if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      if (pageNum <= 0 || pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all font-display ${
                            currentPage === pageNum 
                              ? 'bg-primary text-white shadow-lg' 
                              : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-3 rounded-xl bg-white border border-gray-100 text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Unit Detail Modal */}
      <AnimatePresence>
        {selectedUnit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-md" onClick={() => setSelectedUnit(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20" 
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative p-8 lg:p-12 border-b border-gray-50 bg-gray-50/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-accent text-white text-[10px] font-black uppercase tracking-widest font-display">
                        Chi tiết căn hộ
                      </span>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border font-display ${getStatusColor(String(selectedUnit['Tình trạng'] || selectedUnit['Trạng thái'] || ''))}`}>
                        {String(selectedUnit['Tình trạng'] || selectedUnit['Trạng thái'] || 'Chưa xác định')}
                      </div>
                    </div>
                    <h3 className="text-4xl font-black text-primary tracking-tight font-display">
                      {String(selectedUnit['Mã căn'] || selectedUnit['Mã SP'] || 'Căn hộ')}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <p className="text-sm font-bold uppercase tracking-widest font-display">
                        {String(selectedUnit['Phân khu'] || 'Dự án')} - {projectName || 'Dự án'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-display">Giá niêm yết</p>
                    <p className="text-4xl font-black text-accent tracking-tight font-display">
                      {selectedUnit['Giá niêm yết'] || selectedUnit['Giá'] || selectedUnit['Tổng giá'] || '-'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedUnit(null)}
                  className="absolute top-8 right-8 p-3 text-gray-400 hover:text-primary hover:bg-white rounded-2xl transition-all shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-8 lg:p-12 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-accent">
                      <Scale className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 font-display">Diện tích</p>
                      <p className="text-lg font-black text-primary font-sans">{selectedUnit['Diện tích đất'] || selectedUnit['DT đất'] || selectedUnit['Diện tích'] || '-'} m²</p>
                    </div>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-accent">
                      <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 font-display">Hướng</p>
                      <p className="text-lg font-black text-primary font-sans">{selectedUnit['Hướng'] || '-'}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-accent">
                      <Home className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 font-display">Loại hình</p>
                      <p className="text-lg font-black text-primary font-sans">{selectedUnit['Loại hình'] || '-'}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-accent">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 font-display">Đại lý</p>
                      <p className="text-lg font-black text-primary font-sans">{renderAgentValue(selectedUnit['Tên ĐL'] || selectedUnit['ĐL'])}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h4 className="text-lg font-black text-primary uppercase tracking-tight font-display">Thông số kỹ thuật</h4>
                    <div className="h-px flex-1 bg-gray-100"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
                    {Object.keys(selectedUnit)
                      .filter(key => 
                        key.trim() !== '' && 
                        key.length <= 60 && 
                        !HIDDEN_COLUMNS.includes(key) &&
                        !['Mã căn', 'Mã SP', 'Giá niêm yết', 'Giá', 'Tổng giá', 'Diện tích đất', 'DT đất', 'Diện tích', 'Hướng', 'Loại hình', 'Tình trạng', 'Trạng thái', 'Phân khu'].includes(key)
                      )
                      .map(key => (
                        <div key={key} className="group">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-accent transition-colors">{key}</div>
                          <div className="text-sm font-bold text-primary border-b border-gray-50 pb-2 group-hover:border-accent/20 transition-all">
                            {selectedUnit[key] || '-'}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-8 lg:p-12 border-t border-gray-50 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3 text-gray-400">
                  <Info className="w-5 h-5" />
                  <p className="text-xs font-medium italic">Dữ liệu được cập nhật thời gian thực từ hệ thống</p>
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {(() => {
                    const unitCode = String(selectedUnit['Mã căn'] || selectedUnit['Mã SP'] || '').trim();
                    const isSuccess = likedUnits.has(unitCode);
                    const isLoading = actionLoading === `${unitCode}-interest`;

                    return (
                      <button
                        onClick={(e) => handleUnitAction(selectedUnit, 'interest', e)}
                        disabled={isLoading}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                          isSuccess 
                            ? 'bg-red-50 text-red-500 border border-red-200' 
                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
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
                  
                  <button 
                    onClick={() => setSelectedUnit(null)}
                    className="flex-1 sm:flex-none px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-accent transition-all shadow-lg shadow-primary/10"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
