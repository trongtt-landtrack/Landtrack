import React, { useState } from 'react';
import { Heart, ExternalLink, MapPin, Flame, Clock, Loader2 } from 'lucide-react';
import { Project } from '../types';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

interface ProjectCardProps {
  project: Project;
  onToggleFavorite: (projectId: string, isFavorite: boolean) => void;
  onClick?: (projectId: string, e: React.MouseEvent) => void;
  key?: React.Key;
}

export default function ProjectCard({ project, onToggleFavorite, onClick }: ProjectCardProps) {
  const [loading, setLoading] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!auth.currentUser) {
      alert('Vui lòng đăng nhập để lưu dự án');
      return;
    }
    setLoading(true);
    try {
      const favoriteId = `${auth.currentUser.uid}_${project.id}`;
      if (project.isFavorite) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
      } else {
        await setDoc(doc(db, 'favorites', favoriteId), {
          uid: auth.currentUser.uid,
          projectId: project.id,
          timestamp: serverTimestamp()
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
    <div 
      className={cn(
        "bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full",
        onClick && "cursor-pointer"
      )}
      onClick={(e) => onClick && onClick(project.id, e)}
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={project.imageUrl} 
          alt={project.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        {/* Top Badges */}
        <div className="absolute top-4 left-4 z-10">
          <div className={cn(
            "px-3 py-1 text-[10px] font-black text-white uppercase tracking-widest rounded-full shadow-md",
            project.type === 'Cao Tầng' ? "bg-primary" : "bg-accent"
          )}>
            Dự án {project.type}
          </div>
        </div>
        
        <button 
          className="absolute top-4 right-4 text-white/90 hover:text-white z-10 drop-shadow-md p-2 rounded-full bg-black/20 backdrop-blur-sm"
          onClick={handleToggleFavorite}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Heart className={cn("h-6 w-6", project.isFavorite && "fill-current text-red-500")} />}
        </button>

        {/* Project Name over image */}
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <h3 className="text-white font-display font-black text-2xl drop-shadow-lg tracking-tight uppercase truncate">
            {project.name}
          </h3>
          <div className="flex items-center gap-1.5 text-white/80 text-xs font-sans mt-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
