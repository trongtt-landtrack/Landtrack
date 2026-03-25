import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Filter, LayoutGrid, Home, Building2, MapPin, ChevronRight, X } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import Sidebar from '../components/Sidebar';
import { getProjectConfigs } from '../services/configService';
import { Project, UnitSearchResult } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { fetchConfiguredSheetData } from '../services/googleSheets';
import { Link } from 'react-router-dom';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchMode, setSearchMode] = useState<'projects' | 'units'>('projects');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    developer: '',
    location: '',
    type: '',
    status: ''
  });

  // Global Unit Search State
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [landAreaMin, setLandAreaMin] = useState('');
  const [landAreaMax, setLandAreaMax] = useState('');
  const [constAreaMin, setConstAreaMin] = useState('');
  const [constAreaMax, setConstAreaMax] = useState('');
  const [unitSearchResults, setUnitSearchResults] = useState<UnitSearchResult[]>([]);
  const [isSearchingUnits, setIsSearchingUnits] = useState(false);
  const [unitSearchError, setUnitSearchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load projects from config sheet
        const configs = await getProjectConfigs();
        
        // Load favorites
        let favoriteProjectIds = new Set<string>();
        if (auth.currentUser) {
          try {
            const q = query(collection(db, 'favorites'), where('uid', '==', auth.currentUser.uid));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              favoriteProjectIds.add(doc.data().projectId);
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.LIST, 'favorites');
          }
        }

        const formattedProjects: Project[] = configs.map((config) => {
          return {
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
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Không thể tải danh sách dự án. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleFavorite = (projectId: string, isFavorite: boolean) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, isFavorite } : p));
  };

  const developers = useMemo(() => Array.from(new Set(projects.map(p => p.developer))).filter(Boolean), [projects]);
  const locations = useMemo(() => Array.from(new Set(projects.map(p => p.location))).filter(Boolean), [projects]);
  const types = useMemo(() => Array.from(new Set(projects.map(p => p.type))).filter(Boolean), [projects]);
  const statuses = useMemo(() => Array.from(new Set(projects.map(p => p.status))).filter(Boolean), [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            project.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDeveloper = filters.developer === '' || project.developer === filters.developer;
      const matchesLocation = filters.location === '' || project.location === filters.location;
      const matchesType = filters.type === '' || project.type === filters.type;
      const matchesStatus = filters.status === '' || project.status === filters.status;
      
      return matchesSearch && matchesDeveloper && matchesLocation && matchesType && matchesStatus;
    });
  }, [projects, searchTerm, filters]);

  const handleGlobalUnitSearch = async () => {
    if (!unitSearchTerm && !landAreaMin && !landAreaMax && !constAreaMin && !constAreaMax) {
      setUnitSearchError('Vui lòng nhập từ khóa hoặc khoảng diện tích để tìm kiếm.');
      return;
    }

    try {
      setIsSearchingUnits(true);
      setUnitSearchError(null);
      const allResults: UnitSearchResult[] = [];

      // Area keywords
      const landKeywords = ['DT Đất', 'Diện tích đất', 'DT Đất (m2)'];
      const constKeywords = ['DTCD', 'DTXD', 'Diện tích xây dựng', 'DTXD (m2)'];

      // Helper to parse area values
      const getAreaValue = (unit: any, keywords: string[]) => {
        const key = Object.keys(unit).find(k => 
          keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase()))
        );
        if (!key) return null;
        const val = parseFloat(unit[key].toString().replace(',', '.').replace(/[^0-9.]/g, ''));
        return isNaN(val) ? null : val;
      };

      // Iterate through all projects that have a sheetUrl
      const searchPromises = projects.filter(p => p.sheetUrl).map(async (project) => {
        try {
          const data = await fetchConfiguredSheetData<any>(
            project.sheetUrl!,
            project.headerRow || 1,
            project.dataStartRow || 2,
            project.dataEndRow || 0,
            project.requiredFields
          );

          // Filter units within this project
          const filteredUnits = data.filter(unit => {
            // Smart Search: Check all fields
            const unitText = Object.values(unit).join(' ').toLowerCase();
            const matchesTerm = !unitSearchTerm || unitText.includes(unitSearchTerm.toLowerCase());

            const landArea = getAreaValue(unit, landKeywords);
            const constArea = getAreaValue(unit, constKeywords);

            const matchesLandMin = !landAreaMin || (landArea !== null && landArea >= parseFloat(landAreaMin));
            const matchesLandMax = !landAreaMax || (landArea !== null && landArea <= parseFloat(landAreaMax));
            const matchesConstMin = !constAreaMin || (constArea !== null && constArea >= parseFloat(constAreaMin));
            const matchesConstMax = !constAreaMax || (constArea !== null && constArea <= parseFloat(constAreaMax));

            return matchesTerm && matchesLandMin && matchesLandMax && matchesConstMin && matchesConstMax;
          });

          return filteredUnits.map(unit => ({
            projectId: project.id,
            projectName: project.name,
            unitData: unit
          }));
        } catch (err) {
          console.error(`Error searching project ${project.name}:`, err);
          return [];
        }
      });

      const resultsArray = await Promise.all(searchPromises);
      resultsArray.forEach(results => allResults.push(...results));

      setUnitSearchResults(allResults);
      if (allResults.length === 0) {
        setUnitSearchError('Không tìm thấy căn hộ nào phù hợp.');
      }
    } catch (err) {
      console.error('Global search failed:', err);
      setUnitSearchError('Có lỗi xảy ra trong quá trình tìm kiếm.');
    } finally {
      setIsSearchingUnits(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-8 uppercase tracking-wider">
        Hệ thống quản lý dự án
      </h1>

      {/* Smart Search and Filters Block */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-10">
        <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
          <button 
            onClick={() => setSearchMode('projects')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${searchMode === 'projects' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            TÌM DỰ ÁN
          </button>
          <button 
            onClick={() => setSearchMode('units')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${searchMode === 'units' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Home className="w-4 h-4" />
            TÌM CĂN HỘ (SMART SEARCH)
          </button>
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
                  className="block w-full pl-10 pr-3 py-3 sm:py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                  placeholder="Tìm tên dự án, khu vực..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 sm:py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              </button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select 
                  className="block w-full pl-3 pr-10 py-3 sm:py-2 text-sm border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  value={filters.developer}
                  onChange={(e) => setFilters(prev => ({ ...prev, developer: e.target.value }))}
                >
                  <option value="">Chủ đầu tư</option>
                  {developers.map(dev => <option key={dev} value={dev}>{dev}</option>)}
                </select>

                <select 
                  className="block w-full pl-3 pr-10 py-3 sm:py-2 text-sm border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                >
                  <option value="">Khu vực</option>
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>

                <select 
                  className="block w-full pl-3 pr-10 py-3 sm:py-2 text-sm border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="">Loại hình</option>
                  {types.map(type => <option key={type} value={type}>{type}</option>)}
                </select>

                <select 
                  className="block w-full pl-3 pr-10 py-3 sm:py-2 text-sm border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 sm:py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                  placeholder="Nhập mã căn, phân khu, loại hình... (Tìm trên tất cả dự án)"
                  value={unitSearchTerm}
                  onChange={(e) => setUnitSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGlobalUnitSearch()}
                />
              </div>
              <button
                onClick={handleGlobalUnitSearch}
                disabled={isSearchingUnits}
                className="px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSearchingUnits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                TÌM KIẾM
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Diện tích đất (m2)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Từ"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={landAreaMin}
                    onChange={(e) => setLandAreaMin(e.target.value)}
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Đến"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={landAreaMax}
                    onChange={(e) => setLandAreaMax(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Diện tích xây dựng (m2)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Từ"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={constAreaMin}
                    onChange={(e) => setConstAreaMin(e.target.value)}
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Đến"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={constAreaMax}
                    onChange={(e) => setConstAreaMax(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setUnitSearchTerm('');
                  setLandAreaMin('');
                  setLandAreaMax('');
                  setConstAreaMin('');
                  setConstAreaMax('');
                  setUnitSearchResults([]);
                  setUnitSearchError(null);
                }}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> XÓA TẤT CẢ BỘ LỌC
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {searchMode === 'projects' ? (
            loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map(project => (
                    <ProjectCard key={project.id} project={project} onToggleFavorite={handleToggleFavorite} />
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
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  <p className="text-gray-500 font-medium animate-pulse">Đang tìm kiếm trên tất cả dự án...</p>
                </div>
              ) : unitSearchError ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-500">{unitSearchError}</p>
                </div>
              ) : unitSearchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold text-gray-900">Kết quả tìm kiếm ({unitSearchResults.length})</h2>
                    <button onClick={() => setUnitSearchResults([])} className="text-sm text-blue-600 hover:underline">Xóa kết quả</button>
                  </div>
                  {unitSearchResults.map((result, idx) => (
                    <Link 
                      key={`${result.projectId}-${idx}`}
                      to={`/projects/${result.projectId}?tab=units&unitCode=${result.unitData['Mã căn'] || ''}`}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">
                            {result.projectName}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {result.unitData['Mã căn'] || 'N/A'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                          {Object.entries(result.unitData).slice(0, 8).map(([key, val]) => (
                            <div key={key} className="text-[11px]">
                              <span className="text-gray-400">{key}:</span> <span className="text-gray-700 font-medium">{val as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                        CHI TIẾT <ChevronRight className="w-4 h-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nhập thông tin để bắt đầu tìm kiếm thông minh</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Sidebar projects={projects} />
        </div>
      </div>
    </div>
  );
}
