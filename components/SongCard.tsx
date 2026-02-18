import React from 'react';
import { Song } from '../types';
import { Edit, Trash2, FileText } from 'lucide-react';

interface SongCardProps {
  song: Song;
  onEdit: (song: Song) => void;
  onOpen: (song: Song) => void;
  onDelete: (id: string) => void;
  compact?: boolean; // For setlist view
}

export const SongCard: React.FC<SongCardProps> = ({ song, onEdit, onOpen, onDelete, compact = false }) => {
  return (
    <div 
      onClick={() => onOpen(song)}
      className="bg-surface rounded-xl p-4 shadow-sm border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`flex-shrink-0 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
            <FileText size={compact ? 16 : 20} />
          </div>
          <div className="min-w-0">
            <h3 className={`font-bold text-white truncate ${compact ? 'text-sm' : 'text-lg'}`}>{song.title}</h3>
            <p className="text-slate-400 text-xs truncate">{song.artist}</p>
          </div>
        </div>
        
        {!compact && (
          <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity pl-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(song); }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
            >
              <Edit size={18} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(song.id); }}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-full transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
