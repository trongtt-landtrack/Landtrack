import React from 'react';
import { Building2, Home, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../types';

interface SidebarProps {
  projects: Project[];
  onProjectClick?: (projectId: string, e: React.MouseEvent) => void;
}

export default function Sidebar({ projects, onProjectClick }: SidebarProps) {
  const highRise = projects.filter(p => p.type === 'Cao Tầng' || p.type.toLowerCase().includes('cao'));
  const lowRise = projects.filter(p => p.type === 'Thấp Tầng' || p.type.toLowerCase().includes('thấp'));
  const favoriteProjects = projects.filter(p => p.isFavorite);

  const renderProjectLink = (project: Project) => {
    if (onProjectClick) {
      return (
        <button 
          onClick={(e) => onProjectClick(project.id, e)}
          className="text-sm text-gray-700 hover:text-blue-600 font-display font-bold uppercase hover:underline text-left w-full"
        >
          {project.name}
        </button>
      );
    }
    return (
      <Link to={`/projects/${project.id}`} className="text-sm text-gray-700 hover:text-blue-600 font-display font-bold uppercase hover:underline">
        {project.name}
      </Link>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-20">
      <div className="bg-blue-700 text-white font-display font-bold text-center py-3 uppercase tracking-wider">
        Dự án đang bán chạy
      </div>
      
      <div className="p-4">
        {highRise.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-blue-800 font-display font-bold mb-3 uppercase text-sm">
              <Building2 className="h-5 w-5 text-yellow-500" />
              Dự án Cao Tầng
            </h3>
            <ul className="space-y-2">
              {highRise.map(project => (
                <li key={project.id}>
                  {renderProjectLink(project)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {lowRise.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-blue-800 font-display font-bold mb-3 uppercase text-sm">
              <Home className="h-5 w-5 text-yellow-500" />
              Dự án Thấp Tầng
            </h3>
            <ul className="space-y-2">
              {lowRise.map(project => (
                <li key={project.id}>
                  {renderProjectLink(project)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {favoriteProjects.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-blue-800 font-display font-bold mb-3 uppercase text-sm">
              <Heart className="h-5 w-5 text-red-500 fill-current" />
              Dự án đang quan tâm
            </h3>
            <ul className="space-y-2">
              {favoriteProjects.map(project => (
                <li key={project.id}>
                  {renderProjectLink(project)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
