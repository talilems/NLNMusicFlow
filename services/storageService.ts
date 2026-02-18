import { Song, Setlist } from "../types";

const SONGS_KEY = 'chordflow_songs';
const SETLISTS_KEY = 'chordflow_setlists';

export const getSongs = (): Song[] => {
  const data = localStorage.getItem(SONGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSong = (song: Song): void => {
  const songs = getSongs();
  const existingIndex = songs.findIndex(s => s.id === song.id);
  if (existingIndex >= 0) {
    songs[existingIndex] = song;
  } else {
    songs.push(song);
  }
  localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
};

export const deleteSong = (id: string): void => {
  const songs = getSongs().filter(s => s.id !== id);
  localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
};

export const getSetlists = (): Setlist[] => {
  const data = localStorage.getItem(SETLISTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSetlist = (setlist: Setlist): void => {
  const setlists = getSetlists();
  const existingIndex = setlists.findIndex(s => s.id === setlist.id);
  if (existingIndex >= 0) {
    setlists[existingIndex] = setlist;
  } else {
    setlists.push(setlist);
  }
  localStorage.setItem(SETLISTS_KEY, JSON.stringify(setlists));
};

export const deleteSetlist = (id: string): void => {
  const setlists = getSetlists().filter(s => s.id !== id);
  localStorage.setItem(SETLISTS_KEY, JSON.stringify(setlists));
};
