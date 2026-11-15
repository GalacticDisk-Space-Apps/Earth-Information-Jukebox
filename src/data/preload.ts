import { useJukebox } from '@/store/useJukebox';
import { loadValueGrid } from './loadTrack';

/**
 * Preloads main app assets (track list, first frame ValueGrid, and Earth textures)
 * while the start screen is visible so that there is zero loading hitch or blank screen
 * when the transition finishes.
 */
export async function preloadMainApp(): Promise<void> {
  const store = useJukebox.getState();
  const trackId = store.trackId || (store.tracks[0]?.id ?? 'ocean-fever');
  const activeTrack = store.tracks.find((t) => t.id === trackId) || store.tracks[0];
  const firstFrame = activeTrack?.frames[0] ?? '2004';

  // 1. Preload ValueGrid for the first frame into memory cache
  try {
    await loadValueGrid(trackId, firstFrame);
  } catch {
    // Graceful fallback to synthetic grid handled by loadValueGrid
  }

  // 2. Preload Earth textures into browser image cache
  if (typeof window !== 'undefined') {
    const texturesToPreload = [
      '/textures/earth_day.jpg',
      '/textures/earth_night.jpg',
      '/textures/earth_bump.jpg',
      '/textures/earth_water.png',
      '/textures/earth_clouds.png',
      `/data/${trackId}/frames/${firstFrame}.webp`,
    ];

    texturesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }
}
