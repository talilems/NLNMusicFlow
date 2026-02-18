import React, { useState, useEffect, useRef } from 'react';
import { Song, Setlist, ViewState } from './types';
import * as StorageService from './services/storageService';
import * as AudioStorage from './services/audioStorage';
import * as GeminiService from './services/geminiService';
import { SongCard } from './components/SongCard';
import { PerformView } from './components/PerformView';
import { 
  Library, ListMusic, Plus, Search, Upload, Loader2, Save, ArrowLeft,
  Trash2, X, CheckCircle, Edit2, Sparkles, Music, Globe, ExternalLink
} from 'lucide-react';

const App: React.FC = () => {
  // --- Global State ---
  const [view, setView] = useState<ViewState>(ViewState.LIBRARY);
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  
  // --- Active Item State ---
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [activeSetlist, setActiveSetlist] = useState<Setlist | null>(null);
  
  // --- UI State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [showCreateSetlistModal, setShowCreateSetlistModal] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [renamingSetlistId, setRenamingSetlistId] = useState<string | null>(null);
  const [renameSetlistName, setRenameSetlistName] = useState('');
  
  // AI Search State
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState('');

  // --- Song Editor State ---
  const [editorId, setEditorId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorArtist, setEditorArtist] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null); // For uploading new audio
  const [hasExistingAudio, setHasExistingAudio] = useState(false);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    setSongs(StorageService.getSongs());
    setSetlists(StorageService.getSetlists());
  }, []);

  // =========================================================================
  // LOGIC: Songs
  // =========================================================================

  const handleSaveSong = async () => {
    if (!editorTitle) return;
    
    const id = editorId || Date.now().toString();
    const isNew = !editorId;

    // Save Audio if selected
    let hasAudio = hasExistingAudio;
    if (audioFile) {
       await AudioStorage.saveAudio(id, audioFile);
       hasAudio = true;
    }

    const newSong: Song = {
      id,
      title: editorTitle,
      artist: editorArtist || 'Unknown Artist',
      content: editorContent,
      hasAudio: hasAudio,
      createdAt: isNew ? Date.now() : (songs.find(s => s.id === id)?.createdAt || Date.now())
    };
    
    StorageService.saveSong(newSong);
    setSongs(StorageService.getSongs());
    resetSongEditor();
    setView(ViewState.LIBRARY);
  };

  const resetSongEditor = () => {
    setEditorTitle('');
    setEditorArtist('');
    setEditorContent('');
    setEditorId(null);
    setAudioFile(null);
    setHasExistingAudio(false);
  };

  const handleEditSong = (song: Song) => {
    setEditorId(song.id);
    setEditorTitle(song.title);
    setEditorArtist(song.artist);
    setEditorContent(song.content);
    setHasExistingAudio(!!song.hasAudio);
    setAudioFile(null);
    setView(ViewState.EDITOR);
  };

  const handleDeleteSong = (id: string) => {
    if (confirm('Are you sure you want to delete this song?')) {
      StorageService.deleteSong(id);
      AudioStorage.deleteAudio(id); // Delete associated audio
      setSongs(StorageService.getSongs());
      // Update setlists
      const updatedSetlists = StorageService.getSetlists().map(sl => ({
        ...sl,
        songIds: sl.songIds.filter(sId => sId !== id)
      }));
      updatedSetlists.forEach(sl => StorageService.saveSetlist(sl));
      setSetlists(updatedSetlists);
    }
  };

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) return;
    setIsImporting(true);
    setShowAiSearch(false);
    try {
      const result = await GeminiService.findSong(aiSearchQuery);
      setEditorTitle(result.title);
      setEditorArtist(result.artist);
      setEditorContent(result.content);
      setView(ViewState.EDITOR);
    } catch (error) {
      alert('Could not find exact song. Opening editor for you to add manually.');
      setEditorTitle(aiSearchQuery);
      setView(ViewState.EDITOR);
    } finally {
      setIsImporting(false);
      setAiSearchQuery('');
    }
  };

  const handleManualWebSearch = () => {
      const query = editorTitle ? `${editorTitle} ${editorArtist} chords lyrics` : 'worship song chords lyrics';
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  // =========================================================================
  // LOGIC: Setlists (Same as before)
  // =========================================================================

  const openCreateSetlistModal = () => { setNewSetlistName(''); setShowCreateSetlistModal(true); };
  const finalizeCreateSetlist = () => {
    if (!newSetlistName.trim()) return;
    const newSetlist: Setlist = { id: Date.now().toString(), name: newSetlistName.trim(), songIds: [], createdAt: Date.now() };
    StorageService.saveSetlist(newSetlist);
    setSetlists(StorageService.getSetlists());
    setActiveSetlist(newSetlist);
    setShowCreateSetlistModal(false);
    setView(ViewState.SETLIST_DETAIL);
  };
  const handleDeleteSetlist = (id: string) => {
    if (confirm('Delete this setlist?')) {
      StorageService.deleteSetlist(id);
      setSetlists(StorageService.getSetlists());
      if (activeSetlist?.id === id) { setActiveSetlist(null); setView(ViewState.SETLISTS); }
    }
  };
  const handleUpdateSetlistName = (name: string) => {
    if (!activeSetlist) return;
    const updated = { ...activeSetlist, name };
    setActiveSetlist(updated);
    StorageService.saveSetlist(updated);
    setSetlists(StorageService.getSetlists());
  };
  const openRenameSetlistModal = (setlist: Setlist) => { setRenamingSetlistId(setlist.id); setRenameSetlistName(setlist.name); };
  const finalizeRenameSetlist = () => {
    if (!renamingSetlistId || !renameSetlistName.trim()) return;
    const setlistToUpdate = setlists.find(s => s.id === renamingSetlistId);
    if (setlistToUpdate) {
        const updated = { ...setlistToUpdate, name: renameSetlistName.trim() };
        StorageService.saveSetlist(updated);
        setSetlists(StorageService.getSetlists());
    }
    setRenamingSetlistId(null);
  };
  const handleAddSongToSetlist = (songId: string) => {
    if (!activeSetlist || activeSetlist.songIds.includes(songId)) return;
    const updated = { ...activeSetlist, songIds: [...activeSetlist.songIds, songId] };
    setActiveSetlist(updated);
    StorageService.saveSetlist(updated);
    setSetlists(StorageService.getSetlists());
  };
  const handleRemoveSongFromSetlist = (songId: string) => {
    if (!activeSetlist) return;
    const updated = { ...activeSetlist, songIds: activeSetlist.songIds.filter(id => id !== songId) };
    setActiveSetlist(updated);
    StorageService.saveSetlist(updated);
    setSetlists(StorageService.getSetlists());
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const result = await GeminiService.extractSongData(base64String, file.type, null);
          setEditorTitle(result.title);
          setEditorArtist(result.artist);
          setEditorContent(result.content);
          setView(ViewState.EDITOR);
        } catch (error) { alert('Failed to analyze file.'); } finally { setIsImporting(false); }
      };
      reader.readAsDataURL(file);
    } catch (error) { setIsImporting(false); }
  };

  // =========================================================================
  // RENDERERS
  // =========================================================================

  const renderLibrary = () => {
    const filteredSongs = songs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artist.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="p-4 sm:p-6 pb-24 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Song Library</h1>
            <p className="text-slate-400 text-sm">{songs.length} songs</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
             <button onClick={() => setShowAiSearch(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-purple-900/20">
               <Globe size={18} /> <span className="text-sm">Web Search</span>
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-surface hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-lg border border-slate-700 transition-colors">
               {isImporting ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18} />} <span className="text-sm">Import</span>
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleImportFile} />
             <button onClick={() => { resetSongEditor(); setView(ViewState.EDITOR); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors">
               <Plus size={18} /> <span className="text-sm">New</span>
             </button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3.5 text-slate-500" size={20} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search songs..." className="w-full bg-surface border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary placeholder:text-slate-600"/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSongs.map(song => (
            <SongCard key={song.id} song={song} onEdit={handleEditSong} onDelete={handleDeleteSong} onOpen={(s) => { setActiveSong(s); setView(ViewState.PERFORM); }} />
          ))}
          {filteredSongs.length === 0 && <div className="col-span-full text-center py-20 text-slate-500">No songs found.</div>}
        </div>
      </div>
    );
  };

  const renderEditor = () => (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setView(ViewState.LIBRARY)} className="flex items-center text-slate-400 hover:text-white"><ArrowLeft className="mr-2" size={20} /> Cancel</button>
        <h2 className="text-xl font-bold text-white">{editorId ? 'Edit Song' : 'New Song'}</h2>
        <button onClick={handleSaveSong} disabled={!editorTitle} className="flex items-center gap-2 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"><Save size={18} /> Save</button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Title</label>
            <input value={editorTitle} onChange={(e) => setEditorTitle(e.target.value)} className="w-full bg-surface border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary" placeholder="Song Title"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Artist</label>
            <input value={editorArtist} onChange={(e) => setEditorArtist(e.target.value)} className="w-full bg-surface border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary" placeholder="Artist Name"/>
          </div>
        </div>

        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Offline Audio</label>
           <div className="flex items-center gap-4 bg-surface border border-slate-700 rounded-lg p-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                 <Music size={20} />
              </div>
              <div className="flex-1 overflow-hidden">
                 {audioFile ? (
                    <p className="text-sm text-green-400 truncate font-medium">New file selected: {audioFile.name}</p>
                 ) : hasExistingAudio ? (
                    <p className="text-sm text-white font-medium">Has offline audio track</p>
                 ) : (
                    <p className="text-sm text-slate-500">No audio attached</p>
                 )}
              </div>
              <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">
                 {hasExistingAudio || audioFile ? 'Replace' : 'Upload MP3'}
                 <input type="file" accept="audio/*" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
              </label>
           </div>
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-end mb-1">
             <label className="block text-xs font-bold text-slate-400 uppercase">Lyrics & Chords</label>
             <button onClick={handleManualWebSearch} className="flex items-center gap-1 text-xs text-primary hover:text-blue-400 transition-colors font-bold">
                <ExternalLink size={12} /> Search on Google
             </button>
          </div>
          <div className="bg-slate-800/50 p-2 rounded-t-lg border-x border-t border-slate-700 text-xs text-slate-400 flex flex-wrap gap-4">
             <span>Tip: Paste lyrics here. Use <b>[Am]</b> brackets for best transposition.</span>
          </div>
          <textarea value={editorContent} onChange={(e) => setEditorContent(e.target.value)} className="w-full h-[50vh] bg-surface border border-slate-700 rounded-b-lg p-4 font-mono text-sm leading-relaxed text-slate-200 focus:outline-none focus:border-primary" placeholder="[Am] Hello darkness my old [G] friend"/>
        </div>
      </div>
    </div>
  );

  const renderSetlists = () => (
    <div className="p-4 sm:p-6 pb-24 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-white">Setlists</h1><p className="text-slate-400 text-sm">{setlists.length} setlists</p></div>
        <button onClick={openCreateSetlistModal} className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"><Plus size={18} /> New Setlist</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {setlists.map(setlist => (
          <div key={setlist.id} onClick={() => { setActiveSetlist(setlist); setView(ViewState.SETLIST_DETAIL); }} className="bg-surface rounded-xl p-6 border border-slate-700 hover:border-primary/50 cursor-pointer group transition-all">
            <div className="flex justify-between items-start mb-4">
               <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400"><ListMusic size={24} /></div>
               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={(e) => { e.stopPropagation(); openRenameSetlistModal(setlist); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"><Edit2 size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSetlist(setlist.id); }} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-full"><Trash2 size={18} /></button>
               </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1 truncate">{setlist.name}</h3>
            <p className="text-slate-400">{setlist.songIds.length} songs</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSetlistDetail = () => {
    if (!activeSetlist) return null;
    const setlistSongs = activeSetlist.songIds.map(id => songs.find(s => s.id === id)).filter(s => s !== undefined) as Song[];
    return (
      <div className="p-4 sm:p-6 pb-24 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => setView(ViewState.SETLISTS)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><ArrowLeft size={24} /></button>
           <div className="flex-1">
              <input value={activeSetlist.name} onChange={(e) => handleUpdateSetlistName(e.target.value)} className="bg-transparent text-2xl font-bold text-white focus:outline-none focus:border-b border-primary w-full" placeholder="Setlist Name"/>
              <p className="text-slate-400 text-sm mt-1">{setlistSongs.length} songs</p>
           </div>
           <button onClick={() => setShowSongPicker(true)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add Songs</button>
        </div>
        <div className="space-y-2">
           {setlistSongs.map((song, index) => (
              <div key={`${song.id}-${index}`} className="flex items-center gap-3 bg-surface p-3 rounded-xl border border-slate-700 group">
                 <div className="text-slate-500 font-mono w-6 text-center text-sm">{index + 1}</div>
                 <div className="flex-1 cursor-pointer" onClick={() => { setActiveSong(song); setView(ViewState.PERFORM); }}>
                    <h4 className="font-bold text-white">{song.title}</h4>
                    <p className="text-xs text-slate-400">{song.artist}</p>
                 </div>
                 <button onClick={() => handleRemoveSongFromSetlist(song.id)} className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
           ))}
        </div>
        {/* Song Picker Reuse */}
        {showSongPicker && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-surface w-full max-w-md max-h-[80vh] rounded-2xl border border-slate-700 flex flex-col shadow-2xl">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center"><h3 className="font-bold text-white">Add Songs</h3><button onClick={() => setShowSongPicker(false)} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
                <div className="p-2 overflow-y-auto flex-1">
                   {songs.map(song => {
                      const isAdded = activeSetlist.songIds.includes(song.id);
                      return (
                        <div key={song.id} onClick={() => isAdded ? handleRemoveSongFromSetlist(song.id) : handleAddSongToSetlist(song.id)} className={`p-3 rounded-lg flex items-center justify-between cursor-pointer mb-1 ${isAdded ? 'bg-primary/20 border border-primary/50' : 'hover:bg-slate-800 border border-transparent'}`}>
                           <div><div className={`font-medium ${isAdded ? 'text-primary' : 'text-white'}`}>{song.title}</div><div className="text-xs text-slate-500">{song.artist}</div></div>
                           {isAdded && <CheckCircle size={18} className="text-primary" />}
                        </div>
                      );
                   })}
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  if (view === ViewState.PERFORM && activeSong) {
    let setlistContext = undefined;
    if (activeSetlist) {
        const songsInSetlist = activeSetlist.songIds
            .map(id => songs.find(s => s.id === id))
            .filter(Boolean) as Song[];
        setlistContext = {
            name: activeSetlist.name,
            songs: songsInSetlist,
            onSongSelect: (s: Song) => setActiveSong(s)
        };
    }
    return <PerformView song={activeSong} onBack={() => setView(activeSetlist ? ViewState.SETLIST_DETAIL : ViewState.LIBRARY)} setlistContext={setlistContext} />;
  }

  return (
    <div className="min-h-screen bg-background text-slate-100 font-sans selection:bg-primary/30">
       {(view === ViewState.LIBRARY || view === ViewState.SETLISTS) && (
         <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between sm:hidden">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">C</div>
               <span className="font-bold text-lg">ChordFlow</span>
            </div>
         </nav>
       )}

      <main>
        {view === ViewState.LIBRARY && renderLibrary()}
        {view === ViewState.EDITOR && renderEditor()}
        {view === ViewState.SETLISTS && renderSetlists()}
        {view === ViewState.SETLIST_DETAIL && renderSetlistDetail()}
      </main>

      {/* AI Search Modal */}
      {showAiSearch && (
         <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-lg rounded-2xl border border-slate-700 p-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-purple-400" /> Web Search & Import</h2>
                    <p className="text-slate-400 text-sm mt-1">Look up songs from Elevation, Hillsong, etc.</p>
                  </div>
                  <button onClick={() => setShowAiSearch(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
               </div>
               
               <input 
                 autoFocus
                 value={aiSearchQuery}
                 onChange={(e) => setAiSearchQuery(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                 placeholder="e.g. Oceans by Hillsong"
                 className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-lg text-white focus:outline-none focus:border-purple-500 mb-4 shadow-inner"
               />

               <div className="text-xs text-slate-500 mb-6 bg-slate-800/50 p-3 rounded-lg">
                  <p className="mb-1"><strong>Auto-Import:</strong> AI will search the web and format lyrics/chords for you.</p>
                  <p><strong>Or Manual:</strong> Search yourself and copy-paste.</p>
               </div>
               
               <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent(aiSearchQuery || 'worship chords lyrics')}`, '_blank');
                    }}
                    className="px-4 py-2 text-slate-300 hover:text-white flex items-center gap-2 border border-slate-700 rounded-lg hover:bg-slate-800"
                  >
                    <ExternalLink size={16} /> Search Manually
                  </button>
                  <button 
                     onClick={handleAiSearch}
                     disabled={!aiSearchQuery.trim()}
                     className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-medium shadow-lg shadow-purple-900/20"
                  >
                     Auto-Import
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Loading Overlay */}
      {isImporting && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <Loader2 className="animate-spin text-purple-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">Searching the Web...</h3>
          <p className="text-slate-400 text-center max-w-xs">Finding and formatting your song.</p>
        </div>
      )}

      {/* Modals for Setlists (Create & Rename) */}
      {showCreateSetlistModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Create New Setlist</h3>
            <input autoFocus value={newSetlistName} onChange={(e) => setNewSetlistName(e.target.value)} placeholder="e.g. Sunday Service" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-primary mb-6" onKeyDown={(e) => e.key === 'Enter' && finalizeCreateSetlist()} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreateSetlistModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button onClick={finalizeCreateSetlist} disabled={!newSetlistName.trim()} className="px-4 py-2 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
      {renamingSetlistId && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Rename Setlist</h3>
            <input autoFocus value={renameSetlistName} onChange={(e) => setRenameSetlistName(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-primary mb-6" onKeyDown={(e) => e.key === 'Enter' && finalizeRenameSetlist()} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRenamingSetlistId(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button onClick={finalizeRenameSetlist} disabled={!renameSetlistName.trim()} className="px-4 py-2 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      {(view === ViewState.LIBRARY || view === ViewState.SETLISTS) && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-800 pb-safe z-50 safe-area-bottom">
          <div className="flex justify-around items-center p-2">
            <button onClick={() => { setView(ViewState.LIBRARY); setActiveSetlist(null); }} className={`flex flex-col items-center p-2 px-6 rounded-lg transition-colors ${view === ViewState.LIBRARY ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}>
              <Library size={24} /> <span className="text-[10px] mt-1 font-medium">Library</span>
            </button>
            <button onClick={() => setView(ViewState.SETLISTS)} className={`flex flex-col items-center p-2 px-6 rounded-lg transition-colors ${view === ViewState.SETLISTS ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}>
              <ListMusic size={24} /> <span className="text-[10px] mt-1 font-medium">Setlists</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
