import { Building2, Home, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../types';

interface SidebarProps {
  projects: Project[];
}

export default function Sidebar({ projects }: SidebarProps) {
  const highRise = projects.filter(p => p.type === 'Cao Tầng' || p.type.toLowerCase().includes('cao'));
  const lowRise = projects.filter(p => p.type === 'Thấp Tầng' || p.type.toLowerCase().includes('thấp'));
  const hotProjects = projects.filter(p => p.isHot);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-20">
      <div className="bg-blue-700 text-white font-bold text-center py-3 uppercase tracking-wider">
        Dự án đang bán chạy
      </div>
      
      <div className="p-4">
        {highRise.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-blue-800 font-bold mb-3 uppercase text-sm">
              <Building2 className="h-5 w-5 text-yellow-500" />
              Dự án Cao Tầng
            </h3>
            <ul className="space-y-2">
              {highRise.map(project => (
                <li key={project.id}>
                  <Link to={`/projects/${project.id}`} className="text-sm text-gray-700 hover:text-blue-600 font-medium uppercase hover:underline">
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lowRise.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-blue-800 font-bold mb-3 uppercase text-sm">
              <Home className="h-5 w-5 text-yellow-500" />
              Dự án Thấp Tầng
            </h3>
            <ul className="space-y-2">
              {lowRise.map(project => (
                <li key={project.id}>
                  <Link to={`/projects/${project.id}`} className="text-sm text-gray-700 hover:text-blue-600 font-medium uppercase hover:underline">
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hotProjects.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-blue-800 font-bold mb-3 uppercase text-sm">
              <Star className="h-5 w-5 text-yellow-500" />
              Dự án Nổi bật
            </h3>
            <ul className="space-y-2">
              {hotProjects.slice(0, 5).map(project => (
                <li key={project.id}>
                  <Link to={`/projects/${project.id}`} className="text-sm text-gray-700 hover:text-blue-600 font-medium uppercase hover:underline">
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
