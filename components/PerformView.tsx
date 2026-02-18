import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import * as AudioStorage from '../services/audioStorage';
import { ArrowLeft, Settings, Minus, Plus, Music, Play, Pause, RotateCcw, Volume2, List, X, ChevronRight } from 'lucide-react';

interface PerformViewProps {
  song: Song;
  onBack: () => void;
  setlistContext?: {
    name: string;
    songs: Song[];
    onSongSelect: (song: Song) => void;
  };
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const PerformView: React.FC<PerformViewProps> = ({ song, onBack, setlistContext }) => {
  const [scrollSpeed, setScrollSpeed] = useState(0); 
  const [fontSize, setFontSize] = useState(18);
  const [showControls, setShowControls] = useState(true);
  const [showSetlistPanel, setShowSetlistPanel] = useState(false);
  const [transpose, setTranspose] = useState(0);
  
  // Audio State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const scrollInterval = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load Audio
  useEffect(() => {
    const loadAudio = async () => {
      setAudioUrl(null); // Reset first
      if (song.hasAudio) {
        try {
          const blob = await AudioStorage.getAudio(song.id);
          if (blob) {
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
          }
        } catch (e) { console.error("Audio load failed", e); }
      }
    };
    loadAudio();
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [song.id, song.hasAudio]);

  // Scroll Logic
  useEffect(() => {
    if (scrollSpeed > 0) {
      scrollInterval.current = window.setInterval(() => {
        window.scrollBy(0, 1);
      }, 50 - (scrollSpeed * 4)); 
    } else {
      if (scrollInterval.current) clearInterval(scrollInterval.current);
    }
    return () => { if (scrollInterval.current) clearInterval(scrollInterval.current); };
  }, [scrollSpeed]);

  // Transposition Logic
  const transposeChord = (chord: string, amount: number) => {
    return chord.replace(/[A-G][#b]?/g, (match) => {
      let note = match;
      // Normalize flats to sharps for simpler math
      const flats: Record<string, string> = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
      if (flats[note]) note = flats[note];

      let index = NOTES.indexOf(note);
      if (index === -1) return match;

      let newIndex = (index + amount) % 12;
      if (newIndex < 0) newIndex += 12;

      return NOTES[newIndex];
    });
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Handle ChordPro [Am]
      if (line.includes('[')) {
        const parts = line.split(/(\[.*?\])/g);
        return (
          <div key={i} className="leading-relaxed my-1">
            {parts.map((part, j) => {
              if (part.startsWith('[') && part.endsWith(']')) {
                const chord = part.replace(/[\[\]]/g, '');
                const transposed = transpose !== 0 ? transposeChord(chord, transpose) : chord;
                return <span key={j} className="text-secondary font-bold mr-1 select-none">{transposed}</span>;
              }
              return <span key={j}>{part}</span>;
            })}
          </div>
        );
      }
      
      // Handle Chords over Lyrics
      const isChordLine = /^[A-G][b#]?(m|maj|dim|aug|sus|add|7|9|11|13)*(\/[A-G][b#]?)?(\s+[A-G][b#]?(m|maj|dim|aug|sus|add|7|9|11|13)*(\/[A-G][b#]?)?)*\s*$/.test(line) && line.trim().length > 0 && line.length < 100;
      
      if (isChordLine) {
         const transposedLine = transpose !== 0 ? transposeChord(line, transpose) : line;
         return <div key={i} className="text-secondary font-bold mt-4 mb-0">{transposedLine}</div>;
      }
      return <div key={i} className="mb-1">{line}</div>;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 bg-surface/95 backdrop-blur-md z-40 px-4 py-3 flex items-center justify-between border-b border-slate-700 shadow-sm">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <ArrowLeft className="text-slate-300" />
            </button>
            {setlistContext && (
                <button 
                    onClick={() => setShowSetlistPanel(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
                >
                    <List size={16} />
                    <span className="hidden sm:inline font-medium">Setlist</span>
                </button>
            )}
        </div>
        
        <div className="text-center flex-1 mx-2 overflow-hidden">
          <h1 className="font-bold text-white text-lg truncate">{song.title}</h1>
          <p className="text-xs text-slate-400 truncate">{song.artist}</p>
        </div>
        
        <button 
          onClick={() => setShowControls(!showControls)}
          className={`p-2 rounded-full transition-colors ${showControls ? 'text-primary bg-primary/10' : 'text-slate-300 hover:bg-slate-700'}`}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div 
        ref={contentRef}
        className="pt-24 px-4 sm:px-8 max-w-3xl mx-auto font-mono whitespace-pre-wrap text-slate-200"
        style={{ fontSize: `${fontSize}px` }}
        onClick={() => setShowControls(!showControls)}
      >
        {formatContent(song.content)}
      </div>

      {/* Setlist Side Panel (Drawer) */}
      {setlistContext && (
        <>
            {/* Backdrop */}
            {showSetlistPanel && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity"
                    onClick={() => setShowSetlistPanel(false)}
                />
            )}
            
            {/* Drawer */}
            <div className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-surface border-r border-slate-700 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${showSetlistPanel ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                        <div>
                            <h3 className="font-bold text-white text-lg">{setlistContext.name}</h3>
                            <p className="text-xs text-slate-400">{setlistContext.songs.length} songs</p>
                        </div>
                        <button onClick={() => setShowSetlistPanel(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {setlistContext.songs.map((s, idx) => {
                            const isActive = s.id === song.id;
                            return (
                                <div 
                                    key={`${s.id}-${idx}`}
                                    onClick={() => {
                                        setlistContext.onSongSelect(s);
                                        // On mobile, maybe close drawer? Let's keep it open for rapid checking or add a setting.
                                        // For now, close it on mobile-ish widths, keep open on large? 
                                        // Safest UX: Close it so they can see the lyrics immediately.
                                        if (window.innerWidth < 768) setShowSetlistPanel(false);
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-primary/20 border border-primary/50' : 'hover:bg-slate-800 border border-transparent'}`}
                                >
                                    <span className={`text-sm font-mono w-6 text-center ${isActive ? 'text-primary font-bold' : 'text-slate-500'}`}>{idx + 1}</span>
                                    <div className="flex-1 overflow-hidden">
                                        <div className={`font-medium truncate ${isActive ? 'text-primary' : 'text-slate-200'}`}>{s.title}</div>
                                        <div className="text-xs text-slate-500 truncate">{s.artist}</div>
                                    </div>
                                    {isActive && <ChevronRight size={16} className="text-primary" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
      )}

      {/* Controls Overlay */}
      {showControls && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-700 p-4 z-50 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
           <div className="max-w-3xl mx-auto flex flex-col gap-4">
              
              {/* Audio Player (If available) */}
              {audioUrl && (
                <div className="bg-slate-800 rounded-lg p-2 border border-slate-700 flex items-center gap-4">
                   <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center bg-green-500 rounded-full text-white">
                      {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                   </button>
                   <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Music size={10} /> Offline Track</div>
                      <input 
                        type="range" min="0" max="100" defaultValue="0"
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                        onChange={(e) => { if(audioRef.current && audioRef.current.duration) audioRef.current.currentTime = (Number(e.target.value)/100) * audioRef.current.duration }}
                      />
                   </div>
                   <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
                </div>
              )}

              {/* Transpose Controls */}
              <div className="flex items-center justify-between bg-slate-800 rounded-lg p-2 px-3 border border-slate-700">
                 <span className="text-xs text-slate-400 font-bold uppercase">Transpose</span>
                 <div className="flex items-center gap-3">
                    <button onClick={() => setTranspose(t => t - 1)} className="p-1 hover:bg-slate-700 rounded text-slate-200"><Minus size={16}/></button>
                    <span className={`w-8 text-center font-bold ${transpose !== 0 ? 'text-secondary' : 'text-slate-500'}`}>
                      {transpose > 0 ? `+${transpose}` : transpose}
                    </span>
                    <button onClick={() => setTranspose(t => t + 1)} className="p-1 hover:bg-slate-700 rounded text-slate-200"><Plus size={16}/></button>
                 </div>
              </div>

              {/* Scroll & Size */}
              <div className="flex items-center justify-between gap-6">
                 <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs text-slate-400 uppercase font-bold whitespace-nowrap">Scroll</span>
                    <input 
                      type="range" min="0" max="10" step="1" value={scrollSpeed} 
                      onChange={(e) => setScrollSpeed(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                 </div>
                 
                 <div className="flex items-center gap-2">
                    <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="w-8 h-8 bg-slate-700 rounded text-white flex items-center justify-center"><Minus size={14} /></button>
                    <span className="text-sm font-bold text-white w-6 text-center">{fontSize}</span>
                    <button onClick={() => setFontSize(Math.min(48, fontSize + 2))} className="w-8 h-8 bg-slate-700 rounded text-white flex items-center justify-center"><Plus size={14} /></button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
