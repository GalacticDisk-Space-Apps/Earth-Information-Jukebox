import { create } from 'zustand';
import type { AppStatus, LatLon, Mode, TrackMeta } from '@/data/types';

export interface JukeboxState {
  status: AppStatus;
  trackId: string | null;
  tracks: TrackMeta[];
  frameIndex: number;
  mode: Mode;
  playing: boolean;
  playhead: number; // 0..1
  cursor: LatLon | null;
  volume: number; // 0..1
  muted: boolean;
  reducedMotion: boolean;
  error: string | null;

  // Actions
  unlockAudio: () => void;
  setTracks: (tracks: TrackMeta[]) => void;
  selectTrack: (trackId: string) => void;
  setFrame: (index: number) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  setMode: (mode: Mode) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setPlayhead: (pos: number) => void;
  setCursor: (cursor: LatLon | null) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setReducedMotion: (reduced: boolean) => void;
  setError: (error: string | null) => void;
}

export const useJukebox = create<JukeboxState>((set, get) => ({
  status: 'idle',
  trackId: null,
  tracks: [],
  frameIndex: 0,
  mode: 'sweep',
  playing: false,
  playhead: 0,
  cursor: null,
  volume: 0.8,
  muted: false,
  reducedMotion: false,
  error: null,

  unlockAudio: () => {
    const current = get().status;
    if (current === 'idle') {
      set({ status: 'ready' });
    }
  },

  setTracks: (tracks: TrackMeta[]) => {
    set((state) => ({
      tracks,
      trackId: state.trackId ?? (tracks.length > 0 ? tracks[0].id : null),
      status: state.status === 'idle' ? 'idle' : 'ready',
    }));
  },

  selectTrack: (trackId: string) => {
    set({
      trackId,
      frameIndex: 0,
      playhead: 0,
      status: get().status === 'idle' ? 'idle' : 'ready',
    });
  },

  setFrame: (index: number) => {
    const { tracks, trackId } = get();
    const active = tracks.find((t) => t.id === trackId);
    const maxFrames = active ? active.frames.length : 1;
    const clamped = Math.max(0, Math.min(maxFrames - 1, index));
    set({ frameIndex: clamped });
  },

  nextFrame: () => {
    const { tracks, trackId, frameIndex } = get();
    const active = tracks.find((t) => t.id === trackId);
    if (!active || active.frames.length === 0) return;
    const next = (frameIndex + 1) % active.frames.length;
    set({ frameIndex: next });
  },

  prevFrame: () => {
    const { tracks, trackId, frameIndex } = get();
    const active = tracks.find((t) => t.id === trackId);
    if (!active || active.frames.length === 0) return;
    const prev = (frameIndex - 1 + active.frames.length) % active.frames.length;
    set({ frameIndex: prev });
  },

  setMode: (mode: Mode) => {
    set({ mode });
  },

  play: () => {
    set({ playing: true, status: 'playing' });
  },

  pause: () => {
    set({ playing: false, status: 'paused' });
  },

  toggle: () => {
    const isPlaying = get().playing;
    set({
      playing: !isPlaying,
      status: !isPlaying ? 'playing' : 'paused',
    });
  },

  // Cheap numerical update to avoid allocation overhead during 25Hz ticks
  setPlayhead: (pos: number) => {
    const clamped = Math.max(0, Math.min(1, pos));
    if (get().playhead !== clamped) {
      set({ playhead: clamped });
    }
  },

  setCursor: (cursor: LatLon | null) => {
    set({ cursor });
  },

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped });
  },

  toggleMute: () => {
    set((state) => ({ muted: !state.muted }));
  },

  setReducedMotion: (reducedMotion: boolean) => {
    set({ reducedMotion });
  },

  setError: (error: string | null) => {
    set({
      error,
      status: error ? 'error' : get().status === 'error' ? 'ready' : get().status,
    });
  },
}));

// Granular selector hooks for optimal component rendering performance
export const usePlayhead = () => useJukebox((s) => s.playhead);
export const useActiveTrack = () =>
  useJukebox((s) => s.tracks.find((t) => t.id === s.trackId) ?? null);
export const useStatus = () => useJukebox((s) => s.status);
export const useMode = () => useJukebox((s) => s.mode);
export const useCursor = () => useJukebox((s) => s.cursor);
export const useIsPlaying = () => useJukebox((s) => s.playing);
export const useFrameIndex = () => useJukebox((s) => s.frameIndex);
export const useVolume = () => useJukebox((s) => s.volume);
export const useIsMuted = () => useJukebox((s) => s.muted);
export const useReducedMotion = () => useJukebox((s) => s.reducedMotion);
