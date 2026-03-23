import React, { useState } from 'react';
import { Heart, ExternalLink, MapPin, Flame, Clock, Loader2 } from 'lucide-react';
import { Project } from '../types';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface ProjectCardProps {
  project: Project;
  onToggleFavorite: (projectId: string, isFavorite: boolean) => void;
  key?: React.Key;
}

export default function ProjectCard({ project, onToggleFavorite }: ProjectCardProps) {
  const [loading, setLoading] = useState(false);

  const handleToggleFavorite = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const favoriteId = `${auth.currentUser.uid}_${project.id}`;
      if (project.isFavorite) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
      } else {
        await setDoc(doc(db, 'favorites', favoriteId), {
          uid: auth.currentUser.uid,
          projectId: project.id
        });
      }
      onToggleFavorite(project.id, !project.isFavorite);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={project.imageUrl} 
          alt={project.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 to-transparent"></div>
        
        {/* Top Badges */}
        <div className="absolute top-3 left-0 flex flex-col gap-2">
          <span className={cn(
            "px-3 py-1 text-xs font-bold text-white uppercase rounded-r-md shadow-sm",
            project.type === 'Cao Tầng' ? "bg-blue-600" : "bg-orange-500"
          )}>
            Dự án {project.type}
          </span>
        </div>
        
        <button 
          className="absolute top-3 right-3 text-white/80 hover:text-white"
          onClick={handleToggleFavorite}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Heart className={cn("h-6 w-6", project.isFavorite && "fill-current text-red-500")} />}
        </button>

        {/* Bottom Badges */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          {project.isHot && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded shadow-sm">
              <Flame className="h-3 w-3" /> HOT
            </span>
          )}
          {project.status === 'Sắp mở bán' && (
            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded shadow-sm">
              <Clock className="h-3 w-3" /> Sắp mở bán
            </span>
          )}
        </div>
        
        <h3 className="absolute bottom-10 left-0 w-full text-center text-white font-bold text-xl uppercase tracking-wider drop-shadow-md">
          {project.name}
        </h3>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Link to={`/projects/${project.id}`} className="font-bold text-lg text-gray-900 hover:text-blue-600 line-clamp-1">
            {project.name}
          </Link>
          <Link to={`/projects/${project.id}`} className="text-gray-400 hover:text-blue-600">
            <ExternalLink className="h-5 w-5" />
          </Link>
        </div>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">
          {project.developer}
        </p>
        <div className="flex items-start gap-1 text-xs text-gray-500">
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{project.location}</span>
        </div>
      </div>
    </div>
  );
}
