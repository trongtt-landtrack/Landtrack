import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import Sidebar from '../components/Sidebar';
import { getProjectConfigs } from '../services/configService';
import { Project } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    developer: '',
    location: '',
    type: '',
    status: ''
  });

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-8 uppercase tracking-wider">
        Danh sách dự án
      </h1>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Tìm kiếm dự án..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </button>
        </div>
        
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <select 
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filters.developer}
              onChange={(e) => setFilters(prev => ({ ...prev, developer: e.target.value }))}
            >
              <option value="">Chọn chủ đầu tư</option>
              {developers.map(dev => <option key={dev} value={dev}>{dev}</option>)}
            </select>

            <select 
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            >
              <option value="">Chọn khu vực</option>
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>

            <select 
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="">Chọn loại hình</option>
              {types.map(type => <option key={type} value={type}>{type}</option>)}
            </select>

            <select 
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Chọn trạng thái</option>
              {statuses.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {loading ? (
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
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 hidden lg:block">
          <Sidebar projects={projects} />
        </div>
      </div>
    </div>
  );
}
