import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Share2, LayoutGrid, Home, File, Loader2, BarChart3, ExternalLink, MapPin, RefreshCw } from 'lucide-react';
import Tabs from '../components/Tabs';
import UnitDataTab from '../components/UnitDataTab';
import DocsTab from '../components/DocsTab';
import DashboardTab from '../components/DashboardTab';
import { getProjectConfig, clearConfigCache } from '../services/configService';
import { fetchConfiguredSheetData, clearCache } from '../services/googleSheets';
import { MASTER_SHEET_URL } from '../constants';
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
  const [docsSearchTerm, setDocsSearchTerm] = useState('');
  
  // Master data for all tabs
  const [masterData, setMasterData] = useState<any[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    
    if (tab) setActiveTab(tab);
  }, [location.search]);

  const handleNavigate = (tab: string, params?: any) => {
    setActiveTab(tab);
    if (params && typeof params === 'object') {
      if (params.filters || params.searchTerm) {
        if (params.filters) setFilters(params.filters);
        if (params.searchTerm) setDocsSearchTerm(params.searchTerm);
      } else {
        // Assume params is the filters object if no specific keys found
        setFilters(params);
      }
    }
    
    // Clear docs search term if navigating away from docs tab
    if (tab !== 'docs') {
      setDocsSearchTerm('');
    }
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
          ...config,
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
          headerMatrix: config.headerMatrix,
          standardHeaders: config.standardHeaders,
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

  const loadMasterData = useCallback(async (forceRefresh = false) => {
    if (!project?.name) return;
    
    try {
      setMasterLoading(true);
      // Use 12 hours persistent cache as requested for Overview tab
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      const data = await fetchConfiguredSheetData<any>(
        MASTER_SHEET_URL, 
        1, 2, 0, 
        undefined, 
        undefined, 
        forceRefresh ? 0 : TWELVE_HOURS
      );
      setMasterData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load master data:', err);
    } finally {
      setMasterLoading(false);
    }
  }, [project?.name]);

  useEffect(() => {
    if (project?.name && masterData.length === 0) {
      loadMasterData();
    }
  }, [project?.name, loadMasterData, masterData.length]);

  useEffect(() => {
    const handleTriggerRefresh = () => {
      clearCache();
      clearConfigCache();
      loadMasterData(true);
      // Dispatch success event for Navbar to update its timestamp
      window.dispatchEvent(new CustomEvent('sync-success'));
    };

    window.addEventListener('trigger-refresh', handleTriggerRefresh);
    return () => {
      window.removeEventListener('trigger-refresh', handleTriggerRefresh);
    };
  }, [loadMasterData]);

  if (loading || roleLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-accent/5">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-accent/5 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-display font-bold text-primary mb-4">{error || 'Không tìm thấy dự án'}</h2>
        <Link to="/" className="text-accent font-sans hover:underline">Quay lại danh sách dự án</Link>
      </div>
    );
  }

  return (
    <div className="bg-accent/5 min-h-screen pb-12">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex text-sm text-primary/50">
            <Link to="/" className="hover:text-primary font-display font-bold">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-primary font-sans">Chi tiết dự án</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-2 sm:space-y-3 w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <h1 className="text-xl sm:text-2xl font-display font-bold text-primary uppercase truncate">{project.name}</h1>
                <div className="flex items-center gap-2">
                  {project.sheetUrl && (
                    <a href={project.sheetUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-gold-600 transition-colors flex-shrink-0">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {/* {project.location && (
                  <div className="flex items-center gap-1.5 text-primary/50 text-xs sm:text-sm font-sans">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{project.location}</span>
                  </div>
                )} */}
                {project.location && (
                  <div className="flex items-center gap-1.5 text-primary/50 text-xs sm:text-sm font-sans">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{project.location}</span>
                  </div>
                )}
              </div>
            </div>
            <button className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-accent/10 hover:bg-accent/20 text-primary/80 rounded-xl text-sm font-display font-bold transition-colors">
              Chia sẻ <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-2xl shadow-sm border-x border-t border-gray-200 px-4 sm:px-6 pt-2 overflow-x-auto scrollbar-hide">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-2xl shadow-sm border-x border-b border-gray-200 p-4 sm:p-6 min-h-[500px]">
          {activeTab === 'overview' && (
            <DashboardTab 
              sheetUrl={project.sheetUrl || ''} 
              headerRow={project.headerRow}
              dataStartRow={project.dataStartRow}
              dataEndRow={project.dataEndRow}
              requiredFields={project.requiredFields}
              statsFields={project.statsFields}
              headerMatrix={project.headerMatrix}
              standardHeaders={project.standardHeaders}
              projectName={project.name}
              agents={project.agents}
              onNavigate={handleNavigate} 
              initialData={masterData}
              initialLoading={masterLoading}
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
              headerMatrix={project.headerMatrix}
              standardHeaders={project.standardHeaders}
              initialFilters={filters} 
              initialSearchTerm={new URLSearchParams(location.search).get('unitCode') || ''}
              projectName={project.name}
              projectId={project.id}
              onNavigate={handleNavigate}
              initialData={masterData}
              initialLoading={masterLoading}
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
              headerMatrix={project.headerMatrix}
              projectName={project.name}
              initialSearchTerm={docsSearchTerm}
              initialData={masterData}
              initialLoading={masterLoading}
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
                    <h3 className="text-xl font-bold text-primary">{sub.code}</h3>
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
