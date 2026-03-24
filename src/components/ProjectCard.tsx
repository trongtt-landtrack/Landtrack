import React, { useState } from 'react';
import { Heart, ExternalLink, MapPin, Flame, Clock, Loader2 } from 'lucide-react';
import { Project } from '../types';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

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
      handleFirestoreError(err, project.isFavorite ? OperationType.DELETE : OperationType.CREATE, 'favorites');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
      <div className="relative h-56 overflow-hidden">
        <img 
          src={project.imageUrl} 
          alt={project.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        {/* Top Badges - Ribbon style */}
        <div className="absolute top-4 -left-2 z-10">
          <div className={cn(
            "px-4 py-1.5 text-sm font-bold text-white uppercase rounded-r shadow-md relative",
            project.type === 'Cao Tầng' ? "bg-blue-600" : "bg-[#e58c22]"
          )}>
            Dự án {project.type}
            {/* Ribbon fold */}
            <div className={cn(
              "absolute -bottom-2 left-0 w-2 h-2",
              project.type === 'Cao Tầng' ? "bg-blue-800" : "bg-[#b36d1a]"
            )} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}></div>
          </div>
        </div>
        
        <button 
          className="absolute top-4 right-4 text-white/90 hover:text-white z-10 drop-shadow-md"
          onClick={handleToggleFavorite}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Heart className={cn("h-7 w-7", project.isFavorite && "fill-current text-red-500")} />}
        </button>

        {/* Project Name over image - right aligned */}
        <div className="absolute top-1/4 right-4 text-right z-10 max-w-[80%]">
          {(() => {
            const name = project.name.toUpperCase();
            if (name.startsWith('VINHOMES ')) {
              return (
                <>
                  <div className="text-white font-bold text-lg drop-shadow-md tracking-wide">VINHOMES</div>
                  <div className="text-white font-black text-3xl drop-shadow-lg tracking-wide">{name.substring(9)}</div>
                </>
              );
            } else if (name.startsWith('VINHOME ')) {
              return (
                <>
                  <div className="text-white font-bold text-lg drop-shadow-md tracking-wide">VINHOME</div>
                  <div className="text-white font-black text-3xl drop-shadow-lg tracking-wide">{name.substring(8)}</div>
                </>
              );
            } else if (name.startsWith('VINHOME')) {
              return (
                <>
                  <div className="text-white font-bold text-lg drop-shadow-md tracking-wide">VINHOME</div>
                  <div className="text-white font-black text-3xl drop-shadow-lg tracking-wide">{name.substring(7)}</div>
                </>
              );
            }
            return <div className="text-white font-black text-2xl drop-shadow-lg tracking-wide uppercase">{name}</div>;
          })()}
        </div>

        {/* Bottom Badges */}
        <div className="absolute bottom-0 left-0 w-full flex justify-between items-end">
          <div className="p-3">
            {project.isHot && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff3b30] text-white text-xs font-bold rounded-full shadow-sm">
                <Flame className="h-3.5 w-3.5" /> HOT
              </span>
            )}
          </div>
          <div>
            {project.status === 'Sắp mở bán' && (
              <span className="flex items-center gap-1.5 px-4 py-1.5 bg-[#fce79a] text-[#b48000] text-sm font-bold rounded-tl-lg shadow-sm">
                <Clock className="h-4 w-4" /> Sắp mở bán
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <Link to={`/projects/${project.id}`} className="font-bold text-xl text-gray-900 hover:text-blue-600 line-clamp-1 uppercase">
            {project.name}
          </Link>
          <Link to={`/projects/${project.id}`} className="text-[#d99b28] hover:text-[#b36d1a] flex-shrink-0 ml-3">
            <ExternalLink className="h-5 w-5" />
          </Link>
        </div>
        
        {project.slogan ? (
          <p className="text-base text-gray-800 mb-3 line-clamp-2">
            {project.slogan}
          </p>
        ) : (
          <p className="text-base text-gray-800 mb-3 line-clamp-2">
            {project.developer}
          </p>
        )}
        
        <div className="flex items-start gap-1.5 text-sm text-gray-500 mt-auto pt-2">
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed">{project.location}</span>
        </div>
      </div>
    </div>
  );
}
