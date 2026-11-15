import { useJukebox } from '@/store/useJukebox';
import { FAKE_MODE, makeFakeTrack } from '@/data/fake';
import { loadAvailableTracks } from '@/data/loadTrack';
import type { TrackMeta } from '@/data/types';

interface BootstrapOptions {
  setReady?: boolean;
}

/**
 * Initializes the application state on startup.
 * Loads the active track collection, detects user reduced-motion preferences,
 * and sets application status to ready.
 */
export async function bootstrap(options: BootstrapOptions = { setReady: true }): Promise<void> {
  const store = useJukebox.getState();

  // 1. Respect prefers-reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    store.setReducedMotion(mediaQuery.matches);

    mediaQuery.addEventListener?.('change', (event) => {
      useJukebox.getState().setReducedMotion(event.matches);
    });
  }

  // 2. Load track catalog
  let tracks: TrackMeta[] = [];

  if (FAKE_MODE) {
    tracks = [
      makeFakeTrack('ocean-fever'),
      makeFakeTrack('breathing-planet'),
      makeFakeTrack('melting-crown'),
      makeFakeTrack('fire-season'),
    ];
  } else {
    try {
      tracks = await loadAvailableTracks();
    } catch {
      tracks = [
        makeFakeTrack('ocean-fever'),
        makeFakeTrack('breathing-planet'),
        makeFakeTrack('melting-crown'),
        makeFakeTrack('fire-season'),
      ];
    }
  }

  // Set loaded tracks into the central store
  store.setTracks(tracks);

  // 3. Set status to ready
  const shouldSetReady = options.setReady ?? true;
  if (shouldSetReady || useJukebox.getState().status !== 'idle') {
    useJukebox.setState({ status: 'ready', error: null });
  }
}

export default bootstrap;
