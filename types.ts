export interface Song {
  id: string;
  title: string;
  artist: string;
  content: string; // The lyrics and chords
  key?: string;
  hasAudio?: boolean; // New flag for offline audio
  createdAt: number;
}

export interface Setlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

export enum ViewState {
  LIBRARY = 'LIBRARY',
  SETLISTS = 'SETLISTS',
  SETLIST_DETAIL = 'SETLIST_DETAIL',
  EDITOR = 'EDITOR',
  PERFORM = 'PERFORM'
}

export interface ImportResult {
  title: string;
  artist: string;
  content: string;
}
