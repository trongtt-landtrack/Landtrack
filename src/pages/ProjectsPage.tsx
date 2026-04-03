import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Loader2, Filter, LayoutGrid, Home, Building2, MapPin, ChevronRight, X, Scale, ArrowRightLeft, Trash2, Database, ChevronUp, ChevronDown, MessageSquare, Heart, Share2 } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import Sidebar from '../components/Sidebar';
import ContactCard from '../components/ContactCard';
import GuestWarningModal from '../components/GuestWarningModal';
import { getProjectConfigs, clearConfigCache } from '../services/configService';
import { Project, UnitSearchResult } from '../types';
import { STANDARD_HEADERS } from '../constants';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { fetchConfiguredSheetData, clearCache } from '../services/googleSheets';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RequirePermission, usePermissions } from '../contexts/PermissionsContext';
import { useDebounce } from '../hooks/useDebounce';
import { motion, AnimatePresence } from 'motion/react';

export default function ProjectsPage() {
  const { user, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>(() => {
    // Khởi tạo từ cache nếu có để tránh màn hình trắng
    const cached = localStorage.getItem('cached_projects');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(projects.length === 0);
  const [error, setError] = useState<string | null>(null);
  
  const [searchMode, setSearchMode] = useState<'projects' | 'units'>('projects');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    developer: '',
    location: '',
    type: '',
    status: ''
  });

  // Global Unit Search State
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const debouncedUnitSearchTerm = useDebounce(unitSearchTerm, 500);
  const [landAreaMin, setLandAreaMin] = useState('');
  const [landAreaMax, setLandAreaMax] = useState('');
  const [constAreaMin, setConstAreaMin] = useState('');
  const [constAreaMax, setConstAreaMax] = useState('');
  const [unitSearchResults, setUnitSearchResults] = useState<UnitSearchResult[]>([]);
  const [isSearchingUnits, setIsSearchingUnits] = useState(false);
  const [unitSearchError, setUnitSearchError] = useState<string | null>(null);
  const [comparisonList, setComparisonList] = useState<UnitSearchResult[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const [totalUnitsInSystem, setTotalUnitsInSystem] = useState<number>(0);
  
  // Guest Warning Modal State
  const [showGuestWarning, setShowGuestWarning] = useState(false);

  const handleProjectClick = (projectId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (userRole !== 'guest') {
      navigate(`/projects/${projectId}`);
    } else {
      setShowGuestWarning(true);
    }
  };

  const handleUnitClick = (projectId: string, unitCode: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (userRole !== 'guest') {
      navigate(`/projects/${projectId}?tab=units&unitCode=${unitCode}`);
    } else {
      setShowGuestWarning(true);
    }
  };

  const loadData = useCallback(async (isSilent = false, forceRefresh = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      }

      // Load projects from config sheet with optional force refresh
      const configs = await getProjectConfigs(forceRefresh);
      
      // Fetch total units from master sheet for stats
      try {
        const MASTER_CLEAN_DATA_URL = 'https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/edit?gid=1093550895';
        const masterData = await fetchConfiguredSheetData<any>(MASTER_CLEAN_DATA_URL, 1, 2, 0);
        setTotalUnitsInSystem(masterData.length);
      } catch (e) {
        console.error('Failed to fetch master unit count:', e);
      }
      // Load favorites
      let favoriteProjectIds = new Set<string>();
      if (user) {
        try {
          const q = query(collection(db, 'favorites'), where('uid', '==', user.uid));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            if (!doc.data().unitCode) {
              favoriteProjectIds.add(doc.data().projectId);
            }
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'favorites');
        }
      }

      const formattedProjects: Project[] = configs.map((config) => {
        return {
          ...config,
          id: config.projectId,
          name: config.name || 'Unnamed Project',
          developer: config.developer || '',
          location: config.location || '',
          type: config.type || '',
          status: config.status || '',
          imageUrl: config.imageUrl || `https://picsum.photos/seed/${config.projectId}/600/400`,
          sheetUrl: config.sheetUrl || '',
          isHot: config.isHot,
          isFavorite: favoriteProjectIds.has(config.projectId),
        };
      });
      
      setProjects(formattedProjects);
      setError(null);
      
      // Lưu vào cache để dùng cho lần sau
      localStorage.setItem('cached_projects', JSON.stringify(formattedProjects));
      
      // Thông báo cho Navbar cập nhật thời gian
      window.dispatchEvent(new CustomEvent('sync-success'));
    } catch (err) {
      console.error('Failed to load projects:', err);
      if (!isSilent) {
        setError('Không thể tải danh sách dự án. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Lắng nghe sự kiện làm mới từ Navbar
    const handleTriggerRefresh = () => {
      // Khi nhấn nút Cập nhật, xóa cache và tải lại toàn bộ
      clearCache();
      clearConfigCache();
      loadData(true, true); // Làm mới ngầm với forceRefresh = true
    };

    window.addEventListener('trigger-refresh', handleTriggerRefresh);
    return () => window.removeEventListener('trigger-refresh', handleTriggerRefresh);
  }, [loadData]);

  const handleToggleFavorite = (projectId: string, isFavorite: boolean) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === projectId ? { ...p, isFavorite } : p);
      localStorage.setItem('cached_projects', JSON.stringify(updated));
      return updated;
    });
  };

  const developers = useMemo(() => Array.from(new Set(projects.map(p => p.developer))).filter(Boolean), [projects]);
  const locations = useMemo(() => Array.from(new Set(projects.map(p => p.location))).filter(Boolean), [projects]);
  const types = useMemo(() => Array.from(new Set(projects.map(p => p.type))).filter(Boolean), [projects]);
  const statuses = useMemo(() => Array.from(new Set(projects.map(p => p.status))).filter(Boolean), [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                            project.location.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesDeveloper = filters.developer === '' || project.developer === filters.developer;
      const matchesLocation = filters.location === '' || project.location === filters.location;
      const matchesType = filters.type === '' || project.type === filters.type;
      const matchesStatus = filters.status === '' || project.status === filters.status;
      
      return matchesSearch && matchesDeveloper && matchesLocation && matchesType && matchesStatus;
    });
  }, [projects, debouncedSearchTerm, filters]);

  const handleGlobalUnitSearch = useCallback(async (termOverride?: string) => {
    const term = termOverride !== undefined ? termOverride : unitSearchTerm;
    if (userRole === 'guest') {
      setShowGuestWarning(true);
      return;
    }
    if (!term && !landAreaMin && !landAreaMax && !constAreaMin && !constAreaMax) {
      setUnitSearchError('Vui lòng nhập từ khóa hoặc khoảng diện tích để tìm kiếm.');
      return;
    }

    try {
      setIsSearchingUnits(true);
      setUnitSearchError(null);
      
      // Use the Master Clean Data sheet for global search
      const MASTER_CLEAN_DATA_URL = 'https://docs.google.com/spreadsheets/d/1iwk49apyTY2SkkQEL6qRvFzuND9J5-0qFk4cIXzxg8M/edit?gid=1093550895';
      
      const data = await fetchConfiguredSheetData<any>(
        MASTER_CLEAN_DATA_URL,
        1, // headerRow
        2, // dataStartRow
        0, // dataEndRow
      );

      // Area keywords - Standardized to match HEADER_MATRIX in googleSheets.ts
      const landKeywords = ['DT Đất'];
      const constKeywords = ['DTXD'];

      // Helper to parse area values
      const getAreaValue = (unit: any, keywords: string[]) => {
        const key = Object.keys(unit).find(k => 
          keywords.includes(k)
        );
        if (!key) return null;
        const val = parseFloat(unit[key].toString().replace(',', '.').replace(/[^0-9.]/g, ''));
        return isNaN(val) ? null : val;
      };

      // Filter units from the master data
      const filteredResults: UnitSearchResult[] = data.filter(unit => {
        // Standardized identifier: "Mã căn" is the standard key from HEADER_MATRIX
        const unitCode = (unit['Mã căn'] || unit['Mã SP'] || unit['Mã căn hộ']) ? (unit['Mã căn'] || unit['Mã SP'] || unit['Mã căn hộ']).toString().trim() : '';
        
        if (!unitCode) return false;

        // Smart Search: Check all fields
        const unitText = Object.values(unit).join(' ').toLowerCase();
        const matchesTerm = !term || unitText.includes(term.toLowerCase());

        const landArea = getAreaValue(unit, landKeywords);
        const constArea = getAreaValue(unit, constKeywords);

        const matchesLandMin = !landAreaMin || (landArea !== null && landArea >= parseFloat(landAreaMin));
        const matchesLandMax = !landAreaMax || (landArea !== null && landArea <= parseFloat(landAreaMax));
        const matchesConstMin = !constAreaMin || (constArea !== null && constArea >= parseFloat(constAreaMin));
        const matchesConstMax = !constAreaMax || (constArea !== null && constArea <= parseFloat(constAreaMax));

        return matchesTerm && matchesLandMin && matchesLandMax && matchesConstMin && matchesConstMax;
      }).map(unit => {
        // Try to find the project name if it's in the master data
        // Use normalized keys from HEADER_MATRIX: 'ProjectName'
        const rawProjectName = unit['ProjectName'] || unit['Dự án'] || unit['Tên dự án'] || 'Dự án khác';
        const projectName = rawProjectName.toString().trim();
        
        // Try to find the projectId by matching the name with our projects list
        const normalizedSearchName = projectName.toLowerCase();
        const project = projects.find(p => {
          const pName = p.name.toLowerCase().trim();
          return pName === normalizedSearchName || 
                 normalizedSearchName.includes(pName) || 
                 pName.includes(normalizedSearchName);
        });

        // Fix potential swapped data for 'Loại hình' and 'TCBG' if detected
        let unitData = { ...unit };
        const loaiHinh = (unitData['Loại hình'] || '').toString();
        const tcbg = (unitData['TCBG'] || '').toString();
        
        // If 'Loại hình' looks like a handover standard and 'TCBG' looks like a product type, swap them
        const isLoaiHinhHandover = loaiHinh.toLowerCase().includes('thô') || 
                                  loaiHinh.toLowerCase().includes('bàn giao') || 
                                  loaiHinh.toLowerCase().includes('hoàn thiện');
        const isTCBGProductType = tcbg.toLowerCase().includes('shop') || 
                                  tcbg.toLowerCase().includes('căn hộ') || 
                                  tcbg.toLowerCase().includes('villa') || 
                                  tcbg.toLowerCase().includes('liền kề') ||
                                  tcbg.toLowerCase().includes('biệt thự');
        
        if (isLoaiHinhHandover && isTCBGProductType) {
          unitData['Loại hình'] = tcbg;
          unitData['TCBG'] = loaiHinh;
        }
        
        return {
          projectId: project?.id || 'unknown',
          projectName: project?.name || projectName,
          unitData: unitData
        };
      });

      setUnitSearchResults(filteredResults);
      if (filteredResults.length === 0) {
        setUnitSearchError('Không tìm thấy căn hộ nào phù hợp.');
      }
    } catch (err) {
      console.error('Global search failed:', err);
      setUnitSearchError('Có lỗi xảy ra trong quá trình tìm kiếm.');
    } finally {
      setIsSearchingUnits(false);
    }
  }, [unitSearchTerm, landAreaMin, landAreaMax, constAreaMin, constAreaMax, projects, userRole]);

  useEffect(() => {
    if (debouncedUnitSearchTerm.length >= 2) {
      handleGlobalUnitSearch(debouncedUnitSearchTerm);
    }
  }, [debouncedUnitSearchTerm, handleGlobalUnitSearch]);

  const toggleComparison = (result: UnitSearchResult) => {
    setComparisonList(prev => {
      const exists = prev.find(item => item.projectId === result.projectId && item.unitData['Mã căn'] === result.unitData['Mã căn']);
      if (exists) {
        return prev.filter(item => !(item.projectId === result.projectId && item.unitData['Mã căn'] === result.unitData['Mã căn']));
      }
      if (prev.length >= 4) {
        alert('Bạn chỉ có thể so sánh tối đa 4 căn hộ cùng lúc.');
        return prev;
      }
      return [...prev, result];
    });
  };

  const allComparisonKeys = useMemo(() => {
    // Use standard headers as the base for comparison to ensure alignment between different projects
    return STANDARD_HEADERS.filter(header => 
      comparisonList.some(item => item.unitData[header] !== undefined)
    );
  }, [comparisonList]);

  const sortedUnitResults = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return unitSearchResults;

    return [...unitSearchResults].sort((a, b) => {
      const getVal = (item: UnitSearchResult) => {
        const val = item.unitData[sortConfig.key];
        if (!val) return 0;
        // Clean numeric strings: "1.200.000.000" -> 1200000000
        const num = parseFloat(val.toString().replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      const valA = getVal(a);
      const valB = getVal(b);

      if (sortConfig.direction === 'asc') return valA - valB;
      return valB - valA;
    });
  }, [unitSearchResults, sortConfig]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-xl sm:text-[28px] font-display font-bold text-center text-primary mb-6 sm:mb-8 uppercase tracking-wider leading-tight px-2">
        DANH MỤC DỰ ÁN & QUỸ CĂN
      </h1>

      {/* Smart Search and Filters Block */}
      <div className="bg-white rounded-2xl shadow-lg border border-[#f9f4f4] p-4 sm:p-6 mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-6 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <button 
              onClick={() => setSearchMode('projects')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-display font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-1 sm:flex-none justify-center ${searchMode === 'projects' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              TÌM DỰ ÁN
            </button>
            {hasPermission('unit_search:view') && (
              <button 
                onClick={() => setSearchMode('units')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-display font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-1 sm:flex-none justify-center ${searchMode === 'units' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">TÌM CĂN HỘ (SMART SEARCH)</span>
                <span className="sm:hidden">TÌM CĂN HỘ</span>
              </button>
            )}
          </div>
          
          <div className="sm:ml-auto flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 w-full sm:w-auto justify-center">
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
              <span className="text-[10px] sm:text-xs font-display font-bold text-gray-600">
                TỔNG QUỸ CĂN: <span className="text-accent">{totalUnitsInSystem.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>

        {searchMode === 'projects' ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 sm:py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans sm:text-sm transition-all"
                  placeholder="Tìm tên dự án, khu vực..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 sm:py-2 border rounded-xl text-sm font-display font-bold transition-all flex items-center justify-center gap-2 ${showFilters ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              </button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
                <select 
                  className="block w-full pl-3 pr-10 py-3 sm:py-2 text-sm border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white font-sans"
                  value={filters.developer}
                  onChange={(e) => setFilters(prev => ({ ...prev, developer: e.target.value }))}
                >
                  <option value="">Chủ đầu tư</option>
                  {developers.map(dev => <option key={dev} value={dev}>{dev}</option>)}
                </select>

                <select 
                  className="block w-full pl-3 pr-10 py-3 sm:py-2 text-sm border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white font-sans"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                >
                  <option value="">Khu vực</option>
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>

                <select 
                  className="block w-full pl-3 pr-10 py-3 sm:py-2 text-sm border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white font-sans"
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="">Loại hình</option>
                  {types.map(type => <option key={type} value={type}>{type}</option>)}
                </select>

                <select 
                  className="block w-full pl-3 pr-10 py-3 sm:py-2 text-sm border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white font-sans"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Trạng thái</option>
                  {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 sm:py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans sm:text-sm transition-all"
                    placeholder="Nhập mã căn, phân khu, loại hình... (Tìm trên tất cả dự án)"
                    value={unitSearchTerm}
                    onChange={(e) => setUnitSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGlobalUnitSearch()}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-3 sm:py-2 border rounded-xl text-sm font-display font-bold transition-all flex items-center justify-center gap-2 ${showFilters ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <Filter className="w-4 h-4" />
                    {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                  </button>
                  <button
                    onClick={() => handleGlobalUnitSearch()}
                    disabled={isSearchingUnits}
                    className="px-6 py-3 sm:py-2 bg-gradient-gold text-white rounded-xl text-sm font-display font-bold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSearchingUnits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    TÌM KIẾM
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100">
                  <Database className="w-3.5 h-3.5 text-orange-600" />
                  <span className="text-[11px] font-display font-bold text-orange-900">
                    Hệ thống: {totalUnitsInSystem.toLocaleString()} căn
                  </span>
                </div>

                <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-display font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3 rotate-90" /> Sắp xếp:
                  </span>
                  {[
                    { label: 'Diện tích đất', key: 'DT Đất' },
                    { label: 'Giá gồm VAT', key: 'Giá gồm VAT' },
                    { label: 'Đơn giá/m2', key: 'Giá/m2' }
                  ].map((sort) => (
                    <button
                      key={sort.key}
                      onClick={() => {
                        setSortConfig(prev => ({
                          key: sort.key,
                          direction: prev.key === sort.key && prev.direction === 'asc' ? 'desc' : 'asc'
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-bold border transition-all flex items-center gap-1 ${sortConfig.key === sort.key ? 'bg-primary border-primary text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {sort.label}
                      {sortConfig.key === sort.key && (
                        <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-xs font-display font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Diện tích đất (m2)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Từ"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-sans focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      value={landAreaMin}
                      onChange={(e) => setLandAreaMin(e.target.value)}
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Đến"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-sans focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      value={landAreaMax}
                      onChange={(e) => setLandAreaMax(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-display font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Diện tích xây dựng (m2)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Từ"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-sans focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      value={constAreaMin}
                      onChange={(e) => setConstAreaMin(e.target.value)}
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Đến"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-sans focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      value={constAreaMax}
                      onChange={(e) => setConstAreaMax(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-4 pt-2">
              <button
                onClick={() => {
                  setUnitSearchTerm('');
                  setLandAreaMin('');
                  setLandAreaMax('');
                  setConstAreaMin('');
                  setConstAreaMax('');
                  setUnitSearchResults([]);
                  setUnitSearchError(null);
                  setSortConfig({ key: '', direction: null });
                }}
                className="text-xs font-display font-bold text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> XÓA TẤT CẢ BỘ LỌC
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className={searchMode === 'projects' ? "lg:col-span-3" : "lg:col-span-4"}>
          {searchMode === 'projects' ? (
            loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map(project => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onToggleFavorite={handleToggleFavorite} 
                      onClick={handleProjectClick}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    Không tìm thấy dự án nào phù hợp với bộ lọc.
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {isSearchingUnits ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-accent" />
                  <p className="text-gray-500 font-sans font-medium animate-pulse">Đang tìm kiếm trên tất cả dự án...</p>
                </div>
              ) : unitSearchError ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-500 font-sans">{unitSearchError}</p>
                </div>
              ) : unitSearchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-display font-bold text-primary">Kết quả tìm kiếm ({sortedUnitResults.length})</h2>
                    <button onClick={() => setUnitSearchResults([])} className="text-sm font-display font-bold text-accent hover:underline">Xóa kết quả</button>
                  </div>
                  <div className="flex flex-col gap-4">
                    {sortedUnitResults.map((result, idx) => {
                      const isComparing = comparisonList.some(item => item.projectId === result.projectId && item.unitData['Mã căn'] === result.unitData['Mã căn']);
                      
                      const getVal = (key1: string, key2: string = '') => {
                        const val = (result.unitData[key1] || result.unitData[key2] || '').toString().trim();
                        return (val.toUpperCase() === 'N/A' || val === '-' || val === '') ? '' : val;
                      };

                      const status = getVal('Tình trạng', 'Trạng thái');
                      const price = getVal('Giá gồm VAT', 'Giá');
                      const area = getVal('DT Đất', 'Diện tích');
                      const type = getVal('Loại hình');
                      const orientation = getVal('Hướng');
                      const agent = getVal('TÊN ĐL', 'ĐL');
                      const unitCode = getVal('Mã căn');

                      return (
                        <motion.div 
                          key={`${result.projectId}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group relative overflow-hidden flex flex-col lg:flex-row lg:items-center gap-4"
                        >
                          {/* Left: Basic Info */}
                          <div className="flex-shrink-0 lg:w-48 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black text-accent uppercase tracking-widest font-display truncate max-w-[120px]" title={result.projectName}>
                                {result.projectName}
                              </span>
                              <ChevronRight className="w-2.5 h-2.5 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-black text-primary font-display tracking-tight mb-2">
                              {unitCode}
                            </h3>
                            {status && (
                              <div className={`inline-flex self-start px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border font-display ${
                                status.toLowerCase().includes('trống') || status.toLowerCase().includes('mở') 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : status.toLowerCase().includes('cọc') || status.toLowerCase().includes('đã bán')
                                  ? 'bg-red-50 text-red-600 border-red-100'
                                  : 'bg-gray-50 text-gray-500 border-gray-100'
                              }`}>
                                {status}
                              </div>
                            )}
                          </div>

                          {/* Middle: Key Metrics */}
                          <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 py-3 lg:py-0 border-y lg:border-y-0 lg:border-x border-gray-50 px-0 lg:px-6">
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest font-display block">Giá niêm yết</span>
                              <span className="text-xs font-black text-accent font-display block truncate" title={price}>{price}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest font-display block">Diện tích</span>
                              <span className="text-xs font-black text-primary font-display block truncate" title={area ? `${area} m²` : ''}>{area ? `${area} m²` : ''}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest font-display block">Loại hình</span>
                              <span className="text-xs font-bold text-primary/70 font-display block truncate" title={type}>{type}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest font-display block">Hướng</span>
                              <span className="text-xs font-bold text-primary/70 font-display block truncate" title={orientation}>{orientation}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest font-display block">Đại lý</span>
                              <span className="text-xs font-bold text-primary/70 font-display block truncate" title={agent}>{agent}</span>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-row lg:flex-col items-center gap-2 lg:w-36 flex-shrink-0">
                            <div className="flex gap-1.5 flex-1 lg:w-full">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Logic copy zalo tương tự UnitDataTab
                                  const text = `[LANDTRACK] Thông tin căn hộ:\n- Dự án: ${result.projectName}\n- Mã căn: ${unitCode}\n- Giá: ${price}\n- Diện tích: ${area} m2\n- Trạng thái: ${status}`;
                                  navigator.clipboard.writeText(text);
                                  alert('Đã sao chép thông tin căn hộ!');
                                }}
                                className="flex-1 p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center border border-emerald-100"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleComparison(result);
                                }}
                                className={`flex-1 p-2 rounded-xl transition-all flex items-center justify-center border ${
                                  isComparing 
                                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                                    : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                                }`}
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                            </div>
                            <button 
                              onClick={(e) => {
                                if (result.projectId === 'unknown') {
                                  alert('Không tìm thấy thông tin chi tiết cho dự án này.');
                                  return;
                                }
                                handleUnitClick(result.projectId, result.unitData['Mã căn'] || '', e);
                              }}
                              className={`flex-1 lg:w-full py-2.5 rounded-xl bg-primary text-white text-[9px] font-black uppercase tracking-widest font-display shadow-md shadow-primary/10 hover:bg-accent transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                result.projectId === 'unknown' ? 'opacity-20 cursor-not-allowed' : ''
                              }`}
                            >
                              CHI TIẾT <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-sans">Nhập thông tin để bắt đầu tìm kiếm thông minh</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {searchMode === 'projects' && (
          <div className="lg:col-span-1">
            <Sidebar projects={projects} onProjectClick={handleProjectClick} />
          </div>
        )}
      </div>

      {/* Comparison Floating Bar */}
      {comparisonList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white shadow-2xl rounded-2xl border border-gray-200 p-4 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-display font-bold text-gray-900">So sánh căn hộ</p>
              <p className="text-[10px] text-gray-500 uppercase font-display font-bold tracking-wider">{comparisonList.length}/4 căn đã chọn</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {comparisonList.map((item, idx) => (
              <div key={idx} className="relative group">
                <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-[10px] font-display font-bold text-gray-600 overflow-hidden">
                  {item.unitData['Mã căn']?.toString().slice(-4) || '...'}
                </div>
                <button 
                  onClick={() => toggleComparison(item)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {Array.from({ length: 4 - comparisonList.length }).map((_, i) => (
              <div key={i} className="w-10 h-10 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                <Scale className="w-4 h-4 text-gray-300" />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-2">
            <button 
              onClick={() => setShowComparisonModal(true)}
              disabled={comparisonList.length < 2}
              className="px-6 py-2 bg-orange-600 text-white rounded-xl text-sm font-display font-bold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/20"
            >
              SO SÁNH NGAY
            </button>
            <button 
              onClick={() => setComparisonList([])}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Xóa tất cả"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setShowComparisonModal(false)} />
          <div className="relative bg-white w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-primary/10">
            {/* Header - CSS 9: height 160px */}
            <div className="h-[160px] p-8 border-b border-primary/5 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg">
                  <ArrowRightLeft className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-primary uppercase tracking-widest font-display">Bảng so sánh căn hộ</h2>
                  <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] mt-1 font-display">Đối chiếu thông tin chi tiết giữa các căn đã chọn</p>
                </div>
              </div>
              <button 
                onClick={() => setShowComparisonModal(false)}
                className="w-12 h-12 flex items-center justify-center hover:bg-primary/5 rounded-2xl transition-all duration-300 group"
              >
                <X className="w-6 h-6 text-primary/40 group-hover:text-primary transition-colors" />
              </button>
            </div>

            {/* Content - CSS 2: height 500px */}
            <div className="h-[500px] overflow-auto p-8 bg-gray-50/50">
              <div className="flex flex-col gap-px min-w-max bg-gray-100 rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Header Row */}
                <div className="flex bg-white">
                  {/* CSS 12: width 180px, height 100px */}
                  <div className="w-[200px] h-[120px] flex-shrink-0 flex items-center justify-center p-6 bg-gray-50/80 border-r border-gray-100">
                    <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest font-display">Thông tin đối chiếu</span>
                  </div>
                  {comparisonList.map((item, idx) => (
                    <div key={idx} className="w-[220px] h-[120px] flex-shrink-0 flex flex-col items-center justify-center p-6 border-r border-gray-100 last:border-r-0">
                      <div className="w-full text-center space-y-2">
                        <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest font-display inline-block">
                          {item.projectName}
                        </span>
                        <h4 className="text-lg font-black text-primary font-display truncate w-full" title={item.unitData['Mã căn'] as string}>
                          {item.unitData['Mã căn'] || `Căn ${idx + 1}`}
                        </h4>
                        <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider font-display">
                          <Building2 className="w-3 h-3" />
                          {item.unitData['Loại hình'] || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Data Rows */}
                {allComparisonKeys.map((key) => (
                  <div key={key} className="flex bg-white group hover:bg-accent/5 transition-colors duration-200">
                    {/* CSS 10, 13, 14: width 180px, height 100px */}
                    <div className="w-[200px] min-h-[80px] flex-shrink-0 flex items-center px-8 bg-gray-50/50 border-r border-gray-100">
                      <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest font-display leading-relaxed">{key}</span>
                    </div>
                    {comparisonList.map((item, idx) => {
                      const val = item.unitData[key];
                      const isDifferent = comparisonList.length > 1 && comparisonList.some(other => other.unitData[key] !== val);
                      const isPrice = key.toLowerCase().includes('giá');
                      
                      return (
                        <div 
                          key={idx} 
                          className={`w-[220px] min-h-[80px] flex-shrink-0 flex items-center justify-center p-8 text-center border-r border-gray-100 last:border-r-0 ${
                            isDifferent ? 'bg-accent/5' : ''
                          }`}
                        >
                          <span className={`text-sm font-sans leading-relaxed ${
                            isDifferent ? 'text-accent font-black' : 
                            isPrice ? 'text-primary font-black' : 
                            'text-slate-600 font-bold'
                          }`}>
                            {val?.toString() || '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer - CSS 3: height 150px */}
            <div className="h-[150px] p-8 border-t border-primary/5 bg-white flex items-center justify-between gap-6">
              <div className="flex flex-col">
                {/* CSS 7: width 200px */}
                <p className="w-[200px] text-[9px] font-black text-primary/30 uppercase tracking-widest font-display italic leading-relaxed">
                  * Thông tin so sánh mang tính chất tham khảo tại thời điểm hiện tại.
                </p>
              </div>
              {/* CSS 5: width 800px, height 50px */}
              <div className="w-[800px] h-[50px] flex items-center gap-4">
                {/* CSS 4: height 45px */}
                <button 
                  onClick={() => setComparisonList([])}
                  className="flex-1 h-[45px] px-6 bg-primary/5 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all duration-300 font-display"
                >
                  XÓA TẤT CẢ
                </button>
                {/* CSS 6: width 200px, height 45px */}
                <button 
                  onClick={() => {
                    const text = comparisonList.map(item => `${item.projectName} - ${item.unitData['Mã căn']}`).join('\n');
                    navigator.clipboard.writeText(text);
                    alert('Đã sao chép thông tin so sánh!');
                  }}
                  className="w-[200px] h-[45px] px-6 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all duration-300 shadow-lg shadow-accent/20 font-display"
                >
                  CHIA SẺ
                </button>
                {/* CSS 8: height 45px */}
                <button 
                  onClick={() => setShowComparisonModal(false)}
                  className="flex-1 h-[45px] px-8 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/20 font-display"
                >
                  ĐÓNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ContactCard />

      <GuestWarningModal 
        isOpen={showGuestWarning} 
        onClose={() => setShowGuestWarning(false)} 
      />
    </div>
  );
}
