import { useEffect } from 'react';
import { useJukebox } from '@/store/useJukebox';

interface UseKeyboardOptions {
  onToggleHelp?: () => void;
  onCloseHelp?: () => void;
  isHelpOpen?: boolean;
}

/**
 * Attaches global keyboard shortcuts to Jukebox store actions.
 * Ignores keystrokes while the user is actively focused in input elements.
 */
export function useKeyboard(options: UseKeyboardOptions = {}): void {
  const { onToggleHelp, onCloseHelp, isHelpOpen } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore keys while typing in editable elements
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const store = useJukebox.getState();

      // ? toggles help modal
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        onToggleHelp?.();
        return;
      }

      // Escape key closes modal if open, otherwise clears selection & cursor
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isHelpOpen) {
          onCloseHelp?.();
        } else {
          store.clearSelection();
          store.setCursor(null);
        }
        return;
      }

      // Enter key selects the point under cursor for inspection
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = store.cursor ?? { lat: 0, lon: 0 };
        store.selectPoint(target.lat, target.lon);
        return;
      }

      // Space key toggles playback
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        store.toggle();
        return;
      }

      // ArrowLeft / ArrowRight move cursor longitude (Shift for 10 deg, normal 2 deg)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        const currentCursor = store.cursor ?? { lat: 0, lon: 0 };
        const delta = e.key === 'ArrowLeft' ? -step : step;

        let nextLon = currentCursor.lon + delta;
        // Wrap around longitude [-180, 180]
        if (nextLon > 180) nextLon -= 360;
        if (nextLon < -180) nextLon += 360;

        store.setCursor({
          lat: currentCursor.lat,
          lon: Math.round(nextLon * 10) / 10,
        });
        return;
      }

      // ArrowUp / ArrowDown change frame (historical year)
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        store.nextFrame();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        store.prevFrame();
        return;
      }

      // Numbers 1-4 directly select dataset tracks
      if (['1', '2', '3', '4'].includes(e.key)) {
        const trackIndex = parseInt(e.key, 10) - 1;
        const targetTrack = store.tracks[trackIndex];
        if (targetTrack) {
          e.preventDefault();
          store.selectTrack(targetTrack.id);
        }
        return;
      }

      // M toggles master audio mute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        store.toggleMute();
        return;
      }

      // L toggles data layer overlay
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        store.toggleDataLayer();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggleHelp, onCloseHelp, isHelpOpen]);
}

export default useKeyboard;
